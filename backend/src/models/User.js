const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    aiPreferences: {
      privacyMode: { type: String, enum: ['public_only', 'redacted', 'standard'], default: 'public_only' },
      lowCost: { type: Boolean, default: false },
      costVisible: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('User', userSchema);

