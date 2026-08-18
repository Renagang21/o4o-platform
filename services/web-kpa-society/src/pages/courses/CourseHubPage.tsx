/**
 * CourseHubPage - Course 허브 (공개 탐색 페이지)
 *
 * WO-CONTENT-COURSE-HUB-DESIGN-V1 (최초 설계)
 * WO-O4O-COMMUNITY-LMS-COURSE-LIST-AND-HUB-VIEW-COMMONIZATION-V1:
 *   자체 카드 grid / 검색 / 필터 chip / loading·error·empty / 페이지네이션 JSX 를
 *   공통 `CourseListView`(@o4o/lms-ui)로 수렴. 본 페이지는 데이터 조회 + route +
 *   서비스 config 만 담당한다(presentational 중복 제거).
 *
 * 유지되는 KPA 고유 동작:
 *   - 미인증 시 로그인 유도 게이트(gateSlot)
 *   - 가격 필터(무료/유료) — API 미지원이라 client-side 필터
 *   - 상세 경로 `/courses/:id`
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
import { CourseListView, type CourseCardView } from '@o4o/lms-ui';
import { PageHeader, LoadingSpinner, EmptyState, Pagination } from '../../components/common';
import { lmsApi } from '../../api';
import { useAuth } from '../../contexts';
import { useAuthModal } from '../../contexts/LoginModalContext';
import { colors, typography } from '../../styles/theme';
import type { Course } from '../../types';

type PriceFilter = 'all' | 'free' | 'paid';

const PRICE_OPTIONS = [
  { key: 'all', label: '전체' },
  { key: 'free', label: '무료' },
  { key: 'paid', label: '유료' },
];

/** Course(API) → 공통 카드 view model. */
function toCardView(c: Course): CourseCardView {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    thumbnailUrl: c.thumbnail,
    instructorName: (c as any).instructor?.name || c.instructorName || undefined,
    lessonCount: c.lessonCount,
    durationMinutes: c.duration,
    enrollmentCount: c.enrollmentCount,
    isPaid: !!c.isPaid,
  };
}

export function CourseHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { openLoginModal } = useAuthModal();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentSearch = searchParams.get('search') || '';
  const currentPrice = (searchParams.get('price') || 'all') as PriceFilter;

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, currentPage, currentSearch]);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const res = await lmsApi.getCourses({
        search: currentSearch || undefined,
        page: currentPage,
        limit: 12,
      });
      setCourses(res.data || []);
      const pag = (res as any).pagination;
      setTotalPages(pag?.totalPages || res.totalPages || 1);
    } catch {
      // WO-O4O-WEB-LOAD-ERROR-CONTRACT-STANDARDIZATION-BATCH-V1:
      // 조회 실패를 setCourses([]) 로 삼켜 "등록된 강좌가 없습니다" 로 위장했다.
      setLoadError(true);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Client-side price filter (API doesn't support isPaid filter)
  const filteredCourses = useMemo(() => {
    const scoped = currentPrice === 'all'
      ? courses
      : courses.filter(c => (currentPrice === 'free' ? !c.isPaid : !!c.isPaid));
    return scoped.map(toCardView);
  }, [courses, currentPrice]);

  const priceOf = useMemo(() => {
    const map = new Map<string, number | undefined>();
    courses.forEach(c => map.set(c.id, c.price));
    return map;
  }, [courses]);

  const applySearch = () => {
    setSearchParams(prev => {
      if (searchInput.trim()) prev.set('search', searchInput.trim());
      else prev.delete('search');
      prev.set('page', '1');
      return prev;
    });
  };

  const handlePriceFilter = (filter: string) => {
    setSearchParams(prev => {
      if (filter === 'all') prev.delete('price');
      else prev.set('price', filter);
      prev.set('page', '1');
      return prev;
    });
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', String(page));
      return prev;
    });
  };

  // 미인증 상태
  if (!isAuthenticated && !loading) {
    return (
      <PageSection last>
        <PageContainer>
          <div style={styles.loginPrompt}>
            <div style={styles.loginIcon}>📚</div>
            <h2 style={styles.loginTitle}>강좌를 탐색하려면</h2>
            <p style={styles.loginSubtitle}>로그인이 필요합니다</p>
            <button style={styles.loginButton} onClick={openLoginModal}>
              로그인
            </button>
          </div>
        </PageContainer>
      </PageSection>
    );
  }

  if (loading) {
    return <LoadingSpinner message="강좌 목록을 불러오는 중..." />;
  }

  return (
    <PageSection last>
      <PageContainer>
        <CourseListView
          courses={filteredCourses}
          loading={false}
          error={loadError}
          onRetry={() => void loadData()}
          accent={colors.primary}
          hrefFor={(course) => `/courses/${course.id}`}
          freeBadge
          priceLabelFor={(course) => {
            const price = priceOf.get(course.id);
            return price ? `₩${price.toLocaleString()}` : undefined;
          }}
          renderCardFooter={(course) => (
            <>
              <span style={styles.enrollCount}>
                {(course.enrollmentCount ?? 0) > 0 ? `${course.enrollmentCount}명 수강중` : '새 강좌'}
              </span>
              <span style={styles.detailLink}>자세히 보기 →</span>
            </>
          )}
          headerSlot={
            <PageHeader
              title="강좌"
              description="플랫폼 교육 콘텐츠를 탐색하세요"
              breadcrumb={[{ label: '홈', href: '/' }, { label: '강좌' }]}
            />
          }
          search={{
            value: searchInput,
            onChange: setSearchInput,
            onSubmit: applySearch,
            placeholder: '강좌 검색...',
          }}
          filters={{
            value: currentPrice,
            options: PRICE_OPTIONS,
            onChange: handlePriceFilter,
          }}
          emptyState={
            <EmptyState
              icon="📋"
              title={currentSearch ? '검색 결과가 없습니다' : '등록된 강좌가 없습니다'}
              description={currentSearch
                ? `"${currentSearch}"에 대한 검색 결과가 없습니다.`
                : '곧 새로운 강좌가 등록될 예정입니다.'
              }
            />
          }
          paginationSlot={totalPages > 1 ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          ) : undefined}
        />
      </PageContainer>
    </PageSection>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // Login prompt
  loginPrompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    textAlign: 'center',
  },
  loginIcon: {
    fontSize: '64px',
    marginBottom: '24px',
  },
  loginTitle: {
    ...typography.headingL,
    color: colors.neutral900,
    margin: 0,
    marginBottom: '8px',
  },
  loginSubtitle: {
    ...typography.bodyL,
    color: colors.neutral500,
    margin: 0,
    marginBottom: '32px',
  },
  loginButton: {
    padding: '14px 48px',
    backgroundColor: colors.primary,
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },

  enrollCount: {
    ...typography.bodyS,
    color: colors.accentGreen,
    fontWeight: 500,
  },
  detailLink: {
    ...typography.bodyS,
    color: colors.primary,
    fontWeight: 500,
  },
};
