/**
 * GlucoseInputPage — 혈당 데이터 입력
 * WO-GLYCOPHARM-GLUCOSE-INPUT-PAGE-V1
 *
 * 환자 자가입력: 혈당 값 + 측정 구분 + 측정 시간
 * 하단에 최근 기록 표시.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ClipboardEdit, Save, CheckCircle } from 'lucide-react';
import { patientApi } from '@/api/patient';
import type { GlucoseReading } from '@/api/patient';

const MEAL_TIMING_OPTIONS = [
  { value: 'fasting', label: '공복' },
  { value: 'before_meal', label: '식전' },
  { value: 'after_meal', label: '식후' },
  { value: 'bedtime', label: '취침 전' },
  { value: 'random', label: '기타' },
];

const MEAL_TIMING_LABELS: Record<string, string> = {
  fasting: '공복',
  before_meal: '식전',
  after_meal: '식후',
  bedtime: '취침 전',
  random: '기타',
};

function getDefaultMeasuredAt(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function GlucoseInputPage() {
  const navigate = useNavigate();

  // Form state
  const [glucoseValue, setGlucoseValue] = useState('');
  const [mealTiming, setMealTiming] = useState('fasting');
  const [measuredAt, setMeasuredAt] = useState(getDefaultMeasuredAt);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Recent readings
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [loadingReadings, setLoadingReadings] = useState(true);

  const loadReadings = useCallback(async () => {
    setLoadingReadings(true);
    try {
      const res = await patientApi.getGlucoseReadings({ metricType: 'glucose' });
      if (res.success && res.data) {
        setReadings(Array.isArray(res.data) ? res.data : []);
      } else {
        setReadings([]);
      }
    } catch {
      setReadings([]);
    } finally {
      setLoadingReadings(false);
    }
  }, []);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

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
      const res = await patientApi.postGlucoseReading({
        metricType: 'glucose',
        valueNumeric: numVal,
        unit: 'mg/dL',
        measuredAt: new Date(measuredAt).toISOString(),
        metadata: {
          mealTiming,
          mealTimingLabel: selectedLabel,
        },
      });

      if (res.success) {
        setSaved(true);
        setGlucoseValue('');
        setMeasuredAt(getDefaultMeasuredAt());
        setTimeout(() => setSaved(false), 2500);
        await loadReadings();
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
          <h1 className="text-xl font-bold text-slate-800">혈당 데이터 입력</h1>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Input Form */}
        <section className="mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
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

        {/* Recent Readings */}
        <section>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
            최근 혈당 기록
          </h2>

          {loadingReadings ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-400" />
            </div>
          ) : readings.length === 0 ? (
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center">
              <ClipboardEdit className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">아직 기록이 없습니다.</p>
              <p className="text-xs text-slate-400 mt-1">첫 혈당 데이터를 입력해 보세요.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {readings.map((r) => (
                <div
                  key={r.id}
                  className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-slate-600">
                      {new Date(r.measuredAt).toLocaleString('ko-KR')}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {MEAL_TIMING_LABELS[(r.metadata as Record<string, string>)?.mealTiming] || '기타'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-slate-800 tabular-nums">
                      {r.valueNumeric != null ? Number(r.valueNumeric).toFixed(0) : '-'}
                    </p>
                    <p className="text-xs text-slate-400">{r.unit}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
