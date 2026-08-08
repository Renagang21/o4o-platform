/**
 * PopPage (약국 경영자) — 매장 POP
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 B)
 *
 * 원장은 공통 `store_pops` 다 (author_role='store') — 신규 테이블 0.
 * 조직은 서버가 Pharmacy-Hub enrollment 로 결정한다.
 *
 * 흐름: 작성(draft) → 미리보기 → 발행(published) → 보관(archived).
 * 보관은 삭제가 아니라 매장 목록에서 내리는 것이며 되돌릴 수 있다.
 *
 * 운영자 HUB 가져오기는 원본이 있을 때만 노출한다 — Pharmacy-Hub 에는 아직 운영자 POP
 * 원본이 없어 보통 비어 있고, 그 상태를 "준비 중" 버튼으로 위장하지 않는다.
 */

import { useCallback, useEffect, useState } from 'react';
import { RichTextEditor, ContentRenderer } from '@o4o/content-editor';
import {
  fetchStorePops,
  fetchPopHubSources,
  createStorePop,
  updateStorePop,
  publishStorePop,
  archiveStorePop,
  deleteStorePop,
  importStorePop,
  type StorePop,
  type PopStatus,
  type PopHubSource,
} from '../../lib/api/pharmacyHubStorePop';
import { StoreConnectionNotice, type StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const STATUS_LABELS: Record<PopStatus, string> = {
  draft: '작성 중',
  published: '발행됨',
  archived: '보관됨',
};

const STATUS_STYLES: Record<PopStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-green-50 text-green-700',
  archived: 'bg-amber-50 text-amber-700',
};

export default function StoreOwnerPopPage() {
  const [items, setItems] = useState<StorePop[]>([]);
  const [connection, setConnection] = useState<StoreConnectionState | null>(null);
  const [hubSources, setHubSources] = useState<PopHubSource[]>([]);
  const [statusFilter, setStatusFilter] = useState<PopStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StorePop | 'new' | null>(null);
  const [previewing, setPreviewing] = useState<StorePop | null>(null);

  const load = useCallback(
    (filter: PopStatus | 'all') => {
      setLoading(true);
      fetchStorePops({ page: 1, limit: 100, status: filter === 'all' ? undefined : filter })
        .then((p) => {
          setConnection(p.storeConnection);
          setItems(p.items);
          setError(null);
        })
        .catch((e: any) => setError(e?.message || 'POP 목록을 불러오지 못했습니다.'))
        .finally(() => setLoading(false));
    },
    [],
  );

  useEffect(() => {
    load(statusFilter);
  }, [load, statusFilter]);

  // 운영자 원본이 실제로 있을 때만 "가져오기" 를 노출하기 위해 목록과 별도로 조회한다.
  useEffect(() => {
    fetchPopHubSources()
      .then((r) => setHubSources(r.items))
      .catch(() => setHubSources([]));
  }, []);

  const act = async (fn: () => Promise<unknown>, confirmMessage?: string) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    try {
      await fn();
      load(statusFilter);
    } catch (e: any) {
      window.alert(e?.message || '처리하지 못했습니다.');
    }
  };

  if (editing) {
    return (
      <PopForm
        pop={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load(statusFilter);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">POP</h1>
          <p className="mt-1 text-sm text-gray-500">
            매장에 붙이거나 띄울 안내물을 작성합니다. 작성 중 → 발행 → 보관 순서로 관리합니다.
          </p>
        </div>
        {connection?.status === 'connected' && (
          <div className="flex items-center gap-2">
            {hubSources.length > 0 && (
              <ImportButton sources={hubSources} onImported={() => load(statusFilter)} />
            )}
            <button
              type="button"
              onClick={() => setEditing('new')}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              POP 작성
            </button>
          </div>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {connection && connection.status !== 'connected' ? (
        <StoreConnectionNotice connection={connection} subject="매장 POP" />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {(['all', 'draft', 'published', 'archived'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setStatusFilter(f)}
                className={`rounded-md border px-3 py-1.5 text-xs ${
                  statusFilter === f
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {f === 'all' ? '전체' : STATUS_LABELS[f]}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">불러오는 중…</p>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
              <p className="text-sm font-medium text-gray-600">POP 이 없습니다.</p>
              <p className="mt-2 text-sm text-gray-400">"POP 작성" 으로 매장 안내물을 만들어 보세요.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
              {items.map((pop) => (
                <li key={pop.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{pop.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span className={`rounded px-1.5 py-0.5 ${STATUS_STYLES[pop.status]}`}>
                        {STATUS_LABELS[pop.status]}
                      </span>
                      {pop.excerpt && <span className="truncate">{pop.excerpt}</span>}
                      <span>{new Date(pop.updatedAt).toLocaleDateString('ko-KR')}</span>
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewing(pop)}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      미리보기
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(pop)}
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                    >
                      수정
                    </button>
                    {pop.status !== 'published' && (
                      <button
                        type="button"
                        onClick={() => act(() => publishStorePop(pop.id))}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-green-700 hover:bg-green-50"
                      >
                        발행
                      </button>
                    )}
                    {pop.status !== 'archived' && (
                      <button
                        type="button"
                        onClick={() => act(() => archiveStorePop(pop.id))}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                      >
                        보관
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        act(
                          () => deleteStorePop(pop.id),
                          `"${pop.title}" POP 을 삭제할까요? 보관과 달리 되돌릴 수 없습니다.`,
                        )
                      }
                      className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {previewing && <PopPreview pop={previewing} onClose={() => setPreviewing(null)} />}
    </div>
  );
}

// ─── 가져오기 ────────────────────────────────────────────────────────────────

function ImportButton({
  sources,
  onImported,
}: {
  sources: PopHubSource[];
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleImport = async (sourceId: string) => {
    setBusy(true);
    try {
      await importStorePop(sourceId);
      setOpen(false);
      onImported();
    } catch (e: any) {
      window.alert(e?.message || '가져오지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
      >
        운영자 자료 가져오기
      </button>
      {open && (
        <Dialog title="운영자 자료 가져오기" onClose={() => setOpen(false)}>
          <p className="mb-3 text-xs text-gray-500">
            가져오면 매장 사본이 만들어집니다. 이후 원본이 바뀌어도 내 사본은 그대로입니다.
          </p>
          <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-md border border-gray-200">
            {sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0 truncate text-sm">{s.title}</span>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleImport(s.id)}
                  className="flex-shrink-0 rounded-md border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                >
                  가져오기
                </button>
              </li>
            ))}
          </ul>
        </Dialog>
      )}
    </>
  );
}

// ─── 작성/수정 ───────────────────────────────────────────────────────────────

function PopForm({
  pop,
  onClose,
  onSaved,
}: {
  pop: StorePop | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(pop?.title ?? '');
  const [excerpt, setExcerpt] = useState(pop?.excerpt ?? '');
  const [content, setContent] = useState(pop?.content ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const input = { title: title.trim(), excerpt: excerpt.trim(), content };
      if (pop) await updateStorePop(pop.id, input);
      else await createStorePop(input);
      onSaved();
    } catch (e: any) {
      setError(e?.message || '저장하지 못했습니다.');
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{pop ? 'POP 수정' : 'POP 작성'}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-pop-title">
            제목
          </label>
          <input
            id="ph-pop-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
            placeholder="예: 환절기 건강관리 안내"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-pop-excerpt">
            한 줄 요약 (선택)
          </label>
          <input
            id="ph-pop-excerpt"
            type="text"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-500">내용</label>
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <RichTextEditor
              value={content}
              onChange={(c) => setContent(c.html)}
              placeholder="POP 에 넣을 내용을 입력하세요."
              minHeight="360px"
              preset="full"
            />
          </div>
        </div>
      </div>

      {pop && (
        <p className="mt-3 text-xs text-gray-400">
          저장해도 발행 상태는 바뀌지 않습니다. 매장에 노출하려면 목록에서 "발행" 을 누르세요.
        </p>
      )}
    </div>
  );
}

// ─── 미리보기 ────────────────────────────────────────────────────────────────

function PopPreview({ pop, onClose }: { pop: StorePop; onClose: () => void }) {
  return (
    <Dialog title={pop.title} onClose={onClose} wide>
      {pop.excerpt && <p className="mb-3 text-sm text-gray-500">{pop.excerpt}</p>}
      {pop.content ? (
        <ContentRenderer html={pop.content} variant="product-detail" />
      ) : (
        <p className="text-sm text-gray-400">내용이 비어 있습니다.</p>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          닫기
        </button>
      </div>
    </Dialog>
  );
}

function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`max-h-[85vh] w-full overflow-y-auto rounded-lg bg-white p-5 shadow-lg ${
          wide ? 'max-w-3xl' : 'max-w-md'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-base font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
