import axios, { AxiosInstance } from 'axios';
import { ServiceConfig, gatewayConfig } from '../config/gateway.config.js';
import { createLogger } from '../utils/logger.js';
import Redis from 'ioredis';

const logger = createLogger('ServiceRegistry');

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
  error?: string;
}

export class ServiceRegistry {
  private services: Map<string, ServiceConfig> = new Map();
  private healthStatus: Map<string, ServiceHealth> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private redis: Redis | null = null;
  private axiosInstances: Map<string, AxiosInstance> = new Map();

  constructor(redis?: Redis) {
    this.redis = redis || null;
    this.initializeServices();
  }

  /**
   * Initialize services from configuration
   */
  private initializeServices(): void {
    Object.entries(gatewayConfig.services).forEach(([key, config]) => {
      this.registerService(key, config);
    });
  }

  /**
   * Register a service
   */
  registerService(key: string, config: ServiceConfig): void {
    this.services.set(key, config);
    
    // Create axios instance for the service
    const axiosInstance = axios.create({
      baseURL: config.url,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Add retry logic
    axiosInstance.interceptors.response.use(
      response => response,
      async error => {
        const { config: requestConfig } = error;
        
        if (!requestConfig || !requestConfig.retry) {
          requestConfig.retry = 0;
        }
        
        if (requestConfig.retry < (config.retries || 3)) {
          requestConfig.retry += 1;
          logger.warn(`Retrying request to ${config.name}`, {
            attempt: requestConfig.retry,
            url: requestConfig.url
          });
          
          // Exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, Math.pow(2, requestConfig.retry) * 1000)
          );
          
          return axiosInstance(requestConfig);
        }
        
        return Promise.reject(error);
      }
    );
    
    this.axiosInstances.set(key, axiosInstance);
    
    // Set initial health status
    this.healthStatus.set(key, {
      name: config.name,
      status: 'unknown',
      lastCheck: new Date()
    });
    
    logger.info(`Service registered: ${config.name}`, { key, url: config.url });
  }

  /**
   * Get service configuration
   */
  getService(key: string): ServiceConfig | undefined {
    return this.services.get(key);
  }

  /**
   * Get axios instance for a service
   */
  getServiceClient(key: string): AxiosInstance | undefined {
    return this.axiosInstances.get(key);
  }

  /**
   * Get all services
   */
  getAllServices(): Map<string, ServiceConfig> {
    return this.services;
  }

  /**
   * Start health checks
   */
  startHealthChecks(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Initial health check
    this.checkAllServices();
    
    // Periodic health checks
    this.healthCheckInterval = setInterval(() => {
      this.checkAllServices();
    }, intervalMs);
    
    logger.info('Health checks started', { interval: `${intervalMs}ms` });
  }

  /**
   * Stop health checks
   */
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      logger.info('Health checks stopped');
    }
  }

  /**
   * Check health of all services
   */
  private async checkAllServices(): Promise<void> {
    const checks = Array.from(this.services.entries()).map(([key, config]) => 
      this.checkServiceHealth(key, config)
    );
    
    await Promise.all(checks);
    
    // Cache health status in Redis if available
    if (this.redis) {
      const healthData = Object.fromEntries(
        Array.from(this.healthStatus.entries()).map(([key, health]) => [
          key,
          JSON.stringify(health)
        ])
      );
      
      await this.redis.hset('gateway:health', healthData);
      await this.redis.expire('gateway:health', 60); // Expire after 1 minute
    }
  }

  /**
   * Check health of a single service
   */
  private async checkServiceHealth(key: string, config: ServiceConfig): Promise<void> {
    const start = Date.now();
    const client = this.axiosInstances.get(key);
    
    if (!client) {
      logger.error(`No axios instance for service ${key}`);
      return;
    }
    
    try {
      const response = await client.get(config.healthCheck, {
        timeout: 5000,
        retry: 0 // Don't retry health checks
      });
      
      const responseTime = Date.now() - start;
      
      this.healthStatus.set(key, {
        name: config.name,
        status: 'healthy',
        lastCheck: new Date(),
        responseTime
      });
      
      logger.debug(`Health check passed: ${config.name}`, { responseTime });
    } catch (error: any) {
      this.healthStatus.set(key, {
        name: config.name,
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error.message
      });
      
      logger.error(`Health check failed: ${config.name}`, {
        error: error.message,
        code: error.code
      });
    }
  }

  /**
   * Get health status of a service
   */
  getServiceHealth(key: string): ServiceHealth | undefined {
    return this.healthStatus.get(key);
  }

  /**
   * Get health status of all services
   */
  getAllHealth(): Map<string, ServiceHealth> {
    return this.healthStatus;
  }

  /**
   * Check if a service is healthy
   */
  isServiceHealthy(key: string): boolean {
    const health = this.healthStatus.get(key);
    return health?.status === 'healthy';
  }

  /**
   * Get healthy services
   */
  getHealthyServices(): string[] {
    return Array.from(this.healthStatus.entries())
      .filter(([_, health]) => health.status === 'healthy')
      .map(([key, _]) => key);
  }

  /**
   * Circuit breaker: Check if we should route to a service
   */
  shouldRouteToService(key: string): boolean {
    const health = this.healthStatus.get(key);
    
    if (!health) {
      return false;
    }
    
    // Simple circuit breaker logic
    if (health.status === 'unhealthy') {
      // Check if enough time has passed to retry
      const timeSinceLastCheck = Date.now() - health.lastCheck.getTime();
      const retryAfter = 30000; // 30 seconds
      
      if (timeSinceLastCheck > retryAfter) {
        // Try to check health again
        const config = this.services.get(key);
        if (config) {
          this.checkServiceHealth(key, config);
        }
      }
      
      return false;
    }
    
    return true;
  }

  /**
   * Get service metrics
   */
  getMetrics(): any {
    const metrics = {
      totalServices: this.services.size,
      healthyServices: this.getHealthyServices().length,
      services: {} as any
    };
    
    this.healthStatus.forEach((health, key) => {
      metrics.services[key] = {
        status: health.status,
        lastCheck: health.lastCheck,
        responseTime: health.responseTime,
        error: health.error
      };
    });
    
    return metrics;
  }
}