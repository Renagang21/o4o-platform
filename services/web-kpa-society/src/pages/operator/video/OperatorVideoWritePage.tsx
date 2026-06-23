/**
 * OperatorVideoWritePage — 운영자 매장 HUB 동영상 작성/수정 (QR 전용)
 *
 * WO-O4O-KPA-QR-CODE-VIDEO-CONTENT-V1 (2026-06-23)
 *
 * 운영자가 KPA 매장 HUB 에 게시할 동영상(외부 URL)을 작성·수정.
 * URL 패턴:
 *   /operator/video/new          — 신규 작성 (draft 생성 후 edit 으로 redirect)
 *   /operator/video/:id/edit     — 수정
 *
 * Backend:
 *   POST   /api/v1/kpa/operator/video/posts
 *   PUT    /api/v1/kpa/operator/video/posts/:id
 *   PATCH  /api/v1/kpa/operator/video/posts/:id/publish
 *
 * 프론트는 author_role / service_key / store_id 를 보내지 않는다 (backend 강제).
 * POP 과 달리 RichTextEditor 본문이 아니라 단순 입력(제목/동영상 URL/설명/공개여부)이다.
 *
 * 패턴: OperatorPopWritePage mirror (본문 → videoUrl 입력 + embed 미리보기).
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, AlertCircle, Save, Send, ArrowLeft } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  createOperatorVideoPost,
  getOperatorVideoPost,
  updateOperatorVideoPost,
  publishOperatorVideoPost,
  type OperatorVideoPost,
} from '../../../api/operatorVideo';
import { toVideoEmbed } from '../../../utils/videoEmbed';

export default function OperatorVideoWritePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const isNew = !id;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [post, setPost] = useState<OperatorVideoPost | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) return;
    let canceled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getOperatorVideoPost(id!);
        if (canceled) return;
        setPost(data);
        setTitle(data.title);
        setSlug(data.slug);
        setDescription(data.description ?? '');
        setVideoUrl(data.videoUrl ?? '');
      } catch (e: any) {
        if (canceled) return;
        setError(e?.message || '동영상을 불러올 수 없습니다');
      } finally {
        if (!canceled) setIsLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, [id, isNew]);

  const embed = videoUrl.trim() ? toVideoEmbed(videoUrl) : null;

  const handleSave = async (): Promise<OperatorVideoPost | null> => {
    if (!title.trim()) {
      toast.error('제목을 입력하세요');
      return null;
    }
    if (!videoUrl.trim()) {
      toast.error('동영상 URL 을 입력하세요');
      return null;
    }
    setIsSaving(true);
    try {
      const body = {
        title: title.trim(),
        videoUrl: videoUrl.trim(),
        description: description.trim() || undefined,
        slug: slug.trim() || undefined,
      };
      const saved = isNew
        ? await createOperatorVideoPost(body)
        : await updateOperatorVideoPost(id!, body);
      setPost(saved);
      toast.success(isNew ? '동영상이 생성되었습니다 (초안)' : '저장되었습니다');
      if (isNew) {
        navigate(`/operator/video/${saved.id}/edit`, { replace: true });
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
    const saved = await handleSave();
    if (!saved) return;
    if (saved.status === 'published') {
      toast.info('이미 발행된 동영상입니다');
      return;
    }
    if (!window.confirm('지금 발행하시겠습니까? 발행 즉시 KPA 매장 HUB 에 노출됩니다.')) return;
    setIsPublishing(true);
    try {
      const published = await publishOperatorVideoPost(saved.id);
      setPost(published);
      toast.success('동영상이 발행되었습니다');
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
          onClick={() => navigate('/operator/video')}
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/operator/video')}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
            title="목록"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isNew ? '새 동영상 등록' : '동영상 수정'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              상태: <span className="font-medium text-slate-700">{statusLabel}</span>
              {' · 매장 HUB 노출 대상 (KPA · QR 전용)'}
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

      <div className="space-y-4 bg-white rounded-xl border border-slate-100 p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="동영상 제목을 입력하세요"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSaving || isPublishing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            동영상 URL <span className="text-xs text-slate-400 font-normal">(YouTube / Vimeo 등 외부 URL)</span>
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSaving || isPublishing}
          />
          {embed && embed.provider === 'unknown' && (
            <p className="mt-1 text-xs text-amber-600">
              YouTube/Vimeo 로 인식되지 않는 URL 입니다. 공개 화면에서 정상 재생되지 않을 수 있습니다.
            </p>
          )}
        </div>

        {embed && embed.embedUrl && embed.provider !== 'unknown' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">미리보기</label>
            <div className="relative w-full overflow-hidden rounded-lg bg-black" style={{ aspectRatio: '16 / 9' }}>
              <iframe
                src={embed.embedUrl}
                title="동영상 미리보기"
                className="absolute inset-0 w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            슬러그 <span className="text-xs text-slate-400 font-normal">(선택 — 비워두면 제목으로 자동 생성)</span>
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="예: spring-promo-video"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isSaving || isPublishing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            설명 <span className="text-xs text-slate-400 font-normal">(선택 — HUB 목록에 표시)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="동영상을 한 줄로 설명하세요"
            rows={2}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            disabled={isSaving || isPublishing}
          />
        </div>
      </div>
    </div>
  );
}
