/**
 * LmsCoursesPage - 강의 Hub (/lms) 목록 페이지
 *
 * WO-O4O-SHARED-HUB-CARD-COMPONENT-V1:
 * - 카드 렌더링을 HubEntityCard로 교체
 * - 표시 항목/CTA 분기는 그대로 유지
 *
 * WO-O4O-KPA-ME-CONTEXT-HYDRATION-UX-FIX-V1:
 * - isKpaContextLoaded 사용하여 unknown ≠ false 구분
 * - kpa:store_owner JWT 역할 보유자에 한해 hydration 중 skeleton 표시
 */

import { useState, useEffect, type MouseEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { PageSection, PageContainer } from '@o4o/ui';
import {
  PageHeader,
  LoadingSpinner,
  EmptyState,
  Pagination,
  HubEntityCard,
} from '../../components/common';
import { lmsApi } from '../../api';
import { assetSnapshotApi } from '../../api/assetSnapshot';
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
  const { user, isKpaContextLoaded } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1
  // 매장 경영자가 이미 자료함에 가져간 강의의 sourceAssetId 집합. 중복 추가 방지 + 버튼 상태 표시.
  const [addedCourseIds, setAddedCourseIds] = useState<Set<string>>(new Set());
  const [addingCourseId, setAddingCourseId] = useState<string | null>(null);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentCategory = searchParams.get('category') || '';

  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: 매장 보유자만 자료함 액션 노출
  const isStoreOwner = !!user?.isStoreOwner && !!user?.kpaMembership?.organizationId;

  // WO-O4O-KPA-ME-CONTEXT-HYDRATION-UX-FIX-V1:
  // JWT roles에 kpa:store_owner가 있는 경우, me-context 로딩 완료 전까지
  // skeleton을 표시하여 "권한 없음"처럼 보이는 순간을 제거한다.
  // me-context 미완료 상태(unknown)와 확정 false 상태를 구분한다.
  const mightBeStoreOwner = !!user && !!(user.roles ?? []).includes('kpa:store_owner');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, currentCategory]);

  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: 매장 경영자가 페이지 진입 시 이미 가져간 강의 set을 미리 로드
  useEffect(() => {
    if (!isStoreOwner) return;
    let cancelled = false;
    assetSnapshotApi
      .list({ type: 'lesson', limit: 100 })
      .then((res) => {
        if (cancelled) return;
        const ids = new Set<string>();
        for (const item of res.data?.items ?? []) {
          ids.add(item.sourceAssetId);
        }
        setAddedCourseIds(ids);
      })
      .catch(() => {
        // 권한/엔드포인트 미가용 시 silent — 버튼은 그대로 노출되며, 실제 추가 시 실패 처리.
      });
    return () => {
      cancelled = true;
    };
  }, [isStoreOwner]);

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

  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1
  // 매장 자료함에 강의 추가. assetType='lesson', sourceAssetId=courseId.
  // 중복 / SOURCE_NOT_FOUND(원본 비공개·정책 차단·삭제 등) / 기타 오류를 사용자 친화적으로 처리.
  const handleAddToLibrary = async (course: Course, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isStoreOwner) return;
    if (addedCourseIds.has(course.id)) return;
    setAddingCourseId(course.id);
    try {
      await assetSnapshotApi.copy({
        sourceService: 'kpa',
        sourceAssetId: course.id,
        assetType: 'lesson',
      });
      setAddedCourseIds((prev) => new Set(prev).add(course.id));
      toast.success('내 자료함에 추가되었습니다');
    } catch (err: any) {
      const code = err?.response?.data?.error?.code ?? err?.code;
      if (code === 'DUPLICATE_SNAPSHOT') {
        setAddedCourseIds((prev) => new Set(prev).add(course.id));
        toast.success('이미 내 자료함에 있는 강의입니다');
      } else if (code === 'SOURCE_NOT_FOUND') {
        toast.error('현재 자료함에 추가할 수 없는 강의입니다');
      } else {
        toast.error(err?.response?.data?.error?.message || err?.message || '자료함 추가에 실패했습니다');
      }
    } finally {
      setAddingCourseId(null);
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

                // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1
                // 매장 보유자 + published + reusablePolicy != 'restricted' 만 추가 버튼 노출.
                // 정책 미허용 강의(restricted)는 버튼 자체를 숨겨 사용자에게 혼란을 주지 않는다.
                const canAddToLibrary =
                  isStoreOwner &&
                  course.status === 'published' &&
                  !!course.reusablePolicy &&
                  course.reusablePolicy !== 'restricted';
                const isAlreadyAdded = addedCourseIds.has(course.id);
                const isAdding = addingCourseId === course.id;

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
                  >
                    {/* WO-O4O-KPA-ME-CONTEXT-HYDRATION-UX-FIX-V1
                        unknown(hydrating) → skeleton / confirmed true → button / confirmed false → null */}
                    {mightBeStoreOwner && !isKpaContextLoaded ? (
                      <div style={actionSkeletonStyle} aria-hidden="true" />
                    ) : canAddToLibrary ? (
                      <button
                        type="button"
                        onClick={(e) =>
                          isAlreadyAdded ? e.preventDefault() : handleAddToLibrary(course, e)
                        }
                        disabled={isAlreadyAdded || isAdding}
                        style={addLibraryBtnStyle(isAlreadyAdded, isAdding)}
                        aria-label="내 자료함에 추가"
                      >
                        {isAlreadyAdded
                          ? '✓ 자료함에 있음'
                          : isAdding
                          ? '추가 중...'
                          : '＋ 내 자료함에 추가'}
                      </button>
                    ) : null}
                  </HubEntityCard>
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

// WO-O4O-KPA-ME-CONTEXT-HYDRATION-UX-FIX-V1
// kpa:store_owner 역할 보유자의 hydration 중 skeleton — 버튼과 동일한 크기로 자리 유지.
const actionSkeletonStyle: React.CSSProperties = {
  height: '30px',
  width: '128px',
  borderRadius: '6px',
  backgroundColor: '#F3F4F6',
  alignSelf: 'flex-start',
};

// WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1
// "내 자료함에 추가" 보조 버튼 — HubEntityCard children 슬롯 내부, CTA보다 약한 톤.
function addLibraryBtnStyle(isAdded: boolean, isAdding: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '6px 12px',
    backgroundColor: isAdded ? '#F3F4F6' : '#FFFFFF',
    color: isAdded ? '#6B7280' : '#5B21B6',
    border: `1px solid ${isAdded ? '#E5E7EB' : '#DDD6FE'}`,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    cursor: isAdded || isAdding ? 'default' : 'pointer',
    alignSelf: 'flex-start',
  };
}
