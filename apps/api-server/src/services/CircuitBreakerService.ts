import { Repository, Not } from 'typeorm';
import { AppDataSource } from '../database/connection';
import { SystemMetrics, MetricCategory } from '../entities/SystemMetrics';
import { Alert, AlertType, AlertSeverity, AlertStatus } from '../entities/Alert';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number; // milliseconds
  successThreshold: number; // for half-open state
  requestVolumeThreshold: number;
  errorThreshold: number; // percentage
  slowCallThreshold: number; // milliseconds
  slowCallRateThreshold: number; // percentage
  maxRetries: number;
}

export interface CircuitBreakerStats {
  circuitId: string;
  serviceName: string;
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalRequests: number;
  errorRate: number;
  averageResponseTime: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  stateChangeTime: Date;
  timeInCurrentState: number;
}

export interface ServiceCall {
  circuitId: string;
  startTime: Date;
  endTime?: Date;
  success: boolean;
  responseTime: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private totalRequests: number = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private stateChangeTime: Date = new Date();
  private requestWindow: ServiceCall[] = [];
  private halfOpenTests: number = 0;

  constructor(
    public readonly id: string,
    public readonly serviceName: string,
    public readonly config: CircuitBreakerConfig
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.stateChangeTime = new Date();
        this.halfOpenTests = 0;
      } else {
        throw new Error(`Circuit breaker ${this.id} is OPEN - rejecting request`);
      }
    }

    const call: ServiceCall = {
      circuitId: this.id,
      startTime: new Date(),
      success: false,
      responseTime: 0
    };

    try {
      const result = await this.executeWithTimeout(operation);
      
      call.endTime = new Date();
      call.responseTime = call.endTime.getTime() - call.startTime.getTime();
      call.success = true;
      
      this.onSuccess(call);
      return result;
      
    } catch (error) {
      call.endTime = new Date();
      call.responseTime = call.endTime.getTime() - call.startTime.getTime();
      call.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.onFailure(call);
      throw error;
    } finally {
      this.recordCall(call);
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.config.slowCallThreshold}ms`));
      }, this.config.slowCallThreshold);

      operation()
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  private onSuccess(call: ServiceCall): void {
    this.successCount++;
    this.totalRequests++;
    this.lastSuccessTime = call.endTime;

    if (this.state === CircuitState.HALF_OPEN) {
      this.halfOpenTests++;
      if (this.halfOpenTests >= this.config.successThreshold) {
        this.reset();
      }
    }
  }

  private onFailure(call: ServiceCall): void {
    this.failureCount++;
    this.totalRequests++;
    this.lastFailureTime = call.endTime;

    if (this.state === CircuitState.HALF_OPEN) {
      this.trip();
    } else if (this.shouldTrip()) {
      this.trip();
    }
  }

  private shouldTrip(): boolean {
    if (this.totalRequests < this.config.requestVolumeThreshold) {
      return false;
    }

    const errorRate = (this.failureCount / this.totalRequests) * 100;
    const recentRequests = this.getRecentRequests();
    const slowCallRate = this.getSlowCallRate(recentRequests);

    return (
      this.failureCount >= this.config.failureThreshold ||
      errorRate >= this.config.errorThreshold ||
      slowCallRate >= this.config.slowCallRateThreshold
    );
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return true;
    
    const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
    return timeSinceLastFailure >= this.config.recoveryTimeout;
  }

  private trip(): void {
    this.state = CircuitState.OPEN;
    this.stateChangeTime = new Date();
    this.halfOpenTests = 0;
  }

  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.stateChangeTime = new Date();
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenTests = 0;
  }

  private recordCall(call: ServiceCall): void {
    this.requestWindow.push(call);
    
    // Keep only recent requests (last 5 minutes)
    const cutoff = new Date(Date.now() - 5 * 60 * 1000);
    this.requestWindow = this.requestWindow.filter((req: any) => req.startTime >= cutoff);
  }

  private getRecentRequests(): ServiceCall[] {
    const cutoff = new Date(Date.now() - 60 * 1000); // Last minute
    return this.requestWindow.filter((req: any) => req.startTime >= cutoff);
  }

  private getSlowCallRate(requests: ServiceCall[]): number {
    if (requests.length === 0) return 0;
    
    const slowCalls = requests.filter((req: any) => req.responseTime > this.config.slowCallThreshold);
    return (slowCalls.length / requests.length) * 100;
  }

  getStats(): CircuitBreakerStats {
    const recentRequests = this.getRecentRequests();
    const errorRate = this.totalRequests > 0 ? (this.failureCount / this.totalRequests) * 100 : 0;
    const averageResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length
      : 0;

    return {
      circuitId: this.id,
      serviceName: this.serviceName,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      errorRate,
      averageResponseTime,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      stateChangeTime: this.stateChangeTime,
      timeInCurrentState: Date.now() - this.stateChangeTime.getTime()
    };
  }

  reset_manual(): void {
    this.reset();
  }

  force_open(): void {
    this.trip();
  }
}

export class CircuitBreakerService {
  private systemMetricsRepo: Repository<SystemMetrics>;
  private alertRepo: Repository<Alert>;
  private circuits: Map<string, CircuitBreaker> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private defaultConfig: CircuitBreakerConfig;

  constructor() {
    this.systemMetricsRepo = AppDataSource.getRepository(SystemMetrics);
    this.alertRepo = AppDataSource.getRepository(Alert);
    
    this.defaultConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      successThreshold: 3,
      requestVolumeThreshold: 10,
      errorThreshold: 50, // 50%
      slowCallThreshold: 5000, // 5 seconds
      slowCallRateThreshold: 50, // 50%
      maxRetries: 3
    };
  }

  async initialize(): Promise<void> {
    
    // Initialize default circuits for critical services
    await this.createDefaultCircuits();
    
    // Start monitoring
    await this.startMonitoring();
    
  }

  async shutdown(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.circuits.clear();
  }

  // Circuit management
  createCircuit(
    id: string, 
    serviceName: string, 
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    const finalConfig = { ...this.defaultConfig, ...config };
    const circuit = new CircuitBreaker(id, serviceName, finalConfig);
    
    this.circuits.set(id, circuit);
    
    return circuit;
  }

  getCircuit(id: string): CircuitBreaker | undefined {
    return this.circuits.get(id);
  }

  getOrCreateCircuit(
    id: string, 
    serviceName: string, 
    config?: Partial<CircuitBreakerConfig>
  ): CircuitBreaker {
    let circuit = this.circuits.get(id);
    if (!circuit) {
      circuit = this.createCircuit(id, serviceName, config);
    }
    return circuit;
  }

  removeCircuit(id: string): boolean {
    const removed = this.circuits.delete(id);
    return removed;
  }

  // Execution wrappers
  async executeWithCircuitBreaker<T>(
    circuitId: string,
    serviceName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const circuit = this.getOrCreateCircuit(circuitId, serviceName, config);
    return await circuit.execute(operation);
  }

  async executeDatabaseOperation<T>(operation: () => Promise<T>): Promise<T> {
    return await this.executeWithCircuitBreaker(
      'database-operations',
      'PostgreSQL Database',
      operation,
      {
        failureThreshold: 3,
        recoveryTimeout: 30000,
        slowCallThreshold: 3000,
        errorThreshold: 30
      }
    );
  }

  async executeExternalApiCall<T>(
    apiName: string, 
    operation: () => Promise<T>
  ): Promise<T> {
    return await this.executeWithCircuitBreaker(
      `external-api-${apiName}`,
      `External API: ${apiName}`,
      operation,
      {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        slowCallThreshold: 10000,
        errorThreshold: 60
      }
    );
  }

  async executeInternalService<T>(
    serviceName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return await this.executeWithCircuitBreaker(
      `internal-service-${serviceName}`,
      `Internal Service: ${serviceName}`,
      operation,
      {
        failureThreshold: 4,
        recoveryTimeout: 45000,
        slowCallThreshold: 5000,
        errorThreshold: 40
      }
    );
  }

  // Monitoring and metrics
  private async startMonitoring(): Promise<void> {
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectCircuitMetrics();
        await this.checkCircuitHealth();
        await this.cleanupOldData();
      } catch (error) {
        console.error('Circuit breaker monitoring failed:', error);
      }
    }, 30000); // Every 30 seconds

  }

  private async collectCircuitMetrics(): Promise<void> {
    for (const circuit of this.circuits.values()) {
      const stats = circuit.getStats();
      
      // Record circuit state
      await this.systemMetricsRepo.save(
        SystemMetrics.createSystemMetric(
          MetricCategory.CIRCUIT_BREAKER_STATE,
          `Circuit Breaker State: ${stats.serviceName}`,
          stats.state === CircuitState.CLOSED ? 0 : stats.state === CircuitState.OPEN ? 1 : 0.5,
          'state',
          stats.serviceName,
          {
            circuitId: stats.circuitId,
            state: stats.state,
            errorRate: stats.errorRate,
            responseTime: stats.averageResponseTime
          }
        )
      );

      // Record error rate
      await this.systemMetricsRepo.save(
        SystemMetrics.createSystemMetric(
          MetricCategory.ERROR_RATE,
          `Circuit Error Rate: ${stats.serviceName}`,
          stats.errorRate,
          '%',
          stats.serviceName,
          {
            circuitId: stats.circuitId,
            totalRequests: stats.totalRequests,
            failureCount: stats.failureCount
          }
        )
      );

      // Record response time
      if (stats.averageResponseTime > 0) {
        await this.systemMetricsRepo.save(
          SystemMetrics.createPerformanceMetric(
            MetricCategory.RESPONSE_TIME,
            `Circuit Response Time: ${stats.serviceName}`,
            stats.averageResponseTime,
            'ms',
            stats.serviceName,
            'circuit-breaker',
            {
              circuitId: stats.circuitId,
              state: stats.state
            }
          )
        );
      }
    }
  }

  private async checkCircuitHealth(): Promise<void> {
    for (const circuit of this.circuits.values()) {
      const stats = circuit.getStats();
      
      // Alert on circuit open
      if (stats.state === CircuitState.OPEN) {
        await this.createCircuitAlert(
          'Circuit Breaker Open',
          `Circuit breaker for ${stats.serviceName} is OPEN due to repeated failures`,
          AlertSeverity.HIGH,
          stats
        );
      }
      
      // Alert on high error rate
      if (stats.errorRate > 75 && stats.totalRequests > 10) {
        await this.createCircuitAlert(
          'High Error Rate',
          `Circuit breaker for ${stats.serviceName} showing ${stats.errorRate.toFixed(1)}% error rate`,
          AlertSeverity.HIGH,
          stats
        );
      }
      
      // Alert on slow response times
      if (stats.averageResponseTime > 10000) {
        await this.createCircuitAlert(
          'Slow Response Time',
          `Circuit breaker for ${stats.serviceName} showing average response time of ${stats.averageResponseTime}ms`,
          AlertSeverity.MEDIUM,
          stats
        );
      }
    }
  }

  private async createCircuitAlert(
    title: string,
    message: string,
    severity: AlertSeverity,
    stats: CircuitBreakerStats
  ): Promise<void> {
    // Check if similar alert already exists
    const existingAlert = await this.alertRepo.findOne({
      where: {
        alertType: AlertType.CIRCUIT_BREAKER,
        source: stats.serviceName,
        status: Not(AlertStatus.RESOLVED)
      }
    });

    if (existingAlert) {
      // Update existing alert
      existingAlert.recordOccurrence();
      existingAlert.lastOccurrence = new Date();
      existingAlert.metadata = { ...existingAlert.metadata, ...stats };
      await this.alertRepo.save(existingAlert);
    } else {
      // Create new alert
      const alert = Alert.createSystemAlert(
        title,
        message,
        severity,
        stats.serviceName,
        JSON.stringify({
          circuitId: stats.circuitId,
          circuitState: stats.state,
          errorRate: stats.errorRate,
          responseTime: stats.averageResponseTime,
          timestamp: new Date().toISOString()
        })
      );

      alert.alertType = AlertType.CIRCUIT_BREAKER;
      await this.alertRepo.save(alert);
    }
  }

  private async cleanupOldData(): Promise<void> {
    // Could implement cleanup of old circuit data if needed
  }

  private async createDefaultCircuits(): Promise<void> {
    // Database circuit
    this.createCircuit('database-main', 'PostgreSQL Database', {
      failureThreshold: 3,
      recoveryTimeout: 30000,
      successThreshold: 2,
      slowCallThreshold: 3000,
      errorThreshold: 30
    });

    // External API circuits
    this.createCircuit('external-api-google', 'Google APIs', {
      failureThreshold: 5,
      recoveryTimeout: 60000,
      slowCallThreshold: 10000,
      errorThreshold: 60
    });

    // Internal service circuits
    this.createCircuit('cache-service', 'Cache Service', {
      failureThreshold: 3,
      recoveryTimeout: 15000,
      slowCallThreshold: 2000,
      errorThreshold: 50
    });

    this.createCircuit('file-storage', 'File Storage Service', {
      failureThreshold: 4,
      recoveryTimeout: 45000,
      slowCallThreshold: 5000,
      errorThreshold: 40
    });

  }

  // Management API
  getAllCircuits(): CircuitBreakerStats[] {
    return Array.from(this.circuits.values()).map((circuit: any) => circuit.getStats());
  }

  getCircuitStats(circuitId: string): CircuitBreakerStats | null {
    const circuit = this.circuits.get(circuitId);
    return circuit ? circuit.getStats() : null;
  }

  async resetCircuit(circuitId: string): Promise<boolean> {
    const circuit = this.circuits.get(circuitId);
    if (circuit) {
      circuit.reset_manual();
      
      // Record manual reset
      await this.systemMetricsRepo.save(
        SystemMetrics.createSystemMetric(
          MetricCategory.CIRCUIT_BREAKER_RESET,
          `Circuit Breaker Manual Reset`,
          1,
          'event',
          circuit.serviceName,
          {
            circuitId,
            resetTime: new Date().toISOString(),
            resetType: 'manual'
          }
        )
      );
      
      return true;
    }
    return false;
  }

  async resetAllCircuits(): Promise<number> {
    let resetCount = 0;
    
    for (const [circuitId, circuit] of this.circuits) {
      circuit.reset_manual();
      resetCount++;
      
      await this.systemMetricsRepo.save(
        SystemMetrics.createSystemMetric(
          MetricCategory.CIRCUIT_BREAKER_RESET,
          `Circuit Breaker Bulk Reset`,
          1,
          'event',
          circuit.serviceName,
          {
            circuitId,
            resetTime: new Date().toISOString(),
            resetType: 'bulk'
          }
        )
      );
    }
    
    return resetCount;
  }

  async forceOpenCircuit(circuitId: string): Promise<boolean> {
    const circuit = this.circuits.get(circuitId);
    if (circuit) {
      circuit.force_open();
      
      await this.systemMetricsRepo.save(
        SystemMetrics.createSystemMetric(
          MetricCategory.CIRCUIT_BREAKER_MANUAL_OPEN,
          `Circuit Breaker Manual Open`,
          1,
          'event',
          circuit.serviceName,
          {
            circuitId,
            openTime: new Date().toISOString(),
            reason: 'manual'
          }
        )
      );
      
      return true;
    }
    return false;
  }

  // Health check for the circuit breaker service itself
  async getStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    circuitCount: number;
    openCircuits: number;
    halfOpenCircuits: number;
    issues: string[];
  }> {
    const circuits = this.getAllCircuits();
    const openCircuits = circuits.filter((c: any) => c.state === CircuitState.OPEN).length;
    const halfOpenCircuits = circuits.filter((c: any) => c.state === CircuitState.HALF_OPEN).length;
    const issues: string[] = [];

    // Check for issues
    if (openCircuits > circuits.length * 0.5) {
      issues.push(`More than 50% of circuits are open (${openCircuits}/${circuits.length})`);
    }

    if (circuits.some((c: any) => c.errorRate > 90)) {
      issues.push('Some circuits showing very high error rates');
    }

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (issues.length > 0) {
      status = openCircuits > circuits.length * 0.3 ? 'unhealthy' : 'degraded';
    }

    return {
      status,
      circuitCount: circuits.length,
      openCircuits,
      halfOpenCircuits,
      issues
    };
  }

  // Utility methods for common patterns
  async withFallback<T>(
    circuitId: string,
    serviceName: string,
    primaryOperation: () => Promise<T>,
    fallbackOperation: () => Promise<T>
  ): Promise<T> {
    try {
      return await this.executeWithCircuitBreaker(circuitId, serviceName, primaryOperation);
    } catch (error) {
      return await fallbackOperation();
    }
  }

  async withRetry<T>(
    circuitId: string,
    serviceName: string,
    operation: () => Promise<T>,
    maxRetries: number = 3,
    backoffMs: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.executeWithCircuitBreaker(circuitId, serviceName, operation);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, backoffMs * attempt));
        }
      }
    }
    
    throw lastError!;
  }
}

export const circuitBreakerService = new CircuitBreakerService();