import React from 'react';
import { Check } from 'lucide-react';
import { checkPasswordCriteria } from '../utils/passwordValidator';

const REQUIREMENTS = [
  { key: 'minLength', label: '8+ chars' },
  { key: 'hasUpper', label: 'Uppercase (A–Z)' },
  { key: 'hasLower', label: 'Lowercase (a–z)' },
  { key: 'hasNumber', label: 'Number (0–9)' },
  { key: 'hasSpecial', label: 'Symbol (!@#$)' }
];

export default function PasswordRequirements({ password = '' }) {
  const criteria = checkPasswordCriteria(password);
  const isStarted = password.length > 0;
  const allSatisfied = Object.values(criteria).every(Boolean);

  return (
    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Compact inline requirement badges */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          alignItems: 'center'
        }}
      >
        {REQUIREMENTS.map((req) => {
          const isSatisfied = Boolean(criteria[req.key]);
          return (
            <span
              key={req.key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2.5px 8px',
                borderRadius: 'var(--radius-full, 9999px)',
                fontSize: '11px',
                fontWeight: isSatisfied ? 600 : 450,
                backgroundColor: isSatisfied
                  ? '#ECFDF5'
                  : isStarted
                  ? 'var(--bg-subtle)'
                  : 'transparent',
                color: isSatisfied
                  ? '#065F46'
                  : 'var(--text-tertiary)',
                border: isSatisfied
                  ? '1px solid #A7F3D0'
                  : '1px solid var(--border-light)',
                transition: 'all 0.18s ease',
                lineHeight: 1.2
              }}
            >
              {isSatisfied ? (
                <Check size={11} strokeWidth={2.6} style={{ color: '#10B981', flexShrink: 0 }} />
              ) : (
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: 'var(--border-medium)',
                    display: 'inline-block',
                    flexShrink: 0
                  }}
                />
              )}
              <span>{req.label}</span>
            </span>
          );
        })}
      </div>

      {isStarted && allSatisfied && (
        <span style={{ fontSize: '11px', color: '#059669', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Check size={12} strokeWidth={2.5} style={{ color: '#10B981' }} />
          All password requirements satisfied
        </span>
      )}
    </div>
  );
}
