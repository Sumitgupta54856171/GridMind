const mongoose = require('mongoose');

const evidenceItemSchema = new mongoose.Schema(
  {
    conflictId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conflict', required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'DataSource' },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    evidenceType: {
      type: String,
      enum: ['project_field', 'source_text', 'spatial_calculation', 'temporal_calculation', 'external_data'],
      required: true,
    },
    field: { type: String, default: '' },
    value: { type: mongoose.Schema.Types.Mixed },
    sourceReference: {
      page: { type: Number },
      section: { type: String },
      url: { type: String },
    },
    confidence: { type: Number, default: 1 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

evidenceItemSchema.index({ conflictId: 1 });
evidenceItemSchema.index({ projectId: 1 });
evidenceItemSchema.index({ sourceId: 1 });

module.exports = mongoose.model('EvidenceItem', evidenceItemSchema);
