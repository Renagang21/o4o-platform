/**
 * CampaignRequestPage — 공급자 사이니지 캠페인 요청
 *
 * WO-O4O-SIGNAGE-SUPPLIER-CAMPAIGN-REQUEST-V1
 *
 * 경로: /supplierops/signage-campaign-requests
 *
 * 기능:
 * - 내 캠페인 요청 목록 조회
 * - 신규 캠페인 요청 등록 (승인된 내 signage media 선택)
 * - 상태 표시: 승인 대기 / 승인됨 / 반려됨
 *
 * 정책:
 * - 승인된 캠페인은 수정 불가 (새 요청으로 등록)
 * - 개별 매장 정보 미노출 (서비스 전체에 노출)
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { toast } from 'react-hot-toast';
import { Monitor, Plus, X, RefreshCw, Info } from 'lucide-react';
import PageHeader from '../../../components/common/PageHeader';

// ── Constants ─────────────────────────────────────────────────────────────────

const API_BASE = '/api/v1/kpa/supplier/signage/campaign-requests';

const KPA_SERVICES = [
  { value: 'kpa-society', label: 'KPA Society' },
  { value: 'neture', label: 'Neture' },
  { value: 'glycopharm', label: 'GlycoPharm' },
  { value: 'glucoseview', label: 'GlucoseView' },
  { value: 'k-cosmetics', label: 'K-Cosmetics' },
];

// ── Types ─────────────────────────────────────────────────────────────────────

type RequestStatus = 'pending' | 'approved' | 'rejected';

interface MediaItem {
  id: string;
  title: string;
  sourceType: 'youtube' | 'vimeo';
  sourceUrl: string;
  embedId: string | null;
  thumbnailUrl: string | null;
  serviceKey: string;
  createdAt: string;
}

interface CampaignPayload {
  mediaId: string;
  mediaTitle: string | null;
  title: string;
  targetServices: string[];
  startAt: string;
  endAt: string;
  note: string | null;
}

interface CampaignRequest {
  id: string;
  entityType: string;
  status: RequestStatus;
  payload: CampaignPayload;
  reviewComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface FormState {
  mediaId: string;
  title: string;
  targetServices: string[];
  startAt: string;
  endAt: string;
  note: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<RequestStatus, { label: string; className: string }> = {
  pending: { label: '승인 대기', className: 'bg-yellow-100 text-yellow-800' },
  approved: { label: '승인됨', className: 'bg-green-100 text-green-800' },
  rejected: { label: '반려됨', className: 'bg-red-100 text-red-800' },
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

function serviceLabels(keys: string[]): string {
  return keys
    .map((k) => KPA_SERVICES.find((s) => s.value === k)?.label ?? k)
    .join(', ');
}

// ── API ───────────────────────────────────────────────────────────────────────

async function fetchMyMedia(): Promise<MediaItem[]> {
  const res = await authClient.api.get<{ success: boolean; data: MediaItem[] }>(
    `${API_BASE}/my-media`,
  );
  return res.data.data;
}

async function fetchRequests(page: number): Promise<{ data: CampaignRequest[]; total: number }> {
  const res = await authClient.api.get<{ success: boolean; data: CampaignRequest[]; total: number }>(
    API_BASE,
    { params: { page, limit: 20 } },
  );
  return res.data;
}

async function createRequest(body: FormState): Promise<void> {
  await authClient.api.post(API_BASE, {
    mediaId: body.mediaId,
    title: body.title,
    targetServices: body.targetServices,
    startAt: body.startAt,
    endAt: body.endAt,
    note: body.note || undefined,
  });
}

// ── RequestForm ───────────────────────────────────────────────────────────────

function RequestForm({
  mediaList,
  onSubmit,
  onCancel,
  loading,
}: {
  mediaList: MediaItem[];
  onSubmit: (form: FormState) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<FormState>({
    mediaId: '',
    title: '',
    targetServices: [],
    startAt: '',
    endAt: '',
    note: '',
  });

  const allSelected = form.targetServices.length === KPA_SERVICES.length;

  const toggleService = (value: string) => {
    setForm((f) => ({
      ...f,
      targetServices: f.targetServices.includes(value)
        ? f.targetServices.filter((s) => s !== value)
        : [...f.targetServices, value],
    }));
  };

  const toggleAll = () => {
    setForm((f) => ({
      ...f,
      targetServices: allSelected ? [] : KPA_SERVICES.map((s) => s.value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.mediaId) { toast.error('미디어를 선택해주세요.'); return; }
    if (!form.title.trim()) { toast.error('캠페인명을 입력해주세요.'); return; }
    if (form.targetServices.length === 0) { toast.error('서비스를 1개 이상 선택해주세요.'); return; }
    if (!form.startAt || !form.endAt) { toast.error('기간을 설정해주세요.'); return; }
    if (new Date(form.endAt) <= new Date(form.startAt)) {
      toast.error('종료일은 시작일 이후여야 합니다.'); return;
    }
    onSubmit(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-base font-semibold text-gray-900">사이니지 캠페인 요청</h3>
          <button onClick={onCancel} disabled={loading}>
            <X size={18} className="text-gray-400 hover:text-gray-600" />
          </button>
        </div>

        {/* 안내 */}
        <div className="mx-6 mt-4 flex gap-2 rounded-md bg-blue-50 p-3 text-xs text-blue-700">
          <Info size={14} className="mt-0.5 shrink-0" />
          <div>
            <p>개별 매장 단위가 아니라 선택한 서비스 전체에 노출됩니다.</p>
            <p className="mt-0.5">승인된 캠페인은 수정할 수 없습니다. 변경이 필요한 경우 새 요청으로 등록해야 합니다.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          {/* 미디어 선택 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              사이니지 미디어 <span className="text-red-500">*</span>
            </label>
            {mediaList.length === 0 ? (
              <p className="text-sm text-gray-400">
                활성화된 YouTube/Vimeo 미디어가 없습니다. 먼저 사이니지 미디어를 등록해주세요.
              </p>
            ) : (
              <select
                value={form.mediaId}
                onChange={(e) => setForm((f) => ({ ...f, mediaId: e.target.value }))}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">미디어를 선택하세요</option>
                {mediaList.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.sourceType.toUpperCase()}] {m.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* 캠페인명 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              캠페인명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="캠페인명을 입력하세요"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              maxLength={255}
              required
            />
          </div>

          {/* 대상 서비스 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              대상 서비스 <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleAll}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  allSelected
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400'
                }`}
              >
                전체 선택
              </button>
              {KPA_SERVICES.map((s) => {
                const checked = form.targetServices.includes(s.value);
                return (
                  <button
                    type="button"
                    key={s.value}
                    onClick={() => toggleService(s.value)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      checked
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-blue-400'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 기간 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                종료일 <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* 요청 메모 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              요청 메모 <span className="text-gray-400">(선택)</span>
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="운영자에게 전달할 메모를 입력하세요"
              rows={2}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading || mediaList.length === 0}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            >
              {loading ? '요청 중...' : '요청 제출'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function CampaignRequestPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);

  const { data: mediaList = [] } = useQuery({
    queryKey: ['supplier-campaign-my-media'],
    queryFn: fetchMyMedia,
    staleTime: 60_000,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['supplier-campaign-requests', page],
    queryFn: () => fetchRequests(page),
  });

  const createMutation = useMutation({
    mutationFn: createRequest,
    onSuccess: () => {
      toast.success('캠페인 요청이 제출되었습니다. 운영자 승인 후 집행됩니다.');
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ['supplier-campaign-requests'] });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error ?? '요청 제출 중 오류가 발생했습니다.';
      toast.error(msg);
    },
  });

  // ── 컬럼 ──────────────────────────────────────────────────────────────────

  const columns: O4OColumn<CampaignRequest>[] = [
    {
      key: 'title',
      header: '캠페인명',
      render: (row) => (
        <span className="text-sm font-medium text-gray-900">
          {row.payload?.title ?? '(제목 없음)'}
        </span>
      ),
    },
    {
      key: 'targetServices',
      header: '대상 서비스',
      render: (row) => (
        <span className="text-sm text-gray-600">
          {serviceLabels(row.payload?.targetServices ?? [])}
        </span>
      ),
    },
    {
      key: 'period',
      header: '기간',
      width: 200,
      render: (row) => (
        <span className="text-sm text-gray-500">
          {row.payload?.startAt ? fmtDate(row.payload.startAt) : '-'}
          {' ~ '}
          {row.payload?.endAt ? fmtDate(row.payload.endAt) : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: 90,
      render: (row) => {
        const badge = STATUS_BADGE[row.status];
        return badge ? (
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>
        ) : (
          <span className="text-xs text-gray-400">{row.status}</span>
        );
      },
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: 100,
      render: (row) => (
        <span className="text-sm text-gray-400">{fmtDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'reviewComment',
      header: '검토 의견',
      render: (row) =>
        row.reviewComment ? (
          <span className="text-sm text-gray-500">{row.reviewComment}</span>
        ) : (
          <span className="text-xs text-gray-300">-</span>
        ),
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6">
      <PageHeader
        title="사이니지 캠페인 요청"
        subtitle="승인된 사이니지 영상을 서비스에 강제 삽입 캠페인으로 요청합니다."
        actions={[
          {
            id: 'refresh',
            label: '새로고침',
            icon: <RefreshCw size={14} />,
            onClick: () => refetch(),
          },
          {
            id: 'new',
            label: '캠페인 요청',
            icon: <Plus size={14} />,
            onClick: () => setShowForm(true),
            variant: 'primary',
          },
        ]}
      />

      {/* 안내 */}
      <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
        <Monitor size={14} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-medium">캠페인 집행 안내</p>
          <p className="mt-0.5">
            승인된 캠페인은 선택한 서비스의 모든 매장 사이니지에 기간 동안 자동 노출됩니다.
            개별 매장 단위 제어는 지원되지 않습니다.
            승인 후 내용 변경이 필요한 경우 새 요청을 등록하세요.
          </p>
        </div>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      ) : (
        <BaseTable<CampaignRequest>
          columns={columns}
          data={data?.data ?? []}
          emptyMessage="요청한 캠페인이 없습니다. '캠페인 요청' 버튼으로 새 요청을 등록하세요."
        />
      )}

      {/* 페이지네이션 */}
      {data && data.total > 20 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            이전
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">{page}페이지</span>
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => p + 1)}
            disabled={(data?.data.length ?? 0) < 20}
          >
            다음
          </button>
        </div>
      )}

      {/* 요청 폼 모달 */}
      {showForm && (
        <RequestForm
          mediaList={mediaList}
          loading={createMutation.isPending}
          onSubmit={(form) => createMutation.mutate(form)}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
