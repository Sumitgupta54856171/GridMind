const Conflict = require('../../models/Conflict');
const EvidenceItem = require('../../models/EvidenceItem');
const Recommendation = require('../../models/Recommendation');
const AnalysisRun = require('../../models/AnalysisRun');
const Utility = require('../../models/Utility');

// GET /api/conflicts
const getAllConflicts = async (req, res, next) => {
  try {
    // Find all analysis runs belonging to user
    const userRuns = await AnalysisRun.find({ ownerId: req.user._id }).select('_id');
    const runIds = userRuns.map((r) => r._id);

    let filter = { analysisRunId: { $in: runIds } };

    if (req.query.analysisRunId) {
      filter.analysisRunId = req.query.analysisRunId;
    }

    if (req.query.severity && req.query.severity !== 'all') {
      filter.severity = req.query.severity.toUpperCase();
    }

    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    const conflicts = await Conflict.find(filter)
      .populate({
        path: 'projectAId',
        populate: { path: 'utilityId', select: 'name color' },
      })
      .populate({
        path: 'projectBId',
        populate: { path: 'utilityId', select: 'name color' },
      })
      .populate('analysisRunId', 'createdAt status configuration')
      .sort({ conflictScore: -1 });

    const conflictIds = conflicts.map((c) => c._id);
    const [allEvidence, allRecs] = await Promise.all([
      EvidenceItem.find({ conflictId: { $in: conflictIds } }),
      Recommendation.find({ conflictId: { $in: conflictIds } }),
    ]);

    const evMap = {};
    allEvidence.forEach((e) => {
      const id = e.conflictId.toString();
      if (!evMap[id]) evMap[id] = [];
      evMap[id].push(e);
    });

    const recMap = {};
    allRecs.forEach((r) => {
      recMap[r.conflictId.toString()] = r;
    });

    const enriched = conflicts.map((c) => {
      const obj = c.toObject();
      obj.evidenceItems = evMap[c._id.toString()] || [];
      obj.recommendation = recMap[c._id.toString()] || null;
      return obj;
    });

    res.json({ conflicts: enriched, count: enriched.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/conflicts/:id
const getConflictById = async (req, res, next) => {
  try {
    const conflict = await Conflict.findById(req.params.id)
      .populate({
        path: 'projectAId',
        populate: { path: 'utilityId', select: 'name color serviceAreaText' },
      })
      .populate({
        path: 'projectBId',
        populate: { path: 'utilityId', select: 'name color serviceAreaText' },
      })
      .populate('analysisRunId');

    if (!conflict) return res.status(404).json({ message: 'Conflict not found' });

    // Verify ownership of the analysis run
    if (conflict.analysisRunId?.ownerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const [evidenceItems, recommendation] = await Promise.all([
      EvidenceItem.find({ conflictId: conflict._id }),
      Recommendation.findOne({ conflictId: conflict._id }),
    ]);

    const obj = conflict.toObject();
    obj.evidenceItems = evidenceItems;
    obj.recommendation = recommendation;

    res.json({ conflict: obj });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/conflicts/:id/status
const updateConflictStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['new', 'reviewed', 'dismissed', 'actionable'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const conflict = await Conflict.findById(req.params.id).populate('analysisRunId');
    if (!conflict) return res.status(404).json({ message: 'Conflict not found' });
    if (conflict.analysisRunId?.ownerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    conflict.status = status;
    await conflict.save();

    res.json({ message: `Conflict marked as ${status}`, conflict });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAllConflicts,
  getConflictById,
  updateConflictStatus,
};
