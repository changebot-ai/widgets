/**
 * Logger utility for Changebot widgets
 *
 * Provides consistent logging with emoji prefixes.
 * Can be disabled with a single line change.
 */

// Set to false to disable all debug logging
const LOGGING_ENABLED = true;

type LogData = Record<string, unknown>;

export const logger = {
  /**
   * Debug log - for development tracing
   */
  debug: (prefix: string, message: string, data?: LogData): void => {
    if (LOGGING_ENABLED) {
      if (data) {
        console.log(`${prefix}: ${message}`, data);
      } else {
        console.log(`${prefix}: ${message}`);
      }
    }
  },

  /**
   * Info log - for important state changes
   */
  info: (prefix: string, message: string, data?: LogData): void => {
    if (LOGGING_ENABLED) {
      if (data) {
        console.log(`${prefix}: ${message}`, data);
      } else {
        console.log(`${prefix}: ${message}`);
      }
    }
  },

  /**
   * Warning log - always shown regardless of LOGGING_ENABLED
   */
  warn: (prefix: string, message: string, data?: LogData): void => {
    if (data) {
      console.warn(`${prefix}: ${message}`, data);
    } else {
      console.warn(`${prefix}: ${message}`);
    }
  },

  /**
   * Error log - always shown regardless of LOGGING_ENABLED
   */
  error: (prefix: string, message: string, data?: LogData): void => {
    if (data) {
      console.error(`${prefix}: ${message}`, data);
    } else {
      console.error(`${prefix}: ${message}`);
    }
  },
};

// Component-specific loggers with preset prefixes
export const logBadge = {
  debug: (msg: string, data?: LogData) => logger.debug('📛 Badge', msg, data),
  info: (msg: string, data?: LogData) => logger.info('📛 Badge', msg, data),
  warn: (msg: string, data?: LogData) => logger.warn('📛 Badge', msg, data),
  error: (msg: string, data?: LogData) => logger.error('📛 Badge', msg, data),
};

export const logPanel = {
  debug: (msg: string, data?: LogData) => logger.debug('📂 Panel', msg, data),
  info: (msg: string, data?: LogData) => logger.info('📂 Panel', msg, data),
  warn: (msg: string, data?: LogData) => logger.warn('📂 Panel', msg, data),
  error: (msg: string, data?: LogData) => logger.error('📂 Panel', msg, data),
};

export const logToast = {
  debug: (msg: string, data?: LogData) => logger.debug('🍞 Toast', msg, data),
  info: (msg: string, data?: LogData) => logger.info('🍞 Toast', msg, data),
  warn: (msg: string, data?: LogData) => logger.warn('🍞 Toast', msg, data),
  error: (msg: string, data?: LogData) => logger.error('🍞 Toast', msg, data),
};

export const logBanner = {
  debug: (msg: string, data?: LogData) => logger.debug('🎯 Banner', msg, data),
  info: (msg: string, data?: LogData) => logger.info('🎯 Banner', msg, data),
  warn: (msg: string, data?: LogData) => logger.warn('🎯 Banner', msg, data),
  error: (msg: string, data?: LogData) => logger.error('🎯 Banner', msg, data),
};

export const logProvider = {
  debug: (msg: string, data?: LogData) => logger.debug('🔌 Provider', msg, data),
  info: (msg: string, data?: LogData) => logger.info('🔌 Provider', msg, data),
  warn: (msg: string, data?: LogData) => logger.warn('🔌 Provider', msg, data),
  error: (msg: string, data?: LogData) => logger.error('🔌 Provider', msg, data),
};

export const logStore = {
  debug: (msg: string, data?: LogData) => logger.debug('🔢 Store', msg, data),
  info: (msg: string, data?: LogData) => logger.info('🔢 Store', msg, data),
  warn: (msg: string, data?: LogData) => logger.warn('⚠️ Store', msg, data),
  error: (msg: string, data?: LogData) => logger.error('Store', msg, data),
};

export const logRegistry = {
  debug: (msg: string, data?: LogData) => logger.debug('📦 Registry', msg, data),
  info: (msg: string, data?: LogData) => logger.info('📦 Registry', msg, data),
  warn: (msg: string, data?: LogData) => logger.warn('⚠️ Registry', msg, data),
  error: (msg: string, data?: LogData) => logger.error('Registry', msg, data),
};
