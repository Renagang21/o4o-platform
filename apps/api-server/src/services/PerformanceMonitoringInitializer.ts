import { PerformanceOptimizationService } from './PerformanceOptimizationService';
import { AutoScalingService } from './AutoScalingService';
import { CDNOptimizationService } from './CDNOptimizationService';
import { DatabaseOptimizationService } from './DatabaseOptimizationService';
import { AnalyticsService } from './AnalyticsService';
import { DeploymentMonitoringService } from './DeploymentMonitoringService';
import { OperationsMonitoringService } from './OperationsMonitoringService';
import Redis from 'ioredis';

/**
 * 성능 모니터링 초기화 서비스
 * 
 * 모든 성능 최적화 및 스케일링 서비스를 통합 관리하는 중앙 초기화 서비스
 * 
 * 관리하는 서비스들:
 * - PerformanceOptimizationService: 성능 최적화
 * - AutoScalingService: 자동 스케일링
 * - CDNOptimizationService: CDN 최적화
 * - DatabaseOptimizationService: 데이터베이스 최적화
 * - AnalyticsService: 분석 서비스
 * - DeploymentMonitoringService: 배포 모니터링
 * - OperationsMonitoringService: 운영 모니터링
 */
export class PerformanceMonitoringInitializer {
  private redis: Redis;
  private services: Map<string, MonitoringService> = new Map();
  private isInitialized: boolean = false;
  private healthCheckInterval?: NodeJS.Timeout;
  private serviceStatus: Map<string, ServiceStatus> = new Map();

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    });
  }

  /**
   * 모든 성능 모니터링 서비스 초기화
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('⚠️ Performance monitoring services are already initialized');
      return;
    }

    try {
      // console.log('🚀 Initializing performance monitoring services...');

      // Redis 연결 확인
      await this.verifyRedisConnection();

      // 서비스 초기화 순서 (의존성 고려)
      await this.initializeAnalyticsService();
      await this.initializePerformanceOptimizationService();
      await this.initializeDatabaseOptimizationService();
      await this.initializeCDNOptimizationService();
      await this.initializeAutoScalingService();
      await this.initializeOperationsMonitoring();
      await this.initializeDeploymentMonitoring();

      // 서비스 간 통합 설정
      await this.configureServiceIntegration();

      // 헬스 체크 시작
      this.startHealthChecking();

      // 초기화 완료
      this.isInitialized = true;
      await this.recordInitializationComplete();

      // console.log('✅ All performance monitoring services initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize performance monitoring services:', error);
      await this.handleInitializationFailure(error as Error);
      throw error;
    }
  }

  /**
   * Redis 연결 확인
   */
  private async verifyRedisConnection(): Promise<void> {
    try {
      await this.redis.ping();
      // console.log('✅ Redis connection verified');
    } catch (error) {
      console.error('❌ Redis connection failed:', error);
      throw new Error('Redis connection required for performance monitoring');
    }
  }

  /**
   * 분석 서비스 초기화
   */
  private async initializeAnalyticsService(): Promise<void> {
    try {
      // console.log('🔄 Initializing Analytics Service...');
      const analyticsService = new AnalyticsService();
      this.services.set('analytics', analyticsService as unknown as MonitoringService);
      this.serviceStatus.set('analytics', { status: 'running', lastCheck: new Date() });
      // console.log('✅ Analytics Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Analytics Service:', error);
      this.serviceStatus.set('analytics', { status: 'failed', lastCheck: new Date(), error: error as Error });
      throw error;
    }
  }

  /**
   * 성능 최적화 서비스 초기화
   */
  private async initializePerformanceOptimizationService(): Promise<void> {
    try {
      // console.log('🔄 Initializing Performance Optimization Service...');
      const performanceService = new PerformanceOptimizationService();
      this.services.set('performance', performanceService as unknown as MonitoringService);
      this.serviceStatus.set('performance', { status: 'running', lastCheck: new Date() });
      // console.log('✅ Performance Optimization Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Performance Optimization Service:', error);
      this.serviceStatus.set('performance', { status: 'failed', lastCheck: new Date(), error: error as Error });
      throw error;
    }
  }

  /**
   * 데이터베이스 최적화 서비스 초기화
   */
  private async initializeDatabaseOptimizationService(): Promise<void> {
    try {
      // console.log('🔄 Initializing Database Optimization Service...');
      const databaseService = new DatabaseOptimizationService();
      this.services.set('database', databaseService as unknown as MonitoringService);
      this.serviceStatus.set('database', { status: 'running', lastCheck: new Date() });
      // console.log('✅ Database Optimization Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Database Optimization Service:', error);
      this.serviceStatus.set('database', { status: 'failed', lastCheck: new Date(), error: error as Error });
      throw error;
    }
  }

  /**
   * CDN 최적화 서비스 초기화
   */
  private async initializeCDNOptimizationService(): Promise<void> {
    try {
      // console.log('🔄 Initializing CDN Optimization Service...');
      const cdnService = new CDNOptimizationService();
      this.services.set('cdn', cdnService as unknown as MonitoringService);
      this.serviceStatus.set('cdn', { status: 'running', lastCheck: new Date() });
      // console.log('✅ CDN Optimization Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize CDN Optimization Service:', error);
      this.serviceStatus.set('cdn', { status: 'failed', lastCheck: new Date(), error: error as Error });
      throw error;
    }
  }

  /**
   * 자동 스케일링 서비스 초기화
   */
  private async initializeAutoScalingService(): Promise<void> {
    try {
      // console.log('🔄 Initializing Auto Scaling Service...');
      const scalingService = new AutoScalingService();
      this.services.set('scaling', scalingService as unknown as MonitoringService);
      this.serviceStatus.set('scaling', { status: 'running', lastCheck: new Date() });
      // console.log('✅ Auto Scaling Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Auto Scaling Service:', error);
      this.serviceStatus.set('scaling', { status: 'failed', lastCheck: new Date(), error: error as Error });
      throw error;
    }
  }

  /**
   * 운영 모니터링 서비스 초기화
   */
  private async initializeOperationsMonitoring(): Promise<void> {
    try {
      // console.log('🔄 Initializing Operations Monitoring Service...');
      const operationsService = new OperationsMonitoringService();
      this.services.set('operations', operationsService as unknown as MonitoringService);
      this.serviceStatus.set('operations', { status: 'running', lastCheck: new Date() });
      // console.log('✅ Operations Monitoring Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Operations Monitoring Service:', error);
      this.serviceStatus.set('operations', { status: 'failed', lastCheck: new Date(), error: error as Error });
      throw error;
    }
  }

  /**
   * 배포 모니터링 서비스 초기화
   */
  private async initializeDeploymentMonitoring(): Promise<void> {
    try {
      // console.log('🔄 Initializing Deployment Monitoring Service...');
      const deploymentService = new DeploymentMonitoringService();
      this.services.set('deployment', deploymentService as unknown as MonitoringService);
      this.serviceStatus.set('deployment', { status: 'running', lastCheck: new Date() });
      // console.log('✅ Deployment Monitoring Service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Deployment Monitoring Service:', error);
      this.serviceStatus.set('deployment', { status: 'failed', lastCheck: new Date(), error: error as Error });
      throw error;
    }
  }

  /**
   * 서비스 간 통합 설정
   */
  private async configureServiceIntegration(): Promise<void> {
    try {
      // console.log('🔄 Configuring service integration...');

      // 서비스 간 이벤트 통합 설정
      const integrationConfig = {
        eventBus: 'redis',
        services: Array.from(this.services.keys()),
        crossServiceEvents: [
          'performance_alert',
          'scaling_event',
          'optimization_complete',
          'database_issue',
          'cdn_cache_miss',
          'deployment_status'
        ],
        integrationRules: {
          performance_alert: ['scaling', 'operations'],
          scaling_event: ['performance', 'operations', 'analytics'],
          database_issue: ['performance', 'operations'],
          cdn_cache_miss: ['performance', 'cdn'],
          deployment_status: ['operations', 'performance']
        }
      };

      // 통합 설정 저장
      await this.redis.hset(
        'service_integration',
        'config',
        JSON.stringify(integrationConfig)
      );

      // 크로스 서비스 메시징 설정
      await this.setupCrossServiceMessaging();

      // console.log('✅ Service integration configured');

    } catch (error) {
      console.error('❌ Failed to configure service integration:', error);
      throw error;
    }
  }

  /**
   * 크로스 서비스 메시징 설정
   */
  private async setupCrossServiceMessaging(): Promise<void> {
    // Redis pub/sub을 사용한 서비스 간 통신 설정
    const subscriber = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    });

    // 이벤트 채널 구독
    await subscriber.subscribe(
      'performance:alerts',
      'scaling:events',
      'database:issues',
      'cdn:events',
      'deployment:status'
    );

    // 메시지 처리
    subscriber.on('message', async (channel, message) => {
      try {
        await this.handleCrossServiceMessage(channel, JSON.parse(message));
      } catch (error) {
        console.error('Failed to handle cross-service message:', error);
      }
    });
  }

  /**
   * 크로스 서비스 메시지 처리
   */
  private async handleCrossServiceMessage(channel: string, message: CrossServiceMessage): Promise<void> {
    // console.log(`📨 Received cross-service message on ${channel}:`, message);

    // 채널별 메시지 처리
    switch (channel) {
      case 'performance:alerts':
        await this.handlePerformanceAlert(message as PerformanceAlert);
        break;
      case 'scaling:events':
        await this.handleScalingEvent(message as ScalingEvent);
        break;
      case 'database:issues':
        await this.handleDatabaseIssue(message as unknown as DatabaseIssue);
        break;
      case 'cdn:events':
        await this.handleCDNEvent(message as CDNEvent);
        break;
      case 'deployment:status':
        await this.handleDeploymentStatus(message as DeploymentStatus);
        break;
    }
  }

  /**
   * 성능 알림 처리
   */
  private async handlePerformanceAlert(alert: PerformanceAlert): Promise<void> {
    // 스케일링 서비스에 알림 전달
    if (alert.type === 'high_cpu' || alert.type === 'high_memory') {
      await this.redis.publish('scaling:trigger', JSON.stringify({
        trigger: 'performance_alert',
        data: alert
      }));
    }

    // 운영 모니터링에 알림 전달
    await this.redis.publish('operations:alert', JSON.stringify(alert));
  }

  /**
   * 스케일링 이벤트 처리
   */
  private async handleScalingEvent(event: ScalingEvent): Promise<void> {
    // 성능 모니터링에 스케일링 완료 알림
    if (event.type === 'scale_complete') {
      await this.redis.publish('performance:scaling_complete', JSON.stringify(event));
    }

    // 분석 서비스에 이벤트 기록
    await this.redis.publish('analytics:event', JSON.stringify({
      type: 'scaling',
      data: event
    }));
  }

  /**
   * 데이터베이스 이슈 처리
   */
  private async handleDatabaseIssue(issue: DatabaseIssue): Promise<void> {
    // 심각한 이슈인 경우 즉시 알림
    if (issue.severity === 'critical') {
      await this.redis.publish('operations:critical_alert', JSON.stringify(issue));
    }

    // 성능 최적화 서비스에 알림
    await this.redis.publish('performance:db_issue', JSON.stringify(issue));
  }

  /**
   * CDN 이벤트 처리
   */
  private async handleCDNEvent(event: CDNEvent): Promise<void> {
    // 캐시 미스율이 높은 경우 성능 최적화 트리거
    if (event.type === 'low_hit_rate') {
      await this.redis.publish('performance:cdn_optimization', JSON.stringify(event));
    }
  }

  /**
   * 배포 상태 처리
   */
  private async handleDeploymentStatus(status: DeploymentStatus): Promise<void> {
    // 배포 완료 시 성능 모니터링 강화
    if (status.type === 'deployment_complete') {
      await this.redis.publish('performance:monitor_enhanced', JSON.stringify(status));
    }

    // 운영 모니터링에 상태 업데이트
    await this.redis.publish('operations:deployment_update', JSON.stringify(status));
  }

  /**
   * 헬스 체크 시작
   */
  private startHealthChecking(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 60000); // 1분마다 헬스 체크

    // console.log('✅ Health checking started');
  }

  /**
   * 서비스 헬스 체크 수행
   */
  private async performHealthCheck(): Promise<void> {
    const healthStatus: HealthCheckResult = {
      timestamp: new Date().toISOString(),
      overallStatus: 'healthy',
      services: {},
      issues: []
    };

    for (const [serviceName, service] of this.services) {
      try {
        // 각 서비스의 헬스 체크 메서드 호출
        let serviceHealth;
        if (typeof service.healthCheck === 'function') {
          serviceHealth = await service.healthCheck();
        } else {
          serviceHealth = { status: 'unknown', message: 'Health check not implemented' };
        }

        healthStatus.services[serviceName] = {
          status: serviceHealth.status,
          message: serviceHealth.message,
          lastCheck: new Date().toISOString()
        };

        // 상태 업데이트
        this.serviceStatus.set(serviceName, {
          status: serviceHealth.status === 'healthy' ? 'running' : 'warning',
          lastCheck: new Date()
        });

        // 문제가 있는 서비스 기록
        if (serviceHealth.status !== 'healthy') {
          healthStatus.issues.push({
            service: serviceName,
            issue: serviceHealth.message
          });
          
          if (healthStatus.overallStatus === 'healthy') {
            healthStatus.overallStatus = 'warning';
          }
        }

      } catch (error) {
        console.error(`Health check failed for ${serviceName}:`, error);
        
        healthStatus.services[serviceName] = {
          status: 'error',
          message: (error as Error).message,
          lastCheck: new Date().toISOString()
        };

        healthStatus.issues.push({
          service: serviceName,
          issue: `Health check failed: ${(error as Error).message}`
        });

        healthStatus.overallStatus = 'error';
        
        this.serviceStatus.set(serviceName, {
          status: 'failed',
          lastCheck: new Date(),
          error: error as Error
        });
      }
    }

    // 헬스 체크 결과 저장
    await this.redis.hset(
      'performance_health',
      'latest',
      JSON.stringify(healthStatus)
    );

    // 문제가 있는 경우 알림
    if (healthStatus.overallStatus !== 'healthy') {
      await this.sendHealthAlert(healthStatus);
    }
  }

  /**
   * 헬스 알림 전송
   */
  private async sendHealthAlert(healthStatus: HealthCheckResult): Promise<void> {
    const alert = {
      type: 'service_health_issue',
      severity: healthStatus.overallStatus === 'error' ? 'critical' : 'warning',
      message: `Performance monitoring services health check failed`,
      data: {
        overallStatus: healthStatus.overallStatus,
        failedServices: healthStatus.issues.map(i => i.service),
        issues: healthStatus.issues
      },
      timestamp: new Date().toISOString(),
      source: 'PerformanceMonitoringInitializer'
    };

    await this.redis.lpush('system_alerts', JSON.stringify(alert));
    await this.redis.publish('operations:system_alert', JSON.stringify(alert));
  }

  /**
   * 초기화 완료 기록
   */
  private async recordInitializationComplete(): Promise<void> {
    const initRecord = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services: Array.from(this.services.keys()),
      status: 'completed',
      configuration: {
        redis: {
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || '6379'
        },
        environment: process.env.NODE_ENV || 'development'
      }
    };

    await this.redis.hset(
      'performance_monitoring',
      'initialization',
      JSON.stringify(initRecord)
    );

    // console.log('📝 Initialization record saved');
  }

  /**
   * 초기화 실패 처리
   */
  private async handleInitializationFailure(error: Error): Promise<void> {
    const failureRecord = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack
      },
      services: Object.fromEntries(this.serviceStatus),
      status: 'failed'
    };

    try {
      await this.redis.hset(
        'performance_monitoring',
        'initialization_failure',
        JSON.stringify(failureRecord)
      );
    } catch (redisError) {
      console.error('Failed to record initialization failure:', redisError);
    }
  }

  /**
   * 서비스 상태 조회
   */
  getServiceStatus(): Map<string, ServiceStatus> {
    return new Map(this.serviceStatus);
  }

  /**
   * 특정 서비스 조회
   */
  getService(serviceName: string): MonitoringService | undefined {
    return this.services.get(serviceName);
  }

  /**
   * 초기화 상태 확인
   */
  isSystemInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 통합 대시보드 데이터 생성
   */
  async getIntegratedDashboard(): Promise<IntegratedDashboard> {
    const dashboard: IntegratedDashboard = {
      timestamp: new Date().toISOString(),
      systemStatus: this.isInitialized ? 'operational' : 'initializing',
      services: Object.fromEntries(this.serviceStatus),
      healthCheck: await this.getLatestHealthCheck(),
      metrics: await this.getAggregatedMetrics(),
      alerts: await this.getSystemAlerts(),
      recommendations: await this.getSystemRecommendations()
    };

    return dashboard;
  }

  /**
   * 최신 헬스 체크 결과 조회
   */
  private async getLatestHealthCheck(): Promise<HealthCheckResult | null> {
    try {
      const latest = await this.redis.hget('performance_health', 'latest');
      return latest ? JSON.parse(latest) : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * 집계된 메트릭 조회
   */
  private async getAggregatedMetrics(): Promise<AggregatedMetrics> {
    // 각 서비스의 핵심 메트릭 집계
    const metrics = {
      performance: {},
      scaling: {},
      database: {},
      cdn: {},
      system: {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      }
    };

    return metrics;
  }

  /**
   * 시스템 알림 조회
   */
  private async getSystemAlerts(): Promise<SystemAlert[]> {
    try {
      const alerts = await this.redis.lrange('system_alerts', 0, 9);
      return alerts.map(a => JSON.parse(a));
    } catch (error) {
      return [];
    }
  }

  /**
   * 시스템 권장사항 조회
   */
  private async getSystemRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];

    // 서비스 상태 기반 권장사항
    for (const [serviceName, status] of this.serviceStatus) {
      if (status.status === 'failed') {
        recommendations.push(`Restart ${serviceName} service`);
      } else if (status.status === 'warning') {
        recommendations.push(`Monitor ${serviceName} service closely`);
      }
    }

    return recommendations;
  }

  /**
   * 시스템 종료
   */
  async shutdown(): Promise<void> {
    try {
      // console.log('🔄 Shutting down performance monitoring services...');

      // 헬스 체크 중지
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // 모든 서비스 종료
      for (const [serviceName, service] of this.services) {
        try {
          if (typeof service.shutdown === 'function') {
            await service.shutdown();
            // console.log(`✅ ${serviceName} service shutdown completed`);
          }
        } catch (error) {
          console.error(`❌ Failed to shutdown ${serviceName} service:`, error);
        }
      }

      // Redis 연결 종료
      await this.redis.disconnect();

      // 종료 기록
      // console.log('✅ Performance monitoring system shutdown completed');
      this.isInitialized = false;

    } catch (error) {
      console.error('❌ Failed to shutdown performance monitoring system:', error);
      throw error;
    }
  }
}

// 타입 정의
interface ServiceStatus {
  status: 'running' | 'warning' | 'failed';
  lastCheck: Date;
  error?: Error;
}

interface MonitoringService {
  healthCheck?: () => Promise<{ status: string; message: string }>;
  shutdown?: () => Promise<void>;
  [key: string]: unknown;
}

interface CrossServiceMessage {
  type: string;
  data?: unknown;
  timestamp?: string;
  [key: string]: unknown;
}

interface PerformanceAlert {
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

interface ScalingEvent {
  type: string;
  action: string;
  timestamp: string;
  [key: string]: unknown;
}

interface DatabaseIssue {
  severity: string;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

interface CDNEvent {
  type: string;
  hitRate?: number;
  timestamp: string;
  [key: string]: unknown;
}

interface DeploymentStatus {
  type: string;
  status: string;
  timestamp: string;
  [key: string]: unknown;
}

interface AggregatedMetrics {
  performance: Record<string, unknown>;
  scaling: Record<string, unknown>;
  database: Record<string, unknown>;
  cdn: Record<string, unknown>;
  system: {
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
    uptime: number;
  };
}

interface SystemAlert {
  type: string;
  severity: string;
  message: string;
  data?: unknown;
  timestamp: string;
  source: string;
}

interface HealthCheckResult {
  timestamp: string;
  overallStatus: 'healthy' | 'warning' | 'error';
  services: {
    [key: string]: {
      status: string;
      message: string;
      lastCheck: string;
    };
  };
  issues: {
    service: string;
    issue: string;
  }[];
}

interface IntegratedDashboard {
  timestamp: string;
  systemStatus: 'operational' | 'initializing' | 'error';
  services: Record<string, ServiceStatus>;
  healthCheck: HealthCheckResult | null;
  metrics: AggregatedMetrics;
  alerts: SystemAlert[];
  recommendations: string[];
}

// 싱글톤 인스턴스
export const performanceMonitoringInitializer = new PerformanceMonitoringInitializer();