/**
 * SettlementsPage - 파트너 커미션 내역
 *
 * Work Order: WO-O4O-PARTNER-COMMISSION-ENGINE-V1
 *
 * 커미션 현황:
 * - KPI 요약 (총 커미션 / 지급 완료 / 지급 대기)
 * - 상태 필터 탭
 * - 커미션 목록 (카드)
 * - 페이지네이션
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, CheckCircle, Clock, TrendingUp, ChevronLeft, ChevronRight, ShieldCheck } from 'lucide-react';
import { partnerCommissionApi } from '../../lib/api/index.js';
import type { Commission, CommissionStatus, PartnerCommissionKpi } from '../../lib/api/index.js';

const STATUS_MAP: Record<CommissionStatus, { label: string; bg: string; color: string }> = {
  pending: { label: '대기', bg: '#fef3c7', color: '#92400e' },
  approved: { label: '승인완료', bg: '#e0e7ff', color: '#4338ca' },
  paid: { label: '지급완료', bg: '#dcfce7', color: '#166534' },
  cancelled: { label: '취소', bg: '#f1f5f9', color: '#64748b' },
};

const FILTER_TABS: { label: string; value: CommissionStatus | 'all' }[] = [
  { label: '전체', value: 'all' },
  { label: '대기', value: 'pending' },
  { label: '승인완료', value: 'approved' },
  { label: '지급완료', value: 'paid' },
  { label: '취소', value: 'cancelled' },
];

const KPI_DEFAULT: PartnerCommissionKpi = {
  pending_amount: 0, paid_amount: 0, total_amount: 0, pending_count: 0, paid_count: 0,
};

export function SettlementsPage() {
  const [kpi, setKpi] = useState<PartnerCommissionKpi>(KPI_DEFAULT);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [filter, setFilter] = useState<CommissionStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: { page: number; limit: number; status?: CommissionStatus } = { page, limit: 20 };
      if (filter !== 'all') params.status = filter;
      const [kpiRes, listRes] = await Promise.all([
        partnerCommissionApi.getKpi(),
        partnerCommissionApi.getCommissions(params),
      ]);
      setKpi(kpiRes);
      setCommissions(listRes.data);
      setTotalPages(listRes.meta.totalPages);
    } catch {
      // defaults remain
    } finally {
      setLoading(false);
    }
  }, [page, filter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleFilterChange = (value: CommissionStatus | 'all') => {
    setFilter(value);
    setPage(1);
  };

  return (
    <div style={styles.container}>
      {/* Back Link */}
      <Link to="/partner" style={styles.backLink}>
        <ArrowLeft size={18} />
        파트너 허브로 돌아가기
      </Link>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerIcon}>
          <CreditCard size={28} style={{ color: '#16a34a' }} />
        </div>
        <div>
          <h1 style={styles.title}>커미션 내역</h1>
          <p style={styles.subtitle}>
            파트너 소개 판매에 대한 커미션 현황을 확인합니다
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <TrendingUp size={24} style={{ color: '#2563eb' }} />
          <div>
            <p style={styles.statValue}>{kpi.total_amount.toLocaleString()}</p>
            <p style={styles.statLabel}>총 커미션 (원)</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <CheckCircle size={24} style={{ color: '#16a34a' }} />
          <div>
            <p style={styles.statValue}>{kpi.paid_amount.toLocaleString()}</p>
            <p style={styles.statLabel}>지급 완료 (원)</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Clock size={24} style={{ color: '#f59e0b' }} />
          <div>
            <p style={styles.statValue}>{kpi.pending_amount.toLocaleString()}</p>
            <p style={styles.statLabel}>지급 대기 (원)</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleFilterChange(tab.value)}
            style={{
              ...styles.filterTab,
              ...(filter === tab.value ? styles.filterTabActive : {}),
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Commissions List */}
      <div style={styles.section}>
        {loading ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyStateText}>불러오는 중...</p>
          </div>
        ) : commissions.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyStateText}>커미션 내역이 없습니다.</p>
          </div>
        ) : (
          <div style={styles.list}>
            {commissions.map((c) => {
              const st = STATUS_MAP[c.status] || STATUS_MAP.pending;
              return (
                <div key={c.id} style={styles.card}>
                  <div style={styles.cardHeader}>
                    <div style={styles.cardInfo}>
                      <div>
                        <h3 style={styles.cardTitle}>주문 #{c.order_number}</h3>
                        <p style={styles.cardService}>{c.supplier_name || '공급자'}</p>
                      </div>
                    </div>
                    <div style={styles.cardRight}>
                      <span style={{ ...styles.statusBadge, backgroundColor: st.bg, color: st.color }}>
                        {c.status === 'paid' ? <CheckCircle size={14} /> :
                         c.status === 'approved' ? <ShieldCheck size={14} /> :
                         <Clock size={14} />}
                        {st.label}
                      </span>
                    </div>
                  </div>
                  <div style={styles.cardBody}>
                    <div style={styles.amountRow}>
                      <div>
                        <p style={styles.amountLabel}>커미션 금액</p>
                        <p style={styles.amountValue}>₩{c.commission_amount.toLocaleString()}</p>
                      </div>
                      <div style={styles.commissionInfo}>
                        <span style={styles.commissionLabel}>커미션율</span>
                        <span style={styles.commissionValue}>{c.commission_rate}%</span>
                      </div>
                    </div>
                    <div style={styles.cardMeta}>
                      <span style={styles.metaItem}>
                        주문금액: ₩{c.order_amount.toLocaleString()}
                      </span>
                      <span style={styles.metaItem}>
                        {c.period_start} ~ {c.period_end}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            style={{ ...styles.pageBtn, opacity: page <= 1 ? 0.4 : 1 }}
          >
            <ChevronLeft size={16} /> 이전
          </button>
          <span style={styles.pageInfo}>{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            style={{ ...styles.pageBtn, opacity: page >= totalPages ? 0.4 : 1 }}
          >
            다음 <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Info Notice */}
      <div style={styles.infoCard}>
        <p style={styles.infoText}>
          커미션은 배송 완료된 주문에 대해 계약된 커미션율로 자동 계산됩니다.<br />
          승인 후 정산 시점에 지급됩니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '24px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  headerIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: '#dcfce7',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  statsRow: {
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
    fontSize: '24px',
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
  filterRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
  },
  filterTab: {
    padding: '6px 16px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#64748b',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  filterTabActive: {
    backgroundColor: '#1e293b',
    color: '#fff',
    borderColor: '#1e293b',
  },
  section: {
    marginBottom: '24px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #f1f5f9',
  },
  cardInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 2px 0',
  },
  cardService: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  cardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '6px',
  },
  cardBody: {
    padding: '14px 20px',
  },
  amountRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  amountLabel: {
    fontSize: '12px',
    color: '#64748b',
    margin: '0 0 4px 0',
  },
  amountValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  commissionInfo: {
    textAlign: 'right' as const,
  },
  commissionLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '2px',
  },
  commissionValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#475569',
  },
  cardMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#64748b',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  pageBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    color: '#475569',
    fontSize: '13px',
    cursor: 'pointer',
  },
  pageInfo: {
    fontSize: '13px',
    color: '#64748b',
  },
  infoCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '16px 20px',
  },
  infoText: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
    lineHeight: 1.6,
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '40px 20px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
  },
  emptyStateText: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
};
