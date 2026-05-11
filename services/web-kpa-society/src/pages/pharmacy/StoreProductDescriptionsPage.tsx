/**
 * StoreProductDescriptionsPage — 매장 실행 / 상품 상세설명 (결과물 관리 전용)
 *
 * WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS-CANONICAL-ALIGN-V1
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1:
 *   "신규 제작 시작" 진입 제거 — 신규 생성은 "내 자료함 → 제작 시작 → 상품 상세설명"에서만.
 *   본 페이지는 보유 상품의 기존 product_description 결과물 조회/재편집/저장/삭제(빈값 저장).
 *
 * Backend: ProductAiContent (contentType='product_description') — 기존 active entity/API 재사용.
 *
 * 진입 시 location.state.production.source.items 가 있으면 첫 항목을 기반으로
 * 상품 선택 + 자료 description prefill 처리.
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Sparkles, Save, RefreshCw, FileText, Package, FolderOpen } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  fetchLocalProducts,
  type LocalProduct,
} from '../../api/localProducts';
import {
  getProductAiContents,
  saveProductAiContent,
  generateProductAiContent,
} from '../../api/productAiContent';
import { colors } from '../../styles/theme';

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
      setContent(desc?.content || '');
      setModel(desc?.model || null);
      setUpdatedAt(desc?.updatedAt || null);
    } catch {
      setContent('');
      setModel(null);
      setUpdatedAt(null);
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedId) fetchContent(selectedId);
  }, [selectedId, fetchContent]);

  // WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1:
  //   내 자료함에서 진입 시 source 항목 description을 prefill 후보로 보관.
  //   사용자가 "자료 내용으로 채우기" 클릭 시 textarea에 적용.
  useEffect(() => {
    const state = location.state as
      | {
          production?: {
            source?: { items?: Array<{ id: string; title: string; description?: string | null; origin?: string }> };
          };
        }
      | null;
    const first = state?.production?.source?.items?.[0];
    if (first?.description?.trim()) {
      setPrefillNote(first.description.trim());
    }
    if (state) window.history.replaceState({}, document.title);
  }, [location.state]);

  const handleApplyPrefill = () => {
    if (!prefillNote) return;
    setContent(prefillNote);
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
          <h1 style={styles.title}>
            <FileText size={20} style={{ color: colors.primary }} />
            상품 상세설명 관리
          </h1>
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

              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={contentLoading}
                style={styles.textarea}
                placeholder={
                  contentLoading
                    ? '불러오는 중...'
                    : hasExisting
                      ? '저장된 상품 상세설명을 수정하세요.'
                      : '저장된 결과물이 없습니다. 신규 생성은 "내 자료함 → 제작 시작 → 상품 상세설명"에서 시작하세요.'
                }
              />

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
  editorMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
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
  textarea: {
    width: '100%',
    minHeight: '320px',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    lineHeight: 1.6,
    color: colors.neutral800,
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    boxSizing: 'border-box',
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
