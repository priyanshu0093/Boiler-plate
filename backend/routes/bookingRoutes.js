const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/bookingController');
const { protect, requireAdmin } = require('../middleware/authMiddleware');

// Public/Semi-public availability check
router.get('/availability', checkAvailability);

// Sweep ghost bookings (cron / n8n hook)
router.post('/sweep-ghosts', sweepGhostBookings);

// Admin Booking Endpoints (Require ADMIN role)
router.get('/admin/analytics', protect, requireAdmin, getAdminAnalytics);
router.get('/admin', protect, requireAdmin, getAllBookingsAdmin);
router.patch('/:id/admin', protect, requireAdmin, updateBookingAdmin);

// Employee Booking Routes
router.route('/')
  .get(protect, getBookings)
  .post(protect, createBooking);

router.route('/:id')
  .get(protect, getBookingById);

router.patch('/:id/check-in', protect, checkInBooking);
router.patch('/:id/check-out', protect, checkOutBooking);
router.patch('/:id/cancel', protect, cancelBooking);

module.exports = router;
