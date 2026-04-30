/**
 * SignageReport — 공급자 사이니지 리포트
 *
 * WO-O4O-SIGNAGE-SUPPLIER-REPORT-UI-V1
 *
 * 경로: /supplierops/signage-reports
 * 기능: 내 signage media 재생 성과 서비스 단위 조회
 *
 * 핵심 정책:
 * - organization_id / 매장명 / 약국명 절대 미표시
 * - "참여 매장 수"는 숫자만 표시
 * - 금액/정산 계산 없음
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { BarChart2, RefreshCw, Search } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = '/api/v1/kpa/supplier/signage/reports';

const KPA_SERVICES = [
  { value: '', label: '전체 서비스' },
  { value: 'kpa-society', label: 'KPA Society' },
  { value: 'neture', label: 'Neture' },
  { value: 'glycopharm', label: 'GlycoPharm' },
  { value: 'k-cosmetics', label: 'K-Cosmetics' },
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Summary {
  totalPlayCount: number;
  totalPlayTimeSeconds: number;
  uniqueServiceCount: number;
  uniqueStoreCount: number;
}

interface ServiceRow {
  serviceKey: string;
  playCount: number;
  estimatedPlayTimeSeconds: number;
  uniqueStoreCount: number;
}

interface MediaRow {
  mediaId: string;
  title: string;
  playCount: number;
  estimatedPlayTimeSeconds: number;
}

interface DateRow {
  date: string;
  playCount: number;
}

interface ReportResponse {
  success: boolean;
  summary: Summary;
  byService: ServiceRow[];
  byMedia: MediaRow[];
  byDate: DateRow[];
  pagination: { page: number; limit: number };
}

interface FilterState {
  startDate: string;
  endDate: string;
  serviceKey: string;
  mediaId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function defaultDates(): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start = new Date(now.setDate(now.getDate() - 29)).toISOString().slice(0, 10);
  return { start, end };
}

function fmtTime(sec: number): string {
  if (sec <= 0) return '0분';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

async function fetchReport(
  filter: FilterState,
  page: number,
  limit: number,
): Promise<ReportResponse> {
  const params: Record<string, any> = { page, limit };
  if (filter.startDate) params.startDate = filter.startDate;
  if (filter.endDate) params.endDate = filter.endDate;
  if (filter.serviceKey) params.serviceKey = filter.serviceKey;
  if (filter.mediaId.trim()) params.mediaId = filter.mediaId.trim();

  const res = await authClient.api.get<ReportResponse>(API_BASE, { params });
  return res.data;
}

// ── Summary Card ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SignageReport() {
  const { start, end } = defaultDates();

  const [draft, setDraft] = useState<FilterState>({
    startDate: start,
    endDate: end,
    serviceKey: '',
    mediaId: '',
  });
  const [active, setActive] = useState<FilterState>({ ...draft });
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['supplier-signage-report', active, page],
    queryFn: () => fetchReport(active, page, LIMIT),
  });

  const handleSearch = () => {
    setPage(1);
    setActive({ ...draft });
  };

  // ── byService columns ──────────────────────────────────────────────────────

  const serviceColumns: O4OColumn<ServiceRow>[] = [
    {
      key: 'serviceKey',
      header: '서비스',
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">{row.serviceKey}</span>
      ),
    },
    {
      key: 'playCount',
      header: '재생 수',
      width: 100,
      render: (row) => (
        <span className="text-sm text-gray-700">{row.playCount.toLocaleString()}</span>
      ),
    },
    {
      key: 'estimatedPlayTimeSeconds',
      header: '예상 재생 시간',
      width: 130,
      render: (row) => (
        <span className="text-sm text-gray-500">{fmtTime(row.estimatedPlayTimeSeconds)}</span>
      ),
    },
    {
      key: 'uniqueStoreCount',
      header: '참여 매장 수',
      width: 110,
      render: (row) => (
        // 매장 수만 숫자로 표시 — 개별 매장 정보 절대 미노출
        <span className="text-sm text-gray-700">{row.uniqueStoreCount.toLocaleString()}개</span>
      ),
    },
  ];

  // ── byMedia columns ────────────────────────────────────────────────────────

  const mediaColumns: O4OColumn<MediaRow>[] = [
    {
      key: 'title',
      header: '미디어 제목',
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">{row.title || '(제목 없음)'}</span>
      ),
    },
    {
      key: 'playCount',
      header: '재생 수',
      width: 100,
      render: (row) => (
        <span className="text-sm text-gray-700">{row.playCount.toLocaleString()}</span>
      ),
    },
    {
      key: 'estimatedPlayTimeSeconds',
      header: '예상 재생 시간',
      width: 130,
      render: (row) => (
        <span className="text-sm text-gray-500">{fmtTime(row.estimatedPlayTimeSeconds)}</span>
      ),
    },
  ];

  // ── byDate columns ─────────────────────────────────────────────────────────

  const dateColumns: O4OColumn<DateRow>[] = [
    {
      key: 'date',
      header: '날짜',
      width: 130,
      render: (row) => (
        <span className="text-sm text-gray-600">{row.date}</span>
      ),
    },
    {
      key: 'playCount',
      header: '재생 수',
      width: 100,
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">{row.playCount.toLocaleString()}</span>
      ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  const summary = data?.summary;

  return (
    <div className="p-6">
      <PageHeader
        title="사이니지 리포트"
        subtitle="내가 등록한 디지털 사이니지 자료의 서비스 단위 재생 현황입니다."
        actions={[
          {
            id: 'refresh',
            label: '새로고침',
            icon: <RefreshCw size={14} />,
            onClick: () => refetch(),
          },
        ]}
      />

      {/* 안내 */}
      <p className="mb-4 text-xs text-gray-400">
        개별 매장 정보는 표시되지 않습니다. 참여 매장 수는 집계 숫자만 제공됩니다.
      </p>

      {/* 필터 */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">시작일</label>
            <input
              type="date"
              value={draft.startDate}
              onChange={(e) => setDraft((f) => ({ ...f, startDate: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">종료일</label>
            <input
              type="date"
              value={draft.endDate}
              onChange={(e) => setDraft((f) => ({ ...f, endDate: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">서비스</label>
            <select
              value={draft.serviceKey}
              onChange={(e) => setDraft((f) => ({ ...f, serviceKey: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            >
              {KPA_SERVICES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">미디어 ID</label>
            <input
              type="text"
              value={draft.mediaId}
              onChange={(e) => setDraft((f) => ({ ...f, mediaId: e.target.value }))}
              placeholder="UUID (선택)"
              className="w-60 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
          >
            <Search size={14} /> 조회
          </button>
        </div>
      </div>

      {/* 로딩/에러 */}
      {isLoading && (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
      )}
      {isError && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      )}

      {data && (
        <>
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SummaryCard
              label="총 재생 수"
              value={summary?.totalPlayCount.toLocaleString() ?? '0'}
            />
            <SummaryCard
              label="총 재생 시간"
              value={fmtTime(summary?.totalPlayTimeSeconds ?? 0)}
              sub="예상값 (media duration 기반)"
            />
            <SummaryCard
              label="노출 서비스 수"
              value={`${summary?.uniqueServiceCount ?? 0}개`}
            />
            <SummaryCard
              label="참여 매장 수"
              value={`${summary?.uniqueStoreCount ?? 0}개`}
              sub="개별 매장 정보 비노출"
            />
          </div>

          {/* byService */}
          <section className="mb-6">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <BarChart2 size={15} className="text-blue-500" />
              서비스별 집계
            </h3>
            <BaseTable<ServiceRow>
              columns={serviceColumns}
              data={data.byService}
              emptyMessage="서비스 단위 데이터가 없습니다."
            />
          </section>

          {/* byMedia */}
          <section className="mb-6">
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <BarChart2 size={15} className="text-purple-500" />
              미디어별 집계
            </h3>
            <BaseTable<MediaRow>
              columns={mediaColumns}
              data={data.byMedia}
              emptyMessage="미디어 데이터가 없습니다."
            />

            {/* byMedia 페이지네이션 */}
            {data.byMedia.length >= LIMIT && (
              <div className="mt-3 flex justify-center gap-2">
                <button
                  className="rounded border px-3 py-1 text-sm disabled:opacity-40"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  이전
                </button>
                <span className="px-3 py-1 text-sm text-gray-600">
                  {page}페이지
                </span>
                <button
                  className="rounded border px-3 py-1 text-sm"
                  onClick={() => setPage((p) => p + 1)}
                >
                  다음
                </button>
              </div>
            )}
          </section>

          {/* byDate */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-700">
              <BarChart2 size={15} className="text-teal-500" />
              일자별 추이
            </h3>
            <BaseTable<DateRow>
              columns={dateColumns}
              data={data.byDate}
              emptyMessage="일자별 데이터가 없습니다."
            />
          </section>
        </>
      )}
    </div>
  );
}
