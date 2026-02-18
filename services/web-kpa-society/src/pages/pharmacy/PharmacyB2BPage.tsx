/**
 * PharmacyB2BPage - B2B 구매 화면
 *
 * WO-KPA-PHARMACY-B2B-FUNCTION-V1
 * - "거래 화면이 아니라 약국이 접근 가능한 B2B 생태계를 구조적으로 보여주는 화면"
 * - 4개 섹션 고정 배치:
 *   A. 서비스별 B2B 리스트
 *   B. 공동구매 (참여 가능한 것만, 명확히 구분된 섹션)
 *   C. 전체 B2B 리스트 (탐색/조사용)
 *   D. Market Trail (시장 흐름, 정보 영역)
 *
 * 공동구매 경계:
 * - B2B의 "한 거래 방식"이지 독립 서비스가 아님
 * - 결제/정산 없음 (이 Phase 기준)
 * - 가격 확정, 할인 강조 표현 금지
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';
import { isPharmacyOwner, PharmacistFeeCategory } from '../../types';

// ============================================
// Mock 데이터
// ============================================

// 서비스별 B2B 구조
const mockServiceB2B = [
  {
    serviceId: 'medicine',
    serviceName: '일반 의약품',
    icon: '💊',
    suppliers: [
      { id: 's1', name: '대웅제약', productCount: 156 },
      { id: 's2', name: '일동제약', productCount: 203 },
    ],
    totalProducts: 359,
  },
  {
    serviceId: 'health',
    serviceName: '건강기능식품',
    icon: '🍀',
    suppliers: [
      { id: 's3', name: '종근당건강', productCount: 89 },
      { id: 's4', name: '한독', productCount: 45 },
    ],
    totalProducts: 134,
  },
  {
    serviceId: 'supplies',
    serviceName: '약국 운영용품',
    icon: '🏪',
    suppliers: [
      { id: 's5', name: '메디팜', productCount: 2340 },
      { id: 's6', name: '팜스토어', productCount: 567 },
    ],
    totalProducts: 2907,
  },
];

// 현재 참여 가능한 공동구매
const mockGroupbuys = [
  {
    id: 'gb-1',
    productName: '우루사 100정',
    supplierName: '대웅제약',
    targetQty: 100,
    currentQty: 67,
    minQty: 50,
    deadline: '2025-02-15',
    status: 'open',
    pharmacyStatus: 'not_joined', // not_joined | joined | pending
  },
  {
    id: 'gb-2',
    productName: '비타민C 1000mg (90정)',
    supplierName: '종근당건강',
    targetQty: 200,
    currentQty: 180,
    minQty: 100,
    deadline: '2025-02-10',
    status: 'open',
    pharmacyStatus: 'joined',
  },
  {
    id: 'gb-3',
    productName: '마스크 (50매입)',
    supplierName: '메디팜',
    targetQty: 500,
    currentQty: 320,
    minQty: 300,
    deadline: '2025-02-20',
    status: 'open',
    pharmacyStatus: 'not_joined',
  },
];

// 전체 B2B 항목
const mockAllB2BItems = [
  { id: 'item-1', name: '우루사 100정', supplier: '대웅제약', type: 'b2b', service: '의약품' },
  { id: 'item-2', name: '베아제 60정', supplier: '대웅제약', type: 'b2b', service: '의약품' },
  { id: 'item-3', name: '아로나민골드', supplier: '일동제약', type: 'b2b', service: '의약품' },
  { id: 'item-4', name: '비타민C 1000mg', supplier: '종근당건강', type: 'groupbuy', service: '건강식품' },
  { id: 'item-5', name: '오메가3', supplier: '종근당건강', type: 'b2b', service: '건강식품' },
  { id: 'item-6', name: '약봉투 (대)', supplier: '메디팜', type: 'b2b', service: '용품' },
  { id: 'item-7', name: '마스크 50매', supplier: '메디팜', type: 'groupbuy', service: '용품' },
  { id: 'item-8', name: '손소독제', supplier: '팜스토어', type: 'b2b', service: '용품' },
];

// Market Trail (시장 흐름)
const mockMarketTrail = [
  { id: 'mt-1', type: 'trend', title: '2025년 1분기 건강기능식품 수요 증가 전망', date: '2025-01-20' },
  { id: 'mt-2', type: 'new_supplier', title: '신규 공급자: 한미약품 입점', date: '2025-01-18' },
  { id: 'mt-3', type: 'upcoming', title: '[예정] 대웅제약 신제품 공동구매 (2월 예정)', date: '2025-01-15' },
  { id: 'mt-4', type: 'info', title: '의약품 공급 안정화 공지', date: '2025-01-10' },
];

// 약국 정보
const mockPharmacy = {
  name: '강남중앙약국',
};

// ============================================
// 컴포넌트
// ============================================

export function PharmacyB2BPage() {
  const { user } = useAuth();
  const testUser = user as TestUser | null;

  const userFeeCategory: PharmacistFeeCategory =
    testUser?.role === 'pharmacist' ? 'B1_pharmacy_employee' : 'A1_pharmacy_owner';
  const isOwner = isPharmacyOwner(userFeeCategory);
  const roleLabel = isOwner ? '개설약사' : '근무약사';

  // 공동구매 참여 상태 관리 (데모용)
  const [groupbuyStatus, setGroupbuyStatus] = useState<Record<string, string>>(
    mockGroupbuys.reduce((acc, gb) => ({ ...acc, [gb.id]: gb.pharmacyStatus }), {})
  );

  // 공동구매 참여/취소 핸들러
  const handleGroupbuyAction = (gbId: string, action: 'join' | 'cancel') => {
    if (!isOwner) return;
    setGroupbuyStatus(prev => ({
      ...prev,
      [gbId]: action === 'join' ? 'joined' : 'not_joined',
    }));
  };

  // 전체 리스트 필터
  const [filter, setFilter] = useState({ service: 'all', type: 'all' });

  const filteredItems = mockAllB2BItems.filter(item => {
    if (filter.service !== 'all' && item.service !== filter.service) return false;
    if (filter.type !== 'all' && item.type !== filter.type) return false;
    return true;
  });

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/pharmacy" style={styles.backLink}>← 약국 경영지원</Link>
          <div style={styles.headerMain}>
            <div style={styles.pharmacyInfo}>
              <h1 style={styles.pageTitle}>B2B 구매</h1>
              <span style={styles.subLabel}>{mockPharmacy.name} · 운영 화면</span>
            </div>
            <div style={styles.roleInfo}>
              <span style={styles.roleBadge}>{roleLabel}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ============================================
       * 섹션 A: 서비스별 B2B 리스트
       * "어떤 서비스 맥락에서 B2B를 이용하는가"
       * ============================================ */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>🅐 서비스별 B2B</h2>
          <span style={styles.sectionDesc}>
            서비스 맥락별로 공급자와 상품을 확인합니다
          </span>
        </div>
        <div style={styles.serviceGrid}>
          {mockServiceB2B.map((service) => (
            <Link
              key={service.serviceId}
              to={`/pharmacy/sales/b2b/service/${service.serviceId}`}
              style={styles.serviceCard}
            >
              <div style={styles.serviceIcon}>{service.icon}</div>
              <div style={styles.serviceInfo}>
                <h3 style={styles.serviceName}>{service.serviceName}</h3>
                <div style={styles.serviceMeta}>
                  <span>{service.suppliers.length}개 공급자</span>
                  <span style={styles.dot}>·</span>
                  <span>{service.totalProducts.toLocaleString()}개 상품</span>
                </div>
              </div>
              <span style={styles.serviceArrow}>→</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================
       * 섹션 B: 공동구매
       * "참여 가능한 공동구매만 노출, 명확히 구분된 섹션"
       * ============================================ */}
      <section style={{ ...styles.section, ...styles.groupbuySection }}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>🅑 공동구매</h2>
          <span style={styles.sectionDesc}>
            현재 참여 가능한 공동구매 목록입니다
          </span>
        </div>

        {/* 공동구매 안내 */}
        <div style={styles.groupbuyNotice}>
          <span style={styles.noticeIcon}>ℹ️</span>
          <span>
            공동구매는 B2B의 한 거래 방식입니다.
            조건 성립 전까지 구매 확정이 아니며, 본 화면에서는 참여 상태만 관리합니다.
          </span>
        </div>

        <div style={styles.groupbuyGrid}>
          {mockGroupbuys.map((gb) => {
            const status = groupbuyStatus[gb.id];
            const progress = (gb.currentQty / gb.targetQty) * 100;
            const isMinMet = gb.currentQty >= gb.minQty;

            return (
              <div key={gb.id} style={styles.groupbuyCard}>
                <div style={styles.gbHeader}>
                  <div style={styles.gbInfo}>
                    <h4 style={styles.gbName}>{gb.productName}</h4>
                    <span style={styles.gbSupplier}>{gb.supplierName}</span>
                  </div>
                  {status === 'joined' && (
                    <span style={styles.joinedBadge}>참여중</span>
                  )}
                </div>

                <div style={styles.gbProgress}>
                  <div style={styles.progressLabels}>
                    <span>현재 {gb.currentQty} / 목표 {gb.targetQty}</span>
                    <span style={isMinMet ? styles.minMetText : styles.minNotMetText}>
                      {isMinMet ? '✓ 최소수량 달성' : `최소 ${gb.minQty} 필요`}
                    </span>
                  </div>
                  <div style={styles.progressBar}>
                    <div style={{
                      ...styles.progressFill,
                      width: `${Math.min(progress, 100)}%`,
                      backgroundColor: isMinMet ? '#22c55e' : colors.primary,
                    }} />
                    {/* 최소 수량 마커 */}
                    <div style={{
                      ...styles.minMarker,
                      left: `${(gb.minQty / gb.targetQty) * 100}%`,
                    }} />
                  </div>
                </div>

                <div style={styles.gbFooter}>
                  <span style={styles.gbDeadline}>마감: {gb.deadline}</span>

                  {isOwner ? (
                    status === 'joined' ? (
                      <button
                        style={styles.cancelButton}
                        onClick={() => handleGroupbuyAction(gb.id, 'cancel')}
                      >
                        참여 취소
                      </button>
                    ) : (
                      <button
                        style={styles.joinButton}
                        onClick={() => handleGroupbuyAction(gb.id, 'join')}
                      >
                        참여하기
                      </button>
                    )
                  ) : (
                    <span style={styles.viewOnlyLabel}>열람 전용</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {!isOwner && (
          <div style={styles.roleNotice}>
            공동구매 참여는 개설약사만 가능합니다.
          </div>
        )}
      </section>

      {/* ============================================
       * 섹션 C: 전체 B2B 리스트
       * "탐색/조사용 영역, 구매 흐름의 출발점은 아님"
       * ============================================ */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>🅒 전체 B2B 리스트</h2>
          <span style={styles.sectionDesc}>
            접근 가능한 모든 B2B 항목을 탐색합니다
          </span>
        </div>

        {/* 필터 */}
        <div style={styles.filterRow}>
          <select
            style={styles.filterSelect}
            value={filter.service}
            onChange={(e) => setFilter(prev => ({ ...prev, service: e.target.value }))}
          >
            <option value="all">전체 서비스</option>
            <option value="의약품">의약품</option>
            <option value="건강식품">건강식품</option>
            <option value="용품">용품</option>
          </select>
          <select
            style={styles.filterSelect}
            value={filter.type}
            onChange={(e) => setFilter(prev => ({ ...prev, type: e.target.value }))}
          >
            <option value="all">전체 거래방식</option>
            <option value="b2b">일반 B2B</option>
            <option value="groupbuy">공동구매</option>
          </select>
          <span style={styles.filterResult}>
            {filteredItems.length}개 항목
          </span>
        </div>

        <div style={styles.itemList}>
          {filteredItems.map((item) => (
            <div key={item.id} style={styles.itemRow}>
              <div style={styles.itemInfo}>
                <span style={styles.itemName}>{item.name}</span>
                <span style={styles.itemMeta}>
                  {item.supplier} · {item.service}
                </span>
              </div>
              <span style={{
                ...styles.typeBadge,
                ...(item.type === 'groupbuy' ? styles.groupbuyTypeBadge : {}),
              }}>
                {item.type === 'b2b' ? '일반' : '공동구매'}
              </span>
            </div>
          ))}
        </div>

        <Link to="/pharmacy/sales/b2b/suppliers" style={styles.viewAllLink}>
          공급자 전체 보기 →
        </Link>
      </section>

      {/* ============================================
       * 섹션 D: Market Trail (시장 흐름)
       * "정보 → 판단용 섹션, 행동 유도 없음"
       * ============================================ */}
      <section style={{ ...styles.section, ...styles.marketSection }}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>🅓 시장 흐름</h2>
          <span style={styles.sectionDesc}>
            시장 정보를 참고하여 판단에 활용하세요
          </span>
        </div>

        <div style={styles.marketList}>
          {mockMarketTrail.map((item) => (
            <div key={item.id} style={styles.marketItem}>
              <span style={styles.marketIcon}>
                {item.type === 'trend' && '📈'}
                {item.type === 'new_supplier' && '🏭'}
                {item.type === 'upcoming' && '📅'}
                {item.type === 'info' && '📋'}
              </span>
              <div style={styles.marketInfo}>
                <span style={styles.marketTitle}>{item.title}</span>
                <span style={styles.marketDate}>{item.date}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 페이지 안내 */}
      <div style={styles.pageNotice}>
        <span style={styles.noticeIcon}>💡</span>
        <span>
          이 화면은 약국이 접근 가능한 B2B 생태계를 구조적으로 보여줍니다.
          {isOwner
            ? ' 공급자를 선택하여 상품을 확인하거나 공동구매에 참여할 수 있습니다.'
            : ' 구매 및 공동구매 참여는 개설약사만 가능합니다.'}
        </span>
      </div>
    </div>
  );
}

// ============================================
// 스타일
// ============================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },

  // Header
  header: {
    marginBottom: '32px',
  },
  headerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  backLink: {
    color: colors.primary,
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  headerMain: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pharmacyInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  pageTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subLabel: {
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  roleInfo: {},
  roleBadge: {
    padding: '6px 14px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    borderRadius: '20px',
    fontSize: '0.8125rem',
    fontWeight: 600,
  },

  // Section
  section: {
    marginBottom: '40px',
  },
  sectionHeader: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: '0 0 6px 0',
  },
  sectionDesc: {
    fontSize: '0.875rem',
    color: colors.neutral500,
  },

  // Section A: Service B2B
  serviceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
  },
  serviceCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    textDecoration: 'none',
    color: 'inherit',
    transition: 'box-shadow 0.2s',
  },
  serviceIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: '1.0625rem',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  serviceMeta: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
    marginTop: '4px',
  },
  dot: {
    margin: '0 4px',
  },
  serviceArrow: {
    fontSize: '1.25rem',
    color: colors.neutral400,
  },

  // Section B: Groupbuy
  groupbuySection: {
    backgroundColor: colors.primary + '05',
    margin: '0 -24px 40px -24px',
    padding: '24px',
    borderTop: `1px solid ${colors.primary}20`,
    borderBottom: `1px solid ${colors.primary}20`,
  },
  groupbuyNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '14px 18px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.neutral200}`,
    marginBottom: '20px',
    fontSize: '0.8125rem',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
  groupbuyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  groupbuyCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  gbHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gbInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  gbName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  gbSupplier: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  joinedBadge: {
    padding: '4px 10px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  gbProgress: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  progressLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.8125rem',
    color: colors.neutral600,
  },
  minMetText: {
    color: '#166534',
    fontWeight: 500,
  },
  minNotMetText: {
    color: colors.neutral400,
  },
  progressBar: {
    position: 'relative',
    height: '10px',
    backgroundColor: colors.neutral200,
    borderRadius: '5px',
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    borderRadius: '5px',
    transition: 'width 0.3s',
  },
  minMarker: {
    position: 'absolute',
    top: '-2px',
    width: '2px',
    height: '14px',
    backgroundColor: colors.neutral500,
  },
  gbFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  gbDeadline: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  joinButton: {
    padding: '8px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '8px 20px',
    backgroundColor: colors.white,
    color: colors.neutral600,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  viewOnlyLabel: {
    padding: '8px 16px',
    backgroundColor: colors.neutral100,
    color: colors.neutral500,
    borderRadius: borderRadius.md,
    fontSize: '0.8125rem',
  },
  roleNotice: {
    marginTop: '16px',
    padding: '12px',
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.md,
    fontSize: '0.8125rem',
    color: colors.neutral500,
    textAlign: 'center',
  },

  // Section C: All Items
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  filterSelect: {
    padding: '10px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    backgroundColor: colors.white,
    cursor: 'pointer',
  },
  filterResult: {
    marginLeft: 'auto',
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '320px',
    overflowY: 'auto',
    marginBottom: '16px',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 18px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.neutral200}`,
  },
  itemInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  itemName: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: colors.neutral800,
  },
  itemMeta: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  typeBadge: {
    padding: '4px 10px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  groupbuyTypeBadge: {
    backgroundColor: colors.primary + '15',
    color: colors.primary,
  },
  viewAllLink: {
    display: 'inline-block',
    color: colors.primary,
    fontSize: '0.875rem',
    fontWeight: 500,
    textDecoration: 'none',
  },

  // Section D: Market Trail
  marketSection: {
    backgroundColor: colors.neutral100 + '80',
    margin: '0 -24px 40px -24px',
    padding: '24px',
    borderRadius: 0,
  },
  marketList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  marketItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    padding: '16px 18px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    border: `1px solid ${colors.neutral200}`,
  },
  marketIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  marketInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  marketTitle: {
    fontSize: '0.9375rem',
    color: colors.neutral800,
    lineHeight: 1.4,
  },
  marketDate: {
    fontSize: '0.8125rem',
    color: colors.neutral400,
  },

  // Page Notice
  pageNotice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '18px 22px',
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.lg,
    border: `1px solid ${colors.primary}20`,
  },
  noticeIcon: {
    fontSize: '18px',
    flexShrink: 0,
  },
};
