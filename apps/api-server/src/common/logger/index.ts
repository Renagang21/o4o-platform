/**
 * O4O Platform — Structured Logger
 *
 * WO-O4O-STRUCTURED-LOGGING-IMPLEMENTATION-V1
 *
 * pino-based structured logger with Winston API compatibility.
 * GCP Cloud Logging severity mapping for Cloud Run.
 *
 * API:
 *   logger.info('message')
 *   logger.info('message', { meta })       — Winston-style (auto-converted)
 *   logger.info({ meta }, 'message')       — pino-native (pass-through)
 *   logger.error('message', error)         — Error serialization
 *   logger.child({ module: 'x' })          — Child logger
 */

import pino from 'pino';

// ─── Environment Detection ──────────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === 'production';
const isCloudRun = !!process.env.K_SERVICE;
const serviceName = process.env.K_SERVICE || process.env.SERVICE_NAME || 'o4o-api';
const serviceRevision = process.env.K_REVISION || 'local';

// ─── GCP Severity Mapping ───────────────────────────────────────────────────

const GCP_SEVERITY: Record<string, string> = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

// ─── Base Pino Logger ───────────────────────────────────────────────────────

const basePinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',

  formatters: {
    level(label: string) {
      return {
        severity: GCP_SEVERITY[label] || 'DEFAULT',
        level: label,
      };
    },
    bindings(bindings: pino.Bindings) {
      return {
        service: serviceName,
        revision: serviceRevision,
        pid: bindings.pid,
      };
    },
  },

  timestamp: pino.stdTimeFunctions.isoTime,

  // pino-pretty for local dev readability only
  transport:
    !isProduction && !isCloudRun
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,

  // Redact sensitive fields
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'password',
      'token',
      'refreshToken',
    ],
    censor: '[REDACTED]',
  },
});

// ─── Winston API Compatibility Wrapper ──────────────────────────────────────
//
// Winston:  logger.info('message', { key: val })   — string first, meta second
// Pino:    logger.info({ key: val }, 'message')    — object first, string second
//
// 275+ existing callers use Winston's convention. This wrapper normalizes
// the argument order so both styles work correctly.

type LogMethod = (msgOrObj: any, ...args: any[]) => void;

function wrapLogMethod(pinoFn: pino.LogFn): LogMethod {
  return function wrappedLog(this: any, msgOrObj: any, ...args: any[]): void {
    // Case 1: logger.info('message', errorObj)
    if (typeof msgOrObj === 'string' && args.length === 1 && args[0] instanceof Error) {
      pinoFn.call(this, { err: args[0] }, msgOrObj);
      return;
    }

    // Case 2: logger.info('message', { meta }) — Winston style → pino style
    if (
      typeof msgOrObj === 'string' &&
      args.length === 1 &&
      typeof args[0] === 'object' &&
      args[0] !== null &&
      !(args[0] instanceof Error)
    ) {
      pinoFn.call(this, args[0], msgOrObj);
      return;
    }

    // Case 3: logger.info({ meta }, 'message') — already pino style
    if (typeof msgOrObj === 'object' && msgOrObj !== null) {
      pinoFn.call(this, msgOrObj, ...args);
      return;
    }

    // Case 4: logger.info('message') — string only
    pinoFn.call(this, msgOrObj, ...args);
  };
}

// ─── Wrapped Logger ─────────────────────────────────────────────────────────

interface StructuredLogger {
  trace: LogMethod;
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  fatal: LogMethod;
  http: LogMethod;
  child: (bindings: pino.Bindings) => StructuredLogger;
  /** Raw pino instance for pino-http and other pino-native integrations */
  _pino: pino.Logger;
  level: string;
}

function createWrappedLogger(pinoInstance: pino.Logger): StructuredLogger {
  const wrapped: StructuredLogger = {
    trace: wrapLogMethod(pinoInstance.trace.bind(pinoInstance)),
    debug: wrapLogMethod(pinoInstance.debug.bind(pinoInstance)),
    info: wrapLogMethod(pinoInstance.info.bind(pinoInstance)),
    warn: wrapLogMethod(pinoInstance.warn.bind(pinoInstance)),
    error: wrapLogMethod(pinoInstance.error.bind(pinoInstance)),
    fatal: wrapLogMethod(pinoInstance.fatal.bind(pinoInstance)),
    // Winston has 'http' level; pino doesn't. Map to 'info'.
    http: wrapLogMethod(pinoInstance.info.bind(pinoInstance)),
    child(bindings: pino.Bindings): StructuredLogger {
      return createWrappedLogger(pinoInstance.child(bindings));
    },
    _pino: pinoInstance,
    get level() {
      return pinoInstance.level;
    },
    set level(newLevel: string) {
      pinoInstance.level = newLevel;
    },
  };
  return wrapped;
}

const logger = createWrappedLogger(basePinoLogger);

// ─── Startup Log ────────────────────────────────────────────────────────────

if (isCloudRun) {
  logger.info(`Running in Cloud Run environment: ${serviceName} (${serviceRevision})`);
} else if (isProduction) {
  logger.info('Running in production mode');
} else {
  logger.info(`Running in development mode: ${serviceName}`);
}

// ─── Export ─────────────────────────────────────────────────────────────────

export default logger;
export { logger };
export type { StructuredLogger };
