/**
 * SupplierInventoryPage - 공급자 재고 관리
 *
 * Work Order: WO-O4O-INVENTORY-ENGINE-V1
 *
 * 기능:
 * - 전체 상품 재고 현황 조회
 * - 재고 추적 ON/OFF
 * - 재고 수량/부족 기준값 수정
 * - 재고 상태 표시 (충분/부족/품절/미관리)
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  Edit3,
  Check,
  X,
  ArrowLeft,
} from 'lucide-react';
import {
  supplierApi,
  type InventoryItem,
  getInventoryStatus,
  type InventoryStatus,
} from '../../lib/api';

const STATUS_CONFIG: Record<InventoryStatus, { label: string; color: string; bgColor: string }> = {
  in_stock: { label: '재고 충분', color: '#16a34a', bgColor: '#dcfce7' },
  low_stock: { label: '재고 부족', color: '#b45309', bgColor: '#fef3c7' },
  out_of_stock: { label: '품절', color: '#dc2626', bgColor: '#fee2e2' },
  untracked: { label: '미관리', color: '#64748b', bgColor: '#f1f5f9' },
};

export default function SupplierInventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStock, setEditStock] = useState(0);
  const [editThreshold, setEditThreshold] = useState(10);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    const data = await supplierApi.getInventory();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleToggleTracking = async (item: InventoryItem) => {
    setSaving(true);
    const result = await supplierApi.updateInventory(item.offer_id, {
      track_inventory: !item.track_inventory,
    });
    if (result.success) {
      setItems((prev) =>
        prev.map((i) =>
          i.offer_id === item.offer_id
            ? { ...i, track_inventory: !item.track_inventory }
            : i
        )
      );
      setMessage({ text: `${item.marketing_name} 재고 추적 ${!item.track_inventory ? '활성화' : '비활성화'}`, type: 'success' });
    } else {
      setMessage({ text: result.error || '업데이트 실패', type: 'error' });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const startEdit = (item: InventoryItem) => {
    setEditingId(item.offer_id);
    setEditStock(item.stock_quantity);
    setEditThreshold(item.low_stock_threshold);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveEdit = async (offerId: string) => {
    setSaving(true);
    const result = await supplierApi.updateInventory(offerId, {
      stock_quantity: editStock,
      low_stock_threshold: editThreshold,
    });
    if (result.success && result.data) {
      setItems((prev) =>
        prev.map((i) =>
          i.offer_id === offerId
            ? {
                ...i,
                stock_quantity: result.data!.stock_quantity,
                reserved_quantity: result.data!.reserved_quantity,
                low_stock_threshold: result.data!.low_stock_threshold,
                available_stock: result.data!.available_stock,
              }
            : i
        )
      );
      setEditingId(null);
      setMessage({ text: '재고 업데이트 완료', type: 'success' });
    } else {
      setMessage({ text: result.error || '업데이트 실패', type: 'error' });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const stats = {
    total: items.length,
    tracked: items.filter((i) => i.track_inventory).length,
    lowStock: items.filter((i) => getInventoryStatus(i) === 'low_stock').length,
    outOfStock: items.filter((i) => getInventoryStatus(i) === 'out_of_stock').length,
  };

  return (
    <div>
      {/* Header */}
      <div style={styles.header}>
        <Link to="/account/supplier" style={styles.backLink}>
          <ArrowLeft size={16} /> 대시보드
        </Link>
        <h1 style={styles.title}>재고 관리</h1>
        <p style={styles.subtitle}>상품 재고를 관리하고 부족 알림을 설정합니다.</p>
      </div>

      {/* Message */}
      {message && (
        <div
          style={{
            ...styles.messageBanner,
            backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
            color: message.type === 'success' ? '#15803d' : '#dc2626',
            borderColor: message.type === 'success' ? '#86efac' : '#fecaca',
          }}
        >
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <Package size={20} style={{ color: '#3b82f6' }} />
          <div>
            <p style={styles.statValue}>{stats.total}</p>
            <p style={styles.statLabel}>전체 상품</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Package size={20} style={{ color: '#16a34a' }} />
          <div>
            <p style={styles.statValue}>{stats.tracked}</p>
            <p style={styles.statLabel}>재고 관리 중</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
          <div>
            <p style={styles.statValue}>{stats.lowStock}</p>
            <p style={styles.statLabel}>재고 부족</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <AlertTriangle size={20} style={{ color: '#dc2626' }} />
          <div>
            <p style={styles.statValue}>{stats.outOfStock}</p>
            <p style={styles.statLabel}>품절</p>
          </div>
        </div>
      </div>

      {/* Inventory List */}
      {loading ? (
        <div style={styles.loading}>로딩 중...</div>
      ) : items.length === 0 ? (
        <div style={styles.emptyState}>
          <Package size={48} style={{ color: '#94a3b8', marginBottom: '16px' }} />
          <p>등록된 상품이 없습니다.</p>
        </div>
      ) : (
        <div style={styles.itemList}>
          {items.map((item) => {
            const status = getInventoryStatus(item);
            const statusCfg = STATUS_CONFIG[status];
            const isEditing = editingId === item.offer_id;

            return (
              <div key={item.offer_id} style={styles.itemCard}>
                <div style={styles.itemMain}>
                  {/* Product Info */}
                  <div style={styles.itemInfo}>
                    <div style={styles.itemNameRow}>
                      <h3 style={styles.itemName}>{item.marketing_name}</h3>
                      <span
                        style={{
                          ...styles.statusBadge,
                          backgroundColor: statusCfg.bgColor,
                          color: statusCfg.color,
                        }}
                      >
                        {statusCfg.label}
                      </span>
                    </div>
                    {item.brand_name && (
                      <p style={styles.itemMeta}>{item.brand_name}{item.specification ? ` · ${item.specification}` : ''}</p>
                    )}
                  </div>

                  {/* Stock Info */}
                  {item.track_inventory ? (
                    <div style={styles.stockInfo}>
                      {isEditing ? (
                        <div style={styles.editForm}>
                          <div style={styles.editField}>
                            <label style={styles.editLabel}>재고 수량</label>
                            <input
                              type="number"
                              min={0}
                              value={editStock}
                              onChange={(e) => setEditStock(Math.max(0, Number(e.target.value)))}
                              style={styles.editInput}
                            />
                          </div>
                          <div style={styles.editField}>
                            <label style={styles.editLabel}>부족 기준</label>
                            <input
                              type="number"
                              min={0}
                              value={editThreshold}
                              onChange={(e) => setEditThreshold(Math.max(0, Number(e.target.value)))}
                              style={styles.editInput}
                            />
                          </div>
                          <div style={styles.editActions}>
                            <button
                              onClick={() => saveEdit(item.offer_id)}
                              disabled={saving}
                              style={styles.saveBtn}
                            >
                              <Check size={14} /> {saving ? '저장 중...' : '저장'}
                            </button>
                            <button onClick={cancelEdit} style={styles.cancelBtn}>
                              <X size={14} /> 취소
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={styles.stockNumbers}>
                          <div style={styles.stockItem}>
                            <span style={styles.stockLabel}>총 재고</span>
                            <span style={styles.stockValue}>{item.stock_quantity}</span>
                          </div>
                          <div style={styles.stockItem}>
                            <span style={styles.stockLabel}>예약</span>
                            <span style={styles.stockValue}>{item.reserved_quantity}</span>
                          </div>
                          <div style={styles.stockItem}>
                            <span style={styles.stockLabel}>가용</span>
                            <span style={{ ...styles.stockValue, color: status === 'out_of_stock' ? '#dc2626' : status === 'low_stock' ? '#b45309' : '#16a34a' }}>
                              {item.available_stock}
                            </span>
                          </div>
                          <div style={styles.stockItem}>
                            <span style={styles.stockLabel}>부족 기준</span>
                            <span style={styles.stockValue}>{item.low_stock_threshold}</span>
                          </div>
                          <button
                            onClick={() => startEdit(item)}
                            style={styles.editBtn}
                          >
                            <Edit3 size={14} /> 수정
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={styles.untrackedInfo}>
                      <span style={styles.untrackedText}>재고 추적 미활성</span>
                    </div>
                  )}
                </div>

                {/* Tracking Toggle */}
                <div style={styles.trackToggle}>
                  <span style={styles.trackLabel}>재고 추적</span>
                  <button
                    onClick={() => handleToggleTracking(item)}
                    disabled={saving}
                    style={styles.toggleButton}
                  >
                    {item.track_inventory ? (
                      <div style={{ ...styles.toggleTrack, backgroundColor: '#16a34a' }}>
                        <div style={{ ...styles.toggleThumb, transform: 'translateX(20px)' }} />
                      </div>
                    ) : (
                      <div style={{ ...styles.toggleTrack, backgroundColor: '#d1d5db' }}>
                        <div style={styles.toggleThumb} />
                      </div>
                    )}
                  </button>
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
  header: { marginBottom: '24px' },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#64748b',
    textDecoration: 'none',
    marginBottom: '12px',
  },
  title: { fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' },
  subtitle: { fontSize: '14px', color: '#64748b', margin: 0 },

  messageBanner: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '16px',
  },

  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statValue: { fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: 0, lineHeight: 1 },
  statLabel: { fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' },

  loading: { textAlign: 'center', padding: '60px', color: '#64748b' },
  emptyState: { textAlign: 'center', padding: '60px', color: '#94a3b8', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' },

  itemList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  itemCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px 24px',
    gap: '16px',
  },
  itemMain: { flex: 1, minWidth: 0 },
  itemInfo: { marginBottom: '12px' },
  itemNameRow: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const },
  itemName: { fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 },
  statusBadge: { fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '4px', whiteSpace: 'nowrap' as const },
  itemMeta: { fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' },

  stockInfo: {},
  stockNumbers: { display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' as const },
  stockItem: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center' },
  stockLabel: { fontSize: '11px', color: '#94a3b8', marginBottom: '2px' },
  stockValue: { fontSize: '18px', fontWeight: 700, color: '#1e293b' },

  editBtn: {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '6px 10px', fontSize: '12px', color: '#3b82f6',
    backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', cursor: 'pointer',
  },

  editForm: { display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' as const },
  editField: {},
  editLabel: { display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '4px' },
  editInput: {
    width: '100px', padding: '6px 10px', fontSize: '14px',
    border: '1px solid #cbd5e1', borderRadius: '6px',
  },
  editActions: { display: 'flex', gap: '6px' },
  saveBtn: {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '6px 12px', fontSize: '12px', color: '#fff', backgroundColor: '#2563eb',
    border: 'none', borderRadius: '6px', cursor: 'pointer',
  },
  cancelBtn: {
    display: 'flex', alignItems: 'center', gap: '4px',
    padding: '6px 12px', fontSize: '12px', color: '#64748b', backgroundColor: '#fff',
    border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer',
  },

  untrackedInfo: { display: 'flex', alignItems: 'center' },
  untrackedText: { fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' },

  trackToggle: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px', flexShrink: 0 },
  trackLabel: { fontSize: '11px', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' as const },
  toggleButton: { background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  toggleTrack: { width: '44px', height: '24px', borderRadius: '12px', position: 'relative' as const, transition: 'background-color 0.2s' },
  toggleThumb: { width: '20px', height: '20px', borderRadius: '10px', backgroundColor: '#fff', position: 'absolute' as const, top: '2px', left: '2px', transition: 'transform 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' },
};
