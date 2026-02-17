/**
 * Platform Hub Page — Global Aggregation Dashboard
 *
 * WO-PLATFORM-GLOBAL-HUB-V1
 *
 * 플랫폼 통합 허브. 모든 서비스(KPA, Neture, GlycoPharm) 데이터를
 * 한 화면에서 집계하고, cross-service 트리거를 실행한다.
 *
 * Sections:
 *   1. Global Risk Overview (4 risk cards)
 *   2. Service Health (3 service summaries)
 *   3. Top 5 Action Queue (priority-sorted)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Heart,
  Users,
  ShieldAlert,
  TrendingDown,
  RefreshCw,
  Zap,
  Building2,
  Stethoscope,
  Package,
  Loader2,
} from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import PageHeader from '@/components/common/PageHeader';

// ==================== Types ====================

interface ServiceSummary {
  service: string;
  label: string;
  riskLevel: 'healthy' | 'warning' | 'critical' | 'unknown';
  error?: string;
  [key: string]: any;
}

interface TopAction {
  service: string;
  actionKey: string;
  priority: number;
  label: string;
}

interface PlatformSummaryData {
  globalRisk: 'healthy' | 'warning' | 'critical' | 'partial';
  services: {
    kpa: ServiceSummary;
    neture: ServiceSummary;
    glycopharm: ServiceSummary;
  };
  topActions: TopAction[];
  timestamp: string;
}

// ==================== Helpers ====================

const RISK_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  healthy: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: 'bg-green-500' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  partial: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', dot: 'bg-gray-400' },
  unknown: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-500', dot: 'bg-gray-400' },
};

const RISK_LABELS: Record<string, string> = {
  healthy: '정상',
  warning: '주의',
  critical: '위험',
  partial: '부분 장애',
  unknown: '알 수 없음',
};

const SERVICE_ICONS: Record<string, typeof Building2> = {
  kpa: Users,
  neture: Package,
  glycopharm: Stethoscope,
};

function riskStyle(level: string) {
  return RISK_STYLES[level] || RISK_STYLES.unknown;
}

// ==================== Component ====================

export default function PlatformHubPage() {
  const [data, setData] = useState<PlatformSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [triggerLoading, setTriggerLoading] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] = useState<{ key: string; message: string; success: boolean } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await authClient.api.get<{ success: boolean; data: PlatformSummaryData }>(
        '/v1/platform/hub/summary',
      );

      if (res.data.success) {
        setData(res.data.data);
      } else {
        setError('서버에서 데이터를 불러올 수 없습니다.');
      }
    } catch (err: any) {
      console.error('Failed to fetch platform hub summary:', err);
      setError(err.message || '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTrigger = useCallback(async (service: string, actionKey: string) => {
    try {
      setTriggerLoading(actionKey);
      setTriggerResult(null);

      const res = await authClient.api.post<{ success: boolean; message?: string }>(
        '/v1/platform/hub/trigger',
        { service, actionKey },
      );

      setTriggerResult({
        key: actionKey,
        message: res.data.message || (res.data.success ? '실행 완료' : '실행 실패'),
        success: res.data.success,
      });

      // Refresh data after trigger
      await fetchData();
    } catch (err: any) {
      setTriggerResult({
        key: actionKey,
        message: err.message || '트리거 실행 실패',
        success: false,
      });
    } finally {
      setTriggerLoading(null);
    }
  }, [fetchData]);

  // ─── Loading / Error ───

  if (loading && !data) {
    return (
      <div className="p-6">
        <PageHeader title="Platform Hub" subtitle="플랫폼 통합 운영 허브" />
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-6">
        <PageHeader title="Platform Hub" subtitle="플랫폼 통합 운영 허브" />
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { globalRisk, services, topActions } = data;

  // ─── Compute Risk Cards ───

  const riskCards = [
    {
      label: '의료 위험',
      icon: Heart,
      level: services.glycopharm.care?.highRisk > 0 ? 'critical'
        : services.glycopharm.care?.moderate > 3 ? 'warning' : 'healthy',
      detail: services.glycopharm.error
        ? '서비스 연결 불가'
        : `고위험 ${services.glycopharm.care?.highRisk ?? 0}명 / 중위험 ${services.glycopharm.care?.moderate ?? 0}명`,
    },
    {
      label: '승인 위험',
      icon: ShieldAlert,
      level: (services.neture.requests?.approvalRate ?? 100) < 50 ? 'critical'
        : (services.neture.requests?.pending ?? 0) > 5 ? 'warning' : 'healthy',
      detail: services.neture.error
        ? '서비스 연결 불가'
        : `승인율 ${services.neture.requests?.approvalRate ?? 100}% / 대기 ${services.neture.requests?.pending ?? 0}건`,
    },
    {
      label: '커뮤니티',
      icon: Users,
      level: (services.kpa.members?.pending ?? 0) > 10 ? 'warning'
        : (services.kpa.applications?.pending ?? 0) > 5 ? 'warning' : 'healthy',
      detail: services.kpa.error
        ? '서비스 연결 불가'
        : `대기 회원 ${services.kpa.members?.pending ?? 0}명 / 신청 ${services.kpa.applications?.pending ?? 0}건`,
    },
    {
      label: '매출 추세',
      icon: TrendingDown,
      level: 'healthy',
      detail: `약국 ${services.glycopharm.pharmacies?.active ?? 0}개 활성`,
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Platform Hub" subtitle="플랫폼 통합 운영 허브 — 모든 서비스를 한눈에" />
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>

      {/* ─── Section 1: Global Risk Overview ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Global Risk Overview</h2>
          <span className={`ml-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${riskStyle(globalRisk).bg} ${riskStyle(globalRisk).text}`}>
            <span className={`h-2 w-2 rounded-full ${riskStyle(globalRisk).dot}`} />
            {RISK_LABELS[globalRisk] || globalRisk}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {riskCards.map((card) => {
            const style = riskStyle(card.level);
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className={`rounded-xl border ${style.border} ${style.bg} p-4 transition-shadow hover:shadow-md`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${style.text}`} />
                  <span className="font-medium text-gray-900">{card.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${style.dot} ${card.level === 'critical' ? 'animate-pulse' : ''}`} />
                  <span className={`text-sm font-semibold ${style.text}`}>
                    {RISK_LABELS[card.level] || card.level}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">{card.detail}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Section 2: Service Health ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Service Health</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* KPA */}
          <ServiceHealthCard
            service={services.kpa}
            metrics={[
              { label: '총 회원', value: services.kpa.members?.total ?? 0 },
              { label: '활성 회원', value: services.kpa.members?.active ?? 0 },
              { label: '가입 대기', value: services.kpa.members?.pending ?? 0, highlight: true },
              { label: '커뮤니티 글', value: services.kpa.forum?.totalPosts ?? 0 },
            ]}
          />

          {/* Neture */}
          <ServiceHealthCard
            service={services.neture}
            metrics={[
              { label: '공급자', value: `${services.neture.suppliers?.active ?? 0}/${services.neture.suppliers?.total ?? 0}` },
              { label: '대기 요청', value: services.neture.requests?.pending ?? 0, highlight: true },
              { label: '승인율', value: `${services.neture.requests?.approvalRate ?? 0}%` },
              { label: '콘텐츠', value: `${services.neture.content?.published ?? 0}/${services.neture.content?.total ?? 0}` },
            ]}
          />

          {/* GlycoPharm */}
          <ServiceHealthCard
            service={services.glycopharm}
            metrics={[
              { label: '약국', value: `${services.glycopharm.pharmacies?.active ?? 0}/${services.glycopharm.pharmacies?.total ?? 0}` },
              { label: '고위험', value: services.glycopharm.care?.highRisk ?? 0, highlight: true },
              { label: '중위험', value: services.glycopharm.care?.moderate ?? 0 },
              { label: '저위험', value: services.glycopharm.care?.low ?? 0 },
            ]}
          />
        </div>
      </section>

      {/* ─── Section 3: Top Action Queue ─── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Top Actions</h2>
          {topActions.length > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {topActions.length}
            </span>
          )}
        </div>

        {topActions.length === 0 ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-green-700 font-medium">모든 서비스 정상</p>
            <p className="text-green-600 text-sm mt-1">처리 대기 중인 작업이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topActions.map((action, idx) => {
              const isLoading = triggerLoading === action.actionKey;
              const result = triggerResult?.key === action.actionKey ? triggerResult : null;
              const ServiceIcon = SERVICE_ICONS[action.service] || Building2;

              return (
                <div
                  key={action.actionKey + idx}
                  className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 text-gray-600 text-sm font-bold">
                    {idx + 1}
                  </div>

                  <ServiceIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{action.label}</p>
                    <p className="text-xs text-gray-500">
                      {action.service.toUpperCase()} · 우선도 {Math.round(action.priority * 100)}%
                    </p>
                  </div>

                  {result ? (
                    <span className={`text-xs px-2.5 py-1 rounded-full ${result.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {result.message}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleTrigger(action.service, action.actionKey)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Zap className="h-3.5 w-3.5" />
                      )}
                      실행
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Footer ─── */}
      <div className="text-xs text-gray-400 text-right">
        마지막 갱신: {new Date(data.timestamp).toLocaleString('ko-KR')}
      </div>
    </div>
  );
}

// ==================== Sub-components ====================

function ServiceHealthCard({
  service,
  metrics,
}: {
  service: ServiceSummary;
  metrics: Array<{ label: string; value: string | number; highlight?: boolean }>;
}) {
  const style = riskStyle(service.riskLevel);
  const Icon = SERVICE_ICONS[service.service] || Building2;

  if (service.error) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Icon className="h-5 w-5 text-gray-400" />
          <h3 className="font-semibold text-gray-900">{service.label}</h3>
        </div>
        <p className="text-sm text-gray-500">서비스 연결 불가</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${style.border} bg-white p-5 transition-shadow hover:shadow-md`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className={`h-5 w-5 ${style.text}`} />
          <h3 className="font-semibold text-gray-900">{service.label}</h3>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
          {RISK_LABELS[service.riskLevel] || service.riskLevel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m) => (
          <div key={m.label}>
            <p className="text-xs text-gray-500">{m.label}</p>
            <p className={`text-sm font-semibold ${m.highlight && Number(m.value) > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {m.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
