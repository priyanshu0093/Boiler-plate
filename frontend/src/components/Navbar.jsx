import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import { useSocket } from '../context/SocketContext';
import { useNotifications } from '../context/NotificationContext';
import { NavLink, Link } from 'react-router-dom';
import { LogOut, Bell } from 'lucide-react';
import NotificationPanel from './NotificationPanel';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { activeOrganization } = useOrganization();
  const { isConnected } = useSocket();
  const { unreadCount, isOpen, togglePanel } = useNotifications();

  const isOrgAdmin =
    user?.role === 'ADMIN' ||
    (activeOrganization?.memberRole && ['OWNER', 'ADMIN'].includes(activeOrganization.memberRole));

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
          <Link to="/" className="navbar-brand-link" title="Boiler Plate">
            <div className="brand-logo-badge">B</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="brand-title">Boiler Plate</span>
              <span className="brand-saas-badge">SaaS</span>
            </div>
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

              {isOrgAdmin && (
                <>
                  <span className="nav-divider" aria-hidden="true" />
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
                  <NavLink
                    to="/admin/members"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    Members
                  </NavLink>
                </>
              )}

              {user?.role === 'ADMIN' && (
                <>
                  <span className="nav-divider" aria-hidden="true" />
                  <NavLink
                    to="/platform-admin"
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    style={{ color: '#2563EB', fontWeight: 600 }}
                  >
                    Platform Admin
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
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span className="notification-badge">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <NotificationPanel />
              </div>

              {/* Current user / profile menu */}
              <Link
                to="/profile"
                className="user-profile"
                title="View & Edit Profile"
              >
                <div
                  className="user-avatar"
                  style={{
                    backgroundColor: isOrgAdmin ? '#1E3A8A' : 'var(--text-primary)'
                  }}
                >
                  {getInitials(user.name)}
                </div>
                <div className="user-info">
                  <span className="user-name">{user.name}</span>
                </div>
              </Link>

              {/* Compact Sign-out Action Button */}
              <button
                type="button"
                className="nav-signout-btn"
                onClick={logout}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
