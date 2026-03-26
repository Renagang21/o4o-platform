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

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Clock,
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

// ── Record display helpers (WO-O4O-CARE-RECENT-RECORDS-UI-REFACTOR-V1) ──

type RecordEntryType = 'glucose' | 'blood_pressure' | 'weight' | 'meal' | 'medication' | 'exercise' | 'symptom';

interface DisplayEntry {
  id: string;
  timestamp: Date;
  entryType: RecordEntryType;
  label: string;
}

const ENTRY_TYPE_CONFIG: Record<RecordEntryType, { tag: string; bg: string; text: string }> = {
  glucose: { tag: '혈당', bg: 'bg-blue-50', text: 'text-blue-600' },
  blood_pressure: { tag: '혈압', bg: 'bg-pink-50', text: 'text-pink-600' },
  weight: { tag: '체중', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  meal: { tag: '식사', bg: 'bg-orange-50', text: 'text-orange-600' },
  medication: { tag: '투약', bg: 'bg-violet-50', text: 'text-violet-600' },
  exercise: { tag: '운동', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  symptom: { tag: '증상', bg: 'bg-amber-50', text: 'text-amber-700' },
};

const RECORD_FILTER_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'glucose', label: '혈당' },
  { value: 'meal', label: '식사' },
  { value: 'medication', label: '투약' },
  { value: 'exercise', label: '운동' },
  { value: 'symptom', label: '증상' },
  { value: 'blood_pressure', label: '혈압' },
  { value: 'weight', label: '체중' },
];

const MEAL_AMOUNT_LABELS: Record<string, string> = {
  light: '소식', normal: '보통', heavy: '과식',
};

const SEVERITY_LABELS: Record<string, string> = {
  mild: '경미', moderate: '보통', severe: '심함',
};

const TYPE_GROUP_ORDER: RecordEntryType[] = ['glucose', 'meal', 'medication', 'exercise', 'symptom', 'blood_pressure', 'weight'];

function buildDisplayEntries(r: HealthReadingDto): DisplayEntry[] {
  const entries: DisplayEntry[] = [];
  const ts = new Date(r.measuredAt);
  const meta = r.metadata as Record<string, unknown> | undefined;

  // Base metric
  if (r.metricType === 'glucose') {
    const timing = (meta?.mealTiming as string) || '';
    const timingLabel = MEAL_TIMING_LABELS[timing] || '';
    const situation = meta?.situation as string;
    const sitLabel = situation === 'suspected_hypoglycemia' ? ' · 저혈당 의심' : situation === 'suspected_hyperglycemia' ? ' · 고혈당 의심' : '';
    entries.push({
      id: `${r.id}-glucose`, timestamp: ts, entryType: 'glucose',
      label: `${Number(r.valueNumeric).toFixed(0)} mg/dL${timingLabel ? ` (${timingLabel})` : ''}${sitLabel}`,
    });
  } else if (r.metricType.startsWith('blood_pressure')) {
    const st = meta?.state as string;
    const stLabel = st === 'after_activity' ? ' (활동 후)' : st === 'after_medication' ? ' (투약 후)' : '';
    entries.push({
      id: `${r.id}-bp`, timestamp: ts, entryType: 'blood_pressure',
      label: `${r.metricType === 'blood_pressure_systolic' ? '수축기' : '이완기'} ${Number(r.valueNumeric).toFixed(0)} mmHg${stLabel}`,
    });
  } else if (r.metricType === 'weight') {
    const tod = meta?.timeOfDay as string;
    const todLabel = tod === 'morning' ? ' (아침)' : tod === 'evening' ? ' (저녁)' : '';
    entries.push({
      id: `${r.id}-weight`, timestamp: ts, entryType: 'weight',
      label: `${Number(r.valueNumeric).toFixed(1)} kg${todLabel}`,
    });
  }

  // Metadata entries
  if (meta?.meal) {
    const meal = meta.meal as { type?: string; style?: string; amount?: string };
    const typeLabel = MEAL_TYPE_OPTIONS.find(o => o.value === meal.type)?.label || meal.type || '';
    const amtLabel = meal.amount ? MEAL_AMOUNT_LABELS[meal.amount] || '' : '';
    entries.push({
      id: `${r.id}-meal`, timestamp: ts, entryType: 'meal',
      label: `${typeLabel}${amtLabel ? ` / ${amtLabel}` : ''}`,
    });
  }

  if (meta?.medication) {
    const med = meta.medication as { name?: string; dose?: string; taken?: boolean };
    const parts = [med.name || ''];
    if (med.dose) parts.push(med.dose);
    if (med.taken === false) parts.push('(미복용)');
    entries.push({
      id: `${r.id}-med`, timestamp: ts, entryType: 'medication',
      label: parts.join(' '),
    });
  }

  if (meta?.exercise) {
    const ex = meta.exercise as { type?: string; duration?: number; timing?: string };
    const exLabel = EXERCISE_TYPES.find(o => o.value === ex.type)?.label || ex.type || '';
    const tmLabel = ex.timing === 'after_meal' ? ' (식후)' : ex.timing === 'fasting' ? ' (공복)' : '';
    entries.push({
      id: `${r.id}-ex`, timestamp: ts, entryType: 'exercise',
      label: `${exLabel}${ex.duration ? ` ${ex.duration}분` : ''}${tmLabel}`,
    });
  }

  // Symptoms (backward compat: string[] or { items, severity, duration })
  const sympRaw = meta?.symptoms;
  let symItems: string[] | undefined;
  let symSev: string | undefined;
  let symDur: number | undefined;
  if (Array.isArray(sympRaw)) {
    symItems = sympRaw;
  } else if (sympRaw && typeof sympRaw === 'object') {
    const so = sympRaw as { items?: string[]; severity?: string; duration?: number };
    symItems = so.items; symSev = so.severity; symDur = so.duration;
  }
  if (symItems && symItems.length > 0) {
    entries.push({
      id: `${r.id}-sym`, timestamp: ts, entryType: 'symptom',
      label: `${symItems.join(', ')}${symSev ? ` [${SEVERITY_LABELS[symSev] || symSev}]` : ''}${symDur ? ` ${symDur}분` : ''}`,
    });
  }

  return entries;
}

function getDateLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
  const base = `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()} (${weekdays[date.getDay()]})`;
  if (isSameDay(date, today)) return `오늘 · ${base}`;
  if (isSameDay(date, yesterday)) return `어제 · ${base}`;
  return base;
}

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
  const [timeEditOpen, setTimeEditOpen] = useState(false);

  const resetMeasuredAtToNow = useCallback(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setMeasuredAt(now.toISOString().slice(0, 16));
  }, []);

  const formatMeasuredTime = useCallback(() => {
    const d = new Date(measuredAt);
    if (isNaN(d.getTime())) return measuredAt;
    return d.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
  }, [measuredAt]);

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

  // ── Recent records view state (WO-O4O-CARE-RECENT-RECORDS-UI-REFACTOR-V1) ──
  const [viewMode, setViewMode] = useState<'by_date' | 'by_type'>('by_date');
  const [recordFilter, setRecordFilter] = useState('all');

  const displayEntries = useMemo(() => {
    const all: DisplayEntry[] = [];
    for (const r of readings) all.push(...buildDisplayEntries(r));
    return recordFilter === 'all' ? all : all.filter(e => e.entryType === recordFilter);
  }, [readings, recordFilter]);

  const dateGroups = useMemo(() => {
    const grouped = new Map<string, { date: Date; entries: DisplayEntry[] }>();
    for (const entry of displayEntries) {
      const y = entry.timestamp.getFullYear();
      const m = String(entry.timestamp.getMonth() + 1).padStart(2, '0');
      const d = String(entry.timestamp.getDate()).padStart(2, '0');
      const key = `${y}-${m}-${d}`;
      if (!grouped.has(key)) grouped.set(key, { date: new Date(y, entry.timestamp.getMonth(), entry.timestamp.getDate()), entries: [] });
      grouped.get(key)!.entries.push(entry);
    }
    for (const [, g] of grouped) g.entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return [...grouped.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([, g]) => g);
  }, [displayEntries]);

  const typeGroups = useMemo(() => {
    const grouped = new Map<RecordEntryType, DisplayEntry[]>();
    for (const entry of displayEntries) {
      if (!grouped.has(entry.entryType)) grouped.set(entry.entryType, []);
      grouped.get(entry.entryType)!.push(entry);
    }
    for (const [, entries] of grouped) entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return TYPE_GROUP_ORDER.filter(t => grouped.has(t)).map(t => ({ type: t, entries: grouped.get(t)! }));
  }, [displayEntries]);

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
      setTimeEditOpen(false);
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

            {/* Measured At — collapsible time picker (WO-O4O-CARE-EVENT-TIME-ENHANCEMENT-V1) */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">측정 일시</label>
              {timeEditOpen ? (
                <div className="space-y-1.5">
                  <input
                    type="datetime-local"
                    value={measuredAt}
                    onChange={(e) => setMeasuredAt(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    required
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { resetMeasuredAtToNow(); setTimeEditOpen(false); }}
                      className="text-xs text-slate-500 hover:text-primary-600 transition-colors"
                    >
                      지금으로
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimeEditOpen(false)}
                      className="text-xs text-primary-600 font-medium hover:underline"
                    >
                      확인
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setTimeEditOpen(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white hover:bg-slate-50 transition-colors text-left"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-slate-700">{formatMeasuredTime()}</span>
                  <span className="text-xs text-primary-500 ml-auto flex-shrink-0">수정</span>
                </button>
              )}
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

      {/* Recent Readings — WO-O4O-CARE-RECENT-RECORDS-UI-REFACTOR-V1 */}
      <div>
        {/* Header + Tabs + Filter */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider">최근 기록</h3>
            <div className="flex gap-0.5 bg-slate-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('by_date')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'by_date' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                일자별
              </button>
              <button
                type="button"
                onClick={() => setViewMode('by_type')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  viewMode === 'by_type' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                항목별
              </button>
            </div>
          </div>
          <select
            value={recordFilter}
            onChange={(e) => setRecordFilter(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {RECORD_FILTER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Content */}
        {loadingReadings ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : displayEntries.length === 0 ? (
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center min-h-[160px]">
            <ClipboardPlus className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">
              {recordFilter !== 'all' ? '해당 항목의 기록이 없습니다.' : '최근 기록이 없습니다.'}
            </p>
            <p className="text-xs text-slate-400 mt-1">위 양식으로 첫 데이터를 입력해 보세요.</p>
          </div>
        ) : viewMode === 'by_date' ? (
          /* ── Date view ── */
          <div className="space-y-3">
            {dateGroups.map((group) => (
              <div key={group.date.toISOString()} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-600">{getDateLabel(group.date)}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {group.entries.map((entry) => {
                    const cfg = ENTRY_TYPE_CONFIG[entry.entryType];
                    return (
                      <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-xs text-slate-400 w-11 flex-shrink-0 tabular-nums">
                          {entry.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${cfg.bg} ${cfg.text} flex-shrink-0`}>
                          {cfg.tag}
                        </span>
                        <span className="text-sm text-slate-700 truncate">{entry.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Type view ── */
          <div className="space-y-3">
            {typeGroups.map(({ type, entries }) => {
              const cfg = ENTRY_TYPE_CONFIG[type];
              return (
                <div key={type} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div className={`px-4 py-2.5 border-b border-slate-100 flex items-center gap-2 ${cfg.bg}`}>
                    <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.tag}</span>
                    <span className="text-[10px] text-slate-400">{entries.length}건</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {entries.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="text-xs text-slate-400 w-24 flex-shrink-0 tabular-nums">
                          {entry.timestamp.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}{' '}
                          {entry.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                        <span className="text-sm text-slate-700 truncate">{entry.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
