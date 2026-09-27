const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    conflictId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conflict', required: true },
    summary: { type: String, default: '' },
    whyItMatters: { type: String, default: '' },
    recommendedActions: [
      {
        action: { type: String },
        rationale: { type: String },
        priority: { type: String, enum: ['high', 'medium', 'low'], default: 'medium' },
      },
    ],
    confidence: { type: Number, default: 0 },
    limitations: [{ type: String }],
    model: {
      provider: { type: String },
      name: { type: String },
    },
    generatedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['draft', 'final', 'failed'], default: 'draft' },
  },
  { timestamps: false },
);

recommendationSchema.index({ conflictId: 1 });

module.exports = mongoose.model('Recommendation', recommendationSchema);
