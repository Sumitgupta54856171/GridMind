const mongoose = require('mongoose');

const auditEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    resourceType: { type: String, default: '' },
    resourceId: { type: mongoose.Schema.Types.ObjectId },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditEventSchema.index({ userId: 1 });
auditEventSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditEvent', auditEventSchema);
