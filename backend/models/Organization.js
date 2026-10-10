const mongoose = require('mongoose');

const ORGANIZATION_PLANS = ['FREE', 'PRO', 'ENTERPRISE'];
const ORGANIZATION_STATUSES = ['ACTIVE', 'SUSPENDED'];

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
      maxlength: [100, 'Organization name cannot exceed 100 characters']
    },
    slug: {
      type: String,
      required: [true, 'Organization slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug can only contain lowercase alphanumeric characters and hyphens'],
      index: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Organization owner is required'],
      index: true
    },
    plan: {
      type: String,
      enum: {
        values: ORGANIZATION_PLANS,
        message: '{VALUE} is not a valid organization plan'
      },
      default: 'FREE'
    },
    status: {
      type: String,
      enum: {
        values: ORGANIZATION_STATUSES,
        message: '{VALUE} is not a valid organization status'
      },
      default: 'ACTIVE',
      index: true
    },
    settings: {
      timezone: {
        type: String,
        default: 'UTC',
        trim: true
      },
      bookingGraceMinutes: {
        type: Number,
        default: 15,
        min: 1,
        max: 120
      },
      maxBookingDurationHours: {
        type: Number,
        default: 8,
        min: 1,
        max: 72
      },
      allowGuestBookings: {
        type: Boolean,
        default: false
      }
    }
  },
  {
    timestamps: true
  }
);

const Organization = mongoose.model('Organization', organizationSchema);

module.exports = {
  Organization,
  ORGANIZATION_PLANS,
  ORGANIZATION_STATUSES
};
