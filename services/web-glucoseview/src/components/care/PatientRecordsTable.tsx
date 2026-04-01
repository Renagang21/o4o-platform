/**
 * PatientRecordsTable — 약사용 환자 기록 테이블
 * WO-O4O-CARE-RECORDS-TABLE-V1
 *
 * 환자의 건강 기록을 테이블형으로 표시.
 * 검색, 필터(상황/출처/기간), 정렬 지원.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DataTable, type Column } from '@o4o/ui';
import { api } from '../../services/api';
import { mapReadingsToRows, type CareRecordRow } from '../../utils/care-record-mapper';
import { MEAL_TIMING_LABELS } from '../../constants/meal-timing';

interface PatientRecordsTableProps {
  patientId: string;
}

type MealTimingFilter = '' | string;
type SourceFilter = '' | 'patient_self' | 'manual';
type PeriodFilter = '' | 'today' | '7d' | '30d';

function formatDateTime(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const h = date.getHours().toString().padStart(2, '0');
  const min = date.getMinutes().toString().padStart(2, '0');
  return `${m}/${d} ${h}:${min}`;
}

function getGlucoseColor(value: number | null): string {
  if (value == null) return 'text-slate-500';
  if (value < 70) return 'text-red-600';
  if (value <= 180) return 'text-emerald-600';
  return 'text-orange-600';
}

function getGlucoseBg(value: number | null): string {
  if (value == null) return '';
  if (value < 70) return 'bg-red-50';
  if (value <= 180) return '';
  return 'bg-orange-50';
}

const MEAL_TIMING_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  ...Object.entries(MEAL_TIMING_LABELS).map(([value, label]) => ({ value, label })),
];

const SOURCE_OPTIONS: { value: SourceFilter; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'patient_self', label: '환자 입력' },
  { value: 'manual', label: '약국 입력' },
];

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: '', label: '전체 기간' },
  { value: 'today', label: '오늘' },
  { value: '7d', label: '최근 7일' },
  { value: '30d', label: '최근 30일' },
];

function getPeriodStart(period: PeriodFilter): Date | null {
  if (!period) return null;
  const now = new Date();
  switch (period) {
    case 'today': {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case '7d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    case '30d': {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      return start;
    }
    default:
      return null;
  }
}

export default function PatientRecordsTable({ patientId }: PatientRecordsTableProps) {
  const [rows, setRows] = useState<CareRecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [mealTimingFilter, setMealTimingFilter] = useState<MealTimingFilter>('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('');

  const loadReadings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const readings = await api.getHealthReadings(patientId);
      const mapped = mapReadingsToRows(Array.isArray(readings) ? readings : []);
      setRows(mapped);
    } catch (err: any) {
      setError(err.message || '기록을 불러오는데 실패했습니다.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadReadings();
  }, [loadReadings]);

  // Client-side filtering
  const filtered = useMemo(() => {
    let result = rows;

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (r) => r.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Meal timing filter
    if (mealTimingFilter) {
      result = result.filter((r) => r.mealTiming === mealTimingFilter);
    }

    // Source filter
    if (sourceFilter) {
      result = result.filter((r) => r.sourceType === sourceFilter);
    }

    // Period filter
    const periodStart = getPeriodStart(periodFilter);
    if (periodStart) {
      result = result.filter((r) => r.eventTime >= periodStart);
    }

    return result;
  }, [rows, search, mealTimingFilter, sourceFilter, periodFilter]);

  // Column definitions
  const columns: Column<Record<string, any>>[] = useMemo(
    () => [
      {
        key: 'eventTime',
        title: '측정 시간',
        dataIndex: 'eventTime',
        width: '15%',
        sortable: true,
        sorter: (a: any, b: any) =>
          (a.eventTime as Date).getTime() - (b.eventTime as Date).getTime(),
        render: (value: Date) => (
          <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
            {formatDateTime(value)}
          </span>
        ),
      },
      {
        key: 'glucoseValue',
        title: '혈당',
        dataIndex: 'glucoseValue',
        width: '12%',
        align: 'right' as const,
        sortable: true,
        render: (value: number | null, record: any) => {
          if (value == null) return <span className="text-slate-400">-</span>;
          return (
            <span className={`text-sm font-bold ${getGlucoseColor(value)}`}>
              {Math.round(value)}{' '}
              <span className="font-normal text-xs text-slate-400">
                {record.unit}
              </span>
            </span>
          );
        },
      },
      {
        key: 'mealTimingLabel',
        title: '상황',
        dataIndex: 'mealTimingLabel',
        width: '10%',
        render: (value: string) =>
          value ? (
            <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
              {value}
            </span>
          ) : (
            <span className="text-slate-300">-</span>
          ),
      },
      {
        key: 'extras',
        title: '부가 기록',
        width: '30%',
        render: (_: any, record: any) => {
          const row = record as CareRecordRow;
          const items: React.ReactNode[] = [];

          if (row.medication?.name) {
            items.push(
              <div key="med" className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {row.medication.name}
                  {row.medication.dose ? ` ${row.medication.dose}` : ''}
                </span>
                {row.medicationTime && (
                  <span className="text-[10px] text-blue-400 whitespace-nowrap">
                    {formatDateTime(row.medicationTime)}
                  </span>
                )}
              </div>,
            );
          }

          if (row.exercise?.type) {
            items.push(
              <div key="ex" className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-50 text-green-600">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {row.exercise.type}
                  {row.exercise.duration ? ` ${row.exercise.duration}분` : ''}
                </span>
                {row.exerciseTime && (
                  <span className="text-[10px] text-green-400 whitespace-nowrap">
                    {formatDateTime(row.exerciseTime)}
                  </span>
                )}
              </div>,
            );
          }

          if (row.symptoms?.items && row.symptoms.items.length > 0) {
            items.push(
              <div key="sym" className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {row.symptoms.items.join(', ')}
                </span>
                {row.symptomTime && (
                  <span className="text-[10px] text-amber-400 whitespace-nowrap">
                    {formatDateTime(row.symptomTime)}
                  </span>
                )}
              </div>,
            );
          }

          return items.length > 0 ? (
            <div className="flex flex-col gap-1">{items}</div>
          ) : (
            <span className="text-slate-300">-</span>
          );
        },
      },
      {
        key: 'sourceLabel',
        title: '출처',
        dataIndex: 'sourceLabel',
        width: '10%',
        render: (value: string, record: any) => {
          const row = record as CareRecordRow;
          const isPatient = row.sourceType === 'patient_self';
          return (
            <span
              className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
                isPatient
                  ? 'bg-teal-50 text-teal-600'
                  : 'bg-indigo-50 text-indigo-600'
              }`}
            >
              {value}
            </span>
          );
        },
      },
      {
        key: 'recordedAt',
        title: '등록 시간',
        dataIndex: 'recordedAt',
        width: '13%',
        sortable: true,
        sorter: (a: any, b: any) =>
          (a.recordedAt as Date).getTime() - (b.recordedAt as Date).getTime(),
        render: (value: Date) => (
          <span className="text-xs text-slate-400 whitespace-nowrap">
            {formatDateTime(value)}
          </span>
        ),
      },
    ],
    [],
  );

  // DataTable data source: spread CareRecordRow fields into flat object
  const dataSource = useMemo(
    () =>
      filtered.map((row) => ({
        ...row,
        // DataTable uses Record<string, any>, keep all fields flat
      })),
    [filtered],
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-slate-700">건강 기록</h3>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-[280px]">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="약품명, 증상, 운동 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Meal Timing Filter */}
          <select
            value={mealTimingFilter}
            onChange={(e) => setMealTimingFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
          >
            {MEAL_TIMING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value === '' ? '상황: 전체' : o.label}
              </option>
            ))}
          </select>

          {/* Source Filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value === '' ? '출처: 전체' : o.label}
              </option>
            ))}
          </select>

          {/* Period Filter */}
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-600"
          >
            {PERIOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Result Count */}
        {!loading && (
          <div className="mt-2 text-xs text-slate-400">
            {rows.length === filtered.length
              ? `${rows.length}건`
              : `전체 ${rows.length}건 중 ${filtered.length}건 표시`}
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-red-500 mb-2">{error}</p>
          <button
            onClick={loadReadings}
            className="px-4 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="max-h-[500px] overflow-y-auto">
          {/* Filtered empty state (non-loading, has data but filters exclude all) */}
          {!loading && rows.length > 0 && filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sm text-slate-400">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              dataSource={dataSource}
              rowKey="id"
              loading={loading}
              onRow={(record) => ({
                className: getGlucoseBg((record as any).glucoseValue),
              })}
              emptyText="기록된 데이터가 없습니다"
            />
          )}
        </div>
      )}
    </div>
  );
}
