import { ProductConsultationAuthoring } from '../../components/product-description/ProductConsultationAuthoring';
import { PRODUCT_DESCRIPTION_PURPOSE_LABELS } from '@o4o/store-ui-core';
import { consultationLanguages } from '../../components/product-description/productConsultationDraft';
import { useStoreOperationScope } from '../../hooks/useStoreOperationScope';
import { StoreAiSlot } from '../../components/store/StoreAiPlacement';
import { useStoreLibraryRoute } from './library/useStoreLibraryRoute';
/**
 * StoreDirectContentPage — direct 콘텐츠 상세 / 수정 / 삭제
 *
 * WO-O4O-STORE-CONTENT-DIRECT-DETAIL-EDIT-UX-V1
 *
 * 경로: /store/content/direct/:id
 *
 * - source_type='direct' 전용 (AI 생성 저장, 직접 작성 등)
 * - 상세 조회 (Block[] 렌더링)
 * - 인라인 편집 (Block editor)
 * - 삭제 (store owner 전용)
 */

import { StoreContentNextSteps } from '../../components/store/StoreContentNextSteps';
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
// WO-O4O-KPA-STORE-LIBRARY-CONTENTS-DIRECT-EDITOR-UNIFY-V1:
//   direct 콘텐츠 편집을 o4o 표준 RichTextEditor(@o4o/content-editor)로 통일 — 제작 자료 편집기와 동일 모듈.
import { RichTextEditor, LlmAssistPanel, type EditorContent } from '@o4o/content-editor';
import { buildStoreContentAuthoringPrompt, resolveStoreContentLlmTask, STORE_LLM_ASSIST_LABEL } from '@o4o/store-ui-core';
import { BlockRenderer } from '@o4o/block-renderer';
import { useStoreOrganizationId } from '../../hooks/useStoreOrganizationId';
import { getActiveServiceKey } from '../../lib/serviceContext';
import { useContentAuthoringSession } from './hooks/useContentAuthoringSession';
import { emptyTextDraft, loadDirect, saveDirect, removeDirect, textDraftFromRecord } from './authoring/contentAuthoringAdapters';
import { parseDirectBlocks } from './authoring/contentAuthoringModels';
import { AuthoringDialog } from './authoring/AuthoringDialog';
import { kpaBlocksToRendererBlocks } from '../../utils/kpa-block-adapter';
import { TagInput } from '../../components/store/TagInput';

// ─── Component ────────────────────────────────────────────────────────────────

export default function StoreDirectContentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { backPath, returnState, productReturn } = useStoreLibraryRoute();
  const [searchParams] = useSearchParams();

  const { organizationId } = useStoreOrganizationId();
  const serviceKey = getActiveServiceKey();
  const { key: operationScope, isCurrent } = useStoreOperationScope();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const session = useContentAuthoringSession({
    organizationId, serviceKey, target: `direct:${id ?? ''}`, initialDraft: emptyTextDraft,
    load: () => id ? loadDirect(id) : Promise.reject(new Error('Missing content')),
    toDraft: textDraftFromRecord,
    persist: (draft, record) => saveDirect(id!, draft, record), remove: removeDirect,
    onSaved: (saved, unchanged, visible) => {
      if (!visible) return;
      if (saved.verification === false) { session.notify('저장 요청은 처리됐으나 본문·상품 연결을 다시 확인하지 못했습니다. 입력을 유지했습니다. 다시 저장하면 같은 자료를 확인합니다.', false); return; }
      if (unchanged) setEditing(false); },
    onRemoved: () => navigate(backPath, { replace: true, state: returnState }),
  });
  const { record: content, loading, error, saving, deleting, reload: fetchContent, save: handleSave, remove: handleDelete } = session;
  const editTitle = session.draft.title, editTags = session.draft.tags;
  const editorContent = { html: session.draft.html }, editorInitialHtml = session.seed.html;
  const setEditTitle = (title: string) => session.changeDraft({ title });
  const setEditTags = (tags: string[]) => session.changeDraft({ tags });
  const setEditorContent = (value: EditorContent) => session.changeDraft({ html: value.html });
  const setEditorInitialHtml = (html: string) => session.changeDraft({ html }, true);
  const toast = session.notice ? { msg: session.notice.message, ok: session.notice.ok } : null;
  const showToast = (msg: string, ok: boolean) => session.notify(msg, ok);
  const startEdit = () => { if (content) { session.resetDraft(); setEditing(true); } };
  const cancelEdit = () => { session.resetDraft(); setEditing(false); };

  // WO-O4O-KPA-STORE-LIBRARY-CONTENTS-EDIT-ROUTE-UNIFY-V1:
  //   목록의 [편집] 은 ?edit=1 로 진입한다 → 상세 보기를 거치지 않고 편집기를 바로 연다.
  //   콘텐츠 로딩 완료 후 1회만 자동 진입(사용자가 취소하면 재진입하지 않음).
  const autoEditRef = useRef(false);
  useEffect(() => {
    setEditing(false); setConfirmDelete(false); autoEditRef.current = false;
  }, [id, organizationId, serviceKey]);
  useEffect(() => {
    if (content && !autoEditRef.current && searchParams.get('edit') === '1') {
      autoEditRef.current = true;
      startEdit();
    }
    // startEdit 는 매 렌더 재생성되지만 content 로딩 시 1회만 호출 — autoEditRef 가드.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, searchParams]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8 flex justify-center py-20">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex flex-col items-center py-20 text-red-500">
          <AlertCircle className="w-6 h-6 mb-2" />
          <p role="alert" className="text-sm">{error || '콘텐츠를 찾을 수 없습니다'}</p>
          <button onClick={fetchContent} className="mt-3 text-sm text-blue-600 hover:underline">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const viewBlocks = parseDirectBlocks(content.contentJson);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {!editing && <StoreContentNextSteps contentId={id} title={content.title} />}
      {/* Toast */}
      {toast && (
        <div role={toast.ok ? 'status' : 'alert'} className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
          toast.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          <CheckCircle className="w-4 h-4" />
          {toast.msg}
        </div>
      )}

      {/* Back nav — WO-O4O-STORE-LIBRARY-CONTENTS-DIRECT-CONTENT-REENTRY-UX-V1: canonical 허브로 복귀 */}
      <Link to={backPath} state={returnState} onClick={event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const changed = content && JSON.stringify(session.draft) !== JSON.stringify(textDraftFromRecord(content));
        if (session.saving || session.deleting || (editing && changed && !window.confirm('저장하지 않은 작성 내용을 버리고 돌아가시겠습니까?'))) event.preventDefault();
      }} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline mb-4">
        <ArrowLeft className="w-4 h-4" />
        {productReturn ? '상품 목록으로 돌아가기' : '내 자료함 콘텐츠로 돌아가기'}
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          {editing ? (
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="text-xl font-bold text-slate-900 border-b-2 border-blue-500 outline-none bg-transparent w-full"
              aria-label="콘텐츠 제목" placeholder="콘텐츠 제목"
            />
          ) : (
            <h1 className="text-xl font-bold text-slate-900 m-0">{content.title}</h1>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-700">
              내 매장 콘텐츠
            </span>
            <span className="text-xs text-slate-400">
              {content.updatedAt ? new Date(content.updatedAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
            </span>
          </div>
          {/* WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1: 태그 — 편집 시 입력, 보기 시 chip */}
          <div className="mt-2">
            {editing ? (
              <div style={{ maxWidth: 520 }}>
                <label htmlFor="direct-content-tags" className="sr-only">콘텐츠 태그</label>
                <TagInput id="direct-content-tags" tags={editTags} onChange={setEditTags} placeholder="예: 간 건강, 면역 (Enter·쉼표로 구분)" />
              </div>
            ) : (
              Array.isArray(content.tags) && content.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {content.tags.map(tag => (
                    <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {tag}
                    </span>
                  ))}
                </div>
              )
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {editing ? (
            <>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving || deleting}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                저장
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                <Edit2 className="w-4 h-4" />
                수정
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            </>
          )}
        </div>
      </div>

      {session.draft.consultation && <p className="mb-3 rounded-lg bg-slate-50 p-3 text-sm" role="status">
        상품 상담자료 · {session.draft.consultation.product.name} · {PRODUCT_DESCRIPTION_PURPOSE_LABELS[session.draft.consultation.assist.purpose]} · {consultationLanguages[session.draft.consultation.language]}
      </p>}
      <StoreAiSlot label="안내 편집" />
      {/* Content area */}
      {editing ? (
        // WO-O4O-KPA-STORE-LIBRARY-CONTENTS-DIRECT-EDITOR-UNIFY-V1:
        //   o4o 표준 RichTextEditor(편집/HTML/미리보기 탭) — 제작 자료 편집기와 동일 모듈. 유형 구분 없음.
        <div className="bg-white border border-slate-200 rounded-lg p-2 mb-4">
          {/* WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1: 외부 LLM 작업 — 적용 시 initialHtml(편집기 value)·editorContent(저장값) 동시 갱신 */}
          <div className="mb-2">
            {session.draft.consultation ? <ProductConsultationAuthoring key={`${operationScope}:${id}`}
              value={session.draft.consultation} title={editTitle} html={editorContent.html}
              disabled={saving || deleting} isCurrent={isCurrent}
              onChange={consultation => session.changeDraft({ consultation })} onApplyHtml={setEditorInitialHtml} /> : <LlmAssistPanel
              label={STORE_LLM_ASSIST_LABEL}
              contextLabel="매장 직접 작성 콘텐츠 — 현재 내용을 다듬거나 새로 씁니다"
              guideText={({ additionalInstruction }) => buildStoreContentAuthoringPrompt({
                task: resolveStoreContentLlmTask(editorContent.html),
                title: editTitle,
                currentHtml: editorContent.html,
                sourceOrigin: 'direct',
                additionalInstruction,
              })}
              currentHtml={editorContent.html}
              onApplyHtml={setEditorInitialHtml}
              onNotify={(message, kind) => showToast(message, kind === 'success')}
            />}
          </div>
          <RichTextEditor showInternalAi={false}
            value={editorInitialHtml}
            onChange={(c) => setEditorContent(c)}
            placeholder="본문 내용을 입력하세요"
            minHeight="420px"
            preset="full"
          />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-4">
          {viewBlocks.length > 0 ? (
            <BlockRenderer
              blocks={kpaBlocksToRendererBlocks(viewBlocks.map(b => {
                if (b.type === 'text') return { type: 'text', content: b.value };
                if (b.type === 'image') return { type: 'image', url: b.value };
                if (b.type === 'list') return { type: 'list', items: b.items || [] };
                return { type: 'text', content: b.value };
              }))}
              className="space-y-4"
            />
          ) : (
            <p className="text-sm text-slate-400 text-center py-8">내용이 없습니다.</p>
          )}
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <AuthoringDialog labelId="direct-delete-title" onClose={() => setConfirmDelete(false)} className="max-w-sm">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full">
            <h2 id="direct-delete-title" className="text-base font-semibold text-slate-800 mb-2">콘텐츠를 삭제하시겠습니까?</h2>
            <p className="text-sm text-slate-500 mb-5">삭제하면 복구할 수 없습니다.</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting || saving}
                className="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                삭제
              </button>
            </div>
          </div>
        </AuthoringDialog>
      )}
    </div>
  );
}
