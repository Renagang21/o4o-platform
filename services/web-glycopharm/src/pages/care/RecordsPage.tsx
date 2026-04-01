/**
 * RecordsPage - 환자 전체 건강 기록 조회
 * WO-O4O-GLYCOPHARM-PATIENT-FULL-DATA-VIEW-V1
 *
 * Care 하부 메뉴: 전체기록
 * 환자 선택 → 날짜/항목 필터 → 카드형 리스트
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  ClipboardList,
  ClipboardPlus,
  AlertCircle,
  Users,
  Search,
} from 'lucide-react';
import CareSubNav from './CareSubNav';
import { pharmacyApi, type HealthReadingDto, type PharmacyCustomer } from '@/api/pharmacy';
import { normalizeMedications } from '@/utils/extract-metadata';

// ── Constants ──

const METRIC_FILTERS = [
  { value: '', label: '전체' },
  { value: 'glucose', label: '혈당' },
  { value: 'blood_pressure_systolic', label: '수축기' },
  { value: 'blood_pressure_diastolic', label: '이완기' },
  { value: 'weight', label: '체중' },
];

const METRIC_LABELS: Record<string, string> = {
  glucose: '혈당',
  blood_pressure_systolic: '수축기 혈압',
  blood_pressure_diastolic: '이완기 혈압',
  weight: '체중',
};

const MEAL_LABELS: Record<string, string> = {
  fasting: '공복',
  before_meal: '식전',
  after_meal: '식후',
  bedtime: '취침 전',
  random: '기타',
};

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  const fmt = (d: Date) => {
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 10);
  };
  return { from: fmt(from), to: fmt(to) };
}

// ── Component ──

export default function RecordsPage() {
  // Patient selection
  const [patients, setPatients] = useState<PharmacyCustomer[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [loadingPatients, setLoadingPatients] = useState(true);

  // Filters
  const [metricFilter, setMetricFilter] = useState('');
  const defaults = getDefaultDateRange();
  const [dateFrom, setDateFrom] = useState(defaults.from);
  const [dateTo, setDateTo] = useState(defaults.to);

  // Data
  const [readings, setReadings] = useState<HealthReadingDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Load patients ──
  useEffect(() => {
    let cancelled = false;
    setLoadingPatients(true);
    pharmacyApi
      .getCustomers({ pageSize: 200 })
      .then((res) => {
        if (!cancelled) {
          const items = res?.data?.items ?? res?.data ?? [];
          setPatients(Array.isArray(items) ? items : []);
        }
      })
      .catch(() => {
        if (!cancelled) setPatients([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingPatients(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ── Load readings ──
  const loadReadings = useCallback(async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    setError(null);
    try {
      const params: { from?: string; to?: string; metricType?: string } = {};
      if (dateFrom) params.from = new Date(dateFrom).toISOString();
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        params.to = end.toISOString();
      }
      if (metricFilter) params.metricType = metricFilter;

      const data = await pharmacyApi.getHealthReadings(selectedPatientId, params);
      setReadings(Array.isArray(data) ? data : []);
    } catch {
      setError('기록을 불러오지 못했습니다.');
      setReadings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId, dateFrom, dateTo, metricFilter]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  // ── Filtered patient list for dropdown ──
  const filteredPatients = patientSearch
    ? patients.filter(
        (p) =>
          p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
          (p.phone || '').includes(patientSearch),
      )
    : patients;

  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // ── Render ──
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50">
      <CareSubNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <ClipboardList className="w-6 h-6 text-primary-600" />
          <h1 className="text-xl font-bold text-slate-800">전체기록</h1>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          {/* Row 1: Patient selector */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="sm:w-48">
              <label className="block text-xs text-slate-500 mb-1.5">환자 검색</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="이름 또는 전화번호"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1.5">환자 선택</label>
              <select
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">
                  {loadingPatients ? '로딩 중...' : '-- 환자를 선택하세요 --'}
                </option>
                {filteredPatients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Metric type pills + date range */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-xs text-slate-500 mb-1.5">측정 항목</label>
              <div className="flex flex-wrap gap-1.5">
                {METRIC_FILTERS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMetricFilter(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      metricFilter === opt.value
                        ? 'bg-primary-50 border-primary-300 text-primary-700'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">시작일</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">종료일</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Selected patient info */}
        {selectedPatient && (
          <div className="text-sm text-slate-600">
            <span className="font-medium text-slate-800">{selectedPatient.name}</span>
            {selectedPatient.phone && <span className="ml-2 text-slate-400">{selectedPatient.phone}</span>}
            <span className="ml-3 text-slate-400">({readings.length}건)</span>
          </div>
        )}

        {/* Content area */}
        {!selectedPatientId ? (
          /* No patient selected */
          <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center">
            <Users className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">환자를 선택해주세요.</p>
            <p className="text-xs text-slate-400 mt-1">위 목록에서 환자를 선택하면 입력 기록을 조회합니다.</p>
          </div>
        ) : loading ? (
          /* Loading */
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          /* Error */
          <div className="bg-white rounded-xl border border-red-200 p-12 flex flex-col items-center justify-center">
            <AlertCircle className="w-12 h-12 text-red-300 mb-3" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        ) : readings.length === 0 ? (
          /* Empty */
          <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center">
            <ClipboardPlus className="w-12 h-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">입력된 기록이 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">선택한 기간과 항목에 해당하는 데이터가 없습니다.</p>
          </div>
        ) : (
          /* Data list */
          <div className="space-y-2">
            {readings.map((r) => {
              const meta = r.metadata as Record<string, unknown> | undefined;
              const mealTiming = (meta?.mealTiming as string) || '';
              const meds = normalizeMedications(meta);
              const exercise = meta?.exercise as { type?: string; duration?: number } | undefined;
              // Backward compat: symptoms can be string[] (legacy) or { items: string[], severity?, duration? }
              const rawSym = meta?.symptoms;
              const symptomItems: string[] | undefined = Array.isArray(rawSym)
                ? rawSym as string[]
                : rawSym && typeof rawSym === 'object' && Array.isArray((rawSym as { items?: string[] }).items)
                  ? (rawSym as { items: string[] }).items
                  : undefined;
              const symptomSeverity = rawSym && typeof rawSym === 'object' && !Array.isArray(rawSym) ? (rawSym as { severity?: string }).severity : undefined;
              const hasMetadata = !!(mealTiming || meds.length > 0 || exercise?.type || (symptomItems && symptomItems.length > 0));

              return (
                <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: time + metric */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 whitespace-nowrap">
                          {new Date(r.measuredAt).toLocaleString('ko-KR')}
                        </span>
                        <span className="text-xs font-medium text-slate-400">
                          {METRIC_LABELS[r.metricType] || r.metricType}
                        </span>
                      </div>

                      {/* Metadata tags */}
                      {hasMetadata && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {mealTiming && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-slate-100 text-slate-600">
                              {MEAL_LABELS[mealTiming] || mealTiming}
                            </span>
                          )}
                          {meds.map((m, mi) => (
                            <span key={mi} className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-50 text-blue-600">
                              투약 {m.name}{m.dose ? ` ${m.dose}` : ''}
                            </span>
                          ))}
                          {exercise?.type && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-green-50 text-green-600">
                              운동 {exercise.type}{exercise.duration ? ` ${exercise.duration}분` : ''}
                            </span>
                          )}
                          {symptomItems && symptomItems.length > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-50 text-amber-700">
                              증상 {symptomItems.join(', ')}{symptomSeverity === 'severe' ? ' [심함]' : symptomSeverity === 'moderate' ? ' [보통]' : ''}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: value + source */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-slate-800 tabular-nums">
                        {r.valueNumeric != null ? Number(r.valueNumeric).toFixed(1) : '-'}
                      </p>
                      <p className="text-xs text-slate-400">{r.unit}</p>
                      <span className="inline-flex items-center mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-100 text-slate-500">
                        {r.sourceType === 'manual' ? '수동 입력' : r.sourceType === 'patient_self' ? '환자 자가입력' : r.sourceType}
                      </span>
                    </div>
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
