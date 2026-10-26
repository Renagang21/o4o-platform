import { StoreAiSlot } from '../../components/store/StoreAiPlacement';
import { useStoreLibraryRoute } from './library/useStoreLibraryRoute';
/**
 * ProductionMaterialEditorPage — 매장 제작 자료 편집기(외부 LLM 결과 검토/수정)
 *
 * WO-O4O-STORE-INTERNAL-AI-RETIREMENT-V1:
 *   편집기 내부 AI(aiRequestHeaders) 은퇴. 아래 AiContentModal 관련 진입 계약 설명은 이력이며,
 *   현행 제작 경로는 LlmAssistPanel(ChatGPT로 작업) → 편집기 → 저장이다.
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-STANDARD-EDITOR-APPLY-V1
 * WO-O4O-STORE-PRODUCTION-MATERIALS-FLOW-RECOVERY-V1:
 *   진입 state 를 `generatedHtml` 로 재정의. 본 화면은 AiContentModal 이 생성한 HTML 을
 *   받아 사용자가 검토/수정 후 매장 제작 자료(store_execution_assets)에 저장하는 단계.
 *   AI 입력 프롬프트 텍스트(composeSourceTextFromItems 결과)는 이 화면으로 들어오지 않는다.
 *
 * WO-O4O-STORE-PRODUCTION-TEMPLATE-REGISTRY-V1:
 *   selectedTemplateId 를 state 에 추가. generatedHtml 없을 때 template.starterHtml 을 초기 값으로 사용.
 *   template.forcedOptions 를 AiContentModal 에 templateForcedOptions 로 전달.
 *   template.systemPromptOverride 를 AiContentModal 에 templateSystemPrompt 로 전달.
 *
 * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-ENTRY-ALIGNMENT-V1 (KPA 한정 진입 계약 정정):
 *   /store/library/production-materials/new 는 legacy redirect(→ /store/library/contents) 로 전환되어
 *   KPA 에서 더 이상 이 화면의 진입 경로가 아니다. 아래 state 계약은 KCos 및 :id/edit 모드 기준으로 유지한다.
 *   KPA 활성 진입 = 자료함 > 콘텐츠 → execution asset 행 [편집] → /store/library/production-materials/:id/edit
 *
 * 진입(legacy/타 서비스): StoreLibraryContentsPage → AiContentModal.onInsert → navigate('.../production-materials/new', { state })
 * state: {
 *   generatedHtml?: string;
 *   title?: string;
 *   sourceMetadata?: { sourceContentId?: string; sourceTitle?: string; sourceOrigin?: string };
 *   selectedTemplateId?: string;   ← WO-O4O-STORE-PRODUCTION-TEMPLATE-REGISTRY-V1
 * }
 *
 * 역할:
 *   - O4O 표준 RichTextEditor 로 AI 결과 HTML 검토/수정
 *   - 제목 입력 + 제작 유형 선택 + 저장(store_execution_assets)
 *   - 저장 후 → /store/library/contents 이동 (canonical 결과 탐색 화면. 생성·편집 두 분기 모두 동일)
 */

import { useCallback, type CSSProperties } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Loader2 } from 'lucide-react';
import { ProductDescriptionAssist } from '../../components/product-description/ProductDescriptionAssist';
import { RichTextEditor, LlmAssistPanel } from '@o4o/content-editor';
import { buildStoreContentAuthoringPrompt, resolveStoreContentLlmTask, STORE_LLM_ASSIST_LABEL } from '@o4o/store-ui-core';
import type { EditorContent } from '@o4o/content-editor';
import { useStoreOrganizationId } from '../../hooks/useStoreOrganizationId';
import { getActiveServiceKey } from '../../lib/serviceContext';
import { useContentAuthoringSession } from './hooks/useContentAuthoringSession';
import { loadMaterial, saveMaterial, materialDraftFromRecord, validateNewContent, type MaterialDraft } from './authoring/contentAuthoringAdapters';
import { colors } from '../../styles/theme';
import { PRODUCTION_TARGET_CATALOG, type ProductionTarget } from './productionTargets';
import { findTemplate } from './productionTemplates';

// ─── Location State ──────────────────────────────────────────────────────────

interface EditorPageState {
  generatedHtml?: string;
  title?: string;
  sourceMetadata?: {
    sourceContentId?: string;
    sourceTitle?: string;
    sourceOrigin?: string;
  };
  /**
   * WO-O4O-STORE-PRODUCTION-TEMPLATE-REGISTRY-V1:
   * 선택된 template id. generatedHtml 없을 때 template.starterHtml 을 editor 초기값으로 사용.
   */
  selectedTemplateId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProductionMaterialEditorPage() {
  const navigate = useNavigate();
  const { libraryPath } = useStoreLibraryRoute();
  const location = useLocation();
  const state = (location.state as EditorPageState | null) ?? {};

  // WO-O4O-KPA-STORE-LIBRARY-EXECUTION-ASSET-EDIT-ACTION-V1:
  //   :id 가 있으면 기존 콘텐츠형 제작 자료(store_execution_assets) 단건 편집 모드.
  //   같은 row 를 update 하므로 id 불변 → 이 자산을 참조하는 QR(library_item_id)은 그대로 유지된다.
  const { id: editId } = useParams<{ id?: string }>();
  const isEditMode = !!editId;

  // WO-O4O-STORE-PRODUCTION-TEMPLATE-REGISTRY-V1:
  //   generatedHtml 우선. 없을 때 template.starterHtml fallback.
  //   둘 다 없으면 빈 editor (기존 동작).
  const selectedTemplate = state.selectedTemplateId ? findTemplate(state.selectedTemplateId) : undefined;
  const createInitialHtml = state.generatedHtml ?? selectedTemplate?.starterHtml ?? '';

  // WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-DIRECT-CREATE-V1:
  //   AI 결과/콘텐츠 출처 없이 빈 상태로 진입한 경우(처음부터 만들기) 헤더 문구를 맞춘다.
  const isFromScratch = !isEditMode && !state.generatedHtml && !selectedTemplate && !state.sourceMetadata;
  // WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-SOURCE-LOAD-FIX-V1:
  //   기존 자료(운영자 콘텐츠/내 제작자료)를 본문째 불러온 경우 — AI 초안이 아니므로 헤더를 구분.
  const sourceOrigin = state.sourceMetadata?.sourceOrigin;
  const isFromExistingSource = sourceOrigin === 'content-hub' || sourceOrigin === 'production-copy';
  const headerTitle = isEditMode
    ? '제작 자료 편집'
    : isFromScratch
      ? '새 제작 자료 작성'
      : isFromExistingSource
        ? '제작 자료 편집'
        : '매장 제작 자료 편집';

  const { organizationId } = useStoreOrganizationId();
  const initialDraft: MaterialDraft = { title: state.title ?? '', html: createInitialHtml, category: null,
    description: state.sourceMetadata?.sourceTitle ? `출처: ${state.sourceMetadata.sourceTitle}` : undefined };
  const session = useContentAuthoringSession({
    organizationId, serviceKey: getActiveServiceKey(), target: `material:${editId ?? `new:${location.key}`}`,
    initialDraft, load: editId ? () => loadMaterial(editId, organizationId) : undefined,
    toDraft: materialDraftFromRecord, persist: (draft, record) => saveMaterial(draft, record, organizationId), validate: validateNewContent,
    onSaved: (_record, unchanged) => { if (unchanged) navigate(libraryPath); },
  });
  const { title, category: selectedType } = session.draft;
  const editorContent = { html: session.draft.html }, editorInitialHtml = session.seed.html;
  const { saving, loading, error: loadError, save: handleSave } = session;
  const setTitle = (title: string) => session.changeDraft({ title });
  const setSelectedType = (category: ProductionTarget | null) => session.changeDraft({ category });
  const handleChange = (value: EditorContent) => session.changeDraft({ html: value.html });
  const setEditorInitialHtml = (html: string) => session.changeDraft({ html }, true);

  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  // WO-O4O-KPA-STORE-LIBRARY-EXECUTION-ASSET-EDIT-ACTION-V1: 편집 모드 본문 로드 중/실패 처리
  if (isEditMode && loading) {
    return (
      <div style={{ ...styles.page, alignItems: 'center', paddingTop: '80px' }}>
        <Loader2 size={20} style={{ color: colors.neutral400, animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }
  if (isEditMode && loadError) {
    return (
      <div style={{ ...styles.page, alignItems: 'center', paddingTop: '80px', gap: '12px' }}>
        <p role="alert" style={{ color: colors.neutral600, fontSize: '14px' }}>{loadError}</p>
        <button type="button" onClick={() => void session.reload()} style={styles.cancelBtn}>다시 시도</button>
        <button onClick={() => navigate(libraryPath)} style={styles.cancelBtn}>
          내 자료함 콘텐츠로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {session.notice && <output role={session.notice.ok ? 'status' : 'alert'} className={session.notice.ok ? 'text-sm text-green-700' : 'text-sm text-red-700'}>{session.notice.message}</output>}
      {/* Header */}
      <div style={styles.header}>
        <button onClick={handleCancel} style={styles.backBtn} aria-label="뒤로">
          <ArrowLeft size={16} />
          <span>{isFromScratch ? '목록으로' : '콘텐츠로'}</span>
        </button>
        <div style={styles.headerCenter}>
          <FileText size={18} style={{ color: colors.primary }} />
          <h1 style={styles.pageTitle}>{headerTitle}</h1>
        </div>
        <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
          <Save size={14} />
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      <StoreAiSlot label="제작 자료 편집" />
      {/* Meta inputs */}
      <div style={styles.metaRow}>
        {/* 제목 */}
        <div style={styles.metaGroup}>
          <label style={styles.metaLabel} htmlFor="pm-title">제목</label>
          <input
            id="pm-title"
            type="text"
            value={title}
            aria-label="콘텐츠 제목"
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제작 자료 제목을 입력하세요"
            style={styles.titleInput}
            maxLength={200}
          />
        </div>

        {/* 제작 유형 */}
        <div style={styles.metaGroup}>
          <label style={styles.metaLabel}>제작 유형 (선택)</label>
          <div style={styles.typeRow}>
            {PRODUCTION_TARGET_CATALOG.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedType(selectedType === t.key ? null : t.key)}
                style={{
                  ...styles.typeChip,
                  ...(selectedType === t.key ? styles.typeChipActive : {}),
                }}
              >
                <t.Icon size={13} style={{ color: selectedType === t.key ? colors.primary : t.iconColor }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Source info
          WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-SOURCE-LOAD-FIX-V1:
            content-hub(운영자 콘텐츠) / production-copy(내 제작자료 복제) 출처 추가.
            저장 시 항상 새 사본으로 저장되며 원본은 변경되지 않음을 안내. */}
      {state.sourceMetadata?.sourceTitle && (
        <div style={styles.sourceInfo}>
          <span style={styles.sourceLabel}>
            {state.sourceMetadata.sourceOrigin === 'production-copy' ? '복제 원본:' : '선택 콘텐츠:'}
          </span>
          <span style={styles.sourceTitle}>{state.sourceMetadata.sourceTitle}</span>
          {state.sourceMetadata.sourceOrigin && (
            <span style={styles.sourceOrigin}>
              ({state.sourceMetadata.sourceOrigin === 'snapshot' ? '커뮤니티'
                : state.sourceMetadata.sourceOrigin === 'direct' ? '매장 직접 작성'
                : state.sourceMetadata.sourceOrigin === 'content-hub' ? '운영자 콘텐츠'
                : state.sourceMetadata.sourceOrigin === 'production-copy' ? '내 제작자료 복제'
                : '자료함'})
            </span>
          )}
          <span style={styles.sourceNote}>· 저장하면 내 매장 제작자료로 별도 저장됩니다(원본 변경 없음).</span>
        </div>
      )}

      {/* WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1: 외부 LLM 작업 — 적용 시 initialHtml(편집기 value)·editorContent(저장값) 동시 갱신 */}
      <div style={{ marginBottom: 8 }}>
        {selectedType === 'product-description' ? (
          <ProductDescriptionAssist key={editId ?? 'product-description'} context={{
            task: 'product-description', title, currentHtml: editorContent.html,
            sourceTitle: state.sourceMetadata?.sourceTitle, sourceOrigin: state.sourceMetadata?.sourceOrigin,
          }} onApplyHtml={setEditorInitialHtml} />
        ) : (
        <LlmAssistPanel
          contextKey={`${organizationId}:${getActiveServiceKey()}:production:${editId ?? `new:${location.key}`}`} disabled={saving}
          label={STORE_LLM_ASSIST_LABEL}
          contextLabel="매장 제작 자료 — 새로 작성하거나 현재 내용을 다듬습니다"
          guideText={({ additionalInstruction }) => buildStoreContentAuthoringPrompt({
            task: resolveStoreContentLlmTask(editorContent.html),
            title,
            currentHtml: editorContent.html,
            sourceTitle: state.sourceMetadata?.sourceTitle,
            sourceOrigin: state.sourceMetadata?.sourceOrigin,
            additionalInstruction,
          })}
          currentHtml={editorContent.html}
          onApplyHtml={setEditorInitialHtml}
          onNotify={(message, kind) => session.notify(message, kind === 'success')}
        />
        )}
      </div>

      {/* Editor */}
      <div style={styles.editorWrap}>
        <RichTextEditor showInternalAi={false}
          value={editorInitialHtml}
          onChange={handleChange}
          placeholder="직접 작성하거나 ChatGPT 등 외부 AI에서 만든 내용을 붙여넣으세요."
          minHeight="520px"
          preset="full"
        />
      </div>

      {/* Footer actions */}
      <div style={styles.footer}>
        <button onClick={handleCancel} style={styles.cancelBtn}>취소</button>
        <button onClick={handleSave} disabled={saving} style={styles.saveBtnFooter}>
          <Save size={14} />
          {saving ? '저장 중...' : '매장 제작 자료로 저장'}
        </button>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  page: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '24px',
    maxWidth: '960px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: '12px',
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 'max-content',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
    whiteSpace: 'nowrap',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'transparent',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
  },
  metaRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: colors.neutral50,
    borderRadius: '8px',
    padding: '16px',
    border: `1px solid ${colors.neutral200}`,
  },
  metaGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  metaLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: colors.neutral600,
  },
  titleInput: {
    padding: '8px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    color: colors.neutral800,
    background: colors.white,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  typeRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  typeChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '16px',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  typeChipActive: {
    background: '#EFF6FF',
    borderColor: colors.primary,
    color: colors.primary,
    fontWeight: 500,
  },
  sourceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: colors.neutral500,
    padding: '8px 12px',
    background: '#f0f9ff',
    borderRadius: '6px',
    border: `1px solid #bae6fd`,
  },
  sourceLabel: {
    fontWeight: 600,
    color: colors.neutral600,
  },
  sourceTitle: {
    color: colors.neutral700,
  },
  sourceOrigin: {
    color: colors.neutral400,
  },
  sourceNote: {
    color: colors.neutral400,
    fontSize: '11px',
  },
  editorWrap: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    paddingTop: '8px',
  },
  cancelBtn: {
    padding: '8px 16px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  saveBtnFooter: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
  },
};
