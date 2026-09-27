const DataSource = require('../../models/DataSource');
const Utility = require('../../models/Utility');
const Project = require('../../models/Project');
const AuditEvent = require('../../models/AuditEvent');

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
// Supports optional query: ?utilityId=xxx
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
const createSourceForUtility = async (req, res, next) => {
  try {
    const { utilityId } = req.params;
    const utility = await Utility.findById(utilityId);
    if (!utility) return res.status(404).json({ message: 'Utility not found' });
    if (utility.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, sourceType, sourceUrl, metadata, parserStatus } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'name is required' });
    }

    const validTypes = ['pdf', 'csv', 'json', 'gis', 'webpage', 'manual'];
    const resolvedType = (sourceType || 'manual').toLowerCase();
    if (!validTypes.includes(resolvedType)) {
      return res.status(400).json({
        message: `Invalid sourceType. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    const source = await DataSource.create({
      utilityId,
      name: name.trim(),
      sourceType: resolvedType,
      sourceUrl: sourceUrl ? sourceUrl.trim() : '',
      parserStatus: parserStatus || 'pending',
      metadata: {
        publisher: metadata?.publisher ? metadata.publisher.trim() : utility.name,
        publicationDate: metadata?.publicationDate || new Date(),
        description: metadata?.description ? metadata.description.trim() : '',
      },
    });

    await AuditEvent.create({
      userId: req.user._id,
      action: 'source.created',
      resourceType: 'DataSource',
      resourceId: source._id,
      metadata: { name: source.name, utilityId, sourceType: source.sourceType },
    });

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

module.exports = {
  getAllSources,
  getSourcesByUtility,
  createSourceForUtility,
  getSourceById,
  updateSource,
  deleteSource,
};
