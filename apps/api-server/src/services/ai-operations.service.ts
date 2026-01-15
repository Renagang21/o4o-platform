/**
 * AI Operations Service - Guardrails & Monitoring
 *
 * AI 운영 가드레일 서비스
 * - 사용량 경고
 * - 비정상 패턴 감지
 * - 에러/장애 지표
 * - Circuit Breaker
 *
 * @workorder WO-AI-OPERATIONS-GUARDRAILS-V1
 */

import {
  AiOperationalStatus,
  AlertLevel,
  AlertType,
  UsageThresholds,
  DailyUsageStatus,
  AnomalyType,
  AnomalyRecord,
  ErrorMetrics,
  DailyErrorMetrics,
  CircuitBreakerState,
  CircuitBreakerConfig,
  CircuitBreakerStatus,
  OperationsAlert,
  TodayOperationsSummary,
  OperationsDashboardData,
  DEFAULT_USAGE_THRESHOLDS,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
  DEFAULT_ANOMALY_THRESHOLDS,
} from '@o4o/ai-core';
import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

// ============================================================
// In-Memory Storage (운영 데이터)
// ============================================================

/** 요청 기록 (비정상 패턴 감지용) */
interface RequestRecord {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  pageUrl?: string;
}

/** 에러 기록 */
interface ErrorRecord {
  timestamp: Date;
  type: 'timeout' | 'api_error' | 'other_error' | 'success';
}

// In-memory storage
const requestRecords: RequestRecord[] = [];
const errorRecords: ErrorRecord[] = [];
const anomalyRecords: AnomalyRecord[] = [];
const operationsAlerts: OperationsAlert[] = [];

// Daily usage cache
let dailyUsageCache: {
  date: string;
  count: number;
} = {
  date: '',
  count: 0,
};

// Circuit breaker state
let circuitBreakerState: {
  state: CircuitBreakerState;
  stateChangedAt: Date;
  consecutiveTimeouts: number;
  halfOpenRequestCount: number;
} = {
  state: 'closed',
  stateChangedAt: new Date(),
  consecutiveTimeouts: 0,
  halfOpenRequestCount: 0,
};

// ============================================================
// AI Operations Service
// ============================================================

class AiOperationsService {
  private static instance: AiOperationsService;
  private thresholds: UsageThresholds = DEFAULT_USAGE_THRESHOLDS;
  private circuitBreakerConfig: CircuitBreakerConfig = DEFAULT_CIRCUIT_BREAKER_CONFIG;

  private constructor() {
    // Cleanup old records periodically (every hour)
    setInterval(() => this.cleanupOldRecords(), 60 * 60 * 1000);
  }

  static getInstance(): AiOperationsService {
    if (!AiOperationsService.instance) {
      AiOperationsService.instance = new AiOperationsService();
    }
    return AiOperationsService.instance;
  }

  // ============================================================
  // 1. 요청 기록 및 사용량 추적
  // ============================================================

  /**
   * AI 요청 기록
   * 모든 AI 질의 시 호출
   */
  recordRequest(options: {
    userId?: string;
    sessionId?: string;
    pageUrl?: string;
  }): void {
    const now = new Date();
    const today = this.getTodayString();

    // 요청 기록 추가
    requestRecords.push({
      timestamp: now,
      userId: options.userId,
      sessionId: options.sessionId,
      pageUrl: options.pageUrl,
    });

    // 일일 사용량 업데이트
    if (dailyUsageCache.date !== today) {
      dailyUsageCache = { date: today, count: 1 };
    } else {
      dailyUsageCache.count++;
    }

    // 비정상 패턴 검사
    this.checkAnomalies(options);

    // 사용량 임계치 검사
    this.checkUsageThreshold();
  }

  /**
   * 결과 기록 (성공/실패)
   */
  recordResult(type: 'success' | 'timeout' | 'api_error' | 'other_error'): void {
    errorRecords.push({
      timestamp: new Date(),
      type,
    });

    // Circuit breaker 업데이트
    this.updateCircuitBreaker(type);
  }

  // ============================================================
  // 2. 사용량 경고
  // ============================================================

  /**
   * 현재 일일 사용량 상태 조회
   */
  getDailyUsageStatus(dailyLimit: number): DailyUsageStatus {
    const today = this.getTodayString();
    const currentUsage = dailyUsageCache.date === today ? dailyUsageCache.count : 0;
    const usagePercent = dailyLimit > 0 ? (currentUsage / dailyLimit) * 100 : 0;

    let status: AiOperationalStatus = 'normal';
    let warningMessage: string | undefined;

    if (usagePercent >= this.thresholds.alertPercent) {
      status = 'unstable';
      warningMessage = `일일 사용량 한도(${dailyLimit}회)에 도달했습니다.`;
    } else if (usagePercent >= this.thresholds.warningPercent) {
      status = 'warning';
      warningMessage = `일일 사용량이 ${Math.round(usagePercent)}%에 도달했습니다.`;
    }

    return {
      date: today,
      currentUsage,
      dailyLimit,
      usagePercent: Math.round(usagePercent * 100) / 100,
      status,
      warningMessage,
    };
  }

  /**
   * 사용량 임계치 검사 및 경고 생성
   */
  private checkUsageThreshold(): void {
    // 기본 한도 (정책에서 가져와야 하지만 일단 하드코딩)
    const dailyLimit = 100; // TODO: 정책에서 조회
    const status = this.getDailyUsageStatus(dailyLimit);

    // 이미 경고한 적 있는지 확인
    const today = this.getTodayString();
    const existingAlert = operationsAlerts.find(
      a => a.type === 'usage_threshold' &&
           a.timestamp.toISOString().startsWith(today) &&
           !a.acknowledged
    );

    if (status.status === 'warning' && !existingAlert) {
      this.createAlert({
        type: 'usage_threshold',
        level: 'warning',
        title: '사용량 경고',
        message: status.warningMessage || '사용량이 임계치에 도달했습니다.',
      });
    } else if (status.status === 'unstable' && (!existingAlert || existingAlert.level !== 'critical')) {
      this.createAlert({
        type: 'usage_threshold',
        level: 'critical',
        title: '사용량 한도 도달',
        message: status.warningMessage || '일일 사용량 한도에 도달했습니다.',
      });
    }
  }

  // ============================================================
  // 3. 비정상 패턴 감지
  // ============================================================

  /**
   * 비정상 패턴 검사
   */
  private checkAnomalies(options: {
    userId?: string;
    sessionId?: string;
    pageUrl?: string;
  }): void {
    const now = new Date();

    // Rapid fire 검사 (전체)
    this.checkRapidFire(now);

    // Session flood 검사
    if (options.sessionId) {
      this.checkSessionFlood(options.sessionId, now);
    }

    // User burst 검사
    if (options.userId) {
      this.checkUserBurst(options.userId, now);
    }
  }

  /**
   * Rapid fire 검사 (짧은 시간 내 다수 요청)
   */
  private checkRapidFire(now: Date): void {
    const { windowMs, threshold } = DEFAULT_ANOMALY_THRESHOLDS.rapidFire;
    const windowStart = new Date(now.getTime() - windowMs);

    const recentCount = requestRecords.filter(
      r => r.timestamp >= windowStart
    ).length;

    if (recentCount >= threshold) {
      // 이미 감지된 건지 확인 (최근 1분 내)
      const recentAnomaly = anomalyRecords.find(
        a => a.type === 'rapid_fire' &&
             a.timestamp.getTime() > now.getTime() - 60000
      );

      if (!recentAnomaly) {
        this.recordAnomaly({
          type: 'rapid_fire',
          details: {
            requestCount: recentCount,
            timeWindowMs: windowMs,
            threshold,
          },
        });
      }
    }
  }

  /**
   * Session flood 검사 (단일 세션 과다)
   */
  private checkSessionFlood(sessionId: string, now: Date): void {
    const { windowMs, threshold } = DEFAULT_ANOMALY_THRESHOLDS.sessionFlood;
    const windowStart = new Date(now.getTime() - windowMs);

    const sessionCount = requestRecords.filter(
      r => r.sessionId === sessionId && r.timestamp >= windowStart
    ).length;

    if (sessionCount >= threshold) {
      const recentAnomaly = anomalyRecords.find(
        a => a.type === 'session_flood' &&
             a.sessionId === sessionId &&
             a.timestamp.getTime() > now.getTime() - 60000
      );

      if (!recentAnomaly) {
        this.recordAnomaly({
          type: 'session_flood',
          sessionId,
          details: {
            requestCount: sessionCount,
            timeWindowMs: windowMs,
            threshold,
          },
        });
      }
    }
  }

  /**
   * User burst 검사 (단일 사용자 급증)
   */
  private checkUserBurst(userId: string, now: Date): void {
    const { windowMs, threshold } = DEFAULT_ANOMALY_THRESHOLDS.userBurst;
    const windowStart = new Date(now.getTime() - windowMs);

    const userCount = requestRecords.filter(
      r => r.userId === userId && r.timestamp >= windowStart
    ).length;

    if (userCount >= threshold) {
      const recentAnomaly = anomalyRecords.find(
        a => a.type === 'user_burst' &&
             a.userId === userId &&
             a.timestamp.getTime() > now.getTime() - 300000 // 5분
      );

      if (!recentAnomaly) {
        this.recordAnomaly({
          type: 'user_burst',
          userId,
          details: {
            requestCount: userCount,
            timeWindowMs: windowMs,
            threshold,
          },
        });
      }
    }
  }

  /**
   * 비정상 패턴 기록
   */
  private recordAnomaly(data: Omit<AnomalyRecord, 'id' | 'timestamp' | 'resolved'>): void {
    const anomaly: AnomalyRecord = {
      id: uuidv4(),
      timestamp: new Date(),
      resolved: false,
      ...data,
    };

    anomalyRecords.push(anomaly);
    logger.warn(`AI anomaly detected: ${anomaly.type}`, anomaly.details);

    // 경고 생성
    this.createAlert({
      type: 'anomaly_detected',
      level: 'warning',
      title: this.getAnomalyTitle(anomaly.type),
      message: this.getAnomalyMessage(anomaly),
    });
  }

  private getAnomalyTitle(type: AnomalyType): string {
    const titles: Record<AnomalyType, string> = {
      rapid_fire: '빠른 연속 요청 감지',
      session_flood: '세션 과다 사용',
      user_burst: '사용자 급증',
      page_concentration: '페이지 집중',
    };
    return titles[type];
  }

  private getAnomalyMessage(anomaly: AnomalyRecord): string {
    const { requestCount, timeWindowMs } = anomaly.details;
    const seconds = Math.round(timeWindowMs / 1000);

    switch (anomaly.type) {
      case 'rapid_fire':
        return `${seconds}초 내에 ${requestCount}회 요청이 감지되었습니다.`;
      case 'session_flood':
        return `세션에서 ${seconds}초 내에 ${requestCount}회 요청이 감지되었습니다.`;
      case 'user_burst':
        return `사용자(${anomaly.userId})가 ${seconds}초 내에 ${requestCount}회 요청했습니다.`;
      case 'page_concentration':
        return `특정 페이지에서 ${requestCount}회 요청이 집중되었습니다.`;
      default:
        return '비정상 패턴이 감지되었습니다.';
    }
  }

  // ============================================================
  // 4. 에러/장애 지표
  // ============================================================

  /**
   * 현재 에러 지표 조회
   */
  getErrorMetrics(windowMs: number = 3600000): ErrorMetrics {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMs);

    const recentRecords = errorRecords.filter(r => r.timestamp >= windowStart);
    const totalCalls = recentRecords.length;

    const successCount = recentRecords.filter(r => r.type === 'success').length;
    const timeoutCount = recentRecords.filter(r => r.type === 'timeout').length;
    const apiErrorCount = recentRecords.filter(r => r.type === 'api_error').length;
    const otherErrorCount = recentRecords.filter(r => r.type === 'other_error').length;

    const errorRate = totalCalls > 0
      ? ((timeoutCount + apiErrorCount + otherErrorCount) / totalCalls) * 100
      : 0;
    const timeoutRate = totalCalls > 0 ? (timeoutCount / totalCalls) * 100 : 0;

    return {
      totalCalls,
      successCount,
      timeoutCount,
      apiErrorCount,
      otherErrorCount,
      errorRate: Math.round(errorRate * 100) / 100,
      timeoutRate: Math.round(timeoutRate * 100) / 100,
    };
  }

  /**
   * 일자별 에러 추이 (최근 N일)
   */
  getDailyErrorTrend(days: number = 7): DailyErrorMetrics[] {
    const trend: DailyErrorMetrics[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      const dayRecords = errorRecords.filter(
        r => r.timestamp >= date && r.timestamp < nextDate
      );

      const totalCalls = dayRecords.length;
      const successCount = dayRecords.filter(r => r.type === 'success').length;
      const timeoutCount = dayRecords.filter(r => r.type === 'timeout').length;
      const apiErrorCount = dayRecords.filter(r => r.type === 'api_error').length;
      const otherErrorCount = dayRecords.filter(r => r.type === 'other_error').length;

      const errorRate = totalCalls > 0
        ? ((timeoutCount + apiErrorCount + otherErrorCount) / totalCalls) * 100
        : 0;
      const timeoutRate = totalCalls > 0 ? (timeoutCount / totalCalls) * 100 : 0;

      trend.push({
        date: dateStr,
        totalCalls,
        successCount,
        timeoutCount,
        apiErrorCount,
        otherErrorCount,
        errorRate: Math.round(errorRate * 100) / 100,
        timeoutRate: Math.round(timeoutRate * 100) / 100,
      });
    }

    return trend;
  }

  // ============================================================
  // 5. Circuit Breaker
  // ============================================================

  /**
   * Circuit Breaker 상태 업데이트
   */
  private updateCircuitBreaker(resultType: 'success' | 'timeout' | 'api_error' | 'other_error'): void {
    const config = this.circuitBreakerConfig;

    if (resultType === 'success') {
      // 성공 시 연속 타임아웃 카운터 리셋
      circuitBreakerState.consecutiveTimeouts = 0;

      // Half-open 상태에서 성공 시 closed로 전환
      if (circuitBreakerState.state === 'half_open') {
        circuitBreakerState.halfOpenRequestCount++;
        if (circuitBreakerState.halfOpenRequestCount >= config.halfOpenAllowedRequests) {
          this.setCircuitBreakerState('closed');
          logger.info('Circuit breaker closed (recovered)');
        }
      }
    } else if (resultType === 'timeout') {
      circuitBreakerState.consecutiveTimeouts++;

      // 연속 타임아웃 임계치 초과 시 open
      if (circuitBreakerState.consecutiveTimeouts >= config.consecutiveTimeoutThreshold) {
        if (circuitBreakerState.state !== 'open') {
          this.setCircuitBreakerState('open');
          this.createAlert({
            type: 'timeout_spike',
            level: 'critical',
            title: 'AI 타임아웃 급증',
            message: `연속 ${circuitBreakerState.consecutiveTimeouts}회 타임아웃이 발생했습니다.`,
          });
        }
      }
    } else {
      // API 에러 또는 기타 에러
      const metrics = this.getErrorMetrics(60000); // 최근 1분
      if (metrics.errorRate >= config.errorThreshold) {
        if (circuitBreakerState.state !== 'open') {
          this.setCircuitBreakerState('open');
          this.createAlert({
            type: 'error_spike',
            level: 'critical',
            title: 'AI 에러율 급증',
            message: `최근 1분간 에러율이 ${metrics.errorRate}%에 도달했습니다.`,
          });
        }
      }
    }

    // Open 상태에서 시간 경과 시 half-open으로 전환
    if (circuitBreakerState.state === 'open') {
      const elapsed = Date.now() - circuitBreakerState.stateChangedAt.getTime();
      if (elapsed >= config.halfOpenWaitMs) {
        this.setCircuitBreakerState('half_open');
        logger.info('Circuit breaker half-open (attempting recovery)');
      }
    }
  }

  private setCircuitBreakerState(state: CircuitBreakerState): void {
    circuitBreakerState.state = state;
    circuitBreakerState.stateChangedAt = new Date();
    if (state === 'half_open') {
      circuitBreakerState.halfOpenRequestCount = 0;
    }
    if (state === 'closed') {
      circuitBreakerState.consecutiveTimeouts = 0;
    }
  }

  /**
   * Circuit Breaker 상태 조회
   */
  getCircuitBreakerStatus(): CircuitBreakerStatus {
    const metrics = this.getErrorMetrics(60000);

    let userMessage: string | undefined;
    if (circuitBreakerState.state === 'open') {
      userMessage = '현재 AI 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.';
    } else if (circuitBreakerState.state === 'half_open') {
      userMessage = 'AI 서비스가 복구 중입니다.';
    }

    return {
      state: circuitBreakerState.state,
      stateChangedAt: circuitBreakerState.stateChangedAt,
      recentErrorRate: metrics.errorRate,
      consecutiveTimeouts: circuitBreakerState.consecutiveTimeouts,
      halfOpenRequestCount: circuitBreakerState.halfOpenRequestCount,
      userMessage,
    };
  }

  /**
   * 요청 허용 여부 (Circuit Breaker 기반)
   */
  shouldAllowRequest(): { allowed: boolean; message?: string } {
    const status = this.getCircuitBreakerStatus();

    if (status.state === 'open') {
      return {
        allowed: false,
        message: status.userMessage,
      };
    }

    // half_open 상태에서는 제한적으로 허용
    if (status.state === 'half_open') {
      if (status.halfOpenRequestCount >= this.circuitBreakerConfig.halfOpenAllowedRequests) {
        return {
          allowed: false,
          message: status.userMessage,
        };
      }
    }

    return { allowed: true };
  }

  // ============================================================
  // 6. 경고 관리
  // ============================================================

  /**
   * 경고 생성
   */
  private createAlert(data: Omit<OperationsAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const alert: OperationsAlert = {
      id: uuidv4(),
      timestamp: new Date(),
      acknowledged: false,
      ...data,
    };

    operationsAlerts.push(alert);
    logger.warn(`AI Operations Alert: ${alert.title}`, { type: alert.type, level: alert.level });
  }

  /**
   * 최근 경고 조회
   */
  getRecentAlerts(limit: number = 20): OperationsAlert[] {
    return operationsAlerts
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 경고 확인 처리
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = operationsAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  // ============================================================
  // 7. 대시보드 데이터
  // ============================================================

  /**
   * 전체 운영 상태 조회 (대시보드용)
   */
  getOperationalStatus(): AiOperationalStatus {
    const cbStatus = this.getCircuitBreakerStatus();

    if (cbStatus.state === 'open') {
      return 'unstable';
    }

    const usageStatus = this.getDailyUsageStatus(100); // TODO: 정책에서 조회
    if (usageStatus.status === 'unstable') {
      return 'unstable';
    }

    const errorMetrics = this.getErrorMetrics(3600000);
    if (errorMetrics.errorRate >= 20) {
      return 'warning';
    }

    if (cbStatus.state === 'half_open' || usageStatus.status === 'warning') {
      return 'warning';
    }

    return 'normal';
  }

  /**
   * 오늘 요약 조회
   */
  getTodaySummary(): TodayOperationsSummary {
    const today = this.getTodayString();
    const dailyLimit = 100; // TODO: 정책에서 조회

    const usageStatus = this.getDailyUsageStatus(dailyLimit);
    const errorMetrics = this.getErrorMetrics(24 * 60 * 60 * 1000); // 24시간
    const circuitBreaker = this.getCircuitBreakerStatus();

    const activeAlerts = operationsAlerts.filter(
      a => !a.acknowledged && a.timestamp.toISOString().startsWith(today)
    );

    const todayAnomalies = anomalyRecords.filter(
      a => !a.resolved && a.timestamp.toISOString().startsWith(today)
    );

    return {
      date: today,
      overallStatus: this.getOperationalStatus(),
      usageStatus,
      errorMetrics,
      circuitBreaker,
      activeAlertCount: activeAlerts.length,
      anomalyCount: todayAnomalies.length,
    };
  }

  /**
   * 대시보드 전체 데이터 조회
   */
  getDashboardData(): OperationsDashboardData {
    return {
      today: this.getTodaySummary(),
      recentAlerts: this.getRecentAlerts(10),
      recentAnomalies: anomalyRecords.filter(a => !a.resolved).slice(-10),
      errorTrend: this.getDailyErrorTrend(7),
    };
  }

  // ============================================================
  // Utility
  // ============================================================

  private getTodayString(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * 오래된 레코드 정리
   */
  private cleanupOldRecords(): void {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7일 전

    // Request records: 최근 1일만 유지
    const requestCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    while (requestRecords.length > 0 && requestRecords[0].timestamp < requestCutoff) {
      requestRecords.shift();
    }

    // Error records: 최근 7일 유지
    while (errorRecords.length > 0 && errorRecords[0].timestamp < cutoff) {
      errorRecords.shift();
    }

    // Anomaly records: resolved된 것 중 오래된 것 제거
    const resolvedCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    for (let i = anomalyRecords.length - 1; i >= 0; i--) {
      if (anomalyRecords[i].resolved && anomalyRecords[i].timestamp < resolvedCutoff) {
        anomalyRecords.splice(i, 1);
      }
    }

    // Alerts: acknowledged된 것 중 오래된 것 제거
    for (let i = operationsAlerts.length - 1; i >= 0; i--) {
      if (operationsAlerts[i].acknowledged && operationsAlerts[i].timestamp < cutoff) {
        operationsAlerts.splice(i, 1);
      }
    }

    logger.debug('AI Operations: cleaned up old records');
  }
}

export const aiOperationsService = AiOperationsService.getInstance();
export default AiOperationsService;
