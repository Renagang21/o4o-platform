/**
 * SupplierPartnerCommissionsPage - 공급자 파트너 수수료 정책 관리
 *
 * Work Order: WO-O4O-SUPPLIER-COMMISSION-MANAGER-V1
 * WO-O4O-NETURE-SUPPLIER-PARTNER-COMMISSIONS-UI-LOCALIZATION-V1: 화면 문구 한국어화(frontend-only).
 *   데이터 계약 무변경 — 저장값은 제품별 **단위당 고정 수수료(원)** 이며 비율(%)·파트너별 분기가 없다.
 *   따라서 화면에도 "수수료율"·"파트너" 컬럼을 만들지 않는다.
 *
 * WO-O4O-NETURE-SUPPLIER-PARTNER-COMMISSIONS-LOAD-ERROR-CONTRACT-V1:
 *   목록 조회 실패(loadError)와 정상 0건(빈 상태)을 분리 렌더한다.
 *   조회 실패는 `supplierCommissionApi.getCommissions()` 가 throw 하는 계약으로 전달된다.
 *
 * 기능:
 * - 수수료 정책 목록 (제품별 단위당 고정 수수료)
 * - 수수료 정책 생성 / 수정 / 삭제
 * - 기간 겹침 검증 (서버 사이드)
 * - 이미 사용된 정책 삭제 금지
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, DollarSign, Package, X, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { DataTable, type ListColumnDef } from '@o4o/operator-ux-core';
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

// 상태는 저장된 ENUM 이 아니라 start_date/end_date 로부터 파생된다(getStatus).
// 따라서 활성/비활성이 아니라 적용 기간 기준 어휘를 쓴다.
const STATUS_CONFIG: Record<CommissionStatus, { label: string; color: string; bg: string }> = {
  active: { label: '적용 중', color: '#16a34a', bg: '#dcfce7' },
  scheduled: { label: '적용 예정', color: '#2563eb', bg: '#dbeafe' },
  expired: { label: '종료됨', color: '#64748b', bg: '#f1f5f9' },
};

/** 서버 오류 코드 → 사용자 문구. 미지정 코드는 원문을 노출하지 않고 일반 문구로 대체한다. */
function commissionErrorMessage(code: string | undefined, fallback: string): string {
  if (code === 'DATE_OVERLAP') return '적용 기간이 기존 정책과 겹칩니다.';
  if (code === 'IN_USE') return '이미 사용된 정책은 삭제할 수 없습니다.';
  return fallback;
}

export default function SupplierPartnerCommissionsPage() {
  const [commissions, setCommissions] = useState<SupplierPartnerCommission[]>([]);
  const [products, setProducts] = useState<SupplierProduct[]>([]);
  const [loading, setLoading] = useState(true);
  // WO-...-LOAD-ERROR-CONTRACT-V1: 조회 실패와 정상 0건을 구분한다.
  const [loadError, setLoadError] = useState(false);
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
      // 목록 조회 실패는 throw 되므로 allSettled 로 제품 목록과 분리해 받는다.
      // (제품 목록은 폼 보조 데이터라 기존처럼 실패해도 화면을 막지 않는다)
      const [commsResult, prodsResult] = await Promise.allSettled([
        supplierCommissionApi.getCommissions(),
        supplierApi.getProducts(),
      ]);

      if (commsResult.status === 'fulfilled') {
        setCommissions(commsResult.value);
        setLoadError(false);
      } else {
        setCommissions([]);
        setLoadError(true);
      }
      setProducts(prodsResult.status === 'fulfilled' ? prodsResult.value : []);
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
    if (!editingId && !formProductId) { setError('제품을 선택해 주세요.'); return; }
    if (!formAmount) { setError('단위당 수수료를 입력해 주세요.'); return; }
    if (Number(formAmount) <= 0) { setError('단위당 수수료는 0보다 커야 합니다.'); return; }
    if (!formStartDate) { setError('적용 시작일을 입력해 주세요.'); return; }

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
          setError(commissionErrorMessage(result.error, '수수료 정책 저장에 실패했습니다.'));
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
          setError(commissionErrorMessage(result.error, '수수료 정책 저장에 실패했습니다.'));
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
    // 서버 동작이 hard delete 이므로 '삭제' 어휘를 유지한다 (비활성/보관 아님).
    if (!confirm('이 수수료 정책을 삭제하시겠습니까?\n삭제 후에는 되돌릴 수 없습니다.')) return;
    const result = await supplierCommissionApi.remove(id);
    if (!result.success) {
      toast.error(commissionErrorMessage(result.error, '수수료 정책 삭제에 실패했습니다.'));
      return;
    }
    fetchData();
  };

  const columns: ListColumnDef<SupplierPartnerCommission>[] = [
    {
      key: 'product',
      header: '제품',
      align: 'left',
      render: (_v, c) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={14} style={{ color: '#64748b', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 500, color: '#1E293B', fontSize: '14px' }}>
              {c.product_name}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>{c.barcode}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'commission_per_unit',
      header: '단위당 수수료',
      align: 'right',
      render: (_v, c) => (
        <span style={{ fontWeight: 600, color: '#1E293B' }}>
          {Number(c.commission_per_unit).toLocaleString()}원
        </span>
      ),
    },
    {
      key: 'start_date',
      header: '적용 시작일',
      align: 'left',
      render: (_v, c) => (
        <span style={{ fontSize: '13px', color: '#475569' }}>
          {c.start_date.split('T')[0]}
        </span>
      ),
    },
    {
      key: 'end_date',
      header: '적용 종료일',
      align: 'left',
      render: (_v, c) => (
        <span style={{ fontSize: '13px', color: '#475569' }}>
          {c.end_date ? c.end_date.split('T')[0] : '-'}
        </span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      align: 'left',
      render: (_v, c) => {
        const cfg = STATUS_CONFIG[getStatus(c)];
        return (
          <span style={{
            display: 'inline-block', padding: '4px 10px', borderRadius: '9999px',
            fontSize: '12px', fontWeight: 600, color: cfg.color, backgroundColor: cfg.bg,
          }}>
            {cfg.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '작업',
      align: 'center',
      render: (_v, c) => (
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
      ),
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      {/* 모바일(390px)에서 버튼 라벨이 3줄로 쪼개지는 문제 → 헤더 wrap + 버튼 nowrap */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px', marginBottom: '24px',
      }}>
        <div style={{ flex: '1 1 260px', minWidth: 0 }}>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B', margin: 0 }}>
            파트너 수수료
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
            파트너에게 지급할 제품별 수수료 정책을 설정하고 관리합니다.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', borderRadius: '8px', border: 'none',
            backgroundColor: '#2563EB', color: 'white', fontSize: '14px',
            fontWeight: 600, cursor: 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
        >
          <Plus size={16} /> 수수료 정책 추가
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
              {editingId ? '수수료 정책 수정' : '수수료 정책 추가'}
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
                단위당 수수료 (원)
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
                적용 시작일
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
                적용 종료일 (선택)
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
              {submitting ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {/* Commission List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
          불러오는 중...
        </div>
      ) : loadError ? (
        /* 조회 실패 — 빈 상태 문구를 함께 표시하지 않는다 */
        <div style={{
          textAlign: 'center', padding: '48px 24px',
          backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #e2e8f0',
        }}>
          <AlertCircle size={40} style={{ color: '#f87171', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '16px', fontWeight: 500, color: '#475569', margin: 0 }}>
            수수료 정책을 불러오지 못했습니다.
          </p>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
            잠시 후 다시 시도해 주세요.
          </p>
          <button
            onClick={fetchData}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              marginTop: '20px', padding: '10px 18px', borderRadius: '8px',
              border: '1px solid #e2e8f0', backgroundColor: '#FFFFFF',
              color: '#475569', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <RefreshCw size={14} /> 다시 시도
          </button>
        </div>
      ) : commissions.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '60px 0', color: '#94a3b8',
          backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #e2e8f0',
        }}>
          <DollarSign size={48} style={{ color: '#cbd5e1', margin: '0 auto 16px' }} />
          <p style={{ fontSize: '16px', fontWeight: 500, color: '#64748b' }}>등록된 파트너 수수료 정책이 없습니다.</p>
          <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '4px' }}>
            수수료 정책 추가 버튼을 눌러 첫 정책을 등록하세요.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="supplier-commission-table">
            <DataTable<SupplierPartnerCommission>
              columns={columns}
              data={commissions}
              rowKey={(c) => c.id}
            />
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
                      <span style={{ color: '#94a3b8' }}>단위당 수수료</span>
                      <div style={{ fontWeight: 600, color: '#1E293B' }}>{Number(c.commission_per_unit).toLocaleString()}원</div>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8' }}>적용 기간</span>
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
