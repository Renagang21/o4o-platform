/**
 * SupplierProductsPage - 공급자 제품 관리
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0 §3.2
 * Extended: WO-NETURE-PRODUCT-DISTRIBUTION-POLICY-V1
 *
 * 표시 항목:
 * - 제품명
 * - 제품 목적 (CATALOG / APPLICATION / ACTIVE_SALES)
 * - 현재 사용 중인 서비스 수
 * - 신청 대기 건수
 * - 유통 정책 (PUBLIC / PRIVATE)
 *
 * 허용 액션:
 * - 제품 활성/비활성 전환
 * - 판매자 신청 허용 여부 토글
 * - 유통 정책 변경 (PUBLIC ↔ PRIVATE + 판매자 지정)
 *
 * 금지:
 * - 판매자 매장 직접 수정
 * - 가격/재고 직접 조정
 */

import { useState, useEffect } from 'react';
import { Package, Users, Clock, ToggleLeft, ToggleRight, AlertCircle, Globe, Lock, X, Check } from 'lucide-react';
import { supplierApi, type SupplierProduct, type SupplierProductPurpose, type DistributionType } from '../../lib/api';

const PURPOSE_CONFIG: Record<SupplierProductPurpose, { label: string; color: string; bgColor: string }> = {
  CATALOG: { label: '정보 제공', color: '#64748b', bgColor: '#f1f5f9' },
  APPLICATION: { label: '신청 가능', color: '#2563eb', bgColor: '#dbeafe' },
  ACTIVE_SALES: { label: '판매 중', color: '#16a34a', bgColor: '#dcfce7' },
};

export default function SupplierProductsPage() {
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingDistribution, setEditingDistribution] = useState<string | null>(null);
  const [editDistType, setEditDistType] = useState<DistributionType>('PUBLIC');
  const [editSellerIds, setEditSellerIds] = useState('');

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

  const openDistributionEditor = (product: SupplierProduct) => {
    setEditingDistribution(product.id);
    setEditDistType(product.distributionType || 'PUBLIC');
    setEditSellerIds(product.allowedSellerIds?.join(', ') || '');
  };

  const handleSaveDistribution = async (productId: string) => {
    setUpdating(productId);
    const allowedSellerIds = editDistType === 'PRIVATE'
      ? editSellerIds.split(',').map((s) => s.trim()).filter(Boolean)
      : null;

    const result = await supplierApi.updateProduct(productId, {
      distributionType: editDistType,
      allowedSellerIds,
    });

    if (result.success) {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? { ...p, distributionType: editDistType, allowedSellerIds }
            : p
        )
      );
      setEditingDistribution(null);
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
            const isEditingDist = editingDistribution === product.id;
            const isPrivate = product.distributionType === 'PRIVATE';

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
                    <span
                      style={{
                        ...styles.purposeBadge,
                        backgroundColor: isPrivate ? '#fef3c7' : '#ecfdf5',
                        color: isPrivate ? '#92400e' : '#065f46',
                        cursor: 'pointer',
                      }}
                      onClick={() => openDistributionEditor(product)}
                    >
                      {isPrivate ? (
                        <><Lock size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />비공개</>
                      ) : (
                        <><Globe size={10} style={{ marginRight: '3px', verticalAlign: 'middle' }} />공개</>
                      )}
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

                  {/* Distribution Editor (inline) */}
                  {isEditingDist && (
                    <div style={styles.distEditor}>
                      <p style={styles.distEditorTitle}>유통 정책 설정</p>
                      <div style={styles.distRadioGroup}>
                        <label style={styles.distRadioLabel}>
                          <input
                            type="radio"
                            name={`dist-${product.id}`}
                            value="PUBLIC"
                            checked={editDistType === 'PUBLIC'}
                            onChange={() => setEditDistType('PUBLIC')}
                          />
                          <Globe size={14} style={{ color: '#065f46' }} />
                          <span>공개 (HUB에 노출)</span>
                        </label>
                        <label style={styles.distRadioLabel}>
                          <input
                            type="radio"
                            name={`dist-${product.id}`}
                            value="PRIVATE"
                            checked={editDistType === 'PRIVATE'}
                            onChange={() => setEditDistType('PRIVATE')}
                          />
                          <Lock size={14} style={{ color: '#92400e' }} />
                          <span>비공개 (지정 판매자만)</span>
                        </label>
                      </div>
                      {editDistType === 'PRIVATE' && (
                        <div style={{ marginTop: '8px' }}>
                          <label style={styles.distInputLabel}>
                            지정 판매자 ID (쉼표로 구분)
                          </label>
                          <textarea
                            value={editSellerIds}
                            onChange={(e) => setEditSellerIds(e.target.value)}
                            placeholder="판매자 UUID를 입력하세요..."
                            style={styles.distTextarea}
                            rows={2}
                          />
                        </div>
                      )}
                      <div style={styles.distActions}>
                        <button
                          onClick={() => setEditingDistribution(null)}
                          style={styles.distCancelBtn}
                        >
                          <X size={14} /> 취소
                        </button>
                        <button
                          onClick={() => handleSaveDistribution(product.id)}
                          disabled={isUpdating || (editDistType === 'PRIVATE' && !editSellerIds.trim())}
                          style={{
                            ...styles.distSaveBtn,
                            opacity: isUpdating || (editDistType === 'PRIVATE' && !editSellerIds.trim()) ? 0.5 : 1,
                          }}
                        >
                          <Check size={14} /> {isUpdating ? '저장 중...' : '저장'}
                        </button>
                      </div>
                    </div>
                  )}
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
    alignItems: 'flex-start',
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
  distEditor: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  },
  distEditorTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 8px 0',
  },
  distRadioGroup: {
    display: 'flex',
    gap: '16px',
  },
  distRadioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: '#475569',
    cursor: 'pointer',
  },
  distInputLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '4px',
  },
  distTextarea: {
    width: '100%',
    padding: '8px',
    fontSize: '12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    resize: 'vertical' as const,
    fontFamily: 'monospace',
    boxSizing: 'border-box' as const,
  },
  distActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    marginTop: '8px',
  },
  distCancelBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    fontSize: '12px',
    color: '#64748b',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  distSaveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    fontSize: '12px',
    color: '#fff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
