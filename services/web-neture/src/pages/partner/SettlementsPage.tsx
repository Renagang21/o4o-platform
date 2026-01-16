/**
 * SettlementsPage - 파트너 정산 내역
 *
 * Work Order: WO-NETURE-PARTNER-DASHBOARD-HUB
 *
 * 정산 현황:
 * - 정산 내역 목록
 * - 월별 요약
 * - 커미션 정보 (읽기 전용)
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Calendar, CheckCircle, Clock, TrendingUp, Download } from 'lucide-react';

// Mock 데이터: 정산 내역
const settlements = [
  {
    id: '1',
    month: '2025년 1월',
    service: 'GlycoPharm',
    amount: 850000,
    status: 'completed',
    paidDate: '2025-01-15',
    commission: 8.5,
  },
  {
    id: '2',
    month: '2025년 1월',
    service: 'K-Cosmetics',
    amount: 420000,
    status: 'pending',
    paidDate: null,
    commission: 7.0,
  },
  {
    id: '3',
    month: '2024년 12월',
    service: 'GlycoPharm',
    amount: 720000,
    status: 'completed',
    paidDate: '2025-01-05',
    commission: 8.5,
  },
  {
    id: '4',
    month: '2024년 12월',
    service: 'K-Cosmetics',
    amount: 380000,
    status: 'completed',
    paidDate: '2025-01-05',
    commission: 7.0,
  },
];

export function SettlementsPage() {
  const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
  const completedAmount = settlements
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => sum + s.amount, 0);
  const pendingAmount = settlements
    .filter(s => s.status === 'pending')
    .reduce((sum, s) => sum + s.amount, 0);

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
          <h1 style={styles.title}>정산 내역</h1>
          <p style={styles.subtitle}>
            커미션 및 정산 현황을 확인합니다
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <TrendingUp size={24} style={{ color: '#2563eb' }} />
          <div>
            <p style={styles.statValue}>{totalAmount.toLocaleString()}</p>
            <p style={styles.statLabel}>총 정산액 (원)</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <CheckCircle size={24} style={{ color: '#16a34a' }} />
          <div>
            <p style={styles.statValue}>{completedAmount.toLocaleString()}</p>
            <p style={styles.statLabel}>지급 완료 (원)</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Clock size={24} style={{ color: '#f59e0b' }} />
          <div>
            <p style={styles.statValue}>{pendingAmount.toLocaleString()}</p>
            <p style={styles.statLabel}>지급 대기 (원)</p>
          </div>
        </div>
      </div>

      {/* Settlements List */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>정산 내역</h2>
        <div style={styles.list}>
          {settlements.map((settlement) => (
            <div key={settlement.id} style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={styles.cardInfo}>
                  <div>
                    <h3 style={styles.cardTitle}>{settlement.month}</h3>
                    <p style={styles.cardService}>{settlement.service}</p>
                  </div>
                </div>
                <div style={styles.cardRight}>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: settlement.status === 'completed' ? '#dcfce7' : '#fef3c7',
                    color: settlement.status === 'completed' ? '#166534' : '#92400e',
                  }}>
                    {settlement.status === 'completed' ? (
                      <>
                        <CheckCircle size={14} />
                        지급 완료
                      </>
                    ) : (
                      <>
                        <Clock size={14} />
                        지급 대기
                      </>
                    )}
                  </span>
                </div>
              </div>
              <div style={styles.cardBody}>
                <div style={styles.amountRow}>
                  <div>
                    <p style={styles.amountLabel}>정산 금액</p>
                    <p style={styles.amountValue}>₩{settlement.amount.toLocaleString()}</p>
                  </div>
                  <div style={styles.commissionInfo}>
                    <span style={styles.commissionLabel}>커미션율</span>
                    <span style={styles.commissionValue}>{settlement.commission}%</span>
                  </div>
                </div>
                <div style={styles.cardMeta}>
                  <span style={styles.metaItem}>
                    <Calendar size={14} />
                    {settlement.paidDate ? `지급일: ${settlement.paidDate}` : '지급 예정'}
                  </span>
                  {settlement.status === 'completed' && (
                    <button style={styles.downloadBtn}>
                      <Download size={14} />
                      명세서
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info Notice */}
      <div style={styles.infoCard}>
        <p style={styles.infoText}>
          정산은 매월 5일에 전월 실적을 기준으로 지급됩니다.<br />
          상세 정산 내역 및 세금계산서는 각 서비스에서 확인해 주세요.
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
    marginBottom: '32px',
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
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#475569',
    margin: '0 0 16px 0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
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
  downloadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#2563eb',
    backgroundColor: 'transparent',
    border: '1px solid #2563eb',
    borderRadius: '6px',
    padding: '6px 12px',
    cursor: 'pointer',
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
};
