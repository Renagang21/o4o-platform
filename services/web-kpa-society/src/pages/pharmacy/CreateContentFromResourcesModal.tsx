/**
 * CreateContentFromResourcesModal — 빈 편집기 직접 작성 → direct 콘텐츠 제작
 *
 * WO-O4O-STORE-CONTENT-CREATION-FROM-LIBRARY-RESOURCES-V1
 * WO-O4O-KPA-CONTENT-CREATE-AI-STEP-REMOVE-V1:
 *   "자료 선택 → AI 본문 생성" 진입점 제거(O4O 초안 생성 안 함 정책,
 *    IR-O4O-AI-CONTENT-GENERATION-ENTRYPOINT-AUDIT-V1). 콘텐츠 제작은 빈 편집기에서
 *    직접 작성·외부 LLM(ChatGPT/Claude/Gemini) 결과 붙여넣기 중심으로 단순화.
 *   - 유지: 제목 / 태그 / RichTextEditor(preset='full' → Toolbar "AI 정리" 편집 보조) / 저장
 *   - 유지: direct content 저장 경로(POST /store-contents, generatedBy='manual-direct',
 *           sourceResources=[]) → /store/library/contents 문서형 목록 '내 콘텐츠'로 노출
 *   - 제거: 자료 multi-select 단계, 자료 기반 AI 본문 생성(/api/ai/content 직접 호출),
 *           제작 요청/보조 옵션 preset
 *   - 보존(미삭제): AiContentModal 컴포넌트, /api/ai/content endpoint, ai-prompts,
 *           RichTextEditor Toolbar AI(편집 보조)
 *
 * 흐름:
 *   콘텐츠 제작 → 빈 편집기(제목/태그/본문) → 직접 작성 또는 붙여넣기 → 저장
 *   → POST /store-contents → navigate('/store/content/direct/:id')
 */

import { useEffect, useState, useCallback, useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Save, Loader2 } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { RichTextEditor, type EditorContent } from '@o4o/content-editor';
import { apiClient } from '../../api/client';
import { getAccessToken } from '../../contexts/AuthContext';
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

  const [title, setTitle] = useState('');
  // WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1: 콘텐츠 태그 (string[])
  const [tags, setTags] = useState<string[]>([]);
  const [editorHtml, setEditorHtml] = useState('');
  const [saving, setSaving] = useState(false);

  // open/close 시 상태 초기화
  useEffect(() => {
    if (!open) {
      setTitle('');
      setTags([]);
      setEditorHtml('');
      setSaving(false);
    }
  }, [open]);

  const handleEditorChange = useCallback((content: EditorContent) => setEditorHtml(content.html), []);

  // RichTextEditor Toolbar "AI 정리"(편집 보조) 호출용 Authorization 헤더 — 유지 대상.
  const aiHeaders = useMemo<Record<string, string> | undefined>(() => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : undefined;
  }, []);

  // 저장 — direct content 로 POST /store-contents (manual-direct, sourceResources=[]).
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해 주세요');
      return;
    }
    const html = editorHtml.trim();
    if (!html || html === '<p></p>') {
      toast.error('콘텐츠 본문이 비어 있습니다. 직접 작성하거나 붙여넣어 주세요.');
      return;
    }
    setSaving(true);
    try {
      const res = await apiClient.post<{ success: boolean; data: { id: string } }>(
        '/store-contents',
        {
          title: title.trim(),
          // WO-O4O-KPA-CONTENT-LIST-TAG-FIELD-AND-DISPLAY-V1: 태그(string[]) 전달 — 백엔드에서 sanitize.
          tags,
          contentJson: {
            html,
            // WO-O4O-KPA-CONTENT-CREATE-AI-STEP-REMOVE-V1: 빈 편집기 직접 작성 = manual-direct, 원소스 없음.
            sourceResources: [],
            generatedBy: 'manual-direct',
          },
          // WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CONTENT-ACTIONS-V1: 제품 진입 시 자동 연결.
          ...(product ? { productRef: { sourceType: product.sourceType, sourceId: product.sourceId } } : {}),
        },
      );
      const newId = res?.data?.id;
      toast.success('내 자료함 콘텐츠로 저장되었습니다');
      onCreated?.(newId);
      onClose();
      if (newId) navigate(`/store/content/direct/${newId}`);
    } catch (err: any) {
      if (err?.status === 403) {
        toast.error('매장 경영자 권한이 필요합니다');
      } else {
        toast.error(err?.message || '저장에 실패했습니다');
      }
    } finally {
      setSaving(false);
    }
  }, [title, tags, editorHtml, product, onCreated, onClose, navigate]);

  if (!open) return null;

  const canSave = !!title.trim() && !!editorHtml.trim() && !saving;

  return (
    <div style={styles.backdrop} role="presentation" onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <h2 style={styles.title}>콘텐츠 작성</h2>
          </div>
          <button type="button" onClick={onClose} style={styles.iconBtn} aria-label="닫기">
            <X size={16} />
          </button>
        </header>

        <div style={styles.body}>
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
              placeholder="콘텐츠 제목"
              style={styles.input}
              maxLength={200}
            />
          </div>

          <div style={styles.composeRow}>
            <label style={styles.label}>태그</label>
            <TagInput tags={tags} onChange={setTags} placeholder="예: 간 건강, 면역 (Enter·쉼표로 구분)" />
          </div>

          <div style={styles.composeRow}>
            <label style={styles.label}>매장 콘텐츠 본문</label>
            <div style={styles.editorWrap}>
              <RichTextEditor
                value={editorHtml}
                onChange={handleEditorChange}
                placeholder="본문을 직접 작성하거나, 외부 AI에서 만든 초안을 붙여넣은 뒤 편집하세요."
                minHeight="320px"
                preset="full"
                aiRequestHeaders={aiHeaders}
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
    </div>
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
  footerActions: { display: 'flex', gap: 8 },
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
