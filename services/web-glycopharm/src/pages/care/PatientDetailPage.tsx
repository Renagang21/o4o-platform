/**
 * PatientDetailPage - Care Workspace
 * WO-O4O-PATIENT-DETAIL-CARE-WORKSPACE-V1
 *
 * 데이터 소스:
 *   - pharmacyApi.getCustomerDetail(id) → 당뇨인 기본정보
 *   - pharmacyApi.getCareDashboardSummary() → snapshotMap (riskLevel, createdAt)
 *   - pharmacyApi.getCareKpi(id) → TIR/CV 실데이터
 *   - pharmacyApi.getCoachingSessions(id) → 코칭 횟수
 *
 * 구조:
 *   CareSubNav
 *   Patient Header Block (이름, 위험도, TIR, CV, 코칭 횟수)
 *   Action Panel (Rule 기반)
 *   Tab Navigation (데이터 | 분석 | 코칭 | 기록)
 *   Tab Content (Outlet context)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Loader2,
  MessageSquare,
  ClipboardPlus,
} from 'lucide-react';
import {
  pharmacyApi,
  type PharmacyCustomer,
  type CareDashboardSummary,
  type KpiComparisonDto,
} from '@/api/pharmacy';
import CareSubNav from './CareSubNav';
import PatientAiSummary from './PatientAiSummary';
import CareAiChatEntry from './CareAiChatEntry';
import { getPatientDisplayName, getPatientInitial } from '@/utils/patient-display';
import { RISK_DISPLAY } from '@/constants/care-display';

// ── Shared types for tab context ──

interface SnapshotData {
  riskLevel: string;
  createdAt: string;
}

export interface PatientDetailContext {
  patient: PharmacyCustomer | null;
  snapshot: SnapshotData | null;
  kpi: KpiComparisonDto | null;
  loading: boolean;
  reload: () => void;
}

/** Hook for child tabs to access patient data */
export function usePatientDetail() {
  return useOutletContext<PatientDetailContext>();
}

// ── Constants ──

type RiskKey = keyof typeof RISK_DISPLAY;

const detailTabs = [
  { path: '', label: '데이터', end: true },
  { path: 'analysis', label: '분석', end: false },
  { path: 'coaching', label: '코칭', end: false },
  { path: 'history', label: '기록', end: false },
];

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<PharmacyCustomer | null>(null);
  const [summary, setSummary] = useState<CareDashboardSummary | null>(null);
  const [kpi, setKpi] = useState<KpiComparisonDto | null>(null);
  const [coachingCount, setCoachingCount] = useState<number>(0);
  const [lastCoachingDate, setLastCoachingDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [customerRes, summaryRes, kpiRes, sessionsRes] = await Promise.all([
        pharmacyApi.getCustomerDetail(id).catch(() => null),
        pharmacyApi.getCareDashboardSummary().catch(() => null),
        pharmacyApi.getCareKpi(id).catch(() => null),
        pharmacyApi.getCoachingSessions(id).catch(() => []),
      ]);
      if (customerRes?.success && customerRes.data) {
        setPatient(customerRes.data);
      }
      if (summaryRes) {
        setSummary(summaryRes);
      }
      setKpi(kpiRes);
      const sessions = Array.isArray(sessionsRes) ? sessionsRes : [];
      setCoachingCount(sessions.length);
      setLastCoachingDate(sessions.length > 0 ? sessions[0].createdAt : null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Snapshot for this patient
  const snapshot = useMemo<SnapshotData | null>(() => {
    if (!summary?.recentSnapshots || !id) return null;
    const found = summary.recentSnapshots.find(s => s.patientId === id);
    return found ? { riskLevel: found.riskLevel, createdAt: found.createdAt } : null;
  }, [summary, id]);

  // Risk display
  const riskKey: RiskKey = (snapshot?.riskLevel && snapshot.riskLevel in RISK_DISPLAY)
    ? snapshot.riskLevel as RiskKey
    : 'low';
  const risk = RISK_DISPLAY[riskKey];

  // Date format
  const analysisDate = snapshot?.createdAt
    ? new Date(snapshot.createdAt).toLocaleDateString()
    : '-';

  const patientName = getPatientDisplayName(patient?.name);
  const initial = getPatientInitial(patient?.name);

  // ── Action Panel rules ──
  const actions = useMemo(() => {
    const items: Array<{ icon: typeof AlertTriangle; label: string; cls: string; path: string }> = [];

    if (riskKey === 'high') {
      items.push({
        icon: AlertTriangle,
        label: '고위험 당뇨인 — 분석 확인 필요',
        cls: 'bg-red-50 border-red-200 text-red-700',
        path: 'analysis',
      });
    }

    if (kpi?.latestTir == null) {
      items.push({
        icon: ClipboardPlus,
        label: '데이터 미입력 — 건강 데이터를 입력해 주세요',
        cls: 'bg-amber-50 border-amber-200 text-amber-700',
        path: '',
      });
    }

    const needsCoaching = coachingCount === 0 || (lastCoachingDate && (
      Date.now() - new Date(lastCoachingDate).getTime() > 7 * 24 * 60 * 60 * 1000
    ));
    if (needsCoaching) {
      items.push({
        icon: MessageSquare,
        label: coachingCount === 0 ? '코칭 기록 없음 — 첫 코칭을 시작하세요' : '코칭 필요 — 7일 이상 코칭 기록 없음',
        cls: 'bg-blue-50 border-blue-200 text-blue-700',
        path: 'coaching',
      });
    }

    return items;
  }, [riskKey, kpi, coachingCount, lastCoachingDate]);

  // Context for child tabs
  const outletContext: PatientDetailContext = { patient, snapshot, kpi, loading, reload: loadData };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
        <CareSubNav />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <CareSubNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Back */}
        <button
          onClick={() => navigate('/care/patients')}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          당뇨인 목록으로
        </button>

        {/* Patient Header Block */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">{initial}</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{patientName}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full ${risk.cls}`}>
                    <risk.Icon className="w-3 h-3" />
                    {risk.label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    최근 분석: {analysisDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">
                  {kpi?.latestTir != null ? kpi.latestTir : '--'}
                </p>
                <p className="text-xs text-slate-500">TIR %</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">
                  {kpi?.latestCv != null ? kpi.latestCv : '--'}
                </p>
                <p className="text-xs text-slate-500">CV %</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">{coachingCount}</p>
                <p className="text-xs text-slate-500">코칭 횟수</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        {actions.length > 0 && (
          <div className="space-y-2 mb-4">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={() => {
                  const target = action.path === ''
                    ? `/care/patients/${id}`
                    : `/care/patients/${id}/${action.path}`;
                  navigate(target, action.path === 'coaching' ? { state: { openForm: true } } : undefined);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-colors hover:opacity-80 ${action.cls}`}
              >
                <action.icon className="w-4 h-4 flex-shrink-0" />
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* AI Summary */}
        {id && <PatientAiSummary patientId={id} />}

        {/* AI Chat Entry — Patient Mode */}
        {id && <CareAiChatEntry patientId={id} patientName={patientName} />}

        {/* Tab Navigation */}
        <nav className="bg-white rounded-t-2xl border border-b-0 border-slate-200">
          <div className="flex overflow-x-auto">
            {detailTabs.map((tab) => (
              <NavLink
                key={tab.path}
                to={tab.path === '' ? `/care/patients/${id}` : `/care/patients/${id}/${tab.path}`}
                end={tab.end}
                className={({ isActive }) =>
                  `px-6 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-primary-600 text-primary-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="bg-white rounded-b-2xl border border-t-0 border-slate-200 p-6">
          <Outlet context={outletContext} />
        </div>
      </div>
    </div>
  );
}
