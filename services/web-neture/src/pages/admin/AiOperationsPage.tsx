/**
 * AiOperationsPage - AI 운영 상태 대시보드
 *
 * Work Order: WO-AI-OPERATIONS-GUARDRAILS-V1
 *
 * AI 운영 가드레일 대시보드
 * - 오늘의 상태 요약
 * - 경고/주의 내역
 * - 장애 지표
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.neture.co.kr';

// 타입 정의
type AiOperationalStatus = 'normal' | 'warning' | 'unstable';
type AlertLevel = 'info' | 'warning' | 'critical';
type AlertType = 'usage_threshold' | 'anomaly_detected' | 'error_spike' | 'timeout_spike';
type CircuitBreakerState = 'closed' | 'half_open' | 'open';

interface DailyUsageStatus {
  date: string;
  currentUsage: number;
  dailyLimit: number;
  usagePercent: number;
  status: AiOperationalStatus;
  warningMessage?: string;
}

interface ErrorMetrics {
  totalCalls: number;
  successCount: number;
  timeoutCount: number;
  apiErrorCount: number;
  otherErrorCount: number;
  errorRate: number;
  timeoutRate: number;
}

interface DailyErrorMetrics extends ErrorMetrics {
  date: string;
}

interface CircuitBreakerStatus {
  state: CircuitBreakerState;
  stateChangedAt: string;
  recentErrorRate: number;
  consecutiveTimeouts: number;
  halfOpenRequestCount: number;
  userMessage?: string;
}

interface OperationsAlert {
  id: string;
  timestamp: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  message: string;
  acknowledged: boolean;
}

interface AnomalyRecord {
  id: string;
  timestamp: string;
  type: string;
  userId?: string;
  sessionId?: string;
  details: {
    requestCount: number;
    timeWindowMs: number;
    threshold: number;
  };
  resolved: boolean;
}

interface TodayOperationsSummary {
  date: string;
  overallStatus: AiOperationalStatus;
  usageStatus: DailyUsageStatus;
  errorMetrics: ErrorMetrics;
  circuitBreaker: CircuitBreakerStatus;
  activeAlertCount: number;
  anomalyCount: number;
}

interface OperationsDashboardData {
  today: TodayOperationsSummary;
  recentAlerts: OperationsAlert[];
  recentAnomalies: AnomalyRecord[];
  errorTrend: DailyErrorMetrics[];
}

export default function AiOperationsPage() {
  const [data, setData] = useState<OperationsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/operations`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (result?.success) {
        setData(result.data);
        setError(null);
      } else {
        // 데이터가 없으면 샘플 데이터
        setData(getSampleData());
      }
    } catch (err: any) {
      setData(getSampleData());
    } finally {
      setLoading(false);
    }
  };

  const getSampleData = (): OperationsDashboardData => {
    const today = new Date().toISOString().split('T')[0];
    return {
      today: {
        date: today,
        overallStatus: 'normal',
        usageStatus: {
          date: today,
          currentUsage: 0,
          dailyLimit: 100,
          usagePercent: 0,
          status: 'normal',
        },
        errorMetrics: {
          totalCalls: 0,
          successCount: 0,
          timeoutCount: 0,
          apiErrorCount: 0,
          otherErrorCount: 0,
          errorRate: 0,
          timeoutRate: 0,
        },
        circuitBreaker: {
          state: 'closed',
          stateChangedAt: new Date().toISOString(),
          recentErrorRate: 0,
          consecutiveTimeouts: 0,
          halfOpenRequestCount: 0,
        },
        activeAlertCount: 0,
        anomalyCount: 0,
      },
      recentAlerts: [],
      recentAnomalies: [],
      errorTrend: [],
    };
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/ai/operations/acknowledge-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ alertId }),
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const getStatusBadge = (status: AiOperationalStatus) => {
    const styles: Record<AiOperationalStatus, string> = {
      normal: 'bg-green-100 text-green-700',
      warning: 'bg-amber-100 text-amber-700',
      unstable: 'bg-red-100 text-red-700',
    };
    const labels: Record<AiOperationalStatus, string> = {
      normal: '정상',
      warning: '주의',
      unstable: '불안정',
    };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getCircuitBreakerBadge = (state: CircuitBreakerState) => {
    const styles: Record<CircuitBreakerState, string> = {
      closed: 'bg-green-100 text-green-700',
      half_open: 'bg-amber-100 text-amber-700',
      open: 'bg-red-100 text-red-700',
    };
    const labels: Record<CircuitBreakerState, string> = {
      closed: '정상',
      half_open: '복구 중',
      open: '차단됨',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[state]}`}>
        {labels[state]}
      </span>
    );
  };

  const getAlertLevelBadge = (level: AlertLevel) => {
    const styles: Record<AlertLevel, string> = {
      info: 'bg-blue-100 text-blue-700',
      warning: 'bg-amber-100 text-amber-700',
      critical: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[level]}`}>
        {level.toUpperCase()}
      </span>
    );
  };

  const formatNumber = (num: number) => num.toLocaleString();
  const formatPercent = (num: number) => `${num.toFixed(1)}%`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-primary-600">
                Neture
              </Link>
              <span className="text-gray-300">|</span>
              <span className="text-sm font-medium text-gray-600">AI 운영 상태</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/admin/ai-card-report" className="text-sm text-gray-500 hover:text-gray-700">
                카드 리포트
              </Link>
              <Link to="/admin" className="text-sm text-gray-500 hover:text-gray-700">
                대시보드
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI 운영 상태</h1>
            <p className="text-gray-500 mt-1">
              AI 서비스의 실시간 운영 현황을 확인합니다.
            </p>
          </div>
          {data && getStatusBadge(data.today.overallStatus)}
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-500">로딩 중...</div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-600">{error}</p>
          </div>
        ) : data ? (
          <>
            {/* Section 1: 오늘의 상태 요약 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              {/* 오늘 AI 질문 수 */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">오늘 AI 질문</div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatNumber(data.today.usageStatus.currentUsage)}
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>한도 대비</span>
                    <span>{formatPercent(data.today.usageStatus.usagePercent)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        data.today.usageStatus.usagePercent >= 100 ? 'bg-red-500' :
                        data.today.usageStatus.usagePercent >= 80 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(data.today.usageStatus.usagePercent, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 성공률 */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">성공률</div>
                <div className={`text-3xl font-bold ${
                  data.today.errorMetrics.errorRate > 20 ? 'text-red-600' :
                  data.today.errorMetrics.errorRate > 5 ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {formatPercent(100 - data.today.errorMetrics.errorRate)}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  총 {formatNumber(data.today.errorMetrics.totalCalls)}건 중{' '}
                  {formatNumber(data.today.errorMetrics.successCount)}건 성공
                </div>
              </div>

              {/* Circuit Breaker 상태 */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">서비스 상태</div>
                <div className="flex items-center gap-2 mb-2">
                  {getCircuitBreakerBadge(data.today.circuitBreaker.state)}
                </div>
                <div className="text-xs text-gray-400">
                  연속 타임아웃: {data.today.circuitBreaker.consecutiveTimeouts}회
                </div>
                {data.today.circuitBreaker.userMessage && (
                  <div className="text-xs text-amber-600 mt-1">
                    {data.today.circuitBreaker.userMessage}
                  </div>
                )}
              </div>

              {/* 활성 경고 */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-sm text-gray-500 mb-1">활성 경고</div>
                <div className={`text-3xl font-bold ${
                  data.today.activeAlertCount > 0 ? 'text-amber-600' : 'text-gray-900'
                }`}>
                  {data.today.activeAlertCount}
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  비정상 패턴: {data.today.anomalyCount}건
                </div>
              </div>
            </div>

            {/* Section 2: 경고/주의 내역 */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">경고/주의 내역</h2>
              </div>
              <div className="p-6">
                {data.recentAlerts.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    활성 경고가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.recentAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-start justify-between p-4 rounded-lg ${
                          alert.acknowledged ? 'bg-gray-50' : 'bg-amber-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {getAlertLevelBadge(alert.level)}
                          <div>
                            <div className="font-medium text-gray-900">{alert.title}</div>
                            <div className="text-sm text-gray-600 mt-0.5">{alert.message}</div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(alert.timestamp).toLocaleString('ko-KR')}
                            </div>
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <button
                            onClick={() => acknowledgeAlert(alert.id)}
                            className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          >
                            확인
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: 장애 지표 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* 에러 분포 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">오늘 에러 분포</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">타임아웃</span>
                    <span className="font-medium text-gray-900">
                      {formatNumber(data.today.errorMetrics.timeoutCount)}건
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">API 에러</span>
                    <span className="font-medium text-gray-900">
                      {formatNumber(data.today.errorMetrics.apiErrorCount)}건
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">기타 에러</span>
                    <span className="font-medium text-gray-900">
                      {formatNumber(data.today.errorMetrics.otherErrorCount)}건
                    </span>
                  </div>
                </div>
              </div>

              {/* 비정상 패턴 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">비정상 패턴 감지</h2>
                {data.recentAnomalies.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    감지된 패턴이 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.recentAnomalies.slice(0, 5).map((anomaly) => (
                      <div key={anomaly.id} className="text-sm">
                        <span className="font-medium text-gray-700">{anomaly.type}</span>
                        <span className="text-gray-500 ml-2">
                          {anomaly.details.requestCount}회 / {Math.round(anomaly.details.timeWindowMs / 1000)}초
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Section 4: 일자별 추이 */}
            {data.errorTrend.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h2 className="font-semibold text-gray-900 mb-4">일자별 추이 (최근 7일)</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-2 font-medium text-gray-500">날짜</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500">호출</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500">성공</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500">타임아웃</th>
                        <th className="text-right py-3 px-2 font-medium text-gray-500">에러율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.errorTrend.map((day, index) => (
                        <tr
                          key={day.date}
                          className={`border-b border-gray-50 ${index % 2 === 0 ? 'bg-gray-50/50' : ''}`}
                        >
                          <td className="py-3 px-2 text-gray-600">{day.date}</td>
                          <td className="py-3 px-2 text-right font-medium">{formatNumber(day.totalCalls)}</td>
                          <td className="py-3 px-2 text-right text-green-600">{formatNumber(day.successCount)}</td>
                          <td className="py-3 px-2 text-right text-amber-600">{formatNumber(day.timeoutCount)}</td>
                          <td className={`py-3 px-2 text-right ${
                            day.errorRate > 20 ? 'text-red-600' :
                            day.errorRate > 5 ? 'text-amber-600' : 'text-green-600'
                          }`}>
                            {formatPercent(day.errorRate)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* Note */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            이 대시보드는 AI 서비스의 운영 상태를 실시간으로 모니터링합니다.
            경고는 자동 차단 없이 알림만 제공합니다.
          </p>
        </div>
      </main>
    </div>
  );
}
