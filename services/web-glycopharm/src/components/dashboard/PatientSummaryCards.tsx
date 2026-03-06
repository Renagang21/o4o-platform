import { Users, Activity, AlertTriangle, MessageSquare } from 'lucide-react';
import type { MetricStatus } from '@/api/public';

interface PatientSummaryCardsProps {
  totalPatients: number;
  totalPatientsStatus?: MetricStatus;
  todayReadings: number;
  todayReadingsStatus?: MetricStatus;
  cautionPatients: number;
  cautionPatientsStatus?: MetricStatus;
  carePatients: number;
  carePatientsStatus?: MetricStatus;
}

function KpiCard({
  icon: Icon,
  label,
  value,
  unit,
  status,
  iconBg,
  iconColor,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  unit?: string;
  status?: MetricStatus;
  iconBg: string;
  iconColor: string;
}) {
  const isTableMissing = status === 'TABLE_MISSING';
  const isZero = status === 'ZERO';

  return (
    <div
      className={`bg-white rounded-2xl p-5 shadow-sm border ${
        isTableMissing ? 'border-dashed border-slate-300' : 'border-slate-100'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isTableMissing ? 'bg-slate-100' : iconBg
          }`}
        >
          <Icon className={`w-5 h-5 ${isTableMissing ? 'text-slate-400' : iconColor}`} />
        </div>
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        {isTableMissing && (
          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full">
            준비 중
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        {isTableMissing ? (
          <span className="text-lg text-slate-300">--</span>
        ) : (
          <span className={`text-2xl font-bold ${isZero ? 'text-slate-300' : 'text-slate-800'}`}>
            {value}
          </span>
        )}
        {unit && !isTableMissing && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
    </div>
  );
}

export default function PatientSummaryCards(props: PatientSummaryCardsProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-bold text-slate-800">Care 운영 현황</h2>
        <p className="text-xs text-slate-500 mt-1">환자 관리 및 케어 현황</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          icon={Users}
          label="등록 환자"
          value={props.totalPatients}
          unit="명"
          status={props.totalPatientsStatus}
          iconBg="bg-primary-50"
          iconColor="text-primary-600"
        />
        <KpiCard
          icon={Activity}
          label="오늘 혈당 입력"
          value={props.todayReadings}
          unit="건"
          status={props.todayReadingsStatus}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <KpiCard
          icon={AlertTriangle}
          label="주의 환자"
          value={props.cautionPatients}
          unit="명"
          status={props.cautionPatientsStatus}
          iconBg="bg-amber-50"
          iconColor="text-amber-600"
        />
        <KpiCard
          icon={MessageSquare}
          label="케어 환자"
          value={props.carePatients}
          unit="명"
          status={props.carePatientsStatus}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
      </div>
    </div>
  );
}
