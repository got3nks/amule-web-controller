/**
 * Password Validator
 * Validates passwords against security requirements
 */

/**
 * Validates password against security requirements
 * @param {string} password - Password to validate
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validatePassword(password) {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one digit');
  }

  if (!/[a-zA-Z]/.test(password)) {
    errors.push('Password must contain at least one letter');
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  validatePassword,
};
