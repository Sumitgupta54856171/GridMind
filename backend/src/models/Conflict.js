const mongoose = require('mongoose');

const conflictSchema = new mongoose.Schema(
  {
    analysisRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'AnalysisRun', required: true },
    projectAId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    projectBId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    spatial: {
      distanceMeters: { type: Number, default: 0 },
      intersects: { type: Boolean, default: false },
      sameCorridor: { type: Boolean, default: false },
      spatialScore: { type: Number, default: 0 },
    },
    temporal: {
      overlap: { type: Boolean, default: false },
      overlapStart: { type: Date },
      overlapEnd: { type: Date },
      overlapDays: { type: Number, default: 0 },
      temporalScore: { type: Number, default: 0 },
    },
    similarity: {
      score: { type: Number, default: 0 },
      matchedSignals: [{ type: String }],
    },
    conflictScore: { type: Number, default: 0 },
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
    status: {
      type: String,
      enum: ['new', 'reviewed', 'dismissed', 'actionable'],
      default: 'new',
    },
    explanationStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true },
);

conflictSchema.index({ analysisRunId: 1 });
conflictSchema.index({ severity: 1 });
conflictSchema.index({ conflictScore: -1 });

module.exports = mongoose.model('Conflict', conflictSchema);
