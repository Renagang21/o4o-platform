/**
 * ResourcesPage — 자료실 관리 (Pharmacy-Hub 운영자)
 *
 * WO-O4O-OPERATOR-CROSSSERVICE-CAPABILITY-ADOPTION-FINAL-AUDIT-AND-GAP-CLOSURE-V1
 *
 * §4 재판정: PH 자료실 = REQUIRED_BUT_MISSING.
 *   회원 자료실(/resources)은 이미 채택돼 있으나 **등록 경로가 없어 구조적으로 0건**이었다.
 *   (WO-O4O-PHARMACYHUB-COMMUNITY-CONTENT-RESOURCE-TABLE-AND-ADOPTION-V1 이
 *    "운영자 등록 UI 부재 — 별도 WO" 로 남긴 항목.)
 *
 * 계약 (전부 기존 공통 CMS — 신규 table 0 / migration 0 / 신규 backend route 0 / 권한 모델 변경 0):
 *   GET/POST/PUT/PATCH `/api/v1/cms/contents` · serviceKey='pharmacy-hub' · type='knowledge'.
 *   `pharmacy-hub:operator|admin` 은 authorizeCmsMutation 이 이미 인가한다.
 *
 * 판정 = ADOPTED_SERVICE_SPECIFIC:
 *   공통 `@o4o/operator-core-ui` Resources 모듈은 **service_resources 원장** 계약
 *   (operatorList/operatorUpdateStatus/operatorDelete · draft|published|private)이라
 *   cms_contents 원장(draft|pending|published|archived · create/edit 있음)과 맞지 않는다.
 *   원장이 다른 화면을 공통 모듈에 억지로 태우지 않는다 (§6 중지 조건 — 고유 의미 훼손 금지).
 *   대신 공통 View 원시 요소(@o4o/operator-ux-core DataTable · @o4o/content-editor
 *   RichTextEditor)만 소비하고 PH 전용 table/editor 사본은 만들지 않는다.
 *
 * 상태 전이는 서버(CMS_ALLOWED_TRANSITIONS)가 정본이라 UI 는 그 전이만 노출한다 —
 * 400 을 유발하는 버튼을 만들지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
import { RichTextEditor } from '@o4o/content-editor';
import { toast } from '@o4o/error-handling';
import {
  listPharmacyHubResourcesForOperator,
  getPharmacyHubResource,
  createPharmacyHubResource,
  updatePharmacyHubResource,
  setPharmacyHubResourceStatus,
  type CmsContentItem,
} from '../../lib/api/pharmacyHubResources';

const PAGE_LIMIT = 20;

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: '', label: '전체' },
  { value: 'draft', label: '초안' },
  { value: 'pending', label: '검토 요청' },
  { value: 'published', label: '게시됨' },
  { value: 'archived', label: '보관' },
];

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  pending: '검토 요청',
  published: '게시됨',
  archived: '보관',
};

const STATUS_CLASS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending: 'bg-amber-100 text-amber-800',
  published: 'bg-emerald-100 text-emerald-800',
  archived: 'bg-slate-200 text-slate-600',
};

/** 서버 CMS_ALLOWED_TRANSITIONS 와 동일. 여기 없는 전이는 버튼도 만들지 않는다. */
const NEXT_STATUSES: Record<string, string[]> = {
  draft: ['pending', 'archived'],
  pending: ['published', 'draft'],
  published: ['archived'],
  archived: [],
};

const TRANSITION_LABEL: Record<string, string> = {
  pending: '검토 요청',
  published: '게시',
  draft: '초안으로',
  archived: '보관',
};

interface FormState {
  id: string | null;
  title: string;
  summary: string;
  body: string;
  linkUrl: string;
  linkText: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  title: '',
  summary: '',
  body: '',
  linkUrl: '',
  linkText: '',
};

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

export default function OperatorResourcesPage() {
  const [items, setItems] = useState<CmsContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  // 조회 실패를 빈 목록으로 삼키지 않는다 (O4O load-error 계약).
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPharmacyHubResourcesForOperator({
        limit: PAGE_LIMIT,
        offset: (page - 1) * PAGE_LIMIT,
        search,
        status: status || undefined,
      });
      setItems(res.items);
      setTotal(res.total);
    } catch (e) {
      setItems([]);
      setTotal(0);
      setError((e as Error).message || 'PH_RESOURCE_LIST_FAILED');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => setForm({ ...EMPTY_FORM });

  const openEdit = async (row: CmsContentItem) => {
    try {
      // 목록 응답에는 body 가 없다 — 편집은 상세를 다시 읽어 본문을 잃지 않는다.
      const detail = await getPharmacyHubResource(row.id);
      setForm({
        id: detail.id,
        title: detail.title ?? '',
        summary: detail.summary ?? '',
        body: detail.body ?? '',
        linkUrl: detail.linkUrl ?? '',
        linkText: detail.linkText ?? '',
      });
    } catch (e) {
      toast.error(`자료를 불러오지 못했습니다 (${(e as Error).message})`);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    if (!form.title.trim()) {
      toast.error('제목을 입력하세요.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        summary: form.summary.trim(),
        body: form.body,
        linkUrl: form.linkUrl.trim(),
        linkText: form.linkText.trim(),
      };
      if (form.id) {
        await updatePharmacyHubResource(form.id, payload);
        toast.success('자료를 수정했습니다.');
      } else {
        await createPharmacyHubResource(payload);
        toast.success('자료를 등록했습니다. (초안)');
      }
      setForm(null);
      await load();
    } catch (e) {
      toast.error(`저장에 실패했습니다 (${(e as Error).message})`);
    } finally {
      setSaving(false);
    }
  };

  const handleTransition = async (row: CmsContentItem, next: string) => {
    try {
      await setPharmacyHubResourceStatus(row.id, next);
      toast.success(`상태를 "${STATUS_LABEL[next] ?? next}" 로 변경했습니다.`);
      await load();
    } catch (e) {
      toast.error(`상태 변경에 실패했습니다 (${(e as Error).message})`);
    }
  };

  const columns: ListColumnDef<CmsContentItem>[] = [
    {
      key: 'title',
      header: '제목',
      minWidth: 220,
      // 좁은 화면에서 가로 스크롤 시 행 신원 유지
      // (WO-O4O-OPERATOR-GP-VIEW-DEDUP-AND-CROSSSERVICE-TABLE-UX-ALIGN-V1 계약).
      stickyOnMobile: true,
      render: (_v, row) => (
        <div>
          <div className="font-medium text-gray-900">{row.title}</div>
          {row.summary ? (
            <div className="mt-0.5 line-clamp-1 text-xs text-gray-500">{row.summary}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '110px',
      render: (_v, row) => (
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            STATUS_CLASS[row.status] ?? 'bg-gray-100 text-gray-700'
          }`}
        >
          {STATUS_LABEL[row.status] ?? row.status}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '120px',
      render: (_v, row) => (
        <span className="text-sm text-gray-600">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: 'publishedAt',
      header: '게시일',
      width: '120px',
      render: (_v, row) => (
        <span className="text-sm text-gray-600">{formatDate(row.publishedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '작업',
      width: '240px',
      render: (_v, row) => (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void openEdit(row)}
            className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
          >
            수정
          </button>
          {(NEXT_STATUSES[row.status] ?? []).map((next) => (
            <button
              key={next}
              type="button"
              onClick={() => void handleTransition(row, next)}
              className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
            >
              {TRANSITION_LABEL[next] ?? next}
            </button>
          ))}
        </div>
      ),
    },
  ];

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">자료실 관리</h1>
          <p className="mt-1 text-sm text-gray-500">
            회원 자료실(/resources)에 게시되는 자료를 등록·수정하고 게시 상태를 관리합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          새 자료 등록
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(searchInput);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제목·요약 검색"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            검색
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          자료 목록을 불러오지 못했습니다. ({error})
          <button type="button" onClick={() => void load()} className="ml-2 underline">
            다시 시도
          </button>
        </div>
      ) : (
        <>
          <DataTable
            columns={columns}
            data={items}
            rowKey="id"
            loading={loading}
            tableId="pharmacy-hub-operator-resources"
            emptyMessage="등록된 자료가 없습니다."
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
              >
                이전
              </button>
              <span className="text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-gray-300 px-2 py-1 disabled:opacity-40"
              >
                다음
              </button>
            </div>
          )}
        </>
      )}

      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-lg bg-white p-5 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              {form.id ? '자료 수정' : '새 자료 등록'}
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">제목</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="자료 제목"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">요약</label>
                <input
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  placeholder="목록에 보이는 한 줄 설명"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">
                    링크 URL (선택)
                  </label>
                  <input
                    value={form.linkUrl}
                    onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="https://"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-500">
                    링크 표시 문구 (선택)
                  </label>
                  <input
                    value={form.linkText}
                    onChange={(e) => setForm({ ...form, linkText: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="자세히 보기"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-500">내용</label>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <RichTextEditor
                    value={form.body}
                    onChange={(content) => setForm((f) => (f ? { ...f, body: content.html } : f))}
                    placeholder="자료 내용을 입력하세요."
                    minHeight="320px"
                    preset="full"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setForm(null)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
