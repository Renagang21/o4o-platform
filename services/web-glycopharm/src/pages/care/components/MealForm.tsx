import { ChevronDown, ChevronUp, Utensils } from 'lucide-react';

export const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: '아침' },
  { value: 'lunch', label: '점심' },
  { value: 'dinner', label: '저녁' },
  { value: 'snack', label: '간식' },
];

const MEAL_STYLE_OPTIONS = [
  { value: 'korean', label: '한식' },
  { value: 'western', label: '양식' },
  { value: 'japanese', label: '일식' },
  { value: 'chinese', label: '중식' },
  { value: 'other', label: '기타' },
];

const MEAL_AMOUNT_OPTIONS = [
  { value: 'light', label: '소식' },
  { value: 'normal', label: '보통' },
  { value: 'heavy', label: '과식' },
];

interface MealFormProps {
  mealOpen: boolean;
  setMealOpen: (v: boolean) => void;
  mealType: string;
  setMealType: (v: string) => void;
  mealStyle: string;
  setMealStyle: (v: string) => void;
  mealAmount: string;
  setMealAmount: (v: string) => void;
}

export default function MealForm({
  mealOpen, setMealOpen, mealType, setMealType, mealStyle, setMealStyle, mealAmount, setMealAmount,
}: MealFormProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() => setMealOpen(!mealOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <span className="flex items-center gap-2 text-xs font-semibold text-orange-600">
          <Utensils className="w-3.5 h-3.5" />
          식사 기록
          <span className="text-[10px] font-normal text-slate-400">
            {mealOpen ? `(${MEAL_TYPE_OPTIONS.find(o => o.value === mealType)?.label})` : '(선택)'}
          </span>
        </span>
        {mealOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {mealOpen && (
        <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border border-orange-100 bg-white">
          <div>
            <label className="block text-xs text-slate-500 mb-1">식사 종류</label>
            <div className="flex flex-wrap gap-1">
              {MEAL_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMealType(opt.value)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    mealType === opt.value
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">식사 스타일</label>
            <select
              value={mealStyle}
              onChange={(e) => setMealStyle(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              {MEAL_STYLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">식사량</label>
            <div className="flex gap-1">
              {MEAL_AMOUNT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMealAmount(opt.value)}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    mealAmount === opt.value
                      ? 'bg-orange-50 border-orange-300 text-orange-700'
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
