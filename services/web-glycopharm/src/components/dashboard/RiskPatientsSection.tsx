import { AlertTriangle, AlertCircle, ChevronRight, CheckCircle } from 'lucide-react';
import type { RiskPatientDto } from '@/api/pharmacy';

/**
 * RiskPatientsSection — WO-O4O-CARE-RISK-PATIENT-DETECTION-V1
 *
 * Displays risk patients in two groups: 위험 환자 (high) + 주의 환자 (caution).
 * Uses composite risk score from the /api/v1/care/risk-patients endpoint.
 */

// Keep RiskPatient for backward compatibility (used by HomeLivePage barrel export)
export interface RiskPatient {
  patientId: string;
  patientName: string;
  phone?: string;
  riskLevel: 'high' | 'moderate' | 'low';
  lastAnalysisDate?: string;
  tir?: number;
  compositeScore?: number;
}

const RISK_CONFIG: Record<string, { label: string; cls: string }> = {
  high: { label: '고위험', cls: 'bg-red-100 text-red-700' },
  caution: { label: '주의', cls: 'bg-amber-100 text-amber-700' },
  moderate: { label: '주의', cls: 'bg-amber-100 text-amber-700' },
  low: { label: '양호', cls: 'bg-green-100 text-green-700' },
  normal: { label: '양호', cls: 'bg-green-100 text-green-700' },
};

interface RiskPatientsSectionProps {
  highRisk?: RiskPatientDto[];
  caution?: RiskPatientDto[];
  // Legacy prop for backward compat
  patients?: RiskPatient[];
  onPatientClick: (patientId: string) => void;
}

function PatientCard({
  patient,
  riskLabel,
  riskCls,
  onClick,
}: {
  patient: { patientId: string; patientName: string; lastAnalysisDate?: string; tir?: number };
  riskLabel: string;
  riskCls: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
        <span className="text-white text-xs font-medium">
          {patient.patientName?.charAt(0)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900">{patient.patientName}</p>
        <div className="flex items-center gap-2">
          {patient.lastAnalysisDate && (
            <span className="text-xs text-slate-400">
              {new Date(patient.lastAnalysisDate).toLocaleDateString('ko-KR')}
            </span>
          )}
          {patient.tir != null && (
            <span className="text-xs text-slate-400">TIR {patient.tir}%</span>
          )}
        </div>
      </div>
      <span
        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${riskCls}`}
      >
        {riskLabel}
      </span>
      <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
    </div>
  );
}

export default function RiskPatientsSection({
  highRisk,
  caution,
  patients,
  onPatientClick,
}: RiskPatientsSectionProps) {
  // New API mode: highRisk + caution arrays provided
  const useNewApi = highRisk !== undefined || caution !== undefined;
  const highList = highRisk ?? [];
  const cautionList = caution ?? [];
  const totalCount = highList.length + cautionList.length;

  // Legacy mode: patients array (old format)
  const legacyPatients = patients ?? [];
  const isEmpty = useNewApi ? totalCount === 0 : legacyPatients.length === 0;

  return (
    <section className="py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-6">
      {isEmpty ? (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              주의 환자
            </h2>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500">고위험 환자가 없습니다</p>
            <p className="text-xs text-slate-400 mt-1">모든 환자의 상태가 양호합니다</p>
          </div>
        </>
      ) : useNewApi ? (
        <>
          {/* High Risk Section */}
          {highList.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  위험 환자
                </h2>
                <span className="text-xs text-slate-500">{highList.length}명</span>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-red-200 divide-y divide-slate-100">
                {highList.map((p) => (
                  <PatientCard
                    key={p.patientId}
                    patient={p}
                    riskLabel="고위험"
                    riskCls="bg-red-100 text-red-700"
                    onClick={() => onPatientClick(p.patientId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Caution Section */}
          {cautionList.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                  주의 환자
                </h2>
                <span className="text-xs text-slate-500">{cautionList.length}명</span>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-amber-200 divide-y divide-slate-100">
                {cautionList.map((p) => (
                  <PatientCard
                    key={p.patientId}
                    patient={p}
                    riskLabel="주의"
                    riskCls="bg-amber-100 text-amber-700"
                    onClick={() => onPatientClick(p.patientId)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        // Legacy mode
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              주의 환자
            </h2>
            <span className="text-xs text-slate-500">{legacyPatients.length}명</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
            {legacyPatients.map((p) => {
              const risk = RISK_CONFIG[p.riskLevel] || RISK_CONFIG.high;
              return (
                <PatientCard
                  key={p.patientId}
                  patient={p}
                  riskLabel={risk.label}
                  riskCls={risk.cls}
                  onClick={() => onPatientClick(p.patientId)}
                />
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
