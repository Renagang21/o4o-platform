/**
 * OperatorCareDashboardPage — 케어 현황
 * WO-O4O-GLYCOPHARM-OPERATOR-CARE-PAGES-V1
 *
 * 플랫폼 전체 Care 모니터링 대시보드 (operator/admin 전용)
 * 기존 /care/* API를 글로벌 모드(pharmacyId=null)로 호출
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  Users,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Activity,
  TrendingUp,
  Heart,
  ChevronRight,
} from 'lucide-react';
import {
  pharmacyApi,
  type CareDashboardSummary,
  type PopulationDashboardDto,
  type PriorityPatientDto,
  type AiPriorityPatientDto,
  type CareAlertDto,
} from '../../../api/pharmacy';

// ─── Risk Badge ──────────────────────────────────────────────

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high: { label: '고위험', color: 'text-red-700', bg: 'bg-red-50' },
  caution: { label: '주의', color: 'text-amber-700', bg: 'bg-amber-50' },
  moderate: { label: '주의', color: 'text-amber-700', bg: 'bg-amber-50' },
  normal: { label: '양호', color: 'text-green-700', bg: 'bg-green-50' },
  low: { label: '양호', color: 'text-green-700', bg: 'bg-green-50' },
};

function RiskBadge({ level }: { level: string }) {
  const cfg = RISK_CONFIG[level] || { label: level, color: 'text-slate-500', bg: 'bg-slate-100' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

const SEVERITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: '심각', color: 'text-red-700', bg: 'bg-red-50' },
  warning: { label: '경고', color: 'text-amber-700', bg: 'bg-amber-50' },
  info: { label: '정보', color: 'text-blue-700', bg: 'bg-blue-50' },
};

function SeverityBadge({ severity }: { severity: string }) {
  const cfg = SEVERITY_CONFIG[severity] || { label: severity, color: 'text-slate-500', bg: 'bg-slate-100' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────

export default function OperatorCareDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<CareDashboardSummary | null>(null);
  const [population, setPopulation] = useState<PopulationDashboardDto | null>(null);
  const [priorityPatients, setPriorityPatients] = useState<(PriorityPatientDto | AiPriorityPatientDto)[]>([]);
  const [alerts, setAlerts] = useState<CareAlertDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, populationRes, priorityRes, alertsRes] = await Promise.all([
        pharmacyApi.getCareDashboardSummary().catch(() => null),
        pharmacyApi.getPopulationDashboard().catch(() => null),
        pharmacyApi.getAiPriorityPatients().catch(() => pharmacyApi.getPriorityPatients().catch(() => ({ priorityPatients: [] }))),
        pharmacyApi.getCareAlerts().catch(() => [] as CareAlertDto[]),
      ]);
      setSummary(summaryRes);
      setPopulation(populationRes);
      setPriorityPatients((priorityRes as any)?.priorityPatients || []);
      setAlerts(Array.isArray(alertsRes) ? alertsRes.slice(0, 5) : []);
    } catch (err: any) {
      setError(err.message || '데이터를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div className="p-6 text-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm">케어 현황을 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">케어 현황</h1>
          <p className="text-sm text-slate-500 mt-1">플랫폼 전체 케어 모니터링</p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />새로고침
        </button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />{error}
        </div>
      )}

      {/* Stats Cards (4열) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="전체 당뇨인" value={summary?.totalPatients ?? 0} color="text-slate-600" bg="bg-slate-50" />
        <StatCard icon={ShieldAlert} label="고위험" value={summary?.highRiskCount ?? 0} color="text-red-600" bg="bg-red-50" />
        <StatCard icon={AlertTriangle} label="주의" value={summary?.moderateRiskCount ?? 0} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={ShieldCheck} label="양호" value={summary?.lowRiskCount ?? 0} color="text-green-600" bg="bg-green-50" />
      </div>

      {/* Population Metrics (3열) */}
      {population && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MetricCard
            label="평균 TIR"
            value={`${(population.averageMetrics?.tir ?? 0).toFixed(1)}%`}
            sub="Time in Range"
            icon={Activity}
          />
          <MetricCard
            label="평균 CV"
            value={`${(population.averageMetrics?.cv ?? 0).toFixed(1)}%`}
            sub="Coefficient of Variation"
            icon={Activity}
          />
          <MetricCard
            label="개선 당뇨인"
            value={`${summary?.improvingCount ?? 0}명`}
            sub="TIR 상승 추세"
            icon={TrendingUp}
          />
        </div>
      )}

      {/* 우선 관리 당뇨인 */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <Heart className="w-4 h-4 text-red-500" />
          <h2 className="text-base font-semibold text-slate-800">우선 관리 당뇨인</h2>
          <span className="text-xs text-slate-400 ml-auto">{priorityPatients.length}명</span>
        </div>
        {priorityPatients.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {priorityPatients.map((p) => (
              <div key={p.patientId} className="px-5 py-3 flex items-center gap-4 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800 text-sm">{p.patientName}</span>
                    <RiskBadge level={p.riskLevel} />
                    {'aiAdjustment' in p && (
                      <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">AI</span>
                    )}
                  </div>
                  {p.reasons.length > 0 && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">{p.reasons.join(' / ')}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-slate-700">{p.priorityScore}점</div>
                  <div className="text-xs text-slate-400">TIR {p.tir}%</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-400">우선 관리 대상 당뇨인가 없습니다.</div>
        )}
      </div>

      {/* 2열: 코칭 활동 + 최근 알림 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 코칭 활동 */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-4">코칭 활동</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">7일 코칭 세션</span>
              <span className="font-semibold text-slate-800">{summary?.recentCoachingCount ?? 0}건</span>
            </div>
            {population && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">대기 드래프트</span>
                  <span className="font-semibold text-slate-800">{population.coaching?.pending ?? 0}건</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">활성 당뇨인 (7일)</span>
                  <span className="font-semibold text-green-600">{population.activity?.activePatients ?? 0}명</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">비활성 당뇨인</span>
                  <span className="font-semibold text-slate-400">{population.activity?.inactivePatients ?? 0}명</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 최근 알림 */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">최근 알림</h3>
            <button
              onClick={() => navigate('/operator/care/alerts')}
              className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700"
            >
              전체 보기<ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {alerts.length > 0 ? (
            <div className="divide-y divide-slate-50">
              {alerts.map((a) => (
                <div key={a.id} className="px-5 py-2.5 flex items-center gap-3">
                  <SeverityBadge severity={a.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{a.message}</p>
                    <p className="text-xs text-slate-400">{a.patientName}</p>
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {new Date(a.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-slate-400">알림이 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub Components ──────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${bg}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, icon: Icon }: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-500 uppercase">{label}</span>
      </div>
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-xs text-slate-400 mt-1">{sub}</p>
    </div>
  );
}
