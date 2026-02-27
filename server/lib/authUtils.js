/**
 * Authentication Utilities
 * Shared authentication functions for web UI and API endpoints
 */

const bcrypt = require('bcrypt');

/**
 * Verify password against bcrypt hash
 * Handles both pre-hashed passwords and plain text passwords from env vars
 * @param {string} inputPassword - Plain text password from user
 * @param {string} storedPassword - Password from config (may be hashed or plain)
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(inputPassword, storedPassword) {
  if (!inputPassword || !storedPassword) {
    return false;
  }

  // Check if stored password is already hashed (bcrypt format)
  if (storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$')) {
    return bcrypt.compare(inputPassword, storedPassword);
  }

  // Plain text password (e.g., from env var before migration) — use constant-time
  // comparison via bcrypt to avoid timing side-channels
  const tempHash = await bcrypt.hash(storedPassword, 4); // Low rounds — one-time comparison only
  return bcrypt.compare(inputPassword, tempHash);
}

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @param {number} rounds - Salt rounds (default: 12)
 * @returns {Promise<string>} Bcrypt hash
 */
async function hashPassword(password, rounds = 12) {
  return bcrypt.hash(password, rounds);
}

/**
 * Parse HTTP Basic Auth header
 * @param {string} authHeader - Authorization header value
 * @returns {{username: string, password: string}|null} Credentials or null if invalid
 */
function parseBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return null;
  }

  try {
    const base64Credentials = authHeader.slice(6);
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const colonIndex = credentials.indexOf(':');

    if (colonIndex === -1) {
      return null;
    }

    return {
      username: credentials.substring(0, colonIndex),
      password: credentials.substring(colonIndex + 1)
    };
  } catch (err) {
    return null;
  }
}

/**
 * Get client IP from request
 * Handles proxied requests and various header formats
 * @param {object} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.socket?.remoteAddress ||
         req.connection?.remoteAddress ||
         'unknown';
}

module.exports = {
  verifyPassword,
  hashPassword,
  parseBasicAuth,
  getClientIP
};
