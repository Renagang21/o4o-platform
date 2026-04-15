/**
 * SupplierEventOfferPage - 공급자 이벤트 제안 페이지
 *
 * WO-EVENT-OFFER-SUPPLIER-UX-REFINE-V1
 *
 * 탭 구조:
 *   Tab 1: 제안 가능 이벤트 — 아직 KPA에 제안하지 않은 APPROVED SPO
 *   Tab 2: 내 이벤트 제안 — 이미 제안한 이벤트 목록 + 상태
 */

import { useState, useEffect, useMemo } from 'react';
import { toast } from '@o4o/error-handling';
import { colors } from '../../styles/theme';
import {
  supplierEventOfferApi,
  type SupplierOffer,
  type SupplierProposal,
} from '../../api/supplierEventOffer';

type Tab = 'available' | 'my-proposals';
type ApiError = { code: string; message: string };

const TEXT = {
  title: '이벤트 제안',
  subtitle: '내 상품을 KPA 이벤트에 제안하세요. 운영자 검토 후 노출 여부가 결정됩니다.',
  tab1: '제안 가능 이벤트',
  tab2: '내 이벤트 제안',
  searchPlaceholder: '상품명으로 검색...',
  proposeBtn: '이벤트 제안',
  proposingBtn: '제안 중...',
  available_empty: '제안 가능한 승인 상품이 없습니다.',
  available_empty_desc: 'Neture에서 상품 승인 후 이 목록에 표시됩니다.',
  available_filtered_empty: '검색 결과가 없습니다.',
  proposal_empty: '아직 제안한 이벤트가 없습니다.',
  proposal_empty_desc: '제안 가능 이벤트 탭에서 상품을 선택해 제안하세요.',
  statusPending: '제안됨 (운영자 검토 대기)',
  statusActive: '노출중 (현재 이벤트에 표시됨)',
  statusPendingShort: '검토 대기',
  statusActiveShort: '노출중',
  notSupplierTitle: '공급자 계정이 아닙니다',
  notSupplierDesc: '이 페이지는 Neture 공급자 계정과 연결된 사용자만 이용할 수 있습니다.',
  notice: '제안한 이벤트는 KPA 운영자가 검토한 후 노출 여부를 결정합니다. 제안 즉시 노출되지 않습니다.',
} as const;

export function SupplierEventOfferPage() {
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [offers, setOffers] = useState<SupplierOffer[]>([]);
  const [proposals, setProposals] = useState<SupplierProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [notSupplier, setNotSupplier] = useState(false);
  const [proposing, setProposing] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setNotSupplier(false);
    try {
      const [offersRes, proposalsRes] = await Promise.all([
        supplierEventOfferApi.getMyOffers(),
        supplierEventOfferApi.getMyProposals(),
      ]);
      if (offersRes?.data) setOffers(offersRes.data.offers);
      if (proposalsRes?.data) setProposals(proposalsRes.data);
    } catch (err: any) {
      const apiErr = err?.response?.data?.error as ApiError | undefined;
      if (err?.response?.status === 403 && apiErr?.code === 'SUPPLIER_NOT_FOUND') {
        setNotSupplier(true);
      } else {
        toast.error('데이터를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePropose = async (offer: SupplierOffer) => {
    if (proposing) return;
    setProposing(offer.id);
    try {
      const res = await supplierEventOfferApi.propose(offer.id);
      if (res?.data) {
        setOffers(prev => prev.filter(o => o.id !== offer.id));
        setProposals(prev => [res.data, ...prev]);
        toast.success(`"${offer.title}" 이(가) 제안되었습니다. 운영자 검토 후 노출됩니다.`);
        setActiveTab('my-proposals');
      }
    } catch (err: any) {
      const apiErr = err?.response?.data?.error as ApiError | undefined;
      if (apiErr?.code === 'ALREADY_PROPOSED') {
        toast.error('이미 제안된 상품입니다. 목록을 새로고침합니다.');
        await loadAll();
      } else {
        toast.error(apiErr?.message || '제안에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setProposing(null);
    }
  };

  const filteredOffers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return offers;
    return offers.filter(o =>
      o.title.toLowerCase().includes(q) ||
      o.supplierName.toLowerCase().includes(q)
    );
  }, [offers, search]);

  const formatPrice = (price: number | null) => {
    if (price == null) return '가격 미정';
    return `${price.toLocaleString('ko-KR')}원`;
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
    } catch { return '-'; }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingCard}>불러오는 중...</div>
      </div>
    );
  }

  if (notSupplier) {
    return (
      <div style={styles.container}>
        <div style={styles.notSupplierCard}>
          <div style={styles.lockIcon}>🔒</div>
          <div style={styles.notSupplierTitle}>{TEXT.notSupplierTitle}</div>
          <div style={styles.notSupplierDesc}>{TEXT.notSupplierDesc}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <h1 style={styles.title}>{TEXT.title}</h1>
        <p style={styles.subtitle}>{TEXT.subtitle}</p>
      </div>

      {/* 탭 */}
      <div style={styles.tabBar}>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === 'available' ? styles.tabBtnActive : {}) }}
          onClick={() => setActiveTab('available')}
        >
          {TEXT.tab1}
          {offers.length > 0 && (
            <span style={{ ...styles.tabBadge, ...(activeTab === 'available' ? styles.tabBadgeActive : {}) }}>
              {offers.length}
            </span>
          )}
        </button>
        <button
          style={{ ...styles.tabBtn, ...(activeTab === 'my-proposals' ? styles.tabBtnActive : {}) }}
          onClick={() => setActiveTab('my-proposals')}
        >
          {TEXT.tab2}
          {proposals.length > 0 && (
            <span style={{ ...styles.tabBadge, ...(activeTab === 'my-proposals' ? styles.tabBadgeActive : {}) }}>
              {proposals.length}
            </span>
          )}
        </button>
      </div>

      {/* 탭 1: 제안 가능 이벤트 */}
      {activeTab === 'available' && (
        <div>
          {/* 검색 */}
          <div style={styles.searchRow}>
            <input
              type="text"
              placeholder={TEXT.searchPlaceholder}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {offers.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>📦</div>
              <div style={styles.emptyTitle}>{TEXT.available_empty}</div>
              <div style={styles.emptyDesc}>{TEXT.available_empty_desc}</div>
            </div>
          ) : filteredOffers.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>🔍</div>
              <div style={styles.emptyTitle}>{TEXT.available_filtered_empty}</div>
            </div>
          ) : (
            <div style={styles.offerGrid}>
              {filteredOffers.map(offer => (
                <div key={offer.id} style={styles.offerCard}>
                  <div style={styles.offerTitle}>{offer.title}</div>
                  <div style={styles.offerSupplier}>{offer.supplierName}</div>
                  <div style={styles.offerPrice}>{formatPrice(offer.price)}</div>
                  <button
                    style={{
                      ...styles.proposeBtn,
                      opacity: proposing === offer.id ? 0.6 : 1,
                      cursor: proposing === offer.id ? 'not-allowed' : 'pointer',
                    }}
                    disabled={!!proposing}
                    onClick={() => handlePropose(offer)}
                  >
                    {proposing === offer.id ? TEXT.proposingBtn : TEXT.proposeBtn}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 탭 2: 내 이벤트 제안 */}
      {activeTab === 'my-proposals' && (
        <div>
          {proposals.length === 0 ? (
            <div style={styles.emptyCard}>
              <div style={styles.emptyIcon}>📋</div>
              <div style={styles.emptyTitle}>{TEXT.proposal_empty}</div>
              <div style={styles.emptyDesc}>{TEXT.proposal_empty_desc}</div>
              <button
                style={styles.goToAvailableBtn}
                onClick={() => setActiveTab('available')}
              >
                제안 가능 이벤트 보기
              </button>
            </div>
          ) : (
            <div style={styles.proposalList}>
              <div style={styles.proposalHeader}>
                <span style={{ flex: 3 }}>상품명</span>
                <span style={{ flex: 2 }}>공급사</span>
                <span style={{ width: 140, textAlign: 'center' as const }}>상태</span>
                <span style={{ width: 70, textAlign: 'right' as const }}>제안일</span>
              </div>
              {proposals.map(p => (
                <div key={p.id} style={styles.proposalRow}>
                  <span style={{ flex: 3, fontWeight: 500, color: colors.neutral900 }}>
                    {p.title}
                  </span>
                  <span style={{ flex: 2, fontSize: 13, color: colors.neutral600 }}>
                    {p.supplierName}
                  </span>
                  <span style={{ width: 140, textAlign: 'center' as const }}>
                    <span
                      style={p.isActive ? styles.badgeActive : styles.badgePending}
                      title={p.isActive ? TEXT.statusActive : TEXT.statusPending}
                    >
                      {p.isActive ? TEXT.statusActiveShort : TEXT.statusPendingShort}
                    </span>
                  </span>
                  <span style={{ width: 70, textAlign: 'right' as const, fontSize: 12, color: colors.neutral500 }}>
                    {formatDate(p.proposedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 범례 */}
          {proposals.length > 0 && (
            <div style={styles.legendRow}>
              <span style={styles.badgePending}>{TEXT.statusPendingShort}</span>
              <span style={styles.legendText}>{TEXT.statusPending}</span>
              <span style={{ margin: '0 12px', color: colors.neutral300 }}>|</span>
              <span style={styles.badgeActive}>{TEXT.statusActiveShort}</span>
              <span style={styles.legendText}>{TEXT.statusActive}</span>
            </div>
          )}
        </div>
      )}

      {/* 안내 문구 */}
      <div style={styles.notice}>
        <strong>안내:</strong> {TEXT.notice}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: '24px', maxWidth: '960px' },

  loadingCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '60px',
    textAlign: 'center',
    color: colors.neutral500,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  notSupplierCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '60px 20px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  lockIcon: { fontSize: '40px', marginBottom: '12px' },
  notSupplierTitle: { fontSize: '16px', fontWeight: 600, color: colors.neutral800, marginBottom: '6px' },
  notSupplierDesc: { fontSize: '13px', color: colors.neutral500 },

  header: { marginBottom: '24px' },
  title: { fontSize: '22px', fontWeight: 700, color: colors.neutral900, margin: 0 },
  subtitle: { fontSize: '13px', color: colors.neutral500, marginTop: '4px' },

  /* 탭 */
  tabBar: {
    display: 'flex',
    gap: '4px',
    borderBottom: `2px solid ${colors.neutral100}`,
    marginBottom: '24px',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '10px 18px',
    border: 'none',
    background: 'none',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral500,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
    borderRadius: '4px 4px 0 0',
    transition: 'color 0.15s',
  },
  tabBtnActive: {
    color: colors.primary,
    borderBottom: `2px solid ${colors.primary}`,
    fontWeight: 600,
  },
  tabBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '18px',
    height: '18px',
    padding: '0 5px',
    borderRadius: '9px',
    fontSize: '11px',
    fontWeight: 700,
    backgroundColor: colors.neutral200,
    color: colors.neutral600,
  },
  tabBadgeActive: {
    backgroundColor: colors.primary,
    color: colors.white,
  },

  /* 검색 */
  searchRow: {
    marginBottom: '16px',
  },
  searchInput: {
    width: '260px',
    padding: '8px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: colors.neutral900,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },

  /* 빈 상태 */
  emptyCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '48px 20px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  emptyIcon: { fontSize: '32px', marginBottom: '10px' },
  emptyTitle: { fontSize: '14px', fontWeight: 600, color: colors.neutral700, marginBottom: '6px' },
  emptyDesc: { fontSize: '13px', color: colors.neutral500, marginBottom: '16px' },
  goToAvailableBtn: {
    padding: '8px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },

  /* 제안 가능 그리드 */
  offerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '14px',
  },
  offerCard: {
    backgroundColor: colors.white,
    borderRadius: '10px',
    padding: '18px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  offerTitle: { fontSize: '14px', fontWeight: 600, color: colors.neutral900, lineHeight: 1.4 },
  offerSupplier: { fontSize: '12px', color: colors.neutral500 },
  offerPrice: { fontSize: '15px', fontWeight: 600, color: colors.primary, marginBottom: '4px' },
  proposeBtn: {
    padding: '9px 0',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '7px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'opacity 0.15s',
  },

  /* 내 제안 목록 */
  proposalList: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    marginBottom: '12px',
  },
  proposalHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    backgroundColor: colors.neutral50,
    borderBottom: `1px solid ${colors.neutral100}`,
    fontSize: '11px',
    fontWeight: 600,
    color: colors.neutral500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  proposalRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 20px',
    borderBottom: `1px solid ${colors.neutral50}`,
    fontSize: '14px',
    gap: 0,
  },
  badgePending: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    whiteSpace: 'nowrap' as const,
  },
  badgeActive: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 600,
    backgroundColor: '#D1FAE5',
    color: '#059669',
    whiteSpace: 'nowrap' as const,
  },

  /* 범례 */
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 4px',
    fontSize: '12px',
    marginBottom: '8px',
  },
  legendText: {
    color: colors.neutral500,
    fontSize: '12px',
  },

  /* 안내 */
  notice: {
    marginTop: '24px',
    padding: '14px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    fontSize: '13px',
    color: colors.neutral600,
    borderLeft: `3px solid ${colors.primary}`,
  },
};
