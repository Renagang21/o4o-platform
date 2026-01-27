/**
 * EducationPage - 교육 메인 페이지
 *
 * "강의 목록 페이지" ❌ → "내가 지금 배울 수 있는 것" ⭕
 *
 * 컴포넌트 트리:
 * EducationPage
 * ├─ EducationHeader       - 타이틀 + 내 학습/로그인
 * ├─ EducationLayout
 * │  ├─ EducationSidebar   - 좌측 필터
 * │  └─ EducationContent
 * │     ├─ EducationTabs   - 정렬 탭
 * │     ├─ LectureGrid     - 강의 카드 3열
 * │     └─ Pagination      - 페이지네이션
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EducationHeader } from '../../components/education/EducationHeader';
import { EducationSidebar } from '../../components/education/EducationSidebar';
import { EducationTabs } from '../../components/education/EducationTabs';
import { LectureGrid } from '../../components/education/LectureGrid';
import { Pagination } from '../../components/common';
import { lmsApi } from '../../api';
import { colors, spacing } from '../../styles/theme';
import type { EducationFilter } from '../../components/education/EducationSidebar';
import type { EducationTab } from '../../components/education/EducationTabs';
import type { LectureData } from '../../components/education/LectureCard';

export function EducationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lectures, setLectures] = useState<LectureData[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const currentFilter = (searchParams.get('filter') || 'all') as EducationFilter;
  const currentTab = (searchParams.get('tab') || 'all') as EducationTab;
  const currentPage = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    loadLectures();
  }, [currentFilter, currentTab, currentPage]);

  const loadLectures = async () => {
    try {
      setLoading(true);
      const res = await lmsApi.getCourses({
        page: currentPage,
        limit: 9,
      });

      if (res.data) {
        const mapped: LectureData[] = res.data.map((course: any) => ({
          id: course.id,
          title: course.title,
          description: course.description,
          instructorName: course.instructorName,
          duration: course.duration,
          lessonCount: course.lessonCount,
          category: course.category,
          level: course.level,
          isFree: true,
          thumbnail: course.thumbnail,
        }));
        setLectures(mapped);
        setTotalPages(res.totalPages || 1);
      }
    } catch {
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter: EducationFilter) => {
    setSearchParams((prev) => {
      prev.set('filter', filter);
      prev.set('page', '1');
      return prev;
    });
  };

  const handleTabChange = (tab: EducationTab) => {
    setSearchParams((prev) => {
      prev.set('tab', tab);
      prev.set('page', '1');
      return prev;
    });
  };

  const handlePageChange = (page: number) => {
    setSearchParams((prev) => {
      prev.set('page', String(page));
      return prev;
    });
  };

  // 클라이언트 필터링 (API 미지원 시)
  const filteredLectures = lectures.filter((l) => {
    if (currentFilter === 'free') return l.isFree;
    if (currentFilter === 'paid') return !l.isFree;
    if (currentFilter === 'ongoing') return l.status === 'in_progress';
    if (currentFilter === 'completed') return l.status === 'completed';
    return true;
  });

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <EducationHeader />
        <div style={styles.layout}>
          {/* 좌측 사이드바 */}
          <EducationSidebar
            currentFilter={currentFilter}
            onFilterChange={handleFilterChange}
          />

          {/* 우측 콘텐츠 */}
          <div style={styles.content}>
            <EducationTabs
              currentTab={currentTab}
              onTabChange={handleTabChange}
            />

            {loading ? (
              <div style={styles.loading}>강의를 불러오는 중...</div>
            ) : filteredLectures.length === 0 ? (
              <div style={styles.empty}>
                <p>자료가 없습니다</p>
              </div>
            ) : (
              <>
                <LectureGrid lectures={filteredLectures} />
                {totalPages > 1 && (
                  <div style={styles.paginationWrap}>
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: colors.neutral50,
  },
  wrapper: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: `0 ${spacing.lg} ${spacing.xl}`,
  },
  layout: {
    display: 'flex',
    gap: spacing.xl,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  loading: {
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.neutral500,
  },
  empty: {
    padding: spacing.xl,
    textAlign: 'center',
    color: colors.neutral500,
  },
  emptyIcon: {
    fontSize: '2rem',
    display: 'block',
    marginBottom: spacing.sm,
  },
  paginationWrap: {
    marginTop: spacing.xl,
  },
};

export default EducationPage;
