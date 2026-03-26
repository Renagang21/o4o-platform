import { ChevronDown, ChevronUp, Footprints } from 'lucide-react';

export const EXERCISE_TYPES = [
  { value: 'walking', label: '걷기' },
  { value: 'running', label: '달리기' },
  { value: 'cycling', label: '자전거' },
  { value: 'swimming', label: '수영' },
  { value: 'strength', label: '근력운동' },
  { value: 'yoga', label: '요가/스트레칭' },
  { value: 'other', label: '기타' },
];

const INTENSITY_OPTIONS = [
  { value: 'light', label: '가볍게' },
  { value: 'moderate', label: '보통' },
  { value: 'vigorous', label: '격렬하게' },
];

const EXERCISE_TIMING_OPTIONS = [
  { value: 'normal', label: '일반' },
  { value: 'after_meal', label: '식후' },
  { value: 'fasting', label: '공복' },
];

interface ExerciseFormProps {
  exOpen: boolean;
  setExOpen: (v: boolean) => void;
  exType: string;
  setExType: (v: string) => void;
  exDuration: string;
  setExDuration: (v: string) => void;
  exIntensity: string;
  setExIntensity: (v: string) => void;
  exTiming: string;
  setExTiming: (v: string) => void;
}

export default function ExerciseForm({
  exOpen, setExOpen, exType, setExType, exDuration, setExDuration, exIntensity, setExIntensity, exTiming, setExTiming,
}: ExerciseFormProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() => setExOpen(!exOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
          <Footprints className="w-3.5 h-3.5" />
          운동 기록
          <span className="text-[10px] font-normal text-slate-400">
            {exOpen && exDuration && Number(exDuration) > 0 ? `(${exDuration}분)` : '(선택)'}
          </span>
        </span>
        {exOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {exOpen && (
        <div className="mt-1 space-y-3 p-3 rounded-lg border border-emerald-100 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">운동 종류</label>
              <select
                value={exType}
                onChange={(e) => setExType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {EXERCISE_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">시간 (분)</label>
              <input
                type="number"
                value={exDuration}
                onChange={(e) => setExDuration(e.target.value)}
                placeholder="예: 30"
                min="1"
                max="600"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">강도</label>
              <div className="flex gap-1">
                {INTENSITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExIntensity(opt.value)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${
                      exIntensity === opt.value
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">운동 시점</label>
            <div className="flex gap-1">
              {EXERCISE_TIMING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExTiming(opt.value)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    exTiming === opt.value
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
