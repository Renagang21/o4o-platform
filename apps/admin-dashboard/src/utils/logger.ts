/**
 * Development-only logging utility
 * These functions only log in development mode and are stripped in production
 */

export const devLog = (...args: any[]) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

export const devWarn = (...args: any[]) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
};

// console.error is allowed even in production for critical errors
export const devError = console.error;

// Default export for convenience
const logger = {
  log: devLog,
  warn: devWarn,
  error: devError,
};

export default logger;
