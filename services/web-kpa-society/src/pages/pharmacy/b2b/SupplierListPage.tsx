/**
 * SupplierListPage - B2B 공급자 목록
 *
 * WO-KPA-PHARMACY-B2B-FUNCTION-V1
 * - 약국이 접근 가능한 공급자 목록
 * - 공급자별 거래 유형 표시 (일반 B2B / 공동구매 참여형)
 */

import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../../styles/theme';
import { useAuth, TestUser } from '../../../contexts/AuthContext';
import { isPharmacyOwner, PharmacistFeeCategory } from '../../../types';

// Mock 공급자 데이터
const mockSuppliers = [
  {
    id: 'supplier-1',
    name: '대웅제약',
    type: '제약사',
    category: '의약품',
    description: '국내 대표 제약사, 다양한 전문의약품 공급',
    productCount: 156,
    tradeTypes: ['b2b', 'groupbuy'],
    status: 'active',
    rating: 4.8,
    minOrderAmount: 100000,
  },
  {
    id: 'supplier-2',
    name: '종근당건강',
    type: '건강기능식품',
    category: '건강식품',
    description: '건강기능식품 전문 공급사',
    productCount: 89,
    tradeTypes: ['b2b'],
    status: 'active',
    rating: 4.5,
    minOrderAmount: 50000,
  },
  {
    id: 'supplier-3',
    name: '일동제약',
    type: '제약사',
    category: '의약품',
    description: '아로나민 등 인기 의약품 공급',
    productCount: 203,
    tradeTypes: ['b2b', 'groupbuy'],
    status: 'active',
    rating: 4.7,
    minOrderAmount: 150000,
  },
  {
    id: 'supplier-4',
    name: '한독',
    type: '제약사',
    category: '의약품',
    description: '다국적 제약사 파트너십 기반 의약품 공급',
    productCount: 178,
    tradeTypes: ['b2b'],
    status: 'pending',
    rating: 4.6,
    minOrderAmount: 200000,
  },
  {
    id: 'supplier-5',
    name: '메디팜',
    type: '도매상',
    category: '의약품/잡화',
    description: '약국 운영물품 종합 도매',
    productCount: 2340,
    tradeTypes: ['b2b', 'groupbuy'],
    status: 'active',
    rating: 4.3,
    minOrderAmount: 30000,
  },
  {
    id: 'supplier-6',
    name: '팜스토어',
    type: '도매상',
    category: '약국잡화',
    description: '약국 인테리어/소모품 전문',
    productCount: 567,
    tradeTypes: ['groupbuy'],
    status: 'active',
    rating: 4.4,
    minOrderAmount: 50000,
  },
];

// Mock 약국 정보
const mockPharmacy = {
  name: '강남중앙약국',
};

export function SupplierListPage() {
  const { user } = useAuth();
  const testUser = user as TestUser | null;

  const userFeeCategory: PharmacistFeeCategory =
    testUser?.role === 'pharmacist' ? 'B1_pharmacy_employee' : 'A1_pharmacy_owner';
  const isOwner = isPharmacyOwner(userFeeCategory);
  const roleLabel = isOwner ? '개설약사' : '근무약사';

  const activeSuppliers = mockSuppliers.filter(s => s.status === 'active');
  const pendingSuppliers = mockSuppliers.filter(s => s.status === 'pending');

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/pharmacy/b2b" style={styles.backLink}>← B2B 구매</Link>
          <div style={styles.headerMain}>
            <div style={styles.pharmacyInfo}>
              <h1 style={styles.pageTitle}>공급자 목록</h1>
              <span style={styles.subLabel}>{mockPharmacy.name}</span>
            </div>
            <div style={styles.roleInfo}>
              <span style={styles.roleBadge}>{roleLabel}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 필터/검색 */}
      <div style={styles.filterSection}>
        <div style={styles.filterRow}>
          <select style={styles.filterSelect}>
            <option value="all">전체 거래유형</option>
            <option value="b2b">일반 B2B</option>
            <option value="groupbuy">공동구매</option>
          </select>
          <select style={styles.filterSelect}>
            <option value="all">전체 카테고리</option>
            <option value="medicine">의약품</option>
            <option value="health">건강식품</option>
            <option value="supplies">약국잡화</option>
          </select>
          <input
            type="text"
            placeholder="공급자 검색..."
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* 활성 공급자 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>이용 가능한 공급자 ({activeSuppliers.length})</h2>
        <div style={styles.supplierGrid}>
          {activeSuppliers.map((supplier) => (
            <Link
              key={supplier.id}
              to={`/pharmacy/b2b/suppliers/${supplier.id}`}
              style={styles.supplierCard}
            >
              <div style={styles.cardHeader}>
                <div style={styles.supplierInfo}>
                  <h3 style={styles.supplierName}>{supplier.name}</h3>
                  <div style={styles.supplierMeta}>
                    <span style={styles.supplierType}>{supplier.type}</span>
                    <span style={styles.dot}>·</span>
                    <span style={styles.supplierCategory}>{supplier.category}</span>
                  </div>
                </div>
                <div style={styles.ratingBadge}>
                  ⭐ {supplier.rating}
                </div>
              </div>
              <p style={styles.supplierDesc}>{supplier.description}</p>
              <div style={styles.cardStats}>
                <div style={styles.stat}>
                  <span style={styles.statValue}>{supplier.productCount.toLocaleString()}</span>
                  <span style={styles.statLabel}>상품</span>
                </div>
                <div style={styles.stat}>
                  <span style={styles.statValue}>{(supplier.minOrderAmount / 10000)}만원</span>
                  <span style={styles.statLabel}>최소주문</span>
                </div>
              </div>
              <div style={styles.tradeTypes}>
                {supplier.tradeTypes.includes('b2b') && (
                  <span style={styles.tradeTypeBadge}>일반 B2B</span>
                )}
                {supplier.tradeTypes.includes('groupbuy') && (
                  <span style={{ ...styles.tradeTypeBadge, ...styles.groupbuyBadge }}>
                    공동구매
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 승인 대기 공급자 */}
      {pendingSuppliers.length > 0 && (
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>승인 대기 ({pendingSuppliers.length})</h2>
          <div style={styles.supplierGrid}>
            {pendingSuppliers.map((supplier) => (
              <div key={supplier.id} style={{ ...styles.supplierCard, opacity: 0.7 }}>
                <div style={styles.cardHeader}>
                  <div style={styles.supplierInfo}>
                    <h3 style={styles.supplierName}>{supplier.name}</h3>
                    <div style={styles.supplierMeta}>
                      <span style={styles.supplierType}>{supplier.type}</span>
                      <span style={styles.dot}>·</span>
                      <span style={styles.supplierCategory}>{supplier.category}</span>
                    </div>
                  </div>
                  <span style={styles.pendingBadge}>승인대기</span>
                </div>
                <p style={styles.supplierDesc}>{supplier.description}</p>
                <div style={styles.pendingNotice}>
                  공급자 승인이 완료되면 거래를 시작할 수 있습니다.
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 안내 */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>ℹ️</span>
        <span style={styles.noticeText}>
          {isOwner
            ? '공급자를 선택하여 상품을 확인하고 구매 또는 공동구매에 참여할 수 있습니다.'
            : '공급자 및 상품 정보를 확인할 수 있습니다. 구매 및 공동구매 참여는 개설약사만 가능합니다.'}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
  },
  header: {
    marginBottom: '24px',
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
    alignItems: 'baseline',
    gap: '12px',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subLabel: {
    fontSize: '0.875rem',
    color: colors.neutral500,
  },
  roleInfo: {
    display: 'flex',
    alignItems: 'center',
  },
  roleBadge: {
    padding: '4px 12px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    borderRadius: '16px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },

  // Filter
  filterSection: {
    marginBottom: '24px',
  },
  filterRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  filterSelect: {
    padding: '10px 16px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    backgroundColor: colors.white,
    cursor: 'pointer',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '10px 16px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
  },

  // Section
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '16px',
  },

  // Supplier Grid
  supplierGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  supplierCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '20px',
    textDecoration: 'none',
    color: 'inherit',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    transition: 'box-shadow 0.2s, transform 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  supplierInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  supplierName: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  supplierMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  supplierType: {},
  dot: {},
  supplierCategory: {},
  ratingBadge: {
    padding: '4px 8px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  pendingBadge: {
    padding: '4px 8px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  supplierDesc: {
    fontSize: '0.875rem',
    color: colors.neutral600,
    margin: 0,
    lineHeight: 1.5,
  },
  cardStats: {
    display: 'flex',
    gap: '24px',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  statValue: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral800,
  },
  statLabel: {
    fontSize: '0.75rem',
    color: colors.neutral500,
  },
  tradeTypes: {
    display: 'flex',
    gap: '8px',
    marginTop: 'auto',
  },
  tradeTypeBadge: {
    padding: '4px 10px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  groupbuyBadge: {
    backgroundColor: colors.primary + '15',
    color: colors.primary,
  },
  pendingNotice: {
    padding: '12px',
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.md,
    fontSize: '0.8125rem',
    color: colors.neutral600,
    textAlign: 'center',
  },

  // Notice
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '16px 20px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  noticeIcon: {
    fontSize: '16px',
    flexShrink: 0,
  },
  noticeText: {
    fontSize: '0.875rem',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
};
