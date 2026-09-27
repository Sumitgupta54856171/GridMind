const AIRequest = require('../../models/AIRequest');
const User = require('../../models/User');
const { generateConflictRecommendation } = require('../../services/aiRecommendationService');

// GET /api/ai/stats
const getAIStatsAndConfig = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.userId;
    const user = await User.findById(userId).lean();
    const prefs = user?.aiPreferences || {
      privacyMode: 'public_only',
      lowCost: false,
      costVisible: true,
    };

    const requests = await AIRequest.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const aggregateResult = await AIRequest.aggregate([
      { $match: { userId: user._id } },
      {
        $group: {
          _id: null,
          totalRequests: { $sum: 1 },
          totalInputTokens: { $sum: '$inputTokens' },
          totalOutputTokens: { $sum: '$outputTokens' },
          totalEstimatedCost: { $sum: '$estimatedCost' },
        },
      },
    ]);

    const stats = aggregateResult[0] || {
      totalRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalEstimatedCost: 0,
    };

    return res.json({
      status: 'success',
      preferences: prefs,
      stats: {
        totalRequests: stats.totalRequests,
        totalInputTokens: stats.totalInputTokens,
        totalOutputTokens: stats.totalOutputTokens,
        totalEstimatedCost: Number(stats.totalEstimatedCost.toFixed(4)),
      },
      requests,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/ai/settings
const updateAISettings = async (req, res, next) => {
  try {
    const { privacyMode, lowCost, costVisible } = req.body;

    const userId = req.user?._id || req.userId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.aiPreferences) {
      user.aiPreferences = {};
    }

    if (privacyMode && ['public_only', 'redacted', 'standard'].includes(privacyMode)) {
      user.aiPreferences.privacyMode = privacyMode;
    }
    if (typeof lowCost === 'boolean') {
      user.aiPreferences.lowCost = lowCost;
    }
    if (typeof costVisible === 'boolean') {
      user.aiPreferences.costVisible = costVisible;
    }

    await user.save();

    return res.json({
      status: 'success',
      preferences: user.aiPreferences,
      message: 'AI Control Center settings updated successfully',
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/ai/test
const testAISample = async (req, res, next) => {
  try {
    const userId = req.user?._id || req.userId;
    const user = await User.findById(userId).lean();
    const privacyMode = req.body.privacyMode || user?.aiPreferences?.privacyMode || 'public_only';
    const lowCost = typeof req.body.lowCost === 'boolean' ? req.body.lowCost : (user?.aiPreferences?.lowCost || false);

    const sampleA = {
      name: 'Central Water Conduit Rehabilitation',
      utilityName: 'Metropolitan Water Dept',
      projectType: 'water',
      startDate: new Date('2026-10-01'),
      endDate: new Date('2026-11-20'),
      description: 'Excavation and line replacement for 400m along Main Corridor.',
      corridorName: 'Main Street Corridor',
    };

    const sampleB = {
      name: 'Metro Fiber Optic Lateral Boring',
      utilityName: 'NextGen Telecom Co.',
      projectType: 'telecom',
      startDate: new Date('2026-10-15'),
      endDate: new Date('2026-12-05'),
      description: 'Directional drilling and vault placement along Main Corridor.',
      corridorName: 'Main Street Corridor',
    };

    const rec = await generateConflictRecommendation({
      userId,
      projectA: sampleA,
      projectB: sampleB,
      distanceMeters: 45,
      overlapDays: 36,
      severity: 'HIGH',
      corridor: 'Main Street Corridor',
      privacyMode,
      lowCost,
    });

    return res.json({
      status: 'success',
      recommendation: rec,
      privacyMode,
      modelUsed: lowCost ? 'gemini-2.5-flash-lite' : 'gemini-2.5-flash',
      estimatedCost: lowCost ? 0.002 : 0.008,
      message: 'Sample AI coordination request completed successfully',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAIStatsAndConfig,
  updateAISettings,
  testAISample,
};
