/**
 * CourseListView — 카드형 강의 목록 공통 View
 *
 * WO-O4O-COMMUNITY-LMS-COURSE-LIST-AND-HUB-VIEW-COMMONIZATION-V1
 *
 * 역할: 카드 grid 형태의 강의 목록 화면(헤더 / 검색 / 필터 chip / 카드 grid /
 * loading·error·empty / 페이지네이션)을 서비스 무관하게 표현한다.
 *
 * canonical 구분:
 *   - 테이블형 `/lms` 목록 hub = `LmsHubTemplate`(@o4o/shared-space-ui)
 *   - 카드형 탐색 목록(예: KPA `/courses`) = 본 View
 *
 * 원칙(WO §4):
 *   - presentational 중심. fetch/axios/router/serviceKey 분기 없음.
 *   - 데이터·검색값·필터값·페이지는 모두 controlled props 로 주입받는다.
 *   - route 는 `hrefFor` / `onCourseClick` 으로 주입, 페이지네이션 UI 는 slot 주입.
 */

import type { CSSProperties, ReactNode } from 'react';
import type { CourseCardView } from '../types';
import { DEFAULT_ACCENT } from '../types';
import { CourseCard } from '../components/CourseCard';

export interface CourseListFilterOption {
  key: string;
  label: string;
}

export interface CourseListViewProps {
  courses: CourseCardView[];

  /** 조회 중. */
  loading?: boolean;
  /**
   * 조회 실패. 실패를 빈 목록으로 삼키지 않는다(O4O Load-Error 계약).
   * `errorSlot` 미지정 시 기본 문구 + `onRetry` 재시도 버튼을 렌더한다.
   */
  error?: boolean;
  onRetry?: () => void;
  errorSlot?: ReactNode;

  /** 카드 이동 경로(서비스가 route 주입). */
  hrefFor?: (course: CourseCardView) => string;
  onCourseClick?: (course: CourseCardView) => void;
  accent?: string;

  /** 목록 상단 헤더 슬롯(PageHeader / breadcrumb 등 서비스 shell). */
  headerSlot?: ReactNode;

  /** 검색 (미지정 시 검색 UI 미표시). */
  search?: {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    buttonLabel?: string;
  };

  /** 필터 chip (미지정 시 필터 UI 미표시). */
  filters?: {
    value: string;
    options: CourseListFilterOption[];
    onChange: (key: string) => void;
  };

  /** 목록 위 요약(예: `총 12개`). */
  countSlot?: ReactNode;

  /** 비었을 때 노드(미지정 시 기본 문구). */
  emptyState?: ReactNode;

  /** 목록 대신 표시할 게이트(비로그인 안내 등). 지정 시 목록/상태 렌더를 대체한다. */
  gateSlot?: ReactNode;

  /** 카드 배지/하단 슬롯 렌더러(서비스 문구). */
  renderCardBadge?: (course: CourseCardView) => ReactNode;
  renderCardFooter?: (course: CourseCardView) => ReactNode;
  /** 유료 배지 가격 표기(표시 전용). */
  priceLabelFor?: (course: CourseCardView) => string | undefined;
  /** 무료 강의에 `무료` 배지 노출. */
  freeBadge?: boolean;

  /** 페이지네이션 UI 슬롯(서비스 컴포넌트 주입). */
  paginationSlot?: ReactNode;

  style?: CSSProperties;
}

export function CourseListView({
  courses,
  loading = false,
  error = false,
  onRetry,
  errorSlot,
  hrefFor,
  onCourseClick,
  accent = DEFAULT_ACCENT,
  headerSlot,
  search,
  filters,
  countSlot,
  emptyState,
  gateSlot,
  renderCardBadge,
  renderCardFooter,
  priceLabelFor,
  freeBadge = false,
  paginationSlot,
  style,
}: CourseListViewProps) {
  const body = () => {
    if (loading) return <div style={stateBox}>불러오는 중...</div>;
    if (error) {
      return (
        errorSlot ?? (
          <div style={{ ...stateBox, color: '#b91c1c' }}>
            <p style={{ margin: '0 0 12px' }}>목록을 불러오지 못했습니다.</p>
            {onRetry && (
              <button type="button" onClick={onRetry} style={{ ...retryButtonStyle, borderColor: accent, color: accent }}>
                다시 시도
              </button>
            )}
          </div>
        )
      );
    }
    if (courses.length === 0) return <>{emptyState ?? <div style={stateBox}>강의가 없습니다.</div>}</>;
    return (
      <>
        <div style={gridStyle}>
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              accent={accent}
              href={hrefFor?.(course)}
              onClick={onCourseClick ? () => onCourseClick(course) : undefined}
              badgeSlot={renderCardBadge?.(course)}
              footerSlot={renderCardFooter?.(course)}
              priceLabel={priceLabelFor?.(course)}
              freeBadge={freeBadge}
            />
          ))}
        </div>
        {paginationSlot}
      </>
    );
  };

  return (
    <div style={style}>
      {headerSlot}

      {search && (
        <form
          style={searchFormStyle}
          onSubmit={(e) => {
            e.preventDefault();
            search.onSubmit();
          }}
        >
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? '검색어를 입력하세요'}
            aria-label={search.placeholder ?? '검색'}
            style={searchInputStyle}
          />
          <button type="submit" style={{ ...searchButtonStyle, backgroundColor: accent }}>
            {search.buttonLabel ?? '검색'}
          </button>
        </form>
      )}

      {filters && filters.options.length > 0 && (
        <div style={filterRowStyle}>
          {filters.options.map((opt) => {
            const active = filters.value === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                aria-pressed={active}
                onClick={() => filters.onChange(opt.key)}
                style={{
                  ...filterChipStyle,
                  ...(active ? { backgroundColor: accent, color: '#ffffff', borderColor: accent } : {}),
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {countSlot && <div style={countStyle}>{countSlot}</div>}

      {gateSlot ?? body()}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
  gap: '24px',
};

const stateBox: CSSProperties = {
  padding: '40px 16px',
  textAlign: 'center',
  color: '#94a3b8',
  fontSize: '14px',
};

const retryButtonStyle: CSSProperties = {
  padding: '8px 20px',
  background: '#ffffff',
  border: '1px solid',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const searchFormStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '16px',
};

const searchInputStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  padding: '12px 16px',
  border: '1px solid #cbd5e1',
  borderRadius: '8px',
  fontSize: '15px',
  outline: 'none',
};

const searchButtonStyle: CSSProperties = {
  padding: '12px 24px',
  color: '#ffffff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 500,
  cursor: 'pointer',
  flexShrink: 0,
};

const filterRowStyle: CSSProperties = {
  display: 'flex',
  gap: '8px',
  marginBottom: '24px',
  flexWrap: 'wrap',
};

const filterChipStyle: CSSProperties = {
  padding: '8px 20px',
  border: '1px solid #cbd5e1',
  borderRadius: '20px',
  backgroundColor: '#ffffff',
  color: '#475569',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
};

const countStyle: CSSProperties = {
  fontSize: '13px',
  color: '#64748b',
  marginBottom: '8px',
};
