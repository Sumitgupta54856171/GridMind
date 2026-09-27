const mongoose = require('mongoose');

const analysisRunSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    utilityIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Utility' }],
    projectIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
    status: {
      type: String,
      enum: ['queued', 'running', 'completed', 'partial', 'failed'],
      default: 'queued',
    },
    stages: {
      extraction: { type: String, default: 'pending' },
      geospatial: { type: String, default: 'pending' },
      temporal: { type: String, default: 'pending' },
      conflict: { type: String, default: 'pending' },
      evidence: { type: String, default: 'pending' },
      ai: { type: String, default: 'pending' },
      transportation: { type: String, default: 'pending' },
    },
    configuration: {
      spatialThresholdMeters: { type: Number, default: 100 },
      minimumOverlapDays: { type: Number, default: 1 },
      enableAI: { type: Boolean, default: false },
      enableTransportation: { type: Boolean, default: false },
    },
    startedAt: { type: Date },
    completedAt: { type: Date },
    error: {
      code: { type: String },
      message: { type: String },
    },
  },
  { timestamps: true },
);

analysisRunSchema.index({ ownerId: 1 });
analysisRunSchema.index({ status: 1 });
analysisRunSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AnalysisRun', analysisRunSchema);
