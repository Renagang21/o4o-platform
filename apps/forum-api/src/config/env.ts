/**
 * Environment Configuration
 * =============================================================================
 * Centralized environment variable management for App API servers.
 *
 * Rules:
 * - All env vars accessed through this module
 * - Defaults provided for development
 * - Cloud Run auto-sets PORT=8080
 * =============================================================================
 */

import dotenv from 'dotenv';

// Load .env file (ignored in Cloud Run where env vars are set directly)
dotenv.config();

export const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3101', 10),
  HOST: process.env.HOST || '0.0.0.0',

  // Core API
  CORE_API_URL: process.env.CORE_API_URL || 'http://localhost:4000',

  // Cloud Run detection
  isCloudRun: !!process.env.K_SERVICE,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // Service info (set by Cloud Run)
  K_SERVICE: process.env.K_SERVICE,
  K_REVISION: process.env.K_REVISION,
};

// Validate required env vars in production
export function validateEnv(): void {
  if (env.isProduction) {
    const required = ['CORE_API_URL'];
    const missing = required.filter(key => !process.env[key]);

    if (missing.length > 0) {
      console.error(`Missing required environment variables: ${missing.join(', ')}`);
      // Don't exit - allow graceful degradation
    }
  }
}
