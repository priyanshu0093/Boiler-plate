import React, { useState, useEffect, useCallback } from 'react';
import { getMyBookings, checkInBooking, checkOutBooking } from '../api/client';
import { useSocket } from '../context/SocketContext';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  LogOut,
  Compass,
  Bookmark,
  Sparkles
} from 'lucide-react';

export default function UpcomingBookingCountdown({ onBrowseResources, onBookingUpdated }) {
  const { socket, addToast } = useSocket();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => new Date());
  const [actionLoading, setActionLoading] = useState(false);

  // Live timer tick every second with proper cleanup to prevent memory leaks
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch bookings for the logged-in user
  const fetchBookings = useCallback(async () => {
    try {
      const res = await getMyBookings();
      if (res && res.success && Array.isArray(res.data)) {
        setBookings(res.data);
      }
    } catch (err) {
      console.error('[UpcomingCountdown] Failed to fetch bookings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchBookings();
    };

    socket.on('booking:created', handleUpdate);
    socket.on('booking:checked_in', handleUpdate);
    socket.on('booking:checked_out', handleUpdate);
    socket.on('booking:cancelled', handleUpdate);
    socket.on('booking:auto_released', handleUpdate);

    return () => {
      socket.off('booking:created', handleUpdate);
      socket.off('booking:checked_in', handleUpdate);
      socket.off('booking:checked_out', handleUpdate);
      socket.off('booking:cancelled', handleUpdate);
      socket.off('booking:auto_released', handleUpdate);
    };
  }, [socket, fetchBookings]);

  // Format Helpers
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCountdown = (startTime, currentNow) => {
    const start = new Date(startTime);
    const diffMs = start.getTime() - currentNow.getTime();

    if (diffMs <= 0) {
      return 'Starting now';
    }

    const diffMin = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    const tomorrow = new Date(currentNow);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      start.getFullYear() === tomorrow.getFullYear() &&
      start.getMonth() === tomorrow.getMonth() &&
      start.getDate() === tomorrow.getDate();

    const isToday =
      start.getFullYear() === currentNow.getFullYear() &&
      start.getMonth() === currentNow.getMonth() &&
      start.getDate() === currentNow.getDate();

    const timeString = formatTime(start);

    if (diffMin < 1) {
      return 'Starts in less than a minute';
    }

    if (diffMin < 60) {
      return `Starts in ${diffMin} minute${diffMin === 1 ? '' : 's'}`;
    }

    if (isToday) {
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      if (mins === 0) {
        return `Starts in ${hours} hour${hours === 1 ? '' : 's'}`;
      }
      return `Starts in ${hours} hour${hours === 1 ? '' : 's'} ${mins}m`;
    }

    if (isTomorrow) {
      return `Starts tomorrow at ${timeString}`;
    }

    if (diffDays <= 7) {
      const weekday = start.toLocaleDateString([], { weekday: 'short' });
      return `Starts in ${diffDays} day${diffDays === 1 ? '' : 's'} (${weekday} at ${timeString})`;
    }

    return `Starts on ${formatDate(start)} at ${timeString}`;
  };

  const formatActiveDuration = (checkedInAt, startTime, currentNow) => {
    const start = new Date(checkedInAt || startTime);
    const elapsedMs = Math.max(0, currentNow.getTime() - start.getTime());
    const elapsedMins = Math.floor(elapsedMs / 60000);
    const elapsedHours = Math.floor(elapsedMins / 60);
    const remMins = elapsedMins % 60;

    if (elapsedHours > 0) {
      return `Active for ${elapsedHours}h ${remMins}m`;
    }
    if (elapsedMins < 1) {
      return 'Active for < 1 minute';
    }
    return `Active for ${elapsedMins} minute${elapsedMins === 1 ? '' : 's'}`;
  };

  // Actions
  const handleCheckIn = async (bookingId, resourceName) => {
    try {
      setActionLoading(true);
      const res = await checkInBooking(bookingId);
      if (res && res.success) {
        addToast(`Checked in to ${resourceName || 'resource'}`, 'success');
        await fetchBookings();
        if (onBookingUpdated) onBookingUpdated();
      }
    } catch (err) {
      console.error('[Countdown CheckIn Error]', err);
      addToast(err.message || 'Check-in failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async (bookingId, resourceName) => {
    try {
      setActionLoading(true);
      const res = await checkOutBooking(bookingId);
      if (res && res.success) {
        addToast(`Checked out of ${resourceName || 'resource'}`, 'success');
        await fetchBookings();
        if (onBookingUpdated) onBookingUpdated();
      }
    } catch (err) {
      console.error('[Countdown CheckOut Error]', err);
      addToast(err.message || 'Check-out failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // 1. Prioritize ACTIVE bookings
  const activeBookings = bookings
    .filter((b) => b.status === 'ACTIVE')
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  // 2. Nearest upcoming CONFIRMED bookings whose end time hasn't passed
  const upcomingConfirmed = bookings
    .filter((b) => b.status === 'CONFIRMED' && new Date(b.endTime) > now)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  const targetBooking =
    activeBookings.length > 0
      ? activeBookings[0]
      : upcomingConfirmed.length > 0
      ? upcomingConfirmed[0]
      : null;

  if (loading) {
    return (
      <div className="upcoming-countdown-card loading" aria-busy="true">
        <div className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-md)' }} />
      </div>
    );
  }

  // Requirement 7: Empty state if no upcoming or active bookings
  if (!targetBooking) {
    return (
      <section className="upcoming-countdown-card empty" aria-label="Upcoming booking summary">
        <div className="countdown-empty-left">
          <div className="countdown-empty-icon-wrap">
            <Bookmark size={18} />
          </div>
          <div className="countdown-empty-texts">
            <h2 className="countdown-empty-title">No upcoming bookings</h2>
            <p className="countdown-empty-sub">
              Your schedule is completely open. Reserve desks, meeting spaces, or media gear below.
            </p>
          </div>
        </div>
        {onBrowseResources && (
          <button
            type="button"
            className="btn-browse-resources"
            onClick={onBrowseResources}
            title="Browse Resources Catalog"
          >
            <Compass size={14} />
            <span>Browse Resources</span>
          </button>
        )}
      </section>
    );
  }

  const res = targetBooking.resourceId || {};
  const isActive = targetBooking.status === 'ACTIVE';
  const hasStarted = !isActive && new Date(targetBooking.startTime).getTime() <= now.getTime();

  return (
    <section
      className={`upcoming-countdown-card ${isActive ? 'is-active-booking' : 'is-upcoming-booking'}`}
      aria-label="Current booking schedule alert"
    >
      <div className="countdown-main-row">
        {/* Left Side: Thumbnail & Details */}
        <div className="countdown-resource-info">
          {res.image ? (
            <img
              src={res.image}
              alt={res.name || 'Resource'}
              className="countdown-thumb"
            />
          ) : (
            <div className="countdown-thumb-placeholder">
              <Bookmark size={20} />
            </div>
          )}

          <div className="countdown-details">
            {/* Live Status Chip & Dynamic Countdown */}
            <div className="countdown-badge-row">
              {isActive ? (
                <div className="countdown-active-badge">
                  <span className="live-pulse-dot" />
                  <span className="badge-text">Currently Active</span>
                </div>
              ) : hasStarted ? (
                <div className="countdown-now-badge">
                  <span className="live-pulse-dot amber" />
                  <span className="badge-text">Starting now</span>
                </div>
              ) : (
                <div className="countdown-timer-badge">
                  <Clock size={13} />
                  <span className="badge-text">{formatCountdown(targetBooking.startTime, now)}</span>
                </div>
              )}

              {isActive && (
                <span className="countdown-active-duration">
                  {formatActiveDuration(targetBooking.checkedInAt, targetBooking.startTime, now)}
                </span>
              )}
            </div>

            {/* Resource Name */}
            <h2 className="countdown-resource-name">{res.name || 'Reserved Resource'}</h2>

            {/* Metadata: Date, Time Range, Location, Purpose */}
            <div className="countdown-meta-row">
              <span className="countdown-meta-item">
                <Calendar size={13} />
                <span>{formatDate(targetBooking.startTime)}</span>
              </span>

              <span className="countdown-meta-item">
                <Clock size={13} />
                <span>
                  {formatTime(targetBooking.startTime)} – {formatTime(targetBooking.endTime)}
                </span>
              </span>

              {res.location && (
                <span className="countdown-meta-item">
                  <MapPin size={13} />
                  <span>{res.location}</span>
                </span>
              )}
            </div>

            {targetBooking.purpose && (
              <p className="countdown-purpose">
                <strong>Purpose:</strong> {targetBooking.purpose}
              </p>
            )}
          </div>
        </div>

        {/* Right Side: Action Button */}
        <div className="countdown-action-zone">
          {isActive ? (
            <button
              type="button"
              className="btn-checkout"
              onClick={() => handleCheckOut(targetBooking._id, res.name)}
              disabled={actionLoading}
              title="Check out and release resource"
            >
              <LogOut size={15} />
              <span>{actionLoading ? 'Checking out...' : 'Check Out'}</span>
            </button>
          ) : hasStarted ? (
            <button
              type="button"
              className="btn-checkin"
              onClick={() => handleCheckIn(targetBooking._id, res.name)}
              disabled={actionLoading}
              title="Check in to activate booking"
            >
              <CheckCircle2 size={15} />
              <span>{actionLoading ? 'Checking in...' : 'Check In'}</span>
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
