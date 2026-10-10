

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAdminAnalytics } from '../api/client';
import { useSocket } from '../context/SocketContext';
import { useOrganization } from '../context/OrganizationContext';
import StatusBadge from '../components/StatusBadge';
import {
  Boxes,
  CheckCircle2,
  Clock,
  Wrench,
  CalendarDays,
  Activity,
  ArrowUpRight,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

export default function AdminDashboardPage() {
  const { socket } = useSocket();
  const { activeOrgId, activeOrganization } = useOrganization();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheduleTab, setScheduleTab] = useState('TODAY'); // 'TODAY' | 'UPCOMING'

  const fetchAnalytics = useCallback(async () => {
    if (!activeOrgId) {
      setData(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await getAdminAnalytics();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error('[AdminDashboard] Error:', err);
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  // Immediately clear stale analytics on tenant switch
  useEffect(() => {
    setData(null);
    fetchAnalytics();
  }, [activeOrgId, fetchAnalytics]);

  // Real-time synchronization on resource status or booking updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      fetchAnalytics();
    };

    socket.on('resource:status_changed', handleUpdate);
    socket.on('booking:created', handleUpdate);
    socket.on('booking:checked_in', handleUpdate);
    socket.on('booking:checked_out', handleUpdate);
    socket.on('booking:cancelled', handleUpdate);

    return () => {
      socket.off('resource:status_changed', handleUpdate);
      socket.off('booking:created', handleUpdate);
      socket.off('booking:checked_in', handleUpdate);
      socket.off('booking:checked_out', handleUpdate);
      socket.off('booking:cancelled', handleUpdate);
    };
  }, [socket, fetchAnalytics]);

  const metrics = data?.metrics || {
    totalResources: 0,
    availableResources: 0,
    inUseResources: 0,
    maintenanceResources: 0,
    totalBookings: 0,
    activeBookings: 0,
    upcomingBookings: 0,
    currentInUseRate: 0
  };

  const categoryCounts = data?.categoryBookingCounts || {
    SPACES: 0,
    DEVICES: 0,
    AUDIO_VIDEO: 0,
    ACCESSORIES: 0
  };

  const totalCatBookings = Object.values(categoryCounts).reduce((a, b) => a + b, 0) || 1;
  const mostBooked = data?.mostBookedResources || [];
  const maxBookingCount = mostBooked[0]?.bookingCount || 1;
  const todayBookings = data?.todayBookings || [];
  const upcomingBookings = data?.upcomingBookingsList || [];
  const recentActivity = data?.recentActivity || [];
  const resourceStatuses = data?.resourceStatuses || [];

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading && !data) {
    return (
      <main className="main-content">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
          <p style={{ fontSize: 14 }}>Loading Operations Analytics...</p>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="main-content">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--status-maint-text)' }}>
          <p style={{ fontSize: 14, marginBottom: 12 }}>{error}</p>
          <button onClick={fetchAnalytics} className="btn-secondary" style={{ margin: '0 auto' }}>
            Retry Loading
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      {/* Header */}
      <header className="dashboard-header" style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="greeting-title">Operations & Analytics Dashboard</h1>
            <p className="greeting-sub">
              Live capacity monitoring, resource utilization benchmarks, and company reservation pipeline.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={fetchAnalytics}
              className="btn-secondary"
              title="Refresh live metrics"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <Link
              to="/admin/resources"
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
            >
              Resources <ArrowUpRight size={14} />
            </Link>
            <Link
              to="/admin/members"
              className="btn-secondary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
            >
              Members <ArrowUpRight size={14} />
            </Link>
            <Link
              to="/admin/bookings"
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5 }}
            >
              All Bookings <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      {/* Suspended Workspace Warning Banner */}
      {(data?.planLimits?.status === 'SUSPENDED' || activeOrganization?.status === 'SUSPENDED') && (
        <div
          style={{
            padding: '14px 18px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FEE2E2',
            borderRadius: 'var(--radius-md)',
            color: '#B91C1C',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 13.5
          }}
        >
          <div style={{ fontWeight: 700 }}>WORKSPACE SUSPENDED:</div>
          <span>
            This workspace has been suspended by platform administration. Resource creation, invitations, and bookings are prohibited.
          </span>
        </div>
      )}

      {/* Free Plan Capacity & Quota Card */}
      {data?.planLimits && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            marginBottom: 28,
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 16
            }}
          >
            <div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#2563EB',
                  backgroundColor: 'rgba(37, 99, 235, 0.08)',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                Free Plan Quota
              </span>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
                Workspace Capacity & Policy Limits
              </h2>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Demo limits enforced across resources and teammates
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 20
            }}
          >
            {/* Resources Quota */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Active Resources</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {data.planLimits.currentResources} / {data.planLimits.maxResources}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 8,
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${data.planLimits.resourceCapacityPct}%`,
                    backgroundColor:
                      data.planLimits.resourceCapacityPct >= 100 ? '#DC2626' : '#2563EB',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                {data.planLimits.maxResources - data.planLimits.currentResources} resource slots remaining
              </span>
            </div>

            {/* Members Quota */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Team Members</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {data.planLimits.currentMembers} / {data.planLimits.maxMembers}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 8,
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${data.planLimits.memberCapacityPct}%`,
                    backgroundColor:
                      data.planLimits.memberCapacityPct >= 100 ? '#DC2626' : '#15803D',
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                {data.planLimits.maxMembers - data.planLimits.currentMembers} member slots remaining
              </span>
            </div>

            {/* Advance Booking Window */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Advance Booking Window</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                  7 Days Max
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 8,
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: '100%',
                    backgroundColor: '#D97706',
                    borderRadius: 'var(--radius-full)'
                  }}
                />
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                Prevents indefinite distant reservations
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Primary KPI Metric Blocks */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
        {/* Total Resources */}
        <div className="stat-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Resources
            </span>
            <Boxes size={16} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {metrics.totalResources}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            In workspace inventory
          </div>
        </div>

        {/* Available Resources */}
        <div className="stat-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Available
            </span>
            <CheckCircle2 size={16} style={{ color: 'var(--status-available-text)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--status-available-text)', letterSpacing: '-0.02em' }}>
            {metrics.availableResources}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Ready for booking
          </div>
        </div>

        {/* In Use */}
        <div className="stat-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              In Use
            </span>
            <Activity size={16} style={{ color: 'var(--status-inuse-text)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--status-inuse-text)', letterSpacing: '-0.02em' }}>
            {metrics.inUseResources}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Currently occupied
          </div>
        </div>

        {/* Maintenance */}
        <div className="stat-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Maintenance
            </span>
            <Wrench size={16} style={{ color: 'var(--status-maint-text)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--status-maint-text)', letterSpacing: '-0.02em' }}>
            {metrics.maintenanceResources}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Offline for servicing
          </div>
        </div>

        {/* Total Bookings */}
        <div className="stat-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Bookings
            </span>
            <CalendarDays size={16} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {metrics.totalBookings}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Historical company volume
          </div>
        </div>

        {/* Active Bookings */}
        <div className="stat-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active Bookings
            </span>
            <Clock size={16} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#2563EB', letterSpacing: '-0.02em' }}>
            {metrics.activeBookings}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Checked in right now
          </div>
        </div>

        {/* Upcoming Bookings */}
        <div className="stat-card" style={{ padding: '16px 20px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Upcoming
            </span>
            <TrendingUp size={16} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {metrics.upcomingBookings}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Scheduled ahead
          </div>
        </div>
      </section>

      {/* Utilization & Breakdown Section */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Utilization & Capacity Rate */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Live Workspace Utilization
            </h2>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {metrics.currentInUseRate}% In Use
            </span>
          </div>

          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Ratio of active office inventory currently checked in and occupied by employees.
          </p>

          {/* Simple Progress Bar */}
          <div style={{ height: 10, width: '100%', backgroundColor: 'var(--bg-subtle)', borderRadius: 999, overflow: 'hidden', marginBottom: 20 }}>
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, metrics.currentInUseRate))}%`,
                backgroundColor: metrics.currentInUseRate > 75 ? 'var(--status-inuse-text)' : 'var(--text-primary)',
                borderRadius: 999,
                transition: 'width 0.4s ease'
              }}
            />
          </div>

          {/* Category Breakdown Bars */}
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 20, marginBottom: 12 }}>
            Booking Volume by Category
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(categoryCounts).map(([cat, count]) => {
              const pct = Math.round((count / totalCatBookings) * 100);
              return (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      {cat === 'AUDIO_VIDEO' ? 'Audio & Video' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {count} bookings ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: 6, width: '100%', backgroundColor: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${pct}%`,
                        backgroundColor: 'var(--text-secondary)',
                        borderRadius: 4
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Booked Resources */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Most Booked Resources
            </h2>
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              Top Demand
            </span>
          </div>

          {mostBooked.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '24px 0', textAlign: 'center' }}>
              No bookings recorded yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mostBooked.map((item, index) => {
                const relativePct = Math.round(((item.bookingCount || 0) / (maxBookingCount || 1)) * 100);
                return (
                  <div key={item._id} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-tertiary)', width: 16 }}>
                          {index + 1}.
                        </span>
                        <strong style={{ color: 'var(--text-primary)' }}>{item.name}</strong>
                        <span style={{ fontSize: 11, color: 'var(--text-tertiary)', backgroundColor: 'var(--bg-subtle)', padding: '1px 6px', borderRadius: 4 }}>
                          {item.category}
                        </span>
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.bookingCount} {item.bookingCount === 1 ? 'booking' : 'bookings'}
                      </span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div style={{ height: 6, width: '100%', backgroundColor: 'var(--bg-subtle)', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(5, relativePct)}%`,
                          backgroundColor: index === 0 ? '#1E3A8A' : 'var(--border-strong)',
                          borderRadius: 4
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Operational Activity Section (Reservations Pipeline & Live Status) */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, marginBottom: 28 }}>
        {/* Today's & Upcoming Bookings */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Reservation Pipeline
            </h2>
            <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--bg-subtle)', padding: 3, borderRadius: 'var(--radius-sm)' }}>
              <button
                onClick={() => setScheduleTab('TODAY')}
                style={{
                  border: 'none',
                  background: scheduleTab === 'TODAY' ? 'var(--bg-surface)' : 'transparent',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: scheduleTab === 'TODAY' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  boxShadow: scheduleTab === 'TODAY' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                Today ({todayBookings.length})
              </button>
              <button
                onClick={() => setScheduleTab('UPCOMING')}
                style={{
                  border: 'none',
                  background: scheduleTab === 'UPCOMING' ? 'var(--bg-surface)' : 'transparent',
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: scheduleTab === 'UPCOMING' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  cursor: 'pointer',
                  boxShadow: scheduleTab === 'UPCOMING' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                Upcoming ({upcomingBookings.length})
              </button>
            </div>
          </div>

          {scheduleTab === 'TODAY' ? (
            todayBookings.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '28px 0', textAlign: 'center' }}>
                No bookings scheduled for today.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {todayBookings.map((b) => (
                  <div
                    key={b._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-light)',
                      borderRadius: 'var(--radius-sm)',
                      gap: 12
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13, color: 'var(--text-primary)', display: 'block' }}>
                        {b.resourceId?.name || 'Resource'}
                      </strong>
                      <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                        {formatTime(b.startTime)} – {formatTime(b.endTime)} • {b.userId?.name || 'Employee'}
                      </span>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                ))}
              </div>
            )
          ) : upcomingBookings.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '28px 0', textAlign: 'center' }}>
              No upcoming reservations scheduled.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {upcomingBookings.map((b) => (
                <div
                  key={b._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-sm)',
                    gap: 12
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13, color: 'var(--text-primary)', display: 'block' }}>
                      {b.resourceId?.name || 'Resource'}
                    </strong>
                    <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                      {formatDate(b.startTime)} • {formatTime(b.startTime)} – {formatTime(b.endTime)} • {b.userId?.name || 'Employee'}
                    </span>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Resource Roster */}
        <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Current Resource Status
            </h2>
            <Link to="/admin/resources" style={{ fontSize: 12, color: 'var(--text-primary)', textDecoration: 'underline' }}>
              Manage All
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
            {resourceStatuses.map((r) => (
              <div
                key={r._id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--border-light)',
                  fontSize: 12.5
                }}
              >
                <div>
                  <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{r.name}</strong>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{r.location}</span>
                </div>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Booking Activity Log */}
      <section style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Recent Booking Activity
          </h2>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            Latest Log Entries
          </span>
        </div>

        {recentActivity.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '20px 0', textAlign: 'center' }}>
            No recent activity recorded.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Employee</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Resource</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Purpose</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Scheduled Window</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600, textAlign: 'right' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((b) => (
                  <tr key={b._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {b.userId?.name || 'Employee'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>
                      {b.resourceId?.name || 'Resource'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-secondary)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {b.purpose || '—'}
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-tertiary)' }}>
                      {formatDate(b.startTime)} {formatTime(b.startTime)} – {formatTime(b.endTime)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
