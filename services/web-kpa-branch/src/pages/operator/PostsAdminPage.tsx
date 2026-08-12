/**
 * PostsAdminPage — 분회 공지/자료실 글 관리 (운영자 글쓰기)
 * WO-O4O-PHARMACIST-BRANCH-SERVICE-FOUNDATION-DESIGN-AND-IMPLEMENTATION-V1 §5
 *
 * 1차 범위는 제목·본문·고정·공개 여부다. 첨부 업로드는 후속 WO 로 분리한다.
 * 대상 분회는 URL(slug)에서만 오고, 본문에 organizationId 를 넣지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  createPost,
  deletePost,
  getOperatorPosts,
  updatePost,
  type BranchPost,
  type BranchPostCategory,
} from '../../lib/api/branch';
import { describeApiError } from '../../lib/errors';

const EMPTY = { category: 'notice' as BranchPostCategory, title: '', content: '', isPinned: false };

export default function PostsAdminPage({ slug }: { slug: string }) {
  const [items, setItems] = useState<BranchPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const r = await getOperatorPosts(slug, { limit: 100 });
      setItems(r.items);
      setError(null);
    } catch (e) {
      setError(describeApiError(e));
    }
  }, [slug]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function submit(status: 'draft' | 'published') {
    if (!draft.title.trim()) {
      setError('제목을 입력하세요.');
      return;
    }
    setBusy(true);
    try {
      await createPost(slug, { ...draft, status });
      setDraft(EMPTY);
      await reload();
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleStatus(p: BranchPost) {
    setBusy(true);
    try {
      await updatePost(slug, p.id, { status: p.status === 'published' ? 'draft' : 'published' });
      await reload();
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: BranchPost) {
    if (!window.confirm(`"${p.title}" 글을 삭제할까요?`)) return;
    setBusy(true);
    try {
      await deletePost(slug, p.id);
      await reload();
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">글 관리</h1>

      <section className="mt-6 rounded border border-gray-200 p-4 text-sm">
        <h2 className="mb-3 font-semibold text-gray-900">새 글 작성</h2>
        <div className="space-y-3">
          <div className="flex gap-3">
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as BranchPostCategory })}
              className="rounded border border-gray-300 px-3 py-2"
            >
              <option value="notice">공지</option>
              <option value="resource">자료실</option>
            </select>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="제목"
              className="flex-1 rounded border border-gray-300 px-3 py-2"
            />
          </div>
          <textarea
            value={draft.content}
            onChange={(e) => setDraft({ ...draft, content: e.target.value })}
            rows={8}
            placeholder="본문"
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={draft.isPinned}
              onChange={(e) => setDraft({ ...draft, isPinned: e.target.checked })}
            />
            상단 고정
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit('published')}
              className="rounded bg-primary-600 px-4 py-2 font-medium text-white disabled:opacity-60"
            >
              게시
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit('draft')}
              className="rounded border border-gray-300 px-4 py-2 text-gray-700 disabled:opacity-60"
            >
              임시저장
            </button>
          </div>
        </div>
      </section>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">등록된 글</h2>
        {items === null && !error && <p className="text-sm text-gray-500">불러오는 중입니다…</p>}
        {items?.length === 0 && <p className="text-sm text-gray-500">등록된 글이 없습니다.</p>}
        <ul className="divide-y divide-gray-100 rounded border border-gray-200 text-sm">
          {(items ?? []).map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                {p.category === 'notice' ? '공지' : '자료실'}
              </span>
              <span className="truncate font-medium text-gray-900">{p.title}</span>
              <span
                className={
                  p.status === 'published'
                    ? 'ml-auto shrink-0 text-xs text-green-700'
                    : 'ml-auto shrink-0 text-xs text-gray-400'
                }
              >
                {p.status === 'published' ? '게시됨' : '임시저장'}
              </span>
              <button
                type="button"
                disabled={busy}
                onClick={() => void toggleStatus(p)}
                className="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700"
              >
                {p.status === 'published' ? '내리기' : '게시'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(p)}
                className="shrink-0 rounded border border-red-200 px-2 py-1 text-xs text-red-600"
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
