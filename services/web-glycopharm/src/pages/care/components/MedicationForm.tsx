import { ChevronDown, ChevronUp, Pill } from 'lucide-react';

const MED_TIMING_OPTIONS = [
  { value: 'before_meal', label: '식전' },
  { value: 'after_meal', label: '식후' },
  { value: 'with_meal', label: '식사 중' },
];

interface MedicationFormProps {
  medOpen: boolean;
  setMedOpen: (v: boolean) => void;
  medName: string;
  setMedName: (v: string) => void;
  medDose: string;
  setMedDose: (v: string) => void;
  medTakenAt: string;
  setMedTakenAt: (v: string) => void;
  medTaken: boolean;
  setMedTaken: (v: boolean) => void;
  medTiming: string;
  setMedTiming: (v: string) => void;
  medNote: string;
  setMedNote: (v: string) => void;
}

export default function MedicationForm({
  medOpen, setMedOpen, medName, setMedName, medDose, setMedDose,
  medTakenAt, setMedTakenAt, medTaken, setMedTaken, medTiming, setMedTiming, medNote, setMedNote,
}: MedicationFormProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() => setMedOpen(!medOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-violet-600">
          <Pill className="w-3.5 h-3.5" />
          투약 기록
          <span className="text-[10px] font-normal text-slate-400">
            {medOpen && medName.trim() ? `(${medName.trim()})` : '(선택)'}
          </span>
        </span>
        {medOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {medOpen && (
        <div className="mt-1 space-y-3 p-3 rounded-lg border border-violet-100 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">약품명</label>
              <input
                type="text"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                placeholder="예: 메트포르민"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">용량</label>
              <input
                type="text"
                value={medDose}
                onChange={(e) => setMedDose(e.target.value)}
                placeholder="예: 500mg 1정"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">복용 시간</label>
              <input
                type="datetime-local"
                value={medTakenAt}
                onChange={(e) => setMedTakenAt(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">복용 여부</label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setMedTaken(true)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    medTaken
                      ? 'bg-violet-50 border-violet-300 text-violet-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  복용함
                </button>
                <button
                  type="button"
                  onClick={() => setMedTaken(false)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    !medTaken
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  미복용
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">복용 시점</label>
              <div className="flex gap-1">
                {MED_TIMING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMedTiming(opt.value)}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      medTiming === opt.value
                        ? 'bg-violet-50 border-violet-300 text-violet-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">비고</label>
              <input
                type="text"
                value={medNote}
                onChange={(e) => setMedNote(e.target.value)}
                placeholder="참고 사항"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
