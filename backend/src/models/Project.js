const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    utilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utility', required: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'DataSource', required: true },
    externalId: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    projectType: { type: String, default: '' },
    status: {
      type: String,
      enum: ['planned', 'active', 'completed', 'unknown'],
      default: 'unknown',
    },
    startDate: { type: Date },
    endDate: { type: Date },
    locationText: { type: String, default: '' },
    corridorName: { type: String, default: '' },
    geometry: {
      type: { type: String, enum: ['LineString', 'Polygon', 'Point', 'MultiPolygon', 'MultiLineString'] },
      coordinates: { type: mongoose.Schema.Types.Mixed },
    },
    locationConfidence: { type: Number, default: 0 },
    extraction: {
      method: { type: String, enum: ['manual', 'parser', 'llm'], default: 'manual' },
      confidence: { type: Number, default: 1 },
    },
    rawFields: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

projectSchema.index({ utilityId: 1 });
projectSchema.index({ sourceId: 1 });
projectSchema.index({ startDate: 1 });
projectSchema.index({ endDate: 1 });
projectSchema.index({ geometry: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('Project', projectSchema);
