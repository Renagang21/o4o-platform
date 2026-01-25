/**
 * PharmacyB2BPage - B2B 구매 목록/상태 화면
 *
 * WO-KPA-PHARMACY-DEPTH-V1
 * - "구매한다"가 아니라 "우리 약국이 접근 가능한 B2B 구조를 본다"
 * - 역할별 버튼 분기 (개설약사: 구매/참여, 근무약사: 보기)
 */

import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import { useAuth, TestUser } from '../../contexts/AuthContext';
import { isPharmacyOwner, PharmacistFeeCategory } from '../../types';

// Mock 공급자 데이터
const mockSuppliers = [
  {
    id: 'supplier-1',
    name: '대웅제약',
    type: '제약사',
    category: '의약품',
    productCount: 156,
    lastOrder: '2025-01-15',
    status: 'active',
  },
  {
    id: 'supplier-2',
    name: '종근당건강',
    type: '건강기능식품',
    category: '건강식품',
    productCount: 89,
    lastOrder: '2025-01-10',
    status: 'active',
  },
  {
    id: 'supplier-3',
    name: '일동제약',
    type: '제약사',
    category: '의약품',
    productCount: 203,
    lastOrder: '2024-12-28',
    status: 'active',
  },
  {
    id: 'supplier-4',
    name: '한독',
    type: '제약사',
    category: '의약품',
    productCount: 178,
    lastOrder: null,
    status: 'pending',
  },
  {
    id: 'supplier-5',
    name: '메디팜',
    type: '도매상',
    category: '의약품/잡화',
    productCount: 2340,
    lastOrder: '2025-01-22',
    status: 'active',
  },
];

// Mock 약국 정보
const mockPharmacy = {
  name: '강남중앙약국',
};

export function PharmacyB2BPage() {
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
          <Link to="/pharmacy" style={styles.backLink}>← 돌아가기</Link>
          <div style={styles.headerMain}>
            <div style={styles.pharmacyInfo}>
              <h1 style={styles.pharmacyName}>{mockPharmacy.name}</h1>
              <span style={styles.subLabel}>· B2B 구매</span>
            </div>
            <div style={styles.roleInfo}>
              <span style={styles.roleBadge}>{roleLabel}</span>
            </div>
          </div>
        </div>
      </header>

      {/* 요약 정보 */}
      <section style={styles.summarySection}>
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <span style={styles.summaryIcon}>🏭</span>
            <div style={styles.summaryInfo}>
              <span style={styles.summaryValue}>{activeSuppliers.length}</span>
              <span style={styles.summaryLabel}>이용 중인 공급자</span>
            </div>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryIcon}>⏳</span>
            <div style={styles.summaryInfo}>
              <span style={styles.summaryValue}>{pendingSuppliers.length}</span>
              <span style={styles.summaryLabel}>승인 대기</span>
            </div>
          </div>
          <div style={styles.summaryCard}>
            <span style={styles.summaryIcon}>📦</span>
            <div style={styles.summaryInfo}>
              <span style={styles.summaryValue}>
                {mockSuppliers.reduce((sum, s) => sum + s.productCount, 0).toLocaleString()}
              </span>
              <span style={styles.summaryLabel}>접근 가능 상품</span>
            </div>
          </div>
        </div>
      </section>

      {/* 공급자 목록 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>이용 가능한 공급자</h2>
        <div style={styles.supplierList}>
          {mockSuppliers.map((supplier) => (
            <div key={supplier.id} style={styles.supplierCard}>
              <div style={styles.supplierHeader}>
                <div style={styles.supplierInfo}>
                  <h3 style={styles.supplierName}>{supplier.name}</h3>
                  <div style={styles.supplierMeta}>
                    <span style={styles.supplierType}>{supplier.type}</span>
                    <span style={styles.supplierDot}>·</span>
                    <span style={styles.supplierCategory}>{supplier.category}</span>
                  </div>
                </div>
                <span style={{
                  ...styles.statusBadge,
                  backgroundColor: supplier.status === 'active' ? '#dcfce7' : '#fef3c7',
                  color: supplier.status === 'active' ? '#166534' : '#92400e',
                }}>
                  {supplier.status === 'active' ? '이용중' : '승인대기'}
                </span>
              </div>
              <div style={styles.supplierBody}>
                <div style={styles.supplierStat}>
                  <span style={styles.supplierStatLabel}>상품 수</span>
                  <span style={styles.supplierStatValue}>{supplier.productCount.toLocaleString()}개</span>
                </div>
                {supplier.lastOrder && (
                  <div style={styles.supplierStat}>
                    <span style={styles.supplierStatLabel}>최근 주문</span>
                    <span style={styles.supplierStatValue}>{supplier.lastOrder}</span>
                  </div>
                )}
              </div>
              <div style={styles.supplierFooter}>
                {isOwner ? (
                  <>
                    <button style={styles.primaryButton}>
                      상품 보기
                    </button>
                    {supplier.status === 'active' && (
                      <button style={styles.secondaryButton}>
                        구매하기
                      </button>
                    )}
                  </>
                ) : (
                  <button style={styles.primaryButton}>
                    상품 보기
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 안내 */}
      <div style={styles.notice}>
        <span style={styles.noticeIcon}>ℹ️</span>
        <span style={styles.noticeText}>
          {isOwner
            ? 'B2B 공급자를 통해 약국 운영에 필요한 상품을 구매할 수 있습니다.'
            : 'B2B 공급자 및 상품 정보를 확인할 수 있습니다. 구매는 개설약사만 가능합니다.'}
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
    gap: '8px',
  },
  pharmacyName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subLabel: {
    fontSize: '1rem',
    color: colors.neutral500,
    fontWeight: 500,
  },
  roleInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  roleBadge: {
    padding: '4px 12px',
    backgroundColor: colors.primary + '15',
    color: colors.primary,
    borderRadius: '16px',
    fontSize: '0.75rem',
    fontWeight: 600,
  },

  // Summary
  summarySection: {
    marginBottom: '32px',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  },
  summaryCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  summaryIcon: {
    fontSize: '32px',
  },
  summaryInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  summaryValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: colors.neutral900,
  },
  summaryLabel: {
    fontSize: '0.875rem',
    color: colors.neutral500,
  },

  // Section
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '16px',
  },

  // Supplier List
  supplierList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '16px',
  },
  supplierCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  supplierHeader: {
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
    fontSize: '1rem',
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
  supplierDot: {},
  supplierCategory: {},
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
  },
  supplierBody: {
    display: 'flex',
    gap: '24px',
  },
  supplierStat: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  supplierStatLabel: {
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  supplierStatValue: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral700,
  },
  supplierFooter: {
    display: 'flex',
    gap: '8px',
    marginTop: 'auto',
  },
  primaryButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondaryButton: {
    flex: 1,
    padding: '10px 16px',
    backgroundColor: colors.white,
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
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
