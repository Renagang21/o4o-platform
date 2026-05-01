/**
 * LmsCoursesPage - 강의 Hub (/lms) 목록 페이지
 *
 * WO-O4O-SHARED-HUB-CARD-COMPONENT-V1:
 * - 카드 렌더링을 HubEntityCard로 교체
 * - 표시 항목/CTA 분기는 그대로 유지
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageSection, PageContainer } from '@o4o/ui';
import {
  PageHeader,
  LoadingSpinner,
  EmptyState,
  Pagination,
  HubEntityCard,
} from '../../components/common';
import { lmsApi } from '../../api';
import { useAuth } from '../../contexts';
import type { Course } from '../../types';

const formatDuration = (minutes: number): string => {
  if (!minutes || minutes <= 0) return '시간 미정';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}시간 ${m}분`;
  if (h) return `${h}시간`;
  return `${m}분`;
};

interface CtaSpec {
  label: string;
  to: string;
  state?: { from: string };
}

const resolveCta = (course: Course, loggedIn: boolean): CtaSpec => {
  const detailPath = `/lms/course/${course.id}`;
  if (course.visibility === 'public') {
    return { label: '바로 보기', to: detailPath };
  }
  if (loggedIn) {
    return { label: '수강하기', to: detailPath };
  }
  return { label: '로그인 후 수강', to: '/login', state: { from: detailPath } };
};

export function LmsCoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentCategory = searchParams.get('category') || '';

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, currentCategory]);

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await lmsApi.getCourses({
        status: 'published',
        category: currentCategory || undefined,
        page: currentPage,
        limit: 12,
      });

      setCourses(res.data || []);
      const pag = (res as any).pagination;
      setTotalPages(pag?.totalPages || res.totalPages || 1);
    } catch (err) {
      console.warn('LMS API not available:', err);
      setCourses([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => {
      prev.set('page', String(page));
      return prev;
    });
  };

  if (loading) {
    return <LoadingSpinner message="강의를 불러오는 중..." />;
  }

  return (
    <PageSection last>
      <PageContainer>
        <PageHeader
          title="강의"
          description="공개 강의와 회원 전용 강의를 탐색하세요"
          breadcrumb={[{ label: '홈', href: '/' }, { label: '강의' }]}
        />

        {courses.length === 0 ? (
          <EmptyState
            icon="📋"
            title="등록된 강의가 없습니다"
            description="곧 새로운 강의가 등록될 예정입니다."
          />
        ) : (
          <>
            <div style={styles.courseGrid}>
              {courses.map(course => {
                const cta = resolveCta(course, !!user);
                const isPublic = course.visibility === 'public';
                const instructorName =
                  (course as any).instructor?.name || course.instructorName || '-';

                return (
                  <HubEntityCard
                    key={course.id}
                    href={cta.to}
                    state={cta.state}
                    badges={[{
                      label: isPublic ? '공개' : '회원제',
                      color: isPublic ? 'green' : 'purple',
                    }]}
                    title={course.title}
                    description={course.description}
                    tags={course.tags || []}
                    maxTags={3}
                    meta={[
                      { icon: '👤', label: instructorName },
                      { icon: '⏱', label: formatDuration(course.duration) },
                      { icon: '👥', label: `${course.enrollmentCount ?? 0}명 진행중` },
                    ]}
                    cta={{ label: cta.label }}
                  />
                );
              })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </PageContainer>
    </PageSection>
  );
}

const styles: Record<string, React.CSSProperties> = {
  // 데스크톱: 2열 / 좁은 화면(<~880px): 자연스럽게 1열로 폴백
  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
    gap: '20px',
  },
};
