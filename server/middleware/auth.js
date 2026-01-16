/**
 * Authentication Middleware
 * Protects routes based on session authentication status
 */

const config = require('../modules/config');
const response = require('../lib/responseFormatter');

/**
 * Require authentication middleware
 * Checks if auth is enabled and if user is authenticated
 * Redirects to login or returns 401 based on request type
 */
function requireAuth(req, res, next) {
  // Check if authentication is enabled
  const authEnabled = config.getAuthEnabled();

  // If auth is disabled, allow all requests
  if (!authEnabled) {
    return next();
  }

  // Check if user is authenticated via session
  if (req.session && req.session.authenticated) {
    return next();
  }

  // User is not authenticated
  // For API requests, return 401 JSON
  if (req.path.startsWith('/api/')) {
    return response.unauthorized(res, 'You must be logged in to access this resource');
  }

  // For page requests, redirect to login
  return res.redirect('/login');
}

module.exports = requireAuth;
