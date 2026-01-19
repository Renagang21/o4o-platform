/**
 * SiteGuide Environment Configuration
 *
 * WO-SITEGUIDE-CLOUD-RUN-V1
 *
 * Environment variable schema for SiteGuide Core API.
 * Values are loaded from environment variables.
 * In Cloud Run, these are injected via deployment configuration.
 */

import dotenv from 'dotenv';

// Load .env file in development
dotenv.config();

/**
 * Service configuration interface
 */
interface ServiceConfig {
  // Service Identity
  SERVICE_NAME: string;
  SERVICE_DOMAIN: string;
  NODE_ENV: string;

  // Server
  PORT: number;

  // CORS
  CORS_ORIGINS: string[];

  // Database (optional - for future use)
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;

  // AI Execution
  AI_EXECUTION_ENABLED: boolean;
}

/**
 * Parse CORS origins from environment variable
 */
function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) {
    // Default: allow siteguide.co.kr and localhost in development
    return [
      'https://siteguide.co.kr',
      'https://www.siteguide.co.kr',
      'http://localhost:3000',
      'http://localhost:5173',
    ];
  }

  if (value === '*') {
    return ['*'];
  }

  return value.split(',').map((origin) => origin.trim());
}

/**
 * Exported configuration object
 */
export const config: ServiceConfig = {
  // Service Identity
  SERVICE_NAME: process.env.SERVICE_NAME || 'siteguide',
  SERVICE_DOMAIN: process.env.SERVICE_DOMAIN || 'siteguide.co.kr',
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Server
  // Cloud Run uses PORT environment variable
  PORT: parseInt(process.env.PORT || '8080', 10),

  // CORS
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGINS),

  // Database
  DB_HOST: process.env.DB_HOST || '',
  DB_PORT: parseInt(process.env.DB_PORT || '5432', 10),
  DB_NAME: process.env.DB_NAME || '',
  DB_USER: process.env.DB_USER || '',
  DB_PASSWORD: process.env.DB_PASSWORD || '',

  // AI Execution
  AI_EXECUTION_ENABLED: process.env.AI_EXECUTION_ENABLED !== 'false',
};

/**
 * Validate required configuration
 * Called at startup to ensure critical config is present
 */
export function validateConfig(): void {
  const errors: string[] = [];

  // In production, certain values should be set
  if (config.NODE_ENV === 'production') {
    if (!process.env.SERVICE_DOMAIN) {
      console.warn('[Config] SERVICE_DOMAIN not set, using default: siteguide.co.kr');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Log configuration on import (non-sensitive values only)
if (config.NODE_ENV !== 'test') {
  console.log('[SiteGuide Config]');
  console.log(`  SERVICE_NAME: ${config.SERVICE_NAME}`);
  console.log(`  SERVICE_DOMAIN: ${config.SERVICE_DOMAIN}`);
  console.log(`  NODE_ENV: ${config.NODE_ENV}`);
  console.log(`  PORT: ${config.PORT}`);
  console.log(`  AI_EXECUTION_ENABLED: ${config.AI_EXECUTION_ENABLED}`);
}
