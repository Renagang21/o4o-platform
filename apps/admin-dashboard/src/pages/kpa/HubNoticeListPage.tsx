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

const API_LIST = '/api/v1/kpa/news/admin/list';
const API_CREATE = '/api/v1/kpa/news/';
const API_UPDATE = (id: string) => `/api/v1/kpa/news/${id}`;

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

interface ListResponse {
  success: boolean;
  data: NoticeItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

interface NoticeFormData {
  title: string;
  summary: string;
  body: string;
  status: 'draft' | 'published';
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

async function fetchNotices(page: number): Promise<ListResponse> {
  const res = await authClient.api.get<ListResponse>(API_LIST, {
    params: { serviceKey: 'kpa-society', type: 'notice', page, limit: 20 },
  });
  return res.data;
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

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['hub-notices', page],
    queryFn: () => fetchNotices(page),
  });

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
        <span className="text-xs text-gray-500">
          {row.expiresAt ? new Date(row.expiresAt).toLocaleDateString('ko-KR') : '—'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: 110,
      render: (row) => (
        <span className="text-xs text-gray-500">
          {new Date(row.createdAt).toLocaleDateString('ko-KR')}
        </span>
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
          데이터를 불러오는 중 오류가 발생했습니다.
        </div>
      ) : (
        <BaseTable<NoticeItem>
          columns={columns}
          data={data?.data ?? []}
          emptyMessage="등록된 공지가 없습니다."
        />
      )}

      {data && data.pagination.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            이전
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {data.pagination.totalPages}
          </span>
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
            disabled={page >= data.pagination.totalPages}
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
