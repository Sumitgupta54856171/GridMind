const mongoose = require('mongoose');

const dataSourceSchema = new mongoose.Schema(
  {
    utilityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Utility', required: true },
    name: { type: String, required: true, trim: true },
    sourceType: {
      type: String,
      enum: ['pdf', 'csv', 'json', 'gis', 'webpage', 'manual'],
      required: true,
    },
    sourceUrl: { type: String, default: '' },
    storagePath: { type: String, default: '' },
    retrievedAt: { type: Date, default: Date.now },
    checksum: { type: String, default: '' },
    parserStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    metadata: {
      publisher: { type: String, default: '' },
      publicationDate: { type: Date },
      description: { type: String, default: '' },
    },
  },
  { timestamps: true },
);

dataSourceSchema.index({ utilityId: 1 });
dataSourceSchema.index({ sourceType: 1 });
dataSourceSchema.index({ retrievedAt: -1 });

module.exports = mongoose.model('DataSource', dataSourceSchema);
