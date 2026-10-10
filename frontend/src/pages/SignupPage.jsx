import React, { useState } from 'react';
import { Link, useNavigate, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authRegister } from '../api/client';
import { AlertCircle, Building2, CheckCircle2 } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';
import { isPasswordValid, getPasswordValidationErrors } from '../utils/passwordValidator';

export default function SignupPage() {
  const { isAuthenticated, setSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const invitationToken = searchParams.get('invitation');
  const invitedEmail = searchParams.get('email') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState(invitedEmail);
  const [organizationName, setOrganizationName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!invitationToken && !organizationName.trim()) {
      setError('Please provide an organization or workspace name.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid work email address.');
      return;
    }

    if (!isPasswordValid(password)) {
      const passErrors = getPasswordValidationErrors(password);
      setError(`Password requirement not met: ${passErrors.join('. ')}`);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await authRegister({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        organizationName: invitationToken ? undefined : organizationName.trim()
      });

      if (res.success && res.data) {
        const { user: userData, token: userToken, activeOrganization } = res.data;
        // Log user in and initialize session and OrganizationContext immediately
        setSession(userData, userToken, activeOrganization?._id);
        navigate('/', { replace: true });
      } else {
        setError(res.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. An account with this email may already exist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-brand">Boiler Plate</h1>
          <p className="auth-subtitle">
            {invitationToken ? 'Accept Workspace Invitation' : 'Create Your Organization'}
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 10,
              padding: '3px 10px',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-full)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            <Building2 size={13} style={{ color: '#2563EB' }} />
            <span>{invitationToken ? 'Joining Invited Team' : 'Owner Onboarding'}</span>
          </div>
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

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              className="form-input"
              placeholder="e.g. Jordan Lee"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Work Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={Boolean(invitationToken && invitedEmail)}
            />
          </div>

          {!invitationToken && (
            <div className="form-group">
              <label className="form-label" htmlFor="organizationName">
                Organization / Workspace Name
              </label>
              <input
                id="organizationName"
                type="text"
                className="form-input"
                placeholder="e.g. Acme Corp or Product Design"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
              />
              <span style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                You will be assigned the <strong>OWNER</strong> role. Free plan includes up to 10 active resources, 15 team members, and 7-day advance booking.
              </span>
            </div>
          )}

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

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting}
            style={{ marginTop: 6 }}
          >
            {isSubmitting
              ? 'Creating Workspace...'
              : invitationToken
              ? 'Register & Join Workspace'
              : 'Create Workspace as Owner'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'underline' }}
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
