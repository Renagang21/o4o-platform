import { performance } from 'perf_hooks';
import Redis from 'ioredis';
import { AppDataSource } from '../database/connection';
import { AnalyticsService } from './AnalyticsService';
import { PerformanceOptimizationService } from './PerformanceOptimizationService';
import { exec } from 'child_process';
import { promisify } from 'util';
import { TypeOrmDriver } from '../types/database';

const execAsync = promisify(exec);

/**
 * 자동 스케일링 서비스
 * 
 * 핵심 기능:
 * - 실시간 부하 모니터링
 * - 자동 수평 확장/축소
 * - 로드 밸런싱 관리
 * - 트래픽 분산
 * - 리소스 할당 최적화
 */
export class AutoScalingService {
  private redis: Redis;
  private analyticsService: AnalyticsService;
  private performanceService: PerformanceOptimizationService;
  private scalingRules: Map<string, ScalingRule> = new Map();
  private currentInstances: Map<string, ServiceInstance> = new Map();
  private isScalingEnabled: boolean = true;
  private minInstances: number = 1;
  private maxInstances: number = 10;
  private cooldownPeriod: number = 300000; // 5분
  private lastScalingAction: Date = new Date();

  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      db: parseInt(process.env.REDIS_DB || '0')
    });

    this.analyticsService = new AnalyticsService();
    this.performanceService = new PerformanceOptimizationService();
    
    this.initializeScalingRules();
    this.startScalingMonitoring();
  }

  /**
   * 스케일링 규칙 초기화
   */
  private initializeScalingRules(): void {
    // CPU 기반 스케일링
    this.scalingRules.set('cpu_usage', {
      metric: 'cpu_usage',
      scaleUpThreshold: 70,
      scaleDownThreshold: 30,
      evaluationPeriod: 300000, // 5분
      scaleUpCooldown: 600000, // 10분
      scaleDownCooldown: 900000, // 15분
      scaleUpStep: 1,
      scaleDownStep: 1,
      priority: 1
    });

    // 메모리 기반 스케일링
    this.scalingRules.set('memory_usage', {
      metric: 'memory_usage',
      scaleUpThreshold: 80,
      scaleDownThreshold: 40,
      evaluationPeriod: 300000,
      scaleUpCooldown: 600000,
      scaleDownCooldown: 900000,
      scaleUpStep: 1,
      scaleDownStep: 1,
      priority: 2
    });

    // 요청 처리량 기반 스케일링
    this.scalingRules.set('request_rate', {
      metric: 'request_rate',
      scaleUpThreshold: 1000, // 분당 1000 요청
      scaleDownThreshold: 200, // 분당 200 요청
      evaluationPeriod: 180000, // 3분
      scaleUpCooldown: 300000, // 5분
      scaleDownCooldown: 600000, // 10분
      scaleUpStep: 2,
      scaleDownStep: 1,
      priority: 3
    });

    // 응답 시간 기반 스케일링
    this.scalingRules.set('response_time', {
      metric: 'response_time',
      scaleUpThreshold: 2000, // 2초
      scaleDownThreshold: 500, // 0.5초
      evaluationPeriod: 180000,
      scaleUpCooldown: 300000,
      scaleDownCooldown: 600000,
      scaleUpStep: 1,
      scaleDownStep: 1,
      priority: 4
    });

    // 데이터베이스 연결 수 기반 스케일링
    this.scalingRules.set('db_connections', {
      metric: 'db_connections',
      scaleUpThreshold: 15,
      scaleDownThreshold: 5,
      evaluationPeriod: 300000,
      scaleUpCooldown: 600000,
      scaleDownCooldown: 900000,
      scaleUpStep: 1,
      scaleDownStep: 1,
      priority: 5
    });
  }

  /**
   * 스케일링 모니터링 시작
   */
  private startScalingMonitoring(): void {
    // 실시간 메트릭 수집
    setInterval(() => {
      this.collectScalingMetrics();
    }, 30000); // 30초마다

    // 스케일링 결정 평가
    setInterval(() => {
      this.evaluateScalingDecisions();
    }, 60000); // 1분마다

    // 인스턴스 상태 모니터링
    setInterval(() => {
      this.monitorInstanceHealth();
    }, 120000); // 2분마다

    // 로드 밸런싱 최적화
    setInterval(() => {
      this.optimizeLoadBalancing();
    }, 180000); // 3분마다
  }

  /**
   * 스케일링 메트릭 수집
   */
  private async collectScalingMetrics(): Promise<void> {
    try {
      const metrics = await this.gatherSystemMetrics();
      
      // 메트릭 저장
      await this.redis.hset(
        'scaling_metrics',
        'current',
        JSON.stringify({
          ...metrics,
          timestamp: new Date().toISOString()
        })
      );

      // 메트릭 히스토리 저장
      await this.redis.lpush(
        'scaling_history',
        JSON.stringify(metrics)
      );
      await this.redis.ltrim('scaling_history', 0, 999);

      // 트레이드 분석
      await this.analyzeMetricTrends(metrics);

    } catch (error) {
      console.error('Failed to collect scaling metrics:', error);
    }
  }

  /**
   * 시스템 메트릭 수집
   */
  private async gatherSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // 현재 활성 연결 수
    const activeConnections = AppDataSource.isInitialized ? 
      (AppDataSource.driver as TypeOrmDriver).pool?.totalCount || 0 : 0;

    // 최근 요청 수 (Redis에서 조회)
    const requestRate = await this.getRequestRate();
    
    // 평균 응답 시간
    const avgResponseTime = await this.getAverageResponseTime();

    // 현재 인스턴스 수
    const currentInstanceCount = this.currentInstances.size;

    return {
      timestamp: new Date().toISOString(),
      cpuUsage: this.calculateCpuUsagePercent(cpuUsage),
      memoryUsage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      memoryUsed: memoryUsage.heapUsed,
      memoryTotal: memoryUsage.heapTotal,
      activeConnections,
      requestRate,
      avgResponseTime,
      currentInstanceCount,
      maxInstanceCount: this.maxInstances,
      minInstanceCount: this.minInstances
    };
  }

  /**
   * CPU 사용률 계산
   */
  private calculateCpuUsagePercent(cpuUsage: NodeJS.CpuUsage): number {
    // 간단한 CPU 사용률 계산 (실제로는 더 정교한 계산 필요)
    const totalUsage = cpuUsage.user + cpuUsage.system;
    return Math.min(100, (totalUsage / 1000000) * 100); // 마이크로초를 퍼센트로 변환
  }

  /**
   * 요청 처리량 조회
   */
  private async getRequestRate(): Promise<number> {
    try {
      const requests = await this.redis.lrange('request_timestamps', 0, -1);
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      const recentRequests = requests.filter(timestamp => 
        parseInt(timestamp) > oneMinuteAgo
      );

      return recentRequests.length;
    } catch (error) {
      console.warn('Failed to get request rate:', error);
      return 0;
    }
  }

  /**
   * 평균 응답 시간 조회
   */
  private async getAverageResponseTime(): Promise<number> {
    try {
      const responseTimes = await this.redis.lrange('response_times', 0, 99);
      if (responseTimes.length === 0) return 0;

      const times = responseTimes.map(t => parseFloat(t));
      return times.reduce((sum, time) => sum + time, 0) / times.length;
    } catch (error) {
      console.warn('Failed to get average response time:', error);
      return 0;
    }
  }

  /**
   * 메트릭 트렌드 분석
   */
  private async analyzeMetricTrends(currentMetrics: SystemMetrics): Promise<void> {
    try {
      // 최근 5분간 메트릭 가져오기
      const history = await this.redis.lrange('scaling_history', 0, 9);
      const historicalMetrics = history.map(h => JSON.parse(h));

      // 트렌드 분석
      const trends = this.calculateTrends(historicalMetrics, currentMetrics);
      
      // 트렌드 정보 저장
      await this.redis.hset(
        'scaling_trends',
        'current',
        JSON.stringify(trends)
      );

      // 예측 기반 스케일링 결정
      await this.makePredictiveScalingDecision(trends);

    } catch (error) {
      console.error('Failed to analyze metric trends:', error);
    }
  }

  /**
   * 트렌드 계산
   */
  private calculateTrends(history: SystemMetrics[], current: SystemMetrics): MetricTrends {
    if (history.length < 2) {
      return {
        cpuTrend: 'stable',
        memoryTrend: 'stable',
        requestTrend: 'stable',
        responseTrend: 'stable',
        overallTrend: 'stable'
      };
    }

    const recent = history.slice(0, 3);
    const older = history.slice(3, 6);

    return {
      cpuTrend: this.calculateTrendDirection(
        older.map(m => m.cpuUsage),
        recent.map(m => m.cpuUsage)
      ),
      memoryTrend: this.calculateTrendDirection(
        older.map(m => m.memoryUsage),
        recent.map(m => m.memoryUsage)
      ),
      requestTrend: this.calculateTrendDirection(
        older.map(m => m.requestRate),
        recent.map(m => m.requestRate)
      ),
      responseTrend: this.calculateTrendDirection(
        older.map(m => m.avgResponseTime),
        recent.map(m => m.avgResponseTime)
      ),
      overallTrend: 'stable' // 전체 트렌드는 종합적으로 계산
    };
  }

  /**
   * 트렌드 방향 계산
   */
  private calculateTrendDirection(older: number[], recent: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (older.length === 0 || recent.length === 0) return 'stable';

    const olderAvg = older.reduce((sum, val) => sum + val, 0) / older.length;
    const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (change > 10) return 'increasing';
    if (change < -10) return 'decreasing';
    return 'stable';
  }

  /**
   * 예측 기반 스케일링 결정
   */
  private async makePredictiveScalingDecision(trends: MetricTrends): Promise<void> {
    const increasingTrends = Object.values(trends).filter(t => t === 'increasing').length;
    const decreasingTrends = Object.values(trends).filter(t => t === 'decreasing').length;

    if (increasingTrends >= 2) {
      console.log('📈 Increasing trend detected - preparing for scale up');
      await this.prepareForScaleUp();
    } else if (decreasingTrends >= 3) {
      console.log('📉 Decreasing trend detected - preparing for scale down');
      await this.prepareForScaleDown();
    }
  }

  /**
   * 스케일링 결정 평가
   */
  private async evaluateScalingDecisions(): Promise<void> {
    if (!this.isScalingEnabled) return;

    try {
      const currentMetrics = await this.getCurrentMetrics();
      const scalingActions: ScalingAction[] = [];

      // 각 스케일링 규칙 평가
      for (const [ruleId, rule] of this.scalingRules) {
        const action = await this.evaluateScalingRule(rule, currentMetrics);
        if (action) {
          scalingActions.push(action);
        }
      }

      // 스케일링 액션 우선순위 정렬
      scalingActions.sort((a, b) => a.priority - b.priority);

      // 최우선 액션 실행
      if (scalingActions.length > 0) {
        await this.executeScalingAction(scalingActions[0]);
      }

    } catch (error) {
      console.error('Failed to evaluate scaling decisions:', error);
    }
  }

  /**
   * 현재 메트릭 조회
   */
  private async getCurrentMetrics(): Promise<SystemMetrics> {
    try {
      const cached = await this.redis.hget('scaling_metrics', 'current');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to get cached metrics:', error);
    }

    return await this.gatherSystemMetrics();
  }

  /**
   * 스케일링 규칙 평가
   */
  private async evaluateScalingRule(
    rule: ScalingRule, 
    metrics: SystemMetrics
  ): Promise<ScalingAction | null> {
    const metricValue = this.getMetricValue(metrics, rule.metric);
    const now = Date.now();

    // 스케일 업 조건 확인
    if (metricValue > rule.scaleUpThreshold) {
      if (now - this.lastScalingAction.getTime() < rule.scaleUpCooldown) {
        return null; // 쿨다운 중
      }

      if (this.currentInstances.size >= this.maxInstances) {
        return null; // 최대 인스턴스 수 도달
      }

      return {
        type: 'scale_up',
        rule: rule.metric,
        priority: rule.priority,
        step: rule.scaleUpStep,
        reason: `${rule.metric} (${metricValue}) > ${rule.scaleUpThreshold}`,
        timestamp: new Date().toISOString()
      };
    }

    // 스케일 다운 조건 확인
    if (metricValue < rule.scaleDownThreshold) {
      if (now - this.lastScalingAction.getTime() < rule.scaleDownCooldown) {
        return null; // 쿨다운 중
      }

      if (this.currentInstances.size <= this.minInstances) {
        return null; // 최소 인스턴스 수 도달
      }

      return {
        type: 'scale_down',
        rule: rule.metric,
        priority: rule.priority,
        step: rule.scaleDownStep,
        reason: `${rule.metric} (${metricValue}) < ${rule.scaleDownThreshold}`,
        timestamp: new Date().toISOString()
      };
    }

    return null;
  }

  /**
   * 메트릭 값 추출
   */
  private getMetricValue(metrics: SystemMetrics, metricName: string): number {
    switch (metricName) {
      case 'cpu_usage':
        return metrics.cpuUsage;
      case 'memory_usage':
        return metrics.memoryUsage;
      case 'request_rate':
        return metrics.requestRate;
      case 'response_time':
        return metrics.avgResponseTime;
      case 'db_connections':
        return metrics.activeConnections;
      default:
        return 0;
    }
  }

  /**
   * 스케일링 액션 실행
   */
  private async executeScalingAction(action: ScalingAction): Promise<void> {
    try {
      console.log(`🔄 Executing scaling action: ${action.type} - ${action.reason}`);

      if (action.type === 'scale_up') {
        await this.scaleUp(action.step);
      } else if (action.type === 'scale_down') {
        await this.scaleDown(action.step);
      }

      this.lastScalingAction = new Date();

      // 스케일링 이벤트 기록
      await this.recordScalingEvent(action);

      // 알림 전송
      await this.sendScalingNotification(action);

    } catch (error) {
      console.error('Failed to execute scaling action:', error);
      await this.recordScalingError(action, error as Error);
    }
  }

  /**
   * 스케일 업 실행
   */
  private async scaleUp(step: number): Promise<void> {
    const targetInstances = Math.min(
      this.currentInstances.size + step,
      this.maxInstances
    );

    for (let i = this.currentInstances.size; i < targetInstances; i++) {
      await this.createNewInstance();
    }

    console.log(`✅ Scaled up to ${targetInstances} instances`);
  }

  /**
   * 스케일 다운 실행
   */
  private async scaleDown(step: number): Promise<void> {
    const targetInstances = Math.max(
      this.currentInstances.size - step,
      this.minInstances
    );

    const instancesToRemove = this.currentInstances.size - targetInstances;

    // 가장 적게 사용되는 인스턴스부터 제거
    const sortedInstances = Array.from(this.currentInstances.values())
      .sort((a, b) => a.currentLoad - b.currentLoad);

    for (let i = 0; i < instancesToRemove; i++) {
      await this.removeInstance(sortedInstances[i].id);
    }

    console.log(`✅ Scaled down to ${targetInstances} instances`);
  }

  /**
   * 새 인스턴스 생성
   */
  private async createNewInstance(): Promise<void> {
    const instanceId = `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const instance: ServiceInstance = {
      id: instanceId,
      status: 'starting',
      createdAt: new Date(),
      currentLoad: 0,
      healthStatus: 'unknown',
      port: this.getAvailablePort(),
      processId: null
    };

    this.currentInstances.set(instanceId, instance);

    try {
      // 새 프로세스 시작 (실제로는 PM2 또는 Docker 사용)
      const processId = await this.startNewProcess(instance.port);
      instance.processId = processId;
      instance.status = 'running';
      instance.healthStatus = 'healthy';

      console.log(`✅ New instance created: ${instanceId} on port ${instance.port}`);

      // 로드 밸런서에 인스턴스 등록
      await this.registerInstanceToLoadBalancer(instance);

    } catch (error) {
      console.error(`Failed to create instance ${instanceId}:`, error);
      instance.status = 'failed';
      instance.healthStatus = 'unhealthy';
    }
  }

  /**
   * 인스턴스 제거
   */
  private async removeInstance(instanceId: string): Promise<void> {
    const instance = this.currentInstances.get(instanceId);
    if (!instance) return;

    try {
      // 로드 밸런서에서 인스턴스 제거
      await this.unregisterInstanceFromLoadBalancer(instance);

      // 그레이스풀 셧다운
      await this.gracefulShutdown(instance);

      // 인스턴스 목록에서 제거
      this.currentInstances.delete(instanceId);

      console.log(`✅ Instance removed: ${instanceId}`);

    } catch (error) {
      console.error(`Failed to remove instance ${instanceId}:`, error);
    }
  }

  /**
   * 새 프로세스 시작
   */
  private async startNewProcess(port: number): Promise<number> {
    // 실제로는 PM2나 Docker를 사용하여 새 인스턴스 시작
    // 여기서는 시뮬레이션
    const command = `NODE_ENV=production PORT=${port} node dist/main.js`;
    
    try {
      const { stdout } = await execAsync(command);
      // 실제 프로세스 ID 반환 (시뮬레이션)
      return Math.floor(Math.random() * 10000);
    } catch (error) {
      throw new Error(`Failed to start process on port ${port}: ${error}`);
    }
  }

  /**
   * 사용 가능한 포트 찾기
   */
  private getAvailablePort(): number {
    const usedPorts = Array.from(this.currentInstances.values()).map(i => i.port);
    let port = 4001;
    
    while (usedPorts.includes(port)) {
      port++;
    }
    
    return port;
  }

  /**
   * 로드 밸런서에 인스턴스 등록
   */
  private async registerInstanceToLoadBalancer(instance: ServiceInstance): Promise<void> {
    // 실제로는 nginx, HAProxy, 또는 클라우드 로드 밸런서 사용
    const lbConfig = {
      instanceId: instance.id,
      host: 'localhost',
      port: instance.port,
      weight: 1,
      status: 'active'
    };

    await this.redis.hset(
      'load_balancer_instances',
      instance.id,
      JSON.stringify(lbConfig)
    );

    console.log(`📊 Instance registered to load balancer: ${instance.id}`);
  }

  /**
   * 로드 밸런서에서 인스턴스 제거
   */
  private async unregisterInstanceFromLoadBalancer(instance: ServiceInstance): Promise<void> {
    await this.redis.hdel('load_balancer_instances', instance.id);
    console.log(`📊 Instance unregistered from load balancer: ${instance.id}`);
  }

  /**
   * 그레이스풀 셧다운
   */
  private async gracefulShutdown(instance: ServiceInstance): Promise<void> {
    // 실제로는 SIGTERM 신호를 보내고 응답 대기
    console.log(`🔄 Gracefully shutting down instance: ${instance.id}`);
    
    // 현재 연결 완료 대기 (시뮬레이션)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (instance.processId) {
      try {
        process.kill(instance.processId, 'SIGTERM');
      } catch (error) {
        console.warn(`Failed to kill process ${instance.processId}:`, error);
      }
    }
  }

  /**
   * 스케일 업 준비
   */
  private async prepareForScaleUp(): Promise<void> {
    // 리소스 예약, 이미지 pre-pull 등
    console.log('📋 Preparing for scale up...');
    
    // 예: 다음 인스턴스를 위한 포트 예약
    const nextPort = this.getAvailablePort();
    await this.redis.setex(`reserved_port_${nextPort}`, 300, '1');
  }

  /**
   * 스케일 다운 준비
   */
  private async prepareForScaleDown(): Promise<void> {
    // 연결 드레이닝, 세션 이전 등
    console.log('📋 Preparing for scale down...');
    
    // 예: 제거할 인스턴스의 새 연결 차단
    const instanceToRemove = this.findInstanceToRemove();
    if (instanceToRemove) {
      await this.redis.setex(
        `draining_${instanceToRemove.id}`,
        300,
        '1'
      );
    }
  }

  /**
   * 제거할 인스턴스 찾기
   */
  private findInstanceToRemove(): ServiceInstance | null {
    const instances = Array.from(this.currentInstances.values());
    if (instances.length <= this.minInstances) return null;

    // 가장 적은 부하의 인스턴스 선택
    return instances.reduce((min, instance) => 
      instance.currentLoad < min.currentLoad ? instance : min
    );
  }

  /**
   * 인스턴스 상태 모니터링
   */
  private async monitorInstanceHealth(): Promise<void> {
    for (const instance of this.currentInstances.values()) {
      try {
        const health = await this.checkInstanceHealth(instance);
        instance.healthStatus = health.status;
        instance.currentLoad = health.load;

        if (health.status === 'unhealthy') {
          await this.handleUnhealthyInstance(instance);
        }
      } catch (error) {
        console.error(`Failed to check health for instance ${instance.id}:`, error);
        instance.healthStatus = 'unknown';
      }
    }
  }

  /**
   * 인스턴스 상태 확인
   */
  private async checkInstanceHealth(instance: ServiceInstance): Promise<HealthCheck> {
    // 실제로는 HTTP health check 또는 TCP 연결 확인
    try {
      // 시뮬레이션: 랜덤 상태 및 부하
      const isHealthy = Math.random() > 0.1; // 90% 확률로 healthy
      const load = Math.random() * 100; // 0-100% 부하

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        load,
        responseTime: Math.random() * 1000 + 100, // 100-1100ms
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        load: 0,
        responseTime: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 비정상 인스턴스 처리
   */
  private async handleUnhealthyInstance(instance: ServiceInstance): Promise<void> {
    console.warn(`⚠️ Unhealthy instance detected: ${instance.id}`);

    // 3번 연속 실패 시 인스턴스 교체
    const failureCount = await this.getInstanceFailureCount(instance.id);
    
    if (failureCount >= 3) {
      console.log(`🔄 Replacing unhealthy instance: ${instance.id}`);
      
      // 새 인스턴스 생성
      await this.createNewInstance();
      
      // 기존 인스턴스 제거
      await this.removeInstance(instance.id);
      
      // 실패 카운트 초기화
      await this.redis.del(`failure_count_${instance.id}`);
    } else {
      // 실패 카운트 증가
      await this.redis.incr(`failure_count_${instance.id}`);
      await this.redis.expire(`failure_count_${instance.id}`, 3600); // 1시간 TTL
    }
  }

  /**
   * 인스턴스 실패 횟수 조회
   */
  private async getInstanceFailureCount(instanceId: string): Promise<number> {
    try {
      const count = await this.redis.get(`failure_count_${instanceId}`);
      return count ? parseInt(count) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 로드 밸런싱 최적화
   */
  private async optimizeLoadBalancing(): Promise<void> {
    try {
      const instances = Array.from(this.currentInstances.values());
      const totalLoad = instances.reduce((sum, instance) => sum + instance.currentLoad, 0);
      const avgLoad = totalLoad / instances.length;

      // 부하 불균형 감지
      const unbalancedInstances = instances.filter(instance => 
        Math.abs(instance.currentLoad - avgLoad) > 20
      );

      if (unbalancedInstances.length > 0) {
        console.log('⚖️ Load imbalance detected, rebalancing...');
        await this.rebalanceLoad(instances);
      }

      // 로드 밸런서 가중치 업데이트
      await this.updateLoadBalancerWeights(instances);

    } catch (error) {
      console.error('Failed to optimize load balancing:', error);
    }
  }

  /**
   * 부하 재분산
   */
  private async rebalanceLoad(instances: ServiceInstance[]): Promise<void> {
    // 가중치 기반 라운드 로빈 설정
    for (const instance of instances) {
      const weight = this.calculateOptimalWeight(instance);
      await this.updateInstanceWeight(instance.id, weight);
    }
  }

  /**
   * 최적 가중치 계산
   */
  private calculateOptimalWeight(instance: ServiceInstance): number {
    // 부하가 낮을수록 높은 가중치
    const loadFactor = Math.max(0.1, (100 - instance.currentLoad) / 100);
    return Math.floor(loadFactor * 10);
  }

  /**
   * 인스턴스 가중치 업데이트
   */
  private async updateInstanceWeight(instanceId: string, weight: number): Promise<void> {
    const configStr = await this.redis.hget('load_balancer_instances', instanceId);
    if (configStr) {
      const config = JSON.parse(configStr);
      config.weight = weight;
      await this.redis.hset('load_balancer_instances', instanceId, JSON.stringify(config));
    }
  }

  /**
   * 로드 밸런서 가중치 업데이트
   */
  private async updateLoadBalancerWeights(instances: ServiceInstance[]): Promise<void> {
    const weights = instances.map(instance => ({
      instanceId: instance.id,
      weight: this.calculateOptimalWeight(instance)
    }));

    await this.redis.hset(
      'load_balancer_config',
      'weights',
      JSON.stringify(weights)
    );
  }

  /**
   * 스케일링 이벤트 기록
   */
  private async recordScalingEvent(action: ScalingAction): Promise<void> {
    const event = {
      ...action,
      instanceCount: this.currentInstances.size,
      timestamp: new Date().toISOString()
    };

    await this.redis.lpush('scaling_events', JSON.stringify(event));
    await this.redis.ltrim('scaling_events', 0, 999);

    // 분석 서비스에 이벤트 전송 (이벤트 기록)
    // await this.analyticsService.recordScalingEvent(event);
  }

  /**
   * 스케일링 에러 기록
   */
  private async recordScalingError(action: ScalingAction, error: Error): Promise<void> {
    const errorEvent = {
      ...action,
      error: {
        message: error.message,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    };

    await this.redis.lpush('scaling_errors', JSON.stringify(errorEvent));
    await this.redis.ltrim('scaling_errors', 0, 99);
  }

  /**
   * 스케일링 알림 전송
   */
  private async sendScalingNotification(action: ScalingAction): Promise<void> {
    // 웹훅, 이메일, 슬랙 등으로 알림 전송
    const notification = {
      type: 'scaling_event',
      action: action.type,
      reason: action.reason,
      instanceCount: this.currentInstances.size,
      timestamp: new Date().toISOString()
    };

    // 알림 큐에 추가
    await this.redis.lpush('notifications', JSON.stringify(notification));
  }

  /**
   * 스케일링 대시보드 데이터 생성
   */
  async getScalingDashboard(): Promise<ScalingDashboard> {
    const currentMetrics = await this.getCurrentMetrics();
    const events = await this.getRecentScalingEvents();
    const instances = Array.from(this.currentInstances.values());

    return {
      currentMetrics,
      instances: instances.map(i => ({
        id: i.id,
        status: i.status,
        healthStatus: i.healthStatus,
        currentLoad: i.currentLoad,
        port: i.port,
        processId: i.processId,
        createdAt: i.createdAt.toISOString()
      })),
      scalingRules: Array.from(this.scalingRules.entries()).reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {} as { [key: string]: ScalingRule }),
      recentEvents: events,
      configuration: {
        minInstances: this.minInstances,
        maxInstances: this.maxInstances,
        isEnabled: this.isScalingEnabled,
        cooldownPeriod: this.cooldownPeriod
      }
    };
  }

  /**
   * 최근 스케일링 이벤트 조회
   */
  private async getRecentScalingEvents(): Promise<ScalingEvent[]> {
    try {
      const events = await this.redis.lrange('scaling_events', 0, 19);
      return events.map(e => JSON.parse(e));
    } catch (error) {
      console.warn('Failed to get recent scaling events:', error);
      return [];
    }
  }

  /**
   * 스케일링 설정 업데이트
   */
  async updateScalingConfiguration(config: ScalingConfiguration): Promise<void> {
    if (config.minInstances !== undefined) {
      this.minInstances = config.minInstances;
    }
    if (config.maxInstances !== undefined) {
      this.maxInstances = config.maxInstances;
    }
    if (config.isEnabled !== undefined) {
      this.isScalingEnabled = config.isEnabled;
    }
    if (config.cooldownPeriod !== undefined) {
      this.cooldownPeriod = config.cooldownPeriod;
    }

    // 설정 저장
    await this.redis.hset('scaling_config', 'current', JSON.stringify(config));
  }

  /**
   * 서비스 종료
   */
  async shutdown(): Promise<void> {
    try {
      // 모든 인스턴스 그레이스풀 셧다운
      for (const instance of this.currentInstances.values()) {
        await this.gracefulShutdown(instance);
      }

      await this.redis.disconnect();
      console.log('✅ Auto-scaling service shutdown completed');
    } catch (error) {
      console.error('❌ Auto-scaling service shutdown failed:', error);
    }
  }
}

// 타입 정의
interface ScalingRule {
  metric: string;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  evaluationPeriod: number;
  scaleUpCooldown: number;
  scaleDownCooldown: number;
  scaleUpStep: number;
  scaleDownStep: number;
  priority: number;
}

interface ServiceInstance {
  id: string;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
  createdAt: Date;
  currentLoad: number;
  healthStatus: 'healthy' | 'unhealthy' | 'unknown';
  port: number;
  processId: number | null;
}

interface SystemMetrics {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  memoryUsed: number;
  memoryTotal: number;
  activeConnections: number;
  requestRate: number;
  avgResponseTime: number;
  currentInstanceCount: number;
  maxInstanceCount: number;
  minInstanceCount: number;
}

interface MetricTrends {
  cpuTrend: 'increasing' | 'decreasing' | 'stable';
  memoryTrend: 'increasing' | 'decreasing' | 'stable';
  requestTrend: 'increasing' | 'decreasing' | 'stable';
  responseTrend: 'increasing' | 'decreasing' | 'stable';
  overallTrend: 'increasing' | 'decreasing' | 'stable';
}

interface ScalingAction {
  type: 'scale_up' | 'scale_down';
  rule: string;
  priority: number;
  step: number;
  reason: string;
  timestamp: string;
}

interface ScalingEvent extends ScalingAction {
  instanceCount: number;
}

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  load: number;
  responseTime: number;
  timestamp: string;
}

interface DetailedScalingEvent {
  id: string;
  timestamp: Date;
  eventType: 'scale_up' | 'scale_down' | 'instance_started' | 'instance_stopped' | 'instance_failed';
  instanceCount: number;
  trigger: string;
  message: string;
}

interface ScalingDashboard {
  currentMetrics: SystemMetrics;
  instances: Array<{
    id: string;
    status: 'starting' | 'running' | 'stopping' | 'stopped' | 'failed';
    healthStatus: 'healthy' | 'unhealthy' | 'unknown';
    currentLoad: number;
    port: number;
    processId: number | null;
    createdAt: string;
  }>;
  scalingRules: { [key: string]: ScalingRule };
  recentEvents: ScalingEvent[];
  configuration: {
    minInstances: number;
    maxInstances: number;
    isEnabled: boolean;
    cooldownPeriod: number;
  };
}

interface ScalingConfiguration {
  minInstances?: number;
  maxInstances?: number;
  isEnabled?: boolean;
  cooldownPeriod?: number;
}

// 싱글톤 인스턴스
export const autoScalingService = new AutoScalingService();