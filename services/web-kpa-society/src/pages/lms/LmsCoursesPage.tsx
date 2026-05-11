/**
 * LmsCoursesPage - 강의 Hub (/lms) 목록 페이지 (테이블형)
 *
 * WO-O4O-LMS-LIST-TABLE-CANONICAL-ALIGN-V1:
 * - 카드형 → 테이블형 전환 (강의 수 증가 대응)
 * - 검색, 선택, bulk action, 페이지네이션 구조로 정리
 *
 * WO-O4O-KPA-ME-CONTEXT-HYDRATION-UX-FIX-V1:
 * - isKpaContextLoaded 사용하여 unknown ≠ false 구분
 *
 * WO-O4O-LMS-CANONICAL-ROUTE-ALIGN-V1:
 * - InstructorHeaderAction, 강사 본인 강의 수정/종료 액션 포함
 */

import { useState, useEffect, type MouseEvent } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { PageSection, PageContainer } from '@o4o/ui';
import { RowActionMenu } from '@o4o/ui';
import {
  PageHeader,
  LoadingSpinner,
  EmptyState,
  Pagination,
} from '../../components/common';
import { lmsApi } from '../../api';
import { lmsInstructorApi } from '../../api/lms-instructor';
import { qualificationApi, type MemberQualification } from '../../api/qualification';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { useAuth } from '../../contexts';
import type { Course } from '../../types';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BulkResult {
  succeeded: string[];
  failed: Array<{ courseId: string; message: string }>;
}

// ─── Instructor CTA (WO-O4O-LMS-CANONICAL-ROUTE-ALIGN-V1) ───────────────────

function InstructorHeaderAction({ isInstructor, qualStatus, navigate }: {
  isInstructor: boolean;
  qualStatus: 'idle' | 'pending' | 'approved' | 'rejected';
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (isInstructor) {
    return (
      <button style={instructorCtaStyles.primaryBtn} onClick={() => navigate('/instructor/courses/new')}>
        + 강의 등록
      </button>
    );
  }
  if (qualStatus === 'pending') {
    return (
      <div style={instructorCtaStyles.pendingWrap}>
        <span style={instructorCtaStyles.pendingBadge}>강사 신청 심사 중</span>
        <button style={instructorCtaStyles.linkBtn} onClick={() => navigate('/mypage/qualifications')}>
          상태 확인 →
        </button>
      </div>
    );
  }
  return (
    <div style={instructorCtaStyles.applyWrap}>
      <button style={instructorCtaStyles.secondaryBtn} onClick={() => navigate('/mypage/qualifications')}>
        강사 신청
      </button>
      <p style={instructorCtaStyles.hint}>승인까지 1~2일 소요될 수 있습니다.</p>
    </div>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────────

export function LmsCoursesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isKpaContextLoaded } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1
  // WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1: 같은 원본 중복 추가 허용 — dedupe state 제거
  const [addingCourseId, setAddingCourseId] = useState<string | null>(null);

  // WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  // WO-O4O-LMS-CANONICAL-ROUTE-ALIGN-V1: 강사 자격 심사 상태
  const [qualStatus, setQualStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');

  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentSearch = searchParams.get('search') || '';
  const isAuthenticated = !!user;
  const isInstructor = user?.roles?.includes('lms:instructor') ?? false;

  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1
  const isStoreOwner = !!user?.isStoreOwner && !!user?.kpaMembership?.organizationId;
  // WO-O4O-KPA-ME-CONTEXT-HYDRATION-UX-FIX-V1
  const mightBeStoreOwner = !!user && (user.roles ?? []).includes('kpa:store_owner');

  // ─── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, currentSearch]);

  useEffect(() => {
    setSelectedCourseIds(new Set());
  }, [currentPage, currentSearch]);

  // WO-O4O-LMS-CANONICAL-ROUTE-ALIGN-V1: 강사 신청 자격 조회
  useEffect(() => {
    if (!isAuthenticated || isInstructor) return;
    (async () => {
      try {
        const res = await qualificationApi.getMyQualifications();
        const lmsQual = res.data.data?.find((q: MemberQualification) => q.qualification_type === 'lms_creator');
        if (lmsQual) setQualStatus(lmsQual.status);
      } catch {}
    })();
  }, [isAuthenticated, isInstructor]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await lmsApi.getCourses({
        status: 'published',
        search: currentSearch || undefined,
        page: currentPage,
        limit: 20,
      });
      setCourses(res.data || []);
      const pag = (res as any).pagination;
      setTotalPages(pag?.totalPages || (res as any).totalPages || 1);
    } catch (err) {
      console.warn('LMS API not available:', err);
      setCourses([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => {
      if (searchInput) prev.set('search', searchInput);
      else prev.delete('search');
      prev.set('page', '1');
      return prev;
    });
  };

  // WO-O4O-LMS-STORE-LIBRARY-UX-WIRING-V1: 개별 추가
  // WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1: 중복 허용 — 매번 새 library item 생성
  const handleAddToLibrary = async (course: Course, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isStoreOwner) return;
    setAddingCourseId(course.id);
    try {
      await assetSnapshotApi.copy({ sourceService: 'kpa', sourceAssetId: course.id, assetType: 'lesson' });
      toast.success('내 자료함에 추가되었습니다');
    } catch (err: any) {
      const code = err?.response?.data?.error?.code ?? err?.code;
      if (code === 'SOURCE_NOT_FOUND') {
        toast.error('현재 자료함에 추가할 수 없는 강의입니다');
      } else {
        toast.error(err?.response?.data?.error?.message || err?.message || '자료함 추가에 실패했습니다');
      }
    } finally {
      setAddingCourseId(null);
    }
  };

  const toggleSelect = (courseId: string) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  };

  // WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1: bulk 추가
  // WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1: 중복 허용 — 각 선택은 새 library item 생성
  const handleBulkAddToLibrary = async () => {
    if (!isStoreOwner || selectedCourseIds.size === 0 || isBulkAdding) return;
    setIsBulkAdding(true);
    const result: BulkResult = { succeeded: [], failed: [] };

    await Promise.all(
      [...selectedCourseIds].map(async (courseId) => {
        try {
          await assetSnapshotApi.copy({ sourceService: 'kpa', sourceAssetId: courseId, assetType: 'lesson' });
          result.succeeded.push(courseId);
        } catch (err: any) {
          result.failed.push({ courseId, message: err?.response?.data?.error?.message || err?.message || '추가 실패' });
        }
      }),
    );

    setSelectedCourseIds(new Set());
    setIsBulkAdding(false);
    setBulkResult(result);
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => { prev.set('page', String(page)); return prev; });
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="강의를 불러오는 중..." />;

  // Selectable = can add to library and not already added
  const selectableIds = new Set(
    courses
      .filter(c => isStoreOwner && c.status === 'published' && !!c.reusablePolicy && c.reusablePolicy !== 'restricted')
      .map(c => c.id),
  );
  const allSelectableSelected = selectableIds.size > 0 && [...selectableIds].every(id => selectedCourseIds.has(id));

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedCourseIds(prev => { const next = new Set(prev); selectableIds.forEach(id => next.delete(id)); return next; });
    } else {
      setSelectedCourseIds(prev => { const next = new Set(prev); selectableIds.forEach(id => next.add(id)); return next; });
    }
  };

  return (
    <PageSection last>
      <PageContainer>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
          <PageHeader
            title="강의"
            description="공개 강의와 회원 전용 강의를 탐색하세요"
            breadcrumb={[{ label: '홈', href: '/' }, { label: '강의' }]}
          />
          {isAuthenticated && (
            <div style={{ paddingTop: 4 }}>
              <InstructorHeaderAction isInstructor={isInstructor} qualStatus={qualStatus} navigate={navigate} />
            </div>
          )}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} style={styles.searchBar}>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="강의 검색..."
            style={styles.searchInput}
          />
          <button type="submit" style={styles.searchBtn}>검색</button>
          {currentSearch && (
            <button
              type="button"
              style={styles.searchClearBtn}
              onClick={() => {
                setSearchInput('');
                setSearchParams(prev => { prev.delete('search'); prev.set('page', '1'); return prev; });
              }}
            >
              초기화
            </button>
          )}
        </form>

        {courses.length === 0 ? (
          <EmptyState
            icon="📋"
            title={currentSearch ? `"${currentSearch}" 검색 결과가 없습니다` : '등록된 강의가 없습니다'}
            description={currentSearch ? '다른 검색어를 사용해 보세요.' : '곧 새로운 강의가 등록될 예정입니다.'}
          />
        ) : (
          <>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.thead}>
                    {/* 선택 헤더 — store owner + hydrated 상태에서만 열 표시 */}
                    {(isStoreOwner || (mightBeStoreOwner && !isKpaContextLoaded)) && (
                      <th style={{ ...styles.th, width: 40, textAlign: 'center' }}>
                        {isStoreOwner && selectableIds.size > 0 && (
                          <input
                            type="checkbox"
                            checked={allSelectableSelected}
                            onChange={toggleSelectAll}
                            title="전체 선택"
                            style={{ cursor: 'pointer' }}
                          />
                        )}
                      </th>
                    )}
                    <th style={{ ...styles.th, minWidth: 260 }}>강의명</th>
                    <th style={{ ...styles.th, width: 120 }}>강사</th>
                    <th style={{ ...styles.th, width: 80, textAlign: 'center' }}>유형</th>
                    <th style={{ ...styles.th, width: 80, textAlign: 'center' }}>강의수</th>
                    <th style={{ ...styles.th, width: 80, textAlign: 'center' }}>상태</th>
                    <th style={{ ...styles.th, width: 200 }}>액션</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course, idx) => {
                    const isPublic = course.visibility === 'public';
                    const instructorName = (course as any).instructor?.name || course.instructorName || '-';
                    const detailPath = `/lms/course/${course.id}`;

                    const canAddToLibrary =
                      isStoreOwner &&
                      course.status === 'published' &&
                      !!course.reusablePolicy &&
                      course.reusablePolicy !== 'restricted';
                    const isAdding = addingCourseId === course.id;
                    const isSelectable = selectableIds.has(course.id);
                    const isSelected = selectedCourseIds.has(course.id);

                    // Instructor own-course check
                    const isOwnCourse = isInstructor && !!user?.id && (course as any).instructor?.id === user.id;

                    // CTA: public → 바로 보기, loggedIn → 수강하기, else → 로그인 후 수강
                    const ctaLabel = isPublic ? '바로 보기' : isAuthenticated ? '수강하기' : '로그인 후 수강';
                    const ctaTo = isAuthenticated || isPublic ? detailPath : '/login';
                    const ctaState = (!isAuthenticated && !isPublic) ? { from: detailPath } : undefined;

                    return (
                      <tr
                        key={course.id}
                        style={{
                          ...styles.tr,
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                        }}
                      >
                        {/* 체크박스 열 */}
                        {(isStoreOwner || (mightBeStoreOwner && !isKpaContextLoaded)) && (
                          <td style={{ ...styles.td, textAlign: 'center' }}>
                            {!isKpaContextLoaded && mightBeStoreOwner ? (
                              <div style={skeletonCheckStyle} />
                            ) : isSelectable ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(course.id)}
                                style={{ cursor: 'pointer' }}
                                aria-label={`${course.title} 선택`}
                              />
                            ) : null}
                          </td>
                        )}

                        {/* 강의명 */}
                        <td style={styles.td}>
                          <Link to={detailPath} style={styles.titleLink}>
                            {course.title}
                          </Link>
                          {course.description && (
                            <p style={styles.description}>{course.description}</p>
                          )}
                          {course.tags && course.tags.length > 0 && (
                            <div style={styles.tagRow}>
                              {course.tags.slice(0, 4).map(tag => (
                                <span key={tag} style={styles.tag}>{tag}</span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* 강사 */}
                        <td style={{ ...styles.td, color: '#6b7280', fontSize: 13 }}>
                          {instructorName}
                        </td>

                        {/* 유형 */}
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <span style={visibilityBadge(isPublic)}>
                            {isPublic ? '공개' : '회원제'}
                          </span>
                        </td>

                        {/* 강의수 */}
                        <td style={{ ...styles.td, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>
                          {course.lessonCount ?? '-'}
                        </td>

                        {/* 상태 */}
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <span style={statusBadge(course.status)}>
                            {course.status === 'published' ? '공개' : course.status}
                          </span>
                        </td>

                        {/* 액션 */}
                        <td style={{ ...styles.td }}>
                          <div style={styles.actionCell}>
                            {/* 수강하기 / 바로 보기 */}
                            <Link to={ctaTo} state={ctaState} style={ctaLinkStyle}>
                              {ctaLabel}
                            </Link>

                            {/* 자료함 추가 — hydration unknown: skeleton, hydrated: button */}
                            {/* WO-O4O-STORE-LIBRARY-COPY-INDEPENDENCE-ALIGN-V1: 중복 허용 — 항상 활성 */}
                            {mightBeStoreOwner && !isKpaContextLoaded ? (
                              <div style={skeletonActionStyle} />
                            ) : canAddToLibrary ? (
                              <button
                                type="button"
                                onClick={(e) => handleAddToLibrary(course, e)}
                                disabled={isAdding}
                                style={libraryBtnStyle(false, isAdding)}
                              >
                                {isAdding ? '추가 중...' : '자료함 추가'}
                              </button>
                            ) : null}

                            {/* 강사 본인 강의 수정/종료 */}
                            {isOwnCourse && (
                              <RowActionMenu
                                actions={[
                                  { key: 'edit', label: '수정', onClick: () => navigate(`/instructor/courses/${course.id}/edit`) },
                                  {
                                    key: 'delete', label: '강의 종료', variant: 'danger',
                                    onClick: async () => {
                                      try {
                                        await lmsInstructorApi.deleteCourse(course.id);
                                        toast.success('강의가 종료 처리되었습니다');
                                        void loadData();
                                      } catch { toast.error('처리에 실패했습니다'); }
                                    },
                                    confirm: { title: '강의 종료', message: '이 강의를 종료(보관) 처리하시겠습니까?', variant: 'danger' },
                                  },
                                ]}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
            <button type="button" onClick={() => setSelectedCourseIds(new Set())} style={actionBarSecondaryBtnStyle}>
              선택 해제
            </button>
            <button type="button" onClick={handleBulkAddToLibrary} disabled={isBulkAdding} style={actionBarPrimaryBtnStyle(isBulkAdding)}>
              {isBulkAdding ? '추가 중...' : '내 자료함에 추가'}
            </button>
          </div>
        </div>
      )}

      {/* WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1: BulkResultModal */}
      {bulkResult && (
        <div style={modalOverlayStyle} onClick={() => setBulkResult(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111827' }}>
              자료함 추가 결과
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bulkResult.succeeded.length > 0 && (
                <div style={resultRowStyle('#dcfce7', '#15803d')}>✓ 성공: {bulkResult.succeeded.length}개</div>
              )}
              {bulkResult.failed.length > 0 && (
                <div style={resultRowStyle('#fee2e2', '#991b1b')}>
                  ✗ 실패: {bulkResult.failed.length}개
                  {bulkResult.failed.map((f, i) => (
                    <div key={i} style={{ fontSize: 12, marginTop: 4, opacity: 0.85 }}>{f.message}</div>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => setBulkResult(null)} style={modalCloseBtnStyle}>닫기</button>
          </div>
        </div>
      )}
    </PageSection>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  searchBar: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    maxWidth: 360,
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
  },
  searchBtn: {
    padding: '8px 16px',
    backgroundColor: '#5b21b6',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  searchClearBtn: {
    padding: '8px 12px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
  },
  tableWrap: {
    overflowX: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    marginBottom: 20,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: 14,
  },
  thead: {
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e5e7eb',
  },
  th: {
    padding: '10px 14px',
    fontWeight: 600,
    color: '#374151',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  tr: {
    borderBottom: '1px solid #f1f5f9',
  },
  td: {
    padding: '12px 14px',
    verticalAlign: 'top',
  },
  titleLink: {
    display: 'block',
    fontWeight: 600,
    color: '#111827',
    textDecoration: 'none',
    fontSize: 14,
    lineHeight: 1.4,
  },
  description: {
    margin: '3px 0 0',
    fontSize: 12,
    color: '#9ca3af',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 320,
  },
  tagRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 5,
  },
  tag: {
    padding: '2px 6px',
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    borderRadius: 4,
    fontSize: 11,
  },
  actionCell: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
};

function visibilityBadge(isPublic: boolean): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: isPublic ? '#dcfce7' : '#ede9fe',
    color: isPublic ? '#15803d' : '#6d28d9',
  };
}

function statusBadge(status: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: status === 'published' ? '#dcfce7' : '#f3f4f6',
    color: status === 'published' ? '#15803d' : '#6b7280',
  };
}

const ctaLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '5px 12px',
  backgroundColor: '#5b21b6',
  color: '#fff',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

function libraryBtnStyle(isAdded: boolean, isAdding: boolean): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 10px',
    backgroundColor: isAdded ? '#f3f4f6' : '#fff',
    color: isAdded ? '#9ca3af' : '#5b21b6',
    border: `1px solid ${isAdded ? '#e5e7eb' : '#ddd6fe'}`,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 500,
    cursor: isAdded || isAdding ? 'default' : 'pointer',
    whiteSpace: 'nowrap',
  };
}

// WO-O4O-KPA-ME-CONTEXT-HYDRATION-UX-FIX-V1: skeleton placeholders
const skeletonCheckStyle: React.CSSProperties = {
  width: 16, height: 16, borderRadius: 3, backgroundColor: '#e5e7eb',
};
const skeletonActionStyle: React.CSSProperties = {
  height: 26, width: 72, borderRadius: 6, backgroundColor: '#f3f4f6',
};

// WO-O4O-LMS-CANONICAL-ROUTE-ALIGN-V1: 강사 CTA 스타일
const instructorCtaStyles: Record<string, React.CSSProperties> = {
  primaryBtn: {
    padding: '8px 18px', fontSize: '14px', fontWeight: 600,
    color: '#ffffff', backgroundColor: '#2563eb',
    border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  secondaryBtn: {
    padding: '8px 18px', fontSize: '14px', fontWeight: 600,
    color: '#2563eb', backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap',
  },
  pendingWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
  pendingBadge: {
    padding: '6px 14px', fontSize: '13px', fontWeight: 500,
    color: '#92400e', backgroundColor: '#fef3c7',
    border: '1px solid #fde68a', borderRadius: '20px',
  },
  linkBtn: {
    padding: '0', fontSize: '13px', fontWeight: 500,
    color: '#2563eb', background: 'transparent', border: 'none',
    cursor: 'pointer', textDecoration: 'underline',
  },
  applyWrap: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' },
  hint: { margin: 0, fontSize: '11px', color: '#94a3b8' },
};

// WO-O4O-LMS-LIST-BULK-LIBRARY-ACTION-V1
const actionBarStyle: React.CSSProperties = {
  position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
  display: 'flex', alignItems: 'center', gap: 16, padding: '12px 20px',
  backgroundColor: '#1e1b4b', borderRadius: 12,
  boxShadow: '0 4px 24px rgba(0,0,0,0.24)', zIndex: 100, whiteSpace: 'nowrap',
};
const actionBarSecondaryBtnStyle: React.CSSProperties = {
  padding: '8px 14px', backgroundColor: 'transparent', color: '#c4b5fd',
  border: '1px solid #6d28d9', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
function actionBarPrimaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 16px', backgroundColor: disabled ? '#6d28d9' : '#7c3aed',
    color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.7 : 1,
  };
}
const modalOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
};
const modalStyle: React.CSSProperties = {
  backgroundColor: '#fff', borderRadius: 12, padding: '24px 28px',
  minWidth: 280, maxWidth: 380, width: '90vw',
  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
};
function resultRowStyle(bg: string, fg: string): React.CSSProperties {
  return {
    display: 'flex', flexDirection: 'column', padding: '10px 14px',
    backgroundColor: bg, color: fg, borderRadius: 8, fontSize: 14, fontWeight: 600,
  };
}
const modalCloseBtnStyle: React.CSSProperties = {
  marginTop: 20, width: '100%', padding: '10px 0',
  backgroundColor: '#f3f4f6', color: '#374151',
  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
