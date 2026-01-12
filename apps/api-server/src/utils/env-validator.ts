/**
 * Environment Variable Validator
 * 필수 환경 변수를 체크하고 기본값을 설정합니다.
 */

import logger from './logger.js';

class EnvironmentValidator {
  private env: { [key: string]: string | undefined };
  // Base required vars (always needed)
  private baseRequiredVars: string[] = [
    'JWT_SECRET',
  ];

  // DB vars (only required if GRACEFUL_STARTUP is not true)
  private dbRequiredVars: string[] = [
    'DB_HOST',
    'DB_PORT',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_NAME',
  ];

  // Computed required vars based on GRACEFUL_STARTUP
  private get requiredVars(): string[] {
    // If GRACEFUL_STARTUP is enabled, skip DB vars
    if (process.env.GRACEFUL_STARTUP === 'true') {
      return this.baseRequiredVars;
    }
    return [...this.baseRequiredVars, ...this.dbRequiredVars];
  }
  
  private optionalVars: string[] = [
    'NODE_ENV',
    'PORT',
    'HOST',
    'SESSION_SECRET',
    'COOKIE_DOMAIN',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'REDIS_ENABLED',
    'SESSION_SYNC_ENABLED',
    'EMAIL_SERVICE_ENABLED',
    'BCRYPT_ROUNDS',
    'JWT_REFRESH_SECRET',
  ];
  
  constructor() {
    this.env = process.env;
    this.validate();
  }
  
  private validate(): void {
    const missingVars: string[] = [];
    
    // Check required variables
    for (const varName of this.requiredVars) {
      if (!this.env[varName]) {
        // Use defaults in development
        if (this.env.NODE_ENV !== 'production') {
          this.setDefaults(varName);
        } else {
          missingVars.push(varName);
        }
      }
    }
    
    // In production, fail if required vars are missing
    if (missingVars.length > 0 && this.env.NODE_ENV === 'production') {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}\n` +
        'Please set these in your .env file or environment.'
      );
    }
    
    // Log configuration
    this.logConfiguration();
  }
  
  private setDefaults(varName: string): void {
    const defaults: { [key: string]: string } = {
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: '',
      DB_NAME: 'o4o_platform',
      JWT_SECRET: 'dev-jwt-secret-change-in-production',
      JWT_REFRESH_SECRET: 'dev-refresh-secret-change-in-production',
    };
    
    if (defaults[varName] !== undefined) {
      this.env[varName] = defaults[varName];
    }
  }
  
  private logConfiguration(): void {
    logger.info('🔧 Environment Configuration:');
    logger.info(`  - Environment: ${this.env.NODE_ENV || 'development'}`);
    logger.info(`  - Database: ${this.env.DB_NAME}@${this.env.DB_HOST}:${this.env.DB_PORT}`);
    logger.info(`  - Server Port: ${this.env.PORT || '8080'}`);
    
    // Optional services
    if (this.env.REDIS_HOST) {
      logger.info(`  - Redis: ${this.env.REDIS_HOST}:${this.env.REDIS_PORT || '6379'}`);
    } else {
      logger.info('  - Redis: Not configured');
    }
    
    if (this.env.EMAIL_SERVICE_ENABLED === 'true') {
      logger.info('  - Email Service: Enabled');
    } else {
      logger.info('  - Email Service: Disabled');
    }
  }
  
  /**
   * Get environment variable with type safety
   */
  get<T = string>(key: string): T;
  get<T = string>(key: string, defaultValue: T): T;
  get<T = any>(key: string, defaultValue?: T): T {
    const value = this.env[key];
    
    if (value === undefined || value === '') {
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      if (this.requiredVars.includes(key)) {
        throw new Error(`Required environment variable ${key} is not set`);
      }
      return '' as T;
    }
    
    // Type conversion for common types
    if (typeof defaultValue === 'boolean' || (defaultValue === undefined && (value === 'true' || value === 'false'))) {
      return (value === 'true') as T;
    }
    
    if (typeof defaultValue === 'number' || (defaultValue === undefined && !isNaN(Number(value)))) {
      const num = Number(value);
      if (!isNaN(num)) {
        return num as T;
      }
    }
    
    return value as T;
  }
  
  /**
   * Get string value
   */
  getString(key: string, defaultValue?: string): string {
    return this.get<string>(key, defaultValue as any);
  }
  
  /**
   * Get number value
   */
  getNumber(key: string, defaultValue?: number): number {
    const value = this.get(key, defaultValue?.toString());
    const num = Number(value);
    return isNaN(num) ? (defaultValue || 0) : num;
  }
  
  /**
   * Get boolean value
   */
  getBoolean(key: string, defaultValue = false): boolean {
    const value = this.get(key, defaultValue.toString());
    return value === 'true' || value === '1';
  }
  
  /**
   * Check if environment is development
   */
  isDevelopment(): boolean {
    return this.env.NODE_ENV !== 'production';
  }
  
  /**
   * Check if environment is production
   */
  isProduction(): boolean {
    return this.env.NODE_ENV === 'production';
  }
  
  /**
   * Check if environment is test
   */
  isTest(): boolean {
    return this.env.NODE_ENV === 'test';
  }
}

// Lazy singleton instance - delays validation until first access
// This ensures dotenv.config() runs before validation
let envInstance: EnvironmentValidator | null = null;

function getEnvInstance(): EnvironmentValidator {
  if (!envInstance) {
    envInstance = new EnvironmentValidator();
  }
  return envInstance;
}

// Export a proxy that creates the instance on first access
export const env = new Proxy({} as EnvironmentValidator, {
  get(target, prop: string) {
    const instance = getEnvInstance();
    const value = (instance as any)[prop];
    // Bind methods to the instance
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});