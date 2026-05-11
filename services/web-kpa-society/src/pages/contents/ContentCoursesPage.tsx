/**
 * ContentCoursesPage — /content/courses
 *
 * WO-KPA-CONTENT-COURSES-LIST-V1
 * WO-KPA-CONTENT-COURSES-PUBLIC-VISIBILITY-FIX-V1
 * WO-O4O-CONTENT-LIST-CANONICAL-TABLE-ALIGN-V1:
 *   LMS canonical 패턴과 동일하게 정렬.
 *   - 테이블형 리스트
 *   - 검색 (URL param 기반)
 *   - checkbox 선택
 *   - RowActionMenu: 내 자료함 가져가기
 *   - ActionBar + bulk 내 자료함 가져가기
 *   - 페이지네이션
 *
 * API:
 *   GET /api/v1/kpa/lms/courses?contentKind=content_resource&status=published
 */

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { lmsApi } from '../../api/lms';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import type { Course } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';
import { RowActionMenu } from '@o4o/ui';

// ─── Types ───────────────────────────────────────────────────────────────────

interface BulkResult {
  succeeded: string[];
  duplicated: string[];
  failed: Array<{ courseId: string; message: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PAGE_LIMIT = 20;

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

function statusLabel(s: string) {
  return s === 'published' ? '공개' : s === 'archived' ? '보관' : '초안';
}

function statusBadgeStyle(s: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 4,
    backgroundColor: s === 'published' ? '#ecfdf5' : s === 'archived' ? '#fef3c7' : '#f1f5f9',
    color: s === 'published' ? '#047857' : s === 'archived' ? '#92400e' : '#64748b',
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function ContentCoursesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  const roles = user?.roles ?? [];
  const canCreateCourse = roles.includes('lms:instructor') || roles.includes('kpa:admin');

  // URL-driven state
  const currentPage = parseInt(searchParams.get('page') || '1');
  const currentSearch = searchParams.get('search') || '';

  // Data
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Selection + library
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<string>>(new Set());
  const [addedCourseIds, setAddedCourseIds] = useState<Set<string>>(new Set());
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [isBulkAdding, setIsBulkAdding] = useState(false);

  // Search input (uncontrolled until submit)
  const [searchInput, setSearchInput] = useState(currentSearch);

  // ─── Load data ─────────────────────────────────────────────────────────────

  const loadData = useCallback(() => {
    setLoading(true);
    lmsApi.getCourses({
      page: currentPage,
      limit: PAGE_LIMIT,
      status: 'published',
      contentKind: 'content_resource',
      search: currentSearch || undefined,
    } as any)
      .then((res: any) => {
        const list = res?.data ?? [];
        const pag = res?.pagination;
        setCourses(Array.isArray(list) ? list : []);
        setTotal(pag?.total ?? 0);
        setTotalPages(pag?.totalPages || Math.ceil((pag?.total ?? 0) / PAGE_LIMIT) || 1);
      })
      .catch(() => {
        setCourses([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => setLoading(false));
  }, [currentPage, currentSearch]);

  useEffect(() => {
    loadData();
    setSelectedCourseIds(new Set());
  }, [loadData]);

  // Load already-added course IDs
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    assetSnapshotApi
      .list({ type: 'lesson', limit: 200 })
      .then((res) => {
        if (cancelled) return;
        const ids = new Set<string>();
        for (const item of res.data?.items ?? []) ids.add(item.sourceAssetId);
        setAddedCourseIds(ids);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams((prev) => {
      if (searchInput) prev.set('search', searchInput);
      else prev.delete('search');
      prev.set('page', '1');
      return prev;
    });
  };

  const handleCopyToStore = useCallback(async (course: Course) => {
    if (addedCourseIds.has(course.id)) return;
    const isRestricted = course.reusablePolicy === 'restricted';
    if (isRestricted) { toast.error('가져가기가 제한된 자료입니다'); return; }
    setCopyingId(course.id);
    try {
      await assetSnapshotApi.copy({ sourceService: 'kpa', sourceAssetId: course.id, assetType: 'lesson' });
      setAddedCourseIds((prev) => new Set(prev).add(course.id));
      toast.success('내 자료함에 추가되었습니다');
    } catch (err: any) {
      const code = err?.response?.data?.error?.code ?? err?.code;
      if (code === 'DUPLICATE_SNAPSHOT') {
        setAddedCourseIds((prev) => new Set(prev).add(course.id));
        toast.success('이미 내 자료함에 있습니다');
      } else {
        toast.error(err?.message || '가져오기에 실패했습니다');
      }
    } finally {
      setCopyingId(null);
    }
  }, [addedCourseIds]);

  const handleBulkAdd = useCallback(async () => {
    if (selectedCourseIds.size === 0 || isBulkAdding) return;
    setIsBulkAdding(true);
    const result: BulkResult = { succeeded: [], duplicated: [], failed: [] };
    const targets = courses.filter(
      (c) => selectedCourseIds.has(c.id) && c.reusablePolicy !== 'restricted',
    );
    await Promise.all(
      targets.map(async (c) => {
        try {
          await assetSnapshotApi.copy({ sourceService: 'kpa', sourceAssetId: c.id, assetType: 'lesson' });
          result.succeeded.push(c.id);
        } catch (err: any) {
          const code = err?.response?.data?.error?.code ?? err?.code;
          if (code === 'DUPLICATE_SNAPSHOT') result.duplicated.push(c.id);
          else result.failed.push({ courseId: c.id, message: err?.message || '추가 실패' });
        }
      }),
    );
    setAddedCourseIds((prev) => {
      const next = new Set(prev);
      [...result.succeeded, ...result.duplicated].forEach((id) => next.add(id));
      return next;
    });
    setSelectedCourseIds(new Set());
    setIsBulkAdding(false);
    setBulkResult(result);
  }, [selectedCourseIds, courses, isBulkAdding]);

  const toggleSelect = (id: string) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Selectable = not restricted, not already added
  const selectableIds = new Set(
    courses
      .filter((c) => c.reusablePolicy !== 'restricted' && !addedCourseIds.has(c.id))
      .map((c) => c.id),
  );
  const allSelected = selectableIds.size > 0 && [...selectableIds].every((id) => selectedCourseIds.has(id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedCourseIds((prev) => { const next = new Set(prev); selectableIds.forEach((id) => next.delete(id)); return next; });
    } else {
      setSelectedCourseIds((prev) => { const next = new Set(prev); selectableIds.forEach((id) => next.add(id)); return next; });
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <Link to="/content" style={styles.backLink}>← 콘텐츠 허브</Link>
          <h1 style={styles.title}>코스형 자료</h1>
          <p style={styles.desc}>주제가 있는 분량 많은 콘텐츠를 목록형으로 구성한 자료입니다.</p>
        </div>
        {canCreateCourse && (
          <Link to="/content/courses/new" style={styles.primaryBtn}>
            코스형 자료 등록
          </Link>
        )}
      </header>

      {/* Search */}
      <form onSubmit={handleSearch} style={styles.searchBar}>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="코스명 검색..."
          style={styles.searchInput}
        />
        <button type="submit" style={styles.searchBtn}>검색</button>
        {currentSearch && (
          <button
            type="button"
            style={styles.searchClearBtn}
            onClick={() => {
              setSearchInput('');
              setSearchParams((prev) => { prev.delete('search'); prev.set('page', '1'); return prev; });
            }}
          >
            초기화
          </button>
        )}
      </form>

      {/* Info bar */}
      {!loading && (
        <div style={styles.infoBar}>
          <span style={styles.infoText}>총 {total}개</span>
          {totalPages > 1 && <span style={styles.infoText}>{currentPage} / {totalPages} 페이지</span>}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={styles.placeholder}>불러오는 중...</div>
      ) : courses.length === 0 ? (
        <div style={styles.placeholder}>
          <p style={{ margin: 0, marginBottom: 8 }}>
            {currentSearch ? `"${currentSearch}" 검색 결과가 없습니다` : '아직 등록된 코스형 자료가 없습니다.'}
          </p>
          {canCreateCourse && !currentSearch && (
            <Link to="/content/courses/new" style={styles.emptyCta}>
              첫 코스형 자료 만들기 →
            </Link>
          )}
        </div>
      ) : (
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                {isAuthenticated && (
                  <th style={{ ...styles.th, width: 40, textAlign: 'center' }}>
                    {selectableIds.size > 0 && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        title="전체 선택"
                        style={{ cursor: 'pointer' }}
                      />
                    )}
                  </th>
                )}
                <th style={{ ...styles.th, minWidth: 240 }}>제목</th>
                <th style={{ ...styles.th, width: 120 }}>강사</th>
                <th style={{ ...styles.th, width: 80, textAlign: 'center' }}>강의수</th>
                <th style={{ ...styles.th, width: 80, textAlign: 'center' }}>상태</th>
                <th style={{ ...styles.th, width: 100 }}>등록일</th>
                <th style={{ ...styles.th, width: 160 }}>액션</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c, idx) => {
                const isAlreadyAdded = addedCourseIds.has(c.id);
                const isAdding = copyingId === c.id;
                const isRestricted = c.reusablePolicy === 'restricted';
                const isSelectable = selectableIds.has(c.id);
                const isSelected = selectedCourseIds.has(c.id);
                const instructorName = (c as any).instructor?.name || c.instructorName || '-';

                return (
                  <tr
                    key={c.id}
                    style={{
                      ...styles.tr,
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                    }}
                  >
                    {isAuthenticated && (
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        {isSelectable ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(c.id)}
                            style={{ cursor: 'pointer' }}
                            aria-label={`${c.title} 선택`}
                          />
                        ) : isAlreadyAdded ? (
                          <span style={{ color: '#9ca3af', fontSize: 14 }}>✓</span>
                        ) : null}
                      </td>
                    )}

                    {/* 제목 */}
                    <td style={styles.td}>
                      <span
                        style={styles.titleLink}
                        onClick={() => navigate(`/content/courses/${c.id}`)}
                      >
                        {c.title}
                      </span>
                      {c.description && (
                        <p style={styles.description}>{c.description.slice(0, 60)}{c.description.length > 60 ? '…' : ''}</p>
                      )}
                      {c.tags && c.tags.length > 0 && (
                        <div style={styles.tagRow}>
                          {c.tags.slice(0, 3).map((tag) => (
                            <span key={tag} style={styles.tag}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* 강사 */}
                    <td style={{ ...styles.td, color: '#6b7280', fontSize: 13 }}>{instructorName}</td>

                    {/* 강의수 */}
                    <td style={{ ...styles.td, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>{c.lessonCount ?? '-'}</td>

                    {/* 상태 */}
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={statusBadgeStyle(c.status)}>{statusLabel(c.status)}</span>
                    </td>

                    {/* 등록일 */}
                    <td style={{ ...styles.td, color: '#9ca3af', fontSize: 13 }}>{formatDate(c.createdAt)}</td>

                    {/* 액션 */}
                    <td style={styles.td}>
                      <div style={styles.actionCell}>
                        <span
                          style={styles.detailLink}
                          onClick={() => navigate(`/content/courses/${c.id}`)}
                        >
                          보기
                        </span>
                        {isAuthenticated && !isRestricted && (
                          <button
                            type="button"
                            onClick={() => handleCopyToStore(c)}
                            disabled={isAlreadyAdded || isAdding}
                            style={libraryBtnStyle(isAlreadyAdded, isAdding)}
                          >
                            {isAlreadyAdded ? '✓ 자료함' : isAdding ? '추가 중...' : '자료함 추가'}
                          </button>
                        )}
                        {isAuthenticated && isRestricted && (
                          <RowActionMenu
                            actions={[
                              { key: 'restricted', label: '가져가기 제한됨', onClick: () => {}, disabled: true },
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setSearchParams((prev) => { prev.set('page', String(Math.max(1, currentPage - 1))); return prev; })}
            disabled={currentPage <= 1}
            style={{ ...styles.pageBtn, opacity: currentPage <= 1 ? 0.4 : 1, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
          >
            « 이전
          </button>
          <span style={styles.pageInfo}>{currentPage} / {totalPages}</span>
          <button
            onClick={() => setSearchParams((prev) => { prev.set('page', String(Math.min(totalPages, currentPage + 1))); return prev; })}
            disabled={currentPage >= totalPages}
            style={{ ...styles.pageBtn, opacity: currentPage >= totalPages ? 0.4 : 1, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
          >
            다음 »
          </button>
        </div>
      )}

      {/* ActionBar — bulk 내 자료함 추가 */}
      {isAuthenticated && selectedCourseIds.size > 0 && (
        <div style={actionBarStyle}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>
            {selectedCourseIds.size}개 선택됨
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setSelectedCourseIds(new Set())} style={actionBarSecondaryBtnStyle}>
              선택 해제
            </button>
            <button type="button" onClick={handleBulkAdd} disabled={isBulkAdding} style={actionBarPrimaryBtnStyle(isBulkAdding)}>
              {isBulkAdding ? '추가 중...' : '내 자료함에 추가'}
            </button>
          </div>
        </div>
      )}

      {/* BulkResultModal */}
      {bulkResult && (
        <div style={modalOverlayStyle} onClick={() => setBulkResult(null)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111827' }}>자료함 추가 결과</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bulkResult.succeeded.length > 0 && (
                <div style={resultRowStyle('#dcfce7', '#15803d')}>✓ 성공: {bulkResult.succeeded.length}개</div>
              )}
              {bulkResult.duplicated.length > 0 && (
                <div style={resultRowStyle('#fef9c3', '#854d0e')}>↩ 이미 추가됨: {bulkResult.duplicated.length}개</div>
              )}
              {bulkResult.failed.length > 0 && (
                <div style={resultRowStyle('#fee2e2', '#991b1b')}>
                  ✗ 실패: {bulkResult.failed.length}개
                </div>
              )}
            </div>
            <button type="button" onClick={() => setBulkResult(null)} style={modalCloseBtnStyle}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1100, margin: '0 auto', padding: '32px 16px 80px' },
  header: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' },
  backLink: { fontSize: 13, color: '#64748b', textDecoration: 'none', marginBottom: 8, display: 'inline-block' },
  title: { fontSize: 24, fontWeight: 700, color: '#0f172a', margin: '4px 0 4px' },
  desc: { fontSize: 14, color: '#64748b', margin: 0 },
  primaryBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px',
    backgroundColor: '#2563eb', color: '#fff', fontSize: 14, fontWeight: 600,
    borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap',
  },
  searchBar: { display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' },
  searchInput: { flex: 1, maxWidth: 360, padding: '8px 12px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, outline: 'none' },
  searchBtn: { padding: '8px 16px', backgroundColor: '#5b21b6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  searchClearBtn: { padding: '8px 12px', backgroundColor: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, cursor: 'pointer' },
  infoBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', marginBottom: 4 },
  infoText: { fontSize: 12, color: '#9ca3af' },
  tableWrap: { overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 20 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  thead: { backgroundColor: '#f8fafc', borderBottom: '1px solid #e5e7eb' },
  th: { padding: '10px 14px', fontWeight: 600, color: '#374151', textAlign: 'left', whiteSpace: 'nowrap' },
  tr: { borderBottom: '1px solid #f1f5f9' },
  td: { padding: '12px 14px', verticalAlign: 'top' },
  titleLink: { display: 'block', fontWeight: 600, color: '#111827', fontSize: 14, lineHeight: 1.4, cursor: 'pointer', textDecoration: 'none' },
  description: { margin: '3px 0 0', fontSize: 12, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 },
  tagRow: { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 },
  tag: { padding: '2px 6px', backgroundColor: '#f3f4f6', color: '#6b7280', borderRadius: 4, fontSize: 11 },
  actionCell: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  detailLink: { display: 'inline-flex', alignItems: 'center', padding: '5px 12px', backgroundColor: '#5b21b6', color: '#fff', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  placeholder: { padding: '40px 16px', fontSize: 14, color: '#94a3b8', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: 12, backgroundColor: '#fff' },
  emptyCta: { fontSize: 14, fontWeight: 600, color: '#2563eb', textDecoration: 'none' },
  pagination: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20 },
  pageBtn: { padding: '6px 14px', fontSize: 13, fontWeight: 500, color: '#475569', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: 6 },
  pageInfo: { fontSize: 13, color: '#64748b' },
};

function libraryBtnStyle(isAdded: boolean, isAdding: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', padding: '5px 10px',
    backgroundColor: isAdded ? '#f3f4f6' : '#fff',
    color: isAdded ? '#9ca3af' : '#5b21b6',
    border: `1px solid ${isAdded ? '#e5e7eb' : '#ddd6fe'}`,
    borderRadius: 6, fontSize: 12, fontWeight: 500,
    cursor: isAdded || isAdding ? 'default' : 'pointer', whiteSpace: 'nowrap',
  };
}

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
  minWidth: 280, maxWidth: 380, width: '90vw', boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
};
function resultRowStyle(bg: string, fg: string): React.CSSProperties {
  return { display: 'flex', flexDirection: 'column', padding: '10px 14px', backgroundColor: bg, color: fg, borderRadius: 8, fontSize: 14, fontWeight: 600 };
}
const modalCloseBtnStyle: React.CSSProperties = {
  marginTop: 20, width: '100%', padding: '10px 0', backgroundColor: '#f3f4f6',
  color: '#374151', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
};

export default ContentCoursesPage;
