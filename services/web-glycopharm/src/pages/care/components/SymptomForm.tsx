import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

const SYMPTOM_OPTIONS = [
  { value: '어지러움', label: '어지러움' },
  { value: '식은땀', label: '식은땀' },
  { value: '손떨림', label: '손떨림' },
  { value: '피로', label: '피로' },
  { value: '두통', label: '두통' },
  { value: '갈증', label: '갈증' },
  { value: '기타', label: '기타' },
];

const SYMPTOM_SEVERITY_OPTIONS = [
  { value: 'mild', label: '경미' },
  { value: 'moderate', label: '보통' },
  { value: 'severe', label: '심함' },
];

interface SymptomFormProps {
  symOpen: boolean;
  setSymOpen: (v: boolean) => void;
  symptoms: string[];
  toggleSymptom: (v: string) => void;
  symSeverity: string;
  setSymSeverity: (v: string) => void;
  symDuration: string;
  setSymDuration: (v: string) => void;
}

export default function SymptomForm({
  symOpen, setSymOpen, symptoms, toggleSymptom, symSeverity, setSymSeverity, symDuration, setSymDuration,
}: SymptomFormProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() => setSymOpen(!symOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-amber-600">
          <AlertTriangle className="w-3.5 h-3.5" />
          증상 기록
          <span className="text-[10px] font-normal text-slate-400">
            {symOpen && symptoms.length > 0 ? `(${symptoms.length}개)` : '(선택)'}
          </span>
        </span>
        {symOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {symOpen && (
        <div className="mt-1 p-3 rounded-lg border border-amber-100 bg-white space-y-3">
          <div>
            <div className="flex flex-wrap gap-1.5">
              {SYMPTOM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleSymptom(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    symptoms.includes(opt.value)
                      ? 'bg-amber-50 border-amber-300 text-amber-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">심각도</label>
              <div className="flex gap-1">
                {SYMPTOM_SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSymSeverity(opt.value)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      symSeverity === opt.value
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">지속 시간 (분)</label>
              <input
                type="number"
                value={symDuration}
                onChange={(e) => setSymDuration(e.target.value)}
                placeholder="예: 15"
                min="1"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
