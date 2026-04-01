import { ChevronDown, ChevronUp, Pill, Plus, X } from 'lucide-react';
import type { MedicationItem } from '@/utils/extract-metadata';

const MED_TIMING_OPTIONS = [
  { value: 'before_meal', label: '식전' },
  { value: 'after_meal', label: '식후' },
  { value: 'with_meal', label: '식사 중' },
];

export const EMPTY_MEDICATION: MedicationItem = {
  name: '',
  dose: '',
  takenAt: '',
  taken: true,
  timing: 'after_meal',
  note: '',
};

interface MedicationFormProps {
  medOpen: boolean;
  setMedOpen: (v: boolean) => void;
  medications: MedicationItem[];
  setMedications: (meds: MedicationItem[]) => void;
}

export default function MedicationForm({
  medOpen, setMedOpen, medications, setMedications,
}: MedicationFormProps) {
  const updateItem = (index: number, field: keyof MedicationItem, value: unknown) => {
    const next = medications.map((m, i) => (i === index ? { ...m, [field]: value } : m));
    setMedications(next);
  };

  const addItem = () => {
    setMedications([...medications, { ...EMPTY_MEDICATION }]);
  };

  const removeItem = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  // 헤더 요약: 입력된 약품명 표시
  const filledNames = medications.map((m) => m.name?.trim()).filter(Boolean);
  const summary = filledNames.length > 0
    ? `(${filledNames.slice(0, 2).join(', ')}${filledNames.length > 2 ? ` +${filledNames.length - 2}` : ''})`
    : '(선택)';

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
            {medOpen ? summary : summary}
          </span>
        </span>
        {medOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {medOpen && (
        <div className="mt-1 space-y-3 p-3 rounded-lg border border-violet-100 bg-white">
          {medications.map((med, idx) => (
            <div key={idx} className="relative space-y-3">
              {/* 약품 헤더 */}
              {medications.length > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-violet-500">
                    약품 {idx + 1}{med.name?.trim() ? ` — ${med.name.trim()}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="약품 삭제"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {/* 단일 약품일 때도 삭제 가능 */}
              {medications.length === 1 && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="p-0.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="약품 삭제"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">약품명</label>
                  <input
                    type="text"
                    value={med.name || ''}
                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                    placeholder="예: 메트포르민"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">용량</label>
                  <input
                    type="text"
                    value={med.dose || ''}
                    onChange={(e) => updateItem(idx, 'dose', e.target.value)}
                    placeholder="예: 500mg 1정"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">복용 시간</label>
                  <input
                    type="datetime-local"
                    value={med.takenAt || ''}
                    onChange={(e) => updateItem(idx, 'takenAt', e.target.value)}
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
                      onClick={() => updateItem(idx, 'taken', true)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        med.taken !== false
                          ? 'bg-violet-50 border-violet-300 text-violet-700'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      복용함
                    </button>
                    <button
                      type="button"
                      onClick={() => updateItem(idx, 'taken', false)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        med.taken === false
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
                        onClick={() => updateItem(idx, 'timing', opt.value)}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                          (med.timing || 'after_meal') === opt.value
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
                    value={med.note || ''}
                    onChange={(e) => updateItem(idx, 'note', e.target.value)}
                    placeholder="참고 사항"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                </div>
              </div>
              {/* 구분선 (마지막 아이템 제외) */}
              {idx < medications.length - 1 && (
                <hr className="border-violet-100" />
              )}
            </div>
          ))}
          {/* 약품 추가 버튼 */}
          <button
            type="button"
            onClick={addItem}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-violet-600 rounded-lg border border-dashed border-violet-200 hover:bg-violet-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            약품 추가
          </button>
        </div>
      )}
    </div>
  );
}
