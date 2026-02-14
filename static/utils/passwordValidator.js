/**
 * Password Validator Utility
 *
 * Shared validation logic for password requirements
 * Note: This is client-side validation for UX. Server-side validation
 * in server/lib/passwordValidator.js is the authoritative source.
 */

/**
 * Validate password against requirements
 * @param {string} password - Password to validate
 * @returns {string[]} Array of requirement errors (empty if valid)
 */
export function validatePassword(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('At least 8 characters');
  }

  if (!/\d/.test(password)) {
    errors.push('Contains at least one digit');
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Contains at least one letter');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Contains at least one special character');
  }

  return errors;
}

/**
 * Check if password is valid (no errors)
 * @param {string} password - Password to validate
 * @returns {boolean} True if valid
 */
export function isPasswordValid(password) {
  return validatePassword(password).length === 0;
}
