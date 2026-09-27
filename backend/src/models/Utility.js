const mongoose = require('mongoose');

const utilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    serviceArea: {
      type: { type: String, enum: ['Polygon'], default: 'Polygon' },
      coordinates: { type: [[[Number]]], default: undefined },
    },
    website: { type: String, default: '' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

utilitySchema.index({ ownerId: 1 });
utilitySchema.index({ serviceArea: '2dsphere' }, { sparse: true });

module.exports = mongoose.model('Utility', utilitySchema);
