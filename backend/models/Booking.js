const mongoose = require('mongoose');

const BOOKING_STATUSES = ['CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'AUTO_RELEASED'];

const bookingSchema = new mongoose.Schema(
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
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource',
      required: [true, 'Resource ID is required'],
      index: true
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      index: true
    },
    endTime: {
      type: Date,
      required: [true, 'End time is required'],
      index: true
    },
    purpose: {
      type: String,
      required: [true, 'Booking purpose is required'],
      trim: true,
      maxlength: [300, 'Purpose cannot exceed 300 characters']
    },
    status: {
      type: String,
      enum: {
        values: BOOKING_STATUSES,
        message: '{VALUE} is not a valid booking status'
      },
      default: 'CONFIRMED',
      index: true
    },
    checkedInAt: {
      type: Date,
      default: null
    },
    checkedOutAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for high-performance conflict detection and user bookings scoped to organization
bookingSchema.index({ organizationId: 1, resourceId: 1, status: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ organizationId: 1, userId: 1, startTime: -1 });

const Booking = mongoose.model('Booking', bookingSchema);
const { ResourceLock } = require('./ResourceLock');

module.exports = {
  Booking,
  BOOKING_STATUSES,
  ResourceLock
};

