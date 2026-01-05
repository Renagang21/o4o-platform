/**
 * ProcurementHomePage - B2B 조달 홈
 * 카테고리 진입점 + 자격 안내
 */

import { Link } from 'react-router-dom';
import type { ProductCategory, BuyerStatus } from '../../types';

// Mock 데이터
const mockCategories: ProductCategory[] = [
  {
    id: 'cosmetics',
    name: '화장품',
    description: '기초화장품, 기능성화장품',
    icon: '💄',
    requiredBuyerTypes: ['general', 'pharmacy', 'medical'],
  },
  {
    id: 'pharmacy',
    name: '약국제품',
    description: '의약품, 의약외품, 건강기능식품',
    icon: '💊',
    requiredBuyerTypes: ['pharmacy'],
  },
  {
    id: 'supplies',
    name: '사업자 공통',
    description: '사무용품, 포장재',
    icon: '📦',
    requiredBuyerTypes: ['general', 'pharmacy', 'medical'],
  },
];

// Mock 구매자 상태 (실제로는 AuthContext에서 가져옴)
const mockBuyerStatus: BuyerStatus = 'unverified';

interface CategoryCardProps {
  category: ProductCategory;
  buyerStatus: BuyerStatus;
  buyerType?: string;
}

function CategoryCard({ category, buyerStatus }: CategoryCardProps) {
  const isAccessible = buyerStatus === 'verified';

  return (
    <Link
      to={isAccessible ? `/procurement/category/${category.id}` : '#'}
      style={{
        ...styles.categoryCard,
        opacity: isAccessible ? 1 : 0.7,
        cursor: isAccessible ? 'pointer' : 'not-allowed',
      }}
      onClick={(e) => !isAccessible && e.preventDefault()}
    >
      <span style={styles.categoryIcon}>{category.icon}</span>
      <h3 style={styles.categoryName}>{category.name}</h3>
      <p style={styles.categoryDesc}>{category.description}</p>
      {!isAccessible && (
        <span style={styles.lockBadge}>
          🔒 인증 필요
        </span>
      )}
    </Link>
  );
}

export function ProcurementHomePage() {
  const buyerStatus = mockBuyerStatus;
  const isVerified = buyerStatus === 'verified';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>B2B 조달</h1>
        <p style={styles.subtitle}>사업자를 위한 상품 조달</p>
      </div>

      {/* 미인증 배너 */}
      {!isVerified && (
        <div style={styles.alertBanner}>
          <span style={styles.alertIcon}>ℹ️</span>
          <div style={styles.alertContent}>
            <strong>사업자 인증이 필요합니다</strong>
            <p style={styles.alertText}>
              B2B 조달 서비스는 인증된 사업자만 이용할 수 있습니다.
            </p>
          </div>
          <Link to="/procurement/verify" style={styles.alertCta}>
            사업자 인증하기
          </Link>
        </div>
      )}

      {/* 카테고리 그리드 */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>카테고리</h2>
        <div style={styles.categoryGrid}>
          {mockCategories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              buyerStatus={buyerStatus}
            />
          ))}
        </div>
      </div>

      {/* 안내 문구 */}
      <div style={styles.infoSection}>
        <h3 style={styles.infoTitle}>B2B 조달 안내</h3>
        <ul style={styles.infoList}>
          <li>사업자 인증 후 상품 열람 및 주문이 가능합니다.</li>
          <li>모든 거래는 세금계산서 발행 대상입니다.</li>
          <li>약국 전용 상품은 약국 인증이 필요합니다.</li>
        </ul>
      </div>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: 0,
  },
  alertBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: '#FEF3C7',
    border: '1px solid #FCD34D',
    borderRadius: '8px',
    marginBottom: '32px',
  },
  alertIcon: {
    fontSize: '24px',
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    fontSize: '13px',
    color: '#92400E',
    margin: '4px 0 0 0',
  },
  alertCta: {
    padding: '10px 20px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '6px',
    textDecoration: 'none',
  },
  section: {
    marginBottom: '40px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    marginBottom: '20px',
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  categoryCard: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 20px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    textDecoration: 'none',
    transition: 'box-shadow 0.2s',
  },
  categoryIcon: {
    fontSize: '40px',
    marginBottom: '16px',
  },
  categoryName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 8px 0',
  },
  categoryDesc: {
    fontSize: '13px',
    color: '#64748b',
    textAlign: 'center',
    margin: 0,
  },
  lockBadge: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    fontSize: '12px',
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  infoSection: {
    padding: '24px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  infoTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 12px 0',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '14px',
    color: '#475569',
    lineHeight: 1.8,
  },
};
