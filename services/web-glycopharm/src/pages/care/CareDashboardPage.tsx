/**
 * CareDashboardPage - AI Care Control Tower
 *
 * WO-GLYCOPHARM-CARE-CONTROL-TOWER-AI-UX-REFINE-V1
 *
 * 구조:
 *   Population Summary + AI explanation
 *   Priority Patients + AI explanation
 *   Alert Stream
 *   Risk Summary + AI explanation + Avg Metrics + Coaching
 *   Ask AI (Chat Entry)
 *   Patient Search + Table
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Loader2,
  Users,
  AlertTriangle,
  AlertCircle,
  MessageCircle,
  Filter,
  ChevronRight,
  Star,
  Activity,
  Bell,
  Check,
  CheckCircle2,
} from 'lucide-react';
import { pharmacyApi, type PharmacyCustomer, type CareDashboardSummary, type PriorityPatientDto, type AiPriorityPatientDto, type PopulationDashboardDto, type CareAlertDto } from '@/api/pharmacy';
import CareSubNav from './CareSubNav';
import CareAiPopulationSummary from './CareAiPopulationSummary';
import CareAiPrioritySummary from './CareAiPrioritySummary';
import CareRiskSummary from './CareRiskSummary';
import CareAiChatEntry from './CareAiChatEntry';

type RiskLevel = 'all' | 'high' | 'moderate' | 'low';

const RISK_CONFIG = {
  high: { label: '고위험', cls: 'bg-red-100 text-red-700' },
  moderate: { label: '주의', cls: 'bg-amber-100 text-amber-700' },
  low: { label: '양호', cls: 'bg-green-100 text-green-700' },
} as const;

interface SnapshotData {
  riskLevel: string;
  createdAt: string;
}

export default function CareDashboardPage() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PharmacyCustomer[]>([]);
  const [summary, setSummary] = useState<CareDashboardSummary | null>(null);
  const [priorityPatients, setPriorityPatients] = useState<(PriorityPatientDto | AiPriorityPatientDto)[]>([]);
  const [population, setPopulation] = useState<PopulationDashboardDto | null>(null);
  const [alerts, setAlerts] = useState<CareAlertDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState<RiskLevel>('all');

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [customersRes, summaryRes, priorityRes, populationRes, alertsRes] = await Promise.all([
        pharmacyApi.getCustomers({
          search: debouncedSearch || undefined,
          pageSize: 100,
        }),
        pharmacyApi.getCareDashboardSummary().catch(() => null),
        // Phase 4: AI Priority with fallback to rule-based
        pharmacyApi.getAiPriorityPatients().catch(() =>
          pharmacyApi.getPriorityPatients().catch(() => null)
        ),
        pharmacyApi.getPopulationDashboard().catch(() => null),
        pharmacyApi.getCareAlerts().catch(() => [] as CareAlertDto[]),
      ]);

      if (customersRes.success && customersRes.data) {
        setPatients(customersRes.data.items);
      }
      if (summaryRes) {
        setSummary(summaryRes);
      }
      setPriorityPatients(priorityRes?.priorityPatients ?? []);
      setPopulation(populationRes);
      setAlerts(alertsRes);
    } catch {
      setError('당뇨인 정보를 불러오는데 실패했습니다.');
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Snapshot map: patientId → { riskLevel, createdAt }
  const snapshotMap = useMemo(() => {
    const map = new Map<string, SnapshotData>();
    if (summary?.recentSnapshots) {
      for (const s of summary.recentSnapshots) {
        if (!map.has(s.patientId)) {
          map.set(s.patientId, { riskLevel: s.riskLevel, createdAt: s.createdAt });
        }
      }
    }
    return map;
  }, [summary]);

  // Risk level: Care snapshot 기반 (fallback: 'low')
  const getRisk = (p: PharmacyCustomer): keyof typeof RISK_CONFIG => {
    const snapshot = snapshotMap.get(p.id);
    if (snapshot && snapshot.riskLevel in RISK_CONFIG) {
      return snapshot.riskLevel as keyof typeof RISK_CONFIG;
    }
    return 'low';
  };

  // Analysis date from snapshot
  const getAnalysisDate = (p: PharmacyCustomer): string | null => {
    const snapshot = snapshotMap.get(p.id);
    return snapshot?.createdAt ?? null;
  };

  // Client-side risk filter
  const filteredPatients = patients.filter((p) => {
    if (riskFilter === 'all') return true;
    return getRisk(p) === riskFilter;
  });

  const handleAckAlert = async (alertId: string) => {
    try {
      await pharmacyApi.acknowledgeCareAlert(alertId);
      setAlerts((prev) => prev.map((a) => a.id === alertId ? { ...a, status: 'acknowledged' as const } : a));
    } catch { /* ignore */ }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      await pharmacyApi.resolveCareAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch { /* ignore */ }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  const today = new Date();
  const todayStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;

  return (
    <div className="min-h-screen bg-slate-50">
      <CareSubNav />
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-bold text-white">AI Care Control Tower</h1>
          <p className="text-primary-100 mt-1">오늘의 관리 요약 · {todayStr}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ═══ Section 1: Population Summary + AI Explanation ═══ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-600" />
              </div>
              <p className="text-sm text-slate-500">전체 당뇨인</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {summary?.totalPatients ?? patients.length}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-sm text-slate-500">고위험</p>
            </div>
            <p className="text-3xl font-bold text-red-600">
              {summary?.highRiskCount ?? 0}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-sm text-slate-500">주의</p>
            </div>
            <p className="text-3xl font-bold text-amber-600">
              {summary?.moderateRiskCount ?? 0}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm text-slate-500">최근 7일 상담</p>
            </div>
            <p className="text-3xl font-bold text-slate-900">
              {summary?.recentCoachingCount ?? 0}
            </p>
          </div>
        </div>

        {/* AI Population Explanation */}
        <CareAiPopulationSummary summary={summary} population={population} />

        {/* ═══ Section 2: Priority Patients + AI Explanation ═══ */}
        {priorityPatients.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-orange-500" />
              <h2 className="text-sm font-semibold text-slate-700">오늘의 우선 관리 당뇨인</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {priorityPatients.map((pp) => {
                const scoreColor =
                  pp.priorityScore >= 80
                    ? 'bg-red-100 text-red-700'
                    : pp.priorityScore >= 50
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-yellow-100 text-yellow-700';
                const riskBadge =
                  pp.riskLevel === 'high'
                    ? 'bg-red-100 text-red-700'
                    : pp.riskLevel === 'caution'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700';
                const riskLabel =
                  pp.riskLevel === 'high' ? '고위험' : pp.riskLevel === 'caution' ? '주의' : '양호';

                // AI adjustment display (Phase 4)
                const aiData = 'aiAdjustment' in pp ? pp as AiPriorityPatientDto : null;

                return (
                  <div
                    key={pp.patientId}
                    onClick={() => navigate(`/care/patients/${pp.patientId}`)}
                    className="bg-white rounded-xl border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-[10px] font-medium">
                            {pp.patientName.charAt(0)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-slate-800 truncate">
                          {pp.patientName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${scoreColor}`}>
                          {pp.priorityScore}
                        </span>
                        {aiData && aiData.aiAdjustment !== 0 && (
                          <span className={`text-[9px] font-medium ${aiData.aiAdjustment > 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {aiData.aiAdjustment > 0 ? `+${aiData.aiAdjustment}` : aiData.aiAdjustment}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${riskBadge}`}>
                        {riskLabel}
                      </span>
                      <span className="text-[10px] text-slate-400">TIR {pp.tir}%</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {pp.reasons.slice(0, 2).map((r, i) => (
                        <span key={i} className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {r}
                        </span>
                      ))}
                    </div>
                    {aiData?.aiReason && (
                      <p className="text-[10px] text-primary-600 mt-1.5 line-clamp-1">{aiData.aiReason}</p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* AI Priority Summary */}
            <div className="mt-3">
              <CareAiPrioritySummary patients={priorityPatients} />
            </div>
          </div>
        )}

        {/* ═══ Section 3: Alert Stream ═══ */}
        {alerts.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-red-500" />
              <h2 className="text-sm font-semibold text-slate-700">활성 알림</h2>
              <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium">
                {alerts.length}
              </span>
            </div>
            <div className="space-y-2">
              {alerts.map((alert) => {
                const severityStyle =
                  alert.severity === 'critical'
                    ? 'border-red-300 bg-red-50'
                    : alert.severity === 'warning'
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-blue-300 bg-blue-50';
                const severityLabel =
                  alert.severity === 'critical'
                    ? 'text-red-700'
                    : alert.severity === 'warning'
                      ? 'text-amber-700'
                      : 'text-blue-700';
                return (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between rounded-xl border p-4 ${severityStyle}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/care/patients/${alert.patientId}`)}
                        className={`text-sm font-medium underline-offset-2 hover:underline ${severityLabel}`}
                      >
                        {alert.patientName}
                      </button>
                      <span className={`text-sm ${severityLabel}`}>{alert.message}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">
                        {formatDate(alert.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      {alert.status === 'open' && (
                        <button
                          onClick={() => handleAckAlert(alert.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                          확인
                        </button>
                      )}
                      <button
                        onClick={() => handleResolveAlert(alert.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-green-600 bg-white border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        해결
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ Section 4: Risk Summary + Avg Metrics + Coaching ═══ */}
        {population && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Risk Summary (replaces bar chart) */}
            <CareRiskSummary population={population} />

            {/* Average Metrics */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">평균 지표</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">평균 TIR</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {population.averageMetrics.tir}
                    <span className="text-sm font-normal text-slate-400">%</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">평균 CV</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {population.averageMetrics.cv}
                    <span className="text-sm font-normal text-slate-400">%</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Coaching & Activity */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <MessageCircle className="w-4 h-4 text-slate-500" />
                <p className="text-sm font-medium text-slate-700">코칭 & 활동</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">7일 코칭 전송</span>
                  <span className="text-sm font-semibold text-slate-800">{population.coaching.sent7d}건</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">대기 초안</span>
                  <span className={`text-sm font-semibold ${population.coaching.pending > 0 ? 'text-blue-600' : 'text-slate-800'}`}>
                    {population.coaching.pending}건
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between">
                  <span className="text-xs text-slate-500">활성 당뇨인 (7일)</span>
                  <span className="text-sm font-semibold text-green-600">{population.activity.activePatients}명</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">비활성 당뇨인</span>
                  <span className={`text-sm font-semibold ${population.activity.inactivePatients > 0 ? 'text-orange-500' : 'text-slate-800'}`}>
                    {population.activity.inactivePatients}명
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ Section 5: AI Chat Entry ═══ */}
        <CareAiChatEntry />

        {/* ═══ Section 6: Patient Search + Table ═══ */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="이름, 연락처 검색"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as RiskLevel)}
              className="px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">전체 위험도</option>
              <option value="high">고위험</option>
              <option value="moderate">주의</option>
              <option value="low">양호</option>
            </select>
          </div>

          <div className="flex-1" />

          <button
            onClick={() => navigate('/care/patients')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            당뇨인 등록
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Patient Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500">
                {debouncedSearch || riskFilter !== 'all'
                  ? '조건에 맞는 당뇨인가 없습니다.'
                  : '등록된 당뇨인가 없습니다.'}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    당뇨인명
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    위험도
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    최근 분석일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    최근 상담
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((patient) => {
                  const risk = getRisk(patient);
                  const config = RISK_CONFIG[risk];
                  const analysisDate = getAnalysisDate(patient);
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => navigate(`/care/patients/${patient.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-xs font-medium">
                              {patient.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{patient.name}</p>
                            <p className="text-xs text-slate-500">{patient.phone || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${config.cls}`}
                        >
                          {config.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {analysisDate ? formatDate(analysisDate) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">-</td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-300 inline-block" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
