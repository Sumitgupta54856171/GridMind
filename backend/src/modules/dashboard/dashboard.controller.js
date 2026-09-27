const mongoose = require('mongoose');
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
    const userObjectId = new mongoose.Types.ObjectId(userId.toString());

    // 1. Fetch user's owned utility IDs
    const userUtilities = await Utility.find({ ownerId: userObjectId }).select('_id').lean();
    const allowedUtilIds = userUtilities.map((u) => u._id);

    // 2. Fetch user's owned analysis runs
    const userRuns = await AnalysisRun.find({ ownerId: userObjectId }).select('_id').lean();
    const runIds = userRuns.map((r) => r._id);

    // 3. Count documents scoped strictly to the current user
    const [
      totalProjects,
      totalConflicts,
      highPriorityConflicts,
      latestAnalysis,
      recentAudits,
      aiSummary,
    ] = await Promise.all([
      allowedUtilIds.length > 0
        ? Project.countDocuments({ utilityId: { $in: allowedUtilIds } })
        : 0,
      runIds.length > 0
        ? Conflict.countDocuments({ analysisRunId: { $in: runIds } })
        : 0,
      runIds.length > 0
        ? Conflict.countDocuments({ analysisRunId: { $in: runIds }, severity: 'HIGH' })
        : 0,
      AnalysisRun.findOne({ ownerId: userObjectId })
        .sort({ createdAt: -1 })
        .populate('utilityIds', 'name color')
        .lean(),
      AuditEvent.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .limit(6)
        .lean(),
      AIRequest.aggregate([
        { $match: { userId: userObjectId } },
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
        utilities: allowedUtilIds.length,
        projects: totalProjects,
        conflicts: totalConflicts,
        highPriority: highPriorityConflicts,
        estimatedAICost: Number(cost.toFixed(4)),
      },
      latestAnalysis: latestAnalysis || null,
      recentAudits: recentAudits || [],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
};
