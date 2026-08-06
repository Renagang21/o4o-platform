/**
 * ContentPage (약국 경영자) — 매장 콘텐츠
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
 *
 * 매장이 **직접 작성**하는 콘텐츠(Store Production Material) 목록·작성·수정·삭제.
 * 원장은 공통 `kpa_store_contents` (service-neutral Store Production Material, CLAUDE.md §5).
 * 신규 테이블 0 / migration 0.
 *
 * 경계:
 *   - 조직은 서버가 Pharmacy-Hub enrollment 로 결정한다(프론트가 보내지 않는다).
 *   - 운영자·공급자 원본은 여기서 수정하지 않는다. sourceType='direct' 만 편집 가능하고,
 *     사본(snapshot_edit)이 목록에 있어도 편집 진입을 열지 않는다 (원본·사본 경계 보존).
 *   - 본문 저장 키는 공통 규약 그대로 `contentJson.html`.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import {
  fetchStoreContents,
  fetchStoreContent,
  createStoreContent,
  updateStoreContent,
  deleteStoreContent,
  contentJsonToHtml,
  type StoreContentListItem,
  type StoreContentsPage,
} from '../../lib/api/pharmacyHubStoreContent';
import { StoreConnectionNotice } from '../../components/store-owner/StoreConnectionNotice';

type Mode = { kind: 'list' } | { kind: 'create' } | { kind: 'edit'; id: string };

const SOURCE_LABELS: Record<string, string> = {
  direct: '직접 작성',
  snapshot_edit: '가져온 자료',
};

export default function StoreOwnerContentPage() {
  const [page, setPage] = useState<StoreContentsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: 'list' });

  const load = useCallback(() => {
    setLoading(true);
    fetchStoreContents()
      .then((p) => {
        setPage(p);
        setError(null);
      })
      .catch((e: any) => setError(e?.message || '매장 콘텐츠를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (item: StoreContentListItem) => {
    if (!window.confirm(`"${item.title}" 콘텐츠를 삭제할까요?`)) return;
    try {
      await deleteStoreContent(item.id);
      load();
    } catch (e: any) {
      window.alert(e?.message || '삭제하지 못했습니다.');
    }
  };

  if (mode.kind !== 'list') {
    return (
      <ContentEditor
        contentId={mode.kind === 'edit' ? mode.id : null}
        onClose={() => setMode({ kind: 'list' })}
        onSaved={() => {
          setMode({ kind: 'list' });
          load();
        }}
      />
    );
  }

  const connection = page?.storeConnection;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">매장 콘텐츠</h1>
          <p className="mt-1 text-sm text-gray-500">
            약국이 직접 작성해 매장에서 활용하는 콘텐츠입니다. 저장하면 자료함에서도 확인할 수 있습니다.
          </p>
        </div>
        {connection?.status === 'connected' && (
          <button
            type="button"
            onClick={() => setMode({ kind: 'create' })}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            콘텐츠 작성
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {connection && connection.status !== 'connected' && (
        <>
          <StoreConnectionNotice connection={connection} subject="매장 콘텐츠" />
          <p className="mt-6 text-sm">
            <Link to="/store-owner" className="text-gray-500 underline">
              약국 경영자 홈
            </Link>
          </p>
        </>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : connection?.status === 'connected' ? (
        page && page.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-600">저장된 콘텐츠가 없습니다.</p>
            <p className="mt-2 text-sm text-gray-400">
              "콘텐츠 작성" 으로 매장 안내문·상품 설명 등을 직접 만들어 보세요.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {page?.items.map((item) => {
              const editable = item.sourceType === 'direct';
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{item.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                      <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">
                        {SOURCE_LABELS[item.sourceType] ?? item.sourceType}
                      </span>
                      <span>{new Date(item.updatedAt).toLocaleDateString('ko-KR')}</span>
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    {editable ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setMode({ kind: 'edit', id: item.id })}
                          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                        >
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </>
                    ) : (
                      // 원본에서 가져온 사본은 본 화면의 편집 대상이 아니다 (경계 보존).
                      <span className="text-xs text-gray-400">가져온 자료</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </div>
  );
}

// ─── 작성/수정 ───────────────────────────────────────────────────────────────

function ContentEditor({
  contentId,
  onClose,
  onSaved,
}: {
  contentId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState('');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(Boolean(contentId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contentId) return;
    let cancelled = false;
    fetchStoreContent(contentId)
      .then((c) => {
        if (cancelled) return;
        setTitle(c.title);
        setHtml(contentJsonToHtml(c.contentJson));
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || '콘텐츠를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contentId]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (!html || html.trim() === '' || html === '<p></p>') {
      setError('내용을 입력해 주세요.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      // 본문 키는 공통 규약 `html` 그대로 — 새 키를 만들지 않는다.
      const payload = { title: title.trim(), contentJson: { html } };
      if (contentId) await updateStoreContent(contentId, payload);
      else await createStoreContent(payload);
      onSaved();
    } catch (e: any) {
      setError(e?.message || '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{contentId ? '콘텐츠 수정' : '콘텐츠 작성'}</h1>
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
            disabled={saving || loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

      {loading ? (
        <p className="text-sm text-gray-500">불러오는 중…</p>
      ) : (
        <>
          <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-content-title">
            제목
          </label>
          <input
            id="ph-content-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="콘텐츠 제목을 입력하세요"
            className="mb-4 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <RichTextEditor
              value={html}
              onChange={(content) => setHtml(content.html)}
              placeholder="매장에서 활용할 내용을 입력하세요."
              minHeight="420px"
              preset="full"
            />
          </div>
        </>
      )}
    </div>
  );
}
