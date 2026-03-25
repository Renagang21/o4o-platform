/**
 * DataTab - 건강 데이터 입력 + 최근 기록
 * WO-O4O-PATIENT-DETAIL-CARE-WORKSPACE-V1
 * WO-O4O-GLYCOPHARM-PHARMACIST-DATA-ENTRY-METADATA-EXPANSION-V1
 * WO-O4O-CARE-DATA-INPUT-REFINEMENT-V1
 *
 * API:
 *   POST /api/v1/care/health-readings → 데이터 입력
 *   GET  /api/v1/care/health-readings/:patientId → 기록 조회
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Loader2,
  CheckCircle,
  ClipboardPlus,
  ChevronDown,
  ChevronUp,
  Pill,
  Footprints,
  AlertTriangle,
  Utensils,
} from 'lucide-react';
import { pharmacyApi, type HealthReadingDto } from '@/api/pharmacy';
import { usePatientDetail } from '../PatientDetailPage';

// ── Constants ──

const METRIC_OPTIONS = [
  { value: 'glucose', label: '혈당', unit: 'mg/dL' },
  { value: 'blood_pressure_systolic', label: '수축기 혈압', unit: 'mmHg' },
  { value: 'blood_pressure_diastolic', label: '이완기 혈압', unit: 'mmHg' },
  { value: 'weight', label: '체중', unit: 'kg' },
] as const;

const METRIC_LABELS: Record<string, string> = {
  glucose: '혈당',
  blood_pressure_systolic: '수축기 혈압',
  blood_pressure_diastolic: '이완기 혈압',
  weight: '체중',
};

const MEAL_TIMING_OPTIONS = [
  { value: 'fasting', label: '공복' },
  { value: 'before_meal', label: '식전' },
  { value: 'after_meal_1h', label: '식후 1h' },
  { value: 'after_meal_2h', label: '식후 2h' },
  { value: 'bedtime', label: '취침 전' },
  { value: 'random', label: '기타' },
];

const GLUCOSE_SITUATION_OPTIONS = [
  { value: 'normal', label: '일반' },
  { value: 'suspected_hypoglycemia', label: '저혈당 의심' },
  { value: 'suspected_hyperglycemia', label: '고혈당 의심' },
];

const MEAL_TYPE_OPTIONS = [
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

const EXERCISE_TYPES = [
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

const MED_TIMING_OPTIONS = [
  { value: 'before_meal', label: '식전' },
  { value: 'after_meal', label: '식후' },
  { value: 'with_meal', label: '식사 중' },
];

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

const BP_STATE_OPTIONS = [
  { value: 'resting', label: '안정시' },
  { value: 'after_activity', label: '활동 후' },
  { value: 'after_medication', label: '투약 후' },
];

const WEIGHT_TIME_OPTIONS = [
  { value: 'morning', label: '아침' },
  { value: 'evening', label: '저녁' },
];

// ── Table display helpers (backward compat) ──

const MEAL_TIMING_LABELS: Record<string, string> = {
  fasting: '공복',
  before_meal: '식전',
  after_meal: '식후',
  after_meal_1h: '식후 1h',
  after_meal_2h: '식후 2h',
  bedtime: '취침 전',
  random: '기타',
};

// ── Toggle-button helper ──

function ToggleButton({ selected, onClick, children }: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
        selected
          ? 'bg-blue-50 border-blue-300 text-blue-700'
          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  );
}

function ToggleButtonColored({ selected, onClick, children, color }: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color: 'emerald' | 'violet' | 'amber' | 'orange';
}) {
  const cls = selected
    ? `bg-${color}-50 border-${color}-300 text-${color}-700`
    : 'border-slate-200 text-slate-500 hover:bg-slate-50';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// DataTab Component
// ═══════════════════════════════════════════════════════════════

export default function DataTab() {
  const { patient, reload } = usePatientDetail();

  const [readings, setReadings] = useState<HealthReadingDto[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(true);

  // Form state
  const [metricType, setMetricType] = useState('glucose');
  const [value, setValue] = useState('');
  const [measuredAt, setMeasuredAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Metric-specific Context ──
  const [mealTiming, setMealTiming] = useState('fasting');
  const [glucoseSituation, setGlucoseSituation] = useState('normal');
  const [bpState, setBpState] = useState('resting');
  const [weightTimeOfDay, setWeightTimeOfDay] = useState('morning');

  // ── Meal ──
  const [mealOpen, setMealOpen] = useState(false);
  const [mealType, setMealType] = useState('breakfast');
  const [mealStyle, setMealStyle] = useState('korean');
  const [mealAmount, setMealAmount] = useState('normal');

  // ── Medication ──
  const [medOpen, setMedOpen] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medTakenAt, setMedTakenAt] = useState('');
  const [medTaken, setMedTaken] = useState(true);
  const [medTiming, setMedTiming] = useState('after_meal');
  const [medNote, setMedNote] = useState('');

  // ── Exercise ──
  const [exOpen, setExOpen] = useState(false);
  const [exType, setExType] = useState('walking');
  const [exDuration, setExDuration] = useState('');
  const [exIntensity, setExIntensity] = useState('moderate');
  const [exTiming, setExTiming] = useState('normal');

  // ── Symptoms ──
  const [symOpen, setSymOpen] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symSeverity, setSymSeverity] = useState('mild');
  const [symDuration, setSymDuration] = useState('');

  const toggleSymptom = (v: string) => {
    setSymptoms((prev) => prev.includes(v) ? prev.filter((s) => s !== v) : [...prev, v]);
  };

  const selectedMetric = METRIC_OPTIONS.find(m => m.value === metricType) || METRIC_OPTIONS[0];

  const loadReadings = useCallback(async () => {
    if (!patient?.id) return;
    setLoadingReadings(true);
    try {
      const data = await pharmacyApi.getHealthReadings(patient.id);
      setReadings(Array.isArray(data) ? data : []);
    } catch {
      setReadings([]);
    } finally {
      setLoadingReadings(false);
    }
  }, [patient?.id]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patient?.id || !value || saving) return;

    setSaving(true);
    try {
      // ── Build metadata ──
      const metadata: Record<string, unknown> = {};

      // Glucose context
      if (metricType === 'glucose') {
        metadata.mealTiming = mealTiming;
        metadata.mealTimingLabel = MEAL_TIMING_OPTIONS.find((o) => o.value === mealTiming)?.label || '';
        if (glucoseSituation !== 'normal') {
          metadata.situation = glucoseSituation;
        }
      }

      // BP context
      if (metricType === 'blood_pressure_systolic' || metricType === 'blood_pressure_diastolic') {
        if (bpState !== 'resting') {
          metadata.state = bpState;
        }
      }

      // Weight context
      if (metricType === 'weight') {
        metadata.timeOfDay = weightTimeOfDay;
      }

      // Meal
      if (mealOpen) {
        metadata.meal = {
          type: mealType,
          style: mealStyle,
          amount: mealAmount,
        };
      }

      // Medication
      if (medOpen && medName.trim()) {
        metadata.medication = {
          name: medName.trim(),
          dose: medDose.trim(),
          takenAt: medTakenAt || measuredAt,
          taken: medTaken,
          timing: medTiming,
          ...(medNote.trim() ? { note: medNote.trim() } : {}),
        };
      }

      // Exercise
      if (exOpen && exDuration) {
        const dur = Number(exDuration);
        if (dur > 0) {
          metadata.exercise = {
            type: exType,
            duration: dur,
            intensity: exIntensity,
            timing: exTiming,
          };
        }
      }

      // Symptoms — structured format
      if (symOpen && symptoms.length > 0) {
        metadata.symptoms = {
          items: symptoms,
          severity: symSeverity,
          ...(symDuration ? { duration: Number(symDuration) } : {}),
        };
      }

      await pharmacyApi.postHealthReading({
        patientId: patient.id,
        metricType,
        valueNumeric: Number(value),
        unit: selectedMetric.unit,
        measuredAt: new Date(measuredAt).toISOString(),
        ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
      });

      // ── Reset ──
      setValue('');
      setMealTiming('fasting');
      setGlucoseSituation('normal');
      setBpState('resting');
      setWeightTimeOfDay('morning');
      setMealOpen(false);
      setMealType('breakfast');
      setMealStyle('korean');
      setMealAmount('normal');
      setMedOpen(false);
      setMedName('');
      setMedDose('');
      setMedTakenAt('');
      setMedTaken(true);
      setMedTiming('after_meal');
      setMedNote('');
      setExOpen(false);
      setExType('walking');
      setExDuration('');
      setExIntensity('moderate');
      setExTiming('normal');
      setSymOpen(false);
      setSymptoms([]);
      setSymSeverity('mild');
      setSymDuration('');

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      await loadReadings();
      reload();
    } catch {
      // error silenced — user sees no saved indicator
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div>
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">건강 데이터 입력</h3>
        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-xl border border-slate-100 p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Metric Type */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">측정 항목</label>
              <select
                value={metricType}
                onChange={(e) => setMetricType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {METRIC_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Value */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">측정값 ({selectedMetric.unit})</label>
              <input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="예: 120"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Measured At */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">측정 일시</label>
              <input
                type="datetime-local"
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>

            {/* Submit */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving || !value}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saved ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {saved ? '저장됨' : '저장'}
              </button>
            </div>
          </div>

          {/* ── Glucose Context: MealTiming + Situation ── */}
          {metricType === 'glucose' && (
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
          )}

          {/* ── BP Context: State ── */}
          {(metricType === 'blood_pressure_systolic' || metricType === 'blood_pressure_diastolic') && (
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
          )}

          {/* ── Weight Context: TimeOfDay ── */}
          {metricType === 'weight' && (
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
          )}

          {/* ── Collapsible Metadata Sections ── */}
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">

            {/* Meal */}
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

            {/* Medication */}
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

            {/* Exercise */}
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

            {/* Symptoms */}
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
          </div>
        </form>
      </div>

      {/* Recent Readings */}
      <div>
        <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4">최근 기록</h3>

        {loadingReadings ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : readings.length === 0 ? (
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[160px]">
            <ClipboardPlus className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">아직 기록이 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">위 양식으로 첫 데이터를 입력해 보세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">날짜</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">항목</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-slate-500 uppercase">값</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">단위</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">부가 정보</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">입력 방식</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => {
                  const meta = r.metadata as Record<string, unknown> | undefined;
                  const mealTimingVal = (meta?.mealTiming as string) || '';
                  const situation = meta?.situation as string | undefined;
                  const bpStateVal = meta?.state as string | undefined;
                  const timeOfDay = meta?.timeOfDay as string | undefined;
                  const meal = meta?.meal as { type?: string; style?: string; amount?: string } | undefined;
                  const medication = meta?.medication as { name?: string; dose?: string; taken?: boolean; timing?: string; note?: string } | undefined;
                  const exercise = meta?.exercise as { type?: string; duration?: number; timing?: string } | undefined;

                  // Backward compat: symptoms can be string[] (legacy) or {items, severity, duration} (new)
                  const symptomsRaw = meta?.symptoms;
                  let symptomItems: string[] | undefined;
                  let symptomSeverity: string | undefined;
                  let symptomDuration: number | undefined;
                  if (Array.isArray(symptomsRaw)) {
                    symptomItems = symptomsRaw as string[];
                  } else if (symptomsRaw && typeof symptomsRaw === 'object') {
                    const so = symptomsRaw as { items?: string[]; severity?: string; duration?: number };
                    symptomItems = so.items;
                    symptomSeverity = so.severity;
                    symptomDuration = so.duration;
                  }

                  const hasMeta = mealTimingVal || situation || bpStateVal || timeOfDay || meal ||
                    medication?.name || exercise?.type || (symptomItems && symptomItems.length > 0);

                  const SITUATION_LABELS: Record<string, string> = {
                    suspected_hypoglycemia: '저혈당 의심',
                    suspected_hyperglycemia: '고혈당 의심',
                  };
                  const BP_STATE_LABELS: Record<string, string> = {
                    after_activity: '활동 후',
                    after_medication: '투약 후',
                  };
                  const TIME_OF_DAY_LABELS: Record<string, string> = {
                    morning: '아침',
                    evening: '저녁',
                  };
                  const MEAL_AMOUNT_LABELS: Record<string, string> = {
                    light: '소식',
                    normal: '보통',
                    heavy: '과식',
                  };
                  const SEVERITY_LABELS: Record<string, string> = {
                    mild: '경미',
                    moderate: '보통',
                    severe: '심함',
                  };

                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {new Date(r.measuredAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium whitespace-nowrap">
                        {METRIC_LABELS[r.metricType] || r.metricType}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-800 font-bold tabular-nums">
                        {r.valueNumeric != null ? Number(r.valueNumeric).toFixed(1) : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{r.unit}</td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {mealTimingVal && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                              {MEAL_TIMING_LABELS[mealTimingVal] || mealTimingVal}
                            </span>
                          )}
                          {situation && SITUATION_LABELS[situation] && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-red-50 text-red-600">
                              {SITUATION_LABELS[situation]}
                            </span>
                          )}
                          {bpStateVal && BP_STATE_LABELS[bpStateVal] && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-pink-50 text-pink-600">
                              {BP_STATE_LABELS[bpStateVal]}
                            </span>
                          )}
                          {timeOfDay && TIME_OF_DAY_LABELS[timeOfDay] && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-50 text-indigo-600">
                              {TIME_OF_DAY_LABELS[timeOfDay]}
                            </span>
                          )}
                          {meal?.type && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-orange-50 text-orange-600">
                              식사 {MEAL_TYPE_OPTIONS.find(o => o.value === meal.type)?.label || meal.type}
                              {meal.amount ? ` ${MEAL_AMOUNT_LABELS[meal.amount] || meal.amount}` : ''}
                            </span>
                          )}
                          {medication?.name && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-600">
                              {medication.taken === false ? '미복용' : '투약'} {medication.name}{medication.dose ? ` ${medication.dose}` : ''}
                            </span>
                          )}
                          {exercise?.type && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-50 text-green-600">
                              운동 {exercise.type}{exercise.duration ? ` ${exercise.duration}분` : ''}
                              {exercise.timing === 'after_meal' ? ' (식후)' : exercise.timing === 'fasting' ? ' (공복)' : ''}
                            </span>
                          )}
                          {symptomItems && symptomItems.length > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-50 text-amber-700">
                              증상 {symptomItems.join(', ')}
                              {symptomSeverity ? ` [${SEVERITY_LABELS[symptomSeverity] || symptomSeverity}]` : ''}
                              {symptomDuration ? ` ${symptomDuration}분` : ''}
                            </span>
                          )}
                          {!hasMeta && (
                            <span className="text-xs text-slate-300">-</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                          {r.sourceType === 'manual' ? '수동 입력' : r.sourceType}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
