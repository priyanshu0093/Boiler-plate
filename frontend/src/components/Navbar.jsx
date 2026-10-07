import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import { NavLink, Link } from 'react-router-dom';
import { LogOut, Bell } from 'lucide-react';
import NotificationPanel from './NotificationPanel';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { isConnected } = useSocket();
  const { unreadCount, isOpen, togglePanel } = useNotifications();

  const getInitials = (name) => {
    if (!name) return 'E';
    return name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand-section">
          <Link to="/" style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <span className="brand-title">DeskDrop</span>
            <span className="brand-subtitle">Internal Office Resource Hub</span>
          </Link>

          {user && (
            <nav className="nav-links" aria-label="Main Navigation">
              <NavLink
                to="/"
                end
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                Catalog
              </NavLink>
              <NavLink
                to="/bookings"
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                My Bookings
              </NavLink>

              {user.role === 'ADMIN' && (
                <>
                  <span style={{ color: 'var(--border-medium)', margin: '0 4px', fontSize: 12 }}>|</span>
                  <NavLink
                    to="/admin"
                    end
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    Admin Dashboard
                  </NavLink>
                  <NavLink
                    to="/admin/resources"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    Manage Resources
                  </NavLink>
                  <NavLink
                    to="/admin/bookings"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    All Bookings
                  </NavLink>
                </>
              )}
            </nav>
          )}
        </div>

        <div className="nav-actions">
          {/* Socket.IO Real-time Connection Indicator */}
          <div
            className="socket-status"
            title={isConnected ? 'Connected to live updates' : 'Connecting to live updates'}
          >
            <span className={`socket-dot ${isConnected ? 'connected' : 'disconnected'}`} />
            <span>{isConnected ? 'Live' : 'Syncing'}</span>
          </div>

          {user && (
            <>
              {/* Notifications Bell & Dropdown */}
              <div className="notification-wrapper">
                <button
                  type="button"
                  className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
                  onClick={togglePanel}
                  title="Notifications"
                  aria-label={`Notifications, ${unreadCount} unread`}
                  aria-expanded={isOpen}
                >
                  <Bell size={17} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <NotificationPanel />
              </div>

              <Link
                to="/profile"
                className="user-profile"
                title="View & Edit Profile"
                style={{ textDecoration: 'none' }}
              >
                <div
                  className="user-avatar"
                  style={{
                    backgroundColor: user.role === 'ADMIN' ? '#1E3A8A' : 'var(--text-primary)'
                  }}
                >
                  {getInitials(user.name)}
                </div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                  <span className="user-role" style={{ color: user.role === 'ADMIN' ? '#2563EB' : 'var(--text-tertiary)', fontWeight: user.role === 'ADMIN' ? 700 : 500 }}>
                    {user.role}
                  </span>
                </div>
              </Link>

              <button
                type="button"
                className="logout-btn"
                onClick={logout}
                title="Log out"
                aria-label="Log out"
              >
                <LogOut size={14} />
                <span>Exit</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
