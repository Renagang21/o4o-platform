/**
 * GlucoseInputPage — 데이터 입력 및 조회
 * WO-GLYCOPHARM-GLUCOSE-INPUT-PAGE-V1
 * WO-GLYCOPHARM-DATA-INPUT-EXPANSION-V1
 *
 * 당뇨인 자가입력: 혈당 값 + 측정 구분 + 측정 시간
 * 추가 기록: 투약, 운동, 증상 (기본 펼침)
 * WO-O4O-PATIENT-INPUT-UX-FIX-V1: 접이식 기본 펼침 + 가시성 강화
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardEdit,
  Save,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Pill,
  Footprints,
  AlertTriangle,
} from 'lucide-react';
import { patientApi } from '@/api/patient';
import type { MedicationItem } from '@/utils/extract-metadata';

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

function getDefaultMeasuredAt(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function GlucoseInputPage() {
  const navigate = useNavigate();

  // Form state — Glucose
  const [glucoseValue, setGlucoseValue] = useState('');
  const [mealTiming, setMealTiming] = useState('fasting');
  const [measuredAt, setMeasuredAt] = useState(getDefaultMeasuredAt);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Form state — Medication (다중 약품 배열, 기본 펼침)
  const EMPTY_MED: MedicationItem = { name: '', dose: '', takenAt: '' };
  const [medOpen, setMedOpen] = useState(true);
  const [medications, setMedications] = useState<MedicationItem[]>([{ ...EMPTY_MED }]);

  // Form state — Exercise (WO-O4O-PATIENT-INPUT-UX-FIX-V1: 기본 펼침)
  const [exOpen, setExOpen] = useState(true);
  const [exType, setExType] = useState('walking');
  const [exDuration, setExDuration] = useState('');
  const [exIntensity, setExIntensity] = useState('moderate');
  const [exAt, setExAt] = useState('');

  // Form state — Symptoms (WO-O4O-PATIENT-INPUT-UX-FIX-V1: 기본 펼침)
  const [symOpen, setSymOpen] = useState(true);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symAt, setSymAt] = useState('');

  const toggleSymptom = (value: string) => {
    setSymptoms((prev) =>
      prev.includes(value) ? prev.filter((s) => s !== value) : [...prev, value],
    );
  };

  const handleSave = async () => {
    setError('');

    const numVal = Number(glucoseValue);
    if (!glucoseValue || isNaN(numVal)) {
      setError('혈당 값을 입력하세요.');
      return;
    }
    if (numVal < 20 || numVal > 600) {
      setError('혈당 값은 20~600 mg/dL 범위로 입력하세요.');
      return;
    }
    if (!measuredAt) {
      setError('측정 일시를 입력하세요.');
      return;
    }

    setSaving(true);
    setSaved(false);

    try {
      const selectedLabel = MEAL_TIMING_OPTIONS.find((o) => o.value === mealTiming)?.label || '';

      // Build metadata
      const metadata: Record<string, unknown> = {
        mealTiming,
        mealTimingLabel: selectedLabel,
      };

      // Medications (다중 약품)
      if (medOpen) {
        const filled = medications
          .filter((m) => m.name?.trim())
          .map((m) => ({
            name: m.name!.trim(),
            dose: (m.dose || '').trim(),
            takenAt: m.takenAt || measuredAt,
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
            exercisedAt: exAt || measuredAt,
          };
        }
      }

      // Symptoms
      if (symOpen && symptoms.length > 0) {
        metadata.symptoms = symptoms;
        if (symAt) metadata.symptomAt = symAt;
      }

      const res = await patientApi.postGlucoseReading({
        metricType: 'glucose',
        valueNumeric: numVal,
        unit: 'mg/dL',
        measuredAt: new Date(measuredAt).toISOString(),
        metadata,
      });

      if (res.success) {
        setSaved(true);
        setTimeout(() => navigate(-1), 1200);
      } else {
        setError(res.error?.message || '저장에 실패했습니다.');
      }
    } catch {
      setError('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white px-4 py-6">
      <div className="w-full max-w-md mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate('/patient')}
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          돌아가기
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <ClipboardEdit className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">데이터 입력 및 조회</h1>
            <p className="text-xs text-slate-400 mt-0.5">혈당과 함께 투약, 운동, 증상을 기록할 수 있습니다</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* ─── Section 1: Glucose Input (Required) ─── */}
        <section className="mb-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
            <h3 className="text-sm font-semibold text-blue-600 flex items-center gap-2">
              <ClipboardEdit className="w-4 h-4" />
              혈당 기록
            </h3>

            {/* 혈당 값 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                혈당 (mg/dL)
              </label>
              <input
                type="number"
                value={glucoseValue}
                onChange={(e) => setGlucoseValue(e.target.value)}
                placeholder="예: 115"
                min="20"
                max="600"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>

            {/* 측정 구분 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                측정 구분
              </label>
              <select
                value={mealTiming}
                onChange={(e) => setMealTiming(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
              >
                {MEAL_TIMING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 측정 시간 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                측정 시간
              </label>
              <input
                type="datetime-local"
                value={measuredAt}
                onChange={(e) => setMeasuredAt(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        </section>

        {/* ─── Section 2: Medication (Collapsible, 다중 약품) ─── */}
        <section className="mb-4">
          <button
            type="button"
            onClick={() => setMedOpen(!medOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-white rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-violet-600">
              <Pill className="w-4 h-4" />
              투약 기록
              <span className="text-xs font-normal text-slate-400">
                {(() => {
                  const names = medications.map((m) => m.name?.trim()).filter(Boolean);
                  return names.length > 0
                    ? `(${names.slice(0, 2).join(', ')}${names.length > 2 ? ` +${names.length - 2}` : ''})`
                    : '(선택)';
                })()}
              </span>
            </span>
            {medOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {medOpen && (
            <div className="mt-1 bg-white rounded-2xl border border-violet-100 p-5 space-y-4">
              {medications.map((med, idx) => (
                <div key={idx} className="space-y-4">
                  {medications.length > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-violet-500">
                        약품 {idx + 1}{med.name?.trim() ? ` — ${med.name.trim()}` : ''}
                      </span>
                      <button
                        type="button"
                        onClick={() => setMedications(medications.filter((_, i) => i !== idx))}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">약품명</label>
                    <input
                      type="text"
                      value={med.name || ''}
                      onChange={(e) => {
                        const next = [...medications];
                        next[idx] = { ...next[idx], name: e.target.value };
                        setMedications(next);
                      }}
                      placeholder="예: 메트포르민"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">용량</label>
                    <input
                      type="text"
                      value={med.dose || ''}
                      onChange={(e) => {
                        const next = [...medications];
                        next[idx] = { ...next[idx], dose: e.target.value };
                        setMedications(next);
                      }}
                      placeholder="예: 500mg 1정"
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">복용 시간</label>
                    <input
                      type="datetime-local"
                      value={med.takenAt || ''}
                      onChange={(e) => {
                        const next = [...medications];
                        next[idx] = { ...next[idx], takenAt: e.target.value };
                        setMedications(next);
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-sm"
                    />
                    <p className="text-xs text-slate-400 mt-1">비워두면 측정 시간과 동일하게 기록됩니다.</p>
                  </div>
                  {idx < medications.length - 1 && <hr className="border-violet-100" />}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setMedications([...medications, { ...EMPTY_MED }])}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-violet-600 rounded-xl border border-dashed border-violet-200 hover:bg-violet-50 transition-colors"
              >
                + 약품 추가
              </button>
            </div>
          )}
        </section>

        {/* ─── Section 3: Exercise (Collapsible) ─── */}
        <section className="mb-4">
          <button
            type="button"
            onClick={() => setExOpen(!exOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-white rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
              <Footprints className="w-4 h-4" />
              운동 기록
              <span className="text-xs font-normal text-slate-400">
                {exOpen && exDuration && Number(exDuration) > 0 ? `(${exDuration}분)` : '(선택)'}
              </span>
            </span>
            {exOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {exOpen && (
            <div className="mt-1 bg-white rounded-2xl border border-emerald-100 p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">운동 종류</label>
                <select
                  value={exType}
                  onChange={(e) => setExType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm bg-white"
                >
                  {EXERCISE_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">운동 시간 (분)</label>
                <input
                  type="number"
                  value={exDuration}
                  onChange={(e) => setExDuration(e.target.value)}
                  placeholder="예: 30"
                  min="1"
                  max="600"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">운동 일시</label>
                <input
                  type="datetime-local"
                  value={exAt}
                  onChange={(e) => setExAt(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">비워두면 혈당 측정 시간과 동일하게 기록됩니다.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">운동 강도</label>
                <div className="flex gap-2">
                  {INTENSITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setExIntensity(opt.value)}
                      className={`flex-1 py-2 text-sm font-medium rounded-xl border transition-colors ${
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
        </section>

        {/* ─── Section 4: Symptoms (Collapsible) ─── */}
        <section className="mb-6">
          <button
            type="button"
            onClick={() => setSymOpen(!symOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 bg-white rounded-2xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-amber-600">
              <AlertTriangle className="w-4 h-4" />
              증상 기록
              <span className="text-xs font-normal text-slate-400">
                {symOpen && symptoms.length > 0 ? `(${symptoms.length}개)` : '(선택)'}
              </span>
            </span>
            {symOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {symOpen && (
            <div className="mt-1 bg-white rounded-2xl border border-amber-100 p-5">
              <p className="text-xs text-slate-500 mb-3">해당되는 증상을 모두 선택하세요.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {SYMPTOM_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleSymptom(opt.value)}
                    className={`px-3.5 py-2 text-sm font-medium rounded-xl border transition-colors ${
                      symptoms.includes(opt.value)
                        ? 'bg-amber-50 border-amber-300 text-amber-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">증상 발생 일시</label>
                <input
                  type="datetime-local"
                  value={symAt}
                  onChange={(e) => setSymAt(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                />
                <p className="text-xs text-slate-400 mt-1">비워두면 혈당 측정 시간과 동일하게 기록됩니다.</p>
              </div>
            </div>
          )}
        </section>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-8"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              저장 중...
            </>
          ) : saved ? (
            <>
              <CheckCircle className="w-4 h-4" />
              저장 완료
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              저장
            </>
          )}
        </button>

        {/* 최근 기록은 별도 메뉴로 분리됨 */}
      </div>
    </div>
  );
}
