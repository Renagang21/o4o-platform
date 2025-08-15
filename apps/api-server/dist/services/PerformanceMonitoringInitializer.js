"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.performanceMonitoringInitializer = exports.PerformanceMonitoringInitializer = void 0;
const PerformanceOptimizationService_1 = require("./PerformanceOptimizationService");
const AutoScalingService_1 = require("./AutoScalingService");
const CDNOptimizationService_1 = require("./CDNOptimizationService");
const DatabaseOptimizationService_1 = require("./DatabaseOptimizationService");
const AnalyticsService_1 = require("./AnalyticsService");
const DeploymentMonitoringService_1 = require("./DeploymentMonitoringService");
const OperationsMonitoringService_1 = require("./OperationsMonitoringService");
const ioredis_1 = __importDefault(require("ioredis"));
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
class PerformanceMonitoringInitializer {
    constructor() {
        this.services = new Map();
        this.isInitialized = false;
        this.serviceStatus = new Map();
        this.redis = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0')
        });
    }
    /**
     * 모든 성능 모니터링 서비스 초기화
     */
    async initialize() {
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
        }
        catch (error) {
            console.error('❌ Failed to initialize performance monitoring services:', error);
            await this.handleInitializationFailure(error);
            throw error;
        }
    }
    /**
     * Redis 연결 확인
     */
    async verifyRedisConnection() {
        try {
            await this.redis.ping();
            // console.log('✅ Redis connection verified');
        }
        catch (error) {
            console.error('❌ Redis connection failed:', error);
            throw new Error('Redis connection required for performance monitoring');
        }
    }
    /**
     * 분석 서비스 초기화
     */
    async initializeAnalyticsService() {
        try {
            // console.log('🔄 Initializing Analytics Service...');
            const analyticsService = new AnalyticsService_1.AnalyticsService();
            this.services.set('analytics', analyticsService);
            this.serviceStatus.set('analytics', { status: 'running', lastCheck: new Date() });
            // console.log('✅ Analytics Service initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize Analytics Service:', error);
            this.serviceStatus.set('analytics', { status: 'failed', lastCheck: new Date(), error: error });
            throw error;
        }
    }
    /**
     * 성능 최적화 서비스 초기화
     */
    async initializePerformanceOptimizationService() {
        try {
            // console.log('🔄 Initializing Performance Optimization Service...');
            const performanceService = new PerformanceOptimizationService_1.PerformanceOptimizationService();
            this.services.set('performance', performanceService);
            this.serviceStatus.set('performance', { status: 'running', lastCheck: new Date() });
            // console.log('✅ Performance Optimization Service initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize Performance Optimization Service:', error);
            this.serviceStatus.set('performance', { status: 'failed', lastCheck: new Date(), error: error });
            throw error;
        }
    }
    /**
     * 데이터베이스 최적화 서비스 초기화
     */
    async initializeDatabaseOptimizationService() {
        try {
            // console.log('🔄 Initializing Database Optimization Service...');
            const databaseService = new DatabaseOptimizationService_1.DatabaseOptimizationService();
            this.services.set('database', databaseService);
            this.serviceStatus.set('database', { status: 'running', lastCheck: new Date() });
            // console.log('✅ Database Optimization Service initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize Database Optimization Service:', error);
            this.serviceStatus.set('database', { status: 'failed', lastCheck: new Date(), error: error });
            throw error;
        }
    }
    /**
     * CDN 최적화 서비스 초기화
     */
    async initializeCDNOptimizationService() {
        try {
            // console.log('🔄 Initializing CDN Optimization Service...');
            const cdnService = new CDNOptimizationService_1.CDNOptimizationService();
            this.services.set('cdn', cdnService);
            this.serviceStatus.set('cdn', { status: 'running', lastCheck: new Date() });
            // console.log('✅ CDN Optimization Service initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize CDN Optimization Service:', error);
            this.serviceStatus.set('cdn', { status: 'failed', lastCheck: new Date(), error: error });
            throw error;
        }
    }
    /**
     * 자동 스케일링 서비스 초기화
     */
    async initializeAutoScalingService() {
        try {
            // console.log('🔄 Initializing Auto Scaling Service...');
            const scalingService = new AutoScalingService_1.AutoScalingService();
            this.services.set('scaling', scalingService);
            this.serviceStatus.set('scaling', { status: 'running', lastCheck: new Date() });
            // console.log('✅ Auto Scaling Service initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize Auto Scaling Service:', error);
            this.serviceStatus.set('scaling', { status: 'failed', lastCheck: new Date(), error: error });
            throw error;
        }
    }
    /**
     * 운영 모니터링 서비스 초기화
     */
    async initializeOperationsMonitoring() {
        try {
            // console.log('🔄 Initializing Operations Monitoring Service...');
            const operationsService = new OperationsMonitoringService_1.OperationsMonitoringService();
            this.services.set('operations', operationsService);
            this.serviceStatus.set('operations', { status: 'running', lastCheck: new Date() });
            // console.log('✅ Operations Monitoring Service initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize Operations Monitoring Service:', error);
            this.serviceStatus.set('operations', { status: 'failed', lastCheck: new Date(), error: error });
            throw error;
        }
    }
    /**
     * 배포 모니터링 서비스 초기화
     */
    async initializeDeploymentMonitoring() {
        try {
            // console.log('🔄 Initializing Deployment Monitoring Service...');
            const deploymentService = new DeploymentMonitoringService_1.DeploymentMonitoringService();
            this.services.set('deployment', deploymentService);
            this.serviceStatus.set('deployment', { status: 'running', lastCheck: new Date() });
            // console.log('✅ Deployment Monitoring Service initialized');
        }
        catch (error) {
            console.error('❌ Failed to initialize Deployment Monitoring Service:', error);
            this.serviceStatus.set('deployment', { status: 'failed', lastCheck: new Date(), error: error });
            throw error;
        }
    }
    /**
     * 서비스 간 통합 설정
     */
    async configureServiceIntegration() {
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
            await this.redis.hset('service_integration', 'config', JSON.stringify(integrationConfig));
            // 크로스 서비스 메시징 설정
            await this.setupCrossServiceMessaging();
            // console.log('✅ Service integration configured');
        }
        catch (error) {
            console.error('❌ Failed to configure service integration:', error);
            throw error;
        }
    }
    /**
     * 크로스 서비스 메시징 설정
     */
    async setupCrossServiceMessaging() {
        // Redis pub/sub을 사용한 서비스 간 통신 설정
        const subscriber = new ioredis_1.default({
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            db: parseInt(process.env.REDIS_DB || '0')
        });
        // 이벤트 채널 구독
        await subscriber.subscribe('performance:alerts', 'scaling:events', 'database:issues', 'cdn:events', 'deployment:status');
        // 메시지 처리
        subscriber.on('message', async (channel, message) => {
            try {
                await this.handleCrossServiceMessage(channel, JSON.parse(message));
            }
            catch (error) {
                console.error('Failed to handle cross-service message:', error);
            }
        });
    }
    /**
     * 크로스 서비스 메시지 처리
     */
    async handleCrossServiceMessage(channel, message) {
        // console.log(`📨 Received cross-service message on ${channel}:`, message);
        // 채널별 메시지 처리
        switch (channel) {
            case 'performance:alerts':
                await this.handlePerformanceAlert(message);
                break;
            case 'scaling:events':
                await this.handleScalingEvent(message);
                break;
            case 'database:issues':
                await this.handleDatabaseIssue(message);
                break;
            case 'cdn:events':
                await this.handleCDNEvent(message);
                break;
            case 'deployment:status':
                await this.handleDeploymentStatus(message);
                break;
        }
    }
    /**
     * 성능 알림 처리
     */
    async handlePerformanceAlert(alert) {
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
    async handleScalingEvent(event) {
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
    async handleDatabaseIssue(issue) {
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
    async handleCDNEvent(event) {
        // 캐시 미스율이 높은 경우 성능 최적화 트리거
        if (event.type === 'low_hit_rate') {
            await this.redis.publish('performance:cdn_optimization', JSON.stringify(event));
        }
    }
    /**
     * 배포 상태 처리
     */
    async handleDeploymentStatus(status) {
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
    startHealthChecking() {
        this.healthCheckInterval = setInterval(async () => {
            await this.performHealthCheck();
        }, 60000); // 1분마다 헬스 체크
        // console.log('✅ Health checking started');
    }
    /**
     * 서비스 헬스 체크 수행
     */
    async performHealthCheck() {
        const healthStatus = {
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
                }
                else {
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
            }
            catch (error) {
                console.error(`Health check failed for ${serviceName}:`, error);
                healthStatus.services[serviceName] = {
                    status: 'error',
                    message: error.message,
                    lastCheck: new Date().toISOString()
                };
                healthStatus.issues.push({
                    service: serviceName,
                    issue: `Health check failed: ${error.message}`
                });
                healthStatus.overallStatus = 'error';
                this.serviceStatus.set(serviceName, {
                    status: 'failed',
                    lastCheck: new Date(),
                    error: error
                });
            }
        }
        // 헬스 체크 결과 저장
        await this.redis.hset('performance_health', 'latest', JSON.stringify(healthStatus));
        // 문제가 있는 경우 알림
        if (healthStatus.overallStatus !== 'healthy') {
            await this.sendHealthAlert(healthStatus);
        }
    }
    /**
     * 헬스 알림 전송
     */
    async sendHealthAlert(healthStatus) {
        const alert = {
            type: 'service_health_issue',
            severity: healthStatus.overallStatus === 'error' ? 'critical' : 'warning',
            message: `Performance monitoring services health check failed`,
            data: {
                overallStatus: healthStatus.overallStatus,
                failedServices: healthStatus.issues.map((i) => i.service),
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
    async recordInitializationComplete() {
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
        await this.redis.hset('performance_monitoring', 'initialization', JSON.stringify(initRecord));
        // console.log('📝 Initialization record saved');
    }
    /**
     * 초기화 실패 처리
     */
    async handleInitializationFailure(error) {
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
            await this.redis.hset('performance_monitoring', 'initialization_failure', JSON.stringify(failureRecord));
        }
        catch (redisError) {
            console.error('Failed to record initialization failure:', redisError);
        }
    }
    /**
     * 서비스 상태 조회
     */
    getServiceStatus() {
        return new Map(this.serviceStatus);
    }
    /**
     * 특정 서비스 조회
     */
    getService(serviceName) {
        return this.services.get(serviceName);
    }
    /**
     * 초기화 상태 확인
     */
    isSystemInitialized() {
        return this.isInitialized;
    }
    /**
     * 통합 대시보드 데이터 생성
     */
    async getIntegratedDashboard() {
        const dashboard = {
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
    async getLatestHealthCheck() {
        try {
            const latest = await this.redis.hget('performance_health', 'latest');
            return latest ? JSON.parse(latest) : null;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * 집계된 메트릭 조회
     */
    async getAggregatedMetrics() {
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
    async getSystemAlerts() {
        try {
            const alerts = await this.redis.lrange('system_alerts', 0, 9);
            return alerts.map((a) => JSON.parse(a));
        }
        catch (error) {
            return [];
        }
    }
    /**
     * 시스템 권장사항 조회
     */
    async getSystemRecommendations() {
        const recommendations = [];
        // 서비스 상태 기반 권장사항
        for (const [serviceName, status] of this.serviceStatus) {
            if (status.status === 'failed') {
                recommendations.push(`Restart ${serviceName} service`);
            }
            else if (status.status === 'warning') {
                recommendations.push(`Monitor ${serviceName} service closely`);
            }
        }
        return recommendations;
    }
    /**
     * 시스템 종료
     */
    async shutdown() {
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
                }
                catch (error) {
                    console.error(`❌ Failed to shutdown ${serviceName} service:`, error);
                }
            }
            // Redis 연결 종료
            await this.redis.disconnect();
            // 종료 기록
            // console.log('✅ Performance monitoring system shutdown completed');
            this.isInitialized = false;
        }
        catch (error) {
            console.error('❌ Failed to shutdown performance monitoring system:', error);
            throw error;
        }
    }
}
exports.PerformanceMonitoringInitializer = PerformanceMonitoringInitializer;
// 싱글톤 인스턴스
exports.performanceMonitoringInitializer = new PerformanceMonitoringInitializer();
//# sourceMappingURL=PerformanceMonitoringInitializer.js.map