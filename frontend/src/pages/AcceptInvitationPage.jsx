import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { verifyInvitationToken, acceptInvitation } from '../api/client';
import {
  Building2,
  AlertCircle,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Circle,
  Sparkles,
  UserCheck
} from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import {
  checkPasswordCriteria,
  PASSWORD_REQUIREMENTS,
  isPasswordValid,
  getPasswordValidationErrors
} from '../utils/passwordValidator';

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
  const [acceptedSuccess, setAcceptedSuccess] = useState(null);

  // Form states for unauthenticated users
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password criteria checklist state
  const passwordCriteria = checkPasswordCriteria(password);
  const passwordsMatch = Boolean(password && confirmPassword && password === confirmPassword);

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
        setError(err.message || 'Failed to verify invitation. The link may have expired or already been used.');
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
        setError(`Password requirements not met: ${passErrors.join('. ')}`);
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please re-enter your password.');
        return;
      }
    }

    // If unauthenticated and existing user
    if (!isAuthenticated && invitationData && invitationData.userExists) {
      if (!password) {
        setError('Please enter your existing password to sign in and accept this invitation.');
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
        if (!isAuthenticated && invitationData && !invitationData.userExists) {
          navigate('/login', {
            replace: true,
            state: {
              message: `Your account is ready. Sign in to continue to ${invitationData.organization.name}.`,
              email: authUser.email
            }
          });
          return;
        }
        // Securely initialize session in background
        setSession(authUser, authToken, activeOrganization?._id);
        // Display clear account confirmation view
        setAcceptedSuccess(res.data);
      } else {
        setError(res.message || 'Failed to accept invitation.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while accepting the invitation.');
    } finally {
      setActionLoading(false);
    }
  };

  // State 1: Verifying token (do NOT expose organization details)
  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 'var(--radius-full)',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}
          >
            <Sparkles size={22} />
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
            Verifying Invitation Link
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13.5, margin: 0 }}>
            Validating single-use security token with the server...
          </p>
        </div>
      </div>
    );
  }

  // State 2: Invalid or expired token (do NOT expose organization details)
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
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <span>Return to Login</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    );
  }

  // State 3: Account Created / Successfully Accepted Confirmation State
  if (acceptedSuccess) {
    const orgName =
      acceptedSuccess.activeOrganization?.name ||
      invitationData?.organization?.name ||
      'Workspace';
    const memberRole =
      acceptedSuccess.membership?.role ||
      invitationData?.role ||
      'MEMBER';
    const acceptedUser = acceptedSuccess.user || currentUser;

    return (
      <div className="auth-page">
        <div className="auth-card" style={{ maxWidth: 480, textAlign: 'center', padding: '36px 28px' }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-full)',
              backgroundColor: '#DCFCE7',
              color: '#15803D',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}
          >
            <CheckCircle2 size={30} />
          </div>

          <span
            style={{
              display: 'inline-block',
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              padding: '3px 10px',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              color: '#2563EB',
              borderRadius: 'var(--radius-full)',
              marginBottom: 10
            }}
          >
            Boiler Plate
          </span>

          <h1 style={{ fontSize: 21, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Account Activated!
          </h1>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.5 }}>
            Welcome to <strong>{orgName}</strong>! Your account has been established and your workspace access is ready.
          </p>

          {/* Details summary */}
          <div
            style={{
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              textAlign: 'left',
              marginBottom: 24,
              fontSize: 13
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Member Name</span>
              <strong style={{ color: 'var(--text-primary)' }}>{acceptedUser?.name || 'Team Member'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Email</span>
              <span style={{ color: 'var(--text-secondary)' }}>{acceptedUser?.email || invitationData?.email}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Workspace</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{orgName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Assigned Role</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: memberRole === 'ADMIN' ? '#EFF6FF' : 'var(--bg-surface)',
                  color: memberRole === 'ADMIN' ? '#1D4ED8' : 'var(--text-secondary)',
                  border: '1px solid var(--border-medium)'
                }}
              >
                {memberRole}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              type="button"
              className="auth-submit-btn"
              onClick={() => navigate('/', { replace: true })}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '11px 20px',
                fontSize: 14
              }}
            >
              <span>Go to Workspace Dashboard</span>
              <ArrowRight size={15} />
            </button>

            <Link
              to="/login"
              style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                fontWeight: 600,
                textDecoration: 'none',
                marginTop: 6
              }}
            >
              Continue to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 4: Normal Form View (Invitation verified successfully)
  const { organization, role, email: invitedEmail, invitedBy, userExists } = invitationData;
  const isEmailMismatch = isAuthenticated && currentUser?.email.toLowerCase() !== invitedEmail.toLowerCase();

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        {/* Header with Boiler Plate branding */}
        <div className="auth-header" style={{ textAlign: 'center', marginBottom: 20 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
              padding: '4px 12px',
              backgroundColor: 'rgba(37, 99, 235, 0.1)',
              borderRadius: 'var(--radius-full)',
              color: '#2563EB',
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <Building2 size={13} />
            <span>Boiler Plate Workspace Invitation</span>
          </div>

          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
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
            but you are currently signed in as <strong>{currentUser.email}</strong>.
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={logout}
                style={{
                  color: '#92400E',
                  fontWeight: 600,
                  textDecoration: 'underline',
                  fontSize: '12px',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer'
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 20,
                textAlign: 'left'
              }}
            >
              <UserCheck size={20} style={{ color: '#2563EB', flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                Signed in as <strong style={{ color: 'var(--text-primary)' }}>{currentUser.email}</strong>.
              </div>
            </div>
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
              // Existing user flow: authenticate without resetting password
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
                  An existing account was detected for {invitedEmail}. Enter your password to join {organization.name}.
                </span>
              </div>
            ) : (
              // New user registration flow: set full name and strong password
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
                    Password
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

                {/* Password requirement checklist indicators */}
                <div
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 14px',
                    marginBottom: 16
                  }}
                >
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: 'var(--text-secondary)',
                      marginBottom: 8,
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em'
                    }}
                  >
                    Password Requirements
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {PASSWORD_REQUIREMENTS.map((req) => {
                      const isMet = Boolean(passwordCriteria[req.key]);
                      return (
                        <li
                          key={req.key}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: '12px',
                            color: isMet ? '#15803D' : 'var(--text-secondary)',
                            transition: 'color var(--transition-fast)'
                          }}
                        >
                          {isMet ? (
                            <CheckCircle2 size={13} style={{ color: '#16A34A', flexShrink: 0 }} />
                          ) : (
                            <Circle size={13} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                          )}
                          <span>{req.label}</span>
                        </li>
                      );
                    })}
                    {confirmPassword.length > 0 && (
                      <li
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: '12px',
                          color: passwordsMatch ? '#15803D' : '#DC2626',
                          transition: 'color var(--transition-fast)'
                        }}
                      >
                        {passwordsMatch ? (
                          <CheckCircle2 size={13} style={{ color: '#16A34A', flexShrink: 0 }} />
                        ) : (
                          <AlertCircle size={13} style={{ color: '#DC2626', flexShrink: 0 }} />
                        )}
                        <span>Passwords match</span>
                      </li>
                    )}
                  </ul>
                </div>
              </>
            )}

            <button
              type="submit"
              className="auth-submit-btn"
              disabled={actionLoading}
              style={{ marginTop: 4 }}
            >
              {actionLoading
                ? 'Processing...'
                : userExists
                ? `Sign In & Join ${organization.name}`
                : `Set Password & Join ${organization.name}`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
