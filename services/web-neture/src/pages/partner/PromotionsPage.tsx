/**
 * PromotionsPage - 파트너 프로모션 현황
 *
 * Work Order: WO-NETURE-PARTNER-DASHBOARD-HUB
 *
 * 프로모션/캠페인 현황:
 * - 진행 중인 캠페인
 * - 예정된 캠페인
 * - 종료된 캠페인
 */

import { Link } from 'react-router-dom';
import { ArrowLeft, Megaphone, Calendar, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';

// TODO: API 연동 필요 - 현재 빈 배열
const promotions: {
  id: string;
  name: string;
  service: string;
  status: 'active' | 'scheduled' | 'ended';
  startDate: string;
  endDate: string;
  targetCount: number;
  currentCount: number;
}[] = [];

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'active':
      return { label: '진행 중', color: '#16a34a', bgColor: '#dcfce7', icon: TrendingUp };
    case 'scheduled':
      return { label: '예정', color: '#2563eb', bgColor: '#dbeafe', icon: Clock };
    case 'ended':
      return { label: '종료', color: '#64748b', bgColor: '#f1f5f9', icon: CheckCircle };
    default:
      return { label: '알 수 없음', color: '#64748b', bgColor: '#f1f5f9', icon: XCircle };
  }
};

export function PromotionsPage() {
  const activeCount = promotions.filter(p => p.status === 'active').length;
  const scheduledCount = promotions.filter(p => p.status === 'scheduled').length;

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
          <Megaphone size={28} style={{ color: '#f59e0b' }} />
        </div>
        <div>
          <h1 style={styles.title}>프로모션</h1>
          <p style={styles.subtitle}>
            캠페인 현황을 확인합니다
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={styles.statsRow}>
        <div style={styles.statCard}>
          <TrendingUp size={24} style={{ color: '#16a34a' }} />
          <div>
            <p style={styles.statValue}>{activeCount}</p>
            <p style={styles.statLabel}>진행 중</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Clock size={24} style={{ color: '#2563eb' }} />
          <div>
            <p style={styles.statValue}>{scheduledCount}</p>
            <p style={styles.statLabel}>예정됨</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <Megaphone size={24} style={{ color: '#f59e0b' }} />
          <div>
            <p style={styles.statValue}>{promotions.length}</p>
            <p style={styles.statLabel}>전체 캠페인</p>
          </div>
        </div>
      </div>

      {/* Promotions List */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>캠페인 목록</h2>
        {promotions.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyStateText}>등록된 캠페인이 없습니다.</p>
          </div>
        ) : (
        <div style={styles.list}>
          {promotions.map((promo) => {
            const statusInfo = getStatusInfo(promo.status);
            const StatusIcon = statusInfo.icon;
            const progress = promo.targetCount > 0
              ? Math.round((promo.currentCount / promo.targetCount) * 100)
              : 0;

            return (
              <div key={promo.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div style={styles.cardInfo}>
                    <div>
                      <h3 style={styles.cardTitle}>{promo.name}</h3>
                      <p style={styles.cardService}>{promo.service}</p>
                    </div>
                  </div>
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: statusInfo.bgColor,
                    color: statusInfo.color,
                  }}>
                    <StatusIcon size={14} />
                    {statusInfo.label}
                  </span>
                </div>
                <div style={styles.cardBody}>
                  <div style={styles.dateRow}>
                    <Calendar size={14} style={{ color: '#64748b' }} />
                    <span style={styles.dateText}>
                      {promo.startDate} ~ {promo.endDate}
                    </span>
                  </div>
                  {promo.status !== 'scheduled' && (
                    <div style={styles.progressSection}>
                      <div style={styles.progressHeader}>
                        <span style={styles.progressLabel}>달성률</span>
                        <span style={styles.progressValue}>
                          {promo.currentCount.toLocaleString()} / {promo.targetCount.toLocaleString()} ({progress}%)
                        </span>
                      </div>
                      <div style={styles.progressBar}>
                        <div style={{
                          ...styles.progressFill,
                          width: `${Math.min(progress, 100)}%`,
                          backgroundColor: progress >= 100 ? '#16a34a' : '#2563eb',
                        }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Info Notice */}
      <div style={styles.infoCard}>
        <p style={styles.infoText}>
          캠페인 생성 및 수정은 각 서비스의 파트너 페이지에서 처리됩니다.<br />
          여기서는 전체 현황만 확인할 수 있습니다.
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
    backgroundColor: '#fef3c7',
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
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '12px',
  },
  dateText: {
    fontSize: '13px',
    color: '#64748b',
  },
  progressSection: {
    marginTop: '8px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  progressLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  progressValue: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#1e293b',
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#e2e8f0',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
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
