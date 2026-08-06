/**
 * BlogEditorPage (약국 경영자) — 매장 블로그 글 작성/수정
 *
 * WO-PHARMACY-HUB-STORE-CONTENT-LIBRARY-V1
 *
 * `/store-owner/blog/new` · `/store-owner/blog/:id/edit` 공용.
 * 본문 편집기는 표준 RichTextEditor(@o4o/content-editor) — 서비스 전용 편집기 0.
 * slug 는 서버가 생성·보정하므로 화면에서 입력받지 않는다(중복 처리 계약을 프론트로 옮기지 않는다).
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import {
  fetchBlogPost,
  createBlogPost,
  updateBlogPost,
  type BlogPostInput,
} from '../../lib/api/pharmacyHubStoreBlog';

export default function StoreOwnerBlogEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetchBlogPost(id)
      .then((post) => {
        if (cancelled) return;
        setTitle(post.title);
        setExcerpt(post.excerpt ?? '');
        setContent(post.content ?? '');
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || '글을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('제목을 입력해 주세요.');
      return;
    }
    if (!content || content.trim() === '' || content === '<p></p>') {
      setError('내용을 입력해 주세요.');
      return;
    }
    const input: BlogPostInput = {
      title: title.trim(),
      content,
      excerpt: excerpt.trim() || undefined,
    };
    setSaving(true);
    setError(null);
    try {
      if (id) await updateBlogPost(id, input);
      else await createBlogPost(input);
      navigate('/store-owner/blog');
    } catch (e: any) {
      setError(e?.message || '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{isEdit ? '블로그 글 수정' : '블로그 글쓰기'}</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/store-owner/blog')}
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
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-blog-title">
              제목
            </label>
            <input
              id="ph-blog-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="글 제목을 입력하세요"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-500" htmlFor="ph-blog-excerpt">
              요약 (선택)
            </label>
            <input
              id="ph-blog-excerpt"
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              maxLength={300}
              placeholder="목록에 함께 보여줄 짧은 요약"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200">
            <RichTextEditor
              value={content}
              onChange={(c) => setContent(c.html)}
              placeholder="글 내용을 입력하세요."
              minHeight="460px"
              preset="full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
