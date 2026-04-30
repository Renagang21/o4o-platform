/**
 * ContentCoursesPage — /content/courses
 *
 * WO-KPA-CONTENT-COURSES-LIST-V1
 *
 * 콘텐츠 허브의 "코스형 자료" 전용 목록.
 * lms_courses 테이블에서 content_kind='content_resource'인 항목만 표시.
 * 일반 LMS 강의(/instructor/courses, /lms/courses)와는 분리된 노출.
 *
 * API:
 *   - GET /lms/instructor/courses?contentKind=content_resource (lmsInstructorApi.myCourses)
 *
 * 행 클릭 / 상세 보기:
 *   - /content/courses/${id} → /instructor/courses/${id}로 redirect (App.tsx 라우트)
 *   - 향후 ContentCourseDetailPage 도입 시 변경
 */

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lmsInstructorApi, type Course } from '../../api/lms-instructor';
import { useAuth } from '../../contexts/AuthContext';

const PAGE_LIMIT = 20;

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  published: '공개',
  archived: '보관',
};

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#f1f5f9', text: '#64748b' },
  published: { bg: '#ecfdf5', text: '#047857' },
  archived: { bg: '#fef3c7', text: '#92400e' },
};

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

export function ContentCoursesPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((pageNum: number) => {
    setLoading(true);
    setError(null);
    // WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1: content_resource만 명시 조회
    lmsInstructorApi.myCourses(pageNum, PAGE_LIMIT, 'content_resource')
      .then((res: any) => {
        const list = res?.data?.data ?? [];
        const pagination = res?.data?.pagination;
        setCourses(Array.isArray(list) ? list : []);
        setTotal(pagination?.total ?? 0);
      })
      .catch((e: any) => {
        setError(e?.message || '코스형 자료를 불러오지 못했습니다.');
        setCourses([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(page);
  }, [load, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <Link to="/content" style={styles.backLink}>← 콘텐츠 허브</Link>
          <h1 style={styles.title}>코스형 자료</h1>
          <p style={styles.desc}>주제가 있는 분량 많은 콘텐츠를 목록형으로 구성한 자료입니다.</p>
        </div>
        {isAuthenticated && (
          <Link to="/content/courses/new" style={styles.primaryBtn}>
            + 새 코스형 자료
          </Link>
        )}
      </header>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.tableWrap}>
        {loading ? (
          <div style={styles.placeholder}>불러오는 중...</div>
        ) : courses.length === 0 ? (
          <div style={styles.placeholder}>
            <p style={{ margin: 0, marginBottom: 8 }}>아직 등록된 코스형 자료가 없습니다.</p>
            {isAuthenticated && (
              <Link to="/content/courses/new" style={styles.emptyCta}>
                첫 코스형 자료 만들기 →
              </Link>
            )}
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>제목</th>
                <th style={{ ...styles.th, width: 200 }}>설명</th>
                <th style={{ ...styles.th, width: 80, textAlign: 'center' }}>상태</th>
                <th style={{ ...styles.th, width: 100 }}>작성일</th>
                <th style={{ ...styles.th, width: 80, textAlign: 'center' }}>수강</th>
                <th style={{ ...styles.th, width: 80, textAlign: 'right' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const statusColor = STATUS_COLOR[c.status] ?? STATUS_COLOR.draft;
                return (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/content/courses/${c.id}`)}
                    style={styles.row}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f8fafc'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
                  >
                    <td style={styles.td}>
                      <span style={styles.rowTitle}>{c.title}</span>
                    </td>
                    <td style={{ ...styles.td, color: '#64748b', fontSize: '0.8125rem' }}>
                      {c.description ? c.description.slice(0, 50) + (c.description.length > 50 ? '…' : '') : '-'}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center' }}>
                      <span style={{
                        ...styles.statusBadge,
                        backgroundColor: statusColor.bg,
                        color: statusColor.text,
                      }}>
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                    <td style={{ ...styles.td, color: '#94a3b8', fontSize: '0.8125rem' }}>
                      {formatDate(c.createdAt)}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'center', color: '#64748b', fontSize: '0.8125rem' }}>
                      {c.currentEnrollments ?? 0}
                    </td>
                    <td
                      style={{ ...styles.td, textAlign: 'right' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Link
                        to={`/content/courses/${c.id}`}
                        style={styles.actionLink}
                      >
                        관리 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div style={styles.pagination}>
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            style={{ ...styles.pageBtn, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
          >
            « 이전
          </button>
          <span style={styles.pageInfo}>{page} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            style={{ ...styles.pageBtn, opacity: page >= totalPages ? 0.4 : 1, cursor: page >= totalPages ? 'not-allowed' : 'pointer' }}
          >
            다음 »
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 16px 60px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
    flexWrap: 'wrap',
  },
  backLink: {
    fontSize: '0.8125rem',
    color: '#64748b',
    textDecoration: 'none',
    marginBottom: 8,
    display: 'inline-block',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '4px 0 4px',
  },
  desc: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
  },
  primaryBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 18px',
    backgroundColor: '#2563eb',
    color: '#fff',
    fontSize: '0.875rem',
    fontWeight: 600,
    borderRadius: 8,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },

  errorBox: {
    padding: '10px 14px',
    fontSize: '0.875rem',
    color: '#b91c1c',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 8,
    marginBottom: 16,
  },

  tableWrap: {
    backgroundColor: '#fff',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    overflow: 'hidden',
  },
  placeholder: {
    padding: '40px 16px',
    fontSize: '0.875rem',
    color: '#94a3b8',
    textAlign: 'center',
  },
  emptyCta: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#2563eb',
    textDecoration: 'none',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    tableLayout: 'fixed',
  },
  th: {
    padding: '10px 12px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    textAlign: 'left',
  },
  td: {
    padding: '12px',
    fontSize: '0.875rem',
    color: '#0f172a',
    borderBottom: '1px solid #f1f5f9',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  row: {
    cursor: 'pointer',
    transition: 'background-color 0.1s',
  },
  rowTitle: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: '#1e293b',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '0.6875rem',
    fontWeight: 600,
    borderRadius: 4,
  },
  actionLink: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#2563eb',
    textDecoration: 'none',
  },

  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginTop: 20,
  },
  pageBtn: {
    padding: '6px 14px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: '#475569',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
  },
  pageInfo: {
    fontSize: '0.8125rem',
    color: '#64748b',
  },
};

export default ContentCoursesPage;
