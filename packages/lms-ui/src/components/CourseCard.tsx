import type { CSSProperties, ReactNode } from 'react';
import type { CourseCardView } from '../types';
import { DEFAULT_ACCENT } from '../types';
import { CourseVisibilityBadge } from './CourseVisibilityBadge';
import { CourseProgressBar } from './CourseProgressBar';

export interface CourseCardProps {
  course: CourseCardView;
  /** 카드 클릭 시 이동 경로(렌더는 <a>). 서비스가 route 를 주입. */
  href?: string;
  /** href 대신 클릭 핸들러(라우터 navigate 등). */
  onClick?: () => void;
  accent?: string;
  /** 우상단 등 추가 배지/노드 슬롯(서비스별 승인필요/유료 등). */
  badgeSlot?: ReactNode;
  style?: CSSProperties;
}

const cardStyle: CSSProperties = {
  display: 'block',
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: '14px',
  overflow: 'hidden',
  textDecoration: 'none',
  color: 'inherit',
  cursor: 'pointer',
};

const thumbStyle: CSSProperties = {
  width: '100%',
  aspectRatio: '16 / 9',
  objectFit: 'cover',
  background: '#f1f5f9',
  display: 'block',
};

const placeholderStyle: CSSProperties = {
  ...thumbStyle,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '40px',
};

/**
 * 강의 카드 — 썸네일/제목/요약/강사/메타 + 공개·회원제 배지 + (수강 중) 진도.
 * route 는 href/onClick 으로 주입, accent 로 테마 색 주입(서비스 무관).
 */
export function CourseCard({ course, href, onClick, accent = DEFAULT_ACCENT, badgeSlot, style }: CourseCardProps) {
  const body = (
    <>
      {course.thumbnailUrl ? (
        <img src={course.thumbnailUrl} alt={course.title} style={thumbStyle} />
      ) : (
        <div style={placeholderStyle}>📚</div>
      )}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
          <CourseVisibilityBadge visibility={course.visibility} />
          {course.isPaid && (
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 10px', borderRadius: '9999px', background: '#fef3c7', color: '#b45309' }}>
              유료
            </span>
          )}
          {badgeSlot}
        </div>
        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px', color: '#0f172a' }}>{course.title}</h3>
        {course.description && (
          <p
            style={{
              fontSize: '13px',
              color: '#64748b',
              margin: '0 0 10px',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {course.description}
          </p>
        )}
        <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#94a3b8', flexWrap: 'wrap' }}>
          {course.instructorName && <span>👤 {course.instructorName}</span>}
          {typeof course.lessonCount === 'number' && <span>📖 {course.lessonCount}개 단계</span>}
          {typeof course.enrollmentCount === 'number' && <span>{course.enrollmentCount}명 진행중</span>}
        </div>
        {course.enrolled && typeof course.progressPercent === 'number' && (
          <div style={{ marginTop: '12px' }}>
            <CourseProgressBar percent={course.progressPercent} accent={accent} compact showLabel={false} />
          </div>
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <a href={href} style={{ ...cardStyle, ...style }}>
        {body}
      </a>
    );
  }
  return (
    <div role={onClick ? 'button' : undefined} onClick={onClick} style={{ ...cardStyle, ...style }}>
      {body}
    </div>
  );
}
