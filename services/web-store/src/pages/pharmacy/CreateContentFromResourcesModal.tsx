/**
 * CreateContentFromResourcesModal — 빈 편집기 직접 작성 → direct 콘텐츠 제작
 *
 * WO-O4O-STORE-CONTENT-CREATION-FROM-LIBRARY-RESOURCES-V1
 * WO-O4O-KPA-CONTENT-CREATE-AI-STEP-REMOVE-V1:
 *   "자료 선택 → AI 본문 생성" 진입점 제거(O4O 초안 생성 안 함 정책,
 *    IR-O4O-AI-CONTENT-GENERATION-ENTRYPOINT-AUDIT-V1). 콘텐츠 제작은 빈 편집기에서
 *    직접 작성·외부 LLM(ChatGPT/Claude/Gemini) 결과 붙여넣기 중심으로 단순화.
 *   - 유지: 제목 / 태그 / RichTextEditor(preset='full') / 저장
 *   - 유지: direct content 저장 경로(POST /store-contents, generatedBy='manual-direct',
 *           sourceResources=[]) → /store/library/contents 문서형 목록 '내 콘텐츠'로 노출
 *   - 제거: 자료 multi-select 단계, 자료 기반 AI 본문 생성(/api/ai/content 직접 호출),
 *           제작 요청/보조 옵션 preset
 *   - 보존(미삭제): AiContentModal 컴포넌트, /api/ai/content endpoint, ai-prompts (공통 패키지 — 비-Store 소비자)
 *   - WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1: Store 편집기 내부 AI(aiRequestHeaders) 은퇴 — 외부 LLM(ChatGPT로 작업)만 남는다.
 *
 * 흐름:
 *   콘텐츠 제작 → 빈 편집기(제목/태그/본문) → 직접 작성 또는 붙여넣기 → 저장
 *   → POST /store-contents → navigate('/store/content/direct/:id')
 */

import {  type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Save, Loader2 } from 'lucide-react';
import { RichTextEditor, LlmAssistPanel, type EditorContent } from '@o4o/content-editor';
import { buildStoreContentAuthoringPrompt, resolveStoreContentLlmTask, STORE_LLM_ASSIST_LABEL } from '@o4o/store-ui-core';
import { useStoreOrganizationId } from '../../hooks/useStoreOrganizationId';
import { getActiveServiceKey } from '../../lib/serviceContext';
import { useContentAuthoringSession } from './hooks/useContentAuthoringSession';
import { createOrUpdateDirect, emptyTextDraft, validateNewContent, type CreatedContent, type TextContentDraft } from './authoring/contentAuthoringAdapters';
import { AuthoringDialog } from './authoring/AuthoringDialog';
import { colors } from '../../styles/theme';
import { TagInput } from '../../components/store/TagInput';

// WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-ACTIONS-V1:
//   매장 경영활용 제품에서 진입 시 연결 대상 제품 정보. 저장 시 top-level productRef 로 전달되어
//   생성 콘텐츠가 해당 제품에 자동 연결된다. (listing=O4O 기반 제품 / local=매장 경영활용 제품)
export interface CreateContentProductContext {
  sourceType: 'listing' | 'local';
  sourceId: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: (newContentId: string) => void;
  product?: CreateContentProductContext | null;
}

export function CreateContentFromResourcesModal({ open, onClose, onCreated, product }: Props) {
  const navigate = useNavigate();

  const { organizationId } = useStoreOrganizationId();
  const session = useContentAuthoringSession<TextContentDraft, CreatedContent>({
    organizationId, serviceKey: getActiveServiceKey(), target: `create:${product?.sourceType ?? ''}:${product?.sourceId ?? ''}`,
    enabled: open, initialDraft: emptyTextDraft,
    toDraft: () => emptyTextDraft,
    persist: (draft, record) => createOrUpdateDirect(draft, record, product),
    validate: validateNewContent,
    onSaved: (saved, unchanged) => {
      onCreated?.(saved.id);
      if (unchanged) { onClose(); navigate(`/store/content/direct/${saved.id}`); }
    },
  });
  const { title, tags, html: editorHtml } = session.draft;
  const { saving, save: handleSave } = session;
  const setTitle = (title: string) => session.changeDraft({ title });
  const setTags = (tags: string[]) => session.changeDraft({ tags });
  const setEditorHtml = (html: string) => session.changeDraft({ html }, true);
  const handleEditorChange = (content: EditorContent) => session.changeDraft({ html: content.html });

  if (!open) return null;

  const canSave = !!title.trim() && !!editorHtml.trim() && !saving && !session.loading && !session.error;

  return (
    <AuthoringDialog labelId="create-content-title" onClose={onClose} className="max-w-3xl">
      <div style={styles.modal}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h2 id="create-content-title" style={styles.title}>콘텐츠 작성</h2>
          </div>
          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="닫기">
            <X size={16} />
          </button>
        </header>

        <div style={styles.body}>
          {session.error && <p role="alert" className="mb-3 text-sm text-red-700">{session.error}<button type="button" onClick={() => void session.reload()} className="ml-2 underline">다시 시도</button></p>}
          {session.notice && <output role={session.notice.ok ? 'status' : 'alert'} className={session.notice.ok ? 'mb-3 text-sm text-green-700' : 'mb-3 text-sm text-red-700'}>{session.notice.message}</output>}
          {/* WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-ACTIONS-V1: 제품에서 진입한 경우 연결 대상 표시 */}
          {product && (
            <div style={styles.productBanner}>
              <span style={styles.productBannerLabel}>관련 매장 경영활용 제품</span>
              <span style={styles.productBannerName}>{product.name}</span>
              <span style={styles.productBannerKind}>
                {product.sourceType === 'listing' ? 'O4O 기반 제품' : '매장 경영활용 제품'}
              </span>
            </div>
          )}

          <p style={styles.guideHint}>
            외부 AI 도구(ChatGPT·Claude·Gemini 등)나 문서에서 작성한 초안을 붙여넣고 편집한 뒤 저장하세요.
          </p>

          <div style={styles.composeRow}>
            <label style={styles.label}>제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="콘텐츠 제목" placeholder="콘텐츠 제목"
              style={styles.input}
              maxLength={200}
            />
          </div>

          <div style={styles.composeRow}>
            <label htmlFor="create-content-tags" style={styles.label}>콘텐츠 태그</label>
            <TagInput id="create-content-tags" tags={tags} onChange={setTags} placeholder="예: 간 건강, 면역 (Enter·쉼표로 구분)" />
          </div>

          <div style={styles.composeRow}>
            <label style={styles.label}>매장 콘텐츠 본문</label>
            {/* WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1: 외부 LLM(사용자 ChatGPT 등) 작업 — Prompt 는 store-ui-core 순수 함수, 결과는 편집기로만 */}
            <div style={{ marginBottom: 8 }}>
              <LlmAssistPanel
                label={STORE_LLM_ASSIST_LABEL}
                contextLabel="매장 콘텐츠 본문 — 새로 작성하거나 현재 내용을 다듬습니다"
                guideText={({ additionalInstruction }) => buildStoreContentAuthoringPrompt({
                  task: resolveStoreContentLlmTask(editorHtml),
                  title,
                  currentHtml: editorHtml,
                  productName: product?.name,
                  additionalInstruction,
                })}
                currentHtml={editorHtml}
                onApplyHtml={(html) => setEditorHtml(html)}
                onNotify={(message, kind) => session.notify(message, kind === 'success')}
              />
            </div>
            <div style={styles.editorWrap}>
              <RichTextEditor showInternalAi={false}
                value={session.seed.html}
                onChange={handleEditorChange}
                placeholder="본문을 직접 작성하거나, 외부 AI에서 만든 초안을 붙여넣은 뒤 편집하세요."
                minHeight="320px"
                preset="full"
              />
            </div>
          </div>
        </div>

        <footer style={styles.footer}>
          <span style={styles.footerHint}>본문을 직접 작성하거나 붙여넣은 뒤 저장하세요</span>
          <div style={styles.footerActions}>
            <button type="button" onClick={onClose} style={styles.secondaryBtn} disabled={saving}>
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              style={{ ...styles.primaryBtn, opacity: canSave ? 1 : 0.5 }}
            >
              {saving ? (
                <Loader2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} className="animate-spin" />
              ) : (
                <Save size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              )}
              {saving ? '저장 중...' : '내 자료함 콘텐츠로 저장'}
            </button>
          </div>
        </footer>
      </div>
    </AuthoringDialog>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15,23,42,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '90vh',
    background: colors.white,
    borderRadius: 12,
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 10,
    padding: '14px 18px',
    borderBottom: `1px solid ${colors.neutral100}`,
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: 700, color: colors.neutral800, margin: 0 },
  iconBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    border: 'none',
    background: 'transparent',
    color: colors.neutral500,
    cursor: 'pointer',
    borderRadius: 6,
  },
  body: { padding: 18, overflowY: 'auto', flex: 1 },
  // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-ACTIONS-V1: 연결 대상 제품 배너
  productBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    margin: '0 0 14px',
    padding: '10px 12px',
    background: '#F0FDF4',
    border: '1px solid #BBF7D0',
    borderRadius: 8,
  },
  productBannerLabel: { fontSize: 11, fontWeight: 700, color: '#15803D' },
  productBannerName: { fontSize: 14, fontWeight: 600, color: colors.neutral800 },
  productBannerKind: {
    fontSize: 11,
    fontWeight: 500,
    color: '#1D4ED8',
    background: '#DBEAFE',
    padding: '2px 8px',
    borderRadius: 999,
  },
  guideHint: {
    margin: '0 0 14px',
    padding: '9px 12px',
    fontSize: 12,
    lineHeight: 1.6,
    color: '#1E40AF',
    background: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: 8,
  },
  composeRow: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 },
  label: { fontSize: 13, fontWeight: 600, color: colors.neutral700 },
  input: {
    padding: '9px 11px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
  },
  editorWrap: { border: `1px solid ${colors.neutral200}`, borderRadius: 8, overflow: 'hidden' },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 18px',
    borderTop: `1px solid ${colors.neutral100}`,
    flexShrink: 0,
    flexWrap: 'wrap',
  },
  footerHint: { fontSize: 12, color: colors.neutral500 },
  footerActions: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  secondaryBtn: {
    padding: '8px 14px',
    background: colors.white,
    color: colors.neutral600,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '8px 16px',
    background: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};
