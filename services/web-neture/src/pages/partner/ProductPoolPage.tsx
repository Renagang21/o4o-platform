/**
 * ProductPoolPage - 파트너 제품 풀
 *
 * Work Order: WO-O4O-PARTNER-HUB-CORE-V1
 * Refined: WO-O4O-PARTNER-HUB-REFINEMENT-V1
 * UX: WO-O4O-PARTNER-PRODUCTS-UX-IMPROVEMENT-V1
 *
 * 커미션 정책이 설정된 제품 목록.
 * 파트너가 홍보할 제품을 선택하고 Referral 링크를 생성.
 * 기존 링크가 있으면 바로 Copy/Open 가능.
 *
 * Filters: Supplier / Commission amount
 * Sort: Commission DESC / Latest commission
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Link2, Search, SlidersHorizontal, Copy, ExternalLink, Check } from 'lucide-react';
import { partnerAffiliateApi } from '../../lib/api/index.js';
import type { PoolProduct, ReferralLink } from '../../lib/api/index.js';

type SortOption = 'commission_desc' | 'latest';

export default function ProductPoolPage() {
  const [products, setProducts] = useState<PoolProduct[]>([]);
  const [existingLinks, setExistingLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('latest');

  useEffect(() => {
    (async () => {
      const [poolData, linksData] = await Promise.all([
        partnerAffiliateApi.getProductPool(),
        partnerAffiliateApi.getReferralLinks(),
      ]);
      setProducts(poolData);
      setExistingLinks(linksData);
      setLoading(false);
    })();
  }, []);

  // Map product_id → existing ReferralLink
  const linkMap = useMemo(() => {
    const map = new Map<string, ReferralLink>();
    for (const link of existingLinks) {
      map.set(link.product_id, link);
    }
    return map;
  }, [existingLinks]);

  const suppliers = useMemo(() => {
    const names = [...new Set(products.map((p) => p.supplier_name))];
    return names.sort();
  }, [products]);

  const filtered = useMemo(() => {
    let result = [...products];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (p) => p.product_name.toLowerCase().includes(q) || p.supplier_name.toLowerCase().includes(q),
      );
    }

    if (selectedSupplier) {
      result = result.filter((p) => p.supplier_name === selectedSupplier);
    }

    if (sortBy === 'commission_desc') {
      result.sort((a, b) => b.commission_per_unit - a.commission_per_unit);
    } else {
      result.sort((a, b) => (b.commission_start_date || '').localeCompare(a.commission_start_date || ''));
    }

    return result;
  }, [products, searchTerm, selectedSupplier, sortBy]);

  const handleCreateLink = useCallback(async (product: PoolProduct) => {
    setGenerating(product.product_id);
    const result = await partnerAffiliateApi.createReferralLink(product.product_id);
    setGenerating(null);

    if (result) {
      // Refresh links to include newly created one
      const updated = await partnerAffiliateApi.getReferralLinks();
      setExistingLinks(updated);
    }
  }, []);

  const handleCopy = useCallback(async (referralUrl: string, productId: string) => {
    try {
      const fullUrl = `${window.location.origin}${referralUrl}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(productId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  }, []);

  const handleOpen = useCallback((referralUrl: string) => {
    window.open(referralUrl, '_blank');
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Products</h1>
        <p style={styles.subtitle}>커미션이 설정된 제품을 홍보하고 수익을 얻으세요</p>
      </div>

      {/* Toolbar */}
      {!loading && products.length > 0 && (
        <div style={styles.toolbar}>
          <div style={styles.searchWrap}>
            <Search size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="제품명, 공급자 검색..."
              style={styles.searchInput}
            />
          </div>

          <div style={styles.filterWrap}>
            <SlidersHorizontal size={14} style={{ color: '#64748b' }} />
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              style={styles.select}
            >
              <option value="">전체 공급자</option>
              {suppliers.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            style={styles.select}
          >
            <option value="latest">최신 커미션순</option>
            <option value="commission_desc">커미션 높은순</option>
          </select>
        </div>
      )}

      {loading ? (
        <p style={styles.emptyText}>불러오는 중...</p>
      ) : products.length === 0 ? (
        <div style={styles.emptyState}>
          <Package size={40} style={{ color: '#94a3b8' }} />
          <p style={styles.emptyText}>현재 홍보 가능한 제품이 없습니다.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={styles.emptyState}>
          <Search size={40} style={{ color: '#94a3b8' }} />
          <p style={styles.emptyText}>검색 조건에 맞는 제품이 없습니다.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((p) => {
            const existing = linkMap.get(p.product_id);
            const isCopied = copiedId === p.product_id;
            const isGenerating = generating === p.product_id;

            return (
              <div key={p.product_id} style={styles.card}>
                {p.image_url ? (
                  <img src={p.image_url} alt={p.product_name} style={styles.cardImage} />
                ) : (
                  <div style={styles.cardImagePlaceholder}>
                    <Package size={32} style={{ color: '#94a3b8' }} />
                  </div>
                )}
                <div style={styles.cardBody}>
                  <p style={styles.cardSupplier}>{p.supplier_name}</p>
                  <h3 style={styles.cardName}>{p.product_name}</h3>
                  <p style={styles.cardPrice}>₩{p.price_general.toLocaleString()}</p>
                  <div style={styles.commissionBadge}>
                    커미션 ₩{p.commission_per_unit.toLocaleString()} / 개
                  </div>

                  {existing ? (
                    /* Link exists — show Copy / Open */
                    <div style={styles.linkActions}>
                      <button
                        onClick={() => handleCopy(existing.referral_url, p.product_id)}
                        style={{
                          ...styles.actionBtn,
                          ...(isCopied ? styles.actionBtnCopied : {}),
                        }}
                      >
                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                        {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                      <button
                        onClick={() => handleOpen(existing.referral_url)}
                        style={styles.actionBtn}
                      >
                        <ExternalLink size={14} />
                        Open
                      </button>
                    </div>
                  ) : (
                    /* No link — show Create */
                    <button
                      onClick={() => handleCreateLink(p)}
                      disabled={isGenerating}
                      style={styles.linkBtn}
                    >
                      {isGenerating ? (
                        '생성 중...'
                      ) : (
                        <><Link2 size={14} /> Create Link</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '32px 20px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  toolbar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
  },
  searchWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: '200px',
    padding: '10px 14px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    color: '#1e293b',
    width: '100%',
    backgroundColor: 'transparent',
  },
  filterWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  select: {
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '14px',
    color: '#475569',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: '20px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '180px',
    objectFit: 'cover' as const,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: '180px',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: '16px',
  },
  cardSupplier: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0 0 4px 0',
  },
  cardName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 8px 0',
    lineHeight: 1.3,
  },
  cardPrice: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  commissionBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '6px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  linkBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #2563eb',
    backgroundColor: '#fff',
    color: '#2563eb',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  linkActions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#475569',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionBtnCopied: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
    color: '#059669',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  },
  emptyText: {
    color: '#64748b',
    fontSize: '14px',
    margin: 0,
  },
};
