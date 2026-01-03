import winston from 'winston';
import path from 'path';
import fs from 'fs';

// =============================================================================
// Cloud Run Compatible Logger
// =============================================================================
// Cloud Run has a read-only filesystem (except /tmp)
// K_SERVICE env var is set by Cloud Run to identify the service
// When running in Cloud Run, we use console-only logging
// When running locally or on traditional servers, we use file logging
// =============================================================================

// Detect Cloud Run environment
const isCloudRun = !!process.env.K_SERVICE;
const isProduction = process.env.NODE_ENV === 'production';

// Service identification for Cloud Run logging (H8-5: 운영 서비스 공통 안정화)
const serviceName = process.env.K_SERVICE || process.env.SERVICE_NAME || 'o4o-api';
const serviceRevision = process.env.K_REVISION || 'local';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  verbose: 'cyan',
  debug: 'blue',
  silly: 'gray'
};

// Tell winston about our colors
winston.addColors(colors);

// Define log format for production (structured JSON for Cloud Logging)
// Include service name and revision for log identification
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format((info) => {
    info.service = serviceName;
    info.revision = serviceRevision;
    return info;
  })(),
  winston.format.json()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Build transports array based on environment
const transports: winston.transport[] = [
  // Always include console transport
  new winston.transports.Console({
    format: isProduction ? productionFormat : consoleFormat
  })
];

// Only add file transports when NOT running in Cloud Run
if (!isCloudRun) {
  const logsDir = path.join(process.cwd(), 'logs');

  // Ensure logs directory exists (only for non-Cloud Run environments)
  try {
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Add file transports
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error'
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log')
      })
    );
  } catch (err) {
    // If we can't create logs directory, continue with console only
    console.warn('Could not create logs directory, using console only:', err);
  }
}

// Build exception/rejection handlers based on environment
const exceptionHandlers: winston.transport[] = isCloudRun
  ? [new winston.transports.Console({ format: productionFormat })]
  : [
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'exceptions.log')
      })
    ];

const rejectionHandlers: winston.transport[] = isCloudRun
  ? [new winston.transports.Console({ format: productionFormat })]
  : [
      new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'rejections.log')
      })
    ];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format: productionFormat,
  transports,
  exceptionHandlers,
  rejectionHandlers
});

// Log environment info on startup (helps with debugging)
if (isCloudRun) {
  logger.info(`Running in Cloud Run environment: ${serviceName} (${serviceRevision})`);
} else if (isProduction) {
  logger.info('Running in production mode with file logging');
} else {
  logger.info(`Running in development mode: ${serviceName}`);
}

// Export logger
export default logger;