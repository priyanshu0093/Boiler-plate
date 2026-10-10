const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { resolveTenant } = require('../middleware/tenantMiddleware');
const {
  getNotifications,
  markAsRead,
  markAllAsRead
} = require('../controllers/notificationController');

// All notification routes require authentication and tenant resolution
router.use(protect, resolveTenant);

router.get('/', getNotifications);
router.patch('/read-all', markAllAsRead);
router.patch('/:id/read', markAsRead);

module.exports = router;
