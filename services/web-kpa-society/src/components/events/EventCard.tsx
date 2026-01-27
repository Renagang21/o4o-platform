/**
 * EventCard - 이벤트 카드
 *
 * 이벤트 유형, 제공자, 참여 상태, 로그인 분기 CTA
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, shadows } from '../../styles/theme';

export interface EventData {
  id: string;
  title: string;
  description: string;
  type: 'quiz' | 'survey' | 'corporate';
  providerName?: string;
  startDate: string;
  endDate?: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  participantCount: number;
  maxParticipants?: number;
  participated?: boolean;
}

const typeLabels: Record<EventData['type'], string> = {
  quiz: '퀴즈',
  survey: '설문조사',
  corporate: '업체 이벤트',
};

const statusLabels: Record<EventData['status'], string> = {
  upcoming: '예정',
  ongoing: '진행중',
  ended: '마감',
};

export function EventCard({ event }: { event: EventData }) {
  const { isAuthenticated } = useAuth();

  const isCorporate = event.type === 'corporate';

  return (
    <div style={styles.card}>
      {/* 상단: 유형 + 상태 */}
      <div style={styles.header}>
        <div style={styles.badges}>
          <span style={{
            ...styles.typeBadge,
            ...(isCorporate ? styles.corporateBadge : {}),
          }}>
            {typeLabels[event.type]}
          </span>
          {isCorporate && event.providerName && (
            <span style={styles.providerBadge}>
              {event.providerName} 제공
            </span>
          )}
        </div>
        <span style={{
          ...styles.statusBadge,
          ...getStatusStyle(event.status),
        }}>
          {statusLabels[event.status]}
        </span>
      </div>

      {/* 제목 + 설명 */}
      <h3 style={styles.title}>{event.title}</h3>
      <p style={styles.description}>{event.description}</p>

      {/* 정보 */}
      <div style={styles.meta}>
        <span style={styles.metaItem}>
          {formatDate(event.startDate)}
          {event.endDate ? ` ~ ${formatDate(event.endDate)}` : ''}
        </span>
        <span style={styles.metaItem}>
          참여 {event.participantCount}명
          {event.maxParticipants ? ` / ${event.maxParticipants}명` : ''}
        </span>
      </div>

      {/* 참여 진행률 (정원 있을 때) */}
      {event.maxParticipants && (
        <div style={styles.progressBar}>
          <div style={{
            ...styles.progressFill,
            width: `${Math.min((event.participantCount / event.maxParticipants) * 100, 100)}%`,
          }} />
        </div>
      )}

      {/* CTA */}
      <div style={styles.actions}>
        {event.participated ? (
          <span style={styles.participatedLabel}>참여 완료</span>
        ) : event.status === 'ended' ? (
          <span style={styles.endedLabel}>마감</span>
        ) : isAuthenticated ? (
          <Link to={`/demo/participation/${event.id}/respond`} style={styles.participateBtn}>
            참여하기
          </Link>
        ) : (
          <Link to="/login" style={styles.loginBtn}>
            로그인 후 참여
          </Link>
        )}
        <Link to={`/demo/events/${event.id}`} style={styles.detailBtn}>
          상세보기
        </Link>
      </div>
    </div>
  );
}

function getStatusStyle(status: EventData['status']): React.CSSProperties {
  switch (status) {
    case 'upcoming':
      return { backgroundColor: `${colors.info}10`, color: colors.info };
    case 'ongoing':
      return { backgroundColor: `${colors.success}10`, color: colors.success };
    case 'ended':
      return { backgroundColor: `${colors.neutral200}`, color: colors.neutral500 };
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  badges: {
    display: 'flex',
    gap: spacing.xs,
    alignItems: 'center',
  },
  typeBadge: {
    padding: `2px ${spacing.sm}`,
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
  },
  corporateBadge: {
    backgroundColor: `${colors.accentYellow}15`,
    color: colors.accentYellow,
  },
  providerBadge: {
    padding: `2px ${spacing.sm}`,
    fontSize: '0.7rem',
    fontWeight: 500,
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.accentYellow}10`,
    color: colors.accentYellow,
    border: `1px solid ${colors.accentYellow}30`,
  },
  statusBadge: {
    padding: `2px ${spacing.sm}`,
    fontSize: '0.75rem',
    fontWeight: 600,
    borderRadius: borderRadius.sm,
  },
  title: {
    margin: `0 0 ${spacing.xs}`,
    fontSize: '1rem',
    fontWeight: 600,
    color: colors.neutral900,
    lineHeight: 1.4,
  },
  description: {
    margin: `0 0 ${spacing.md}`,
    fontSize: '0.875rem',
    color: colors.neutral500,
    lineHeight: 1.5,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  meta: {
    display: 'flex',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  metaItem: {
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  progressBar: {
    height: '4px',
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accentGreen,
    borderRadius: borderRadius.sm,
    transition: 'width 0.3s',
  },
  actions: {
    display: 'flex',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  participateBtn: {
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
    textAlign: 'center',
  },
  loginBtn: {
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.primary,
    textDecoration: 'none',
    border: `1px solid ${colors.primary}`,
    borderRadius: borderRadius.md,
    textAlign: 'center',
  },
  participatedLabel: {
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.accentGreen,
    textAlign: 'center',
    backgroundColor: `${colors.accentGreen}10`,
    borderRadius: borderRadius.md,
  },
  endedLabel: {
    flex: 1,
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral400,
    textAlign: 'center',
    backgroundColor: colors.neutral100,
    borderRadius: borderRadius.md,
  },
  detailBtn: {
    padding: `${spacing.sm} ${spacing.md}`,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: colors.neutral600,
    textDecoration: 'none',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: borderRadius.md,
    textAlign: 'center',
  },
};
