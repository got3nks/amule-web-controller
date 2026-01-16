/**
 * Centralized Logger
 * Provides consistent logging across all modules
 */

const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
};

class Logger {
  constructor() {
    this.logStream = null;
    this.logLevel = LOG_LEVELS.INFO;
    this.logDir = null;
  }

  /**
   * Initialize the logger with a log directory
   * @param {string} logDir - Directory for log files
   * @param {string} level - Log level ('error', 'warn', 'info', 'debug')
   */
  init(logDir, level = 'info') {
    this.logDir = logDir;

    // Ensure log directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Create write stream
    const logFile = path.join(logDir, 'server.log');
    this.logStream = fs.createWriteStream(logFile, { flags: 'a' });

    // Set log level
    this.logLevel = LOG_LEVELS[level.toUpperCase()] ?? LOG_LEVELS.INFO;
  }

  /**
   * Format log message with timestamp
   * @param {string} level - Log level prefix
   * @param {Array} args - Log arguments
   * @returns {string} Formatted message
   */
  formatMessage(level, args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack}`;
      }
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    return `[${timestamp}] ${level ? `[${level}] ` : ''}${message}`;
  }

  /**
   * Write to log file and console
   * @param {string} formatted - Formatted message
   * @param {string} consoleMethod - Console method to use
   * @param {Array} args - Original arguments for console
   */
  output(formatted, consoleMethod, args) {
    // Write to file
    if (this.logStream) {
      this.logStream.write(formatted + '\n');
    }

    // Write to console
    const timestamp = new Date().toISOString();
    console[consoleMethod](`[${timestamp}]`, ...args);
  }

  /**
   * General log (INFO level)
   * @param {...any} args - Log arguments
   */
  log(...args) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      const formatted = this.formatMessage('', args);
      this.output(formatted, 'log', args);
    }
  }

  /**
   * Info log
   * @param {...any} args - Log arguments
   */
  info(...args) {
    if (this.logLevel >= LOG_LEVELS.INFO) {
      const formatted = this.formatMessage('INFO', args);
      this.output(formatted, 'info', args);
    }
  }

  /**
   * Warning log
   * @param {...any} args - Log arguments
   */
  warn(...args) {
    if (this.logLevel >= LOG_LEVELS.WARN) {
      const formatted = this.formatMessage('WARN', args);
      this.output(formatted, 'warn', args);
    }
  }

  /**
   * Error log
   * @param {...any} args - Log arguments
   */
  error(...args) {
    if (this.logLevel >= LOG_LEVELS.ERROR) {
      const formatted = this.formatMessage('ERROR', args);
      this.output(formatted, 'error', args);
    }
  }

  /**
   * Debug log
   * @param {...any} args - Log arguments
   */
  debug(...args) {
    if (this.logLevel >= LOG_LEVELS.DEBUG) {
      const formatted = this.formatMessage('DEBUG', args);
      this.output(formatted, 'log', args);
    }
  }

  /**
   * Create a child logger with a prefix (for modules)
   * @param {string} prefix - Prefix for all log messages
   * @returns {object} Logger methods with prefix
   */
  child(prefix) {
    return {
      log: (...args) => this.log(`[${prefix}]`, ...args),
      info: (...args) => this.info(`[${prefix}]`, ...args),
      warn: (...args) => this.warn(`[${prefix}]`, ...args),
      error: (...args) => this.error(`[${prefix}]`, ...args),
      debug: (...args) => this.debug(`[${prefix}]`, ...args)
    };
  }

  /**
   * Close the log stream
   */
  close() {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}

// Export singleton instance
const logger = new Logger();

module.exports = logger;
module.exports.LOG_LEVELS = LOG_LEVELS;
