const crypto = require('crypto');
const fs = require('fs');
const DataSource = require('../../models/DataSource');
const Utility = require('../../models/Utility');
const Project = require('../../models/Project');
const AuditEvent = require('../../models/AuditEvent');
const { extractSourceProjects } = require('../../services/sourceExtractionService');


/**
 * Computes sha256 checksum of a file on disk.
 */
const computeChecksum = (filePath) => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
};

/**
 * Enriches data source documents with project counts and utility info.
 */
const withSourceCounts = async (sources) => {
  const ids = sources.map((s) => s._id);

  const projectCounts = await Project.aggregate([
    { $match: { sourceId: { $in: ids } } },
    { $group: { _id: '$sourceId', count: { $sum: 1 } } },
  ]);

  const projectMap = Object.fromEntries(projectCounts.map((p) => [p._id.toString(), p.count]));

  return sources.map((s) => {
    const obj = s.toObject ? s.toObject() : s;
    obj.projectsCount = projectMap[s._id.toString()] ?? 0;
    return obj;
  });
};

// GET /api/sources (all sources belonging to user's utilities)
const getAllSources = async (req, res, next) => {
  try {
    const userUtilities = await Utility.find({ ownerId: req.user._id }).select('_id name serviceAreaText');
    const userUtilMap = Object.fromEntries(userUtilities.map((u) => [u._id.toString(), u]));
    const allowedUtilIds = userUtilities.map((u) => u._id);

    let filter = { utilityId: { $in: allowedUtilIds } };

    if (req.query.utilityId) {
      if (!userUtilMap[req.query.utilityId]) {
        return res.status(403).json({ message: 'Access denied for this utility' });
      }
      filter = { utilityId: req.query.utilityId };
    }

    if (req.query.sourceType) {
      filter.sourceType = req.query.sourceType;
    }

    const sources = await DataSource.find(filter)
      .populate('utilityId', 'name serviceAreaText website')
      .sort({ createdAt: -1 });

    const enriched = await withSourceCounts(sources);
    res.json({ sources: enriched });
  } catch (err) {
    next(err);
  }
};

// GET /api/utilities/:utilityId/sources
const getSourcesByUtility = async (req, res, next) => {
  try {
    const { utilityId } = req.params;
    const utility = await Utility.findById(utilityId);
    if (!utility) return res.status(404).json({ message: 'Utility not found' });
    if (utility.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const sources = await DataSource.find({ utilityId })
      .populate('utilityId', 'name serviceAreaText website')
      .sort({ createdAt: -1 });

    const enriched = await withSourceCounts(sources);
    res.json({ sources: enriched });
  } catch (err) {
    next(err);
  }
};

// POST /api/utilities/:utilityId/sources
// Accepts both application/json and multipart/form-data with uploaded file
const createSourceForUtility = async (req, res, next) => {
  try {
    const { utilityId } = req.params;
    const utility = await Utility.findById(utilityId);
    if (!utility) return res.status(404).json({ message: 'Utility not found' });
    if (utility.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const name = (req.body.name || req.file?.originalname || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'name is required or a file must be provided' });
    }

    let sourceType = (req.body.sourceType || '').toLowerCase().trim();
    if (!sourceType && req.file) {
      const ext = req.file.originalname.split('.').pop()?.toLowerCase();
      if (ext === 'pdf') sourceType = 'pdf';
      else if (ext === 'csv') sourceType = 'csv';
      else if (ext === 'json') sourceType = 'json';
      else if (ext === 'geojson') sourceType = 'gis';
      else sourceType = 'manual';
    }

    const validTypes = ['pdf', 'csv', 'json', 'gis', 'webpage', 'manual'];
    const resolvedType = validTypes.includes(sourceType) ? sourceType : 'manual';

    let storagePath = '';
    let checksum = '';

    if (req.file) {
      storagePath = req.file.path;
      checksum = await computeChecksum(req.file.path);
    }

    let parsedMetadata = req.body.metadata;
    if (typeof parsedMetadata === 'string') {
      try {
        parsedMetadata = JSON.parse(parsedMetadata);
      } catch {
        parsedMetadata = {};
      }
    }

    const source = await DataSource.create({
      utilityId,
      name,
      sourceType: resolvedType,
      sourceUrl: (req.body.sourceUrl || '').trim(),
      storagePath,
      checksum,
      parserStatus: 'pending',
      metadata: {
        publisher: (parsedMetadata?.publisher || req.body.publisher || utility.name).trim(),
        publicationDate: parsedMetadata?.publicationDate || new Date(),
        description: (parsedMetadata?.description || req.body.description || '').trim(),
      },
    });

    await AuditEvent.create({
      userId: req.user._id,
      action: 'source.created',
      resourceType: 'DataSource',
      resourceId: source._id,
      metadata: { name: source.name, utilityId, sourceType: source.sourceType, hasFile: !!req.file },
    });

    // Auto-extract trigger if requested or if file is uploaded
    const autoExtract = req.body.autoExtract === 'true' || req.body.autoExtract === true;
    if (autoExtract && (storagePath || source.sourceUrl)) {
      try {
        source.parserStatus = 'processing';
        await source.save();

        const extracted = await extractSourceProjects({
          source,
          utility,
        });


        if (extracted && extracted.length > 0) {
          for (const p of extracted) {
            await Project.create({
              utilityId,
              sourceId: source._id,
              name: p.name,
              description: p.description || '',
              projectType: p.projectType || '',
              status: p.status || 'planned',
              startDate: p.startDate ? new Date(p.startDate) : undefined,
              endDate: p.endDate ? new Date(p.endDate) : undefined,
              locationText: p.locationText || '',
              corridorName: p.corridorName || '',
              geometry: p.geometry || undefined,
              locationConfidence: p.locationConfidence || 0.8,
              extraction: p.extraction || { method: 'llm', confidence: 0.9 },
              rawFields: p.rawFields || {},
            });
          }
          source.parserStatus = 'completed';
        } else {
          source.parserStatus = 'completed';
        }
        await source.save();

        await AuditEvent.create({
          userId: req.user._id,
          action: 'source.parsed',
          resourceType: 'DataSource',
          resourceId: source._id,
          metadata: { name: source.name, extractedCount: extracted.length },
        });
      } catch (extractErr) {
        console.error('[AI Extract Error]:', extractErr);
        source.parserStatus = 'failed';
        await source.save();
      }
    }

    const populated = await DataSource.findById(source._id).populate('utilityId', 'name serviceAreaText website');
    const [enriched] = await withSourceCounts([populated]);

    res.status(201).json({ source: enriched });
  } catch (err) {
    next(err);
  }
};

// GET /api/sources/:id
const getSourceById = async (req, res, next) => {
  try {
    const source = await DataSource.findById(req.params.id).populate('utilityId', 'name serviceAreaText website ownerId');
    if (!source) return res.status(404).json({ message: 'Data source not found' });

    if (source.utilityId?.ownerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [enriched] = await withSourceCounts([source]);
    res.json({ source: enriched });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/sources/:id
const updateSource = async (req, res, next) => {
  try {
    const source = await DataSource.findById(req.params.id);
    if (!source) return res.status(404).json({ message: 'Data source not found' });

    const utility = await Utility.findById(source.utilityId);
    if (!utility || utility.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, sourceType, sourceUrl, parserStatus, metadata } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'name cannot be empty' });
      }
      source.name = name.trim();
    }

    if (sourceType !== undefined) {
      const validTypes = ['pdf', 'csv', 'json', 'gis', 'webpage', 'manual'];
      const resolved = sourceType.toLowerCase().trim();
      if (!validTypes.includes(resolved)) {
        return res.status(400).json({
          message: `Invalid sourceType. Must be one of: ${validTypes.join(', ')}`,
        });
      }
      source.sourceType = resolved;
    }

    if (sourceUrl !== undefined) source.sourceUrl = sourceUrl.trim();
    if (parserStatus !== undefined) source.parserStatus = parserStatus;

    if (metadata) {
      if (metadata.publisher !== undefined) source.metadata.publisher = metadata.publisher.trim();
      if (metadata.publicationDate !== undefined) source.metadata.publicationDate = metadata.publicationDate;
      if (metadata.description !== undefined) source.metadata.description = metadata.description.trim();
    }

    await source.save();

    await AuditEvent.create({
      userId: req.user._id,
      action: 'source.updated',
      resourceType: 'DataSource',
      resourceId: source._id,
      metadata: { name: source.name },
    });

    const populated = await DataSource.findById(source._id).populate('utilityId', 'name serviceAreaText website');
    const [enriched] = await withSourceCounts([populated]);
    res.json({ source: enriched });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/sources/:id
const deleteSource = async (req, res, next) => {
  try {
    const source = await DataSource.findById(req.params.id);
    if (!source) return res.status(404).json({ message: 'Data source not found' });

    const utility = await Utility.findById(source.utilityId);
    if (!utility || utility.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Delete associated projects from this source
    await Project.deleteMany({ sourceId: source._id });

    // Clean up uploaded file if it exists
    if (source.storagePath && fs.existsSync(source.storagePath)) {
      try {
        fs.unlinkSync(source.storagePath);
      } catch (unlinkErr) {
        console.warn('Failed to delete uploaded file from disk:', unlinkErr.message);
      }
    }

    await source.deleteOne();

    await AuditEvent.create({
      userId: req.user._id,
      action: 'source.deleted',
      resourceType: 'DataSource',
      resourceId: source._id,
      metadata: { name: source.name, utilityId: source.utilityId },
    });

    res.json({ message: 'Data source deleted' });
  } catch (err) {
    next(err);
  }
};

// POST /api/sources/:id/extract
// Re-runs Gemini AI Extraction Agent on a specific source
const triggerSourceExtraction = async (req, res, next) => {
  try {
    const source = await DataSource.findById(req.params.id).populate('utilityId');
    if (!source) return res.status(404).json({ message: 'Data source not found' });

    if (source.utilityId?.ownerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    source.parserStatus = 'processing';
    await source.save();

    const utility = source.utilityId;
    let extracted = [];

    try {
      extracted = await extractSourceProjects({
        source,
        utility,
      });


      if (extracted && extracted.length > 0) {
        // Clear previous projects from this source to avoid duplicates
        await Project.deleteMany({ sourceId: source._id });

        for (const p of extracted) {
          await Project.create({
            utilityId: source.utilityId._id,
            sourceId: source._id,
            name: p.name,
            description: p.description || '',
            projectType: p.projectType || '',
            status: p.status || 'planned',
            startDate: p.startDate ? new Date(p.startDate) : undefined,
            endDate: p.endDate ? new Date(p.endDate) : undefined,
            locationText: p.locationText || '',
            corridorName: p.corridorName || '',
            geometry: p.geometry || undefined,
            locationConfidence: p.locationConfidence || 0.8,
            extraction: p.extraction || { method: 'llm', confidence: 0.9 },
            rawFields: p.rawFields || {},
          });
        }
        source.parserStatus = 'completed';
      } else {
        source.parserStatus = 'completed';
      }
      await source.save();

      await AuditEvent.create({
        userId: req.user._id,
        action: 'source.parsed',
        resourceType: 'DataSource',
        resourceId: source._id,
        metadata: { name: source.name, extractedCount: extracted.length },
      });

      const populated = await DataSource.findById(source._id).populate('utilityId', 'name serviceAreaText website');
      const [enriched] = await withSourceCounts([populated]);

      res.json({
        message: `Extracted ${extracted.length} projects successfully`,
        totalExtracted: extracted.length,
        source: enriched,
      });
    } catch (extractErr) {
      source.parserStatus = 'failed';
      await source.save();
      return res.status(500).json({
        message: 'AI Extraction failed',
        error: extractErr.message,
      });
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllSources,
  getSourcesByUtility,
  createSourceForUtility,
  getSourceById,
  updateSource,
  deleteSource,
  triggerSourceExtraction,
};
