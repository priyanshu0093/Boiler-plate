const mongoose = require('mongoose');

const MEMBER_ROLES = ['OWNER', 'ADMIN', 'MEMBER'];

const organizationMemberSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },
    role: {
      type: String,
      enum: {
        values: MEMBER_ROLES,
        message: '{VALUE} is not a valid member role'
      },
      default: 'MEMBER'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Enforce one membership record per user per organization
organizationMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

const OrganizationMember = mongoose.model('OrganizationMember', organizationMemberSchema);

module.exports = {
  OrganizationMember,
  MEMBER_ROLES
};
