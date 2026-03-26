import { ToggleButton } from './ToggleButton';

const BP_STATE_OPTIONS = [
  { value: 'resting', label: '안정시' },
  { value: 'after_activity', label: '활동 후' },
  { value: 'after_medication', label: '투약 후' },
];

const WEIGHT_TIME_OPTIONS = [
  { value: 'morning', label: '아침' },
  { value: 'evening', label: '저녁' },
];

interface VitalFormProps {
  metricType: string;
  bpState: string;
  setBpState: (v: string) => void;
  weightTimeOfDay: string;
  setWeightTimeOfDay: (v: string) => void;
}

export default function VitalForm({ metricType, bpState, setBpState, weightTimeOfDay, setWeightTimeOfDay }: VitalFormProps) {
  if (metricType === 'blood_pressure_systolic' || metricType === 'blood_pressure_diastolic') {
    return (
      <div className="mt-3 pt-3 border-t border-slate-100">
        <label className="block text-xs text-slate-500 mb-2">측정 상태</label>
        <div className="flex flex-wrap gap-1.5">
          {BP_STATE_OPTIONS.map((opt) => (
            <ToggleButton
              key={opt.value}
              selected={bpState === opt.value}
              onClick={() => setBpState(opt.value)}
            >
              {opt.label}
            </ToggleButton>
          ))}
        </div>
      </div>
    );
  }

  if (metricType === 'weight') {
    return (
      <div className="mt-3 pt-3 border-t border-slate-100">
        <label className="block text-xs text-slate-500 mb-2">측정 시간대</label>
        <div className="flex flex-wrap gap-1.5">
          {WEIGHT_TIME_OPTIONS.map((opt) => (
            <ToggleButton
              key={opt.value}
              selected={weightTimeOfDay === opt.value}
              onClick={() => setWeightTimeOfDay(opt.value)}
            >
              {opt.label}
            </ToggleButton>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
