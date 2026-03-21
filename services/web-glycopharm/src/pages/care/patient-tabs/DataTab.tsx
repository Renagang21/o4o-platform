/**
 * DataTab - 건강 데이터 입력 + 최근 기록
 * WO-O4O-PATIENT-DETAIL-CARE-WORKSPACE-V1
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
      await pharmacyApi.postHealthReading({
        patientId: patient.id,
        metricType,
        valueNumeric: Number(value),
        unit: selectedMetric.unit,
        measuredAt: new Date(measuredAt).toISOString(),
      });
      setValue('');
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
