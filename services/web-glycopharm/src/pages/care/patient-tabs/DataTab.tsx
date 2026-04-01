/**
 * DataTab - 건강 데이터 입력 + 최근 기록
 * WO-O4O-PATIENT-DETAIL-CARE-WORKSPACE-V1
 * WO-O4O-GLYCOPHARM-PHARMACIST-DATA-ENTRY-METADATA-EXPANSION-V1
 * WO-O4O-CARE-DATA-INPUT-REFINEMENT-V1
 * WO-O4O-CARE-DATATAB-COMPONENT-SPLIT-V1 (UI 분리)
 *
 * API:
 *   POST /api/v1/care/health-readings → 데이터 입력
 *   GET  /api/v1/care/health-readings/:patientId → 기록 조회
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Loader2, CheckCircle } from 'lucide-react';
import { pharmacyApi, type HealthReadingDto } from '@/api/pharmacy';
import { usePatientDetail } from '../PatientDetailPage';
import { MEAL_TIMING_LABELS } from '@/constants/meal-timing';
import { extractMetadata } from '@/utils/extract-metadata';

// ── Sub-components ──
import EventTimeSelector from '../components/EventTimeSelector';
import GlucoseForm, { MEAL_TIMING_OPTIONS } from '../components/GlucoseForm';
import VitalForm from '../components/VitalForm';
import MealForm, { MEAL_TYPE_OPTIONS } from '../components/MealForm';
import MedicationForm, { EMPTY_MEDICATION } from '../components/MedicationForm';
import type { MedicationItem } from '@/utils/extract-metadata';
import ExerciseForm, { EXERCISE_TYPES } from '../components/ExerciseForm';
import SymptomForm from '../components/SymptomForm';
import RecentRecordsSection, {
  type RecordEntryType,
  type DisplayEntry,
  TYPE_GROUP_ORDER,
} from '../components/RecentRecordsSection';

// ── Constants (used by orchestrator only) ──

const METRIC_OPTIONS = [
  { value: 'glucose', label: '혈당', unit: 'mg/dL' },
  { value: 'blood_pressure_systolic', label: '수축기 혈압', unit: 'mmHg' },
  { value: 'blood_pressure_diastolic', label: '이완기 혈압', unit: 'mmHg' },
  { value: 'weight', label: '체중', unit: 'kg' },
] as const;

// ── Label maps for buildDisplayEntries ──

const MEAL_AMOUNT_LABELS: Record<string, string> = {
  light: '소식', normal: '보통', heavy: '과식',
};

const SEVERITY_LABELS: Record<string, string> = {
  mild: '경미', moderate: '보통', severe: '심함',
};

// ── buildDisplayEntries (transforms readings → timeline entries) ──

function buildDisplayEntries(r: HealthReadingDto): DisplayEntry[] {
  const entries: DisplayEntry[] = [];
  const ts = new Date(r.measuredAt);
  const meta = extractMetadata(r.metadata);

  // Base metric
  if (r.metricType === 'glucose') {
    const timing = meta.mealTiming || '';
    const timingLabel = MEAL_TIMING_LABELS[timing] || '';
    const situation = meta.situation;
    const sitLabel = situation === 'suspected_hypoglycemia' ? ' · 저혈당 의심' : situation === 'suspected_hyperglycemia' ? ' · 고혈당 의심' : '';
    entries.push({
      id: `${r.id}-glucose`, timestamp: ts, entryType: 'glucose',
      label: `${Number(r.valueNumeric).toFixed(0)} mg/dL${timingLabel ? ` (${timingLabel})` : ''}${sitLabel}`,
    });
  } else if (r.metricType.startsWith('blood_pressure')) {
    const st = meta.state;
    const stLabel = st === 'after_activity' ? ' (활동 후)' : st === 'after_medication' ? ' (투약 후)' : '';
    entries.push({
      id: `${r.id}-bp`, timestamp: ts, entryType: 'blood_pressure',
      label: `${r.metricType === 'blood_pressure_systolic' ? '수축기' : '이완기'} ${Number(r.valueNumeric).toFixed(0)} mmHg${stLabel}`,
    });
  } else if (r.metricType === 'weight') {
    const tod = meta.timeOfDay;
    const todLabel = tod === 'morning' ? ' (아침)' : tod === 'evening' ? ' (저녁)' : '';
    entries.push({
      id: `${r.id}-weight`, timestamp: ts, entryType: 'weight',
      label: `${Number(r.valueNumeric).toFixed(1)} kg${todLabel}`,
    });
  }

  // Metadata entries
  if (meta.meal) {
    const typeLabel = MEAL_TYPE_OPTIONS.find(o => o.value === meta.meal!.type)?.label || meta.meal.type || '';
    const amtLabel = meta.meal.amount ? MEAL_AMOUNT_LABELS[meta.meal.amount] || '' : '';
    entries.push({
      id: `${r.id}-meal`, timestamp: ts, entryType: 'meal',
      label: `${typeLabel}${amtLabel ? ` / ${amtLabel}` : ''}`,
    });
  }

  for (const [mi, med] of meta.medications.entries()) {
    const parts = [med.name || ''];
    if (med.dose) parts.push(med.dose);
    if (med.taken === false) parts.push('(미복용)');
    const medTs = med.takenAt ? new Date(med.takenAt) : ts;
    entries.push({
      id: `${r.id}-med-${mi}`, timestamp: medTs, entryType: 'medication',
      label: parts.join(' '),
    });
  }

  if (meta.exercise) {
    const exLabel = EXERCISE_TYPES.find(o => o.value === meta.exercise!.type)?.label || meta.exercise.type || '';
    const tmLabel = meta.exercise.timing === 'after_meal' ? ' (식후)' : meta.exercise.timing === 'fasting' ? ' (공복)' : '';
    const exTs = (meta as any).exercise?.exercisedAt ? new Date((meta as any).exercise.exercisedAt) : ts;
    entries.push({
      id: `${r.id}-ex`, timestamp: exTs, entryType: 'exercise',
      label: `${exLabel}${meta.exercise.duration ? ` ${meta.exercise.duration}분` : ''}${tmLabel}`,
    });
  }

  // Symptoms (backward compat handled by extractMetadata)
  if (meta.symptoms && meta.symptoms.items.length > 0) {
    const { items, severity, duration } = meta.symptoms;
    const symTs = (r.metadata as Record<string, unknown>)?.symptomAt ? new Date(String((r.metadata as Record<string, unknown>).symptomAt)) : ts;
    entries.push({
      id: `${r.id}-sym`, timestamp: symTs, entryType: 'symptom',
      label: `${items.join(', ')}${severity ? ` [${SEVERITY_LABELS[severity] || severity}]` : ''}${duration ? ` ${duration}분` : ''}`,
    });
  }

  return entries;
}

// ═══════════════════════════════════════════════════════════════
// DataTab Component (Orchestrator)
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

  // ── Medication (다중 약품 배열) ──
  const [medOpen, setMedOpen] = useState(false);
  const [medications, setMedications] = useState<MedicationItem[]>([{ ...EMPTY_MEDICATION }]);

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

  // ── Recent records view state ──
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

      // Medications (다중 약품)
      if (medOpen) {
        const filled = medications
          .filter((m) => m.name?.trim())
          .map((m) => ({
            name: m.name!.trim(),
            dose: (m.dose || '').trim(),
            takenAt: m.takenAt || measuredAt,
            taken: m.taken !== false,
            timing: m.timing || 'after_meal',
            ...(m.note?.trim() ? { note: m.note.trim() } : {}),
          }));
        if (filled.length > 0) {
          metadata.medications = filled;
        }
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
      setMedications([{ ...EMPTY_MEDICATION }]);
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
            <EventTimeSelector
              measuredAt={measuredAt}
              setMeasuredAt={setMeasuredAt}
              timeEditOpen={timeEditOpen}
              setTimeEditOpen={setTimeEditOpen}
              resetMeasuredAtToNow={resetMeasuredAtToNow}
              formatMeasuredTime={formatMeasuredTime}
            />

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

          {/* ── Glucose Context ── */}
          {metricType === 'glucose' && (
            <GlucoseForm
              mealTiming={mealTiming}
              setMealTiming={setMealTiming}
              glucoseSituation={glucoseSituation}
              setGlucoseSituation={setGlucoseSituation}
            />
          )}

          {/* ── BP / Weight Context ── */}
          <VitalForm
            metricType={metricType}
            bpState={bpState}
            setBpState={setBpState}
            weightTimeOfDay={weightTimeOfDay}
            setWeightTimeOfDay={setWeightTimeOfDay}
          />

          {/* ── Collapsible Metadata Sections ── */}
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
            <MealForm
              mealOpen={mealOpen}
              setMealOpen={setMealOpen}
              mealType={mealType}
              setMealType={setMealType}
              mealStyle={mealStyle}
              setMealStyle={setMealStyle}
              mealAmount={mealAmount}
              setMealAmount={setMealAmount}
            />
            <MedicationForm
              medOpen={medOpen}
              setMedOpen={setMedOpen}
              medications={medications}
              setMedications={setMedications}
            />
            <ExerciseForm
              exOpen={exOpen}
              setExOpen={setExOpen}
              exType={exType}
              setExType={setExType}
              exDuration={exDuration}
              setExDuration={setExDuration}
              exIntensity={exIntensity}
              setExIntensity={setExIntensity}
              exTiming={exTiming}
              setExTiming={setExTiming}
            />
            <SymptomForm
              symOpen={symOpen}
              setSymOpen={setSymOpen}
              symptoms={symptoms}
              toggleSymptom={toggleSymptom}
              symSeverity={symSeverity}
              setSymSeverity={setSymSeverity}
              symDuration={symDuration}
              setSymDuration={setSymDuration}
            />
          </div>
        </form>
      </div>

      {/* Recent Readings */}
      <RecentRecordsSection
        loadingReadings={loadingReadings}
        viewMode={viewMode}
        setViewMode={setViewMode}
        recordFilter={recordFilter}
        setRecordFilter={setRecordFilter}
        displayEntries={displayEntries}
        dateGroups={dateGroups}
        typeGroups={typeGroups}
      />
    </div>
  );
}
