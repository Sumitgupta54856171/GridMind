const mongoose = require('mongoose');

const transportationImpactSchema = new mongoose.Schema(
  {
    conflictId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conflict', required: true },
    corridor: {
      name: { type: String },
      geometry: { type: mongoose.Schema.Types.Mixed },
    },
    disruptionWindow: {
      startDate: { type: Date },
      endDate: { type: Date },
    },
    transportationData: {
      source: { type: String },
      routeData: { type: mongoose.Schema.Types.Mixed },
      trafficContext: { type: mongoose.Schema.Types.Mixed },
    },
    impactSummary: { type: String, default: '' },
    alternativeContext: { type: mongoose.Schema.Types.Mixed },
    confidence: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('TransportationImpact', transportationImpactSchema);
