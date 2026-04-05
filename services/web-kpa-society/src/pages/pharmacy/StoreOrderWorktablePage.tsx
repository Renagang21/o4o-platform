/**
 * StoreOrderWorktablePage — 관심상품 주문 작업대
 *
 * WO-KPA-A-STORE-ORDER-WORKTABLE-WITH-SUPPLIER-SUMMARY-V1
 *
 * 왼쪽: 관심상품 테이블 (DataTable + 수량 입력)
 * 오른쪽: 공급사별 주문 요약 패널
 *
 * 데이터: getCatalog(isListed/isApproved) + getListings() 클라이언트 병합
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { Search, Package, RefreshCw, X, ShoppingCart, AlertCircle } from 'lucide-react';
import { getCatalog, getListings } from '../../api/pharmacyProducts';
import type { CatalogProduct, ProductListing } from '../../api/pharmacyProducts';
import { colors, borderRadius } from '../../styles/theme';

// ── Types ──

interface WorktableProduct {
  id: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  category: string | null;
  basePrice: number | null;
}

interface SupplierSummary {
  supplierId: string;
  supplierName: string;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
}

// ── Helpers ──

function formatPrice(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('ko-KR') + '원';
}

// ── Component ──

export function StoreOrderWorktablePage() {
  const [products, setProducts] = useState<WorktableProduct[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Data loading ──

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, listingsRes] = await Promise.all([
        getCatalog({ limit: 100 }),
        getListings(),
      ]);

      const catalogProducts = catalogRes.data || [];
      const listings = listingsRes.data || [];

      // Filter to "관심상품": listed or approved
      const interestProducts = catalogProducts.filter(
        (p: CatalogProduct) => p.isListed || p.isApproved,
      );

      // Build price map from listings (by product name)
      const priceMap = new Map<string, number>();
      listings.forEach((l: ProductListing) => {
        if (l.retail_price != null) {
          priceMap.set(l.product_name.trim().toLowerCase(), l.retail_price);
        }
      });

      // Merge
      const merged: WorktableProduct[] = interestProducts.map((c: CatalogProduct) => {
        const nameKey = c.name.trim().toLowerCase();
        return {
          id: c.id,
          productName: c.name,
          supplierId: c.supplierId,
          supplierName: c.supplierName,
          category: c.category,
          basePrice: priceMap.get(nameKey) ?? null,
        };
      });

      setProducts(merged);
    } catch {
      setError('데이터를 불러오는 데 실패했습니다. 네트워크를 확인해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Quantity management ──

  const updateQuantity = useCallback((id: string, qty: number) => {
    setQuantities(prev => ({ ...prev, [id]: Math.max(0, qty) }));
  }, []);

  const resetQuantity = useCallback((id: string) => {
    setQuantities(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const resetAllQuantities = useCallback(() => {
    setQuantities({});
  }, []);

  // ── Filters ──

  const uniqueSuppliers = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => map.set(p.supplierId, p.supplierName));
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!p.productName.toLowerCase().includes(q) && !p.supplierName.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (supplierFilter !== 'all' && p.supplierId !== supplierFilter) {
        return false;
      }
      return true;
    });
  }, [products, searchQuery, supplierFilter]);

  // ── Supplier summaries ──

  const supplierSummaries = useMemo<SupplierSummary[]>(() => {
    const map = new Map<string, SupplierSummary>();
    products.forEach(p => {
      const qty = quantities[p.id] || 0;
      if (qty <= 0) return;
      const existing = map.get(p.supplierId);
      if (existing) {
        existing.itemCount++;
        existing.totalQuantity += qty;
        existing.totalAmount += (p.basePrice || 0) * qty;
      } else {
        map.set(p.supplierId, {
          supplierId: p.supplierId,
          supplierName: p.supplierName,
          itemCount: 1,
          totalQuantity: qty,
          totalAmount: (p.basePrice || 0) * qty,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [products, quantities]);

  const totalOrderItems = supplierSummaries.reduce((s, x) => s + x.itemCount, 0);
  const totalOrderQty = supplierSummaries.reduce((s, x) => s + x.totalQuantity, 0);
  const totalOrderAmount = supplierSummaries.reduce((s, x) => s + x.totalAmount, 0);

  // ── Table columns ──

  const columns: Column<WorktableProduct>[] = useMemo(() => [
    {
      key: 'productName',
      title: '상품명',
      sortable: true,
      render: (_v: unknown, row: WorktableProduct) => (
        <span style={{ fontWeight: 500, color: colors.neutral800 }}>{row.productName}</span>
      ),
    },
    {
      key: 'supplierName',
      title: '공급사',
      width: '120px',
      sortable: true,
      render: (_v: unknown, row: WorktableProduct) => (
        <span style={{ fontSize: '13px', color: colors.neutral600 }}>{row.supplierName}</span>
      ),
    },
    {
      key: 'category',
      title: '카테고리',
      width: '100px',
      render: (_v: unknown, row: WorktableProduct) => (
        <span style={{ fontSize: '13px', color: colors.neutral500 }}>{row.category || '—'}</span>
      ),
    },
    {
      key: 'basePrice',
      title: '기준가',
      width: '100px',
      sortable: true,
      align: 'right' as const,
      render: (_v: unknown, row: WorktableProduct) => (
        <span style={{ fontSize: '13px', color: row.basePrice != null ? colors.neutral800 : colors.neutral400 }}>
          {formatPrice(row.basePrice)}
        </span>
      ),
    },
    {
      key: 'qty',
      title: '수량',
      width: '110px',
      align: 'center' as const,
      render: (_v: unknown, row: WorktableProduct) => (
        <input
          type="number"
          min={0}
          value={quantities[row.id] || 0}
          onChange={e => updateQuantity(row.id, parseInt(e.target.value) || 0)}
          style={S.qtyInput}
        />
      ),
    },
    {
      key: 'subtotal',
      title: '소계',
      width: '110px',
      align: 'right' as const,
      render: (_v: unknown, row: WorktableProduct) => {
        const qty = quantities[row.id] || 0;
        if (qty <= 0 || row.basePrice == null) return <span style={{ color: colors.neutral300 }}>—</span>;
        return (
          <span style={{ fontWeight: 600, color: colors.primary, fontSize: '13px' }}>
            {formatPrice(row.basePrice * qty)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: '',
      width: '44px',
      align: 'center' as const,
      render: (_v: unknown, row: WorktableProduct) => {
        const qty = quantities[row.id] || 0;
        if (qty <= 0) return null;
        return (
          <button
            onClick={() => resetQuantity(row.id)}
            style={S.resetBtn}
            title="수량 초기화"
          >
            <X size={14} />
          </button>
        );
      },
    },
  ], [quantities, updateQuantity, resetQuantity]);

  // ── Loading / Error states ──

  if (loading) {
    return (
      <div style={S.container}>
        <div style={S.stateCenter}>
          <RefreshCw size={28} style={{ color: colors.neutral300 }} />
          <p style={{ color: colors.neutral500, fontSize: '14px', marginTop: '12px' }}>상품 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={S.container}>
        <div style={S.stateCenter}>
          <AlertCircle size={32} style={{ color: '#ef4444' }} />
          <p style={{ color: colors.neutral700, fontSize: '14px', marginTop: '12px' }}>{error}</p>
          <button onClick={loadData} style={S.retryBtn}>다시 시도</button>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div style={S.container}>
        <Header />
        <div style={S.stateCenter}>
          <Package size={48} style={{ color: colors.neutral300 }} />
          <p style={{ color: colors.neutral700, fontSize: '15px', fontWeight: 600, marginTop: '16px' }}>
            등록된 관심상품이 없습니다
          </p>
          <p style={{ color: colors.neutral500, fontSize: '13px', marginTop: '4px' }}>
            상품 관리에서 B2B 상품을 신청하고 승인받으면 이 화면에서 주문 수량을 관리할 수 있습니다.
          </p>
          <Link to="/store/commerce/products" style={S.linkBtn}>상품 관리 바로가기 →</Link>
        </div>
      </div>
    );
  }

  // ── Main render ──

  return (
    <div style={S.container}>
      <Header />

      <div style={S.mainGrid}>
        {/* ── Left: Table ── */}
        <div style={S.tableSection}>
          {/* Toolbar */}
          <div style={S.toolbar}>
            <div style={S.searchBox}>
              <Search size={16} style={{ color: colors.neutral400 }} />
              <input
                type="text"
                placeholder="상품명 또는 공급사 검색"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={S.searchInput}
              />
            </div>
            <select
              value={supplierFilter}
              onChange={e => setSupplierFilter(e.target.value)}
              style={S.filterSelect}
            >
              <option value="all">전체 공급사</option>
              {uniqueSuppliers.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            {totalOrderItems > 0 && (
              <button onClick={resetAllQuantities} style={S.clearAllBtn}>
                전체 초기화
              </button>
            )}
          </div>

          {/* Result count */}
          <div style={S.resultBar}>
            <span style={{ fontSize: '13px', color: colors.neutral500 }}>
              {filteredProducts.length}개 상품
              {supplierFilter !== 'all' || searchQuery ? ' (필터 적용됨)' : ''}
            </span>
          </div>

          {/* Table */}
          {filteredProducts.length === 0 ? (
            <div style={S.emptyFilter}>
              <p style={{ color: colors.neutral500, fontSize: '14px' }}>
                검색 결과가 없습니다
              </p>
            </div>
          ) : (
            <DataTable<WorktableProduct>
              columns={columns}
              dataSource={filteredProducts}
              rowKey="id"
              emptyText="상품이 없습니다"
            />
          )}

          {/* Page notice */}
          <div style={S.pageNotice}>
            <span style={{ fontSize: '12px', color: colors.neutral500 }}>
              💡 수량을 입력하면 오른쪽 패널에서 공급사별 주문 요약을 확인할 수 있습니다.
              상품 추가는 <Link to="/store/commerce/products" style={{ color: colors.primary }}>상품 관리</Link>에서 가능합니다.
            </span>
          </div>
        </div>

        {/* ── Right: Supplier Summary Panel ── */}
        <div style={S.summaryPanel}>
          <h3 style={S.panelTitle}>
            <ShoppingCart size={16} />
            공급사별 주문 요약
          </h3>

          {supplierSummaries.length === 0 ? (
            <div style={S.panelEmpty}>
              <p style={{ fontSize: '13px', color: colors.neutral400, textAlign: 'center', margin: 0 }}>
                주문수량을 입력하면<br />공급사별 요약이 표시됩니다
              </p>
            </div>
          ) : (
            <>
              {/* Supplier cards */}
              <div style={S.supplierCards}>
                {supplierSummaries.map(s => (
                  <div key={s.supplierId} style={S.supplierCard}>
                    <div style={S.supplierCardHeader}>
                      <span style={S.supplierCardName}>{s.supplierName}</span>
                      <span style={S.supplierCardBadge}>{s.itemCount}품목</span>
                    </div>
                    <div style={S.supplierCardRow}>
                      <span style={S.supplierCardLabel}>수량</span>
                      <span style={S.supplierCardValue}>{s.totalQuantity.toLocaleString()}개</span>
                    </div>
                    <div style={S.supplierCardRow}>
                      <span style={S.supplierCardLabel}>금액</span>
                      <span style={{ ...S.supplierCardValue, color: colors.primary, fontWeight: 700 }}>
                        {s.totalAmount > 0 ? formatPrice(s.totalAmount) : '가격 미설정'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total summary */}
              <div style={S.totalSummary}>
                <div style={S.totalRow}>
                  <span style={S.totalLabel}>총 품목</span>
                  <span style={S.totalValue}>{totalOrderItems}개</span>
                </div>
                <div style={S.totalRow}>
                  <span style={S.totalLabel}>총 수량</span>
                  <span style={S.totalValue}>{totalOrderQty.toLocaleString()}개</span>
                </div>
                <div style={{ ...S.totalRow, borderTop: `1px solid ${colors.neutral200}`, paddingTop: '10px', marginTop: '6px' }}>
                  <span style={{ ...S.totalLabel, fontWeight: 700, color: colors.neutral800 }}>총 금액</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: colors.primary }}>
                    {totalOrderAmount > 0 ? formatPrice(totalOrderAmount) : '—'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Header sub-component ──

function Header() {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <Link to="/store" style={{ color: colors.neutral400, fontSize: '13px', textDecoration: 'none' }}>
          ← 내 매장
        </Link>
      </div>
      <h1 style={{ fontSize: '20px', fontWeight: 700, color: colors.neutral800, margin: 0 }}>
        주문 작업대
      </h1>
      <p style={{ fontSize: '13px', color: colors.neutral500, marginTop: '4px' }}>
        매장 관심상품의 B2B 주문 수량을 입력합니다
      </p>
    </div>
  );
}

// ── Styles ──

const S: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
  },
  stateCenter: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
  },
  retryBtn: {
    marginTop: '16px',
    padding: '8px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
  linkBtn: {
    marginTop: '16px',
    fontSize: '14px',
    color: colors.primary,
    textDecoration: 'none',
    fontWeight: 500,
  },

  // Main grid
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '24px',
    marginTop: '20px',
    alignItems: 'start',
  },

  // Table section
  tableSection: {
    minWidth: 0,
  },
  toolbar: {
    display: 'flex',
    gap: '10px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: '200px',
    padding: '8px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md,
    backgroundColor: '#fff',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    width: '100%',
    color: colors.neutral800,
    backgroundColor: 'transparent',
  },
  filterSelect: {
    padding: '8px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md,
    fontSize: '14px',
    color: colors.neutral700,
    backgroundColor: '#fff',
    cursor: 'pointer',
    minWidth: '140px',
  },
  clearAllBtn: {
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  resultBar: {
    marginBottom: '8px',
    padding: '0 2px',
  },
  emptyFilter: {
    textAlign: 'center',
    padding: '40px 20px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    backgroundColor: '#fff',
  },
  pageNotice: {
    marginTop: '12px',
    padding: '12px 16px',
    backgroundColor: '#fffbeb',
    border: '1px solid #fef3c7',
    borderRadius: borderRadius.md,
  },

  // Quantity input
  qtyInput: {
    width: '70px',
    padding: '4px 8px',
    fontSize: '14px',
    textAlign: 'center',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
    outline: 'none',
    color: colors.neutral800,
    backgroundColor: '#fff',
  },
  resetBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '50%',
    backgroundColor: colors.neutral100,
    color: colors.neutral500,
    cursor: 'pointer',
    padding: 0,
  },

  // Summary panel
  summaryPanel: {
    position: 'sticky',
    top: '80px',
    padding: '20px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    backgroundColor: '#fff',
  },
  panelTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 16px 0',
  },
  panelEmpty: {
    padding: '40px 16px',
  },
  supplierCards: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  supplierCard: {
    padding: '14px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md,
    backgroundColor: colors.neutral50,
  },
  supplierCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  supplierCardName: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
  },
  supplierCardBadge: {
    fontSize: '11px',
    fontWeight: 500,
    color: colors.primary,
    backgroundColor: '#dbeafe',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  supplierCardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
  },
  supplierCardLabel: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  supplierCardValue: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral800,
  },

  // Total summary
  totalSummary: {
    marginTop: '16px',
    padding: '14px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md,
    backgroundColor: '#f0fdf4',
  },
  totalRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
  },
  totalLabel: {
    fontSize: '13px',
    color: colors.neutral600,
  },
  totalValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
  },
};
