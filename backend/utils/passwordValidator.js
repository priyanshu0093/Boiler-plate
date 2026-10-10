const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]|[^A-Za-z0-9\s]/;

/**
 * Evaluates individual password strength requirements.
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one number (0-9)
 * - At least one special character (e.g. !@#$%^&*)
 *
 * @param {string} password - The password string to evaluate
 * @returns {{ minLength: boolean, hasUpper: boolean, hasLower: boolean, hasNumber: boolean, hasSpecial: boolean }}
 */
const checkPasswordRequirements = (password = '') => {
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

/**
 * Validates password strength and returns status, user-facing error message, and granular errors.
 *
 * @param {string} password - The plain-text password to validate
 * @returns {{ isValid: boolean, message: string, errors: string[] }}
 */
const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required',
      errors: ['Password is required']
    };
  }

  const { minLength, hasUpper, hasLower, hasNumber, hasSpecial } = checkPasswordRequirements(password);
  const errors = [];

  if (!minLength) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!hasUpper) {
    errors.push('Password must contain at least one uppercase letter (A–Z)');
  }
  if (!hasLower) {
    errors.push('Password must contain at least one lowercase letter (a–z)');
  }
  if (!hasNumber) {
    errors.push('Password must contain at least one number (0–9)');
  }
  if (!hasSpecial) {
    errors.push('Password must contain at least one special character (e.g. !@#$%^&*)');
  }

  return {
    isValid: errors.length === 0,
    message: errors.join('. '),
    errors
  };
};

module.exports = {
  validatePassword,
  checkPasswordRequirements,
  SPECIAL_CHAR_REGEX
};
