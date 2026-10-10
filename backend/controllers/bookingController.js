const mongoose = require('mongoose');
const { Booking } = require('../models/Booking');
const { Resource } = require('../models/Resource');
const { ResourceLock } = require('../models/ResourceLock');
const { OrganizationMember } = require('../models/OrganizationMember');
const { getPlanLimits } = require('../config/planLimits');
const {
  emitResourceStatusChanged,
  emitBookingCreated,
  emitBookingCheckedIn,
  emitBookingCheckedOut,
  emitBookingCancelled,
  emitBookingAutoReleased
} = require('../socket/socketHandler');
const { createAndSendNotification } = require('./notificationController');

// Local in-memory lock map (serializes concurrent requests within the same Node process)
const localResourceLocks = new Map();

const acquireLocalResourceLock = async (resourceId) => {
  const key = resourceId.toString();
  while (localResourceLocks.has(key)) {
    await localResourceLocks.get(key);
  }

  let release;
  const promise = new Promise((resolve) => {
    release = resolve;
  });

  localResourceLocks.set(key, promise);

  return () => {
    localResourceLocks.delete(key);
    release();
  };
};

/**
 * Acquire an atomic database-level distributed lock on a resource.
 * Guarantees mutual exclusion across multiple Node.js processes/instances.
 * Uses atomic MongoDB operations (findOneAndUpdate with upsert and conditional lease).
 */
const acquireDistributedLock = async (resourceId, organizationId, maxWaitMs = 5000, leaseMs = 4000) => {
  const resId = new mongoose.Types.ObjectId(resourceId);
  const orgId = new mongoose.Types.ObjectId(organizationId);
  const lockId = new mongoose.Types.ObjectId().toString();
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + leaseMs);

    try {
      const lockDoc = await ResourceLock.findOneAndUpdate(
        {
          _id: resId,
          $or: [
            { expiresAt: { $lt: now } },
            { expiresAt: { $exists: false } }
          ]
        },
        {
          $set: {
            organizationId: orgId,
            lockId: lockId,
            expiresAt: expiresAt
          }
        },
        {
          upsert: true,
          new: true
        }
      );

      if (lockDoc && lockDoc.lockId === lockId) {
        return async () => {
          try {
            await ResourceLock.deleteOne({ _id: resId, lockId: lockId });
          } catch (err) {
            console.error(`[ResourceLock] Error releasing lock for ${resourceId}:`, err.message);
          }
        };
      }
    } catch (err) {
      if (err.code !== 11000) {
        throw err;
      }
    }

    // Wait a short backoff period with jitter (25-50ms) before retrying
    const delay = 25 + Math.floor(Math.random() * 25);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error('RESOURCE_LOCK_TIMEOUT');
};

/**
 * Combines in-process serialization with database-level atomic locking.
 * 1. Serializes local requests in memory so a single instance doesn't thrash DB polls.
 * 2. Acquires database-level lock in MongoDB so multiple instances are strictly coordinated.
 */
const acquireResourceLock = async (resourceId, organizationId) => {
  const releaseLocal = await acquireLocalResourceLock(resourceId);
  try {
    const releaseDistributed = await acquireDistributedLock(resourceId, organizationId);
    return async () => {
      try {
        await releaseDistributed();
      } finally {
        releaseLocal();
      }
    };
  } catch (err) {
    releaseLocal();
    throw err;
  }
};

// Check for conflicting active bookings (scoped to resource and organization)
// Overlap condition: existing.startTime < requestedEnd AND existing.endTime > requestedStart
const checkConflict = async (resourceId, start, end, excludeBookingId = null, organizationId = null) => {
  const query = {
    resourceId,
    status: { $in: ['CONFIRMED', 'ACTIVE'] },
    startTime: { $lt: end },
    endTime: { $gt: start }
  };

  if (organizationId) {
    query.organizationId = organizationId;
  }

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return await Booking.findOne(query);
};

// @desc    Check resource availability for a specific time window (scoped to tenant organization)
// @route   GET /api/bookings/availability
// @access  Public (or authenticated)
const checkAvailability = async (req, res, next) => {
  try {
    const { resourceId, startTime, endTime } = req.query;

    if (!resourceId || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide resourceId, startTime, and endTime'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(resourceId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid resourceId format'
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'startTime must be before endTime'
      });
    }

    // 7-day future booking window limit for Free Plan
    const limits = getPlanLimits(req.organization?.plan);
    const maxAllowedStart = new Date(Date.now() + limits.maxBookingAdvanceDays * 24 * 60 * 60 * 1000);
    if (start > maxAllowedStart) {
      return res.status(400).json({
        success: false,
        code: 'BOOKING_WINDOW_EXCEEDED',
        message: `Free plan policy: Bookings can only be scheduled up to ${limits.maxBookingAdvanceDays} days in advance.`
      });
    }

    const resource = await Resource.findOne({
      _id: resourceId,
      organizationId: req.organization._id
    });

    if (!resource || !resource.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found or inactive'
      });
    }

    if (resource.status === 'MAINTENANCE') {
      return res.status(200).json({
        success: true,
        data: {
          available: false,
          reason: 'Resource is under maintenance'
        }
      });
    }

    const conflict = await checkConflict(resourceId, start, end, null, req.organization._id);

    if (conflict) {
      return res.status(200).json({
        success: true,
        data: {
          available: false,
          conflict: {
            startTime: conflict.startTime,
            endTime: conflict.endTime,
            status: conflict.status
          }
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        available: true
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new booking with strict conflict validation & concurrency lock
// @route   POST /api/bookings
// @access  Private (Employee / Org Member)
const createBooking = async (req, res, next) => {
  const { resourceId, startTime, endTime, purpose } = req.body;

  if (!resourceId || !startTime || !endTime || !purpose) {
    return res.status(400).json({
      success: false,
      message: 'Please provide resourceId, startTime, endTime, and purpose'
    });
  }

  if (!mongoose.Types.ObjectId.isValid(resourceId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid resourceId format'
    });
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid date format for startTime or endTime'
    });
  }

  if (start >= end) {
    return res.status(400).json({
      success: false,
      message: 'startTime must be strictly before endTime'
    });
  }

  // Prevent past bookings (allow 5-minute grace for slight network/client clock drift)
  const nowWithGrace = new Date(Date.now() - 5 * 60 * 1000);
  if (start < nowWithGrace) {
    return res.status(400).json({
      success: false,
      message: 'Cannot create a booking in the past'
    });
  }

  // 7-day future booking window limit for Free Plan
  const limits = getPlanLimits(req.organization?.plan);
  const maxAllowedStart = new Date(Date.now() + limits.maxBookingAdvanceDays * 24 * 60 * 60 * 1000);
  if (start > maxAllowedStart) {
    return res.status(400).json({
      success: false,
      code: 'BOOKING_WINDOW_EXCEEDED',
      message: `Free plan policy: Bookings can only be scheduled up to ${limits.maxBookingAdvanceDays} days in advance.`
    });
  }

  // Acquire combined local & distributed concurrency lock on the specific resource
  let releaseLock;
  try {
    releaseLock = await acquireResourceLock(resourceId, req.organization._id);
  } catch (err) {
    if (err.message === 'RESOURCE_LOCK_TIMEOUT') {
      return res.status(409).json({
        success: false,
        code: 'BOOKING_CONFLICT',
        message: 'Resource is currently experiencing high contention. Please try again shortly.'
      });
    }
    return next(err);
  }

  try {
    const resource = await Resource.findOne({
      _id: resourceId,
      organizationId: req.organization._id
    });

    if (!resource || !resource.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found or inactive'
      });
    }

    if (resource.status === 'MAINTENANCE') {
      return res.status(400).json({
        success: false,
        message: 'Resource is under maintenance and cannot be booked'
      });
    }

    // Atomic conflict check within tenant organization
    const conflict = await checkConflict(resourceId, start, end, null, req.organization._id);
    if (conflict) {
      return res.status(409).json({
        success: false,
        code: 'BOOKING_CONFLICT',
        message: 'Double booking conflict: Resource is already booked for this time window',
        conflict: {
          startTime: conflict.startTime,
          endTime: conflict.endTime,
          status: conflict.status
        }
      });
    }

    const booking = await Booking.create({
      organizationId: req.organization._id,
      userId: req.user._id,
      resourceId,
      startTime: start,
      endTime: end,
      purpose: purpose.trim(),
      status: 'CONFIRMED'
    });

    // Release lock as soon as the booking record is committed to DB
    await releaseLock();
    releaseLock = null;

    await booking.populate('resourceId', 'name category location status image');
    await booking.populate('userId', 'name email');

    // Emit Socket.IO event for live sync
    emitBookingCreated({
      organizationId: req.organization._id,
      bookingId: booking._id,
      resourceId: booking.resourceId._id,
      startTime: booking.startTime,
      endTime: booking.endTime
    });

    // Notify user of confirmed booking
    await createAndSendNotification({
      organizationId: req.organization._id,
      userId: booking.userId._id || booking.userId,
      bookingId: booking._id,
      type: 'BOOKING_CONFIRMED',
      title: 'Booking Confirmed',
      message: `Your booking for ${booking.resourceId?.name || 'resource'} has been confirmed.`,
      resourceName: booking.resourceId?.name || ''
    });

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  } finally {
    if (releaseLock) {
      await releaseLock();
    }
  }
};

// @desc    Get bookings (user's bookings or resource bookings within tenant organization)
// @route   GET /api/bookings
// @access  Private (Employee / Org Member)
const getBookings = async (req, res, next) => {
  try {
    const { resourceId, status, upcoming } = req.query;

    const query = {
      organizationId: req.organization._id
    };

    // If resourceId is specified, user can see confirmed/active bookings on that resource
    if (resourceId) {
      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid resourceId format'
        });
      }
      query.resourceId = resourceId;
    } else {
      // Otherwise, only return current employee's bookings within the organization
      query.userId = req.user._id;
    }

    if (status) {
      query.status = status.toUpperCase();
    }

    if (upcoming === 'true') {
      query.endTime = { $gt: new Date() };
    }

    const bookings = await Booking.find(query)
      .populate('resourceId', 'name category location status image')
      .populate('userId', 'name email')
      .sort({ startTime: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking by ID (scoped to tenant organization)
// @route   GET /api/bookings/:id
// @access  Private (Employee / Org Member)
const getBookingById = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      organizationId: req.organization._id
    })
      .populate('resourceId', 'name category location status image')
      .populate('userId', 'name email');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Normal employee can view their own booking or any booking if org admin
    if (booking.userId._id.toString() !== req.user._id.toString() && !req.isOrgAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check in to a booking (CONFIRMED -> ACTIVE)
// @route   PATCH /api/bookings/:id/check-in
// @access  Private (Employee - booking owner)
const checkInBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      organizationId: req.organization._id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Only booking owner can check in
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only check in to your own booking'
      });
    }

    // Lifecycle transition rules: Only CONFIRMED bookings can be checked in
    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: `Cannot check in: Booking is currently ${booking.status}. Only CONFIRMED bookings can be checked in.`
      });
    }

    const now = new Date();

    // Check if booking has already expired
    if (now > booking.endTime) {
      return res.status(400).json({
        success: false,
        message: 'Cannot check in: Booking time has already passed.'
      });
    }

    // Transition booking to ACTIVE
    booking.status = 'ACTIVE';
    booking.checkedInAt = now;
    await booking.save();

    // Transition resource to IN_USE within this organization
    const resource = await Resource.findOne({
      _id: booking.resourceId,
      organizationId: req.organization._id
    });

    if (resource && resource.status !== 'MAINTENANCE') {
      resource.status = 'IN_USE';
      await resource.save();

      emitResourceStatusChanged({
        organizationId: req.organization._id,
        resourceId: resource._id,
        status: resource.status,
        timestamp: now
      });
    }

    emitBookingCheckedIn({
      organizationId: req.organization._id,
      bookingId: booking._id,
      resourceId: booking.resourceId,
      checkedInAt: booking.checkedInAt
    });

    // Notify user of check-in
    await createAndSendNotification({
      organizationId: req.organization._id,
      userId: booking.userId,
      bookingId: booking._id,
      type: 'BOOKING_CHECKED_IN',
      title: 'Checked In',
      message: `You have checked in to ${resource?.name || 'resource'}.`,
      resourceName: resource?.name || ''
    });

    await booking.populate('resourceId', 'name category location status image');

    res.status(200).json({
      success: true,
      message: 'Successfully checked in to booking',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check out / end booking early (ACTIVE -> COMPLETED)
// @route   PATCH /api/bookings/:id/check-out
// @access  Private (Employee - booking owner)
const checkOutBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      organizationId: req.organization._id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Only booking owner can check out
    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only check out of your own booking'
      });
    }

    // Lifecycle transition rules: Only ACTIVE bookings can be checked out
    if (booking.status !== 'ACTIVE') {
      return res.status(400).json({
        success: false,
        message: `Cannot check out: Booking is currently ${booking.status}. Only ACTIVE bookings can be checked out.`
      });
    }

    const now = new Date();
    booking.status = 'COMPLETED';
    booking.checkedOutAt = now;
    await booking.save();

    // Check if there is another ACTIVE booking currently on this resource in this organization
    const resource = await Resource.findOne({
      _id: booking.resourceId,
      organizationId: req.organization._id
    });

    if (resource && resource.status !== 'MAINTENANCE') {
      const otherActiveBooking = await Booking.findOne({
        organizationId: req.organization._id,
        resourceId: resource._id,
        _id: { $ne: booking._id },
        status: 'ACTIVE'
      });

      if (!otherActiveBooking) {
        resource.status = 'AVAILABLE';
        await resource.save();

        emitResourceStatusChanged({
          organizationId: req.organization._id,
          resourceId: resource._id,
          status: 'AVAILABLE',
          timestamp: now
        });
      }
    }

    emitBookingCheckedOut({
      organizationId: req.organization._id,
      bookingId: booking._id,
      resourceId: booking.resourceId,
      checkedOutAt: booking.checkedOutAt
    });

    // Notify user of check-out
    await createAndSendNotification({
      organizationId: req.organization._id,
      userId: booking.userId,
      bookingId: booking._id,
      type: 'BOOKING_CHECKED_OUT',
      title: 'Checked Out',
      message: `You have checked out of ${resource?.name || 'resource'}.`,
      resourceName: resource?.name || ''
    });

    await booking.populate('resourceId', 'name category location status image');

    res.status(200).json({
      success: true,
      message: 'Successfully checked out of booking',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a booking (CONFIRMED -> CANCELLED)
// @route   PATCH /api/bookings/:id/cancel
// @access  Private (Employee - booking owner, or Org Admin)
const cancelBooking = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID format'
      });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      organizationId: req.organization._id
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Only booking owner or Org Admin/Owner can cancel
    const isOwner = booking.userId.toString() === req.user._id.toString();
    if (!isOwner && !req.isOrgAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own booking'
      });
    }

    // Lifecycle transition rules: Only CONFIRMED bookings can be cancelled
    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel: Booking is currently ${booking.status}. Only CONFIRMED bookings can be cancelled.`
      });
    }

    booking.status = 'CANCELLED';
    await booking.save();

    emitBookingCancelled({
      organizationId: req.organization._id,
      bookingId: booking._id,
      resourceId: booking.resourceId
    });

    // Notify user of booking cancellation
    await createAndSendNotification({
      organizationId: req.organization._id,
      userId: booking.userId,
      bookingId: booking._id,
      type: 'BOOKING_CANCELLED',
      title: 'Booking Cancelled',
      message: `Your booking for ${booking.resourceId?.name || 'resource'} was cancelled.`,
      resourceName: booking.resourceId?.name || ''
    });

    await booking.populate('resourceId', 'name category location status image');

    res.status(200).json({
      success: true,
      message: 'Booking successfully cancelled',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Auto-release ghost bookings past grace period (CONFIRMED -> AUTO_RELEASED)
// @route   POST /api/bookings/sweep-ghosts (also callable by cron / webhook)
// @access  Public or Protected
const sweepGhostBookings = async (req, res, next) => {
  try {
    const graceMinutes = parseInt(req.query.graceMinutes, 10) || 15;
    const cutoffTime = new Date(Date.now() - graceMinutes * 60 * 1000);

    const query = {
      status: 'CONFIRMED',
      startTime: { $lt: cutoffTime }
    };

    if (req.organization) {
      query.organizationId = req.organization._id;
    }

    const expiredBookings = await Booking.find(query);
    const released = [];

    for (const b of expiredBookings) {
      b.status = 'AUTO_RELEASED';
      await b.save();

      emitBookingAutoReleased({
        organizationId: b.organizationId,
        bookingId: b._id,
        resourceId: b.resourceId,
        reason: `Ghost booking automatically released (no check-in within ${graceMinutes} minutes)`
      });

      const resource = await Resource.findOne({
        _id: b.resourceId,
        organizationId: b.organizationId
      });

      await createAndSendNotification({
        organizationId: b.organizationId,
        userId: b.userId,
        bookingId: b._id,
        type: 'BOOKING_AUTO_RELEASED',
        title: 'Booking Auto-Released',
        message: `Your unattended booking for ${resource?.name || 'resource'} was automatically released.`,
        resourceName: resource?.name || ''
      });

      if (resource && resource.status === 'IN_USE') {
        const otherActive = await Booking.findOne({
          organizationId: b.organizationId,
          resourceId: resource._id,
          status: 'ACTIVE'
        });
        if (!otherActive) {
          resource.status = 'AVAILABLE';
          await resource.save();

          emitResourceStatusChanged({
            organizationId: b.organizationId,
            resourceId: resource._id,
            status: 'AVAILABLE',
            timestamp: new Date()
          });
        }
      }

      released.push(b._id);
    }

    res.status(200).json({
      success: true,
      message: `Ghost booking sweep completed. Released ${released.length} booking(s).`,
      releasedCount: released.length,
      releasedIds: released
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bookings across organization (Admin / Owner only)
// @route   GET /api/bookings/admin
// @access  Private (Org Admin / Owner)
const getAllBookingsAdmin = async (req, res, next) => {
  try {
    const { resourceId, status } = req.query;
    const query = {
      organizationId: req.organization._id
    };

    if (resourceId) {
      if (!mongoose.Types.ObjectId.isValid(resourceId)) {
        return res.status(400).json({ success: false, message: 'Invalid resourceId format' });
      }
      query.resourceId = resourceId;
    }

    if (status) {
      query.status = status.toUpperCase();
    }

    const bookings = await Booking.find(query)
      .populate('resourceId', 'name category location status image')
      .populate('userId', 'name email role')
      .sort({ startTime: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a booking details or status (Org Admin / Owner only)
// @route   PATCH /api/bookings/:id/admin
// @access  Private (Org Admin / Owner)
const updateBookingAdmin = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID format' });
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      organizationId: req.organization._id
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const { status, purpose, startTime, endTime } = req.body;

    if (purpose) booking.purpose = purpose.trim();

    if (startTime && endTime) {
      const start = new Date(startTime);
      const end = new Date(endTime);
      if (start >= end) {
        return res.status(400).json({ success: false, message: 'startTime must be before endTime' });
      }

      let releaseLock;
      try {
        releaseLock = await acquireResourceLock(booking.resourceId, req.organization._id);
        const conflict = await checkConflict(booking.resourceId, start, end, booking._id, req.organization._id);
        if (conflict) {
          return res.status(409).json({
            success: false,
            code: 'BOOKING_CONFLICT',
            message: 'Time slot conflict with existing booking',
            conflict
          });
        }

        booking.startTime = start;
        booking.endTime = end;
      } finally {
        if (releaseLock) {
          await releaseLock();
        }
      }
    }

    if (status) {
      const upperStatus = status.toUpperCase();
      booking.status = upperStatus;

      const resource = await Resource.findOne({
        _id: booking.resourceId,
        organizationId: req.organization._id
      });

      if (resource && resource.status !== 'MAINTENANCE') {
        if (upperStatus === 'ACTIVE') {
          resource.status = 'IN_USE';
          await resource.save();
          emitResourceStatusChanged({
            organizationId: req.organization._id,
            resourceId: resource._id,
            status: 'IN_USE',
            timestamp: new Date()
          });
        } else if (['COMPLETED', 'CANCELLED', 'AUTO_RELEASED'].includes(upperStatus)) {
          resource.status = 'AVAILABLE';
          await resource.save();
          emitResourceStatusChanged({
            organizationId: req.organization._id,
            resourceId: resource._id,
            status: 'AVAILABLE',
            timestamp: new Date()
          });
        }
      }
    }

    await booking.save();
    await booking.populate('resourceId', 'name category location status image');
    await booking.populate('userId', 'name email role');

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get admin dashboard analytics & utilization (scoped to tenant organization)
// @route   GET /api/bookings/admin/analytics
// @access  Private (Org Admin / Owner)
const getAdminAnalytics = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Fetch all resources within this organization
    const resources = await Resource.find({ organizationId: req.organization._id }).lean();

    // Resource metrics
    const totalResources = resources.length;
    const availableResources = resources.filter((r) => r.status === 'AVAILABLE').length;
    const inUseResources = resources.filter((r) => r.status === 'IN_USE').length;
    const maintenanceResources = resources.filter((r) => r.status === 'MAINTENANCE').length;

    // Fetch all bookings populated with resource and user within this organization
    const bookings = await Booking.find({ organizationId: req.organization._id })
      .populate('resourceId', 'name category location status image')
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();

    const totalBookings = bookings.length;
    const activeBookings = bookings.filter((b) => b.status === 'ACTIVE').length;
    const upcomingBookings = bookings.filter(
      (b) => b.status === 'CONFIRMED' && new Date(b.startTime) > now
    ).length;

    // Today's bookings
    const todayBookings = bookings
      .filter((b) => {
        const bStart = new Date(b.startTime);
        const bEnd = new Date(b.endTime);
        return bStart <= endOfToday && bEnd >= startOfToday;
      })
      .slice(0, 10);

    // Upcoming bookings list
    const upcomingBookingsList = bookings
      .filter((b) => new Date(b.startTime) > now && ['CONFIRMED', 'ACTIVE'].includes(b.status))
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 10);

    // Recent activity (latest bookings)
    const recentActivity = bookings.slice(0, 10);

    // Utilization & counts by resource and category
    const resourceBookingCounts = {};
    const categoryBookingCounts = {
      SPACES: 0,
      AUDIO: 0,
      TESTING_HARDWARE: 0,
      DISPLAYS: 0,
      OTHER: 0
    };

    bookings.forEach((b) => {
      if (!b.resourceId) return;
      const resId = b.resourceId._id ? b.resourceId._id.toString() : b.resourceId.toString();
      const resCat = b.resourceId.category || 'OTHER';

      if (b.status !== 'CANCELLED') {
        resourceBookingCounts[resId] = (resourceBookingCounts[resId] || 0) + 1;
        if (categoryBookingCounts[resCat] !== undefined) {
          categoryBookingCounts[resCat]++;
        } else {
          categoryBookingCounts[resCat] = 1;
        }
      }
    });

    // Most booked resources
    const allResourceBookingCounts = resources
      .map((r) => {
        const count = resourceBookingCounts[r._id.toString()] || 0;
        return {
          _id: r._id,
          name: r.name,
          category: r.category,
          location: r.location,
          status: r.status,
          bookingCount: count
        };
      })
      .sort((a, b) => b.bookingCount - a.bookingCount);

    const mostBookedResources = allResourceBookingCounts.slice(0, 5);

    // Utilization rate: percentage of resources currently IN_USE out of active resources
    const activeResources = resources.filter((r) => r.isActive && r.status !== 'MAINTENANCE').length;
    const currentInUseRate = activeResources > 0 ? Math.round((inUseResources / activeResources) * 100) : 0;

    // Active members count and plan limits
    const activeMembersCount = await OrganizationMember.countDocuments({
      organizationId: req.organization._id
    });

    const activeResourcesCount = resources.filter((r) => r.isActive).length;
    const planConfig = getPlanLimits(req.organization.plan);

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          totalResources,
          activeResources: activeResourcesCount,
          availableResources,
          inUseResources,
          maintenanceResources,
          totalBookings,
          activeBookings,
          upcomingBookings,
          currentInUseRate,
          totalMembers: activeMembersCount
        },
        planLimits: {
          plan: req.organization.plan || 'FREE',
          status: req.organization.status || 'ACTIVE',
          maxResources: planConfig.maxResources,
          maxMembers: planConfig.maxMembers,
          maxBookingAdvanceDays: planConfig.maxBookingAdvanceDays,
          currentResources: activeResourcesCount,
          currentMembers: activeMembersCount,
          resourceCapacityPct: Math.min(100, Math.round((activeResourcesCount / planConfig.maxResources) * 100)),
          memberCapacityPct: Math.min(100, Math.round((activeMembersCount / planConfig.maxMembers) * 100))
        },
        categoryBookingCounts,
        mostBookedResources,
        allResourceBookingCounts,
        todayBookings,
        upcomingBookingsList,
        recentActivity,
        resourceStatuses: resources.map((r) => ({
          _id: r._id,
          name: r.name,
          category: r.category,
          status: r.status,
          location: r.location
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkAvailability,
  createBooking,
  getBookings,
  getBookingById,
  checkInBooking,
  checkOutBooking,
  cancelBooking,
  sweepGhostBookings,
  getAllBookingsAdmin,
  updateBookingAdmin,
  getAdminAnalytics
};
