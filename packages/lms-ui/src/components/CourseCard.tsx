/**
 * CourseCard — 카드형 강의 primitive.
 *
 * WO-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1 (specialize)
 * WO-O4O-COMMUNITY-LMS-COURSE-LIST-AND-HUB-VIEW-COMMONIZATION-V1 (활성화)
 *
 * 역할: 카드형 강의 노출면(탐색 목록 / 강사 프로필 등)의 presentational primitive.
 * `/lms` 목록 hub 의 canonical 표현이 아니다 — canonical hub 목록은
 * `LmsHubTemplate`(@o4o/shared-space-ui, 테이블)이다.
 * 카드형 목록의 canonical View 는 `views/CourseListView` 이며 본 카드를 소비한다.
 * LmsHubTemplate 과 결합하지 않는다(표현 상이).
 */
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
  /**
   * 유료 배지에 덧붙일 가격 표기(예: `₩30,000`). 결제 기능 아님 — 표시 전용.
   * WO-O4O-COMMUNITY-LMS-COURSE-LIST-AND-HUB-VIEW-COMMONIZATION-V1
   */
  priceLabel?: string;
  /** 무료(=!isPaid)일 때 `무료` 배지 노출 여부. 서비스 config 로 결정. */
  freeBadge?: boolean;
  /** 카드 하단 슬롯(수강 인원 / 상세 링크 문구 등 서비스 문구). */
  footerSlot?: ReactNode;
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

const footerStyle: CSSProperties = {
  marginTop: '12px',
  paddingTop: '12px',
  borderTop: '1px solid #f1f5f9',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '12px',
};

/** 분 단위 재생시간 표기(`1시간 20분`). 서비스별 중복 helper 를 공통화한다. */
function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  return `${m}분`;
}

/**
 * 강의 카드 — 썸네일/제목/요약/강사/메타 + 공개·회원제 배지 + (수강 중) 진도.
 * route 는 href/onClick 으로 주입, accent 로 테마 색 주입(서비스 무관).
 */
export function CourseCard({
  course,
  href,
  onClick,
  accent = DEFAULT_ACCENT,
  badgeSlot,
  priceLabel,
  freeBadge = false,
  footerSlot,
  style,
}: CourseCardProps) {
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
          {course.isPaid ? (
            <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 10px', borderRadius: '9999px', background: '#fef3c7', color: '#b45309' }}>
              {priceLabel ? `유료 ${priceLabel}` : '유료'}
            </span>
          ) : (
            freeBadge && (
              <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 10px', borderRadius: '9999px', background: '#ecfdf5', color: '#059669' }}>
                무료
              </span>
            )
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
          {typeof course.durationMinutes === 'number' && course.durationMinutes > 0 && (
            <span>⏱ {formatDuration(course.durationMinutes)}</span>
          )}
          {typeof course.enrollmentCount === 'number' && <span>{course.enrollmentCount}명 진행중</span>}
        </div>
        {course.enrolled && typeof course.progressPercent === 'number' && (
          <div style={{ marginTop: '12px' }}>
            <CourseProgressBar percent={course.progressPercent} accent={accent} compact showLabel={false} />
          </div>
        )}
        {footerSlot && <div style={footerStyle}>{footerSlot}</div>}
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
