const mongoose = require('mongoose');

const INVITATION_ROLES = ['ADMIN', 'MEMBER'];
const INVITATION_STATUSES = ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'];

const invitationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    email: {
      type: String,
      required: [true, 'Invited email is required'],
      lowercase: true,
      trim: true,
      index: true
    },
    role: {
      type: String,
      enum: {
        values: INVITATION_ROLES,
        message: '{VALUE} is not a valid invitation role'
      },
      default: 'MEMBER'
    },
    tokenHash: {
      type: String,
      required: [true, 'Token hash is required'],
      unique: true,
      index: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: {
        values: INVITATION_STATUSES,
        message: '{VALUE} is not a valid invitation status'
      },
      default: 'PENDING',
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    acceptedAt: {
      type: Date
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Compound index for fast lookup of pending invitation per email per organization
invitationSchema.index({ organizationId: 1, email: 1, status: 1 });

const Invitation = mongoose.model('Invitation', invitationSchema);

module.exports = {
  Invitation,
  INVITATION_ROLES,
  INVITATION_STATUSES
};
