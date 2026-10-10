import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import { useOrganization } from './OrganizationContext';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../api/client';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const { activeOrgId } = useOrganization();
  const { socket, addToast } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications from backend scoped to active organization
  const fetchNotifications = useCallback(async () => {
    if (!user || !activeOrgId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const res = await getNotifications();
      if (res.success) {
        setNotifications(res.data || []);
        setUnreadCount(typeof res.unreadCount === 'number' ? res.unreadCount : 0);
      }
    } catch (err) {
      console.error('[NotificationContext] Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeOrgId]);

  // Immediately clear stale notifications and fetch on active organization change
  useEffect(() => {
    setNotifications([]);
    setUnreadCount(0);
    fetchNotifications();
  }, [activeOrgId, fetchNotifications]);

  // Real-time Socket.IO connection & event listeners
  useEffect(() => {
    if (!socket || !user) return;

    // Handler for targeted notifications
    const handleIncomingNotification = (newNotif) => {
      if (!newNotif) return;

      // Verify the notification belongs to this user
      const notifUserId = newNotif.userId?._id || newNotif.userId;
      const currentUserId = user._id || user.id;

      if (notifUserId && notifUserId.toString() !== currentUserId.toString()) {
        return;
      }

      setNotifications((prev) => {
        // Prevent duplicates
        if (prev.some((n) => n._id === newNotif._id)) return prev;
        return [newNotif, ...prev];
      });

      setUnreadCount((prev) => prev + 1);

      // Trigger toast popup for live notification
      if (addToast) {
        addToast(`${newNotif.title}: ${newNotif.message}`);
      }
    };

    socket.on('notification:new', handleIncomingNotification);

    return () => {
      socket.off('notification:new', handleIncomingNotification);
    };
  }, [socket, user, addToast]);

  // Mark single notification as read
  const markAsRead = async (id) => {
    try {
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      const res = await markNotificationAsRead(id);
      if (res.success && typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      console.error('[NotificationContext] Failed to mark notification as read:', err);
      fetchNotifications();
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);

      await markAllNotificationsAsRead();
    } catch (err) {
      console.error('[NotificationContext] Failed to mark all as read:', err);
      fetchNotifications();
    }
  };

  const togglePanel = () => {
    setIsOpen((prev) => !prev);
  };

  const closePanel = () => {
    setIsOpen(false);
  };

  const value = {
    notifications,
    unreadCount,
    loading,
    isOpen,
    togglePanel,
    closePanel,
    markAsRead,
    markAllAsRead,
    fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}

export default NotificationContext;
