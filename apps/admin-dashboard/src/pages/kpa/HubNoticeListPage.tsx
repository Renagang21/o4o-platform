/**
 * HubNoticeListPage — HUB 공지 관리
 *
 * WO-O4O-HUB-NOTICE-SYSTEM-V1
 *
 * 경로: /operator/hub-notices
 * 기능: 공지 목록 + 등록/수정/비공개 처리
 *
 * 구현 원칙:
 * - cms_contents (type='notice') 재사용, 신규 테이블 없음
 * - 기존 /api/v1/kpa/news/* CRUD 재사용 (ALLOWED_TYPES includes 'notice')
 * - isPinned, expiresAt 지원
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { toast } from 'react-hot-toast';
import { PlusCircle, Pin, Archive, RefreshCw, Edit } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';

// ── Constants ────────────────────────────────────────────────────────────────

// authClient.api 의 baseURL 은 이미 `/api/v1` 을 포함한다 (packages/auth-client/src/client.ts getApiUrl).
// 따라서 여기서는 `/api/v1` 접두어를 붙이지 않는다.
const API_LIST = '/kpa/news/admin/list';
const API_CREATE = '/kpa/news/';
const API_UPDATE = (id: string) => `/kpa/news/${id}`;

// ── Types ────────────────────────────────────────────────────────────────────

interface NoticeItem {
  id: string;
  title: string;
  summary: string | null;
  status: 'draft' | 'published' | 'archived';
  isPinned: boolean;
  publishedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

/**
 * WO-O4O-ADMIN-HUB-NOTICES-CRASH-FIX-V1
 *
 * 이 화면이 쓰는 `GET /kpa/news/admin/list` 의 실제 응답 계약은 **평면형** 이다
 * (apps/api-server/src/routes/kpa/kpa.routes.ts:1230):
 *   { success, data: NoticeItem[], total, page, limit, totalPages }
 *
 * 기존 코드는 형제 화면(HubContentsPage) 의 `pagination: { ... }` **중첩형** 을 그대로 옮겨와
 * `data.pagination.totalPages` 를 읽었고, `pagination` 이 undefined 라
 * 조회가 **성공할 때마다** TypeError 로 화면이 크래시했다.
 *
 * 두 화면의 endpoint 는 계약이 서로 다르다 —
 *   /hub/contents        → 중첩형 pagination (HubContentsPage 는 정상)
 *   /kpa/news/admin/list → 평면형 (이 화면)
 * 따라서 여기서만 실제 계약에 맞춘다. 백엔드 계약은 변경하지 않는다.
 */
interface ListResponse {
  success: boolean;
  data: NoticeItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 응답이 계약을 위반했을 때(= 정상 빈 목록이 아님) 구분하기 위한 오류 */
export class NoticeContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NoticeContractError';
  }
}

interface NoticeFormData {
  title: string;
  summary: string;
  body: string;
  status: 'draft' | 'published' | 'archived';
  isPinned: boolean;
  publishedAt: string;
  expiresAt: string;
}

const EMPTY_FORM: NoticeFormData = {
  title: '',
  summary: '',
  body: '',
  status: 'published',
  isPinned: false,
  publishedAt: '',
  expiresAt: '',
};

// ── API ──────────────────────────────────────────────────────────────────────

export async function fetchNotices(page: number): Promise<ListResponse> {
  const res = await authClient.api.get<ListResponse>(API_LIST, {
    params: { serviceKey: 'kpa-society', type: 'notice', page, limit: 20 },
  });
  const body = res.data;

  // 계약 검증: `data` 가 배열이 아니면 **정상 빈 목록이 아니라 계약 위반**이다.
  // 빈 배열로 위장하면 오류가 "공지 0건" 으로 보여 원인이 숨는다 → 오류 상태로 올린다.
  if (!body || !Array.isArray(body.data)) {
    throw new NoticeContractError('공지 목록 응답 구조가 예상과 다릅니다.');
  }
  return body;
}

/**
 * 페이지 수 산출. 표시 전용이며 목록 데이터를 위조하지 않는다.
 * 1) 계약대로 평면 `totalPages` 사용
 * 2) 누락 시 total/limit 로 보정
 * 3) 그래도 알 수 없으면 1 (페이지네이션 UI 를 숨김)
 */
export function resolveTotalPages(body: ListResponse | undefined): number {
  if (!body) return 1;
  if (typeof body.totalPages === 'number' && Number.isFinite(body.totalPages) && body.totalPages > 0) {
    return body.totalPages;
  }
  const total = Number(body.total);
  const limit = Number(body.limit);
  if (Number.isFinite(total) && Number.isFinite(limit) && limit > 0) {
    return Math.max(1, Math.ceil(total / limit));
  }
  return 1;
}

async function createNotice(data: NoticeFormData): Promise<void> {
  await authClient.api.post(API_CREATE, {
    ...data,
    type: 'notice',
    serviceKey: 'kpa-society',
    isPinned: data.isPinned,
    publishedAt: data.publishedAt || null,
    expiresAt: data.expiresAt || null,
  });
}

async function updateNotice(id: string, data: Partial<NoticeFormData & { status: string }>): Promise<void> {
  await authClient.api.put(API_UPDATE(id), data);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** 날짜 표시. null/undefined/파싱 불가 값을 '—' 로 안전 처리한다. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ko-KR');
}

// ── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  draft:     { label: '임시저장', cls: 'bg-gray-100 text-gray-600' },
  published: { label: '게시 중', cls: 'bg-green-50 text-green-700' },
  archived:  { label: '비공개', cls: 'bg-red-50 text-red-600' },
};

// ── Modal ─────────────────────────────────────────────────────────────────────

interface NoticeModalProps {
  initial?: NoticeItem | null;
  onClose: () => void;
  onSaved: () => void;
}

function NoticeModal({ initial, onClose, onSaved }: NoticeModalProps) {
  const toLocalDate = (iso: string | null | undefined) => {
    if (!iso) return '';
    return iso.slice(0, 16); // "YYYY-MM-DDTHH:mm"
  };

  const [form, setForm] = useState<NoticeFormData>(
    initial
      ? {
          title: initial.title,
          summary: initial.summary ?? '',
          body: '',
          status: initial.status === 'archived' ? 'draft' : initial.status,
          isPinned: initial.isPinned,
          publishedAt: toLocalDate(initial.publishedAt),
          expiresAt: toLocalDate(initial.expiresAt),
        }
      : EMPTY_FORM,
  );

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('제목을 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      if (initial) {
        await updateNotice(initial.id, form);
        toast.success('공지가 수정되었습니다.');
      } else {
        await createNotice(form);
        toast.success('공지가 등록되었습니다.');
      }
      onSaved();
    } catch {
      toast.error('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const set = (key: keyof NoticeFormData, val: string | boolean) =>
    setForm((f) => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          {initial ? '공지 수정' : '공지 등록'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">제목 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="공지 제목"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">요약</label>
            <input
              type="text"
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="목록에 표시될 요약 (선택)"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">내용</label>
            <textarea
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              rows={4}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="공지 본문"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">게시 시작</label>
              <input
                type="datetime-local"
                value={form.publishedAt}
                onChange={(e) => set('publishedAt', e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">게시 종료</label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => set('expiresAt', e.target.value)}
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isPinned}
                onChange={(e) => set('isPinned', e.target.checked)}
                className="rounded border-gray-300"
              />
              <Pin size={14} className="text-amber-500" />
              상단 고정
            </label>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">상태</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value as 'draft' | 'published')}
                className="rounded border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="published">게시 중</option>
                <option value="draft">임시저장</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export default function HubNoticeListPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalItem, setModalItem] = useState<NoticeItem | null | 'new'>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['hub-notices', page],
    queryFn: () => fetchNotices(page),
  });

  // 화면 상태를 명시적으로 구분한다: loading / error(계약 위반 포함) / empty / 정상 목록
  const isContractError = error instanceof NoticeContractError;
  const items = data?.data ?? [];
  const totalPages = resolveTotalPages(data);

  const archiveMutation = useMutation({
    mutationFn: (id: string) => updateNotice(id, { status: 'archived' }),
    onSuccess: () => {
      toast.success('공지가 비공개 처리되었습니다.');
      qc.invalidateQueries({ queryKey: ['hub-notices'] });
    },
    onError: () => toast.error('처리 중 오류가 발생했습니다.'),
  });

  const handleSaved = () => {
    setModalItem(null);
    qc.invalidateQueries({ queryKey: ['hub-notices'] });
  };

  const columns: O4OColumn<NoticeItem>[] = [
    {
      key: 'title',
      header: '제목',
      render: (row) => (
        <div className="flex items-start gap-2">
          {row.isPinned && <Pin size={13} className="mt-0.5 shrink-0 text-amber-500" />}
          <div>
            <p className="text-sm font-medium text-gray-900">{row.title}</p>
            {row.summary && (
              <p className="mt-0.5 max-w-sm truncate text-xs text-gray-500">{row.summary}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: 100,
      render: (row) => {
        const cfg = STATUS_BADGE[row.status] ?? STATUS_BADGE.draft;
        return (
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.cls}`}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'expiresAt',
      header: '종료일',
      width: 120,
      render: (row) => (
        <span className="text-xs text-gray-500">{formatDate(row.expiresAt)}</span>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: 110,
      render: (row) => (
        <span className="text-xs text-gray-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'id',
      header: '관리',
      width: 130,
      render: (row) => (
        <div className="flex gap-1">
          <button
            onClick={() => setModalItem(row)}
            className="flex items-center gap-1 rounded border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
          >
            <Edit size={12} /> 수정
          </button>
          {row.status !== 'archived' && (
            <button
              onClick={() => {
                if (confirm('이 공지를 비공개 처리하겠습니까?')) {
                  archiveMutation.mutate(row.id);
                }
              }}
              className="flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              <Archive size={12} /> 비공개
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeader
        title="HUB 공지 관리"
        subtitle="KPA Society HUB에 게시할 공지를 등록하고 관리합니다."
        actions={[
          {
            id: 'add',
            label: '공지 등록',
            icon: <PlusCircle size={14} />,
            onClick: () => setModalItem('new'),
          },
          {
            id: 'refresh',
            label: '새로고침',
            icon: <RefreshCw size={14} />,
            onClick: () => refetch(),
          },
        ]}
      />

      {isLoading ? (
        <div className="py-12 text-center text-sm text-gray-400">불러오는 중...</div>
      ) : isError ? (
        <div className="rounded border border-red-200 bg-red-50 p-6 text-center text-sm text-red-600">
          <p>
            {isContractError
              ? '공지 목록 응답이 예상한 형식과 달라 표시할 수 없습니다.'
              : '데이터를 불러오는 중 오류가 발생했습니다.'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 rounded border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-100"
          >
            다시 시도
          </button>
        </div>
      ) : (
        // 데이터 0건은 오류가 아니라 정상 empty state 로 표시한다.
        <BaseTable<NoticeItem>
          columns={columns}
          data={items}
          emptyMessage="등록된 공지가 없습니다."
        />
      )}

      {!isError && totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            이전
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            다음
          </button>
        </div>
      )}

      {modalItem !== null && (
        <NoticeModal
          initial={modalItem === 'new' ? null : modalItem}
          onClose={() => setModalItem(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
