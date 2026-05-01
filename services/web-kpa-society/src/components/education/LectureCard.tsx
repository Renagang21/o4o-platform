/**
 * LectureCard - 개별 강의 카드
 *
 * 강의 제목, 유형(무료/유료), 진행 상태, 강사명, CTA
 * 로그인 전: "로그인 후 수강 가능" / 로그인 후: "수강하기/이어보기"
 */

import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, borderRadius, shadows, typography } from '../../styles/theme';

export interface LectureData {
  id: string;
  title: string;
  description: string;
  instructorName: string;
  duration: number; // minutes
  lessonCount: number;
  category: string;
  isFree: boolean;
  thumbnail?: string;
  // 로그인 후 상태
  progress?: number; // 0-100
  status?: 'not_started' | 'in_progress' | 'completed';
}

export function LectureCard({ lecture }: { lecture: LectureData }) {
  const { isAuthenticated } = useAuth();

  const isCompleted = lecture.status === 'completed';
  const isInProgress = lecture.status === 'in_progress';

  return (
    <div style={{
      ...styles.card,
      ...(isCompleted ? styles.cardCompleted : {}),
    }}>
      {/* 썸네일 */}
      <div style={styles.thumbnail}>
        {lecture.thumbnail ? (
          <img src={lecture.thumbnail} alt={lecture.title} style={styles.thumbnailImg} />
        ) : (
          <span style={styles.thumbnailFallback}>📚</span>
        )}
      </div>

      {/* 콘텐츠 */}
      <div style={styles.content}>
        {/* 배지 행 */}
        <div style={styles.badges}>
          <span style={lecture.isFree ? styles.badgeFree : styles.badgePaid}>
            {lecture.isFree ? '무료' : '유료'}
          </span>
          {lecture.status && (
            <span style={
              isCompleted ? styles.badgeCompleted :
              isInProgress ? styles.badgeOngoing :
              styles.badgeNotStarted
            }>
              {isCompleted ? '완료' : isInProgress ? '수강중' : '미수강'}
            </span>
          )}
        </div>

        {/* 제목/설명 */}
        <h3 style={styles.title}>{lecture.title}</h3>
        <p style={styles.desc}>{lecture.description}</p>

        {/* 메타 */}
        <div style={styles.meta}>
          <span>{lecture.instructorName}</span>
          <span style={styles.dot}>·</span>
          <span>{lecture.lessonCount}개 강의</span>
          <span style={styles.dot}>·</span>
          <span>{Math.round(lecture.duration / 60)}시간</span>
        </div>

        {/* 진행률 바 (수강중일 때) */}
        {isInProgress && lecture.progress !== undefined && (
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${lecture.progress}%` }} />
          </div>
        )}

        {/* CTA */}
        <div style={styles.ctaArea}>
          {isAuthenticated ? (
            <Link
              to={`/lms/course/${lecture.id}`}
              style={isInProgress ? styles.ctaContinue : styles.ctaStart}
            >
              {isCompleted ? '다시 보기' : isInProgress ? '이어보기' : '수강하기'}
            </Link>
          ) : (
            <span style={styles.ctaDisabled}>로그인 후 수강 가능</span>
          )}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    boxShadow: shadows.sm,
    border: `1px solid ${colors.neutral100}`,
    overflow: 'hidden',
    transition: 'box-shadow 0.2s',
  },
  cardCompleted: {
    opacity: 0.7,
  },
  thumbnail: {
    width: '100%',
    height: '140px',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  thumbnailFallback: {
    fontSize: '2.5rem',
  },
  content: {
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  badges: {
    display: 'flex',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  badgeFree: {
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    backgroundColor: '#ecfdf5',
    color: '#059669',
    fontSize: '0.688rem',
    fontWeight: 500,
  },
  badgePaid: {
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    backgroundColor: '#fef3c7',
    color: '#92400e',
    fontSize: '0.688rem',
    fontWeight: 500,
  },
  badgeCompleted: {
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    fontSize: '0.688rem',
    fontWeight: 500,
  },
  badgeOngoing: {
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    backgroundColor: `${colors.primary}10`,
    color: colors.primary,
    fontSize: '0.688rem',
    fontWeight: 500,
  },
  badgeNotStarted: {
    padding: '2px 8px',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.neutral50,
    color: colors.neutral400,
    fontSize: '0.688rem',
    fontWeight: 500,
  },
  title: {
    ...typography.headingS,
    margin: 0,
    color: colors.neutral900,
  },
  desc: {
    margin: `${spacing.xs} 0 0`,
    fontSize: '0.813rem',
    color: colors.neutral500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  meta: {
    display: 'flex',
    gap: spacing.xs,
    marginTop: spacing.sm,
    fontSize: '0.75rem',
    color: colors.neutral400,
  },
  dot: {
    color: colors.neutral300,
  },
  progressBar: {
    marginTop: spacing.sm,
    height: '4px',
    backgroundColor: colors.neutral100,
    borderRadius: '2px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: '2px',
    transition: 'width 0.3s',
  },
  ctaArea: {
    marginTop: spacing.md,
  },
  ctaStart: {
    display: 'inline-block',
    padding: `${spacing.xs} ${spacing.md}`,
    fontSize: '0.813rem',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
  },
  ctaContinue: {
    display: 'inline-block',
    padding: `${spacing.xs} ${spacing.md}`,
    fontSize: '0.813rem',
    fontWeight: 600,
    color: colors.primary,
    backgroundColor: `${colors.primary}10`,
    textDecoration: 'none',
    borderRadius: borderRadius.md,
  },
  ctaDisabled: {
    fontSize: '0.813rem',
    color: colors.neutral400,
  },
};
