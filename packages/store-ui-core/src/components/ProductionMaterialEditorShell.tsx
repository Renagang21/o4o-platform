/**
 * ProductionMaterialEditorShell — AI 제작 자료 초안 편집기 공통 shell
 *
 * WO-O4O-PRODUCTION-MATERIAL-EDITOR-SHELL-COMMONIZATION-V1
 *
 * GlycoPharm / K-Cosmetics 의 ProductionMaterialEditorPage (로직/JSX 동일, diff=cosmetic)를
 * 공통 컴포넌트로 추출. KPA editor 는 본 WO 범위 외.
 *
 * 제로-의존 원칙(store-ui-core, StartProductionModal 과 동일):
 *   - @o4o/* 직접 import 금지 — peerDeps(react, react-router-dom, lucide-react)만 사용.
 *   - RichTextEditor / toast / getAccessToken / createAsset / findTemplate 는 props 주입.
 *   - 이로써 store-ui-core 의존 방향(F3 Store Layer freeze) 불변, 신규 dependency 0.
 *
 * 서비스 wrapper 는 위 5개 어댑터만 주입한다 (api base path / template registry 차이 흡수).
 */

import { useState, useCallback, type CSSProperties, type ComponentType } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Save, FileText, Megaphone, QrCode } from 'lucide-react';

// ─── 제작 유형 (POP/QR — GP/KCos 동일) ───────────────────────────────────────

type ProductionType = 'pop' | 'qr';

const PRODUCTION_TYPES: { key: ProductionType; label: string; Icon: ComponentType<{ size?: number; style?: CSSProperties }>; iconColor: string }[] = [
  { key: 'pop', label: 'POP', Icon: Megaphone, iconColor: '#f59e0b' },
  { key: 'qr', label: 'QR 코드', Icon: QrCode, iconColor: '#0ea5e9' },
];

// ─── 주입 타입 (구조적 — @o4o 타입 import 금지) ──────────────────────────────

/** RichTextEditor(@o4o/content-editor) 구조적 호환 prop 집합 (필요한 것만) */
interface InjectedEditorProps {
  value?: string;
  onChange?: (content: { html: string }) => void;
  placeholder?: string;
  minHeight?: string;
  preset?: 'full' | 'compact';
  aiRequestHeaders?: Record<string, string>;
}

/** createStoreExecutionAsset 호출 입력 (shell 이 실제로 보내는 형태) */
export interface ProductionMaterialCreateInput {
  title: string;
  description?: string;
  assetType: 'content';
  sourceType: 'generated';
  category?: string;
  htmlContent: string;
}

export interface ProductionMaterialEditorShellProps {
  /** RichTextEditor 컴포넌트 (서비스가 @o4o/content-editor 의 RichTextEditor 주입) */
  EditorComponent: ComponentType<InjectedEditorProps>;
  /** selectedTemplateId → 템플릿(starterHtml) 조회 */
  findTemplate: (id: string) => { starterHtml?: string } | undefined;
  /** 제작 자료 저장 (서비스별 api base path) */
  createAsset: (params: ProductionMaterialCreateInput) => Promise<unknown>;
  /** AI 요청 헤더용 access token */
  getAccessToken: () => string | null;
  /** toast 어댑터 */
  notify: { success: (msg: string) => void; error: (msg: string) => void };
  /** 저장 성공 후 이동 경로 (기본: /store/library/production-materials) */
  savedPath?: string;
}

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

export function ProductionMaterialEditorShell({
  EditorComponent,
  findTemplate,
  createAsset,
  getAccessToken,
  notify,
  savedPath = '/store/library/production-materials',
}: ProductionMaterialEditorShellProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as EditorPageState | null) ?? {};

  const selectedTemplate = state.selectedTemplateId ? findTemplate(state.selectedTemplateId) : undefined;
  const initialHtml = state.generatedHtml ?? selectedTemplate?.starterHtml ?? '';

  const [title, setTitle] = useState(state.title ?? '');
  const [selectedType, setSelectedType] = useState<ProductionType | null>(null);
  const [editorHtml, setEditorHtml] = useState<string>(initialHtml);
  const [saving, setSaving] = useState(false);

  const aiHeaders = useCallback((): Record<string, string> | undefined => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, [getAccessToken]);

  const handleChange = useCallback((content: { html: string }) => {
    setEditorHtml(content.html);
  }, []);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      notify.error('제목을 입력해 주세요.');
      return;
    }
    const html = editorHtml;
    if (!html || html === '<p></p>' || html.trim() === '') {
      notify.error('내용을 입력해 주세요.');
      return;
    }

    setSaving(true);
    try {
      await createAsset({
        title: title.trim(),
        assetType: 'content',
        sourceType: 'generated',
        category: selectedType ?? undefined,
        htmlContent: html,
        description: state.sourceMetadata?.sourceTitle
          ? `출처: ${state.sourceMetadata.sourceTitle}`
          : undefined,
      });
      notify.success('제작 자료가 저장되었습니다.');
      navigate(savedPath);
    } catch {
      notify.error('저장에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  }, [title, selectedType, editorHtml, state.sourceMetadata, navigate, createAsset, notify, savedPath]);

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
        <EditorComponent
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
