/**
 * StoreProductDescriptionsPage — K-Cosmetics 내 매장 상품 상세설명 관리
 *
 * WO-O4O-MY-STORE-PRODUCT-DESCRIPTION-CROSSSERVICE-ALIGNMENT-V1
 *
 * KPA-Society StoreProductDescriptionsPage canonical 패턴 이식.
 * 본 페이지는 보유 상품의 기존 product_description 결과물 조회/재편집/저장.
 * 신규 생성은 "내 자료함 → 제작 시작 → 매장 상품 설명"에서만 진입.
 *
 * WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1 (2026-07-29):
 *   전역 자원 `product_ai_contents` (ProductMaster 기준 AI 초안) 를 매장 저장소로
 *   사용하던 구조를 제거한다. 내 매장이 소유·편집하는 상품 설명의 canonical 저장 위치는
 *   `store_local_products.detail_html` 이다.
 *     - 조회: 목록 응답 row 의 detailHtml / detail_html (추가 조회 API 없음)
 *     - 저장: PUT /api/v1/store/local-products/:id  { detailHtml }  (부분 업데이트)
 *   description / summary / usage_info / caution_info 는 본 화면에서 건드리지 않는다.
 *
 * Backend: store_local_products (Display Domain, organization_id 격리).
 *
 * K-Cosmetics 사용자-facing 문구는 "내 매장" 표현 사용
 * ⚠️ "내 약국" 또는 약국 전용 문구 사용 금지
 */

import { useEffect, useState, useCallback, useRef, type CSSProperties } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Save, RefreshCw, FileText, Package, FolderOpen, LayoutTemplate } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { RichTextEditor } from '@o4o/content-editor';
import { getAccessToken } from '@o4o/auth-client';
import { parseProductionRouterState } from '@o4o/store-ui-core';
import { fetchLocalProducts, updateLocalProduct, type LocalProduct } from '@/services/localProductApi';
import { findTemplate } from '@/config/productionTemplates';
import type { ProductionTemplate } from '@o4o/types/production-template';

export default function StoreProductDescriptionsPage() {
  const location = useLocation();
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [prefillNote, setPrefillNote] = useState<string | null>(null);

  // WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1 §6.5:
  //   "목록 실패" 와 "0건" 을 구분한다. 실패를 빈 목록으로 위장하지 않는다.
  const [listError, setListError] = useState<string | null>(null);
  //   저장 실패는 작성 내용을 유지한 채 명시적으로 노출하고 재시도 가능해야 한다.
  const [saveError, setSaveError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ProductionTemplate | null>(null);

  const starterHtmlRef = useRef<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const res = await fetchLocalProducts({ page: 1, limit: 100, activeOnly: 'true' });
      const items = res.items || [];
      setProducts(items);
      if (items.length && !selectedId) {
        setSelectedId(items[0].id);
      }
    } catch (e: any) {
      // 실패를 "0건" 으로 위장하지 않는다 — 목록 상태를 건드리지 않고 오류를 노출한다.
      setListError(e?.message || '내 매장 자체 상품을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  /**
   * WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1:
   *   설명은 목록 응답 row 안에 이미 들어 있다 (신규 단건 조회 API 없음).
   *   목록 raw SQL 은 snake_case, POST/PUT 응답 entity 는 camelCase → 둘 다 수용.
   */
  const readDetailHtml = (p: LocalProduct | null | undefined): string =>
    (p?.detailHtml ?? p?.detail_html ?? '') || '';

  useEffect(() => {
    if (!selectedId) return;
    const row = products.find((p) => p.id === selectedId);
    if (!row) return;
    const saved = readDetailHtml(row);
    const starterHtml = starterHtmlRef.current;
    starterHtmlRef.current = null;
    setContent(saved || starterHtml || '');
    setSaveError(null);
    // products 갱신(저장 직후 row refresh)으로 편집 중 내용이 덮이지 않도록 선택 변경에만 반응한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

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

  /**
   * WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1:
   *   RichTextEditor 는 빈 문서를 `<p></p>` / `<p><br></p>` 로 내보낸다.
   *   그대로 저장하면 detail_html 에 빈 markup 이 쌓이므로 빈 값으로 정규화한다.
   */
  const normalizeEditorHtml = (html: string): string => {
    const stripped = html
      .replace(/<br\s*\/?>/gi, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/<p>\s*<\/p>/gi, '')
      .trim();
    return stripped === '' ? '' : html.trim();
  };

  const handleSave = async () => {
    if (!selectedId) return;
    const trimmed = normalizeEditorHtml(content);
    if (!trimmed) {
      toast.error('내용을 입력하세요');
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      // WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1:
      //   detail_html 만 부분 업데이트한다. description / summary / usage_info /
      //   caution_info 는 전송하지 않으므로 백엔드 부분 업데이트에서 보존된다.
      const saved = await updateLocalProduct(selectedId, { detailHtml: trimmed });
      // PUT 응답은 entity(camelCase) 이므로 updatedAt / updated_at 양쪽을 수용한다.
      const savedAt =
        (saved as unknown as { updatedAt?: string })?.updatedAt ??
        saved?.updated_at ??
        new Date().toISOString();
      // 선택과 작성 내용을 유지한 채 해당 row 만 갱신한다.
      setProducts((prev) =>
        prev.map((p) =>
          p.id === selectedId
            ? { ...p, detailHtml: trimmed, detail_html: trimmed, updated_at: savedAt }
            : p,
        ),
      );
      // K-Cosmetics 사용자-facing 문구: "내 매장"
      toast.success('내 매장 상품 설명이 저장되었습니다');
    } catch (e: any) {
      // 작성 내용을 초기화하지 않는다.
      setSaveError(e?.message || '상품 설명을 저장하지 못했습니다. 작성한 내용은 유지됩니다.');
      toast.error('상품 설명을 저장하지 못했습니다');
    } finally {
      setSaving(false);
    }
  };

  const selectedProduct = products.find((p) => p.id === selectedId) || null;
  const savedHtml = readDetailHtml(selectedProduct);
  const hasExisting = !!savedHtml.trim();

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>
            <span>내 매장</span>
            <span style={{ color: '#9CA3AF' }}>/</span>
            <span style={{ color: '#374151' }}>매장 상품 설명</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
            <h1 style={styles.title}>
              <FileText size={20} style={{ color: '#0EA5E9' }} />
              매장 상품 설명 관리
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
            저장된 매장 상품 상세설명을 조회·재편집합니다.
            신규 생성은 "내 자료함 → 제작 시작 → 매장 상품 설명"에서 진입하세요.
          </p>
        </div>
        <button onClick={fetchProducts} style={styles.refreshBtn} disabled={loading}>
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* WO-O4O-PRODUCT-DESCRIPTION-GUIDE-NOTICE-V1: 공용 상품 DB 정책 안내 */}
      <div
        style={{
          margin: '0 0 16px',
          padding: '12px 16px',
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#334155',
          lineHeight: 1.6,
        }}
      >
        {/* WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1:
            소유 계약 정정 — 이 화면에서 저장하는 설명은 매장 자체 상품에 귀속된다. */}
        이 화면의 상세설명은 <strong>매장 자체 상품에 저장</strong>되며, 해당 매장에서만 조회·수정됩니다.
        O4O 공용 상품 DB(표준 상품)의 대표 설명은 O4O 관리자가 관리하며 이 화면에서 수정되지 않습니다.
        매장 특화 홍보문·이벤트 문구·POP/블로그용 문구가 필요하면 <strong>콘텐츠 만들기</strong>에서 별도 콘텐츠로 제작하세요.
      </div>

      <div style={styles.layout}>
        {/* 상품 목록 */}
        <aside style={styles.sidebar}>
          <h2 style={styles.sidebarTitle}>내 매장 상품 ({products.length})</h2>
          {loading ? (
            <p style={styles.sidebarEmpty}>불러오는 중...</p>
          ) : listError ? (
            /* WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1 §6.5:
               조회 실패는 "0건" 과 구분해 표시하고 재시도를 제공한다. */
            <div style={{ padding: '12px 4px' }}>
              <p style={{ ...styles.sidebarEmpty, color: '#B91C1C' }}>
                내 매장 자체 상품을 불러오지 못했습니다.
              </p>
              <button type="button" onClick={fetchProducts} style={styles.retryBtn}>
                <RefreshCw size={13} />
                다시 시도
              </button>
            </div>
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
                  {hasExisting ? (
                    <span style={styles.metaText}>
                      저장: {new Date(selectedProduct.updated_at).toLocaleString('ko-KR')}
                    </span>
                  ) : (
                    /* §6.5: "저장된 설명 없음" 은 오류가 아니다 — 편집기는 그대로 사용 가능 */
                    <span style={styles.metaTextMuted}>저장된 상세 설명이 없습니다.</span>
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

              {/* §6.5: 저장 실패 — 작성 내용은 유지된 채 명시적으로 노출하고 재시도 가능 */}
              {saveError && (
                <div style={styles.saveErrorBanner}>
                  <span>{saveError}</span>
                </div>
              )}

              {(
                <RichTextEditor
                  key={selectedId ?? 'empty'}
                  value={content}
                  onChange={(c) => setContent(c.html)}
                  placeholder={
                    hasExisting
                      ? '저장된 매장 상품 설명을 수정하세요.'
                      : selectedTemplate
                        ? `${selectedTemplate.name} 템플릿 구조로 작성하세요.`
                        : '신규 생성은 "내 자료함 → 제작 시작 → 매장 상품 설명"에서 시작하세요.'
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
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !content.trim()}
                  style={{ ...styles.saveBtn, opacity: saving || !content.trim() ? 0.7 : 1 }}
                >
                  <Save size={14} />
                  {saving ? '저장 중...' : '저장'}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
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
  editorHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', paddingBottom: '12px', borderBottom: '1px solid #E5E7EB' },
  editorProductName: { fontSize: '15px', fontWeight: 600, color: '#1F2937' },
  editorProductSummary: { fontSize: '12px', color: '#6B7280', marginTop: '4px' },
  typeLabel: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', background: '#F0FDF4', color: '#15803D', borderRadius: '4px', fontSize: '11px', fontWeight: 600 },
  editorMeta: { display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '4px', flexShrink: 0 },
  // WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1 §6.5
  retryBtn: { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '12px', color: '#B91C1C', fontWeight: 500, cursor: 'pointer', marginTop: '4px' },
  saveErrorBanner: { margin: '0 0 12px', padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', color: '#B91C1C', lineHeight: 1.5 },
  metaText: { fontSize: '11px', color: '#9CA3AF' },
  metaTextMuted: { fontSize: '11px', color: '#9CA3AF', fontStyle: 'italic' },
  prefillBanner: { display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '6px' },
  prefillBtn: { padding: '6px 12px', background: '#fff', border: '1px solid #FDE68A', borderRadius: '6px', fontSize: '12px', color: '#92400E', fontWeight: 500, cursor: 'pointer', flexShrink: 0 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  saveBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0EA5E9', border: 'none', borderRadius: '6px', fontSize: '13px', color: '#fff', fontWeight: 500, cursor: 'pointer' },
  sidebarLink: { display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', fontSize: '12px', color: '#2563EB', fontWeight: 500, textDecoration: 'none', marginTop: '4px' },
  libraryLink: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 14px', border: '1px solid #0EA5E9', backgroundColor: '#fff', color: '#0EA5E9', borderRadius: '8px', fontSize: '13px', fontWeight: 500, textDecoration: 'none' },
};
