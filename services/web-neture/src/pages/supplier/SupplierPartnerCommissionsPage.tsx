/**
 * SupplierPartnerCommissionsPage - 공급자 파트너 커미션 정책 관리
 *
 * Work Order: WO-O4O-SUPPLIER-COMMISSION-MANAGER-V1
 *
 * 기능:
 * - 커미션 정책 목록 (제품별 fixed commission per unit)
 * - 커미션 정책 생성 / 수정 / 삭제
 * - 기간 겹침 검증 (서버 사이드)
 * - 이미 사용된 정책 삭제 금지
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, DollarSign, Package, X, Check } from 'lucide-react';
import {
  supplierCommissionApi,
  supplierApi,
  type SupplierPartnerCommission,
  type SupplierProduct,
} from '../../lib/api';

type CommissionStatus = 'active' | 'scheduled' | 'expired';

function getStatus(c: SupplierPartnerCommission): CommissionStatus {
  const today = new Date().toISOString().split('T')[0];
  if (c.start_date > today) return 'scheduled';
  if (c.end_date && c.end_date < today) return 'expired';
  return 'active';
}

const STATUS_CONFIG: Record<CommissionStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#16a34a', bg: '#dcfce7' },
  scheduled: { label: 'Scheduled', color: '#2563eb', bg: '#dbeafe' },
  expired: { label: 'Expired', color: '#64748b', bg: '#f1f5f9' },
};

export default function SupplierPartnerCommissionsPage() {
  const [commissions, setCommissions] = useState<SupplierPartnerCommission[]>([]);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formProductId, setFormProductId] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [comms, prods] = await Promise.all([
        supplierCommissionApi.getCommissions(),
        supplierApi.getProducts(),
      ]);
      setCommissions(comms);
      setProducts(prods);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setFormProductId('');
    setFormAmount('');
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setFormEndDate('');
    setEditingId(null);
    setShowForm(false);
    setError('');
  };

  const openCreateForm = () => {
    resetForm();
    setFormStartDate(new Date().toISOString().split('T')[0]);
    setShowForm(true);
  };

  const openEditForm = (c: SupplierPartnerCommission) => {
    setFormProductId(c.supplier_product_id);
    setFormAmount(String(c.commission_per_unit));
    setFormStartDate(c.start_date.split('T')[0]);
    setFormEndDate(c.end_date ? c.end_date.split('T')[0] : '');
    setEditingId(c.id);
    setShowForm(true);
    setError('');
  };

  const handleSubmit = async () => {
    if (!editingId && !formProductId) { setError('제품을 선택하세요'); return; }
    if (!formAmount || Number(formAmount) <= 0) { setError('커미션 금액을 입력하세요'); return; }
    if (!formStartDate) { setError('시작일을 입력하세요'); return; }

    setSubmitting(true);
    setError('');
    try {
      if (editingId) {
        const result = await supplierCommissionApi.update(editingId, {
          commission_per_unit: Number(formAmount),
          start_date: formStartDate,
          end_date: formEndDate || null,
        });
        if (!result.success) {
          setError(result.error === 'DATE_OVERLAP' ? '기간이 기존 정책과 겹칩니다' : result.error || 'Failed');
          return;
        }
      } else {
        const result = await supplierCommissionApi.create({
          supplier_product_id: formProductId,
          commission_per_unit: Number(formAmount),
          start_date: formStartDate,
          end_date: formEndDate || undefined,
        });
        if (!result.success) {
          setError(result.error === 'DATE_OVERLAP' ? '기간이 기존 정책과 겹칩니다' : result.error || 'Failed');
          return;
        }
      }
      resetForm();
      fetchData();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 커미션 정책을 삭제하시겠습니까?')) return;
    const result = await supplierCommissionApi.remove(id);
    if (!result.success) {
      alert(result.error === 'IN_USE' ? '이미 사용된 정책은 삭제할 수 없습니다' : result.error || 'Failed');
      return;
    }
    fetchData();
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
            Partner Commissions
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
            파트너에게 제공할 커미션 정책을 관리합니다
          </p>
        </div>
        <button
          onClick={openCreateForm}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', borderRadius: '8px', border: 'none',
            backgroundColor: '#2563EB', color: 'white', fontSize: '14px',
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={16} /> Add Commission
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div style={{
          backgroundColor: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '24px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', margin: 0 }}>
              {editingId ? 'Edit Commission' : 'Add Commission'}
            </h3>
            <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Product Select */}
            {!editingId && (
              <div>
                <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px', display: 'block' }}>
                  제품
                </label>
                <select
                  value={formProductId}
                  onChange={(e) => setFormProductId(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: '1px solid #e2e8f0', fontSize: '14px', color: '#1E293B',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <option value="">제품 선택...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.masterName || p.name} ({p.barcode})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Commission Per Unit */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px', display: 'block' }}>
                Commission / unit (원)
              </label>
              <input
                type="number"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="500"
                min={1}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e2e8f0', fontSize: '14px', color: '#1E293B',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Start Date */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px', display: 'block' }}>
                시작일
              </label>
              <input
                type="date"
                value={formStartDate}
                onChange={(e) => setFormStartDate(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e2e8f0', fontSize: '14px', color: '#1E293B',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '6px', display: 'block' }}>
                종료일 (선택)
              </label>
              <input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #e2e8f0', fontSize: '14px', color: '#1E293B',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          {error && (
            <p style={{ marginTop: '12px', fontSize: '13px', color: '#dc2626' }}>{error}</p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
            <button onClick={resetForm} style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid #e2e8f0',
              backgroundColor: '#FFFFFF', color: '#475569', fontSize: '14px', cursor: 'pointer',
            }}>
              취소
            </button>
            <button onClick={handleSubmit} disabled={submitting} style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              backgroundColor: '#2563EB', color: 'white', fontSize: '14px',
              fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}>
              <Check size={14} />
              {submitting ? '저장 중...' : editingId ? '수정' : '생성'}
            </button>
          </div>
        </div>
      )}

      {/* Commission List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          Loading...
        </div>
      ) : commissions.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: '#94a3b8',
          backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #e2e8f0',
        }}>
          <DollarSign size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '16px', fontWeight: 500, color: '#64748b' }}>등록된 커미션 정책이 없습니다</p>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
            Add Commission 버튼을 눌러 첫 커미션 정책을 만들어보세요
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="supplier-commission-table" style={{
            backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <th style={thStyle}>Product</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Commission / unit</th>
                  <th style={thStyle}>Start date</th>
                  <th style={thStyle}>End date</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Edit</th>
                </tr>
              </thead>
              <tbody>
                {commissions.map((c) => {
                  const status = getStatus(c);
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Package size={14} style={{ color: '#64748b', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontWeight: 500, color: '#1E293B', fontSize: '14px' }}>
                              {c.product_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{c.barcode}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#1E293B' }}>
                        {Number(c.commission_per_unit).toLocaleString()}원
                      </td>
                      <td style={{ ...tdStyle, fontSize: '13px', color: '#475569' }}>
                        {c.start_date.split('T')[0]}
                      </td>
                      <td style={{ ...tdStyle, fontSize: '13px', color: '#475569' }}>
                        {c.end_date ? c.end_date.split('T')[0] : '-'}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          display: 'inline-block', padding: '4px 10px', borderRadius: '9999px',
                          fontSize: '12px', fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg,
                        }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
                          <button
                            onClick={() => openEditForm(c)}
                            style={actionBtnStyle}
                            title="수정"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            style={{ ...actionBtnStyle, color: '#dc2626' }}
                            title="삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="supplier-commission-cards" style={{ display: 'none' }}>
            {commissions.map((c) => {
              const status = getStatus(c);
              const cfg = STATUS_CONFIG[status];
              return (
                <div key={c.id} style={{
                  backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #e2e8f0',
                  padding: '16px', marginBottom: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#1E293B' }}>{c.product_name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{c.barcode}</div>
                    </div>
                    <span style={{
                      padding: '4px 10px', borderRadius: '9999px',
                      fontSize: '11px', fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg,
                    }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#94a3b8' }}>Commission</span>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{Number(c.commission_per_unit).toLocaleString()}원</div>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>기간</span>
                      <div style={{ color: '#475569' }}>
                        {c.start_date.split('T')[0]} ~ {c.end_date ? c.end_date.split('T')[0] : '무기한'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                    <button onClick={() => openEditForm(c)} style={actionBtnStyle}><Edit2 size={14} /> 수정</button>
                    <button onClick={() => handleDelete(c.id)} style={{ ...actionBtnStyle, color: '#dc2626' }}><Trash2 size={14} /> 삭제</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Responsive CSS */}
          <style>{`
            @media (max-width: 768px) {
              .supplier-commission-table { display: none !important; }
              .supplier-commission-cards { display: block !important; }
            }
          `}</style>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const tdStyle: React.CSSProperties = {
  padding: '14px 16px',
  fontSize: '14px',
};

const actionBtnStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid #e2e8f0',
  backgroundColor: '#FFFFFF',
  color: '#475569',
  fontSize: '13px',
  cursor: 'pointer',
};
