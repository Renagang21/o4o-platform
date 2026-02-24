/**
 * Centralized Application Configuration
 *
 * Phase C: Config Hardening for Cloud Run
 *
 * Goals:
 * - Server ALWAYS starts regardless of missing env vars
 * - Features are disabled gracefully when config is missing
 * - No process.exit or throw on missing config
 * - /health reports config status but always returns 200
 *
 * Classification:
 * A) Core: Required for server to start (PORT, NODE_ENV) - always have defaults
 * B) Feature: Required for functionality (DB, Auth, Redis, Email) - features disabled if missing
 * C) Operational: Nice-to-have (logging, cache TTLs) - defaults applied
 */

import logger from '../utils/logger.js';

// ============================================================
// Types
// ============================================================

export interface FeatureStatus {
  enabled: boolean;
  reason?: string;
  config?: Record<string, any>;
}

export interface ConfigStatus {
  features: {
    database: FeatureStatus;
    auth: FeatureStatus;
    redis: FeatureStatus;
    email: FeatureStatus;
    socialAuth: {
      google: FeatureStatus;
      kakao: FeatureStatus;
      naver: FeatureStatus;
    };
    payment: FeatureStatus;
    queue: FeatureStatus;
    monitoring: FeatureStatus;
  };
  missingConfigs: string[];
  warnings: string[];
}

// ============================================================
// Safe Environment Getters
// ============================================================

function getEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  const num = parseInt(value, 10);
  return isNaN(num) ? defaultValue : num;
}

function getEnvBoolean(key: string, defaultValue: boolean = false): boolean {
  const value = process.env[key];
  if (value === undefined || value === '') return defaultValue;
  return value === 'true' || value === '1';
}

// ============================================================
// Configuration Categories
// ============================================================

/**
 * A) Core Configuration - Server MUST have these to start
 * All have safe defaults, server never crashes
 */
export const coreConfig = {
  port: getEnvNumber('PORT', 4000),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  host: getEnv('HOST', '0.0.0.0'),

  isProduction: () => coreConfig.nodeEnv === 'production',
  isDevelopment: () => coreConfig.nodeEnv === 'development',
  isTest: () => coreConfig.nodeEnv === 'test',
};

/**
 * B) Database Configuration - Feature disabled if not configured
 */
export const databaseConfig = {
  host: getEnv('DB_HOST', 'localhost'),
  port: getEnvNumber('DB_PORT', 5432),
  username: getEnv('DB_USERNAME', 'postgres'),
  password: getEnv('DB_PASSWORD', ''),
  database: getEnv('DB_NAME', 'o4o_platform'),

  isConfigured: () => {
    return !!(process.env.DB_HOST && process.env.DB_NAME);
  },

  getStatus: (): FeatureStatus => {
    const configured = databaseConfig.isConfigured();
    return {
      enabled: configured,
      reason: configured ? 'Database configured' : 'DB_HOST or DB_NAME not set',
      config: configured ? {
        host: databaseConfig.host,
        port: databaseConfig.port,
        database: databaseConfig.database
      } : undefined
    };
  }
};

/**
 * B) Auth Configuration - Auth disabled if JWT secrets not set
 */
export const authConfig = {
  jwtSecret: getEnv('JWT_SECRET', 'dev-jwt-secret-do-not-use-in-production'),
  jwtRefreshSecret: getEnv('JWT_REFRESH_SECRET', 'dev-refresh-secret-do-not-use-in-production'),
  jwtIssuer: getEnv('JWT_ISSUER', 'o4o-platform'),
  jwtAudience: getEnv('JWT_AUDIENCE', 'o4o-api'),
  jwtAccessTokenExpires: getEnv('JWT_ACCESS_TOKEN_EXPIRES', '15m'),
  jwtRefreshTokenExpires: getEnv('JWT_REFRESH_TOKEN_EXPIRES', '7d'),
  bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 12),
  sessionSecret: getEnv('SESSION_SECRET', 'dev-session-secret'),
  cookieDomain: getEnv('COOKIE_DOMAIN', ''),

  isConfigured: () => {
    // In production, require proper secrets
    if (coreConfig.isProduction()) {
      return !!(process.env.JWT_SECRET && process.env.JWT_REFRESH_SECRET);
    }
    // In development, always allow (using defaults)
    return true;
  },

  isUsingDevSecrets: () => {
    return !process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET;
  },

  getStatus: (): FeatureStatus => {
    const configured = authConfig.isConfigured();
    const usingDevSecrets = authConfig.isUsingDevSecrets();
    return {
      enabled: configured,
      reason: !configured
        ? 'JWT_SECRET or JWT_REFRESH_SECRET not set in production'
        : (usingDevSecrets ? 'Using development secrets (NOT SAFE FOR PRODUCTION)' : 'Auth properly configured'),
    };
  }
};

/**
 * B) Redis Configuration - Redis features disabled if not configured
 */
export const redisConfig = {
  host: getEnv('REDIS_HOST', 'localhost'),
  port: getEnvNumber('REDIS_PORT', 6379),
  password: getEnv('REDIS_PASSWORD', ''),
  db: getEnvNumber('REDIS_DB', 0),
  keyPrefix: getEnv('REDIS_KEY_PREFIX', 'o4o:'),
  enabled: getEnvBoolean('REDIS_ENABLED', false),

  isConfigured: () => {
    return !!process.env.REDIS_HOST;
  },

  getStatus: (): FeatureStatus => {
    const configured = redisConfig.isConfigured();
    return {
      enabled: configured,
      reason: configured ? 'Redis configured' : 'REDIS_HOST not set - using in-memory cache',
      config: configured ? {
        host: redisConfig.host,
        port: redisConfig.port,
        db: redisConfig.db
      } : undefined
    };
  }
};

/**
 * B) Email Configuration - Email disabled if SMTP not configured
 */
export const emailConfig = {
  host: getEnv('SMTP_HOST', 'smtp.gmail.com'),
  port: getEnvNumber('SMTP_PORT', 587),
  secure: getEnvBoolean('SMTP_SECURE', false),
  user: getEnv('SMTP_USER', ''),
  pass: getEnv('SMTP_PASS', ''),
  fromName: getEnv('SMTP_FROM_NAME', 'O4O Platform'),
  fromEmail: getEnv('SMTP_FROM_EMAIL', 'noreply@neture.co.kr'),
  enabled: getEnvBoolean('EMAIL_SERVICE_ENABLED', false),

  isConfigured: () => {
    return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  },

  getStatus: (): FeatureStatus => {
    const configured = emailConfig.isConfigured();
    const enabled = emailConfig.enabled;
    return {
      enabled: configured && enabled,
      reason: !enabled
        ? 'EMAIL_SERVICE_ENABLED is false'
        : (!configured ? 'SMTP credentials not configured' : 'Email service ready'),
    };
  }
};

/**
 * B) Social Auth Configuration - Per-provider disabled if not configured
 */
export const socialAuthConfig = {
  google: {
    clientId: getEnv('GOOGLE_CLIENT_ID', ''),
    clientSecret: getEnv('GOOGLE_CLIENT_SECRET', ''),
    isConfigured: () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    getStatus: (): FeatureStatus => ({
      enabled: socialAuthConfig.google.isConfigured(),
      reason: socialAuthConfig.google.isConfigured() ? 'Google OAuth configured' : 'GOOGLE_CLIENT_ID/SECRET not set'
    })
  },
  kakao: {
    clientId: getEnv('KAKAO_CLIENT_ID', ''),
    clientSecret: getEnv('KAKAO_CLIENT_SECRET', ''),
    isConfigured: () => !!(process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET),
    getStatus: (): FeatureStatus => ({
      enabled: socialAuthConfig.kakao.isConfigured(),
      reason: socialAuthConfig.kakao.isConfigured() ? 'Kakao OAuth configured' : 'KAKAO_CLIENT_ID/SECRET not set'
    })
  },
  naver: {
    clientId: getEnv('NAVER_CLIENT_ID', ''),
    clientSecret: getEnv('NAVER_CLIENT_SECRET', ''),
    isConfigured: () => !!(process.env.NAVER_CLIENT_ID && process.env.NAVER_CLIENT_SECRET),
    getStatus: (): FeatureStatus => ({
      enabled: socialAuthConfig.naver.isConfigured(),
      reason: socialAuthConfig.naver.isConfigured() ? 'Naver OAuth configured' : 'NAVER_CLIENT_ID/SECRET not set'
    })
  }
};

/**
 * B) Payment Configuration - Payment disabled if not configured
 */
export const paymentConfig = {
  tossSecretKey: getEnv('TOSS_SECRET_KEY', ''),
  tossClientKey: getEnv('TOSS_CLIENT_KEY', ''),
  tossBaseUrl: getEnv('TOSS_API_BASE_URL', 'https://api.tosspayments.com/v1'),
  isTestMode: () => paymentConfig.tossSecretKey.startsWith('test_'),

  isConfigured: () => {
    return !!process.env.TOSS_SECRET_KEY;
  },

  getStatus: (): FeatureStatus => {
    const configured = paymentConfig.isConfigured();
    return {
      enabled: configured,
      reason: configured
        ? (paymentConfig.isTestMode() ? 'Toss Payments (TEST MODE)' : 'Toss Payments configured')
        : 'TOSS_SECRET_KEY not set'
    };
  }
};

/**
 * B) Beta Configuration — WO-O4O-INTERNAL-BETA-ROLL-OUT-V1
 *
 * Controls internal beta features:
 * - Dev Dashboard periodic log output
 * - /internal/ops/metrics endpoint
 * - Slow threshold warn logging
 */
export const betaConfig = {
  enabled: getEnvBoolean('BETA_MODE', false),

  isEnabled: () => betaConfig.enabled,

  getStatus: (): FeatureStatus => ({
    enabled: betaConfig.enabled,
    reason: betaConfig.enabled
      ? 'Internal Beta mode ON — ops metrics active'
      : 'Beta mode OFF — ops features dormant',
  }),
};

/**
 * C) Operational Configuration - Nice-to-have with sensible defaults
 */
export const operationalConfig = {
  // Logging
  logLevel: getEnv('LOG_LEVEL', 'info'),

  // Cache TTLs
  cacheTtlShort: getEnvNumber('CACHE_TTL_SHORT', 60),
  cacheTtlMedium: getEnvNumber('CACHE_TTL_MEDIUM', 300),
  cacheTtlLong: getEnvNumber('CACHE_TTL_LONG', 3600),
  cacheTtlDay: getEnvNumber('CACHE_TTL_DAY', 86400),
  cacheEnabled: getEnvBoolean('CACHE_ENABLED', true),

  // CORS
  corsOrigin: getEnv('CORS_ORIGIN', ''),
  frontendUrl: getEnv('FRONTEND_URL', 'http://localhost:3011'),
  apiUrl: getEnv('API_URL', 'http://localhost:4000'),

  // Feature Flags
  enableDocs: getEnvBoolean('ENABLE_DOCS', true),
  enableGeoLocation: getEnvBoolean('ENABLE_GEO_LOCATION', false),
  debugCors: getEnvBoolean('DEBUG_CORS', false),

  // Security
  queryMaxComplexity: getEnvNumber('QUERY_MAX_COMPLEXITY', 100),
  queryMaxLimit: getEnvNumber('QUERY_MAX_LIMIT', 100),

  // Upload
  themeMaxFileSize: getEnvNumber('THEME_MAX_FILE_SIZE', 52428800),
  themeUploadDir: getEnv('THEME_UPLOAD_DIR', 'uploads/themes/'),
};

/**
 * B) Queue Configuration - Queue features disabled if Redis not configured
 */
export const queueConfig = {
  isConfigured: () => redisConfig.isConfigured(),

  getStatus: (): FeatureStatus => {
    const configured = queueConfig.isConfigured();
    return {
      enabled: configured,
      reason: configured ? 'BullMQ queue ready' : 'Queue disabled (Redis not configured)'
    };
  }
};

/**
 * C) Monitoring Configuration
 */
export const monitoringConfig = {
  otlpEndpoint: getEnv('OTEL_EXPORTER_OTLP_ENDPOINT', ''),
  prometheusEnabled: getEnvBoolean('PROMETHEUS_ENABLED', false),

  isConfigured: () => {
    return !!process.env.OTEL_EXPORTER_OTLP_ENDPOINT || monitoringConfig.prometheusEnabled;
  },

  getStatus: (): FeatureStatus => ({
    enabled: monitoringConfig.isConfigured(),
    reason: monitoringConfig.isConfigured() ? 'Monitoring configured' : 'No monitoring endpoint configured'
  })
};

// ============================================================
// Config Status API
// ============================================================

/**
 * Get complete configuration status
 * Used by /health endpoint
 */
export function getConfigStatus(): ConfigStatus {
  const missingConfigs: string[] = [];
  const warnings: string[] = [];

  // Check critical missing configs
  if (!databaseConfig.isConfigured()) {
    missingConfigs.push('DB_HOST', 'DB_NAME');
  }

  if (coreConfig.isProduction() && authConfig.isUsingDevSecrets()) {
    missingConfigs.push('JWT_SECRET', 'JWT_REFRESH_SECRET');
    warnings.push('CRITICAL: Using development JWT secrets in production!');
  } else if (authConfig.isUsingDevSecrets()) {
    warnings.push('Using development JWT secrets - OK for development');
  }

  if (!redisConfig.isConfigured()) {
    warnings.push('Redis not configured - using in-memory cache');
  }

  if (!emailConfig.isConfigured() && emailConfig.enabled) {
    warnings.push('Email enabled but SMTP not configured');
  }

  return {
    features: {
      database: databaseConfig.getStatus(),
      auth: authConfig.getStatus(),
      redis: redisConfig.getStatus(),
      email: emailConfig.getStatus(),
      socialAuth: {
        google: socialAuthConfig.google.getStatus(),
        kakao: socialAuthConfig.kakao.getStatus(),
        naver: socialAuthConfig.naver.getStatus()
      },
      payment: paymentConfig.getStatus(),
      queue: queueConfig.getStatus(),
      monitoring: monitoringConfig.getStatus()
    },
    missingConfigs,
    warnings
  };
}

/**
 * Log configuration status at startup
 */
export function logConfigStatus(): void {
  const status = getConfigStatus();

  logger.info('========================================');
  logger.info('📋 Application Configuration Status');
  logger.info('========================================');
  logger.info(`Environment: ${coreConfig.nodeEnv}`);
  logger.info(`Port: ${coreConfig.port}`);
  logger.info('');

  // Features
  logger.info('Feature Status:');
  logger.info(`  Database:    ${status.features.database.enabled ? '✅ Enabled' : '❌ Disabled'} - ${status.features.database.reason}`);
  logger.info(`  Auth:        ${status.features.auth.enabled ? '✅ Enabled' : '❌ Disabled'} - ${status.features.auth.reason}`);
  logger.info(`  Redis:       ${status.features.redis.enabled ? '✅ Enabled' : '⚠️ Fallback'} - ${status.features.redis.reason}`);
  logger.info(`  Email:       ${status.features.email.enabled ? '✅ Enabled' : '❌ Disabled'} - ${status.features.email.reason}`);
  logger.info(`  Payment:     ${status.features.payment.enabled ? '✅ Enabled' : '❌ Disabled'} - ${status.features.payment.reason}`);
  logger.info(`  Queue:       ${status.features.queue.enabled ? '✅ Enabled' : '❌ Disabled'} - ${status.features.queue.reason}`);
  logger.info('');

  // Social Auth
  logger.info('Social Auth:');
  logger.info(`  Google:      ${status.features.socialAuth.google.enabled ? '✅' : '❌'}`);
  logger.info(`  Kakao:       ${status.features.socialAuth.kakao.enabled ? '✅' : '❌'}`);
  logger.info(`  Naver:       ${status.features.socialAuth.naver.enabled ? '✅' : '❌'}`);
  logger.info('');

  // Warnings
  if (status.warnings.length > 0) {
    logger.warn('⚠️ Warnings:');
    status.warnings.forEach(w => logger.warn(`  - ${w}`));
    logger.info('');
  }

  // Missing configs
  if (status.missingConfigs.length > 0) {
    logger.warn('Missing Configurations:');
    logger.warn(`  ${status.missingConfigs.join(', ')}`);
    logger.info('');
  }

  logger.info('========================================');
  logger.info('🚀 Server starting with above configuration');
  logger.info('========================================');
}

/**
 * Get enabled features list (for /health)
 */
export function getEnabledFeatures(): string[] {
  const status = getConfigStatus();
  const enabled: string[] = [];

  if (status.features.database.enabled) enabled.push('database');
  if (status.features.auth.enabled) enabled.push('auth');
  if (status.features.redis.enabled) enabled.push('redis');
  if (status.features.email.enabled) enabled.push('email');
  if (status.features.payment.enabled) enabled.push('payment');
  if (status.features.queue.enabled) enabled.push('queue');
  if (status.features.socialAuth.google.enabled) enabled.push('oauth:google');
  if (status.features.socialAuth.kakao.enabled) enabled.push('oauth:kakao');
  if (status.features.socialAuth.naver.enabled) enabled.push('oauth:naver');
  if (status.features.monitoring.enabled) enabled.push('monitoring');

  return enabled;
}

// Default export for convenience
export default {
  core: coreConfig,
  database: databaseConfig,
  auth: authConfig,
  redis: redisConfig,
  email: emailConfig,
  socialAuth: socialAuthConfig,
  payment: paymentConfig,
  queue: queueConfig,
  monitoring: monitoringConfig,
  operational: operationalConfig,
  beta: betaConfig,
  getStatus: getConfigStatus,
  logStatus: logConfigStatus,
  getEnabledFeatures
};
