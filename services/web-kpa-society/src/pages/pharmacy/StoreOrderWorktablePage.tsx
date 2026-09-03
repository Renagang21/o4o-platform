/**
 * StoreOrderWorktablePage — 관심상품 주문 작업대
 *
 * WO-KPA-A-STORE-ORDER-WORKTABLE-WITH-SUPPLIER-SUMMARY-V1
 * WO-STORE-B2B-ORDER-EXECUTION-FLOW-V1: 주문 생성 기능 추가
 * WO-O4O-STORE-AND-PLATFORM-CONSUMER-COMMERCE-LEGACY-RETIREMENT-V1:
 *   주문 실행 leg 제거. 이 작업대의 `주문하기` 는 `POST /kpa/checkout` 을 호출했는데,
 *   그 엔드포인트는 `organization_channels.channel_type='B2C'` **승인된 자체 소비자 판매 채널**을
 *   게이트로 요구하는 소비자→매장 commerce producer 였다
 *   (`O4O-STORE-COMMERCE-BOUNDARY-V1` §2-1 · §2-2 · §3 위반 → 410 은퇴).
 *   B2B 발주 의도 자체는 보호 대상이므로 화면은 유지하되, 실행은 canonical B2B 장바구니
 *   (`/store-hub/cart`, `store_cart` + `EventOfferCartCheckoutService`) 로 안내한다.
 *
 * WO-O4O-KPA-INTEREST-PRODUCT-WORKTABLE-TO-CANONICAL-CART-ADOPTION-V1:
 *   위 "후속 과제"를 종결한다. 작업대가 canonical B2B 장바구니 **producer** 가 된다.
 *     관심상품(catalog.isAdded) → canonical supplier offer → store_cart_items(sourceType='b2b')
 *     → service-agnostic B2B checkout confirm → checkout_orders → buyer order ledger
 *
 *   · 관심상품 ≠ 주문상품. 주문 가능 판정의 권위는 서버 `GET /pharmacy/products/orderable`
 *     이며(offer 활성 · 공급자 ACTIVE · offer_service_approvals 승인 · 축 분리 포함),
 *     이 화면은 그 결과를 offerId 동등 비교로 표시만 한다. 이름/SKU 매칭 0.
 *   · 이벤트오퍼 축은 합치지 않는다 — 장바구니에 event_offer 항목이 있으면 담기를 차단한다
 *     (확정 endpoint 가 축별로 다르다: checkout-confirm vs checkout-confirm-b2b).
 *   · 표시 금액은 스냅샷이다. 확정 금액은 서버가 offer_service_prices[kpa-society] →
 *     price_general 순으로 재확정한다.
 *   · getListings() 상품명 문자열 병합 제거 — master_id/offer_id 리팩토링 이후 동작하지 않는
 *     dead code 였고, 주문 경로에 이름 매칭을 남겨둘 수 없다.
 *
 * 왼쪽: 관심상품 테이블 (DataTable + 주문 가능 상태 + 수량 입력)
 * 오른쪽: 공급사별 주문 요약 패널 + 장바구니 담기
 *
 * 데이터: getCatalog(isAdded) = 관심상품 · getOrderable() = 주문 가능 권위
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { Search, Package, RefreshCw, X, ShoppingCart, AlertCircle, Loader2 } from 'lucide-react';
import { getCatalog, getOrderable } from '../../api/pharmacyProducts';
import type { CatalogProduct, OrderableProduct } from '../../api/pharmacyProducts';
import { storeCartApi } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { colors, borderRadius } from '../../styles/theme';
import { CART_SERVICE_KEY } from '../../utils/eventOfferCart';
import {
  ORDERABILITY_HINT,
  ORDERABILITY_LABEL,
  buildOrderableIndex,
  buildWorktableCartPayload,
  resolveOrderability,
} from '../../utils/worktableCart';
import type { WorktableOrderability } from '../../utils/worktableCart';

// ── Types ──

interface WorktableProduct {
  /** supplier_product_offers.id — catalog SSOT 가 반환한 canonical offer id */
  id: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  category: string | null;
  basePrice: number | null;
  /** 서버 주문가능 목록 기준 판정 (관심상품이라는 사실만으로 주문 가능이 아니다) */
  orderability: WorktableOrderability;
}

interface SupplierSummary {
  supplierId: string;
  supplierName: string;
  itemCount: number;
  totalQuantity: number;
  totalAmount: number;
}

// ── Helpers ──

/**
 * 주문 가능 목록 전량 조회.
 *
 * `/orderable` 은 page 당 최대 100건이다. 한 페이지만 읽으면 그 뒤의 주문 가능 상품이
 * 조용히 "주문 불가"로 표시된다 — 판정을 낮추는 게 아니라 사실을 잘못 말하는 결함이므로
 * 페이지를 끝까지 읽는다. 방어적 상한(20 페이지 = 2,000건)을 넘으면 더 읽지 않는다.
 */
const ORDERABLE_PAGE_SIZE = 100;
const ORDERABLE_MAX_PAGES = 20;

async function fetchAllOrderable(): Promise<OrderableProduct[]> {
  const rows: OrderableProduct[] = [];
  let page = 1;
  for (; page <= ORDERABLE_MAX_PAGES; page++) {
    const res = await getOrderable({ source: 'all', page, limit: ORDERABLE_PAGE_SIZE });
    const batch = res.data || [];
    rows.push(...batch);
    const totalPages = res.pagination?.totalPages ?? 1;
    if (batch.length === 0 || page >= totalPages) break;
  }
  return rows;
}

function formatPrice(v: number | null): string {
  if (v == null) return '—';
  return v.toLocaleString('ko-KR') + '원';
}

// ── Component ──

export function StoreOrderWorktablePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const organizationId = user?.kpaMembership?.organizationId;

  const [products, setProducts] = useState<WorktableProduct[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Order creation state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // ── Data loading ──

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 관심상품 목록(catalog.isAdded) 과 주문 가능 권위(orderable) 를 각각 서버에서 받는다.
      // 둘의 대응은 offerId 동등 비교로만 한다 — 이름/SKU 매칭 없음.
      const [catalogRes, orderableRows] = await Promise.all([
        getCatalog({ limit: 100 }),
        fetchAllOrderable(),
      ]);

      const catalogProducts = catalogRes.data || [];
      const orderableIndex = buildOrderableIndex(orderableRows);

      // Filter to "관심상품": 내 매장에 추가된 상품
      const interestProducts = catalogProducts.filter(
        (p: CatalogProduct) => p.isAdded,
      );

      const merged: WorktableProduct[] = interestProducts.map((c: CatalogProduct) => ({
        id: c.id,
        productName: c.name,
        supplierId: c.supplierId,
        supplierName: c.supplierName,
        category: c.category,
        // WO-O4O-STORE-HUB-PRODUCTION-E2E-DATA-ENROLLMENT-AND-CLOSURE-V1:
        //   작업대는 B2B 발주 화면이므로 공급가를 표시한다.
        //   WO-...-CANONICAL-CART-ADOPTION-V1: 확정 금액은 서버가
        //   offer_service_prices[kpa-society] → price_general 로 재확정한다(표시용 스냅샷).
        basePrice: c.priceGold ?? c.priceGeneral ?? null,
        orderability: resolveOrderability(c.id, orderableIndex),
      }));

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

  // ── Pre-fill from B2B catalog (sessionStorage) ──
  // WO-STORE-B2B-CATALOG-TO-WORKTABLE-FLOW-V1

  useEffect(() => {
    if (products.length === 0) return;
    const raw = sessionStorage.getItem('worktable_preselect');
    if (!raw) return;
    try {
      const preselect: Record<string, number> = JSON.parse(raw);
      sessionStorage.removeItem('worktable_preselect');
      setQuantities(prev => {
        const next = { ...prev };
        for (const [productId, qty] of Object.entries(preselect)) {
          // 주문 가능(서버 판정)한 관심상품만 수량을 받는다.
          if (qty > 0 && products.some(p => p.id === productId && p.orderability === 'ORDERABLE')) {
            next[productId] = (next[productId] || 0) + qty;
          }
        }
        return next;
      });
      const addedCount = Object.entries(preselect).filter(
        ([pid, q]) => q > 0 && products.some(p => p.id === pid && p.orderability === 'ORDERABLE'),
      ).length;
      if (addedCount > 0) {
        toast.success(`카탈로그에서 선택한 ${addedCount}건의 상품이 작업대에 추가되었습니다.`);
      }
    } catch { /* ignore parse errors */ }
  }, [products]);

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
      // 주문 불가 항목은 요약·담기 대상에서 제외한다(서버 판정 기준).
      if (p.orderability !== 'ORDERABLE') return;
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

  // ── canonical B2B 장바구니 담기 ──
  //
  // WO-O4O-KPA-INTEREST-PRODUCT-WORKTABLE-TO-CANONICAL-CART-ADOPTION-V1
  //   담기 = `POST /store/cart/kpa-society/items` (sourceType='b2b'). 주문이 아니다.
  //   organizationId 는 보내지 않는다 — 매장 확정 권위는 서버(B2B confirm Core)다.
  const addSelectionToCart = useCallback(async () => {
    if (adding) return;
    const targets = products
      .filter(p => p.orderability === 'ORDERABLE' && (quantities[p.id] || 0) > 0)
      .map(p => ({ product: p, quantity: quantities[p.id] }));
    if (targets.length === 0) return;

    setAdding(true);
    setOrderError(null);
    try {
      // 축 혼합 차단 — 이벤트오퍼 항목과 B2B 항목은 확정 endpoint 가 다르다.
      // 섞인 장바구니를 한 번에 확정하지 않는다(§15). 기존 이벤트 흐름은 그대로 둔다.
      const current = await storeCartApi.list(CART_SERVICE_KEY);
      const hasEventOffer = (current.data?.items || []).some(i => i.sourceType === 'event_offer');
      if (hasEventOffer) {
        setOrderError(
          '장바구니에 이벤트 상품이 담겨 있습니다. 이벤트 주문을 먼저 완료하거나 비운 뒤에 B2B 발주를 담아주세요.',
        );
        return;
      }

      const failed: string[] = [];
      let ok = 0;
      for (const t of targets) {
        try {
          await storeCartApi.addItem(CART_SERVICE_KEY, buildWorktableCartPayload(t.product, t.quantity));
          ok++;
        } catch (e) {
          failed.push(`${t.product.productName}: ${(e as { message?: string })?.message || '담기 실패'}`);
        }
      }

      if (ok > 0) {
        toast.success(`${ok}건을 장바구니에 담았습니다.`);
        // 담긴 항목의 수량은 비운다 — 중복 담기 방지.
        setQuantities(prev => {
          const next = { ...prev };
          targets.forEach(t => { if (!failed.some(f => f.startsWith(`${t.product.productName}:`))) delete next[t.product.id]; });
          return next;
        });
      }
      if (failed.length > 0) {
        setOrderError(failed.join(' / '));
      } else {
        setShowConfirmModal(false);
        navigate('/store-hub/cart');
      }
    } catch (e) {
      setOrderError((e as { message?: string })?.message || '장바구니 조회에 실패했습니다.');
    } finally {
      setAdding(false);
    }
  }, [adding, products, quantities, navigate]);

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
      // 관심상품 ≠ 주문상품 — 서버(orderable)가 판정한 상태를 그대로 표시한다.
      key: 'orderability',
      title: '상태',
      width: '96px',
      align: 'center' as const,
      render: (_v: unknown, row: WorktableProduct) => {
        const ok = row.orderability === 'ORDERABLE';
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '12px',
              whiteSpace: 'nowrap',
              color: ok ? '#047857' : colors.neutral500,
              backgroundColor: ok ? '#ecfdf5' : colors.neutral100,
            }}
            title={ORDERABILITY_HINT[row.orderability]}
          >
            {ORDERABILITY_LABEL[row.orderability]}
          </span>
        );
      },
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
      render: (_v: unknown, row: WorktableProduct) => {
        const orderable = row.orderability === 'ORDERABLE';
        return (
          <input
            type="number"
            min={0}
            value={quantities[row.id] || 0}
            disabled={!orderable}
            title={orderable ? undefined : ORDERABILITY_HINT[row.orderability]}
            onChange={e => updateQuantity(row.id, parseInt(e.target.value) || 0)}
            style={
              orderable
                ? S.qtyInput
                : { ...S.qtyInput, backgroundColor: colors.neutral100, color: colors.neutral400, cursor: 'not-allowed' }
            }
          />
        );
      },
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
            내 매장에 추가된 상품이 없습니다
          </p>
          <p style={{ color: colors.neutral500, fontSize: '13px', marginTop: '4px' }}>
            B2B 카탈로그에서 상품을 내 매장에 추가하면 이 화면에서 주문 수량을 관리할 수 있습니다.
          </p>
          <Link to="/store-hub/b2b" style={S.linkBtn}>B2B 카탈로그 →</Link>
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

              {/* Order button */}
              <button
                onClick={() => {
                  setOrderError(null);
                  setShowConfirmModal(true);
                }}
                style={S.orderButton}
                disabled={!organizationId}
              >
                <ShoppingCart size={16} />
                주문 내역 확인 ({supplierSummaries.length}건)
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Confirm Order Modal ── */}
      {showConfirmModal && (
        <div style={S.modalOverlay} onClick={() => setShowConfirmModal(false)}>
          <div style={S.modalContent} onClick={e => e.stopPropagation()}>
            <>
                <h3 style={S.modalTitle}>B2B 주문 요약</h3>
                <p style={{ fontSize: '13px', color: colors.neutral600, margin: '0 0 16px' }}>
                  공급사별 {supplierSummaries.length}건의 발주 예정 내역입니다.
                  담기를 누르면 <strong>매장 허브 &gt; 내 장바구니</strong>에 B2B 발주 항목으로 담기며,
                  실제 주문 확정은 장바구니에서 진행합니다.
                </p>

                {supplierSummaries.map(s => {
                  const supplierProducts = products.filter(
                    p => p.supplierId === s.supplierId && (quantities[p.id] || 0) > 0,
                  );
                  return (
                    <div key={s.supplierId} style={S.confirmCard}>
                      <div style={S.confirmCardHeader}>
                        <span style={{ fontWeight: 600 }}>{s.supplierName}</span>
                        <span style={{ color: colors.primary, fontWeight: 600 }}>
                          {formatPrice(s.totalAmount)}
                        </span>
                      </div>
                      {supplierProducts.map(p => (
                        <div key={p.id} style={S.confirmProductRow}>
                          <span style={{ fontSize: '12px', color: colors.neutral600, flex: 1 }}>
                            {p.productName}
                          </span>
                          <span style={{ fontSize: '12px', color: colors.neutral500 }}>
                            {quantities[p.id]}개
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 500, width: '80px', textAlign: 'right' }}>
                            {formatPrice((p.basePrice || 0) * (quantities[p.id] || 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}

                <div style={S.confirmTotal}>
                  <span>총 주문 금액</span>
                  <span style={{ fontSize: '18px', fontWeight: 700, color: colors.primary }}>
                    {formatPrice(totalOrderAmount)}
                  </span>
                </div>

                <p style={{ fontSize: '11px', color: colors.neutral400, margin: '8px 0 0', textAlign: 'center' }}>
                  표시 금액은 참고용입니다 — 확정 금액은 주문 시 서버가 공급가 기준으로 재산정합니다
                </p>

                {orderError && (
                  <p style={{ color: '#ef4444', fontSize: '13px', margin: '12px 0 0' }}>{orderError}</p>
                )}

                <div style={S.modalActions}>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    style={S.modalSecondaryBtn}
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => { setShowConfirmModal(false); navigate('/store-hub/cart'); }}
                    style={S.modalSecondaryBtn}
                  >
                    장바구니 보기
                  </button>
                  <button
                    onClick={addSelectionToCart}
                    disabled={adding || totalOrderItems === 0}
                    style={{
                      ...S.modalPrimaryBtn,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: adding || totalOrderItems === 0 ? 0.6 : 1,
                      cursor: adding || totalOrderItems === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {adding && <Loader2 size={14} className="animate-spin" />}
                    {adding ? '담는 중...' : `장바구니에 담기 (${totalOrderItems}품목)`}
                  </button>
                </div>
              </>
          </div>
        </div>
      )}
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

  // Order button
  orderButton: {
    marginTop: '12px',
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },

  // Modal
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: borderRadius.lg,
    padding: '24px',
    maxWidth: '520px',
    width: '90%',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: '0 0 16px',
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    marginTop: '20px',
  },
  modalPrimaryBtn: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
  modalSecondaryBtn: {
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral600,
    backgroundColor: colors.neutral100,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md,
    cursor: 'pointer',
  },
  confirmCard: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md,
    padding: '12px',
    marginBottom: '10px',
  },
  confirmCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    paddingBottom: '8px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  confirmProductRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    padding: '2px 0',
  },
  confirmTotal: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px',
    backgroundColor: '#f0fdf4',
    borderRadius: borderRadius.md,
    marginTop: '12px',
    fontWeight: 600,
  },
};
