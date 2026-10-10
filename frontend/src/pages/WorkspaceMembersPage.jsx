import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import {
  getOrganizationMembers,
  updateOrganizationMemberRole,
  removeOrganizationMember,
  getOrganizationInvitations,
  createOrganizationInvitation,
  revokeOrganizationInvitation
} from '../api/client';
import {
  Users2,
  UserPlus,
  Mail,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  X,
  Info
} from 'lucide-react';

export default function WorkspaceMembersPage() {
  const { user: currentUser } = useAuth();
  const { activeOrganization, activeOrgId } = useOrganization();

  const [members, setMembers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [createdPreviewUrl, setCreatedPreviewUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Check if current user is Owner or Admin in the active organization
  const isOwner =
    activeOrganization?.memberRole === 'OWNER' || currentUser?.role === 'ADMIN';
  const isOrgAdmin =
    isOwner || activeOrganization?.memberRole === 'ADMIN';

  // Count how many OWNERs currently exist in the organization
  const ownerCount = members.filter((m) => m.role === 'OWNER').length;

  const loadData = useCallback(async () => {
    if (!activeOrgId) return;
    try {
      setLoading(true);
      setError('');
      const [membersRes, invRes] = await Promise.all([
        getOrganizationMembers(),
        getOrganizationInvitations().catch(() => ({ data: [] }))
      ]);

      if (membersRes.success && Array.isArray(membersRes.data)) {
        setMembers(membersRes.data);
      }
      if (invRes.success && Array.isArray(invRes.data)) {
        setInvitations(invRes.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to load workspace members.');
    } finally {
      setLoading(false);
    }
  }, [activeOrgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle member role change
  const handleRoleChange = async (memberId, newRole, member) => {
    if (member.role === 'OWNER' && ownerCount <= 1 && newRole !== 'OWNER') {
      alert('Cannot demote the only organization owner. Promote another member to OWNER first.');
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      const res = await updateOrganizationMemberRole(memberId, newRole);
      if (res.success) {
        setSuccessMsg(`Updated ${member.userId?.name || 'member'}'s role to ${newRole}`);
        await loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to update member role');
    }
  };

  // Handle member removal
  const handleRemoveMember = async (member) => {
    if (member.role === 'OWNER' && ownerCount <= 1) {
      alert('Cannot remove the only organization owner.');
      return;
    }

    const confirmMsg = `Are you sure you want to remove ${member.userId?.name || member.userId?.email} from ${activeOrganization?.name || 'this workspace'}?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setError('');
      setSuccessMsg('');
      const res = await removeOrganizationMember(member._id);
      if (res.success) {
        setSuccessMsg(`Removed ${member.userId?.name || 'member'} from workspace`);
        await loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to remove member');
    }
  };

  // Handle invitation submit
  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setInviteError('');
    setCreatedPreviewUrl('');

    if (!inviteEmail.trim()) {
      setInviteError('Please enter a recipient email.');
      return;
    }

    try {
      setInviteSubmitting(true);
      const res = await createOrganizationInvitation({
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole
      });

      if (res.success) {
        setInviteEmail('');
        if (res.data?.invitationUrl) {
          setCreatedPreviewUrl(res.data.invitationUrl);
        } else {
          setIsInviteModalOpen(false);
          setSuccessMsg(`Invitation sent to ${res.data?.invitation?.email}`);
        }
        await loadData();
      } else {
        setInviteError(res.message || 'Failed to create invitation');
      }
    } catch (err) {
      setInviteError(err.message || 'Failed to create invitation');
    } finally {
      setInviteSubmitting(false);
    }
  };

  // Handle revoke invitation
  const handleRevokeInvitation = async (invitationId, email) => {
    if (!window.confirm(`Revoke invitation for ${email}?`)) return;

    try {
      setError('');
      const res = await revokeOrganizationInvitation(invitationId);
      if (res.success) {
        setSuccessMsg(`Revoked invitation for ${email}`);
        await loadData();
      }
    } catch (err) {
      setError(err.message || 'Failed to revoke invitation');
    }
  };

  // Copy link helper
  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="main-content">
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Members & Access
            </h1>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: '2px 8px',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-full)',
                color: 'var(--text-secondary)'
              }}
            >
              {activeOrganization?.name || 'Current Workspace'}
            </span>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginTop: 4 }}>
            Manage team members, roles, and pending workspace invitations.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '4px 10px',
              backgroundColor: members.length >= 15 ? '#FEF2F2' : 'var(--bg-subtle)',
              border: `1px solid ${members.length >= 15 ? '#FECACA' : 'var(--border-medium)'}`,
              borderRadius: 'var(--radius-full)',
              color: members.length >= 15 ? '#DC2626' : 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Users2 size={13} />
            <span>{members.length} / 15 Members (Free Plan)</span>
          </span>

          {isOrgAdmin && (
            <button
              type="button"
              disabled={members.length >= 15}
              onClick={() => {
                if (members.length >= 15) return;
                setIsInviteModalOpen(true);
                setCreatedPreviewUrl('');
                setInviteError('');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                backgroundColor: members.length >= 15 ? 'var(--bg-subtle)' : 'var(--text-primary)',
                color: members.length >= 15 ? 'var(--text-tertiary)' : 'var(--text-inverse)',
                borderRadius: 'var(--radius-md)',
                fontSize: 13.5,
                fontWeight: 600,
                boxShadow: members.length >= 15 ? 'none' : 'var(--shadow-subtle)',
                cursor: members.length >= 15 ? 'not-allowed' : 'pointer'
              }}
              title={members.length >= 15 ? 'Member limit reached (15/15 on Free Plan)' : 'Invite Member'}
            >
              <UserPlus size={15} />
              <span>Invite Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Quota reached notice if 15 or more members */}
      {members.length >= 15 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 'var(--radius-md)',
            color: '#B45309',
            fontSize: 13,
            marginBottom: 20
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>Free Plan Member Limit Reached (15/15):</strong> This demo workspace has reached its maximum quota of 15 active members. To invite a new teammate, please remove an inactive member first.
          </span>
        </div>
      )}

      {/* Alerts */}
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
            fontSize: 13.5,
            marginBottom: 20
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '12px 16px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #DCFCE7',
            borderRadius: 'var(--radius-md)',
            color: '#15803D',
            fontSize: 13.5,
            marginBottom: 20
          }}
        >
          <Check size={16} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Active Members Table */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-light)',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          marginBottom: 36,
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-light)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users2 size={16} style={{ color: 'var(--text-secondary)' }} />
            <h2 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)' }}>
              Active Members ({members.length})
            </h2>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13.5 }}>
            Loading workspace members...
          </div>
        ) : members.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13.5 }}>
            No members found in this workspace.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Member</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Email</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '12px 20px', fontWeight: 600 }}>Joined</th>
                  {isOrgAdmin && <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isCurrentMemberLastOwner = m.role === 'OWNER' && ownerCount <= 1;
                  const isCurrentAuthUser = currentUser?._id === m.userId?._id;

                  return (
                    <tr
                      key={m._id}
                      style={{ borderBottom: '1px solid var(--border-light)', transition: 'background-color var(--transition-fast)' }}
                    >
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: m.role === 'OWNER' ? '#1E3A8A' : 'var(--bg-subtle)',
                              color: m.role === 'OWNER' ? '#FFFFFF' : 'var(--text-primary)',
                              border: '1px solid var(--border-medium)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                              fontWeight: 700
                            }}
                          >
                            {(m.userId?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {m.userId?.name || 'Unnamed User'}
                            </span>
                            {isCurrentAuthUser && (
                              <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>(You)</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                        {m.userId?.email || '—'}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        {isOrgAdmin && isOwner && !isCurrentMemberLastOwner ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m._id, e.target.value, m)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-medium)',
                              backgroundColor: 'var(--bg-surface)',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            <option value="OWNER">OWNER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="MEMBER">MEMBER</option>
                          </select>
                        ) : isOrgAdmin && !isOwner && m.role !== 'OWNER' ? (
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m._id, e.target.value, m)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-medium)',
                              backgroundColor: 'var(--bg-surface)',
                              fontSize: 12,
                              fontWeight: 600
                            }}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="MEMBER">MEMBER</option>
                          </select>
                        ) : (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: 11.5,
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              backgroundColor:
                                m.role === 'OWNER'
                                  ? '#FEF3C7'
                                  : m.role === 'ADMIN'
                                  ? '#EFF6FF'
                                  : 'var(--bg-subtle)',
                              color:
                                m.role === 'OWNER'
                                  ? '#92400E'
                                  : m.role === 'ADMIN'
                                  ? '#1D4ED8'
                                  : 'var(--text-secondary)'
                            }}
                          >
                            {m.role} {isCurrentMemberLastOwner && '(Only Owner)'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-tertiary)', fontSize: 12.5 }}>
                        {new Date(m.joinedAt || m.createdAt).toLocaleDateString()}
                      </td>
                      {isOrgAdmin && (
                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          {!isCurrentMemberLastOwner && (isOwner || m.role !== 'OWNER') && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(m)}
                              title="Remove member"
                              style={{
                                color: 'var(--text-tertiary)',
                                padding: 6,
                                borderRadius: 'var(--radius-sm)'
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations Section */}
      {isOrgAdmin && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Mail size={16} style={{ color: 'var(--text-secondary)' }} />
              <h2 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                Pending Invitations ({invitations.length})
              </h2>
            </div>
          </div>

          {invitations.length === 0 ? (
            <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
              No pending invitations. Click <strong>Invite Member</strong> to invite your colleagues.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Invited Email</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Role</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Invited By</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600 }}>Expires</th>
                    <th style={{ padding: '12px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invitations.map((inv) => (
                    <tr key={inv._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 500 }}>{inv.email}</td>
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
                          {inv.role}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-tertiary)', fontSize: 12.5 }}>
                        {inv.invitedBy?.name || 'Admin'}
                      </td>
                      <td style={{ padding: '14px 20px', color: 'var(--text-tertiary)', fontSize: 12.5 }}>
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleRevokeInvitation(inv._id, inv.email)}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: '#DC2626',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)'
                          }}
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
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
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: 'var(--shadow-modal)',
              position: 'relative'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>
                Invite Teammate to Workspace
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setCreatedPreviewUrl('');
                }}
                style={{ color: 'var(--text-tertiary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {createdPreviewUrl ? (
              // Development Preview Link
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    backgroundColor: '#EFF6FF',
                    border: '1px solid #DBEAFE',
                    borderRadius: 'var(--radius-md)',
                    color: '#1D4ED8',
                    fontSize: 12.5,
                    marginBottom: 16
                  }}
                >
                  <Info size={16} style={{ flexShrink: 0 }} />
                  <span>
                    Email service not configured in this environment. Use the preview link below to test or distribute.
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Single-Use Invitation Link</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      className="form-input"
                      value={createdPreviewUrl}
                      readOnly
                      style={{ fontSize: 12, backgroundColor: 'var(--bg-subtle)' }}
                    />
                    <button
                      type="button"
                      onClick={() => handleCopy(createdPreviewUrl)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 14px',
                        backgroundColor: copiedLink ? '#15803D' : 'var(--text-primary)',
                        color: 'var(--text-inverse)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 12.5,
                        fontWeight: 600,
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setCreatedPreviewUrl('');
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--text-primary)',
                      color: 'var(--text-inverse)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              // Invitation Form
              <form onSubmit={handleInviteSubmit}>
                {inviteError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      backgroundColor: '#FEF2F2',
                      border: '1px solid #FEE2E2',
                      borderRadius: 'var(--radius-sm)',
                      color: '#B91C1C',
                      fontSize: 12.5,
                      marginBottom: 14
                    }}
                  >
                    {inviteError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label" htmlFor="inviteEmail">
                    Teammate Work Email
                  </label>
                  <input
                    id="inviteEmail"
                    type="email"
                    className="form-input"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="inviteRole">
                    Workspace Role
                  </label>
                  <select
                    id="inviteRole"
                    className="form-input"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                  >
                    <option value="MEMBER">Member (Can book resources)</option>
                    <option value="ADMIN">Admin (Can manage resources & members)</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
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
                    type="submit"
                    disabled={inviteSubmitting || members.length >= 15}
                    style={{
                      padding: '8px 18px',
                      backgroundColor: members.length >= 15 ? 'var(--bg-subtle)' : 'var(--text-primary)',
                      color: members.length >= 15 ? 'var(--text-tertiary)' : 'var(--text-inverse)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: (inviteSubmitting || members.length >= 15) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {inviteSubmitting ? 'Creating Invite...' : 'Send Invitation'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
