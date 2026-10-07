import React, { useState, useEffect, useCallback } from 'react';
import { checkAvailability, createBooking } from '../api/client';
import { useSocket } from '../context/SocketContext';
import StatusBadge from './StatusBadge';
import {
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
  MapPin
} from 'lucide-react';

export default function BookingModal({ resource, isOpen, onClose, onSuccess }) {
  const { addToast } = useSocket();

  // Helper: Today's date in YYYY-MM-DD
  const getTodayDateStr = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper: Default start time (next rounded hour)
  const getDefaultTimes = () => {
    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const startHour = String(now.getHours()).padStart(2, '0');
    const endHour = String((now.getHours() + 1) % 24).padStart(2, '0');
    return {
      startTime: `${startHour}:00`,
      endTime: `${endHour}:00`
    };
  };

  const defaultTimes = getDefaultTimes();

  const [date, setDate] = useState(getTodayDateStr());
  const [startTime, setStartTime] = useState(defaultTimes.startTime);
  const [endTime, setEndTime] = useState(defaultTimes.endTime);
  const [purpose, setPurpose] = useState('');

  // Availability state
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState(null); // { available: boolean, message: string, conflict?: object }
  const [validationError, setValidationError] = useState('');
  const [submissionError, setSubmissionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setDate(getTodayDateStr());
      const times = getDefaultTimes();
      setStartTime(times.startTime);
      setEndTime(times.endTime);
      setPurpose('');
      setAvailabilityStatus(null);
      setValidationError('');
      setSubmissionError('');
    }
  }, [isOpen, resource]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Parse Date + Time into Date objects
  const getParsedDateTimes = useCallback(() => {
    if (!date || !startTime || !endTime) return null;
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    return { start, end };
  }, [date, startTime, endTime]);

  // Check Availability query
  useEffect(() => {
    if (!resource || !isOpen) return;

    if (resource.status === 'MAINTENANCE') {
      setAvailabilityStatus({
        available: false,
        message: 'This resource is currently under maintenance and cannot be booked.'
      });
      return;
    }

    const times = getParsedDateTimes();
    if (!times) return;

    const { start, end } = times;

    // Frontend validation
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setValidationError('Please enter a valid date and time.');
      setAvailabilityStatus(null);
      return;
    }

    if (start >= end) {
      setValidationError('End time must be strictly after start time.');
      setAvailabilityStatus(null);
      return;
    }

    // Check if in past (allow 5-minute buffer)
    const nowWithBuffer = new Date(Date.now() - 5 * 60 * 1000);
    if (start < nowWithBuffer) {
      setValidationError('Cannot book in the past. Please select an upcoming time.');
      setAvailabilityStatus(null);
      return;
    }

    setValidationError('');

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        setCheckingAvailability(true);
        const res = await checkAvailability({
          resourceId: resource._id,
          startTime: start.toISOString(),
          endTime: end.toISOString()
        });

        if (!isMounted) return;

        if (res.data?.available) {
          setAvailabilityStatus({
            available: true,
            message: 'Resource is available for this time window.'
          });
        } else {
          setAvailabilityStatus({
            available: false,
            message: res.data?.reason || 'Resource is already booked for this time.',
            conflict: res.data?.conflict
          });
        }
      } catch (err) {
        if (!isMounted) return;
        setAvailabilityStatus({
          available: false,
          message: err.message || 'Unable to verify availability.'
        });
      } finally {
        if (isMounted) setCheckingAvailability(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [date, startTime, endTime, resource, isOpen, getParsedDateTimes]);

  if (!isOpen || !resource) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmissionError('');

    if (!purpose.trim()) {
      setSubmissionError('Please state the purpose of your booking.');
      return;
    }

    const times = getParsedDateTimes();
    if (!times) {
      setSubmissionError('Please select valid booking dates and times.');
      return;
    }

    const { start, end } = times;

    if (start >= end) {
      setSubmissionError('End time must be strictly after start time.');
      return;
    }

    const nowWithBuffer = new Date(Date.now() - 5 * 60 * 1000);
    if (start < nowWithBuffer) {
      setSubmissionError('Cannot book in the past. Please choose an upcoming time.');
      return;
    }

    if (resource.status === 'MAINTENANCE') {
      setSubmissionError('Resource is under maintenance and cannot be reserved.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createBooking({
        resourceId: resource._id,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        purpose: purpose.trim()
      });

      if (res.success && res.data) {
        addToast(`Successfully booked ${resource.name}`, 'success');
        if (onSuccess) {
          onSuccess(res.data);
        }
        onClose();
      }
    } catch (err) {
      console.error('[Booking Error]', err);
      // HTTP 409 Conflict Handling
      if (err.status === 409) {
        setAvailabilityStatus({
          available: false,
          message: 'Resource is already booked for this time.',
          conflict: err.data?.conflict
        });
        setSubmissionError(
          'Double booking conflict: Resource is already booked for this time. Please select a different time slot.'
        );
      } else {
        setSubmissionError(err.message || 'Failed to create booking.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    !validationError &&
    purpose.trim() &&
    availabilityStatus?.available &&
    resource.status !== 'MAINTENANCE';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div
        className="modal-dialog"
        style={{ maxWidth: 540 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close booking modal"
        >
          <X size={18} />
        </button>

        <div style={{ padding: '24px 28px 20px 28px', borderBottom: '1px solid var(--border-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
              Reserve Resource
            </span>
            <StatusBadge status={resource.status} />
          </div>

          <h2 id="booking-modal-title" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {resource.name}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <MapPin size={13} />
            <span>{resource.location}</span>
            <span style={{ color: 'var(--border-medium)' }}>•</span>
            <span>{resource.category.replace('_', ' ')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
          {/* Submission / Conflict Error Banner */}
          {submissionError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 14px',
                backgroundColor: '#FEF3C7',
                border: '1px solid #FDE68A',
                borderRadius: 'var(--radius-sm)',
                color: '#B45309',
                fontSize: 13,
                marginBottom: 18,
                lineHeight: 1.45
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Reservation Conflict:</strong>
                <div>{submissionError}</div>
              </div>
            </div>
          )}

          {/* Validation Notice */}
          {validationError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FEE2E2',
                borderRadius: 'var(--radius-sm)',
                color: '#B91C1C',
                fontSize: 12.5,
                marginBottom: 18
              }}
            >
              <Info size={15} style={{ flexShrink: 0 }} />
              <span>{validationError}</span>
            </div>
          )}

          {/* Date and Time Pickers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 18 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="booking-date" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} style={{ color: 'var(--text-tertiary)' }} />
                Reservation Date
              </label>
              <input
                id="booking-date"
                type="date"
                className="form-input"
                min={getTodayDateStr()}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label" htmlFor="booking-start" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} style={{ color: 'var(--text-tertiary)' }} />
                  Start Time
                </label>
                <input
                  id="booking-start"
                  type="time"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="booking-end" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} style={{ color: 'var(--text-tertiary)' }} />
                  End Time
                </label>
                <input
                  id="booking-end"
                  type="time"
                  className="form-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Real-time Availability Feedback Banner */}
          <div style={{ marginBottom: 18 }}>
            {checkingAvailability ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12.5,
                  color: 'var(--text-secondary)'
                }}
              >
                <Clock size={14} className="animate-spin" />
                <span>Checking slot availability with server...</span>
              </div>
            ) : availabilityStatus ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 14px',
                  backgroundColor: availabilityStatus.available ? 'var(--status-available-bg)' : 'var(--status-inuse-bg)',
                  border: `1px solid ${availabilityStatus.available ? 'var(--status-available-border)' : 'var(--status-inuse-border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12.5,
                  color: availabilityStatus.available ? 'var(--status-available)' : 'var(--status-inuse)',
                  fontWeight: 500
                }}
              >
                {availabilityStatus.available ? (
                  <>
                    <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                    <span>Resource is available</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                    <span>{availabilityStatus.message}</span>
                  </>
                )}
              </div>
            ) : null}
          </div>

          {/* Booking Purpose */}
          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label" htmlFor="booking-purpose">
              Purpose / Meeting Context
            </label>
            <input
              id="booking-purpose"
              type="text"
              className="form-input"
              placeholder="e.g. Q4 Sprint Planning, Mobile Regression QA"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              maxLength={200}
              required
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
