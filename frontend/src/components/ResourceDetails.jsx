import React, { useState, useEffect } from 'react';
import { getResourceById } from '../api/client';
import StatusBadge from './StatusBadge';
import { X, MapPin, Calendar, Clock, AlertTriangle } from 'lucide-react';

export default function ResourceDetails({ resourceId, onClose, onBookResource }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchDetails() {
      try {
        setLoading(true);
        const res = await getResourceById(resourceId);
        if (isMounted) {
          setData(res.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load resource details');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (resourceId) {
      fetchDetails();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      isMounted = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [resourceId, onClose]);

  if (!resourceId) return null;

  const resource = data?.resource;
  const upcomingBookings = data?.upcomingBookings || [];

  const formatDateTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-resource-title"
    >
      <div
        className="modal-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {loading ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <div className="skeleton" style={{ height: 180, marginBottom: 20 }} />
            <div className="skeleton" style={{ height: 28, width: '60%', margin: '0 auto 12px' }} />
            <div className="skeleton" style={{ height: 16, width: '40%', margin: '0 auto' }} />
          </div>
        ) : error ? (
          <div style={{ padding: '36px 24px', textAlign: 'center' }}>
            <AlertTriangle size={32} style={{ color: '#D97706', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-secondary)' }}>{error}</p>
          </div>
        ) : resource ? (
          <>
            <div className="modal-header">
              <div className="modal-image-wrapper">
                {resource.image ? (
                  <img
                    src={resource.image}
                    alt={resource.name}
                    className="modal-image"
                  />
                ) : (
                  <div className="resource-image-fallback">
                    {resource.name}
                  </div>
                )}
                <span className="card-category-badge" style={{ top: 16, left: 16 }}>
                  {resource.category.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="modal-body">
              <div className="modal-meta-row">
                <StatusBadge status={resource.status} />
              </div>

              <h2 id="modal-resource-title" className="modal-title">
                {resource.name}
              </h2>

              <div className="modal-location">
                <MapPin size={14} />
                <span>{resource.location}</span>
              </div>

              <p className="modal-description">{resource.description}</p>

              {/* Technical Specifications */}
              {resource.specifications && Object.keys(resource.specifications).length > 0 && (
                <>
                  <h4 className="modal-section-title">Specifications</h4>
                  <div className="specs-grid">
                    {Object.entries(resource.specifications).map(([key, val]) => (
                      <div key={key} className="spec-item">
                        <span className="spec-key">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="spec-value">{val}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Upcoming Bookings */}
              <h4 className="modal-section-title">Upcoming Schedule</h4>
              <div className="upcoming-schedule-box">
                {upcomingBookings.length === 0 ? (
                  <p className="upcoming-empty">No active or upcoming bookings currently scheduled.</p>
                ) : (
                  upcomingBookings.map((b) => (
                    <div key={b._id} className="upcoming-booking-item">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
                        <span>{formatDate(b.startTime)}</span>
                        <Clock size={14} style={{ color: 'var(--text-tertiary)', marginLeft: 6 }} />
                        <span>{formatDateTime(b.startTime)} – {formatDateTime(b.endTime)}</span>
                      </div>
                      <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                        {b.purpose}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={onClose}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={resource.status === 'MAINTENANCE'}
                  title={resource.status === 'MAINTENANCE' ? 'Resource is currently under maintenance' : 'Book this resource'}
                  onClick={() => {
                    onClose();
                    if (onBookResource) onBookResource(resource);
                  }}
                >
                  Book Resource
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
