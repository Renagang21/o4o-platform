/**
 * StoreProductDescriptionsPage — 매장 실행 / 상품 상세설명 (결과물 관리 전용)
 *
 * WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS-CANONICAL-ALIGN-V1
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1:
 *   "신규 제작 시작" 진입 제거 — 신규 생성은 "내 자료함 → 제작 시작 → 상품 상세설명"에서만.
 *   본 페이지는 보유 상품의 기존 product_description 결과물 조회/재편집/저장/삭제(빈값 저장).
 * WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1:
 *   - textarea → RichTextEditor 전환 (structured HTML 기반 편집)
 *   - ProductionRouterState에서 selectedTemplateId 수신
 *   - template badge + 설명 유형 표시
 *   - template starterHtml 초기 구조 주입 (기존 저장 내용 없을 때)
 *   - AiContentModal template-aware 연결 (templateSystemPrompt / templateForcedOptions)
 *
 * Backend: ProductAiContent (contentType='product_description') — 기존 active entity/API 재사용.
 *
 * 진입 시 location.state.production.source.items 가 있으면 첫 항목을 기반으로
 * 상품 선택 + 자료 description prefill 처리.
 */

import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sparkles, Save, RefreshCw, FileText, Package, FolderOpen, LayoutTemplate } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { RichTextEditor, AiContentModal } from '@o4o/content-editor';
import {
  fetchLocalProducts,
  type LocalProduct,
} from '../../api/localProducts';
import {
  getProductAiContents,
  saveProductAiContent,
  generateProductAiContent,
} from '../../api/productAiContent';
import { mediaApi } from '../../api/media';
import { getAccessToken } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';
import { findTemplate } from './productionTemplates';
import type { ProductionTemplate } from './productionTemplates';
import type { ProductionRouterState } from './productionTargets';

const POLL_DELAY_MS = 4000;

export default function StoreProductDescriptionsPage() {
  const location = useLocation();
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [contentLoading, setContentLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [model, setModel] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [prefillNote, setPrefillNote] = useState<string | null>(null);

  // WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1: template 상태
  const [selectedTemplate, setSelectedTemplate] = useState<ProductionTemplate | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

  /**
   * starterHtml은 1회 소비용 ref.
   * fetchContent 완료 후 저장된 내용이 없을 때 editor 초기값으로 주입하고 즉시 null로 소비.
   * 사용자가 사이드바에서 다른 상품 전환 시 재적용 방지.
   */
  const starterHtmlRef = useRef<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLocalProducts({ page: 1, limit: 100, activeOnly: 'true' });
      setProducts(res.items || []);
      if (res.items?.length && !selectedId) {
        setSelectedId(res.items[0].id);
      }
    } catch (e: any) {
      toast.error(e?.message || '상품 목록을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const fetchContent = useCallback(async (productId: string) => {
    setContentLoading(true);
    try {
      const res = await getProductAiContents(productId);
      const desc = (res.data || []).find((c) => c.contentType === 'product_description');
      const rawContent = desc?.content || '';
      // WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1:
      // 저장된 내용이 없을 때 template starterHtml을 초기 구조로 적용 (1회 소비)
      const starterHtml = starterHtmlRef.current;
      starterHtmlRef.current = null; // consume
      setContent(rawContent || starterHtml || '');
      setModel(desc?.model || null);
      setUpdatedAt(desc?.updatedAt || null);
    } catch {
      const starterHtml = starterHtmlRef.current;
      starterHtmlRef.current = null;
      setContent(starterHtml || '');
      setModel(null);
      setUpdatedAt(null);
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) fetchContent(selectedId);
  }, [selectedId, fetchContent]);

  // WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1 +
  // WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1:
  //   production 진입 시 selectedTemplateId → template 조회 + starterHtml ref 설정.
  //   source description → prefill 후보 보관.
  useEffect(() => {
    const state = location.state as ProductionRouterState | null;
    const first = state?.production?.source?.items?.[0];
    const templateId = state?.production?.selectedTemplateId;

    const template = templateId ? (findTemplate(templateId) ?? null) : null;
    if (template) {
      setSelectedTemplate(template);
      if (template.starterHtml) {
        starterHtmlRef.current = template.starterHtml;
      }
    }

    if (first?.description?.trim()) {
      setPrefillNote(first.description.trim());
    }

    if (state) window.history.replaceState({}, document.title);
  }, [location.state]);

  const handleApplyPrefill = () => {
    if (!prefillNote) return;
    // plain text → HTML paragraph (RichTextEditor가 파싱 가능한 최소 구조)
    const lines = prefillNote.split(/\n+/).filter(Boolean);
    const html = lines.length > 1
      ? lines.map((l) => `<p>${l}</p>`).join('')
      : `<p>${prefillNote}</p>`;
    setContent(html);
    toast.success('자료 내용을 편집기에 채웠습니다');
  };

  const handleRegenerate = async () => {
    if (!selectedId) return;
    setRegenerating(true);
    try {
      await generateProductAiContent(selectedId, 'product_description');
      toast.success('AI 재생성을 시작했습니다. 잠시 후 결과를 표시합니다.');
      setTimeout(() => {
        if (selectedId) fetchContent(selectedId);
        setRegenerating(false);
      }, POLL_DELAY_MS);
    } catch (e: any) {
      toast.error(e?.message || 'AI 재생성에 실패했습니다');
      setRegenerating(false);
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error('내용을 입력하세요');
      return;
    }
    setSaving(true);
    try {
      const res = await saveProductAiContent(selectedId, 'product_description', trimmed);
      setModel(res.data.model || null);
      setUpdatedAt(res.data.updatedAt || null);
      toast.success('저장되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1: RichTextEditor 이미지 업로드
  const handleImageUpload = async (file: File): Promise<string> => {
    const res = await mediaApi.upload(file, true, 'kpa-society', 'product-description');
    if (res.success && res.data) return res.data.url;
    throw new Error(res.error || '이미지 업로드에 실패했습니다.');
  };

  // WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1: AiContentModal onInsert
  const handleAiInsert = useCallback(({ html }: { html: string; title: string }) => {
    setContent(html);
    setAiOpen(false);
    toast.success('AI 작성 내용이 편집기에 적용되었습니다. 검토 후 저장하세요.');
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedId) || null;
  const hasExisting = !!updatedAt;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>
            <span>매장 실행</span>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral700 }}>상품 상세설명</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={styles.title}>
              <FileText size={20} style={{ color: colors.primary }} />
              상품 상세설명 관리
            </h1>
            {/* WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1: template badge */}
            {selectedTemplate && (
              <span style={styles.templateBadge}>
                <LayoutTemplate size={12} />
                {selectedTemplate.name}
                {selectedTemplate.style ? ` · ${selectedTemplate.style}` : ''}
              </span>
            )}
          </div>
          <p style={styles.subtitle}>
            저장된 상품 상세설명을 조회·재편집·삭제(빈값 저장)합니다.
            신규 생성은 "내 자료함 → 제작 시작 → 상품 상세설명"에서 진입하세요.
          </p>
        </div>
        <button onClick={fetchProducts} style={styles.refreshBtn} disabled={loading}>
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      <div style={styles.layout}>
        {/* 상품 목록 */}
        <aside style={styles.sidebar}>
          <h2 style={styles.sidebarTitle}>내 매장 상품 ({products.length})</h2>
          {loading ? (
            <p style={styles.sidebarEmpty}>불러오는 중...</p>
          ) : products.length === 0 ? (
            <div style={{ padding: '12px 4px' }}>
              <p style={styles.sidebarEmpty}>등록된 자체 상품이 없습니다.</p>
              <Link to="/store/commerce/local-products" style={styles.sidebarLink}>
                <Package size={13} />
                상품 등록하기
              </Link>
            </div>
          ) : (
            <ul style={styles.productList}>
              {products.map((p) => {
                const active = p.id === selectedId;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(p.id)}
                      style={{
                        ...styles.productItem,
                        ...(active ? styles.productItemActive : {}),
                      }}
                    >
                      <Package size={14} style={{ color: active ? colors.primary : colors.neutral400, flexShrink: 0 }} />
                      <span style={styles.productName}>{p.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* 편집 패널 */}
        <section style={styles.editor}>
          {!selectedProduct ? (
            <div style={{ ...styles.editorEmpty, flexDirection: 'column', gap: '12px' }}>
              <span>왼쪽에서 상품을 선택하세요.</span>
              <Link to="/store/library/contents" style={styles.libraryLink}>
                <FolderOpen size={14} />
                내 자료함에서 상세설명 만들기
              </Link>
            </div>
          ) : (
            <>
              <div style={styles.editorHeader}>
                <div>
                  <div style={styles.editorProductName}>{selectedProduct.name}</div>
                  {selectedProduct.summary && (
                    <div style={styles.editorProductSummary}>{selectedProduct.summary}</div>
                  )}
                  {/* WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1: 설명 유형 badge */}
                  {selectedTemplate && (
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={styles.typeLabel}>
                        {selectedTemplate.style ?? selectedTemplate.name}
                      </span>
                      <span style={{ fontSize: '11px', color: colors.neutral400 }}>
                        {selectedTemplate.description}
                      </span>
                    </div>
                  )}
                </div>
                <div style={styles.editorMeta}>
                  {model && <span style={styles.metaBadge}>모델: {model}</span>}
                  {updatedAt ? (
                    <span style={styles.metaText}>
                      저장: {new Date(updatedAt).toLocaleString('ko-KR')}
                    </span>
                  ) : (
                    <span style={styles.metaTextMuted}>저장된 결과물 없음</span>
                  )}
                </div>
              </div>

              {/* Prefill 안내 (내 자료함 진입 시) */}
              {prefillNote && (
                <div style={styles.prefillBanner}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 12, color: '#92400E' }}>자료 내용 prefill 가능</strong>
                    <p style={{ margin: '4px 0 0', fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>
                      내 자료함에서 선택한 자료의 설명을 편집기에 채울 수 있습니다.
                    </p>
                  </div>
                  <button type="button" onClick={handleApplyPrefill} style={styles.prefillBtn}>
                    자료 내용으로 채우기
                  </button>
                </div>
              )}

              {/* WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1: AI 보조 배너 */}
              <div style={styles.aiBanner}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.aiBannerTitle}>✨ AI 상품설명 보조</div>
                  <div style={styles.aiBannerDesc}>
                    {selectedTemplate
                      ? `${selectedTemplate.name} 스타일로 AI가 상품설명 초안을 작성합니다.`
                      : 'URL이나 자료를 기반으로 AI가 상품설명 초안을 작성합니다.'}
                    {' '}최종 내용은 직접 검토 후 저장하세요.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAiOpen(true)}
                  style={styles.aiBannerBtn}
                >
                  <Sparkles size={13} />
                  AI로 작성
                </button>
              </div>

              {/* WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1: RichTextEditor */}
              {contentLoading ? (
                <div style={styles.editorLoading}>불러오는 중...</div>
              ) : (
                <RichTextEditor
                  key={selectedId ?? 'empty'}
                  value={content}
                  onChange={(c) => setContent(c.html)}
                  onImageUpload={handleImageUpload}
                  placeholder={
                    hasExisting
                      ? '저장된 상품 상세설명을 수정하세요.'
                      : selectedTemplate
                        ? `${selectedTemplate.name} 템플릿 구조로 작성하세요. AI 보조를 활용하면 빠르게 초안을 만들 수 있습니다.`
                        : '신규 생성은 "내 자료함 → 제작 시작 → 상품 상세설명"에서 시작하세요.'
                  }
                  minHeight="360px"
                  preset="full"
                  aiRequestHeaders={(() => {
                    const token = getAccessToken();
                    return token ? { Authorization: `Bearer ${token}` } : undefined;
                  })()}
                />
              )}

              <div style={styles.actions}>
                {hasExisting && (
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={regenerating || saving}
                    style={{ ...styles.aiBtn, opacity: regenerating || saving ? 0.7 : 1 }}
                    title="기존 결과물을 AI로 다시 생성합니다"
                  >
                    <Sparkles size={14} />
                    {regenerating ? 'AI 재생성 중...' : 'AI 재생성'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={regenerating || saving || !content.trim()}
                  style={{ ...styles.saveBtn, opacity: regenerating || saving || !content.trim() ? 0.7 : 1 }}
                >
                  <Save size={14} />
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>

      {/* WO-O4O-PRODUCT-DESCRIPTION-TEMPLATE-WORKFLOW-V1: AiContentModal (template-aware) */}
      <AiContentModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={null}
        onInsert={handleAiInsert}
        aiRequestHeaders={(() => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })()}
        headerLabel="상품설명 AI 보조"
        urlPlaceholder="https://example.com/product 또는 제품 페이지 URL"
        templateId={selectedTemplate?.id}
        templateSystemPrompt={selectedTemplate?.systemPromptOverride}
        templateForcedOptions={selectedTemplate?.forcedOptions}
      />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1100px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: colors.neutral400,
    marginBottom: '6px',
  },
  title: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '20px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  templateBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '3px 8px',
    background: '#eef2ff',
    color: '#4f46e5',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: 600,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '6px 0 0',
    lineHeight: 1.5,
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '16px',
    alignItems: 'flex-start',
  },
  sidebar: {
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    padding: '12px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  sidebarTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral600,
    margin: '0 0 8px',
    padding: '0 4px',
  },
  sidebarEmpty: {
    fontSize: '13px',
    color: colors.neutral500,
    padding: '12px 4px',
    margin: 0,
  },
  productList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  productItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 10px',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
    textAlign: 'left',
  },
  productItemActive: {
    background: '#EFF6FF',
    borderColor: '#BFDBFE',
    color: colors.primary,
    fontWeight: 500,
  },
  productName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  editor: {
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    minHeight: '400px',
  },
  editorEmpty: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.neutral400,
    fontSize: '14px',
    minHeight: '300px',
  },
  editorLoading: {
    minHeight: '360px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.neutral400,
    fontSize: '14px',
  },
  editorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
    paddingBottom: '12px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  editorProductName: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
  },
  editorProductSummary: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  typeLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    background: '#f0fdf4',
    color: '#15803d',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
  },
  editorMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    flexShrink: 0,
  },
  metaBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    background: '#EFF6FF',
    color: colors.primary,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  metaText: {
    fontSize: '11px',
    color: colors.neutral400,
  },
  metaTextMuted: {
    fontSize: '11px',
    color: colors.neutral400,
    fontStyle: 'italic',
  },
  prefillBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    background: '#FFFBEB',
    border: '1px solid #FDE68A',
    borderRadius: '6px',
  },
  prefillBtn: {
    padding: '6px 12px',
    background: colors.white,
    border: '1px solid #FDE68A',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#92400E',
    fontWeight: 500,
    cursor: 'pointer',
    flexShrink: 0,
  },
  aiBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    padding: '10px 14px',
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: '8px',
  },
  aiBannerTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#4338ca',
    marginBottom: '2px',
  },
  aiBannerDesc: {
    fontSize: '12px',
    color: '#6366f1',
    lineHeight: 1.5,
  },
  aiBannerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '7px',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  },
  aiBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: colors.white,
    border: `1px solid ${colors.primary}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.primary,
    fontWeight: 500,
    cursor: 'pointer',
  },
  saveBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
  },
  sidebarLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 10px',
    background: '#EFF6FF',
    border: '1px solid #BFDBFE',
    borderRadius: '6px',
    fontSize: '12px',
    color: colors.primary,
    fontWeight: 500,
    textDecoration: 'none',
    marginTop: '4px',
  },
  libraryLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    border: `1px solid ${colors.primary}`,
    backgroundColor: '#fff',
    color: colors.primary,
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    textDecoration: 'none',
  },
};
