import React, { useState, useEffect, useCallback } from 'react';
import {
  getPlatformMetrics,
  getPlatformOrganizations,
  getPlatformOrganizationDetails,
  updatePlatformOrganizationStatus
} from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  ShieldAlert,
  Building2,
  Users2,
  Boxes,
  CalendarDays,
  ShieldCheck,
  PowerOff,
  CheckCircle2,
  RefreshCw,
  Search,
  AlertTriangle,
  ArrowRight,
  Info,
  X
} from 'lucide-react';

export default function PlatformAdminPage() {
  const { user } = useAuth();

  const [metrics, setMetrics] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [confirmModal, setConfirmModal] = useState(null); // { org, nextStatus }

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [mRes, oRes] = await Promise.all([
        getPlatformMetrics(),
        getPlatformOrganizations()
      ]);

      if (mRes.success && mRes.data) {
        setMetrics(mRes.data);
      }
      if (oRes.success && Array.isArray(oRes.data)) {
        setOrganizations(oRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load platform data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle modal confirmation
  const handleToggleStatus = async () => {
    if (!confirmModal) return;
    const { org, nextStatus } = confirmModal;

    try {
      setActionLoadingId(org._id);
      const res = await updatePlatformOrganizationStatus(org._id, nextStatus);
      if (res.success) {
        setConfirmModal(null);
        await loadData();
        if (selectedOrg && selectedOrg._id === org._id) {
          const detailRes = await getPlatformOrganizationDetails(org._id);
          if (detailRes.success) setSelectedOrg(detailRes.data);
        }
      }
    } catch (err) {
      alert(`Error updating organization status: ${err.message}`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInspectOrg = async (orgId) => {
    try {
      const res = await getPlatformOrganizationDetails(orgId);
      if (res.success && res.data) {
        setSelectedOrg(res.data);
      }
    } catch (err) {
      alert(`Failed to load details: ${err.message}`);
    }
  };

  const filteredOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.owner?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="main-content">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 28
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Platform Super Admin Console
            </h1>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                backgroundColor: '#1E3A8A',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-full)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em'
              }}
            >
              System Level
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            System-wide multi-tenant controls, workspace suspension, and cross-organization health metrics.
          </p>
        </div>

        <button
          onClick={loadData}
          className="btn-secondary"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <RefreshCw size={14} /> Refresh System
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FEE2E2',
            borderRadius: 'var(--radius-md)',
            color: '#B91C1C',
            marginBottom: 24,
            fontSize: 13.5
          }}
        >
          {error}
        </div>
      )}

      {/* High-level Platform KPIs */}
      {metrics && (
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
            marginBottom: 32
          }}
        >
          <div
            style={{
              padding: '18px 20px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Total Tenants
              </span>
              <Building2 size={16} style={{ color: 'var(--text-secondary)' }} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
              {metrics.totalOrganizations}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              {metrics.activeOrganizations} active · {metrics.suspendedOrganizations} suspended
            </div>
          </div>

          <div
            style={{
              padding: '18px 20px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Platform Users
              </span>
              <Users2 size={16} style={{ color: '#2563EB' }} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#2563EB' }}>
              {metrics.totalUsers}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              Across all organizations
            </div>
          </div>

          <div
            style={{
              padding: '18px 20px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Total Resources
              </span>
              <Boxes size={16} style={{ color: 'var(--status-available)' }} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
              {metrics.totalResources}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              Physical & digital assets
            </div>
          </div>

          <div
            style={{
              padding: '18px 20px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Total Bookings
              </span>
              <CalendarDays size={16} style={{ color: '#D97706' }} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)' }}>
              {metrics.totalBookings}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>
              Reservations logged
            </div>
          </div>
        </section>
      )}

      {/* Organization Listing Table */}
      <section
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
          marginBottom: 32
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={16} style={{ color: 'var(--text-secondary)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              All Workspaces ({filteredOrgs.length})
            </h2>
          </div>

          <div style={{ position: 'relative', width: 260 }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, slug, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 30, fontSize: 12.5 }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13.5 }}>
            Loading platform organizations...
          </div>
        ) : filteredOrgs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13.5 }}>
            No organizations found matching search criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'left' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Organization</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Owner</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Plan</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Usage (Res/Mem/Bkg)</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Created</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrgs.map((org) => {
                  const isSuspended = org.status === 'SUSPENDED';

                  return (
                    <tr
                      key={org._id}
                      style={{
                        borderBottom: '1px solid var(--border-light)',
                        backgroundColor: isSuspended ? 'rgba(254, 242, 242, 0.4)' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{org.name}</span>
                          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-tertiary)' }}>/{org.slug}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ fontSize: 13 }}>
                          <span>{org.owner?.name || '—'}</span>
                          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-secondary)' }}>
                            {org.owner?.email || '—'}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 11,
                            fontWeight: 700,
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          {org.plan}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)', fontSize: 12.5 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{org.resourceCount}</span> res ·{' '}
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{org.memberCount}</span> mem ·{' '}
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{org.bookingCount}</span> bkgs
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span
                          style={{
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            backgroundColor: isSuspended ? '#FEF2F2' : '#F0FDF4',
                            color: isSuspended ? '#B91C1C' : '#15803D'
                          }}
                        >
                          {org.status}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-tertiary)', fontSize: 12 }}>
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => handleInspectOrg(org._id)}
                            style={{
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              border: '1px solid var(--border-medium)',
                              borderRadius: 'var(--radius-sm)',
                              color: 'var(--text-primary)',
                              backgroundColor: 'var(--bg-surface)'
                            }}
                          >
                            Details
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === org._id}
                            onClick={() =>
                              setConfirmModal({
                                org,
                                nextStatus: isSuspended ? 'ACTIVE' : 'SUSPENDED'
                              })
                            }
                            style={{
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              borderRadius: 'var(--radius-sm)',
                              backgroundColor: isSuspended ? '#15803D' : '#DC2626',
                              color: '#FFFFFF'
                            }}
                          >
                            {isSuspended ? 'Reactivate' : 'Suspend'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Organization Detail Drawer / Modal */}
      {selectedOrg && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: 620,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 28,
              boxShadow: 'var(--shadow-modal)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedOrg.organization.name}
                </h3>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  Slug: {selectedOrg.organization.slug} · Status: {selectedOrg.organization.status}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrg(null)}
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Active Resources</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {selectedOrg.resourceCount} / 10
                </div>
              </div>
              <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Members</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {selectedOrg.memberCount} / 15
                </div>
              </div>
              <div style={{ padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>Bookings</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
                  {selectedOrg.bookingCount}
                </div>
              </div>
            </div>

            <h4 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 10 }}>
              Registered Members ({selectedOrg.members.length})
            </h4>
            <div style={{ maxHeight: 180, overflowY: 'auto', marginBottom: 20, border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)' }}>
              {selectedOrg.members.map((m) => (
                <div
                  key={m._id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-light)',
                    fontSize: 12.5
                  }}
                >
                  <span>{m.userId?.name} ({m.userId?.email})</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{m.role}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedOrg(null)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for Suspend / Reactivate */}
      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: 20
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: 440,
              width: '100%',
              padding: 24,
              boxShadow: 'var(--shadow-modal)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <AlertTriangle
                size={22}
                style={{ color: confirmModal.nextStatus === 'SUSPENDED' ? '#DC2626' : '#15803D' }}
              />
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                {confirmModal.nextStatus === 'SUSPENDED' ? 'Suspend Organization' : 'Reactivate Organization'}
              </h3>
            </div>

            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 20 }}>
              {confirmModal.nextStatus === 'SUSPENDED' ? (
                <>
                  Are you sure you want to suspend <strong>"{confirmModal.org.name}"</strong>? This will immediately
                  block all new bookings, resource creations, and email invitations, and eject connected real-time sockets.
                </>
              ) : (
                <>
                  Are you sure you want to reactivate <strong>"{confirmModal.org.name}"</strong>? Members will be
                  permitted to resume reservations and equipment management.
                </>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-secondary)'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToggleStatus}
                style={{
                  padding: '8px 18px',
                  backgroundColor: confirmModal.nextStatus === 'SUSPENDED' ? '#DC2626' : '#15803D',
                  color: '#FFFFFF',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                Confirm {confirmModal.nextStatus === 'SUSPENDED' ? 'Suspension' : 'Reactivation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
