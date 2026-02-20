/**
 * PatientDetailPage - 환자 단일 관리 포털
 * WO-CARE-SUMMARY-DATA-ALIGNMENT-V1
 *
 * 데이터 소스:
 *   - pharmacyApi.getCustomerDetail(id) → 환자 기본정보
 *   - pharmacyApi.getCareDashboardSummary() → snapshotMap (riskLevel, createdAt)
 *
 * 구조:
 *   CareSubNav
 *   Patient Header Block (이름, 위험도, 분석일)
 *   Tab Navigation (기본정보 | 분석 | 코칭 | 기록)
 *   Tab Content (Outlet context)
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, NavLink, Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Calendar,
  Loader2,
} from 'lucide-react';
import { pharmacyApi, type PharmacyCustomer, type CareDashboardSummary } from '@/api/pharmacy';
import CareSubNav from './CareSubNav';

// ── Shared types for tab context ──

interface SnapshotData {
  riskLevel: string;
  createdAt: string;
}

export interface PatientDetailContext {
  patient: PharmacyCustomer | null;
  snapshot: SnapshotData | null;
  loading: boolean;
}

/** Hook for child tabs to access patient data */
export function usePatientDetail() {
  return useOutletContext<PatientDetailContext>();
}

// ── Constants ──

const RISK_DISPLAY = {
  high: { label: '고위험', cls: 'bg-red-100 text-red-700', Icon: AlertTriangle },
  moderate: { label: '주의', cls: 'bg-amber-100 text-amber-700', Icon: AlertCircle },
  low: { label: '양호', cls: 'bg-green-100 text-green-700', Icon: CheckCircle },
} as const;

type RiskKey = keyof typeof RISK_DISPLAY;

const detailTabs = [
  { path: '', label: '기본정보', end: true },
  { path: 'analysis', label: '분석', end: false },
  { path: 'coaching', label: '코칭', end: false },
  { path: 'history', label: '기록', end: false },
];

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<PharmacyCustomer | null>(null);
  const [summary, setSummary] = useState<CareDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [customerRes, summaryRes] = await Promise.all([
        pharmacyApi.getCustomerDetail(id).catch(() => null),
        pharmacyApi.getCareDashboardSummary().catch(() => null),
      ]);
      if (customerRes?.success && customerRes.data) {
        setPatient(customerRes.data);
      }
      if (summaryRes) {
        setSummary(summaryRes);
      }
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

  // Date format (PatientsPage와 동일)
  const analysisDate = snapshot?.createdAt
    ? new Date(snapshot.createdAt).toLocaleDateString()
    : '-';

  const patientName = patient?.name || `환자 ${id}`;
  const initial = patientName.charAt(0) || '?';

  // Context for child tabs
  const outletContext: PatientDetailContext = { patient, snapshot, loading };

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
          환자 목록으로
        </button>

        {/* Patient Header Block */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
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
            <div className="flex gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">--</p>
                <p className="text-xs text-slate-500">TIR %</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">--</p>
                <p className="text-xs text-slate-500">CV %</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-800">--</p>
                <p className="text-xs text-slate-500">코칭 횟수</p>
              </div>
            </div>
          </div>
        </div>

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
