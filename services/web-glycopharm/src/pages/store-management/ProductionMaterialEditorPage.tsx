/**
 * ProductionMaterialEditorPage — AI 결과 검토/수정 전용 편집기 (GlycoPharm)
 *
 * WO-O4O-PRODUCTION-AI-EDITOR-CROSSSERVICE-PHASE2-I-V1
 * WO-O4O-PRODUCTION-TEMPLATE-REGISTRY-CROSSSERVICE-PHASE2-J-V1:
 *   selectedTemplateId → findTemplate → starterHtml fallback 추가.
 *
 * 저장: POST /api/v1/glycopharm/store/assets (createStoreExecutionAsset)
 * 저장 후: /store/library/production-materials 이동
 *
 * 진입: StoreLibraryContentsPage → AiContentModal.onInsert → navigate('/store/library/production-materials/new', { state })
 * state: {
 *   generatedHtml?: string;
 *   title?: string;
 *   sourceMetadata?: { sourceContentId?: string; sourceTitle?: string; sourceOrigin?: string };
 *   selectedTemplateId?: string;
 * }
 */

import { useState, useCallback, type CSSProperties } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { Megaphone, QrCode } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { RichTextEditor } from '@o4o/content-editor';
import type { EditorContent } from '@o4o/content-editor';
import { getAccessToken } from '@o4o/auth-client';
import { createStoreExecutionAsset } from '@/api/storeExecutionAssets';
import { findTemplate } from '@/config/productionTemplates';

// ─── 제작 유형 (GlycoPharm: POP/QR 2개) ─────────────────────────────────────

type ProductionType = 'pop' | 'qr';

const PRODUCTION_TYPES: { key: ProductionType; label: string; Icon: React.ElementType; iconColor: string }[] = [
  { key: 'pop', label: 'POP', Icon: Megaphone, iconColor: '#f59e0b' },
  { key: 'qr', label: 'QR 코드', Icon: QrCode, iconColor: '#0ea5e9' },
];

// ─── Location State ──────────────────────────────────────────────────────────

interface EditorPageState {
  generatedHtml?: string;
  title?: string;
  sourceMetadata?: {
    sourceContentId?: string;
    sourceTitle?: string;
    sourceOrigin?: string;
  };
  selectedTemplateId?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProductionMaterialEditorPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as EditorPageState | null) ?? {};

  const selectedTemplate = state.selectedTemplateId ? findTemplate(state.selectedTemplateId) : undefined;
  const initialHtml = state.generatedHtml ?? selectedTemplate?.starterHtml ?? '';

  const [title, setTitle] = useState(state.title ?? '');
  const [selectedType, setSelectedType] = useState<ProductionType | null>(null);
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
          <FileText size={18} style={{ color: '#3b82f6' }} />
          <h1 style={styles.pageTitle}>AI 제작 자료 초안 편집</h1>
        </div>
        <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
          <Save size={14} />
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>

      {/* Meta inputs */}
      <div style={styles.metaRow}>
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

        <div style={styles.metaGroup}>
          <label style={styles.metaLabel}>제작 유형 (선택)</label>
          <div style={styles.typeRow}>
            {PRODUCTION_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setSelectedType(selectedType === t.key ? null : t.key)}
                style={{
                  ...styles.typeChip,
                  ...(selectedType === t.key ? styles.typeChipActive : {}),
                }}
              >
                <t.Icon size={13} style={{ color: selectedType === t.key ? '#3b82f6' : t.iconColor }} />
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
    color: '#1e293b',
    margin: 0,
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer',
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 14px',
    fontSize: '13px',
    color: '#ffffff',
    fontWeight: 500,
    cursor: 'pointer',
  },
  metaRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #e2e8f0',
  },
  metaGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  metaLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#64748b',
  },
  titleInput: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#1e293b',
    background: '#ffffff',
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
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    fontSize: '13px',
    color: '#64748b',
    cursor: 'pointer',
  },
  typeChipActive: {
    background: '#EFF6FF',
    borderColor: '#3b82f6',
    color: '#3b82f6',
    fontWeight: 500,
  },
  sourceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#64748b',
    padding: '8px 12px',
    background: '#f0f9ff',
    borderRadius: '6px',
    border: '1px solid #bae6fd',
  },
  sourceLabel: {
    fontWeight: 600,
    color: '#475569',
  },
  sourceTitle: {
    color: '#334155',
  },
  sourceOrigin: {
    color: '#94a3b8',
  },
  editorWrap: {
    border: '1px solid #e2e8f0',
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
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#334155',
    cursor: 'pointer',
  },
  saveBtnFooter: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 18px',
    background: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#ffffff',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
