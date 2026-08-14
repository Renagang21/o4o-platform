/**
 * OperatorHubContentWritePage — 운영자 매장 HUB 콘텐츠(블로그 / POP) 작성·수정 공통 화면
 *
 * WO-O4O-OPERATOR-BLOG-WRITE-PAGE-KPA-V1 / WO-O4O-KPA-OPERATOR-POP-WRITE-PAGE-V1 (원본)
 * WO-O4O-KCOSMETICS-OPERATOR-BLOG-POP-QR-BOOTSTRAP-V1 (K-Cosmetics 측)
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA·K-Cosmetics × 블로그·POP 4중복을 단일 모듈로 수렴.
 *
 * 흐름 보존:
 *   - 신규: 저장 시 draft 생성 → `/…/:id/edit` 로 replace 이동
 *   - 발행: 저장 → 이미 published 면 안내 후 중단 → ConfirmActionDialog 확인 → 발행
 *   - 프론트는 author_role / service_key / store_id 를 보내지 않는다 (backend 강제)
 *
 * 발행 확인은 `ConfirmActionDialog` 로 통일한다 — K-Cosmetics 의 `window.confirm` 은
 * 이 수렴으로 표준 확인 다이얼로그가 된다(확인 게이트 자체는 이전과 동일하게 유지).
 */

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Save, Send, ArrowLeft } from 'lucide-react';
import { RichTextEditor } from '@o4o/content-editor';
import { toast } from '@o4o/error-handling';
import { ConfirmActionDialog } from '@o4o/ui';
import type { HubContentPost, OperatorHubContentWritePageProps } from './types';

export function OperatorHubContentWritePage({
  id,
  client,
  copy,
  onBackToList,
  onCreated,
  accent,
}: OperatorHubContentWritePageProps) {
  const isNew = !id;

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [post, setPost] = useState<HubContentPost | null>(null);
  const [isLoading, setIsLoading] = useState(!isNew);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  // WO-O4O-KPA-OPERATOR-P2-P3-USABILITY-AND-ERROR-CLEANUP-CONSOLIDATED-V1:
  //   발행 확인 window.confirm → ConfirmActionDialog. 저장/상태검사 후 대상 id 보관, 확인 시 발행.
  const [pendingPublishId, setPendingPublishId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load existing post for edit mode
  useEffect(() => {
    if (isNew) return;
    let canceled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await client.get(id!);
        if (canceled) return;
        setPost(data);
        setTitle(data.title);
        setSlug(data.slug);
        setExcerpt(data.excerpt ?? '');
        setContent(data.content ?? '');
      } catch (e: any) {
        if (canceled) return;
        setError(e?.message || `${copy.kindLabel}을(를) 불러올 수 없습니다`);
      } finally {
        if (!canceled) setIsLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isNew]);

  const handleSave = async (): Promise<HubContentPost | null> => {
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
      const saved = isNew ? await client.create(body) : await client.update(id!, body);
      setPost(saved);
      toast.success(isNew ? `${copy.kindLabel}이(가) 생성되었습니다 (초안)` : '저장되었습니다');
      if (isNew) onCreated(saved.id);
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
      toast.info(`이미 발행된 ${copy.kindLabel}입니다`);
      return;
    }
    setPendingPublishId(saved.id);
  };

  const confirmPublish = async () => {
    const targetId = pendingPublishId;
    setPendingPublishId(null);
    if (!targetId) return;
    setIsPublishing(true);
    try {
      const published = await client.publish(targetId);
      setPost(published);
      toast.success(`${copy.kindLabel}이(가) 발행되었습니다`);
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
          onClick={onBackToList}
          className={`text-sm ${accent.linkText} hover:underline`}
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
            onClick={onBackToList}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
            title="목록"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">
              {isNew ? `새 ${copy.kindLabel} 작성` : `${copy.kindLabel} 수정`}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              상태: <span className="font-medium text-slate-700">{statusLabel}</span>
              {` · ${copy.audienceNote}`}
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
            className={`flex items-center gap-2 px-4 py-2 ${accent.publishButton} text-white rounded-lg text-sm font-medium disabled:opacity-50`}
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
            placeholder={copy.titlePlaceholder}
            className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${accent.focusRing}`}
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
            placeholder={copy.slugPlaceholder}
            className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 ${accent.focusRing}`}
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
            placeholder={copy.excerptPlaceholder}
            rows={2}
            className={`w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 ${accent.focusRing} resize-none`}
            disabled={isSaving || isPublishing}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">본문</label>
          <RichTextEditor
            value={content}
            onChange={(c) => setContent(c.html)}
            placeholder={copy.contentPlaceholder}
            minHeight="500px"
            editable={!isSaving && !isPublishing}
          />
        </div>
      </div>

      <ConfirmActionDialog
        open={!!pendingPublishId}
        title={`${copy.kindLabel} 발행`}
        message={copy.publishConfirmMessage}
        confirmText="발행"
        loading={isPublishing}
        onConfirm={confirmPublish}
        onClose={() => setPendingPublishId(null)}
      />
    </div>
  );
}
