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

import { useState, useCallback, useEffect, type CSSProperties } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Loader2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { RichTextEditor } from '@o4o/content-editor';
import type { EditorContent } from '@o4o/content-editor';
import {
  createStoreExecutionAsset,
  getStoreExecutionAsset,
  updateStoreExecutionAsset,
} from '../../api/storeExecutionAssets';
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
        : 'AI 제작 자료 초안 편집';

  const [title, setTitle] = useState(state.title ?? '');
  const [selectedType, setSelectedType] = useState<ProductionTarget | null>(null);
  const [editorContent, setEditorContent] = useState<EditorContent>({ html: createInitialHtml });
  const [saving, setSaving] = useState(false);

  // 편집 모드: 본문 로드 전까지 editor 를 렌더하지 않아 RichTextEditor 초기값이 정확히 주입되게 한다.
  const [loading, setLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editorInitialHtml, setEditorInitialHtml] = useState(createInitialHtml);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    (async () => {
      try {
        const res = await getStoreExecutionAsset(editId);
        if (cancelled) return;
        const asset = res.data;
        const html = asset.htmlContent ?? '';
        setTitle(asset.title ?? '');
        setEditorInitialHtml(html);
        setEditorContent({ html });
        // 콘텐츠형이 아닌 자산은 본문 편집 대상이 아님 — 방어적으로 안내 후 목록 복귀.
        if (asset.assetType !== 'content') {
          toast.error('이 자료는 본문 편집을 지원하지 않습니다.');
          navigate('/store/library/contents', { replace: true });
          return;
        }
      } catch {
        if (!cancelled) setLoadError('제작 자료를 불러올 수 없습니다.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, navigate]);

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
      if (isEditMode && editId) {
        // WO-O4O-KPA-STORE-LIBRARY-EXECUTION-ASSET-EDIT-ACTION-V1:
        //   같은 store_execution_assets row 를 update — id/organization_id/asset_type 보존.
        //   이 자산을 참조하는 QR(library_item_id)은 무변경, 공개 랜딩은 수정된 최신 본문을 표시.
        await updateStoreExecutionAsset(editId, {
          title: title.trim(),
          htmlContent: html,
          ...(selectedType ? { category: selectedType } : {}),
        });
        toast.success('제작 자료가 저장되었습니다.');
        navigate('/store/library/contents');
      } else {
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
        // WO-O4O-KPA-QR-POP-RESULT-SCOPE-V1: 제작 자료 메뉴를 숨겼으므로 저장 후 콘텐츠 자료함으로 이동.
        //   신규 자산(asset_type='content')은 콘텐츠 목록(origin='execution-asset')에 노출되어 결과를 바로 확인할 수 있다.
        navigate('/store/library/contents');
      }
    } catch {
      toast.error('저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }, [title, selectedType, editorContent, state.sourceMetadata, navigate, isEditMode, editId]);

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
        <p style={{ color: colors.neutral600, fontSize: '14px' }}>{loadError}</p>
        <button onClick={() => navigate('/store/library/contents')} style={styles.cancelBtn}>
          내 자료함 콘텐츠로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
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

      {/* Editor */}
      <div style={styles.editorWrap}>
        <RichTextEditor
          value={editorInitialHtml}
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
