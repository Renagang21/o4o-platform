/**
 * SupplierProductsPage - 공급자 제품 관리
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.2
 *
 * 표시 항목:
 * - 제품명
 * - 제품 목적 (CATALOG / APPLICATION / ACTIVE_SALES)
 * - 현재 사용 중인 서비스 수
 * - 신청 대기 건수
 *
 * 허용 액션:
 * - 제품 활성/비활성 전환
 * - 판매자 신청 허용 여부 토글
 *
 * 금지:
 * - 판매자 매장 직접 수정
 * - 가격/재고 직접 조정
 */

import { useState, useEffect } from 'react';
import { Package, Users, Clock, ToggleLeft, ToggleRight, AlertCircle } from 'lucide-react';
import { supplierApi, type SupplierProduct, type SupplierProductPurpose } from '../../lib/api';

const PURPOSE_CONFIG: Record<SupplierProductPurpose, { label: string; color: string; bgColor: string }> = {
  CATALOG: { label: '정보 제공', color: '#64748b', bgColor: '#f1f5f9' },
  APPLICATION: { label: '신청 가능', color: '#2563eb', bgColor: '#dbeafe' },
  ACTIVE_SALES: { label: '판매 중', color: '#16a34a', bgColor: '#dcfce7' },
};

export default function SupplierProductsPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const data = await supplierApi.getProducts();
      setProducts(data);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const handleToggleActive = async (productId: string, currentValue: boolean) => {
    setUpdating(productId);
    const result = await supplierApi.updateProduct(productId, { isActive: !currentValue });
    if (result.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, isActive: !currentValue } : p))
      );
    }
    setUpdating(null);
  };

  const handleToggleApplications = async (productId: string, currentValue: boolean) => {
    setUpdating(productId);
    const result = await supplierApi.updateProduct(productId, { acceptsApplications: !currentValue });
    if (result.success) {
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, acceptsApplications: !currentValue } : p))
      );
    }
    setUpdating(null);
  };

  const stats = {
    total: products.length,
    active: products.filter((p) => p.isActive).length,
    pendingTotal: products.reduce((sum, p) => sum + p.pendingRequestCount, 0),
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>내 제품 관리</h1>
        <p style={styles.subtitle}>
          공급하는 제품을 관리하고, 판매자 신청 허용 여부를 설정합니다.
        </p>
      </div>

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <Package size={24} style={{ color: '#3b82f6' }} />
          <div>
            <p style={styles.statValue}>{stats.total}</p>
            <p style={styles.statLabel}>전체 제품</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <ToggleRight size={24} style={{ color: '#16a34a' }} />
          <div>
            <p style={styles.statValue}>{stats.active}</p>
            <p style={styles.statLabel}>활성 제품</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Clock size={24} style={{ color: '#f59e0b' }} />
          <div>
            <p style={styles.statValue}>{stats.pendingTotal}</p>
            <p style={styles.statLabel}>대기 중 신청</p>
          </div>
        </div>
      </div>

      {/* Notice */}
      <div style={styles.noticeBox}>
        <AlertCircle size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
        <p style={styles.noticeText}>
          제품 가격 및 재고는 각 서비스에서 관리됩니다. Neture에서는 활성화 상태와 신청 허용 여부만 설정할 수 있습니다.
        </p>
      </div>

      {/* Product List */}
      {loading ? (
        <div style={styles.loading}>로딩 중...</div>
      ) : products.length === 0 ? (
        <div style={styles.emptyState}>
          <Package size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <p>등록된 제품이 없습니다.</p>
        </div>
      ) : (
        <div style={styles.productList}>
          {products.map((product) => {
            const purposeConfig = PURPOSE_CONFIG[product.purpose];
            const isUpdating = updating === product.id;

            return (
              <div key={product.id} style={styles.productCard}>
                {/* Product Info */}
                <div style={styles.productInfo}>
                  <div style={styles.productHeader}>
                    <h3 style={styles.productName}>{product.name}</h3>
                    <span
                      style={{
                        ...styles.purposeBadge,
                        backgroundColor: purposeConfig.bgColor,
                        color: purposeConfig.color,
                      }}
                    >
                      {purposeConfig.label}
                    </span>
                  </div>
                  {product.category && (
                    <p style={styles.productCategory}>{product.category}</p>
                  )}
                  <div style={styles.productStats}>
                    <span style={styles.productStat}>
                      <Users size={14} />
                      {product.activeServiceCount}개 서비스 사용 중
                    </span>
                    {product.pendingRequestCount > 0 && (
                      <span style={{ ...styles.productStat, color: '#f59e0b' }}>
                        <Clock size={14} />
                        {product.pendingRequestCount}건 대기
                      </span>
                    )}
                  </div>
                </div>

                {/* Toggles */}
                <div style={styles.toggleSection}>
                  {/* Active Toggle */}
                  <div style={styles.toggleRow}>
                    <span style={styles.toggleLabel}>제품 활성화</span>
                    <button
                      onClick={() => handleToggleActive(product.id, product.isActive)}
                      disabled={isUpdating}
                      style={{
                        ...styles.toggleButton,
                        opacity: isUpdating ? 0.5 : 1,
                      }}
                    >
                      {product.isActive ? (
                        <ToggleRight size={28} style={{ color: '#16a34a' }} />
                      ) : (
                        <ToggleLeft size={28} style={{ color: '#94a3b8' }} />
                      )}
                    </button>
                  </div>

                  {/* Applications Toggle */}
                  <div style={styles.toggleRow}>
                    <span style={styles.toggleLabel}>신청 허용</span>
                    <button
                      onClick={() => handleToggleApplications(product.id, product.acceptsApplications)}
                      disabled={isUpdating}
                      style={{
                        ...styles.toggleButton,
                        opacity: isUpdating ? 0.5 : 1,
                      }}
                    >
                      {product.acceptsApplications ? (
                        <ToggleRight size={28} style={{ color: '#16a34a' }} />
                      ) : (
                        <ToggleLeft size={28} style={{ color: '#94a3b8' }} />
                      )}
                    </button>
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  noticeBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '24px',
  },
  noticeText: {
    fontSize: '13px',
    color: '#1e40af',
    margin: 0,
    lineHeight: 1.5,
  },
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px',
    color: '#94a3b8',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  productList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  productCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px 24px',
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px',
  },
  productName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  purposeBadge: {
    fontSize: '11px',
    fontWeight: 500,
    padding: '3px 8px',
    borderRadius: '4px',
  },
  productCategory: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  productStats: {
    display: 'flex',
    gap: '16px',
  },
  productStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    color: '#64748b',
  },
  toggleSection: {
    display: 'flex',
    gap: '24px',
  },
  toggleRow: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
  },
  toggleLabel: {
    fontSize: '11px',
    color: '#64748b',
    fontWeight: 500,
  },
  toggleButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
  },
};
