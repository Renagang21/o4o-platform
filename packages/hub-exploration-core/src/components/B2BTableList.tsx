/**
 * B2BTableList — 운영용 B2B 테이블 컴포넌트
 *
 * WO-O4O-B2B-OPERATION-TABLE-STRUCTURE-V1
 * WO-O4O-B2B-OPERATION-REFINEMENT-V1
 * WO-O4O-B2B-CONVERSION-SIGNAL-ENHANCEMENT-V1
 *
 * 카테고리 탭, 정렬, 페이지네이션 내장.
 * 데스크톱: 테이블, 모바일: 카드 요약.
 *
 * Conversion signals:
 * - 공급가 primary 컬러 강조 + 할인율 표시
 * - status 시각화 (available/pending/soldout + limited 자동)
 * - stockRemaining ≤10 → "잔여 N개" 강조
 * - supplierVerified → 체크 아이콘
 * - 모바일: 공급가 대형 + 판매 신청 풀폭
 */

import { useState, useMemo } from 'react';
import type { B2BTableListProps, B2BTableItem, B2BTableSortKey } from '../types.js';
import { NEUTRALS } from '../theme.js';
import { injectExplorationStyles } from '../utils/style-inject.js';

const PRIMARY = '#2563EB';
const EMERALD = '#059669';
const AMBER = '#D97706';
const RED = '#DC2626';

function formatDate(iso?: string): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleDateString('ko-KR');
  } catch {
    return '-';
  }
}

function formatPrice(n?: number): string {
  if (n == null) return '-';
  return n.toLocaleString('ko-KR') + '원';
}

/** 재고 부족 여부 */
function isLimited(item: B2BTableItem): boolean {
  return item.stockRemaining != null && item.stockRemaining <= 10 && item.stockRemaining > 0;
}

/** soldout 여부 */
function isSoldout(item: B2BTableItem): boolean {
  return item.status === 'soldout' || (item.stockRemaining != null && item.stockRemaining <= 0);
}

export function B2BTableList({
  items,
  categories,
  activeCategory,
  onCategoryChange,
  sortKey: externalSortKey,
  sortOrder: externalSortOrder,
  onSortChange,
  pageSize = 10,
  title,
  emptyMessage,
}: B2BTableListProps) {
  injectExplorationStyles();

  const [page, setPage] = useState(0);
  const [internalSortKey, setInternalSortKey] = useState<B2BTableSortKey>('createdAt');
  const [internalSortOrder, setInternalSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortKey = externalSortKey ?? internalSortKey;
  const sortOrder = externalSortOrder ?? internalSortOrder;

  const sorted = useMemo(() => {
    const list = [...items];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = (a.name || '').localeCompare(b.name || '', 'ko');
      } else if (sortKey === 'supplierName') {
        cmp = (a.supplierName || '').localeCompare(b.supplierName || '', 'ko');
      } else if (sortKey === 'createdAt') {
        cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [items, sortKey, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function handleSort(key: B2BTableSortKey) {
    if (onSortChange) {
      onSortChange(key);
    } else {
      if (internalSortKey === key) {
        setInternalSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
        setInternalSortKey(key);
        setInternalSortOrder('asc');
      }
    }
    setPage(0);
  }

  function sortIcon(key: B2BTableSortKey): string {
    if (sortKey !== key) return ' ↕';
    return sortOrder === 'asc' ? ' ▲' : ' ▼';
  }

  function handleCategoryChange(cat: string) {
    onCategoryChange?.(cat);
    setPage(0);
  }

  const sortLabels: Record<B2BTableSortKey, string> = {
    name: '상품명',
    supplierName: '공급처',
    createdAt: '등록일',
  };

  function getPageNumbers(): number[] {
    const maxVisible = 5;
    const pages: number[] = [];
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible);
    start = Math.max(0, end - maxVisible);
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    return pages;
  }

  /** Row opacity for soldout items */
  function rowStyle(item: B2BTableItem): React.CSSProperties {
    if (isSoldout(item)) {
      return { ...S.tr, opacity: 0.5 };
    }
    return S.tr;
  }

  return (
    <div style={S.container}>
      {title && <h2 style={S.title}>{title}</h2>}

      {/* Category Tabs */}
      {categories && categories.length > 0 && (
        <div style={S.tabs}>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              style={activeCategory === cat ? { ...S.tab, ...S.tabActive } : S.tab}
              onClick={() => handleCategoryChange(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Operation Info Bar */}
      <div style={S.infoBar}>
        <span style={S.infoCount}>
          총 <strong style={{ color: NEUTRALS[900] }}>{items.length}</strong>개 상품
        </span>
        <div style={S.infoRight}>
          {activeCategory && activeCategory !== '전체' && (
            <span style={S.infoBadge}>{activeCategory}</span>
          )}
          <span style={S.infoSort}>
            {sortLabels[sortKey]} {sortOrder === 'asc' ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {items.length === 0 ? (
        <div style={S.empty}>
          {emptyMessage || '등록된 B2B 상품이 없습니다.'}
        </div>
      ) : (
        <>
          {/* ─── Desktop Table ─── */}
          <div className="b2b-table-desktop" style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th
                    style={sortKey === 'name' ? { ...S.th, ...S.thSortable, ...S.thActive } : { ...S.th, ...S.thSortable }}
                    onClick={() => handleSort('name')}
                  >
                    상품명{sortIcon('name')}
                  </th>
                  <th style={S.th}>단위</th>
                  <th style={S.th}>단가</th>
                  <th style={{ ...S.th, color: PRIMARY, fontWeight: 700 }}>공급가</th>
                  <th
                    style={sortKey === 'supplierName' ? { ...S.th, ...S.thSortable, ...S.thActive } : { ...S.th, ...S.thSortable }}
                    onClick={() => handleSort('supplierName')}
                  >
                    공급처{sortIcon('supplierName')}
                  </th>
                  <th style={S.th}>법적분류</th>
                  <th
                    style={sortKey === 'createdAt' ? { ...S.th, ...S.thSortable, ...S.thActive } : { ...S.th, ...S.thSortable }}
                    onClick={() => handleSort('createdAt')}
                  >
                    등록일{sortIcon('createdAt')}
                  </th>
                  <th style={{ ...S.th, textAlign: 'center' as const, minWidth: '140px' }}>액션</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(item => (
                  <tr
                    key={item.id}
                    className="b2b-table-row"
                    style={rowStyle(item)}
                  >
                    {/* 상품명 + 보조 정보 */}
                    <td style={{ ...S.td, maxWidth: '260px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 500, color: NEUTRALS[800] }}>{item.name}</span>
                        {renderStatusPill(item)}
                      </div>
                      {item.description && (
                        <div style={S.tdDesc}>{item.description}</div>
                      )}
                      {renderStockSignal(item)}
                    </td>
                    <td style={S.td}>{item.unit || '-'}</td>
                    {/* 단가: 할인이 있으면 취소선 */}
                    <td style={S.td}>
                      {item.discountRate && item.discountRate > 0 ? (
                        <span style={S.priceStrikethrough}>{formatPrice(item.price)}</span>
                      ) : (
                        formatPrice(item.price)
                      )}
                    </td>
                    {/* 공급가: primary 강조 */}
                    <td style={S.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={S.supplyPriceDesktop}>{formatPrice(item.supplyPrice)}</span>
                        {item.discountRate != null && item.discountRate > 0 && (
                          <span style={S.discountBadge}>-{item.discountRate}%</span>
                        )}
                      </div>
                    </td>
                    {/* 공급처 + 인증 */}
                    <td style={S.td}>
                      {item.supplierName ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          {item.supplierName}
                          {item.supplierVerified && <span style={S.verifiedIcon} title="인증 공급처">✓</span>}
                        </span>
                      ) : '-'}
                    </td>
                    <td style={S.td}>
                      {item.legalCategory ? (
                        <span style={S.categoryBadge}>{item.legalCategory}</span>
                      ) : '-'}
                    </td>
                    <td style={S.td}>{formatDate(item.createdAt)}</td>
                    <td style={{ ...S.td, textAlign: 'center' as const }}>
                      <div style={S.actionGroup}>
                        {item.onClick && (
                          <button
                            type="button"
                            style={S.detailBtn}
                            onClick={(e) => { e.stopPropagation(); item.onClick!(); }}
                          >
                            상세 보기
                          </button>
                        )}
                        {renderAction(item)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── Mobile Cards ─── */}
          <div className="b2b-table-mobile" style={S.mobileWrap}>
            {paged.map(item => (
              <div
                key={item.id}
                className="b2b-table-row"
                style={isSoldout(item) ? { ...S.mobileCard, opacity: 0.5 } : S.mobileCard}
              >
                {/* Row 1: Status pill + name */}
                <div style={S.mobileRow1}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {renderStatusPill(item)}
                      <span style={S.mobileName}>{item.name}</span>
                    </div>
                    {item.description && (
                      <div style={S.mobileDesc}>{item.description}</div>
                    )}
                    {renderStockSignal(item)}
                  </div>
                  {item.legalCategory && (
                    <span style={S.categoryBadge}>{item.legalCategory}</span>
                  )}
                </div>

                {/* Row 2: Meta */}
                <div style={S.mobileRow2}>
                  <span style={S.mobileMeta}>
                    {item.unit || '-'} · {item.supplierName || '-'}
                    {item.supplierVerified && <span style={S.verifiedIcon}> ✓</span>}
                  </span>
                </div>

                {/* Row 3: Price + Actions */}
                <div style={S.mobileRow3}>
                  <div style={S.mobilePriceGroup}>
                    {item.supplyPrice != null && (
                      <span style={S.mobileSupplyPrice}>{formatPrice(item.supplyPrice)}</span>
                    )}
                    {item.discountRate != null && item.discountRate > 0 && (
                      <span style={S.discountBadge}>-{item.discountRate}%</span>
                    )}
                    {item.price != null && item.discountRate != null && item.discountRate > 0 && (
                      <span style={S.mobilePrice}>{formatPrice(item.price)}</span>
                    )}
                  </div>
                </div>

                {/* Row 4: Full-width actions */}
                <div style={S.mobileActionRow}>
                  {item.onClick && (
                    <button
                      type="button"
                      style={S.detailBtnMobile}
                      onClick={(e) => { e.stopPropagation(); item.onClick!(); }}
                    >
                      상세 보기
                    </button>
                  )}
                  {renderMobileAction(item)}
                </div>
              </div>
            ))}
          </div>

          {/* ─── Pagination ─── */}
          {totalPages > 1 && (
            <div style={S.pagination}>
              <button
                type="button"
                style={page === 0 ? { ...S.pageBtn, ...S.pageBtnDisabled } : S.pageBtn}
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
              >
                ‹
              </button>

              <div className="b2b-table-desktop" style={{ display: 'flex', gap: '4px' }}>
                {getPageNumbers().map(p => (
                  <button
                    key={p}
                    type="button"
                    style={p === page ? { ...S.pageNumBtn, ...S.pageNumActive } : S.pageNumBtn}
                    onClick={() => setPage(p)}
                  >
                    {p + 1}
                  </button>
                ))}
              </div>

              <span className="b2b-table-mobile" style={S.pageInfo}>
                {page + 1} / {totalPages}
              </span>

              <button
                type="button"
                style={page >= totalPages - 1 ? { ...S.pageBtn, ...S.pageBtnDisabled } : S.pageBtn}
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Helper renderers ───

function renderStatusPill(item: B2BTableItem) {
  if (isSoldout(item)) {
    return <span style={S.pillSoldout}>품절</span>;
  }
  if (isLimited(item)) {
    return <span style={S.pillLimited}>마감임박</span>;
  }
  if (item.status === 'pending') {
    return <span style={S.pillPending}>대기중</span>;
  }
  return null;
}

function renderStockSignal(item: B2BTableItem) {
  if (item.stockRemaining == null || isSoldout(item)) return null;
  if (item.stockRemaining <= 10) {
    return (
      <div style={S.stockSignal}>
        잔여 {item.stockRemaining}개
      </div>
    );
  }
  return null;
}

function renderAction(item: B2BTableItem) {
  if (isSoldout(item)) {
    return <span style={S.statusSoldout}>품절</span>;
  }
  if (item.isApproved) {
    return <span style={S.statusApproved}>✓ 승인됨</span>;
  }
  if (item.isApplied) {
    return <span style={S.statusPending}>신청중</span>;
  }
  if (item.onApply) {
    return (
      <button
        type="button"
        style={S.applyBtn}
        onClick={(e) => { e.stopPropagation(); item.onApply!(); }}
      >
        판매 신청
      </button>
    );
  }
  return null;
}

function renderMobileAction(item: B2BTableItem) {
  if (isSoldout(item)) {
    return <span style={{ ...S.mobileActionFull, ...S.mobileActionDisabled }}>품절</span>;
  }
  if (item.isApproved) {
    return <span style={{ ...S.mobileActionFull, color: EMERALD, borderColor: EMERALD }}>✓ 승인됨</span>;
  }
  if (item.isApplied) {
    return <span style={{ ...S.mobileActionFull, color: AMBER, borderColor: AMBER }}>신청중</span>;
  }
  if (item.onApply) {
    return (
      <button
        type="button"
        style={S.applyBtnMobile}
        onClick={(e) => { e.stopPropagation(); item.onApply!(); }}
      >
        판매 신청
      </button>
    );
  }
  return null;
}

// ─── Styles ───

const S: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
  },
  title: {
    margin: '0 0 16px',
    fontSize: '1.25rem',
    fontWeight: 700,
    color: NEUTRALS[900],
  },

  // Category Tabs
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '0',
    overflowX: 'auto' as const,
    borderBottom: `1px solid ${NEUTRALS[200]}`,
    paddingBottom: '0',
  },
  tab: {
    padding: '8px 16px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: NEUTRALS[500],
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    fontFamily: 'inherit',
    marginBottom: '-1px',
  },
  tabActive: {
    color: PRIMARY,
    borderBottomColor: PRIMARY,
    fontWeight: 600,
  },

  // Info Bar
  infoBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    marginBottom: '4px',
  },
  infoCount: {
    fontSize: '0.8125rem',
    color: NEUTRALS[500],
  },
  infoRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  infoBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: '10px',
    backgroundColor: `${PRIMARY}10`,
    color: PRIMARY,
  },
  infoSort: {
    fontSize: '0.75rem',
    color: NEUTRALS[400],
    fontWeight: 500,
  },

  empty: {
    padding: '48px 20px',
    textAlign: 'center' as const,
    color: NEUTRALS[400],
    fontSize: '0.875rem',
  },

  // Desktop Table
  tableWrap: {
    overflowX: 'auto' as const,
    borderRadius: '8px',
    border: `1px solid ${NEUTRALS[200]}`,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.8125rem',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'left' as const,
    fontSize: '0.75rem',
    fontWeight: 600,
    color: NEUTRALS[500],
    backgroundColor: NEUTRALS[50],
    borderBottom: `1px solid ${NEUTRALS[200]}`,
    whiteSpace: 'nowrap' as const,
    userSelect: 'none' as const,
  },
  thSortable: {
    cursor: 'pointer',
  },
  thActive: {
    color: PRIMARY,
    backgroundColor: `${PRIMARY}06`,
  },
  tr: {
    borderBottom: `1px solid ${NEUTRALS[100]}`,
  },
  td: {
    padding: '10px 12px',
    color: NEUTRALS[600],
    whiteSpace: 'nowrap' as const,
    verticalAlign: 'middle' as const,
  },
  tdDesc: {
    fontSize: '0.6875rem',
    color: NEUTRALS[400],
    marginTop: '2px',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '220px',
  },

  // Price
  supplyPriceDesktop: {
    fontWeight: 700,
    color: PRIMARY,
    fontSize: '0.8125rem',
  },
  priceStrikethrough: {
    color: NEUTRALS[400],
    textDecoration: 'line-through',
    fontSize: '0.75rem',
  },
  discountBadge: {
    display: 'inline-block',
    padding: '1px 5px',
    fontSize: '0.625rem',
    fontWeight: 700,
    borderRadius: '3px',
    backgroundColor: `${RED}12`,
    color: RED,
  },

  // Supplier verified
  verifiedIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: EMERALD,
    color: '#ffffff',
    fontSize: '0.5rem',
    fontWeight: 700,
    flexShrink: 0,
  },

  // Status pills
  pillSoldout: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: '0.625rem',
    fontWeight: 700,
    borderRadius: '3px',
    backgroundColor: NEUTRALS[200],
    color: NEUTRALS[500],
    flexShrink: 0,
  },
  pillLimited: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: '0.625rem',
    fontWeight: 700,
    borderRadius: '3px',
    backgroundColor: `${RED}12`,
    color: RED,
    flexShrink: 0,
  },
  pillPending: {
    display: 'inline-block',
    padding: '1px 6px',
    fontSize: '0.625rem',
    fontWeight: 700,
    borderRadius: '3px',
    backgroundColor: `${AMBER}15`,
    color: AMBER,
    flexShrink: 0,
  },

  // Stock signal
  stockSignal: {
    fontSize: '0.625rem',
    fontWeight: 600,
    color: RED,
    marginTop: '2px',
  },

  categoryBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: '10px',
    backgroundColor: NEUTRALS[100],
    color: NEUTRALS[600],
    whiteSpace: 'nowrap' as const,
  },

  // Actions
  actionGroup: {
    display: 'flex',
    gap: '6px',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Mobile
  mobileWrap: {
    display: 'none',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  mobileCard: {
    padding: '14px 16px',
    backgroundColor: '#ffffff',
    border: `1px solid ${NEUTRALS[200]}`,
    borderRadius: '10px',
  },
  mobileRow1: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '4px',
  },
  mobileName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: NEUTRALS[800],
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  mobileDesc: {
    fontSize: '0.6875rem',
    color: NEUTRALS[400],
    marginTop: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  mobileRow2: {
    marginBottom: '8px',
  },
  mobileMeta: {
    fontSize: '0.75rem',
    color: NEUTRALS[500],
  },
  mobileRow3: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
  },
  mobilePriceGroup: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '6px',
  },
  mobileSupplyPrice: {
    fontSize: '1.0625rem',
    fontWeight: 700,
    color: PRIMARY,
  },
  mobilePrice: {
    fontSize: '0.6875rem',
    color: NEUTRALS[400],
    textDecoration: 'line-through',
  },

  // Mobile action row (full-width)
  mobileActionRow: {
    display: 'flex',
    gap: '8px',
  },
  mobileActionFull: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '8px 0',
    fontSize: '0.8125rem',
    fontWeight: 600,
    borderRadius: '6px',
    border: `1px solid ${NEUTRALS[300]}`,
    color: NEUTRALS[600],
  },
  mobileActionDisabled: {
    color: NEUTRALS[400],
    borderColor: NEUTRALS[200],
    backgroundColor: NEUTRALS[50],
  },

  // Buttons
  detailBtn: {
    padding: '4px 10px',
    background: 'transparent',
    color: NEUTRALS[600],
    border: `1px solid ${NEUTRALS[300]}`,
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
  },
  detailBtnMobile: {
    flex: 1,
    padding: '8px 0',
    background: 'transparent',
    color: NEUTRALS[600],
    border: `1px solid ${NEUTRALS[300]}`,
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center' as const,
  },
  applyBtn: {
    padding: '4px 10px',
    background: PRIMARY,
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap' as const,
  },
  applyBtnMobile: {
    flex: 1,
    padding: '8px 0',
    background: PRIMARY,
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    textAlign: 'center' as const,
  },
  statusApproved: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: EMERALD,
  },
  statusPending: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: AMBER,
  },
  statusSoldout: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: NEUTRALS[400],
  },

  // Pagination
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '4px',
    marginTop: '16px',
  },
  pageBtn: {
    padding: '6px 10px',
    background: '#ffffff',
    border: `1px solid ${NEUTRALS[300]}`,
    borderRadius: '6px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: NEUTRALS[700],
    cursor: 'pointer',
    fontFamily: 'inherit',
    lineHeight: 1,
  },
  pageBtnDisabled: {
    color: NEUTRALS[300],
    cursor: 'default',
    borderColor: NEUTRALS[200],
  },
  pageNumBtn: {
    padding: '4px 10px',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: '6px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: NEUTRALS[500],
    cursor: 'pointer',
    fontFamily: 'inherit',
    minWidth: '32px',
    textAlign: 'center' as const,
  },
  pageNumActive: {
    background: PRIMARY,
    color: '#ffffff',
    fontWeight: 600,
    borderColor: PRIMARY,
  },
  pageInfo: {
    fontSize: '0.8125rem',
    color: NEUTRALS[500],
    padding: '0 8px',
  },
};
