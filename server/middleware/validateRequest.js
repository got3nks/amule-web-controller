/**
 * Request Validation Middleware
 * Provides validation functions for API endpoints
 */

const response = require('../lib/responseFormatter');

/**
 * Create a validation middleware from a schema
 * @param {object} schema - Validation schema
 * @param {string} location - Where to look for data ('body', 'query', 'params')
 * @returns {function} Express middleware
 */
function validate(schema, location = 'body') {
  return (req, res, next) => {
    const data = req[location];
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Required check
      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      // Skip validation if field is not present and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type check
      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}`);
          continue;
        }
      }

      // Enum check
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
      }

      // Min/max for numbers
      if (rules.type === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          errors.push(`${field} must be at most ${rules.max}`);
        }
      }

      // Min/max length for strings
      if (rules.type === 'string') {
        if (rules.minLength !== undefined && value.length < rules.minLength) {
          errors.push(`${field} must be at least ${rules.minLength} characters`);
        }
        if (rules.maxLength !== undefined && value.length > rules.maxLength) {
          errors.push(`${field} must be at most ${rules.maxLength} characters`);
        }
      }

      // Pattern check for strings
      if (rules.pattern && rules.type === 'string') {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(value)) {
          errors.push(`${field} has invalid format`);
        }
      }

      // Custom validator
      if (rules.validate && typeof rules.validate === 'function') {
        const customError = rules.validate(value, data);
        if (customError) {
          errors.push(customError);
        }
      }
    }

    if (errors.length > 0) {
      return response.badRequest(res, errors.join('; '));
    }

    next();
  };
}

/**
 * Validate query parameters for time range endpoints
 */
const validateTimeRange = validate({
  range: {
    type: 'string',
    enum: ['24h', '7d', '30d']
  }
}, 'query');

/**
 * Validate pagination parameters
 */
const validatePagination = validate({
  page: {
    type: 'number',
    min: 1
  },
  limit: {
    type: 'number',
    min: 1,
    max: 100
  }
}, 'query');

/**
 * Common validation rules for reuse
 */
const commonRules = {
  // Non-empty string
  requiredString: {
    required: true,
    type: 'string',
    minLength: 1
  },
  // Optional string
  optionalString: {
    type: 'string'
  },
  // Positive integer
  positiveInt: {
    type: 'number',
    min: 1
  },
  // Non-negative integer
  nonNegativeInt: {
    type: 'number',
    min: 0
  },
  // Boolean
  boolean: {
    type: 'boolean'
  },
  // URL pattern
  url: {
    type: 'string',
    pattern: '^https?://'
  },
  // Port number
  port: {
    type: 'number',
    min: 1,
    max: 65535
  }
};

module.exports = {
  validate,
  validateTimeRange,
  validatePagination,
  commonRules
};
