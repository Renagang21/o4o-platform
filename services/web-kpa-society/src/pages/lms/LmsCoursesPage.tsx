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
 *
 * WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1:
 * - checkbox 선택 + ActionBar + BulkResultModal 흐름 추가
 * - 카드 기반 탐색 UX 유지
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

// WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1
interface BulkResult {
  succeeded: string[];
  duplicated: string[];
  failed: Array<{ courseId: string; message: string }>;
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
  const [addedCourseIds, setAddedCourseIds] = useState<Set<string>>(new Set());
  const [addingCourseId, setAddingCourseId] = useState<string | null>(null);
  // WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentCategory = searchParams.get('category') || '';

  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: 매장 보유자만 자료함 액션 노출
  const isStoreOwner = !!user?.isStoreOwner && !!user?.kpaMembership?.organizationId;

  // WO-O4O-KPA-ME-CONTEXT-HYDRATION-UX-FIX-V1
  const mightBeStoreOwner = !!user && !!(user.roles ?? []).includes('kpa:store_owner');

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, currentCategory]);

  // WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1: 페이지 변경 시 선택 초기화
  useEffect(() => {
    setSelectedCourseIds(new Set());
  }, [currentPage, currentCategory]);

  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: 이미 가져간 강의 set 로드
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
        // 권한/엔드포인트 미가용 시 silent
      });
    return () => { cancelled = true; };
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

  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: 개별 추가
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

  // WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1: checkbox 토글
  const toggleSelect = (courseId: string, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  // WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1: bulk 추가
  const handleBulkAddToLibrary = async () => {
    if (!isStoreOwner || selectedCourseIds.size === 0 || isBulkAdding) return;
    setIsBulkAdding(true);
    const result: BulkResult = { succeeded: [], duplicated: [], failed: [] };

    await Promise.all(
      [...selectedCourseIds].map(async (courseId) => {
        try {
          await assetSnapshotApi.copy({
            sourceService: 'kpa',
            sourceAssetId: courseId,
            assetType: 'lesson',
          });
          result.succeeded.push(courseId);
        } catch (err: any) {
          const code = err?.response?.data?.error?.code ?? err?.code;
          if (code === 'DUPLICATE_SNAPSHOT') {
            result.duplicated.push(courseId);
          } else {
            result.failed.push({
              courseId,
              message: err?.response?.data?.error?.message || err?.message || '추가 실패',
            });
          }
        }
      }),
    );

    // 성공 + 중복은 추가됨으로 반영
    setAddedCourseIds((prev) => {
      const next = new Set(prev);
      [...result.succeeded, ...result.duplicated].forEach((id) => next.add(id));
      return next;
    });
    // 처리된 항목 선택 해제
    setSelectedCourseIds(new Set());
    setIsBulkAdding(false);
    setBulkResult(result);
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
                const canAddToLibrary =
                  isStoreOwner &&
                  course.status === 'published' &&
                  !!course.reusablePolicy &&
                  course.reusablePolicy !== 'restricted';
                const isAlreadyAdded = addedCourseIds.has(course.id);
                const isAdding = addingCourseId === course.id;

                // WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1
                // 선택 가능: 추가 가능하고 아직 추가되지 않은 강의만
                const isSelectable = canAddToLibrary && !isAlreadyAdded;
                const isSelected = selectedCourseIds.has(course.id);

                return (
                  <div key={course.id} style={{ position: 'relative' }}>
                    {/* WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1: 체크박스 오버레이 */}
                    {isSelectable && (
                      <button
                        type="button"
                        onClick={(e) => toggleSelect(course.id, e)}
                        style={checkboxBtnStyle(isSelected)}
                        aria-label={`${course.title} ${isSelected ? '선택 해제' : '선택'}`}
                        aria-pressed={isSelected}
                      >
                        {isSelected ? '✓' : ''}
                      </button>
                    )}
                    <HubEntityCard
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
                      {/* WO-O4O-KPA-ME-CONTEXT-HYDRATION-UX-FIX-V1 */}
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
                  </div>
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

      {/* WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1: ActionBar */}
      {isStoreOwner && selectedCourseIds.size > 0 && (
        <div style={actionBarStyle}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
            {selectedCourseIds.size}개 선택됨
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setSelectedCourseIds(new Set())}
              style={actionBarSecondaryBtnStyle}
            >
              선택 해제
            </button>
            <button
              type="button"
              onClick={handleBulkAddToLibrary}
              disabled={isBulkAdding}
              style={actionBarPrimaryBtnStyle(isBulkAdding)}
            >
              {isBulkAdding ? '추가 중...' : '내 자료함에 추가'}
            </button>
          </div>
        </div>
      )}

      {/* WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1: BulkResultModal */}
      {bulkResult && (
        <div style={modalOverlayStyle} onClick={() => setBulkResult(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
              자료함 추가 결과
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bulkResult.succeeded.length > 0 && (
                <div style={resultRowStyle('#dcfce7', '#15803d')}>
                  ✓ 성공: {bulkResult.succeeded.length}개
                </div>
              )}
              {bulkResult.duplicated.length > 0 && (
                <div style={resultRowStyle('#fef9c3', '#854d0e')}>
                  ↩ 이미 추가됨: {bulkResult.duplicated.length}개
                </div>
              )}
              {bulkResult.failed.length > 0 && (
                <div style={resultRowStyle('#fee2e2', '#991b1b')}>
                  ✗ 실패: {bulkResult.failed.length}개
                  {bulkResult.failed.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>
                      {f.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setBulkResult(null)}
              style={modalCloseBtnStyle}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </PageSection>
  );
}

const styles: Record<string, React.CSSProperties> = {
  courseGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))',
    gap: '20px',
  },
};

// WO-O4O-KPA-ME-CONTEXT-HYDRATION-UX-FIX-V1
const actionSkeletonStyle: React.CSSProperties = {
  height: '30px',
  width: '128px',
  borderRadius: '6px',
  backgroundColor: '#F3F4F6',
  alignSelf: 'flex-start',
};

// WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1
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

// WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1: checkbox 버튼 오버레이
function checkboxBtnStyle(isSelected: boolean): React.CSSProperties {
  return {
    position: 'absolute',
    top: 10,
    left: 10,
    zIndex: 10,
    width: 22,
    height: 22,
    borderRadius: 4,
    border: `2px solid ${isSelected ? '#5b21b6' : '#d1d5db'}`,
    backgroundColor: isSelected ? '#5b21b6' : '#fff',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  };
}

// WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1: ActionBar (sticky bottom)
const actionBarStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  padding: '12px 20px',
  backgroundColor: '#1e1b4b',
  borderRadius: 12,
  boxShadow: '0 4px 24px rgba(0,0,0,0.24)',
  zIndex: 100,
  whiteSpace: 'nowrap',
};

const actionBarSecondaryBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  backgroundColor: 'transparent',
  color: '#c4b5fd',
  border: '1px solid #6d28d9',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
};

function actionBarPrimaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 16px',
    backgroundColor: disabled ? '#6d28d9' : '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.7 : 1,
  };
}

// WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1: BulkResultModal
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 200,
};

const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: '24px 28px',
  minWidth: 280,
  maxWidth: 380,
  width: '90vw',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
};

function resultRowStyle(bg: string, fg: string): React.CSSProperties {
  return {
    display: 'flex',
    flexDirection: 'column',
    padding: '10px 14px',
    backgroundColor: bg,
    color: fg,
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
  };
}

const modalCloseBtnStyle: React.CSSProperties = {
  marginTop: 20,
  width: '100%',
  padding: '10px 0',
  backgroundColor: '#f3f4f6',
  color: '#374151',
  border: 'none',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
};
