const mongoose = require('mongoose');

const RESOURCE_CATEGORIES = ['SPACES', 'AUDIO', 'TESTING_HARDWARE', 'DISPLAYS', 'OTHER'];
const RESOURCE_STATUSES = ['AVAILABLE', 'IN_USE', 'MAINTENANCE'];

const resourceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true
    },
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters']
    },
    category: {
      type: String,
      required: [true, 'Resource category is required'],
      enum: {
        values: RESOURCE_CATEGORIES,
        message: '{VALUE} is not a valid resource category'
      },
      index: true
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true
    },
    image: {
      type: String,
      default: ''
    },
    specifications: {
      type: Map,
      of: String,
      default: {}
    },
    status: {
      type: String,
      enum: {
        values: RESOURCE_STATUSES,
        message: '{VALUE} is not a valid status'
      },
      default: 'AVAILABLE',
      index: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes scoped to tenant organization
resourceSchema.index({ organizationId: 1, category: 1, status: 1 });
resourceSchema.index({ organizationId: 1, isActive: 1 });

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = {
  Resource,
  RESOURCE_CATEGORIES,
  RESOURCE_STATUSES
};
