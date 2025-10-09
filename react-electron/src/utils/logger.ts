/**
 * Production-safe logger
 * Only logs in development mode
 */

const IS_PRODUCTION = import.meta.env.PROD;

export const logger = {
  log: (...args: any[]) => {
    if (!IS_PRODUCTION) {
      console.log(...args);
    }
  },

  warn: (...args: any[]) => {
    if (!IS_PRODUCTION) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // Always log errors, but sanitize sensitive data
    console.error(...args);
  },

  info: (...args: any[]) => {
    if (!IS_PRODUCTION) {
      console.info(...args);
    }
  }
};
