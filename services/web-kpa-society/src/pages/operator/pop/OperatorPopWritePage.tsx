/**
 * OperatorPopWritePage — 운영자 매장 HUB POP 작성/수정
 *
 * WO-O4O-KPA-OPERATOR-POP-WRITE-PAGE-V1 (2026-05-24)
 *
 * 운영자가 KPA 매장 HUB 에 게시할 POP 을 RichTextEditor 로 작성·수정.
 * URL 패턴:
 *   /operator/pop/new          — 신규 작성 (draft 생성 후 edit 으로 redirect)
 *   /operator/pop/:id/edit     — 수정
 *
 * Backend: WO-O4O-KPA-POP-PUBLISHING-PHASE2-BACKEND-V1
 *   POST   /api/v1/kpa/operator/pop/posts
 *   PUT    /api/v1/kpa/operator/pop/posts/:id
 *   PATCH  /api/v1/kpa/operator/pop/posts/:id/publish
 *
 * 프론트는 author_role / service_key / store_id 를 보내지 않는다.
 * Backend 가 author_role='operator', service_key='kpa', store_id=null 강제.
 *
 * 본 화면 범위: 매장 HUB 에 진열할 POP "원본 콘텐츠" 작성.
 *   - POP 디자인 캔버스, 템플릿 편집기, AI 작업 큐는 본 WO 범위 외 (후속 Phase).
 *
 * 패턴: OperatorBlogWritePage mirror.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Save, Send, ArrowLeft } from 'lucide-react';
import { RichTextEditor } from '@o4o/content-editor';
import { toast } from '@o4o/error-handling';
import {
  createOperatorPopPost,
  getOperatorPopPost,
  updateOperatorPopPost,
  publishOperatorPopPost,
  type OperatorPopPost,
} from '../../../api/operatorPop';

export default function OperatorPopWritePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isNew = !id;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [post, setPost] = useState<OperatorPopPost | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing post for edit mode
  useEffect(() => {
    if (isNew) return;
    let canceled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getOperatorPopPost(id!);
        if (canceled) return;
        setPost(data);
        setTitle(data.title);
        setSlug(data.slug);
        setExcerpt(data.excerpt ?? '');
        setContent(data.content ?? '');
      } catch (e: any) {
        if (canceled) return;
        setError(e?.message || 'POP 을 불러올 수 없습니다');
      } finally {
        if (!canceled) setIsLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [id, isNew]);

  const handleSave = async (): Promise<OperatorPopPost | null> => {
    if (!title.trim()) {
      toast.error('제목을 입력하세요');
      return null;
    }
    if (!content.trim() || content.trim() === '<p></p>') {
      toast.error('본문을 입력하세요');
      return null;
    }
    setIsSaving(true);
    try {
      const body = {
        title: title.trim(),
        content,
        excerpt: excerpt.trim() || undefined,
        slug: slug.trim() || undefined,
      };
      const saved = isNew
        ? await createOperatorPopPost(body)
        : await updateOperatorPopPost(id!, body);
      setPost(saved);
      toast.success(isNew ? 'POP 이 생성되었습니다 (초안)' : '저장되었습니다');
      if (isNew) {
        navigate(`/operator/pop/${saved.id}/edit`, { replace: true });
      }
      return saved;
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    // 저장 → 발행 순서 (수정사항이 있을 수 있음)
    const saved = await handleSave();
    if (!saved) return;
    if (saved.status === 'published') {
      toast.info('이미 발행된 POP 입니다');
      return;
    }
    if (!window.confirm('지금 발행하시겠습니까? 발행 즉시 KPA 매장 HUB 에 노출됩니다.')) return;
    setIsPublishing(true);
    try {
      const published = await publishOperatorPopPost(saved.id);
      setPost(published);
      toast.success('POP 이 발행되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '발행에 실패했습니다');
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-500">
        <AlertCircle className="w-8 h-8 text-red-400" />
        <p className="text-sm">{error}</p>
        <button
          onClick={() => navigate('/operator/pop')}
          className="text-sm text-blue-600 hover:underline"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  const statusLabel =
    post?.status === 'published' ? '발행됨'
    : post?.status === 'archived' ? '보관됨'
    : isNew ? '신규 (저장 시 초안 생성)'
    : '초안';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/operator/pop')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
            title="목록"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isNew ? '새 POP 작성' : 'POP 수정'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              상태: <span className="font-medium text-slate-700">{statusLabel}</span>
              {' · 매장 HUB 노출 대상 (KPA)'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSave}
            disabled={isSaving || isPublishing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
          <button
            onClick={handlePublish}
            disabled={isSaving || isPublishing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            저장 후 발행
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4 bg-white rounded-xl border border-slate-100 p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="POP 제목을 입력하세요"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSaving || isPublishing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            슬러그 <span className="text-xs text-slate-400 font-normal">(선택 — 비워두면 제목으로 자동 생성)</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="예: spring-promo-pop"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSaving || isPublishing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            요약 <span className="text-xs text-slate-400 font-normal">(선택 — HUB 목록에 표시)</span>
          </label>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="POP 을 한 줄로 요약하세요"
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={isSaving || isPublishing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">본문</label>
          <RichTextEditor
            value={content}
            onChange={(c) => setContent(c.html)}
            placeholder="POP 본문을 작성하세요"
            minHeight="500px"
            editable={!isSaving && !isPublishing}
          />
        </div>
      </div>
    </div>
  );
}
