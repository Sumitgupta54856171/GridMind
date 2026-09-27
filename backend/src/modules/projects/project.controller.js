const Project = require('../../models/Project');
const Utility = require('../../models/Utility');
const DataSource = require('../../models/DataSource');
const AuditEvent = require('../../models/AuditEvent');

/**
 * Helper to get user's allowed utility IDs.
 */
const getUserUtilityIds = async (userId) => {
  const utilities = await Utility.find({ ownerId: userId }).select('_id');
  return utilities.map((u) => u._id);
};

// GET /api/projects
const getAllProjects = async (req, res, next) => {
  try {
    const allowedUtilIds = await getUserUtilityIds(req.user._id);

    let filter = { utilityId: { $in: allowedUtilIds } };

    if (req.query.utilityId) {
      if (!allowedUtilIds.some((id) => id.toString() === req.query.utilityId)) {
        return res.status(403).json({ message: 'Access denied for this utility' });
      }
      filter.utilityId = req.query.utilityId;
    }

    if (req.query.projectType && req.query.projectType !== 'all') {
      filter.projectType = new RegExp(`^${req.query.projectType}$`, 'i');
    }

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    if (req.query.sourceId) {
      filter.sourceId = req.query.sourceId;
    }

    if (req.query.search) {
      const q = req.query.search.trim();
      filter.$or = [
        { name: new RegExp(q, 'i') },
        { corridorName: new RegExp(q, 'i') },
        { locationText: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
      ];
    }

    const projects = await Project.find(filter)
      .populate('utilityId', 'name serviceAreaText serviceArea website color')
      .populate('sourceId', 'name sourceType retrievedAt')
      .sort({ createdAt: -1 });

    res.json({ projects, count: projects.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/projects/stats
const getProjectStats = async (req, res, next) => {
  try {
    const allowedUtilIds = await getUserUtilityIds(req.user._id);
    const projects = await Project.find({ utilityId: { $in: allowedUtilIds } });

    const total = projects.length;
    let mapped = 0;
    const byType = {};
    const byUtility = {};
    const byStatus = { planned: 0, active: 0, completed: 0, unknown: 0 };

    projects.forEach((p) => {
      // Check if project has geographic coordinates
      if (p.geometry && p.geometry.coordinates && p.geometry.coordinates.length) {
        mapped++;
      }

      const type = (p.projectType || 'other').toLowerCase();
      byType[type] = (byType[type] || 0) + 1;

      const uId = p.utilityId?.toString() || 'unassigned';
      byUtility[uId] = (byUtility[uId] || 0) + 1;

      const st = p.status || 'unknown';
      byStatus[st] = (byStatus[st] || 0) + 1;
    });

    res.json({
      total,
      mapped,
      byType,
      byUtility,
      byStatus,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/projects/:id
const getProjectById = async (req, res, next) => {
  try {
    const allowedUtilIds = await getUserUtilityIds(req.user._id);
    const project = await Project.findById(req.params.id)
      .populate('utilityId', 'name serviceAreaText serviceArea website color')
      .populate('sourceId', 'name sourceType retrievedAt');

    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!allowedUtilIds.some((id) => id.toString() === project.utilityId._id.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json({ project });
  } catch (err) {
    next(err);
  }
};

// POST /api/projects
const createProject = async (req, res, next) => {
  try {
    const allowedUtilIds = await getUserUtilityIds(req.user._id);
    const {
      utilityId,
      sourceId,
      name,
      description,
      projectType,
      status,
      startDate,
      endDate,
      locationText,
      corridorName,
      geometry,
      coordinates,
    } = req.body;

    if (!utilityId || !allowedUtilIds.some((id) => id.toString() === utilityId)) {
      return res.status(400).json({ message: 'A valid utilityId owned by you is required' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'name is required' });
    }

    let resolvedSourceId = sourceId;
    if (!resolvedSourceId) {
      // Find or create default manual source for this utility
      let defaultSource = await DataSource.findOne({ utilityId, sourceType: 'manual' });
      if (!defaultSource) {
        defaultSource = await DataSource.create({
          utilityId,
          name: 'Manual Entry Projects',
          sourceType: 'manual',
          parserStatus: 'completed',
        });
      }
      resolvedSourceId = defaultSource._id;
    }

    let finalGeometry = geometry;
    if (!finalGeometry && coordinates && Array.isArray(coordinates) && coordinates.length >= 2) {
      finalGeometry = {
        type: 'Point',
        coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])],
      };
    }

    const project = await Project.create({
      utilityId,
      sourceId: resolvedSourceId,
      name: name.trim(),
      description: (description || '').trim(),
      projectType: (projectType || 'utility').toLowerCase().trim(),
      status: status || 'planned',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      locationText: (locationText || '').trim(),
      corridorName: (corridorName || '').trim(),
      geometry: finalGeometry || undefined,
      locationConfidence: finalGeometry ? 1.0 : 0.5,
      extraction: { method: 'manual', confidence: 1.0 },
      rawFields: req.body.rawFields || {},
    });

    await AuditEvent.create({
      userId: req.user._id,
      action: 'project.created',
      resourceType: 'Project',
      resourceId: project._id,
      metadata: { name: project.name, utilityId },
    });

    const populated = await Project.findById(project._id)
      .populate('utilityId', 'name serviceAreaText serviceArea website color')
      .populate('sourceId', 'name sourceType retrievedAt');

    res.status(201).json({ project: populated });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/projects/:id
const updateProject = async (req, res, next) => {
  try {
    const allowedUtilIds = await getUserUtilityIds(req.user._id);
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!allowedUtilIds.some((id) => id.toString() === project.utilityId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const updatable = [
      'name', 'description', 'projectType', 'status',
      'startDate', 'endDate', 'locationText', 'corridorName',
      'geometry',
    ];

    for (const key of updatable) {
      if (req.body[key] !== undefined) {
        if (key === 'startDate' || key === 'endDate') {
          project[key] = req.body[key] ? new Date(req.body[key]) : undefined;
        } else {
          project[key] = req.body[key];
        }
      }
    }

    if (req.body.coordinates && Array.isArray(req.body.coordinates) && req.body.coordinates.length >= 2) {
      project.geometry = {
        type: 'Point',
        coordinates: [parseFloat(req.body.coordinates[0]), parseFloat(req.body.coordinates[1])],
      };
    }

    await project.save();

    const populated = await Project.findById(project._id)
      .populate('utilityId', 'name serviceAreaText serviceArea website color')
      .populate('sourceId', 'name sourceType retrievedAt');

    res.json({ project: populated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/projects/:id
const deleteProject = async (req, res, next) => {
  try {
    const allowedUtilIds = await getUserUtilityIds(req.user._id);
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!allowedUtilIds.some((id) => id.toString() === project.utilityId.toString())) {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Project.findByIdAndDelete(project._id);

    await AuditEvent.create({
      userId: req.user._id,
      action: 'project.deleted',
      resourceType: 'Project',
      resourceId: project._id,
      metadata: { name: project.name },
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllProjects,
  getProjectStats,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
};
