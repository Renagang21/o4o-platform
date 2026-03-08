/**
 * AdminCommissionsPage - 운영자 커미션 관리
 *
 * Work Order: WO-O4O-PARTNER-COMMISSION-ENGINE-V1
 *
 * 구성:
 * - KPI 카드 3개: 대기 / 승인완료 / 지급완료
 * - 커미션 계산 섹션: 기간 선택 + 계산 실행
 * - 상태 필터 탭: 전체 / 대기 / 승인완료 / 지급완료 / 취소
 * - 커미션 목록: 파트너명 / 주문번호 / 커미션율 / 주문금액 / 커미션금액 / 상태 / 액션
 * - 상세 확장: 주문 항목 (상품명, 수량, 단가, 금액)
 * - 페이지네이션
 */

import { useState, useEffect, useCallback, Fragment } from 'react';
import { ChevronDown, ChevronUp, Calculator, Check, CreditCard, XCircle } from 'lucide-react';
import {
  adminCommissionApi,
  type Commission,
  type CommissionDetail,
  type CommissionStatus,
  type AdminCommissionKpi,
} from '../../lib/api';

// ============================================================================
// Status Config
// ============================================================================

type StatusConfig = { label: string; bg: string; color: string };

const STATUS_MAP: Record<string, StatusConfig> = {
  pending: { label: '대기', bg: '#fef3c7', color: '#b45309' },
  approved: { label: '승인완료', bg: '#e0e7ff', color: '#4338ca' },
  paid: { label: '지급완료', bg: '#dcfce7', color: '#15803d' },
  cancelled: { label: '취소', bg: '#f1f5f9', color: '#64748b' },
};

function getStatus(status: string): StatusConfig {
  return STATUS_MAP[status] || { label: status, bg: '#f1f5f9', color: '#64748b' };
}

// ============================================================================
// Helpers
// ============================================================================

function formatPrice(v: number): string {
  return v.toLocaleString('ko-KR');
}

// ============================================================================
// Filter Tabs
// ============================================================================

const FILTER_TABS: { label: string; value: CommissionStatus | undefined }[] = [
  { label: '전체', value: undefined },
  { label: '대기', value: 'pending' },
  { label: '승인완료', value: 'approved' },
  { label: '지급완료', value: 'paid' },
  { label: '취소', value: 'cancelled' },
];

// ============================================================================
// Main Component
// ============================================================================

export default function AdminCommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [kpi, setKpi] = useState<AdminCommissionKpi>({
    pending_count: 0, pending_amount: 0,
    approved_count: 0, approved_amount: 0,
    paid_count: 0, paid_amount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | undefined>(undefined);

  // Detail expansion
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CommissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Calculate period
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [calcMessage, setCalcMessage] = useState('');

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ---- Data Fetching ----

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listResult, kpiResult] = await Promise.all([
        adminCommissionApi.getCommissions({ page, status: statusFilter }),
        adminCommissionApi.getKpi(),
      ]);
      setCommissions(listResult.data);
      setMeta(listResult.meta);
      setKpi(kpiResult);
    } catch (err) {
      console.error('[AdminCommissions] fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ---- Expand detail ----

  const toggleExpand = useCallback(async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(id);
    setDetail(null);
    setDetailLoading(true);
    const d = await adminCommissionApi.getDetail(id);
    setDetail(d);
    setDetailLoading(false);
  }, [expandedId]);

  // ---- Calculate ----

  const handleCalculate = useCallback(async () => {
    if (!periodStart || !periodEnd) return;
    setCalculating(true);
    setCalcMessage('');
    try {
      const result = await adminCommissionApi.calculate(periodStart, periodEnd);
      if (result.success) {
        const count = result.data?.created || 0;
        setCalcMessage(count > 0 ? `${count}건 커미션 생성 완료` : '커미션 대상 주문이 없습니다.');
        fetchData();
      } else {
        setCalcMessage(result.message || result.error || '커미션 계산 실패');
      }
    } catch {
      setCalcMessage('커미션 계산 중 오류 발생');
    } finally {
      setCalculating(false);
    }
  }, [periodStart, periodEnd, fetchData]);

  // ---- Actions ----

  const handleApprove = useCallback(async (id: string) => {
    if (!window.confirm('이 커미션을 승인하시겠습니까?')) return;
    setActionLoading(id);
    const ok = await adminCommissionApi.approve(id);
    setActionLoading(null);
    if (ok) fetchData();
    else alert('승인 처리 실패');
  }, [fetchData]);

  const handlePay = useCallback(async (id: string) => {
    if (!window.confirm('이 커미션을 지급 완료 처리하시겠습니까?')) return;
    setActionLoading(id);
    const ok = await adminCommissionApi.pay(id);
    setActionLoading(null);
    if (ok) fetchData();
    else alert('지급 처리 실패');
  }, [fetchData]);

  const handleCancel = useCallback(async (id: string) => {
    if (!window.confirm('이 커미션을 취소하시겠습니까?')) return;
    setActionLoading(id);
    const ok = await adminCommissionApi.cancel(id);
    setActionLoading(null);
    if (ok) fetchData();
    else alert('취소 처리 실패');
  }, [fetchData]);

  // ---- Filter / Page ----

  const handleFilterChange = (status: CommissionStatus | undefined) => {
    setStatusFilter(status);
    setPage(1);
    setExpandedId(null);
    setDetail(null);
  };

  // ---- Render ----

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>커미션 관리</h1>
        <p style={styles.subtitle}>파트너 소개 판매 커미션을 계산, 승인, 지급합니다.</p>
      </div>

      {/* KPI Cards */}
      <div style={styles.kpiRow}>
        <div style={{ ...styles.kpiCard, borderColor: '#fef3c7' }}>
          <p style={{ ...styles.kpiAmount, color: '#b45309' }}>{formatPrice(kpi.pending_amount)}원</p>
          <p style={styles.kpiLabel}>대기 ({kpi.pending_count}건)</p>
        </div>
        <div style={{ ...styles.kpiCard, borderColor: '#e0e7ff' }}>
          <p style={{ ...styles.kpiAmount, color: '#4338ca' }}>{formatPrice(kpi.approved_amount)}원</p>
          <p style={styles.kpiLabel}>승인완료 ({kpi.approved_count}건)</p>
        </div>
        <div style={{ ...styles.kpiCard, borderColor: '#dcfce7' }}>
          <p style={{ ...styles.kpiAmount, color: '#15803d' }}>{formatPrice(kpi.paid_amount)}원</p>
          <p style={styles.kpiLabel}>지급완료 ({kpi.paid_count}건)</p>
        </div>
      </div>

      {/* Calculate Section */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>커미션 계산</h2>
        <div style={styles.calcRow}>
          <input
            type="date"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            style={styles.dateInput}
          />
          <span style={{ color: '#64748b' }}>~</span>
          <input
            type="date"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            style={styles.dateInput}
          />
          <button
            onClick={handleCalculate}
            disabled={calculating || !periodStart || !periodEnd}
            style={{
              ...styles.calcButton,
              opacity: calculating || !periodStart || !periodEnd ? 0.5 : 1,
            }}
          >
            <Calculator size={16} />
            {calculating ? '계산 중...' : '커미션 계산'}
          </button>
        </div>
        {calcMessage && (
          <p style={{ marginTop: '8px', fontSize: '13px', color: '#475569' }}>{calcMessage}</p>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleFilterChange(tab.value)}
            style={{
              ...styles.filterTab,
              ...(statusFilter === tab.value ? styles.filterTabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Commission List */}
      {loading ? (
        <p style={styles.emptyText}>불러오는 중...</p>
      ) : commissions.length === 0 ? (
        <p style={styles.emptyText}>커미션 내역이 없습니다.</p>
      ) : (
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>파트너</th>
                <th style={styles.th}>주문번호</th>
                <th style={{ ...styles.th, textAlign: 'right' as const }}>커미션율</th>
                <th style={{ ...styles.th, textAlign: 'right' as const }}>주문금액</th>
                <th style={{ ...styles.th, textAlign: 'right' as const }}>커미션금액</th>
                <th style={{ ...styles.th, textAlign: 'center' as const }}>상태</th>
                <th style={{ ...styles.th, textAlign: 'center' as const }}>액션</th>
                <th style={{ ...styles.th, width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => {
                const st = getStatus(c.status);
                const isExpanded = expandedId === c.id;
                const isActioning = actionLoading === c.id;

                return (
                  <Fragment key={c.id}>
                    <tr
                      style={{ ...styles.row, cursor: 'pointer' }}
                      onClick={() => toggleExpand(c.id)}
                    >
                      <td style={styles.td}>{c.partner_name || c.partner_id.slice(0, 8)}</td>
                      <td style={styles.td}>{c.order_number}</td>
                      <td style={{ ...styles.td, textAlign: 'right' as const }}>{c.commission_rate}%</td>
                      <td style={{ ...styles.td, textAlign: 'right' as const }}>{formatPrice(c.order_amount)}원</td>
                      <td style={{ ...styles.td, textAlign: 'right' as const, fontWeight: 600 }}>
                        {formatPrice(c.commission_amount)}원
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' as const }}>
                        <span style={{ ...styles.badge, backgroundColor: st.bg, color: st.color }}>
                          {st.label}
                        </span>
                      </td>
                      <td
                        style={{ ...styles.td, textAlign: 'center' as const }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={styles.actionGroup}>
                          {c.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(c.id)}
                                disabled={isActioning}
                                style={{ ...styles.actionBtn, ...styles.approveBtn }}
                                title="승인"
                              >
                                <Check size={14} /> 승인
                              </button>
                              <button
                                onClick={() => handleCancel(c.id)}
                                disabled={isActioning}
                                style={{ ...styles.actionBtn, ...styles.cancelBtn }}
                                title="취소"
                              >
                                <XCircle size={14} /> 취소
                              </button>
                            </>
                          )}
                          {c.status === 'approved' && (
                            <>
                              <button
                                onClick={() => handlePay(c.id)}
                                disabled={isActioning}
                                style={{ ...styles.actionBtn, ...styles.payBtn }}
                                title="지급"
                              >
                                <CreditCard size={14} /> 지급
                              </button>
                              <button
                                onClick={() => handleCancel(c.id)}
                                disabled={isActioning}
                                style={{ ...styles.actionBtn, ...styles.cancelBtn }}
                                title="취소"
                              >
                                <XCircle size={14} /> 취소
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' as const }}>
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </td>
                    </tr>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} style={styles.detailCell}>
                          {detailLoading ? (
                            <p style={styles.detailLoading}>주문 정보 불러오는 중...</p>
                          ) : detail && detail.items.length > 0 ? (
                            <table style={styles.detailTable}>
                              <thead>
                                <tr>
                                  <th style={styles.detailTh}>상품명</th>
                                  <th style={{ ...styles.detailTh, textAlign: 'right' as const }}>수량</th>
                                  <th style={{ ...styles.detailTh, textAlign: 'right' as const }}>단가</th>
                                  <th style={{ ...styles.detailTh, textAlign: 'right' as const }}>금액</th>
                                </tr>
                              </thead>
                              <tbody>
                                {detail.items.map((item, idx) => (
                                  <tr key={idx}>
                                    <td style={styles.detailTd}>{item.product_name}</td>
                                    <td style={{ ...styles.detailTd, textAlign: 'right' as const }}>{item.quantity}</td>
                                    <td style={{ ...styles.detailTd, textAlign: 'right' as const }}>{formatPrice(item.unit_price)}원</td>
                                    <td style={{ ...styles.detailTd, textAlign: 'right' as const }}>{formatPrice(item.total_price)}원</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p style={styles.detailLoading}>연결된 주문 항목이 없습니다.</p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            style={{ ...styles.pageBtn, opacity: page <= 1 ? 0.4 : 1 }}
          >
            이전
          </button>
          <span style={styles.pageInfo}>{page} / {meta.totalPages} ({meta.total}건)</span>
          <button
            disabled={page >= meta.totalPages}
            onClick={() => setPage(page + 1)}
            style={{ ...styles.pageBtn, opacity: page >= meta.totalPages ? 0.4 : 1 }}
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px 16px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },

  // KPI
  kpiRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  },
  kpiCard: {
    flex: '1 1 200px',
    padding: '20px',
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    textAlign: 'center' as const,
  },
  kpiAmount: {
    fontSize: '22px',
    fontWeight: 700,
    margin: 0,
  },
  kpiLabel: {
    fontSize: '13px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },

  // Calculate Section
  section: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 12px 0',
  },
  calcRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  dateInput: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#0f172a',
  },
  calcButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },

  // Filter
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  filterTab: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '13px',
    cursor: 'pointer',
  },
  filterTabActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderColor: '#0f172a',
  },

  // Table
  tableWrapper: {
    overflowX: 'auto' as const,
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '14px',
  },
  th: {
    padding: '12px 14px',
    textAlign: 'left' as const,
    fontWeight: 600,
    color: '#475569',
    borderBottom: '1px solid #e2e8f0',
    whiteSpace: 'nowrap' as const,
    fontSize: '13px',
  },
  row: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '12px 14px',
    color: '#0f172a',
    whiteSpace: 'nowrap' as const,
  },
  badge: {
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: 600,
  },

  // Actions
  actionGroup: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center',
  },
  actionBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '3px',
    padding: '4px 10px',
    borderRadius: '4px',
    border: 'none',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
  approveBtn: {
    backgroundColor: '#e0e7ff',
    color: '#4338ca',
  },
  payBtn: {
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },

  // Detail
  detailCell: {
    padding: '16px 20px',
    backgroundColor: '#f8fafc',
  },
  detailLoading: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  detailTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '13px',
  },
  detailTh: {
    padding: '8px 10px',
    textAlign: 'left' as const,
    fontWeight: 600,
    color: '#475569',
    borderBottom: '1px solid #e2e8f0',
    fontSize: '12px',
  },
  detailTd: {
    padding: '8px 10px',
    color: '#334155',
    borderBottom: '1px solid #f1f5f9',
  },

  // Pagination
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px',
    marginTop: '20px',
  },
  pageBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#ffffff',
    color: '#475569',
    fontSize: '13px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '13px',
    color: '#64748b',
  },

  // Empty
  emptyText: {
    textAlign: 'center' as const,
    color: '#94a3b8',
    padding: '40px 0',
    fontSize: '14px',
  },
};
