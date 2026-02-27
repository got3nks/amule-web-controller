/**
 * Capability & Admin Authorization Middleware
 * Enforces user capabilities and admin status on HTTP routes.
 * Modeled after server/middleware/auth.js.
 */

const config = require('../modules/config');
const response = require('../lib/responseFormatter');
const logger = require('../lib/logger');

/**
 * Require specific capabilities.
 * Returns middleware that checks the session has ALL listed capabilities.
 * - Auth disabled → pass through
 * - Not authenticated → 401
 * - isAdmin → pass through (admins have all capabilities implicitly)
 * - capabilities is null/undefined → treated as "no capabilities" (403)
 * @param {...string} caps - One or more capability names
 */
function requireCapability(...caps) {
  return (req, res, next) => {
    if (!config.getAuthEnabled()) return next();

    if (!req.session?.authenticated) {
      return response.unauthorized(res, 'You must be logged in to access this resource');
    }

    if (req.session.isAdmin) return next();

    const userCaps = req.session.capabilities;
    if (!Array.isArray(userCaps) || !caps.every(c => userCaps.includes(c))) {
      logger.warn(`[Auth] Capability denied: user="${req.session.username}" (id=${req.session.userId}) missing [${caps.join(', ')}] for ${req.method} ${req.originalUrl}`);
      return response.forbidden(res, 'Insufficient permissions');
    }

    next();
  };
}

/**
 * Require admin status.
 * - Auth disabled → pass through
 * - Not authenticated → 401
 * - isAdmin → pass through
 * - Otherwise → 403
 */
function requireAdmin(req, res, next) {
  if (!config.getAuthEnabled()) return next();

  if (!req.session?.authenticated) {
    return response.unauthorized(res, 'You must be logged in to access this resource');
  }

  if (!req.session.isAdmin) {
    logger.warn(`[Auth] Admin required: user="${req.session.username}" (id=${req.session.userId}) for ${req.method} ${req.originalUrl}`);
    return response.forbidden(res, 'Admin access required');
  }

  next();
}

module.exports = { requireCapability, requireAdmin };
