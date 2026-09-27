const Utility = require('../../models/Utility');
const DataSource = require('../../models/DataSource');
const Project = require('../../models/Project');
const AuditEvent = require('../../models/AuditEvent');

/**
 * Attach sourcesCount and projectsCount to each utility document.
 */
const withCounts = async (utilities) => {
  const ids = utilities.map((u) => u._id);

  const [sourceCounts, projectCounts] = await Promise.all([
    DataSource.aggregate([
      { $match: { utilityId: { $in: ids } } },
      { $group: { _id: '$utilityId', count: { $sum: 1 } } },
    ]),
    Project.aggregate([
      { $match: { utilityId: { $in: ids } } },
      { $group: { _id: '$utilityId', count: { $sum: 1 } } },
    ]),
  ]);

  const sourceMap = Object.fromEntries(sourceCounts.map((s) => [s._id.toString(), s.count]));
  const projectMap = Object.fromEntries(projectCounts.map((p) => [p._id.toString(), p.count]));

  return utilities.map((u) => {
    const obj = u.toObject();
    obj.sourcesCount = sourceMap[u._id.toString()] ?? 0;
    obj.projectsCount = projectMap[u._id.toString()] ?? 0;
    return obj;
  });
};

// POST /api/utilities
const createUtility = async (req, res, next) => {
  try {
    const { name, description, website, serviceArea, serviceAreaText } = req.body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'name is required' });
    }

    let parsedServiceArea = undefined;
    let resolvedServiceAreaText = typeof serviceAreaText === 'string' ? serviceAreaText.trim() : '';

    if (serviceArea) {
      if (typeof serviceArea === 'string' && !resolvedServiceAreaText) {
        resolvedServiceAreaText = serviceArea.trim();
      } else if (
        typeof serviceArea === 'object' &&
        serviceArea.type === 'Polygon' &&
        Array.isArray(serviceArea.coordinates) &&
        serviceArea.coordinates.length > 0
      ) {
        parsedServiceArea = {
          type: 'Polygon',
          coordinates: serviceArea.coordinates,
        };
      }
    }

    const utility = await Utility.create({
      name: name.trim(),
      description: description ? description.trim() : '',
      website: website ? website.trim() : '',
      serviceAreaText: resolvedServiceAreaText,
      serviceArea: parsedServiceArea,
      ownerId: req.user._id,
    });

    await AuditEvent.create({
      userId: req.user._id,
      action: 'utility.created',
      resourceType: 'Utility',
      resourceId: utility._id,
      metadata: { name: utility.name },
    });

    const [enriched] = await withCounts([utility]);
    res.status(201).json({ utility: enriched });
  } catch (err) {
    next(err);
  }
};

// GET /api/utilities
const getUtilities = async (req, res, next) => {
  try {
    const utilities = await Utility.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
    const enriched = await withCounts(utilities);
    res.json({ utilities: enriched });
  } catch (err) {
    next(err);
  }
};

// GET /api/utilities/:id
const getUtilityById = async (req, res, next) => {
  try {
    const utility = await Utility.findById(req.params.id);
    if (!utility) return res.status(404).json({ message: 'Utility not found' });
    if (utility.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [enriched] = await withCounts([utility]);
    res.json({ utility: enriched });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/utilities/:id
const updateUtility = async (req, res, next) => {
  try {
    const utility = await Utility.findById(req.params.id);
    if (!utility) return res.status(404).json({ message: 'Utility not found' });
    if (utility.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, description, website, serviceArea, serviceAreaText } = req.body;
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'name cannot be empty' });
      }
      utility.name = name.trim();
    }
    if (description !== undefined) {
      utility.description = typeof description === 'string' ? description.trim() : '';
    }
    if (website !== undefined) {
      utility.website = typeof website === 'string' ? website.trim() : '';
    }
    if (serviceAreaText !== undefined) {
      utility.serviceAreaText = typeof serviceAreaText === 'string' ? serviceAreaText.trim() : '';
    }

    if (serviceArea !== undefined) {
      if (typeof serviceArea === 'string') {
        utility.serviceAreaText = serviceArea.trim();
      } else if (serviceArea === null) {
        utility.serviceArea = undefined;
      } else if (
        typeof serviceArea === 'object' &&
        serviceArea.type === 'Polygon' &&
        Array.isArray(serviceArea.coordinates) &&
        serviceArea.coordinates.length > 0
      ) {
        utility.serviceArea = {
          type: 'Polygon',
          coordinates: serviceArea.coordinates,
        };
      }
    }

    await utility.save();

    await AuditEvent.create({
      userId: req.user._id,
      action: 'utility.updated',
      resourceType: 'Utility',
      resourceId: utility._id,
      metadata: { name: utility.name },
    });

    const [enriched] = await withCounts([utility]);
    res.json({ utility: enriched });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/utilities/:id
const deleteUtility = async (req, res, next) => {
  try {
    const utility = await Utility.findById(req.params.id);
    if (!utility) return res.status(404).json({ message: 'Utility not found' });
    if (utility.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await utility.deleteOne();

    await AuditEvent.create({
      userId: req.user._id,
      action: 'utility.deleted',
      resourceType: 'Utility',
      resourceId: utility._id,
      metadata: { name: utility.name },
    });

    res.json({ message: 'Utility deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { createUtility, getUtilities, getUtilityById, updateUtility, deleteUtility };
