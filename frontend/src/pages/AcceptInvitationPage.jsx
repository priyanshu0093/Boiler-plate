import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verifyInvitationToken, acceptInvitation } from '../api/client';
import {
  Building2,
  AlertCircle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { isPasswordValid, getPasswordValidationErrors } from '../utils/passwordValidator';

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser, isAuthenticated, setSession, logout } = useAuth();

  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');

  const [loading, setLoading] = useState(true);
  const [invitationData, setInvitationData] = useState(null);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Form states for unauthenticated users
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    async function verify() {
      if (!token) {
        setError('No invitation token provided. Please check the invitation link.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');
        const res = await verifyInvitationToken(token, emailParam);
        if (res.success && res.data) {
          setInvitationData(res.data);
        } else {
          setError(res.message || 'Invitation is invalid or has expired.');
        }
      } catch (err) {
        setError(err.message || 'Failed to verify invitation. The link may have expired.');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token, emailParam]);

  const handleAccept = async (e) => {
    if (e) e.preventDefault();
    setError('');

    // If unauthenticated and new user
    if (!isAuthenticated && invitationData && !invitationData.userExists) {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (!password) {
        setError('Please enter a password.');
        return;
      }
      if (!isPasswordValid(password)) {
        const passErrors = getPasswordValidationErrors(password);
        setError(`Password requirement not met: ${passErrors.join('. ')}`);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    // If unauthenticated and existing user
    if (!isAuthenticated && invitationData && invitationData.userExists) {
      if (!password) {
        setError('Please enter your password to sign in and accept this invitation.');
        return;
      }
    }

    try {
      setActionLoading(true);
      const payload = {
        token,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(password ? { password, confirmPassword } : {})
      };

      const res = await acceptInvitation(payload);
      if (res.success && res.data) {
        const { user: authUser, token: authToken, activeOrganization } = res.data;
        setSession(authUser, authToken, activeOrganization?._id);
        navigate('/', { replace: true });
      } else {
        setError(res.message || 'Failed to accept invitation.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while accepting the invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Verifying invitation link...
          </div>
        </div>
      </div>
    );
  }

  if (error && !invitationData) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '36px 24px' }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#FEF2F2',
              color: '#B91C1C',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}
          >
            <ShieldAlert size={24} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            Invitation Expired or Invalid
          </h2>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
            {error}
          </p>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              backgroundColor: 'var(--text-primary)',
              color: 'var(--text-inverse)',
              borderRadius: 'var(--radius-md)',
              fontSize: 13.5,
              fontWeight: 600
            }}
          >
            <span>Return to Login</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  const { organization, role, email: invitedEmail, invitedBy, userExists } = invitationData;
  const isEmailMismatch = isAuthenticated && currentUser?.email.toLowerCase() !== invitedEmail.toLowerCase();

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-header" style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}
          >
            <Building2 size={22} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
            Join {organization.name}
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            {invitedBy ? `${invitedBy.name} invited you to join as ` : 'You have been invited to join as '}
            <strong style={{ color: 'var(--text-primary)' }}>{role}</strong>
          </p>
        </div>

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
              fontSize: '12.5px',
              marginBottom: 16
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {isEmailMismatch && (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#FFFBEB',
              border: '1px solid #FEF3C7',
              borderRadius: 'var(--radius-sm)',
              color: '#B45309',
              fontSize: '12.5px',
              marginBottom: 16,
              lineHeight: 1.5
            }}
          >
            <strong>Account mismatch:</strong> This invitation was issued for <strong>{invitedEmail}</strong>,
            but you are currently logged in as <strong>{currentUser.email}</strong>.
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={logout}
                style={{
                  color: '#92400E',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  fontSize: '12px'
                }}
              >
                Log out to accept with {invitedEmail}
              </button>
            </div>
          </div>
        )}

        {/* Case 1: Authenticated with matching email */}
        {isAuthenticated && !isEmailMismatch && (
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
              You are signed in as <strong>{currentUser.email}</strong>. Click below to join the workspace.
            </p>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={handleAccept}
              disabled={actionLoading}
            >
              {actionLoading ? 'Joining Workspace...' : `Accept & Join ${organization.name}`}
            </button>
          </div>
        )}

        {/* Case 2: Unauthenticated */}
        {!isAuthenticated && (
          <form onSubmit={handleAccept} className="auth-form">
            <div className="form-group">
              <label className="form-label">Invited Email</label>
              <input
                type="email"
                className="form-input"
                value={invitedEmail}
                disabled
                style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}
              />
            </div>

            {userExists ? (
              // Existing user needs password
              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Account Password
                </label>
                <PasswordInput
                  id="password"
                  placeholder="Enter your existing password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                  An existing account was detected for {invitedEmail}. Enter your password to join.
                </span>
              </div>
            ) : (
              // New user registration
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="name">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="form-input"
                    placeholder="e.g. Alex Morgan"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="password">
                    Create Password
                  </label>
                  <PasswordInput
                    id="password"
                    placeholder="Enter a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="confirmPassword">
                    Confirm Password
                  </label>
                  <PasswordInput
                    id="confirmPassword"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={actionLoading}
              style={{ marginTop: 8 }}
            >
              {actionLoading
                ? 'Processing...'
                : userExists
                ? `Sign In & Join ${organization.name}`
                : `Create Account & Join ${organization.name}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
