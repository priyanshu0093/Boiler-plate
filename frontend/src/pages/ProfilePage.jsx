import React, { useState, useEffect } from 'react';
import { getCurrentUser, updateProfile } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  User,
  Mail,
  Shield,
  Phone,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Save,
  Lock
} from 'lucide-react';

export default function ProfilePage() {
  const { user: authUser, updateUser } = useAuth();
  const { addToast } = useSocket();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');

  // Read-only fields
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EMPLOYEE');

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError('');
        const res = await getCurrentUser();
        if (res.success && res.data?.user) {
          const u = res.data.user;
          setName(u.name || '');
          setPhone(u.phone || '');
          setDepartment(u.department || '');
          setEmail(u.email || '');
          setRole(u.role || 'EMPLOYEE');
        }
      } catch (err) {
        setError(err.message || 'Failed to load profile details');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  const getInitials = (n) => {
    if (!n) return 'U';
    return n
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim()) {
      setError('Name cannot be empty.');
      return;
    }

    try {
      setSaving(true);
      const res = await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        department: department.trim()
      });

      if (res.success && res.data?.user) {
        const updated = res.data.user;
        updateUser(updated);
        setName(updated.name || '');
        setPhone(updated.phone || '');
        setDepartment(updated.department || '');
        setSuccess('Profile updated successfully.');
        addToast('Profile updated successfully', 'success');
      } else {
        setError(res.message || 'Failed to update profile');
      }
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="main-content">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
          <p style={{ fontSize: 14 }}>Loading Profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="main-content">
      {/* Page Header */}
      <header className="dashboard-header" style={{ marginBottom: 28 }}>
        <h1 className="greeting-title">User Profile & Settings</h1>
        <p className="greeting-sub">
          Manage your personal details and internal office directory presence.
        </p>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, maxWidth: 960 }}>
        {/* Left Card: Overview Card */}
        <section
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: 24,
            height: 'fit-content'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
            <div
              className="user-avatar"
              style={{
                width: 64,
                height: 64,
                fontSize: 22,
                backgroundColor: role === 'ADMIN' ? '#1E3A8A' : 'var(--text-primary)'
              }}
            >
              {getInitials(name || authUser?.name)}
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {name || authUser?.name || 'Employee'}
              </h2>
              <span
                style={{
                  display: 'inline-block',
                  marginTop: 4,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: role === 'ADMIN' ? '#1E3A8A' : 'var(--text-secondary)',
                  backgroundColor: role === 'ADMIN' ? '#DBEAFE' : 'var(--bg-subtle)',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)'
                }}
              >
                {role} Account
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 16, borderTop: '1px solid var(--border-light)', fontSize: 13 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
              <Mail size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span>{email}</span>
            </div>

            {department && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
                <Briefcase size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span>{department}</span>
              </div>
            )}

            {phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
                <Phone size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                <span>{phone}</span>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
              <Shield size={15} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <span>Role: {role}</span>
            </div>
          </div>
        </section>

        {/* Right Card: Edit Form */}
        <section
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-md)',
            padding: 24
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
            Edit Profile Details
          </h2>
          <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Update your public name, direct phone line, or department information.
          </p>

          {success && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #D1FAE5',
                borderRadius: 'var(--radius-sm)',
                color: '#065F46',
                fontSize: 12.5,
                marginBottom: 16
              }}
            >
              <CheckCircle2 size={16} style={{ color: '#10B981', flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FEE2E2',
                borderRadius: 'var(--radius-sm)',
                color: '#B91C1C',
                fontSize: 12.5,
                marginBottom: 16
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Editable: Full Name */}
            <div className="form-group">
              <label className="form-label" htmlFor="profile-name">
                Full Name *
              </label>
              <input
                id="profile-name"
                type="text"
                className="form-input"
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Editable: Phone */}
            <div className="form-group">
              <label className="form-label" htmlFor="profile-phone">
                Phone Number
              </label>
              <input
                id="profile-phone"
                type="text"
                className="form-input"
                placeholder="e.g. +1 (555) 019-2834"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            {/* Editable: Department */}
            <div className="form-group">
              <label className="form-label" htmlFor="profile-dept">
                Department
              </label>
              <input
                id="profile-dept"
                type="text"
                className="form-input"
                placeholder="e.g. Engineering, Operations, Design"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>

            {/* Read-only: Email */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="form-label" htmlFor="profile-email" style={{ marginBottom: 0 }}>
                  Work Email
                </label>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <Lock size={11} /> Read-only
                </span>
              </div>
              <input
                id="profile-email"
                type="email"
                className="form-input"
                value={email}
                disabled
                style={{ backgroundColor: 'var(--bg-subtle)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
              />
            </div>

            {/* Read-only: Role */}
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label className="form-label" htmlFor="profile-role" style={{ marginBottom: 0 }}>
                  System Role
                </label>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <Lock size={11} /> Assigned by organization
                </span>
              </div>
              <input
                id="profile-role"
                type="text"
                className="form-input"
                value={role}
                disabled
                style={{ backgroundColor: 'var(--bg-subtle)', cursor: 'not-allowed', color: 'var(--text-secondary)' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
              >
                <Save size={15} />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
