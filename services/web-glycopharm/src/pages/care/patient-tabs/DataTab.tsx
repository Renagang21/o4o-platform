/**
 * DataTab - 건강 데이터 입력 + 최근 기록
 * WO-O4O-PATIENT-DETAIL-CARE-WORKSPACE-V1
 * WO-O4O-GLYCOPHARM-PHARMACIST-DATA-ENTRY-METADATA-EXPANSION-V1
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
  { value: 'after_meal', label: '식후' },
  { value: 'bedtime', label: '취침 전' },
  { value: 'random', label: '기타' },
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

const SYMPTOM_OPTIONS = [
  { value: '어지러움', label: '어지러움' },
  { value: '식은땀', label: '식은땀' },
  { value: '손떨림', label: '손떨림' },
  { value: '피로', label: '피로' },
  { value: '두통', label: '두통' },
  { value: '갈증', label: '갈증' },
  { value: '기타', label: '기타' },
];

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

  // ── Metadata Form State ──
  const [mealTiming, setMealTiming] = useState('fasting');

  const [medOpen, setMedOpen] = useState(false);
  const [medName, setMedName] = useState('');
  const [medDose, setMedDose] = useState('');
  const [medTakenAt, setMedTakenAt] = useState('');

  const [exOpen, setExOpen] = useState(false);
  const [exType, setExType] = useState('walking');
  const [exDuration, setExDuration] = useState('');
  const [exIntensity, setExIntensity] = useState('moderate');

  const [symOpen, setSymOpen] = useState(false);
  const [symptoms, setSymptoms] = useState<string[]>([]);

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

      if (metricType === 'glucose') {
        metadata.mealTiming = mealTiming;
        metadata.mealTimingLabel = MEAL_TIMING_OPTIONS.find((o) => o.value === mealTiming)?.label || '';
      }
      if (medOpen && medName.trim()) {
        metadata.medication = {
          name: medName.trim(),
          dose: medDose.trim(),
          takenAt: medTakenAt || measuredAt,
        };
      }
      if (exOpen && exDuration) {
        const dur = Number(exDuration);
        if (dur > 0) {
          metadata.exercise = { type: exType, duration: dur, intensity: exIntensity };
        }
      }
      if (symOpen && symptoms.length > 0) {
        metadata.symptoms = symptoms;
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
      setMedOpen(false);
      setMedName('');
      setMedDose('');
      setMedTakenAt('');
      setExOpen(false);
      setExType('walking');
      setExDuration('');
      setExIntensity('moderate');
      setSymOpen(false);
      setSymptoms([]);

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

          {/* ── MealTiming (glucose only) ── */}
          {metricType === 'glucose' && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <label className="block text-xs text-slate-500 mb-2">측정 구분</label>
              <div className="flex flex-wrap gap-1.5">
                {MEAL_TIMING_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMealTiming(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      mealTiming === opt.value
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Collapsible Metadata Sections ── */}
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
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
                <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border border-violet-100 bg-white">
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
                <div className="mt-1 grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-lg border border-emerald-100 bg-white">
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
                <div className="mt-1 p-3 rounded-lg border border-amber-100 bg-white">
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
                  const mealTiming = (meta?.mealTiming as string) || '';
                  const medication = meta?.medication as { name?: string; dose?: string } | undefined;
                  const exercise = meta?.exercise as { type?: string; duration?: number } | undefined;
                  const symptoms = Array.isArray(meta?.symptoms) ? (meta.symptoms as string[]) : undefined;
                  const MEAL_LABELS: Record<string, string> = {
                    fasting: '공복', before_meal: '식전', after_meal: '식후', bedtime: '취침 전', random: '기타',
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
                          {mealTiming && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
                              {MEAL_LABELS[mealTiming] || mealTiming}
                            </span>
                          )}
                          {medication?.name && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 text-blue-600">
                              투약 {medication.name}{medication.dose ? ` ${medication.dose}` : ''}
                            </span>
                          )}
                          {exercise?.type && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-50 text-green-600">
                              운동 {exercise.type}{exercise.duration ? ` ${exercise.duration}분` : ''}
                            </span>
                          )}
                          {symptoms && symptoms.length > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-50 text-amber-700">
                              증상 {symptoms.join(', ')}
                            </span>
                          )}
                          {!mealTiming && !medication?.name && !exercise?.type && !(symptoms && symptoms.length > 0) && (
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
