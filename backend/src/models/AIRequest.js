const mongoose = require('mongoose');

const aiRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    analysisRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnalysisRun' },
    conflictId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conflict' },
    provider: { type: String, default: '' },
    model: { type: String, default: '' },
    purpose: {
      type: String,
      enum: ['classification', 'explanation', 'recommendation', 'extraction', 'other'],
      default: 'other',
    },
    privacyMode: {
      type: String,
      enum: ['public_only', 'redacted', 'standard'],
      default: 'public_only',
    },
    dataPolicy: {
      allowedFields: [{ type: String }],
      redactedFields: [{ type: String }],
    },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    estimatedCost: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    success: { type: Boolean, default: false },
    error: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

aiRequestSchema.index({ userId: 1 });
aiRequestSchema.index({ analysisRunId: 1 });
aiRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AIRequest', aiRequestSchema);
