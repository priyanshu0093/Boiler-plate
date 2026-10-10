const { Notification } = require('../models/Notification');
const { emitNotificationToUser } = require('../socket/socketHandler');

/**
 * Helper to persist notification and emit via Socket.IO (scoped to tenant)
 */
const createAndSendNotification = async ({
  organizationId,
  userId,
  bookingId = null,
  type,
  title,
  message,
  resourceName = ''
}) => {
  try {
    if (!userId) return null;

    const notifData = {
      userId,
      bookingId,
      type,
      title,
      message,
      resourceName,
      isRead: false
    };

    if (organizationId) {
      notifData.organizationId = organizationId;
    }

    const notification = await Notification.create(notifData);

    emitNotificationToUser(userId.toString(), notification);
    return notification;
  } catch (error) {
    console.error('[NotificationService] Failed to create notification:', error);
    return null;
  }
};

/**
 * @desc    Get notifications for authenticated user within current tenant
 * @route   GET /api/notifications
 * @access  Private
 */
const getNotifications = async (req, res, next) => {
  try {
    const query = {
      userId: req.user._id
    };

    if (req.organization) {
      query.organizationId = req.organization._id;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      ...query,
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
 * @desc    Mark a specific notification as read (scoped to user and tenant)
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res, next) => {
  try {
    const query = {
      _id: req.params.id,
      userId: req.user._id
    };

    if (req.organization) {
      query.organizationId = req.organization._id;
    }

    const notification = await Notification.findOne(query);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    await notification.save();

    const countQuery = {
      userId: req.user._id,
      isRead: false
    };
    if (req.organization) {
      countQuery.organizationId = req.organization._id;
    }

    const unreadCount = await Notification.countDocuments(countQuery);

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
 * @desc    Mark all authenticated user's notifications as read within tenant
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const updateQuery = {
      userId: req.user._id,
      isRead: false
    };

    if (req.organization) {
      updateQuery.organizationId = req.organization._id;
    }

    await Notification.updateMany(updateQuery, { $set: { isRead: true } });

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
