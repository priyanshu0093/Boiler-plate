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
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { resolveTenant, requireTenantAdmin } = require('../middleware/tenantMiddleware');

// Public/Semi-public availability check (scoped to resolved tenant)
router.get('/availability', optionalProtect, resolveTenant, checkAvailability);

// Sweep ghost bookings (cron / webhook)
router.post('/sweep-ghosts', optionalProtect, resolveTenant, sweepGhostBookings);

// Admin Booking Endpoints (Require Org Admin / Owner / Platform Admin)
router.get('/admin/analytics', protect, resolveTenant, requireTenantAdmin, getAdminAnalytics);
router.get('/admin', protect, resolveTenant, requireTenantAdmin, getAllBookingsAdmin);
router.patch('/:id/admin', protect, resolveTenant, requireTenantAdmin, updateBookingAdmin);

// Employee / Member Booking Routes
router.route('/')
  .get(protect, resolveTenant, getBookings)
  .post(protect, resolveTenant, createBooking);

router.route('/:id')
  .get(protect, resolveTenant, getBookingById);

router.patch('/:id/check-in', protect, resolveTenant, checkInBooking);
router.patch('/:id/check-out', protect, resolveTenant, checkOutBooking);
router.patch('/:id/cancel', protect, resolveTenant, cancelBooking);

module.exports = router;
