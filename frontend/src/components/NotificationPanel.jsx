import React, { useRef, useEffect } from 'react';
import { useNotifications } from '../context/NotificationContext';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  CalendarCheck,
  LogOut,
  XCircle,
  AlertTriangle,
  Clock,
  Check
} from 'lucide-react';

export default function NotificationPanel() {
  const {
    notifications,
    unreadCount,
    loading,
    isOpen,
    closePanel,
    markAsRead,
    markAllAsRead
  } = useNotifications();

  const panelRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      // Don't close if clicked the bell trigger button
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        !e.target.closest('.notification-bell-btn')
      ) {
        closePanel();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closePanel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closePanel]);

  if (!isOpen) return null;

  // Format relative timestamp
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 45) return 'Just now';
    if (diffSec < 3600) {
      const mins = Math.floor(diffSec / 60);
      return `${mins}m ago`;
    }
    if (diffSec < 86400) {
      const hours = Math.floor(diffSec / 3600);
      return `${hours}h ago`;
    }
    const days = Math.floor(diffSec / 86400);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderIcon = (type) => {
    switch (type) {
      case 'BOOKING_CONFIRMED':
        return <CalendarCheck size={16} className="notif-type-icon confirmed" />;
      case 'BOOKING_CHECKED_IN':
        return <CheckCircle2 size={16} className="notif-type-icon checkin" />;
      case 'BOOKING_CHECKED_OUT':
        return <LogOut size={16} className="notif-type-icon checkout" />;
      case 'BOOKING_CANCELLED':
        return <XCircle size={16} className="notif-type-icon cancelled" />;
      case 'BOOKING_AUTO_RELEASED':
        return <AlertTriangle size={16} className="notif-type-icon autoreleased" />;
      default:
        return <Bell size={16} className="notif-type-icon" />;
    }
  };

  return (
    <div className="notification-panel" ref={panelRef} role="dialog" aria-label="Notifications Panel">
      <div className="notif-header">
        <div className="notif-header-title-row">
          <span className="notif-header-title">Notifications</span>
          {unreadCount > 0 && (
            <span className="notif-header-badge">{unreadCount} unread</span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            className="notif-mark-all-btn"
            onClick={markAllAsRead}
            title="Mark all notifications as read"
          >
            <CheckCheck size={14} />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      <div className="notif-body">
        {loading && notifications.length === 0 ? (
          <div className="notif-loading">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 60, marginBottom: 8, borderRadius: 6 }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-empty">
            <div className="notif-empty-icon">
              <Bell size={24} />
            </div>
            <p className="notif-empty-title">No notifications yet</p>
            <p className="notif-empty-sub">
              You'll be notified when your bookings are confirmed, checked in, or updated.
            </p>
          </div>
        ) : (
          <div className="notif-list">
            {notifications.map((item) => (
              <div
                key={item._id}
                className={`notif-item ${item.isRead ? 'is-read' : 'is-unread'}`}
                onClick={() => {
                  if (!item.isRead) markAsRead(item._id);
                }}
              >
                <div className="notif-icon-col">{renderIcon(item.type)}</div>

                <div className="notif-content-col">
                  <div className="notif-title-row">
                    <span className="notif-item-title">{item.title}</span>
                    <span className="notif-item-time">{formatTimeAgo(item.createdAt)}</span>
                  </div>

                  <p className="notif-item-msg">{item.message}</p>
                </div>

                {!item.isRead && (
                  <button
                    type="button"
                    className="notif-read-check-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      markAsRead(item._id);
                    }}
                    title="Mark as read"
                    aria-label="Mark as read"
                  >
                    <Check size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
