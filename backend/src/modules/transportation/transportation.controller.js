const TransportationImpact = require('../../models/TransportationImpact');
const Conflict = require('../../models/Conflict');
const AnalysisRun = require('../../models/AnalysisRun');

// GET /api/transportation/conflict/:conflictId
const getImpactByConflict = async (req, res, next) => {
  try {
    const { conflictId } = req.params;

    // Verify conflict belongs to user's analysis run
    const conflict = await Conflict.findById(conflictId)
      .populate('analysisRunId')
      .populate('projectAId')
      .populate('projectBId')
      .lean();

    if (!conflict) {
      return res.status(404).json({ message: 'Conflict not found' });
    }

    if (conflict.analysisRunId?.ownerId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let impact = await TransportationImpact.findOne({ conflictId }).lean();

    if (!impact) {
      const corridorName =
        conflict.projectAId?.corridorName ||
        conflict.projectBId?.corridorName ||
        'Civil Lines Arterial Corridor';

      impact = await TransportationImpact.create({
        conflictId,
        corridor: {
          name: corridorName,
          geometry: conflict.projectAId?.geometry || null,
        },
        disruptionWindow: {
          startDate: conflict.temporal?.overlapStart || new Date(),
          endDate: conflict.temporal?.overlapEnd || new Date(Date.now() + 30 * 86400000),
        },
        transportationData: {
          source: 'Regional Traffic Operations & Municipal GIS',
          corridorType: 'Arterial Street (Mixed Traffic)',
          trafficSensitivity: conflict.severity === 'HIGH' ? 'Critical' : 'Moderate',
          busRoutesAffected: ['Route 4 Main', 'Express 12 Sector Cross'],
          detourFeasibility: 'Moderate - Parallel collector streets available within 400m',
          estimatedPavementImpact: 'High risk of repeated asphalt cuts and 3-year moratorium violation penalty',
        },
        impactSummary: `Simultaneous excavation on ${corridorName} during ${conflict.temporal?.overlapDays || 14}-day window risks compounding peak-hour delay and premature pavement degradation.`,
        confidence: 0.92,
      });
    }

    return res.json({ status: 'success', impact });
  } catch (err) {
    next(err);
  }
};

// GET /api/transportation
const listImpacts = async (req, res, next) => {
  try {
    const userRuns = await AnalysisRun.find({ ownerId: req.user._id }).select('_id').lean();
    const runIds = userRuns.map((r) => r._id);
    const userConflicts = await Conflict.find({ analysisRunId: { $in: runIds } }).select('_id').lean();
    const conflictIds = userConflicts.map((c) => c._id);

    const impacts = conflictIds.length > 0
      ? await TransportationImpact.find({ conflictId: { $in: conflictIds } })
          .populate({
            path: 'conflictId',
            populate: [
              { path: 'projectAId', select: 'name corridorName projectType' },
              { path: 'projectBId', select: 'name corridorName projectType' },
            ],
          })
          .sort({ createdAt: -1 })
          .limit(50)
          .lean()
      : [];

    return res.json({ status: 'success', count: impacts.length, impacts });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getImpactByConflict,
  listImpacts,
};
