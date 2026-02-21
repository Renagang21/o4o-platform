/**
 * SummaryTab - 환자 기본정보 요약
 * WO-CARE-SUMMARY-DATA-ALIGNMENT-V1
 *
 * 데이터: PatientDetailPage outlet context (patient + snapshot)
 */

import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Calendar,
  Phone,
  Stethoscope,
  ShoppingCart,
} from 'lucide-react';
import { usePatientDetail } from '../PatientDetailPage';

const RISK_DISPLAY = {
  high: { label: '고위험', cls: 'bg-red-100 text-red-700 border-red-200', Icon: AlertTriangle },
  moderate: { label: '주의', cls: 'bg-amber-100 text-amber-700 border-amber-200', Icon: AlertCircle },
  low: { label: '양호', cls: 'bg-green-100 text-green-700 border-green-200', Icon: CheckCircle },
} as const;

type RiskKey = keyof typeof RISK_DISPLAY;

const DIABETES_LABELS: Record<string, string> = {
  type1: '제1형',
  type2: '제2형',
  gestational: '임신성',
  prediabetes: '전단계',
};

export default function SummaryTab() {
  const { patient, snapshot } = usePatientDetail();

  const riskKey: RiskKey = (snapshot?.riskLevel && snapshot.riskLevel in RISK_DISPLAY)
    ? snapshot.riskLevel as RiskKey
    : 'low';
  const risk = RISK_DISPLAY[riskKey];

  const analysisDate = snapshot?.createdAt
    ? new Date(snapshot.createdAt).toLocaleDateString()
    : '-';

  const registeredDate = patient?.createdAt
    ? new Date(patient.createdAt).toLocaleDateString()
    : '-';

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">기본정보 요약</h3>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 현재 위험도 */}
        <div className={`flex items-center gap-4 p-4 rounded-xl border ${risk.cls}`}>
          <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
            <risk.Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium">현재 위험도</p>
            <p className="text-lg font-bold">{risk.label}</p>
          </div>
        </div>

        {/* 최근 분석일 */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">최근 분석일</p>
            <p className="text-lg font-bold text-slate-800">{analysisDate}</p>
          </div>
        </div>

        {/* 질환 정보 */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
            <Stethoscope className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">당뇨 유형</p>
            <p className="text-lg font-bold text-slate-800">
              {patient?.diabetesType ? DIABETES_LABELS[patient.diabetesType] || patient.diabetesType : '-'}
            </p>
          </div>
        </div>

        {/* 연락처 */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">연락처</p>
            <p className="text-lg font-bold text-slate-800">{patient?.phone || '-'}</p>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
        <h4 className="text-sm font-medium text-slate-600 mb-3">추가 정보</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-xs text-slate-400">등록일</p>
            <p className="text-sm font-medium text-slate-700">{registeredDate}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">상태</p>
            <p className="text-sm font-medium text-slate-700">
              {patient?.status === 'active' ? '활성' : patient?.status === 'inactive' ? '비활성' : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">주문 횟수</p>
            <div className="flex items-center justify-center gap-1">
              <ShoppingCart className="w-3 h-3 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">{patient?.totalOrders ?? '-'}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400">이메일</p>
            <p className="text-sm font-medium text-slate-700 truncate">{patient?.email || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
