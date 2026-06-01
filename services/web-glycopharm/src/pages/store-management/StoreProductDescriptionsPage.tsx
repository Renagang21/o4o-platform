/**
 * StoreProductDescriptionsPage — GlycoPharm 내 약국 상품 상세설명 관리
 *
 * WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1
 *
 * KPA-Society StoreProductDescriptionsPage canonical 패턴 이식.
 * 본 페이지는 보유 상품의 기존 product_description 결과물 조회/재편집/저장.
 * 신규 생성은 "내 자료함 → 제작 시작 → 약국 상품 설명"에서만 진입.
 *
 * Backend: ProductAiContent (contentType='product_description') — Core API 공통.
 * API: /api/v1/products/:productId/ai-contents (서비스 prefix 없음)
 *
 * GlycoPharm 사용자-facing 문구는 "내 약국" 표현 유지 (약국 전용 서비스)
 * ⚠️ "내 매장"으로 일괄 치환 금지
 */

import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sparkles, Save, RefreshCw, FileText, Package, FolderOpen, LayoutTemplate } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { RichTextEditor, AiContentModal } from '@o4o/content-editor';
import { getAccessToken } from '@o4o/auth-client';
import { parseProductionRouterState } from '@o4o/store-ui-core';
import { fetchLocalProducts, type LocalProduct } from '@/api/localProducts';
import {
  getProductAiContents,
  saveProductAiContent,
  generateProductAiContent,
} from '@/api/productAiContent';
import { findTemplate, type ProductionTemplate } from '@/config/productionTemplates';

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
  const [selectedTemplate, setSelectedTemplate] = useState<ProductionTemplate | null>(null);
  const [aiOpen, setAiOpen] = useState(false);

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

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const fetchContent = useCallback(async (productId: string) => {
    setContentLoading(true);
    try {
      const res = await getProductAiContents(productId);
      const desc = (res.data || []).find((c) => c.contentType === 'product_description');
      const rawContent = desc?.content || '';
      const starterHtml = starterHtmlRef.current;
      starterHtmlRef.current = null;
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

  useEffect(() => {
    const prod = parseProductionRouterState(location.state);
    const first = prod?.source?.items?.[0];
    const templateId = prod?.selectedTemplateId;

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

    if (location.state) window.history.replaceState({}, document.title);
  }, [location.state]);

  const handleApplyPrefill = () => {
    if (!prefillNote) return;
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
      // GlycoPharm 사용자-facing 문구: "내 약국"
      toast.success('내 약국 상품 설명이 저장되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

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
            <span>내 약국</span>
            <span style={{ color: '#9CA3AF' }}>/</span>
            <span style={{ color: '#374151' }}>약국 상품 설명</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
            <h1 style={styles.title}>
              <FileText size={20} style={{ color: '#0EA5E9' }} />
              약국 상품 설명 관리
            </h1>
            {selectedTemplate && (
              <span style={styles.templateBadge}>
                <LayoutTemplate size={12} />
                {selectedTemplate.name}
                {selectedTemplate.style ? ` · ${selectedTemplate.style}` : ''}
              </span>
            )}
          </div>
          <p style={styles.subtitle}>
            저장된 약국 상품 상세설명을 조회·재편집합니다.
            신규 생성은 "내 자료함 → 제작 시작 → 약국 상품 설명"에서 진입하세요.
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
          <h2 style={styles.sidebarTitle}>내 약국 상품 ({products.length})</h2>
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
                      <Package size={14} style={{ color: active ? '#0EA5E9' : '#9CA3AF', flexShrink: 0 }} />
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
            <div style={{ ...styles.editorEmpty, flexDirection: 'column' as const, gap: '12px' }}>
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
                  {selectedTemplate && (
                    <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={styles.typeLabel}>
                        {selectedTemplate.style ?? selectedTemplate.name}
                      </span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>
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
                    <span style={styles.metaTextMuted}>저장된 설명 없음</span>
                  )}
                </div>
              </div>

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

              <div style={styles.aiBanner}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.aiBannerTitle}>✨ AI 상품설명 보조</div>
                  <div style={styles.aiBannerDesc}>
                    {selectedTemplate
                      ? `${selectedTemplate.name} 스타일로 AI가 약국 상품설명 초안을 작성합니다.`
                      : '자료를 기반으로 AI가 약국 상품설명 초안을 작성합니다.'}
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

              {contentLoading ? (
                <div style={styles.editorLoading}>불러오는 중...</div>
              ) : (
                <RichTextEditor
                  key={selectedId ?? 'empty'}
                  value={content}
                  onChange={(c) => setContent(c.html)}
                  placeholder={
                    hasExisting
                      ? '저장된 약국 상품 설명을 수정하세요.'
                      : selectedTemplate
                        ? `${selectedTemplate.name} 템플릿 구조로 작성하세요. AI 보조를 활용하면 빠르게 초안을 만들 수 있습니다.`
                        : '신규 생성은 "내 자료함 → 제작 시작 → 약국 상품 설명"에서 시작하세요.'
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

      <AiContentModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={null}
        onInsert={handleAiInsert}
        aiRequestHeaders={(() => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })()}
        headerLabel="약국 상품설명 AI 보조"
        urlPlaceholder="https://example.com/product 또는 제품 페이지 URL"
        templateId={selectedTemplate?.id}
        templateSystemPrompt={selectedTemplate?.systemPromptOverride}
        templateForcedOptions={selectedTemplate?.forcedOptions}
      />
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: { padding: '24px', maxWidth: '1100px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#9CA3AF', marginBottom: '6px' },
  title: { display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 600, color: '#1F2937', margin: 0 },
  templateBadge: { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 8px', background: '#EFF6FF', color: '#2563EB', borderRadius: '5px', fontSize: '12px', fontWeight: 600 },
  subtitle: { fontSize: '13px', color: '#6B7280', margin: '6px 0 0', lineHeight: 1.5 },
  refreshBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fff', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '13px', color: '#374151', cursor: 'pointer' },
  layout: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '16px', alignItems: 'flex-start' },
  sidebar: { background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '12px', maxHeight: '600px', overflowY: 'auto' as const },
  sidebarTitle: { fontSize: '13px', fontWeight: 600, color: '#4B5563', margin: '0 0 8px', padding: '0 4px' },
  sidebarEmpty: { fontSize: '13px', color: '#6B7280', padding: '12px 4px', margin: 0 },
  productList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: '2px' },
  productItem: { display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', background: 'transparent', border: '1px solid transparent', borderRadius: '6px', fontSize: '13px', color: '#374151', cursor: 'pointer', textAlign: 'left' as const },
  productItemActive: { background: '#EFF6FF', borderColor: '#BFDBFE', color: '#2563EB', fontWeight: 500 },
  productName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  editor: { background: '#fff', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '12px', minHeight: '400px' },
  editorEmpty: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '14px', minHeight: '300px' },
  editorLoading: { minHeight: '360px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '14px' },
  editorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #E5E7EB' },
  editorProductName: { fontSize: '15px', fontWeight: 600, color: '#1F2937' },
  editorProductSummary: { fontSize: '12px', color: '#6B7280', marginTop: '4px' },
  typeLabel: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', background: '#F0FDF4', color: '#15803D', borderRadius: '4px', fontSize: '11px', fontWeight: 600 },
  editorMeta: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '4px', flexShrink: 0 },
  metaBadge: { display: 'inline-flex', alignItems: 'center', padding: '2px 6px', background: '#EFF6FF', color: '#2563EB', borderRadius: '4px', fontSize: '11px', fontWeight: 500 },
  metaText: { fontSize: '11px', color: '#9CA3AF' },
  metaTextMuted: { fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic' },
  prefillBanner: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px' },
  prefillBtn: { padding: '6px 12px', background: '#fff', border: '1px solid #FDE68A', borderRadius: '6px', fontSize: '12px', color: '#92400E', fontWeight: 500, cursor: 'pointer', flexShrink: 0 },
  aiBanner: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: '8px' },
  aiBannerTitle: { fontSize: '13px', fontWeight: 600, color: '#4338CA', marginBottom: '2px' },
  aiBannerDesc: { fontSize: '12px', color: '#6366F1', lineHeight: 1.5 },
  aiBannerBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#4F46E5', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  aiBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#fff', border: '1px solid #0EA5E9', borderRadius: '6px', fontSize: '13px', color: '#0EA5E9', fontWeight: 500, cursor: 'pointer' },
  saveBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0EA5E9', border: 'none', borderRadius: '6px', fontSize: '13px', color: '#fff', fontWeight: 500, cursor: 'pointer' },
  sidebarLink: { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', fontSize: '12px', color: '#2563EB', fontWeight: 500, textDecoration: 'none', marginTop: '4px' },
  libraryLink: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #0EA5E9', backgroundColor: '#fff', color: '#0EA5E9', borderRadius: '8px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' },
};
