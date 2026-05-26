/**
 * InstructorCoursesPage — 강의 목록 (BaseTable + RowActionMenu)
 *
 * WO-O4O-GLYCOPHARM-LMS-PHASE3-INSTRUCTOR-PARITY-V1
 * 경로: /instructor/courses
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { lmsApi, type InstructorDashboardCourse } from '@/api/lms';

const C = { primary: '#16a34a' };

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  pending_review: '검토 중',
  published: '공개',
  rejected: '반려됨',
  archived: '종료',
};

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  draft:          { backgroundColor: '#f3f4f6', color: '#374151' },
  pending_review: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
  published:      { backgroundColor: '#dcfce7', color: '#15803d' },
  rejected:       { backgroundColor: '#fee2e2', color: '#b91c1c' },
  archived:       { backgroundColor: '#f3f4f6', color: '#6b7280' },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? STATUS_STYLE.draft;
  return (
    <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600, ...style }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function InstructorCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<InstructorDashboardCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await lmsApi.getInstructorCourses();
      const list = res?.data ?? (res as any) ?? [];
      setCourses(Array.isArray(list) ? list : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = courses.filter((c) =>
    !search || c.title.toLowerCase().includes(search.toLowerCase()),
  );

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`강의 "${title}"을 삭제하시겠습니까?\n수강자 데이터도 모두 삭제됩니다.`)) return;
    setDeleteLoading(id);
    try {
      await lmsApi.instructorDeleteCourse(id);
      setCourses((p) => p.filter((c) => c.id !== id));
    } catch (e: any) {
      alert(e?.response?.data?.error || '삭제에 실패했습니다.');
    } finally {
      setDeleteLoading(null);
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <button
            onClick={() => navigate('/instructor')}
            style={{ fontSize: 13, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 6, padding: 0 }}
          >
            ← 대시보드
          </button>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>내 강의 목록</h1>
        </div>
        <button
          onClick={() => navigate('/instructor/courses/new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', backgroundColor: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          <Plus size={14} /> 새 강의 만들기
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          placeholder="강의 제목 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, color: '#111827', outline: 'none', width: '100%', maxWidth: 320 }}
        />
      </div>

      {/* Table */}
      <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: 14, color: '#9ca3af', marginBottom: 16 }}>
              {search ? '검색 결과가 없습니다.' : '등록된 강의가 없습니다.'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/instructor/courses/new')}
                style={{ padding: '8px 20px', backgroundColor: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                첫 강의 만들기
              </button>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                {['강의명', '상태', '수강생', '완료율', ''].map((h) => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#6b7280', borderBottom: '1px solid #e5e7eb', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => (
                <tr
                  key={course.id}
                  style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  onClick={() => navigate(`/instructor/courses/${course.id}`)}
                >
                  <td style={{ padding: '13px 16px', fontSize: 14, color: '#111827', fontWeight: 500 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: '#f3f4f6', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {course.thumbnail
                          ? <img src={course.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: 16 }}>📚</span>
                        }
                      </div>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 300 }}>
                        {course.title}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <StatusBadge status={course.status} />
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 14, color: '#374151' }}>
                    {course.enrolledCount ?? '-'}명
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: 14, color: '#374151' }}>
                    {course.completionRate !== undefined ? `${Math.round(course.completionRate)}%` : '-'}
                  </td>
                  <td style={{ padding: '13px 16px' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => navigate(`/instructor/courses/${course.id}`)}
                        style={{ padding: '5px 12px', backgroundColor: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        편집
                      </button>
                      <button
                        onClick={() => navigate(`/instructor/courses/${course.id}/enrollments`)}
                        style={{ padding: '5px 12px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        수강자
                      </button>
                      <button
                        disabled={deleteLoading === course.id}
                        onClick={() => handleDelete(course.id, course.title)}
                        style={{ padding: '5px 12px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: deleteLoading === course.id ? 0.6 : 1, whiteSpace: 'nowrap' }}
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!loading && (
        <p style={{ textAlign: 'right', fontSize: 12, color: '#9ca3af', marginTop: 10 }}>
          전체 {courses.length}개 · 표시 {filtered.length}개
        </p>
      )}
    </div>
  );
}
