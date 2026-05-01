/**
 * CourseListPage — /instructor/courses
 * WO-O4O-LMS-FOUNDATION-V1
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lmsInstructorApi, Course } from '../../../api/lms-instructor';

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  published: '발행됨',
  archived: '보관됨',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#6b7280',
  published: '#10b981',
  archived: '#f59e0b',
};

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 900, margin: '0 auto', padding: '32px 20px' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 },
  newBtn: {
    padding: '10px 20px', background: '#4f46e5', color: '#fff',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  backLink: { fontSize: 13, color: '#6b7280', cursor: 'pointer', marginBottom: 16, display: 'inline-block' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: '60px 0', fontSize: 15 },
  card: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
    padding: '20px 24px', marginBottom: 16, display: 'flex',
    alignItems: 'flex-start', gap: 20, cursor: 'pointer',
    transition: 'box-shadow 0.15s',
  },
  thumb: { width: 80, height: 60, borderRadius: 8, objectFit: 'cover', background: '#f3f4f6', flexShrink: 0 },
  thumbPlaceholder: {
    width: 80, height: 60, borderRadius: 8, background: '#e5e7eb',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#9ca3af', fontSize: 22, flexShrink: 0,
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#6b7280', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardMeta: { display: 'flex', gap: 12, alignItems: 'center' },
  metaText: { fontSize: 12, color: '#9ca3af' },
  error: { color: '#ef4444', padding: '20px 0', textAlign: 'center' },
};

const badgeStyle = (color: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 11, fontWeight: 600, color: '#fff', background: color,
});

export default function CourseListPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    lmsInstructorApi.myCourses()
      .then((res: any) => {
        // API returns: { success, data: Course[], pagination: {...} }
        const courses = res.data?.data;
        setCourses(Array.isArray(courses) ? courses : []);
      })
      .catch((err: any) => {
        if (err?.response?.data?.code === 'INSTRUCTOR_REQUIRED') {
          navigate('/instructor');
        } else {
          setError('강의 목록을 불러오지 못했습니다.');
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  return (
    <div style={styles.page}>
      <span style={styles.backLink} onClick={() => navigate('/instructor')}>← 강사 대시보드</span>
      <div style={styles.header}>
        <h1 style={styles.title}>내 강의 목록</h1>
        <button style={styles.newBtn} onClick={() => navigate('/instructor/courses/new')}>
          + 새 강의 만들기
        </button>
      </div>

      {loading && <p style={{ color: '#6b7280' }}>불러오는 중...</p>}
      {error && <p style={styles.error}>{error}</p>}

      {!loading && !error && courses.length === 0 && (
        <div style={styles.empty}>
          <p>아직 등록된 강의가 없습니다.</p>
          <button style={{ ...styles.newBtn, marginTop: 12 }} onClick={() => navigate('/instructor/courses/new')}>
            첫 번째 강의 만들기
          </button>
        </div>
      )}

      {courses.map((course) => (
        <div
          key={course.id}
          style={styles.card}
          onClick={() => navigate(`/instructor/courses/${course.id}`)}
        >
          {course.thumbnail ? (
            <img src={course.thumbnail} alt={course.title} style={styles.thumb} />
          ) : (
            <div style={styles.thumbPlaceholder}>📚</div>
          )}
          <div style={styles.cardBody}>
            <div style={styles.cardTitle}>{course.title}</div>
            <div style={styles.cardDesc}>{course.description}</div>
            <div style={styles.cardMeta}>
              <span style={badgeStyle(STATUS_COLOR[course.status] || '#6b7280')}>
                {STATUS_LABEL[course.status] || course.status}
              </span>
              <span style={styles.metaText}>수강 {course.currentEnrollments}명</span>
              {course.duration > 0 && (
                <span style={styles.metaText}>{course.duration}분</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
