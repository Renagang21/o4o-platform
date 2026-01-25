/**
 * EventManagementSection - 행사 관리 섹션
 *
 * WO-KPA-ORGANIZATION-STRUCTURE-V1
 * - 지부/분회 회원 대상 행사 관리
 * - 참여, 장소, 비용 등 행사 전반 관리
 * - 특별위원회 또는 상임위원회 주관
 */

import { Link } from 'react-router-dom';
import { colors } from '../../styles/theme';
import type { OrganizationEvent, OfficerRole } from '../../types/organization';

interface EventManagementSectionProps {
  role: OfficerRole;
  events: OrganizationEvent[];
  committeeId?: string;
  committeeName?: string;
  showManageButton?: boolean;
  onCreateEvent?: () => void;
}

export function EventManagementSection({
  role,
  events,
  committeeId,
  committeeName,
  showManageButton = true,
  onCreateEvent,
}: EventManagementSectionProps) {
  // 역할에 따라 행사 필터링
  const filteredEvents = events.filter(event => {
    // 회장/운영자는 모든 행사
    if (role === 'president' || role === 'operator') return true;
    // 부회장은 산하 위원회 행사 (TODO: 산하 위원회 목록 필요)
    if (role === 'vice_president') return true;
    // 위원장은 자신의 위원회 행사만
    if (role === 'committee_chair' && event.committeeId === committeeId) return true;
    // 고문은 승인된 행사만
    if (role === 'advisor' && event.status !== 'planning') return true;
    return false;
  });

  // 상태별 정렬
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const statusOrder = { in_progress: 0, approved: 1, planning: 2, completed: 3, cancelled: 4 };
    const orderA = statusOrder[a.status] ?? 5;
    const orderB = statusOrder[b.status] ?? 5;
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });

  const getEventTypeIcon = (type: OrganizationEvent['eventType']) => {
    switch (type) {
      case 'meeting': return '📋';
      case 'seminar': return '🎓';
      case 'workshop': return '🛠️';
      case 'social': return '🎉';
      case 'general_assembly': return '🏛️';
      default: return '📌';
    }
  };

  const getEventTypeLabel = (type: OrganizationEvent['eventType']) => {
    switch (type) {
      case 'meeting': return '회의';
      case 'seminar': return '세미나';
      case 'workshop': return '워크숍';
      case 'social': return '친목행사';
      case 'general_assembly': return '총회';
      default: return '기타';
    }
  };

  const getStatusStyle = (status: OrganizationEvent['status']) => {
    switch (status) {
      case 'planning':
        return { backgroundColor: '#E0E7FF', color: '#4F46E5' };
      case 'approved':
        return { backgroundColor: '#D1FAE5', color: '#059669' };
      case 'in_progress':
        return { backgroundColor: '#FEF3C7', color: '#D97706' };
      case 'completed':
        return { backgroundColor: colors.neutral200, color: colors.neutral600 };
      case 'cancelled':
        return { backgroundColor: '#FEE2E2', color: '#DC2626' };
      default:
        return { backgroundColor: colors.neutral200, color: colors.neutral600 };
    }
  };

  const getStatusLabel = (status: OrganizationEvent['status']) => {
    switch (status) {
      case 'planning': return '기획중';
      case 'approved': return '승인됨';
      case 'in_progress': return '진행중';
      case 'completed': return '완료';
      case 'cancelled': return '취소됨';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const canManageEvents = role === 'president' || role === 'operator' || role === 'committee_chair';

  return (
    <div style={styles.eventSection}>
      <div style={styles.eventHeader}>
        <h2 style={styles.sectionTitle}>
          🎪 행사 관리
          {role === 'committee_chair' && committeeName && (
            <span style={styles.scopeLabel}> ({committeeName})</span>
          )}
        </h2>
        {showManageButton && canManageEvents && (
          <button onClick={onCreateEvent} style={styles.createButton}>
            + 행사 등록
          </button>
        )}
      </div>

      {/* 행사 요약 통계 */}
      <div style={styles.eventStats}>
        <div style={styles.eventStatCard}>
          <span style={styles.eventStatValue}>
            {filteredEvents.filter(e => e.status === 'in_progress').length}
          </span>
          <span style={styles.eventStatLabel}>진행중</span>
        </div>
        <div style={styles.eventStatCard}>
          <span style={styles.eventStatValue}>
            {filteredEvents.filter(e => e.status === 'approved').length}
          </span>
          <span style={styles.eventStatLabel}>예정</span>
        </div>
        <div style={styles.eventStatCard}>
          <span style={styles.eventStatValue}>
            {filteredEvents.filter(e => e.status === 'planning').length}
          </span>
          <span style={styles.eventStatLabel}>기획중</span>
        </div>
        <div style={styles.eventStatCard}>
          <span style={styles.eventStatValue}>
            {filteredEvents.filter(e => e.status === 'completed').length}
          </span>
          <span style={styles.eventStatLabel}>완료</span>
        </div>
      </div>

      {/* 행사 목록 */}
      <div style={styles.eventList}>
        {sortedEvents.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📭</span>
            <p style={styles.emptyText}>등록된 행사가 없습니다.</p>
          </div>
        ) : (
          sortedEvents.slice(0, 4).map((event) => (
            <div key={event.id} style={styles.eventCard}>
              <div style={styles.eventCardHeader}>
                <div style={styles.eventTitleRow}>
                  <span style={styles.eventIcon}>{getEventTypeIcon(event.eventType)}</span>
                  <span style={styles.eventTitle}>{event.title}</span>
                </div>
                <span style={{ ...styles.statusTag, ...getStatusStyle(event.status) }}>
                  {getStatusLabel(event.status)}
                </span>
              </div>

              <div style={styles.eventDetails}>
                <div style={styles.eventDetailRow}>
                  <span style={styles.eventDetailIcon}>📅</span>
                  <span style={styles.eventDetailText}>
                    {formatDate(event.startDate)}
                    {event.time && ` ${event.time}`}
                    {event.endDate && event.endDate !== event.startDate && ` ~ ${formatDate(event.endDate)}`}
                  </span>
                </div>
                {event.location && (
                  <div style={styles.eventDetailRow}>
                    <span style={styles.eventDetailIcon}>📍</span>
                    <span style={styles.eventDetailText}>{event.location}</span>
                  </div>
                )}
                <div style={styles.eventDetailRow}>
                  <span style={styles.eventDetailIcon}>👥</span>
                  <span style={styles.eventDetailText}>
                    {event.currentParticipants}명 참여
                    {event.maxParticipants && ` / ${event.maxParticipants}명`}
                  </span>
                </div>
              </div>

              {/* 비용 정보 - 위원장 이상만 표시 */}
              {canManageEvents && (event.estimatedBudget || event.actualCost) && (
                <div style={styles.eventBudget}>
                  {event.estimatedBudget && (
                    <span style={styles.budgetItem}>
                      예산: {formatCurrency(event.estimatedBudget)}
                    </span>
                  )}
                  {event.actualCost && (
                    <span style={styles.budgetItem}>
                      실비용: {formatCurrency(event.actualCost)}
                    </span>
                  )}
                </div>
              )}

              <div style={styles.eventCardFooter}>
                <span style={styles.eventType}>{getEventTypeLabel(event.eventType)}</span>
                {event.isSpecialCommittee && (
                  <span style={styles.specialTag}>특별위원회</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {sortedEvents.length > 4 && (
        <Link to="/intranet/events" style={styles.viewAllLink}>
          전체 행사 보기 ({sortedEvents.length}개) →
        </Link>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  eventSection: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    marginTop: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  scopeLabel: {
    fontSize: '14px',
    fontWeight: 400,
    color: colors.neutral500,
  },
  createButton: {
    padding: '8px 14px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  eventStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  eventStatCard: {
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    textAlign: 'center',
  },
  eventStatValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
  },
  eventStatLabel: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  eventList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  eventCard: {
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '10px',
    border: `1px solid ${colors.neutral100}`,
  },
  eventCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
  },
  eventTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  eventIcon: {
    fontSize: '18px',
  },
  eventTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  statusTag: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  eventDetails: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '12px',
  },
  eventDetailRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  eventDetailIcon: {
    fontSize: '12px',
  },
  eventDetailText: {
    fontSize: '13px',
    color: colors.neutral600,
  },
  eventBudget: {
    display: 'flex',
    gap: '12px',
    padding: '8px 10px',
    backgroundColor: colors.white,
    borderRadius: '6px',
    marginBottom: '12px',
  },
  budgetItem: {
    fontSize: '12px',
    color: colors.neutral700,
  },
  eventCardFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderTop: `1px solid ${colors.neutral200}`,
    paddingTop: '12px',
  },
  eventType: {
    padding: '3px 8px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  specialTag: {
    padding: '3px 8px',
    backgroundColor: '#FEF3C7',
    color: '#D97706',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  viewAllLink: {
    display: 'block',
    textAlign: 'center',
    padding: '12px',
    color: colors.primary,
    fontSize: '14px',
    textDecoration: 'none',
    marginTop: '16px',
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '32px',
  },
  emptyIcon: {
    fontSize: '32px',
    display: 'block',
    marginBottom: '8px',
  },
  emptyText: {
    color: colors.neutral500,
    margin: 0,
  },
};

export default EventManagementSection;
