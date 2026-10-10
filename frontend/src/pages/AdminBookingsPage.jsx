import React, { useState, useEffect, useCallback } from 'react';
import { getAllBookingsAdmin, cancelBooking, updateBookingAdmin } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { useOrganization } from '../context/OrganizationContext';
import StatusBadge from '../components/StatusBadge';
import {
  User,
  XCircle,
  Edit2,
  X,
  Search,
  AlertCircle
} from 'lucide-react';

export default function AdminBookingsPage() {
  const { socket, addToast } = useSocket();
  const { activeOrgId } = useOrganization();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Editing state
  const [editingBooking, setEditingBooking] = useState(null);
  const [editPurpose, setEditPurpose] = useState('');
  const [editStatus, setEditStatus] = useState('CONFIRMED');
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  const fetchAllBookings = useCallback(async () => {
    if (!activeOrgId) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getAllBookingsAdmin({
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      });
      if (res.success && res.data) {
        setBookings(res.data);
      }
    } catch (err) {
      console.error('[AdminBookings] Error:', err);
      setError(err.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [activeOrgId, statusFilter]);

  // Immediately clear stale bookings on tenant switch
  useEffect(() => {
    setBookings([]);
    fetchAllBookings();
  }, [activeOrgId, fetchAllBookings]);

  // Real-time synchronization
  useEffect(() => {
    if (!socket) return;
    const handleCreated = () => fetchAllBookings();
    const handleCheckedIn = (data) => {
      setBookings((prev) =>
        prev.map((b) => (b._id === data.bookingId ? { ...b, status: 'ACTIVE' } : b))
      );
    };
    const handleCheckedOut = (data) => {
      setBookings((prev) =>
        prev.map((b) => (b._id === data.bookingId ? { ...b, status: 'COMPLETED' } : b))
      );
    };
    const handleCancelled = (data) => {
      setBookings((prev) =>
        prev.map((b) => (b._id === data.bookingId ? { ...b, status: 'CANCELLED' } : b))
      );
    };

    socket.on('booking:created', handleCreated);
    socket.on('booking:checked_in', handleCheckedIn);
    socket.on('booking:checked_out', handleCheckedOut);
    socket.on('booking:cancelled', handleCancelled);

    return () => {
      socket.off('booking:created', handleCreated);
      socket.off('booking:checked_in', handleCheckedIn);
      socket.off('booking:checked_out', handleCheckedOut);
      socket.off('booking:cancelled', handleCancelled);
    };
  }, [socket, fetchAllBookings]);

  // Admin Cancel
  const handleAdminCancel = async (bookingId) => {
    try {
      const res = await cancelBooking(bookingId);
      if (res.success) {
        setBookings((prev) =>
          prev.map((b) => (b._id === bookingId ? { ...b, status: 'CANCELLED' } : b))
        );
        addToast('Booking cancelled by admin', 'info');
      }
    } catch (err) {
      addToast(err.message || 'Failed to cancel booking', 'error');
    } finally {
      setConfirmCancelId(null);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (b) => {
    setEditingBooking(b);
    setEditPurpose(b.purpose || '');
    setEditStatus(b.status || 'CONFIRMED');
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingBooking) return;

    try {
      const res = await updateBookingAdmin(editingBooking._id, {
        purpose: editPurpose,
        status: editStatus
      });

      if (res.success && res.data) {
        setBookings((prev) =>
          prev.map((b) => (b._id === editingBooking._id ? res.data : b))
        );
        addToast('Booking updated successfully', 'success');
        setEditingBooking(null);
      }
    } catch (err) {
      alert(err.message || 'Failed to update booking');
    }
  };

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

  const filteredBookings = bookings.filter((b) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const userName = b.userId?.name?.toLowerCase() || '';
    const userEmail = b.userId?.email?.toLowerCase() || '';
    const resName = b.resourceId?.name?.toLowerCase() || '';
    const purpose = b.purpose?.toLowerCase() || '';
    return userName.includes(term) || userEmail.includes(term) || resName.includes(term) || purpose.includes(term);
  });

  return (
    <main className="main-content">
      <header className="dashboard-header">
        <div>
          <h1 className="greeting-title">Global Office Bookings & Audit</h1>
          <p className="greeting-sub">
            Monitor company-wide bookings, resolve scheduling conflicts, and manage reservations.
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
          <div className="search-input-wrapper" style={{ maxWidth: 360 }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search by employee, room, purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              Status:
            </span>
            <select
              className="status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Statuses ({bookings.length})</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="ACTIVE">Active (In Use)</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="AUTO_RELEASED">Auto Released</option>
            </select>
          </div>
        </div>
      </header>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FEE2E2',
            borderRadius: 'var(--radius-md)',
            color: '#B91C1C',
            fontSize: 13,
            marginBottom: 20
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Bookings Table */}
      <section style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--bg-subtle)' }}>
              <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)' }}>Employee</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Resource</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Scheduled Time</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Purpose</th>
              <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
              <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  Loading reservations...
                </td>
              </tr>
            ) : filteredBookings.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No bookings found matching filter.
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => (
                <tr key={b._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <User size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                      <div>
                        <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{b.userId?.name || 'Employee'}</strong>
                        <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>{b.userId?.email}</span>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{b.resourceId?.name || 'Resource'}</strong>
                      <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                        {b.resourceId?.location}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span>{formatDate(b.startTime)}</span>
                      <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                        {formatTime(b.startTime)} – {formatTime(b.endTime)}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', maxWidth: 220 }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.purpose || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <StatusBadge status={b.status} />
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '5px 9px', fontSize: 12 }}
                        onClick={() => handleOpenEdit(b)}
                        title="Edit Booking"
                      >
                        <Edit2 size={13} /> Edit
                      </button>

                      {['CONFIRMED', 'ACTIVE'].includes(b.status) && (
                        confirmCancelId === b._id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              type="button"
                              className="btn-cancel-booking"
                              style={{ padding: '5px 8px', fontSize: 11.5, backgroundColor: '#B91C1C', color: '#FFF', borderColor: '#B91C1C' }}
                              onClick={() => handleAdminCancel(b._id)}
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '5px 8px', fontSize: 11.5 }}
                              onClick={() => setConfirmCancelId(null)}
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="btn-cancel-booking"
                            style={{ padding: '5px 9px', fontSize: 12 }}
                            onClick={() => setConfirmCancelId(b._id)}
                            title="Cancel Booking"
                          >
                            <XCircle size={13} /> Cancel
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Admin Edit Modal */}
      {editingBooking && (
        <div className="modal-overlay" onClick={() => setEditingBooking(null)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <button type="button" className="modal-close-btn" onClick={() => setEditingBooking(null)}>
              <X size={18} />
            </button>

            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-light)' }}>
              <h2 style={{ fontSize: 19, fontWeight: 700 }}>
                Manage Reservation: {editingBooking.resourceId?.name}
              </h2>
              <p style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                Employee: {editingBooking.userId?.name} ({editingBooking.userId?.email})
              </p>
            </div>

            <form onSubmit={handleSaveEdit} style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="form-group">
                  <label className="form-label">Booking Status</label>
                  <select
                    className="form-input"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="CONFIRMED">CONFIRMED</option>
                    <option value="ACTIVE">ACTIVE (In Use)</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="AUTO_RELEASED">AUTO_RELEASED</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Purpose Context</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editPurpose}
                    onChange={(e) => setEditPurpose(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditingBooking(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
