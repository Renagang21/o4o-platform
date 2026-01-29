/**
 * MyHandledProductsPage - 내 취급 상품
 *
 * Work Order: WO-S2S-FLOW-RECOVERY-PHASE3-V1 T2
 *
 * 판매자가 승인받은 취급 상품 목록을 조회하는 페이지
 * - sellerApi.getMyApprovedProducts() 호출
 * - 공급자명, 상품명, 카테고리, 서비스, 승인일 표시
 */

import { useState, useEffect } from 'react';
import { Package, Building2, Calendar, Tag, Layers, AlertCircle, Loader2 } from 'lucide-react';
import { sellerApi, type SellerApprovedProduct } from '../../lib/api';

const SERVICE_ICONS: Record<string, string> = {
  glycopharm: '🏥',
  'k-cosmetics': '💄',
  glucoseview: '📊',
};

const PURPOSE_LABELS: Record<string, { label: string; color: string; bgColor: string }> = {
  CATALOG: { label: '카탈로그', color: '#6366f1', bgColor: '#eef2ff' },
  APPLICATION: { label: '신청 가능', color: '#b45309', bgColor: '#fef3c7' },
  ACTIVE_SALES: { label: '판매 중', color: '#15803d', bgColor: '#dcfce7' },
};

export default function MyHandledProductsPage() {
  const [products, setProducts] = useState<SellerApprovedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      const result = await sellerApi.getMyApprovedProducts();
      if (result.success && result.data) {
        setProducts(result.data);
      } else {
        setError(result.error || '상품 목록을 불러오지 못했습니다.');
      }
      setLoading(false);
    };
    fetchProducts();
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>내 취급 상품</h1>
        <p style={styles.subtitle}>
          공급자로부터 승인받은 취급 상품 목록입니다.
        </p>
      </div>

      {/* Summary */}
      <div style={styles.summary}>
        <div style={styles.summaryItem}>
          <Package size={20} style={{ color: '#6366f1' }} />
          <span style={styles.summaryLabel}>총 취급 상품</span>
          <span style={styles.summaryValue}>{products.length}개</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={styles.center}>
          <Loader2 size={32} style={{ color: '#6366f1', animation: 'spin 1s linear infinite' }} />
          <p style={styles.loadingText}>상품 목록을 불러오는 중...</p>
        </div>
      ) : error ? (
        <div style={styles.errorBox}>
          <AlertCircle size={20} style={{ color: '#dc2626' }} />
          <span>{error}</span>
        </div>
      ) : products.length === 0 ? (
        <div style={styles.emptyBox}>
          <Package size={48} style={{ color: '#cbd5e1' }} />
          <p style={styles.emptyTitle}>취급 상품이 없습니다</p>
          <p style={styles.emptyDesc}>
            공급자에게 취급 요청을 보내고 승인을 받으면 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {products.map((product) => {
            const purposeConfig = PURPOSE_LABELS[product.productPurpose] || PURPOSE_LABELS.CATALOG;
            const serviceIcon = SERVICE_ICONS[product.serviceId] || '📦';

            return (
              <div key={product.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardHeaderLeft}>
                    <span style={styles.serviceIcon}>{serviceIcon}</span>
                    <span style={styles.serviceName}>{product.serviceName}</span>
                  </div>
                  <span
                    style={{
                      ...styles.purposeBadge,
                      color: purposeConfig.color,
                      backgroundColor: purposeConfig.bgColor,
                    }}
                  >
                    {purposeConfig.label}
                  </span>
                </div>

                <h3 style={styles.productName}>{product.productName}</h3>

                <div style={styles.cardDetails}>
                  <div style={styles.detailRow}>
                    <Building2 size={14} style={{ color: '#94a3b8' }} />
                    <span style={styles.detailLabel}>공급자</span>
                    <span style={styles.detailValue}>{product.supplierName || '-'}</span>
                  </div>
                  {product.productCategory && (
                    <div style={styles.detailRow}>
                      <Tag size={14} style={{ color: '#94a3b8' }} />
                      <span style={styles.detailLabel}>카테고리</span>
                      <span style={styles.detailValue}>{product.productCategory}</span>
                    </div>
                  )}
                  <div style={styles.detailRow}>
                    <Layers size={14} style={{ color: '#94a3b8' }} />
                    <span style={styles.detailLabel}>용도</span>
                    <span style={styles.detailValue}>{purposeConfig.label}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <Calendar size={14} style={{ color: '#94a3b8' }} />
                    <span style={styles.detailLabel}>승인일</span>
                    <span style={styles.detailValue}>
                      {product.approvedAt
                        ? new Date(product.approvedAt).toLocaleDateString('ko-KR')
                        : '-'}
                    </span>
                  </div>
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
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  summary: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
  },
  summaryItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  summaryLabel: {
    fontSize: '14px',
    color: '#64748b',
  },
  summaryValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#1e293b',
  },
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 0',
    gap: '12px',
  },
  loadingText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#fef2f2',
    borderRadius: '12px',
    border: '1px solid #fecaca',
    color: '#dc2626',
    fontSize: '14px',
  },
  emptyBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 0',
    gap: '8px',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#475569',
    margin: 0,
  },
  emptyDesc: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '16px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    transition: 'box-shadow 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  serviceIcon: {
    fontSize: '16px',
  },
  serviceName: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: 500,
  },
  purposeBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '6px',
  },
  productName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 16px 0',
  },
  cardDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  detailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
  },
  detailLabel: {
    color: '#94a3b8',
    minWidth: '48px',
  },
  detailValue: {
    color: '#475569',
    fontWeight: 500,
  },
};
