const mongoose = require('mongoose');

const polygonSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Polygon'], default: 'Polygon', required: true },
    coordinates: { type: [[[Number]]], required: true },
  },
  { _id: false },
);

const utilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    serviceAreaText: { type: String, default: '', trim: true },
    serviceArea: {
      type: polygonSchema,
      default: undefined,
    },
    website: { type: String, default: '', trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

utilitySchema.index({ ownerId: 1 });
utilitySchema.index({ serviceArea: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('Utility', utilitySchema);

