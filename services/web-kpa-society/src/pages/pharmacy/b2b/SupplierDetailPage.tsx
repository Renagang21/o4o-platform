/**
 * SupplierDetailPage - B2B 공급자 상세
 *
 * WO-KPA-PHARMACY-B2B-FUNCTION-V1
 * - 공급자 기본 정보
 * - 공급 가능 품목 카테고리
 * - 거래 유형 표시 (일반 B2B / 공동구매 참여형)
 */

import { useParams, Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../../styles/theme';
import { useAuth, TestUser } from '../../../contexts/AuthContext';
import { isPharmacyOwner, PharmacistFeeCategory } from '../../../types';

// Mock 공급자 상세 데이터
const mockSupplierDetail = {
  id: 'supplier-1',
  name: '대웅제약',
  type: '제약사',
  category: '의약품',
  description: '1945년 설립된 국내 대표 제약사입니다. 전문의약품, 일반의약품, 건강기능식품 등 다양한 제품을 공급합니다.',
  status: 'active',
  rating: 4.8,
  reviewCount: 234,
  minOrderAmount: 100000,
  deliveryDays: '1-2일',
  tradeTypes: ['b2b', 'groupbuy'],
  categories: [
    { id: 'cat-1', name: '소화기계', productCount: 45 },
    { id: 'cat-2', name: '순환기계', productCount: 32 },
    { id: 'cat-3', name: '호흡기계', productCount: 28 },
    { id: 'cat-4', name: '비타민/미네랄', productCount: 51 },
  ],
  contact: {
    manager: '김대웅',
    phone: '02-1234-5678',
    email: 'partner@daewoong.co.kr',
  },
  recentProducts: [
    { id: 'prod-1', name: '우루사', spec: '100mg x 100정', price: 15000 },
    { id: 'prod-2', name: '베아제', spec: '50mg x 60정', price: 8500 },
    { id: 'prod-3', name: '이가탄', spec: '500mg x 30정', price: 12000 },
  ],
  activeGroupbuys: [
    { id: 'gb-1', productName: '우루사 100정', targetQty: 100, currentQty: 67, deadline: '2025-02-15' },
  ],
};

export function SupplierDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const { user } = useAuth();
  const testUser = user as TestUser | null;

  const userFeeCategory: PharmacistFeeCategory =
    testUser?.role === 'pharmacist' ? 'B1_pharmacy_employee' : 'A1_pharmacy_owner';
  const isOwner = isPharmacyOwner(userFeeCategory);
  const roleLabel = isOwner ? '개설약사' : '근무약사';

  // 실제로는 supplierId로 데이터 조회
  const supplier = mockSupplierDetail;

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <Link to="/store/products/suppliers" style={styles.backLink}>← 공급자 목록</Link>
          <div style={styles.headerMain}>
            <div style={styles.supplierHeader}>
              <h1 style={styles.supplierName}>{supplier.name}</h1>
              <div style={styles.supplierMeta}>
                <span style={styles.supplierType}>{supplier.type}</span>
                <span style={styles.dot}>·</span>
                <span style={styles.rating}>⭐ {supplier.rating} ({supplier.reviewCount})</span>
              </div>
            </div>
            <div style={styles.roleInfo}>
              <span style={styles.roleBadge}>{roleLabel}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <div style={styles.content}>
        {/* 좌측: 공급자 정보 */}
        <div style={styles.mainContent}>
          {/* 기본 정보 */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>공급자 정보</h2>
            <p style={styles.description}>{supplier.description}</p>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>거래 유형</span>
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
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>최소 주문금액</span>
                <span style={styles.infoValue}>{supplier.minOrderAmount.toLocaleString()}원</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>배송 소요</span>
                <span style={styles.infoValue}>{supplier.deliveryDays}</span>
              </div>
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>담당자</span>
                <span style={styles.infoValue}>{supplier.contact.manager}</span>
              </div>
            </div>
          </section>

          {/* 품목 카테고리 */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>공급 품목</h2>
            <div style={styles.categoryGrid}>
              {supplier.categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/store/products/suppliers/${supplierId}?category=${cat.id}`}
                  style={styles.categoryCard}
                >
                  <span style={styles.categoryName}>{cat.name}</span>
                  <span style={styles.categoryCount}>{cat.productCount}개</span>
                </Link>
              ))}
            </div>
            <Link
              to={`/store/products/suppliers/${supplierId}`}
              style={styles.viewAllLink}
            >
              전체 상품 보기 →
            </Link>
          </section>

          {/* 인기 상품 */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>인기 상품</h2>
            <div style={styles.productList}>
              {supplier.recentProducts.map((product) => (
                <div key={product.id} style={styles.productItem}>
                  <div style={styles.productInfo}>
                    <span style={styles.productName}>{product.name}</span>
                    <span style={styles.productSpec}>{product.spec}</span>
                  </div>
                  <span style={styles.productPrice}>
                    {product.price.toLocaleString()}원
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 우측: 사이드바 */}
        <div style={styles.sidebar}>
          {/* 진행중 공동구매 */}
          {supplier.activeGroupbuys.length > 0 && (
            <section style={styles.sideCard}>
              <h3 style={styles.sideCardTitle}>🔥 진행중 공동구매</h3>
              {supplier.activeGroupbuys.map((gb) => (
                <div key={gb.id} style={styles.groupbuyItem}>
                  <span style={styles.groupbuyName}>{gb.productName}</span>
                  <div style={styles.progressSection}>
                    <div style={styles.progressBar}>
                      <div
                        style={{
                          ...styles.progressFill,
                          width: `${(gb.currentQty / gb.targetQty) * 100}%`,
                        }}
                      />
                    </div>
                    <span style={styles.progressText}>
                      {gb.currentQty}/{gb.targetQty}
                    </span>
                  </div>
                  <span style={styles.groupbuyDeadline}>
                    마감: {gb.deadline}
                  </span>
                  {isOwner ? (
                    <Link
                      to={`/groupbuy/${gb.id}`}
                      style={styles.joinButton}
                    >
                      참여하기
                    </Link>
                  ) : (
                    <span style={styles.viewOnlyNotice}>
                      열람 전용 (개설약사만 참여 가능)
                    </span>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* 빠른 액션 */}
          <section style={styles.sideCard}>
            <h3 style={styles.sideCardTitle}>빠른 액션</h3>
            <div style={styles.actionButtons}>
              <Link
                to={`/store/products/suppliers/${supplierId}`}
                style={styles.actionButton}
              >
                📦 상품 목록
              </Link>
              {supplier.tradeTypes.includes('groupbuy') && (
                <Link
                  to={`/groupbuy?supplier=${supplierId}`}
                  style={styles.actionButton}
                >
                  🛒 공동구매 보기
                </Link>
              )}
            </div>
          </section>

          {/* 연락처 */}
          <section style={styles.sideCard}>
            <h3 style={styles.sideCardTitle}>공급자 연락처</h3>
            <div style={styles.contactInfo}>
              <div style={styles.contactItem}>
                <span style={styles.contactLabel}>담당자</span>
                <span style={styles.contactValue}>{supplier.contact.manager}</span>
              </div>
              <div style={styles.contactItem}>
                <span style={styles.contactLabel}>전화</span>
                <span style={styles.contactValue}>{supplier.contact.phone}</span>
              </div>
              <div style={styles.contactItem}>
                <span style={styles.contactLabel}>이메일</span>
                <span style={styles.contactValue}>{supplier.contact.email}</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* 안내 */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>ℹ️</span>
        <span style={styles.noticeText}>
          {isOwner
            ? '상품을 선택하여 구매하거나 공동구매에 참여할 수 있습니다.'
            : '상품 정보를 확인할 수 있습니다. 구매 및 공동구매 참여는 개설약사만 가능합니다.'}
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
    alignItems: 'flex-start',
  },
  supplierHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  supplierName: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  supplierMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.875rem',
    color: colors.neutral600,
  },
  supplierType: {},
  dot: {},
  rating: {},
  roleInfo: {},
  roleBadge: {
    padding: '4px 12px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    borderRadius: '16px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },

  // Content Layout
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '24px',
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  // Cards
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '24px',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 16px 0',
  },
  description: {
    fontSize: '0.9375rem',
    color: colors.neutral700,
    lineHeight: 1.6,
    margin: '0 0 20px 0',
  },

  // Info Grid
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  infoValue: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: colors.neutral800,
  },
  tradeTypes: {
    display: 'flex',
    gap: '8px',
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

  // Category Grid
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  },
  categoryCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    textDecoration: 'none',
    color: 'inherit',
  },
  categoryName: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: colors.neutral800,
  },
  categoryCount: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  viewAllLink: {
    display: 'inline-block',
    color: colors.primary,
    fontSize: '0.875rem',
    fontWeight: 500,
    textDecoration: 'none',
  },

  // Product List
  productList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  productItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
  },
  productInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  productName: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: colors.neutral800,
  },
  productSpec: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  productPrice: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: colors.primary,
  },

  // Side Cards
  sideCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '20px',
  },
  sideCardTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 16px 0',
  },

  // Groupbuy
  groupbuyItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  groupbuyName: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: colors.neutral800,
  },
  progressSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  progressBar: {
    flex: 1,
    height: '8px',
    backgroundColor: colors.neutral200,
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: '4px',
  },
  progressText: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: colors.neutral600,
    minWidth: '50px',
  },
  groupbuyDeadline: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  joinButton: {
    display: 'block',
    width: '100%',
    padding: '10px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
    textAlign: 'center',
    textDecoration: 'none',
    marginTop: '4px',
  },
  viewOnlyNotice: {
    fontSize: '0.75rem',
    color: colors.neutral400,
    textAlign: 'center',
    padding: '8px',
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.sm,
    marginTop: '4px',
  },

  // Action Buttons
  actionButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: colors.gray100,
    color: colors.neutral800,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
    textDecoration: 'none',
  },

  // Contact
  contactInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contactItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactLabel: {
    fontSize: '0.8125rem',
    color: colors.neutral500,
  },
  contactValue: {
    fontSize: '0.875rem',
    color: colors.neutral800,
  },

  // Notice
  notice: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '16px 20px',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    marginTop: '24px',
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
