const mongoose = require('mongoose');

const resourceLockSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true
    },
    lockId: {
      type: String,
      required: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 60 } // Automatic TTL cleanup after 60 seconds
    }
  },
  {
    timestamps: true
  }
);

const ResourceLock = mongoose.model('ResourceLock', resourceLockSchema);

module.exports = {
  ResourceLock
};
