/**
 * Response Formatter
 * Consistent response formatting for all API endpoints
 */

/**
 * Standard success response
 * @param {object} res - Express response object
 * @param {object} data - Response data
 * @param {number} statusCode - HTTP status code (default: 200)
 */
function success(res, data = {}, statusCode = 200) {
  res.status(statusCode).json({
    success: true,
    ...data
  });
}

/**
 * Standard error response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {object} extra - Additional error data
 */
function error(res, message, statusCode = 500, extra = {}) {
  res.status(statusCode).json({
    success: false,
    message,
    ...extra
  });
}

/**
 * Bad request (400) response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
function badRequest(res, message = 'Bad request') {
  error(res, message, 400);
}

/**
 * Unauthorized (401) response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
function unauthorized(res, message = 'Unauthorized') {
  error(res, message, 401);
}

/**
 * Forbidden (403) response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
function forbidden(res, message = 'Forbidden') {
  error(res, message, 403);
}

/**
 * Not found (404) response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
function notFound(res, message = 'Not found') {
  error(res, message, 404);
}

/**
 * Rate limited (429) response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 * @param {number} retryAfter - Seconds until retry allowed
 */
function rateLimited(res, message = 'Too many requests', retryAfter = null) {
  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter);
  }
  error(res, message, 429, { retryAfter });
}

/**
 * Internal server error (500) response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
function serverError(res, message = 'Internal server error') {
  error(res, message, 500);
}

/**
 * Service unavailable (503) response
 * @param {object} res - Express response object
 * @param {string} message - Error message
 */
function serviceUnavailable(res, message = 'Service unavailable') {
  error(res, message, 503);
}

module.exports = {
  success,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  rateLimited,
  serverError,
  serviceUnavailable
};
