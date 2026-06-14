/**
 * CourseList — 카드형 강의 grid shell primitive.
 *
 * WO-O4O-LMS-COURSECARD-RETIRE-OR-SPECIALIZE-V1 (specialize / dormant)
 *
 * 역할: CourseCard 카드들의 grid + loading/error/empty shell. featured / 추천 / 관련 강의 등
 * **카드형 노출면**용. `/lms` 목록 hub 의 canonical 표현 아님 — canonical hub 목록은
 * `LmsHubTemplate`(@o4o/shared-space-ui, 테이블). 현재 실서비스 소비처 없음(dormant).
 */
import type { CSSProperties, ReactNode } from 'react';
import type { CourseCardView } from '../types';
import { DEFAULT_ACCENT } from '../types';
import { CourseCard } from './CourseCard';

export interface CourseListProps {
  courses: CourseCardView[];
  /** courseId → 이동 경로. 서비스가 route 를 주입. */
  hrefFor?: (course: CourseCardView) => string;
  /** hrefFor 대신 클릭 핸들러. */
  onCourseClick?: (course: CourseCardView) => void;
  accent?: string;
  loading?: boolean;
  error?: string | null;
  /** 목록 상단 슬롯(헤더/타이틀). */
  headerSlot?: ReactNode;
  /** 필터/검색 슬롯. */
  filterSlot?: ReactNode;
  /** 비었을 때 노드(미지정 시 기본 문구). */
  emptyState?: ReactNode;
  style?: CSSProperties;
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '16px',
};

const stateBox: CSSProperties = {
  padding: '40px 16px',
  textAlign: 'center',
  color: '#94a3b8',
  fontSize: '14px',
};

/**
 * 강의 카드 grid shell + loading/error/empty 상태. 데이터·route 는 주입받는다.
 */
export function CourseList({
  courses,
  hrefFor,
  onCourseClick,
  accent = DEFAULT_ACCENT,
  loading = false,
  error = null,
  headerSlot,
  filterSlot,
  emptyState,
  style,
}: CourseListProps) {
  return (
    <div style={style}>
      {headerSlot}
      {filterSlot}
      {loading ? (
        <div style={stateBox}>불러오는 중...</div>
      ) : error ? (
        <div style={{ ...stateBox, color: '#b91c1c' }}>{error}</div>
      ) : courses.length === 0 ? (
        emptyState ?? <div style={stateBox}>강의가 없습니다.</div>
      ) : (
        <div style={gridStyle}>
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              accent={accent}
              href={hrefFor?.(course)}
              onClick={onCourseClick ? () => onCourseClick(course) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
