import React, { useState, useEffect, useCallback } from 'react';
import { getMyBookings, checkInBooking, checkOutBooking, cancelBooking } from '../api/client';
import { useSocket } from '../context/SocketContext';
import StatusBadge from '../components/StatusBadge';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  LogOut,
  XCircle,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

export default function MyBookingsPage() {
  const { socket, addToast } = useSocket();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Fetch employee bookings
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyBookings();
      if (res.success && res.data) {
        setBookings(res.data);
      }
    } catch (err) {
      console.error('[MyBookings] Failed to fetch:', err);
      setError(err.message || 'Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Real-Time Socket.IO event synchronization without page refresh
  useEffect(() => {
    if (!socket) return;

    const handleCheckedIn = (data) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === data.bookingId
            ? { ...b, status: 'ACTIVE', checkedInAt: data.checkedInAt }
            : b
        )
      );
    };

    const handleCheckedOut = (data) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === data.bookingId
            ? { ...b, status: 'COMPLETED', checkedOutAt: data.checkedOutAt }
            : b
        )
      );
    };

    const handleCancelled = (data) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === data.bookingId ? { ...b, status: 'CANCELLED' } : b
        )
      );
    };

    const handleAutoReleased = (data) => {
      setBookings((prev) =>
        prev.map((b) =>
          b._id === data.bookingId ? { ...b, status: 'AUTO_RELEASED' } : b
        )
      );
    };

    const handleCreated = () => {
      fetchBookings();
    };

    socket.on('booking:checked_in', handleCheckedIn);
    socket.on('booking:checked_out', handleCheckedOut);
    socket.on('booking:cancelled', handleCancelled);
    socket.on('booking:auto_released', handleAutoReleased);
    socket.on('booking:created', handleCreated);

    return () => {
      socket.off('booking:checked_in', handleCheckedIn);
      socket.off('booking:checked_out', handleCheckedOut);
      socket.off('booking:cancelled', handleCancelled);
      socket.off('booking:auto_released', handleAutoReleased);
      socket.off('booking:created', handleCreated);
    };
  }, [socket, fetchBookings]);

  // Check In Handler (CONFIRMED -> ACTIVE)
  const handleCheckIn = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      const res = await checkInBooking(bookingId);
      if (res.success && res.data) {
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? { ...b, status: 'ACTIVE', checkedInAt: new Date() } : b))
        );
        addToast(`Checked in to ${res.data.resourceId?.name || 'resource'}`, 'success');
      }
    } catch (err) {
      console.error('[Check In Error]', err);
      addToast(err.message || 'Check-in failed', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Check Out Handler (ACTIVE -> COMPLETED)
  const handleCheckOut = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      const res = await checkOutBooking(bookingId);
      if (res.success && res.data) {
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? { ...b, status: 'COMPLETED', checkedOutAt: new Date() } : b))
        );
        addToast(`Checked out of ${res.data.resourceId?.name || 'resource'}`, 'success');
      }
    } catch (err) {
      console.error('[Check Out Error]', err);
      addToast(err.message || 'Check-out failed', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const [confirmCancelId, setConfirmCancelId] = useState(null);

  // Cancel Handler (CONFIRMED -> CANCELLED)
  const handleCancel = async (bookingId) => {
    try {
      setActionLoadingId(bookingId);
      const res = await cancelBooking(bookingId);
      if (res.success && res.data) {
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? { ...b, status: 'CANCELLED' } : b))
        );
        addToast('Booking cancelled successfully', 'info');
      }
    } catch (err) {
      console.error('[Cancel Error]', err);
      addToast(err.message || 'Cancellation failed', 'error');
    } finally {
      setActionLoadingId(null);
      setConfirmCancelId(null);
    }
  };

  // Format Helpers
  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filter categorization
  const upcomingBookings = bookings.filter((b) => b.status === 'CONFIRMED');
  const activeBookings = bookings.filter((b) => b.status === 'ACTIVE');
  const pastBookings = bookings.filter((b) =>
    ['COMPLETED', 'CANCELLED', 'AUTO_RELEASED'].includes(b.status)
  );

  let displayedBookings = bookings;
  if (activeTab === 'UPCOMING') displayedBookings = upcomingBookings;
  else if (activeTab === 'ACTIVE') displayedBookings = activeBookings;
  else if (activeTab === 'PAST') displayedBookings = pastBookings;

  return (
    <main className="main-content">
      <header className="dashboard-header">
        <div className="greeting-row">
          <h1 className="greeting-title">My Bookings</h1>
          <p className="greeting-sub">
            Track your reserved office resources, manage live check-ins, and review booking history.
          </p>
        </div>

        {/* Tab Filters */}
        <div className="category-chips" role="tablist" aria-label="Booking Status Tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ALL'}
            className={`chip-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            All Bookings ({bookings.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'ACTIVE'}
            className={`chip-btn ${activeTab === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setActiveTab('ACTIVE')}
          >
            Active Check-Ins ({activeBookings.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'UPCOMING'}
            className={`chip-btn ${activeTab === 'UPCOMING' ? 'active' : ''}`}
            onClick={() => setActiveTab('UPCOMING')}
          >
            Upcoming ({upcomingBookings.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'PAST'}
            className={`chip-btn ${activeTab === 'PAST' ? 'active' : ''}`}
            onClick={() => setActiveTab('PAST')}
          >
            History ({pastBookings.length})
          </button>
        </div>
      </header>

      {/* Bookings Content */}
      <section className="bookings-section">
        {loading ? (
          <div className="bookings-grid" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: 110, borderRadius: 'var(--radius-md)' }}
              />
            ))}
          </div>
        ) : error ? (
          <div className="empty-state">
            <AlertCircle size={32} style={{ color: '#D97706', marginBottom: 12 }} />
            <h3 className="empty-state-title">Unable to load bookings</h3>
            <p className="empty-state-desc">{error}</p>
            <button type="button" className="btn-primary" onClick={fetchBookings}>
              <RotateCcw size={14} /> Try Again
            </button>
          </div>
        ) : displayedBookings.length === 0 ? (
          <div className="empty-state">
            <h3 className="empty-state-title">No bookings in this section</h3>
            <p className="empty-state-desc">
              You don't have any bookings matching this status. Visit the Catalog to reserve shared spaces and equipment.
            </p>
          </div>
        ) : (
          <div className="bookings-grid">
            {displayedBookings.map((b) => {
              const res = b.resourceId || {};
              const isConfirmed = b.status === 'CONFIRMED';
              const isActive = b.status === 'ACTIVE';
              const isActionLoading = actionLoadingId === b._id;

              return (
                <div key={b._id} className="booking-item-card">
                  <div className="booking-item-left">
                    {res.image ? (
                      <img
                        src={res.image}
                        alt={res.name || 'Resource'}
                        className="booking-item-thumb"
                      />
                    ) : (
                      <div
                        className="booking-item-thumb"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-tertiary)' }}
                      >
                        {res.name || 'Asset'}
                      </div>
                    )}

                    <div className="booking-item-details">
                      <div className="booking-item-title-row">
                        <h3 className="booking-item-name">{res.name || 'Office Resource'}</h3>
                        <StatusBadge status={b.status} />
                      </div>

                      <div className="booking-item-time">
                        <Calendar size={13} style={{ color: 'var(--text-tertiary)' }} />
                        <span>{formatDate(b.startTime)}</span>
                        <Clock size={13} style={{ color: 'var(--text-tertiary)', marginLeft: 6 }} />
                        <span>
                          {formatTime(b.startTime)} – {formatTime(b.endTime)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                        <MapPin size={12} style={{ color: 'var(--text-tertiary)' }} />
                        <span>{res.location || 'Location'}</span>
                        <span style={{ color: 'var(--border-medium)' }}>•</span>
                        <span>{res.category ? res.category.replace('_', ' ') : 'General'}</span>
                      </div>

                      {b.purpose && (
                        <p className="booking-item-purpose">
                          Purpose: <span style={{ color: 'var(--text-primary)' }}>{b.purpose}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Booking Action Buttons */}
                  <div className="booking-item-actions">
                    {isConfirmed && (
                      <>
                        <button
                          type="button"
                          className="btn-checkin"
                          disabled={isActionLoading}
                          onClick={() => handleCheckIn(b._id)}
                        >
                          <CheckCircle2 size={14} />
                          <span>{isActionLoading ? 'Checking In...' : 'Check In'}</span>
                        </button>
                        {confirmCancelId === b._id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <button
                              type="button"
                              className="btn-cancel-booking"
                              style={{ backgroundColor: '#B91C1C', color: '#FFFFFF', borderColor: '#B91C1C' }}
                              disabled={isActionLoading}
                              onClick={() => handleCancel(b._id)}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '7px 10px', fontSize: 12 }}
                              disabled={isActionLoading}
                              onClick={() => setConfirmCancelId(null)}
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-cancel-booking"
                            disabled={isActionLoading}
                            onClick={() => setConfirmCancelId(b._id)}
                          >
                            <XCircle size={14} />
                            <span>Cancel</span>
                          </button>
                        )}
                      </>
                    )}

                    {isActive && (
                      <button
                        type="button"
                        className="btn-checkout"
                        disabled={isActionLoading}
                        onClick={() => handleCheckOut(b._id)}
                      >
                        <LogOut size={14} />
                        <span>{isActionLoading ? 'Checking Out...' : 'Check Out'}</span>
                      </button>
                    )}

                    {!isConfirmed && !isActive && (
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        Archived
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
