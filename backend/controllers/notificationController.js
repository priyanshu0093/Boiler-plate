const { Notification } = require('../models/Notification');
const { emitNotificationToUser } = require('../socket/socketHandler');

/**
 * Helper to persist notification and emit via Socket.IO
 */
const createAndSendNotification = async ({
  userId,
  bookingId = null,
  type,
  title,
  message,
  resourceName = ''
}) => {
  try {
    if (!userId) return null;

    const notification = await Notification.create({
      userId,
      bookingId,
      type,
      title,
      message,
      resourceName,
      isRead: false
    });

    emitNotificationToUser(userId.toString(), notification);
    return notification;
  } catch (error) {
    console.error('[NotificationService] Failed to create notification:', error);
    return null;
  }
};

/**
 * @desc    Get notifications for authenticated user
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      unreadCount,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark a specific notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    await notification.save();

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      unreadCount,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all authenticated user's notifications as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      unreadCount: 0
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createAndSendNotification,
  getNotifications,
  markAsRead,
  markAllAsRead
};
