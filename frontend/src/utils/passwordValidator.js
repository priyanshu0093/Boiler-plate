export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]|[^A-Za-z0-9\s]/;

/**
 * Checks which password requirements are currently satisfied.
 *
 * @param {string} password
 * @returns {{ minLength: boolean, hasUpper: boolean, hasLower: boolean, hasNumber: boolean, hasSpecial: boolean }}
 */
export const checkPasswordCriteria = (password = '') => {
  if (typeof password !== 'string') {
    return {
      minLength: false,
      hasUpper: false,
      hasLower: false,
      hasNumber: false,
      hasSpecial: false
    };
  }

  return {
    minLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: SPECIAL_CHAR_REGEX.test(password)
  };
};

export const PASSWORD_REQUIREMENTS = [
  { key: 'minLength', label: 'At least 8 characters' },
  { key: 'hasUpper', label: 'At least one uppercase letter (A–Z)' },
  { key: 'hasLower', label: 'At least one lowercase letter (a–z)' },
  { key: 'hasNumber', label: 'At least one number (0–9)' },
  { key: 'hasSpecial', label: 'At least one special character (e.g. !@#$%^&*)' }
];

/**
 * Returns true if all password complexity rules are satisfied.
 *
 * @param {string} password
 * @returns {boolean}
 */
export const isPasswordValid = (password = '') => {
  const criteria = checkPasswordCriteria(password);
  return (
    criteria.minLength &&
    criteria.hasUpper &&
    criteria.hasLower &&
    criteria.hasNumber &&
    criteria.hasSpecial
  );
};

/**
 * Returns an array of human-readable error strings for any failing requirements.
 *
 * @param {string} password
 * @returns {string[]}
 */
export const getPasswordValidationErrors = (password = '') => {
  const criteria = checkPasswordCriteria(password);
  const errors = [];
  if (!criteria.minLength) errors.push('Password must be at least 8 characters long');
  if (!criteria.hasUpper) errors.push('Password must contain at least one uppercase letter (A–Z)');
  if (!criteria.hasLower) errors.push('Password must contain at least one lowercase letter (a–z)');
  if (!criteria.hasNumber) errors.push('Password must contain at least one number (0–9)');
  if (!criteria.hasSpecial) errors.push('Password must contain at least one special character (e.g. !@#$%^&*)');
  return errors;
};
