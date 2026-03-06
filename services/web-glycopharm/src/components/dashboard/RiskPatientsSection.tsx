import { AlertTriangle, ChevronRight, CheckCircle } from 'lucide-react';

export interface RiskPatient {
  patientId: string;
  patientName: string;
  phone?: string;
  riskLevel: 'high' | 'moderate' | 'low';
  lastAnalysisDate?: string;
}

const RISK_CONFIG: Record<string, { label: string; cls: string }> = {
  high: { label: '고위험', cls: 'bg-red-100 text-red-700' },
  moderate: { label: '주의', cls: 'bg-amber-100 text-amber-700' },
  low: { label: '양호', cls: 'bg-green-100 text-green-700' },
};

interface RiskPatientsSectionProps {
  patients: RiskPatient[];
  onPatientClick: (patientId: string) => void;
}

export default function RiskPatientsSection({ patients, onPatientClick }: RiskPatientsSectionProps) {
  return (
    <section className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          주의 환자
        </h2>
        {patients.length > 0 && (
          <span className="text-xs text-slate-500">{patients.length}명</span>
        )}
      </div>

      {patients.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center">
          <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
          <p className="text-sm text-slate-500">고위험 환자가 없습니다</p>
          <p className="text-xs text-slate-400 mt-1">모든 환자의 상태가 양호합니다</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {patients.map((p) => {
            const risk = RISK_CONFIG[p.riskLevel] || RISK_CONFIG.high;
            return (
              <div
                key={p.patientId}
                onClick={() => onPatientClick(p.patientId)}
                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-medium">
                    {p.patientName?.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{p.patientName}</p>
                  {p.lastAnalysisDate && (
                    <p className="text-xs text-slate-400">
                      {new Date(p.lastAnalysisDate).toLocaleDateString('ko-KR')}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${risk.cls}`}
                >
                  {risk.label}
                </span>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
