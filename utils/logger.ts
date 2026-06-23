/**
 * Logger utility to prevent exposing console logs in production environments.
 * By using this logger, we avoid accidental logging of sensitive data in the production console.
 */

const isProd = import.meta.env?.PROD || process.env.NODE_ENV === 'production';

export const logger = {
  info: (...args: any[]) => {
    if (!isProd) {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    if (!isProd) {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    // We usually want to log errors even in production, but we can customize this
    console.error(...args);
  },
  debug: (...args: any[]) => {
    if (!isProd) {
      console.log(...args);
    }
  }
};
