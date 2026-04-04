/**
 * RecordsListPage — 등록한 데이터 조회
 *
 * 당뇨인이 입력한 혈당·투약·운동·증상 기록 목록.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  List,
  Pill,
  Footprints,
  AlertTriangle,
  Loader2,
  ClipboardEdit,
} from 'lucide-react';
import { patientApi } from '@/api/patient';
import type { GlucoseReading } from '@/api/patient';
import { normalizeMedications } from '@/utils/extract-metadata';

const MEAL_TIMING_LABELS: Record<string, string> = {
  fasting: '공복',
  before_meal: '식전',
  after_meal: '식후',
  after_meal_1h: '식후 1h',
  after_meal_2h: '식후 2h',
  bedtime: '취침 전',
  random: '수시',
};

export default function RecordsListPage() {
  const navigate = useNavigate();
  const [readings, setReadings] = useState<GlucoseReading[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReadings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientApi.getGlucoseReadings({ metricType: 'glucose' });
      if (res.success && res.data) {
        setReadings(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReadings(); }, [loadReadings]);

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
          <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center">
            <List className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">등록한 데이터 조회</h1>
            <p className="text-xs text-slate-400">입력한 혈당·투약·운동 기록</p>
          </div>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : readings.length === 0 ? (
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-8 flex flex-col items-center justify-center">
            <ClipboardEdit className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">아직 기록이 없습니다.</p>
            <button
              onClick={() => navigate('/patient/glucose-input')}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              데이터 입력하기
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {readings.map((r) => {
              const meta = r.metadata as Record<string, unknown>;
              const meds = normalizeMedications(meta);
              const hasMed = meds.length > 0;
              const hasEx = meta?.exercise != null;
              const rawSym = meta?.symptoms;
              const symItems = Array.isArray(rawSym)
                ? rawSym as string[]
                : rawSym && typeof rawSym === 'object' && Array.isArray((rawSym as { items?: string[] }).items)
                  ? (rawSym as { items: string[] }).items
                  : [];
              const hasSym = symItems.length > 0;

              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">
                        {new Date(r.measuredAt).toLocaleString('ko-KR')}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {MEAL_TIMING_LABELS[(meta as Record<string, string>)?.mealTiming] || '기타'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800 tabular-nums">
                        {r.valueNumeric != null ? Number(r.valueNumeric).toFixed(0) : '-'}
                      </p>
                      <p className="text-xs text-slate-400">{r.unit}</p>
                    </div>
                  </div>

                  {(hasMed || hasEx || hasSym) && (
                    <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100">
                      {meds.map((med, mi) => (
                        <span key={mi} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-violet-50 text-violet-600">
                          <Pill className="w-3 h-3" />
                          {med.name}{med.dose ? ` ${med.dose}` : ''}
                        </span>
                      ))}
                      {hasEx && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-600">
                          <Footprints className="w-3 h-3" />
                          {(meta.exercise as { duration: number }).duration}분
                        </span>
                      )}
                      {hasSym && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-600">
                          <AlertTriangle className="w-3 h-3" />
                          증상 {symItems.length}개
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
