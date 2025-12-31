/**
 * Logger utility for Changebot widgets
 *
 * Logging can be enabled at runtime via:
 * - localStorage.setItem('changebot:debug', 'true')
 * - window.__CHANGEBOT_DEBUG__ = true
 *
 * Debug logs are disabled by default in production.
 */

type LogData = Record<string, unknown>;

// Cache the debug check to avoid repeated localStorage access
let debugCached: boolean | null = null;
let debugCacheTime = 0;
const CACHE_DURATION = 5000; // Re-check every 5 seconds

/**
 * Check if debug mode is enabled.
 */
function isDebugEnabled(): boolean {
  // Check window flag first (for programmatic control)
  if (typeof window !== 'undefined' && (window as any).__CHANGEBOT_DEBUG__) {
    return true;
  }

  // Check localStorage (survives page reloads)
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('changebot:debug') === 'true';
    }
  } catch {
    // localStorage not available (private mode, restricted context)
  }

  // Default: disabled
  return false;
}

/**
 * Check if logging should occur (cached for performance).
 */
function shouldLog(): boolean {
  const now = Date.now();
  if (debugCached === null || now - debugCacheTime > CACHE_DURATION) {
    debugCached = isDebugEnabled();
    debugCacheTime = now;
  }
  return debugCached;
}

/**
 * Force refresh of debug cache (call after changing debug setting).
 */
export function refreshDebugSetting(): void {
  debugCached = null;
}

export const logger = {
  /**
   * Debug log - for development tracing
   */
  debug: (prefix: string, message: string, data?: LogData): void => {
    if (shouldLog()) {
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
    if (shouldLog()) {
      if (data) {
        console.log(`${prefix}: ${message}`, data);
      } else {
        console.log(`${prefix}: ${message}`);
      }
    }
  },

  /**
   * Warning log - always shown regardless of debug setting
   */
  warn: (prefix: string, message: string, data?: LogData): void => {
    if (data) {
      console.warn(`${prefix}: ${message}`, data);
    } else {
      console.warn(`${prefix}: ${message}`);
    }
  },

  /**
   * Error log - always shown regardless of debug setting
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
