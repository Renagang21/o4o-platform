import { ToggleButton } from './ToggleButton';

export const MEAL_TIMING_OPTIONS = [
  { value: 'fasting', label: '공복' },
  { value: 'before_meal', label: '식전' },
  { value: 'after_meal_1h', label: '식후 1h' },
  { value: 'after_meal_2h', label: '식후 2h' },
  { value: 'bedtime', label: '취침 전' },
  { value: 'random', label: '기타' },
];

export const GLUCOSE_SITUATION_OPTIONS = [
  { value: 'normal', label: '일반' },
  { value: 'suspected_hypoglycemia', label: '저혈당 의심' },
  { value: 'suspected_hyperglycemia', label: '고혈당 의심' },
];

interface GlucoseFormProps {
  mealTiming: string;
  setMealTiming: (v: string) => void;
  glucoseSituation: string;
  setGlucoseSituation: (v: string) => void;
}

export default function GlucoseForm({ mealTiming, setMealTiming, glucoseSituation, setGlucoseSituation }: GlucoseFormProps) {
  return (
    <div className="mt-3 pt-3 border-t border-slate-100">
      <label className="block text-xs text-slate-500 mb-2">측정 구분</label>
      <div className="flex flex-wrap gap-1.5">
        {MEAL_TIMING_OPTIONS.map((opt) => (
          <ToggleButton
            key={opt.value}
            selected={mealTiming === opt.value}
            onClick={() => setMealTiming(opt.value)}
          >
            {opt.label}
          </ToggleButton>
        ))}
      </div>
      <label className="block text-xs text-slate-500 mb-2 mt-3">측정 상황</label>
      <div className="flex flex-wrap gap-1.5">
        {GLUCOSE_SITUATION_OPTIONS.map((opt) => (
          <ToggleButton
            key={opt.value}
            selected={glucoseSituation === opt.value}
            onClick={() => setGlucoseSituation(opt.value)}
          >
            {opt.label}
          </ToggleButton>
        ))}
      </div>
    </div>
  );
}
