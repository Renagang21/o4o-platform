/**
 * ProductionMaterialEditorPage — AI 결과 검토/수정 전용 편집기
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
 * 진입: StoreLibraryContentsPage → AiContentModal.onInsert → navigate('/store/library/production-materials/new', { state })
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
 *   - 저장 후 → /store/library/production-materials 이동
 */

import { useState, useCallback, type CSSProperties } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { RichTextEditor } from '@o4o/content-editor';
import type { EditorContent } from '@o4o/content-editor';
import { createStoreExecutionAsset } from '../../api/storeExecutionAssets';
import { getAccessToken } from '../../contexts/AuthContext';
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
  const location = useLocation();
  const state = (location.state as EditorPageState | null) ?? {};

  // WO-O4O-STORE-PRODUCTION-TEMPLATE-REGISTRY-V1:
  //   generatedHtml 우선. 없을 때 template.starterHtml fallback.
  //   둘 다 없으면 빈 editor (기존 동작).
  const selectedTemplate = state.selectedTemplateId ? findTemplate(state.selectedTemplateId) : undefined;
  const initialHtml = state.generatedHtml ?? selectedTemplate?.starterHtml ?? '';

  const [title, setTitle] = useState(state.title ?? '');
  const [selectedType, setSelectedType] = useState<ProductionTarget | null>(null);
  const [editorContent, setEditorContent] = useState<EditorContent>({ html: initialHtml });
  const [saving, setSaving] = useState(false);

  const aiHeaders = useCallback((): Record<string, string> | undefined => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, []);

  const handleChange = useCallback((content: EditorContent) => {
    setEditorContent(content);
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해 주세요.');
      return;
    }
    const html = editorContent.html;
    if (!html || html === '<p></p>' || html.trim() === '') {
      toast.error('내용을 입력해 주세요.');
      return;
    }

    setSaving(true);
    try {
      await createStoreExecutionAsset({
        title: title.trim(),
        assetType: 'content',
        sourceType: 'generated',
        category: selectedType ?? undefined,
        htmlContent: html,
        description: state.sourceMetadata?.sourceTitle
          ? `출처: ${state.sourceMetadata.sourceTitle}`
          : undefined,
      });
      toast.success('제작 자료가 저장되었습니다.');
      navigate('/store/library/production-materials');
    } catch {
      toast.error('저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }, [title, selectedType, editorContent, state.sourceMetadata, navigate]);

  const handleCancel = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={handleCancel} style={styles.backBtn} aria-label="뒤로">
          <ArrowLeft size={16} />
          <span>콘텐츠로</span>
        </button>
        <div style={styles.headerCenter}>
          <FileText size={18} style={{ color: colors.primary }} />
          <h1 style={styles.pageTitle}>AI 제작 자료 초안 편집</h1>
        </div>
        <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
          <Save size={14} />
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* Meta inputs */}
      <div style={styles.metaRow}>
        {/* 제목 */}
        <div style={styles.metaGroup}>
          <label style={styles.metaLabel} htmlFor="pm-title">제목</label>
          <input
            id="pm-title"
            type="text"
            value={title}
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

      {/* Source info */}
      {state.sourceMetadata?.sourceTitle && (
        <div style={styles.sourceInfo}>
          <span style={styles.sourceLabel}>선택 콘텐츠:</span>
          <span style={styles.sourceTitle}>{state.sourceMetadata.sourceTitle}</span>
          {state.sourceMetadata.sourceOrigin && (
            <span style={styles.sourceOrigin}>
              ({state.sourceMetadata.sourceOrigin === 'snapshot' ? '커뮤니티'
                : state.sourceMetadata.sourceOrigin === 'direct' ? '매장 직접 작성'
                : '자료함'})
            </span>
          )}
        </div>
      )}

      {/* Editor */}
      <div style={styles.editorWrap}>
        <RichTextEditor
          value={initialHtml}
          onChange={handleChange}
          placeholder="AI가 정리한 내용을 편집하거나, 직접 내용을 입력하세요."
          minHeight="520px"
          preset="full"
          aiRequestHeaders={aiHeaders()}
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
    justifyContent: 'space-between',
    gap: '12px',
  },
  headerCenter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: '17px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
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
