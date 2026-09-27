const Utility = require('../../models/Utility');
const Project = require('../../models/Project');
const Conflict = require('../../models/Conflict');
const AnalysisRun = require('../../models/AnalysisRun');
const AuditEvent = require('../../models/AuditEvent');
const AIRequest = require('../../models/AIRequest');

// GET /api/dashboard/stats
const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.userId;

    const [
      totalUtilities,
      totalProjects,
      totalConflicts,
      highPriorityConflicts,
      latestAnalysis,
      recentAudits,
      aiSummary,
    ] = await Promise.all([
      Utility.countDocuments({ ownerId: userId }),
      Project.countDocuments(),
      Conflict.countDocuments(),
      Conflict.countDocuments({ severity: 'HIGH' }),
      AnalysisRun.findOne({ userId })
        .sort({ createdAt: -1 })
        .populate('utilityIds', 'name color')
        .lean(),
      AuditEvent.find({ userId })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      AIRequest.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$estimatedCost' },
            totalRequests: { $sum: 1 },
          },
        },
      ]),
    ]);

    const cost = aiSummary[0]?.totalCost || 0;

    return res.json({
      status: 'success',
      metrics: {
        utilities: totalUtilities,
        projects: totalProjects,
        conflicts: totalConflicts,
        highPriority: highPriorityConflicts,
        estimatedAICost: Number(cost.toFixed(4)),
      },
      latestAnalysis,
      recentAudits,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
};
