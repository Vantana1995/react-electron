/**
 * Production-safe logger for Electron main process
 * Only logs in development mode
 */

const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

export const logger = {
  log: (...args: any[]) => {
    if (IS_DEVELOPMENT) {
      console.log(...args);
    }
  },

  warn: (...args: any[]) => {
    if (IS_DEVELOPMENT) {
      console.warn(...args);
    }
  },

  error: (...args: any[]) => {
    // Always log errors
    console.error(...args);
  },

  info: (...args: any[]) => {
    if (IS_DEVELOPMENT) {
      console.info(...args);
    }
  }
};
