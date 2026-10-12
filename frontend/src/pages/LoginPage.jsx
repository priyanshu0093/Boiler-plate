import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle } from 'lucide-react';
import PasswordInput from '../components/PasswordInput';

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const successMessage = location.state?.message;

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const res = await login(email, password);
      if (res.success) {
        navigate('/', { replace: true });
      } else {
        setError(res.message || 'Invalid email or password.');
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify server connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutofill = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-brand">Boiler Plate</h1>
          <p className="auth-subtitle">Internal Office Resource & Asset Booking</p>
        </div>

        {successMessage && !error && (
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
              fontSize: '12.5px',
              marginBottom: 16
            }}
          >
            <CheckCircle size={15} style={{ flexShrink: 0, color: '#10B981' }} />
            <span>{successMessage}</span>
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
            <label className="form-label" htmlFor="email">
              Employee Email
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@boilerplate.internal"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : 'Sign In to Portal'}
          </button>
        </form>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)' }}>
          New employee?{' '}
          <Link
            to="/signup"
            style={{ color: 'var(--text-primary)', fontWeight: 600, textDecoration: 'underline' }}
          >
            Create an account
          </Link>
        </div>

        <div className="auth-hint-box">
          <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
            Seeded Accounts:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span
              onClick={() => handleAutofill('admin@deskdrop.internal')}
              style={{ cursor: 'pointer', textDecoration: 'underline', color: '#1E3A8A', fontWeight: 600 }}
            >
              admin@deskdrop.internal (Admin Role)
            </span>
            <span
              onClick={() => handleAutofill('priya.sharma@deskdrop.internal')}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              priya.sharma@deskdrop.internal (Employee Role)
            </span>
            <span
              onClick={() => handleAutofill('alex.chen@deskdrop.internal')}
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
            >
              alex.chen@deskdrop.internal (Employee Role)
            </span>
          </div>
          <p style={{ marginTop: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
            Password: <code className="auth-hint-code">password123</code> (Click to autofill)
          </p>
        </div>
      </div>
    </div>
  );
}
