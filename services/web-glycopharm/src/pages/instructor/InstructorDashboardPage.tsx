/**
 * InstructorDashboardPage — 강사 대시보드 (KPA 정렬)
 *
 * WO-O4O-GLYCOPHARM-LMS-PHASE3-INSTRUCTOR-PARITY-V1
 *
 * 구성:
 *  1. KPI 4 카드 (총 강의 / 총 수강생 / 평균 완료율 / 승인 대기)
 *  2. 승인 대기 수강신청 목록 (승인/거절)
 *  3. 내 강의 목록 (편집/수강자 진입)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  GraduationCap,
  Clock,
  Plus,
  ChevronRight,
} from 'lucide-react';
import {
  lmsApi,
  type InstructorDashboardCourse,
  type PendingEnrollment,
} from '@/api/lms';

const C = {
  primary: '#16a34a',
  primaryLight: '#dcfce7',
  primaryDark: '#15803d',
};

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  pending_review: '검토 중',
  published: '공개',
  rejected: '반려됨',
  archived: '종료',
};

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  draft:          { bg: '#f3f4f6', color: '#374151' },
  pending_review: { bg: '#dbeafe', color: '#1d4ed8' },
  published:      { bg: '#dcfce7', color: '#15803d' },
  rejected:       { bg: '#fee2e2', color: '#b91c1c' },
  archived:       { bg: '#f3f4f6', color: '#6b7280' },
};

function KpiCard({ label, value, sub, accent, icon }: {
  label: string; value: string | number; sub?: string; accent: string; icon: React.ReactNode;
}) {
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 12,
      padding: '20px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      borderLeft: `4px solid ${accent}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ padding: 6, borderRadius: 8, backgroundColor: `${accent}18` }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontSize: 30, fontWeight: 700, color: '#111827', margin: 0 }}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {sub && <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>{sub}</p>}
    </div>
  );
}

export default function InstructorDashboardPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<InstructorDashboardCourse[]>([]);
  const [pendingEnrollments, setPendingEnrollments] = useState<PendingEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollmentLoading, setEnrollmentLoading] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [courseRes, enrollRes] = await Promise.all([
        lmsApi.instructorDashboardCourses(),
        lmsApi.instructorPendingEnrollments({ limit: 10 }),
      ]);
      const courseList = courseRes?.data ?? (courseRes as any)?.courses ?? [];
      setCourses(Array.isArray(courseList) ? courseList : []);
      const enrollList = enrollRes?.data?.enrollments ?? enrollRes?.data?.data ?? enrollRes?.data ?? [];
      setPendingEnrollments(Array.isArray(enrollList) ? enrollList : []);
    } catch {
      // silent — partial load
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprove = async (id: string) => {
    setEnrollmentLoading((p) => ({ ...p, [id]: true }));
    try {
      await lmsApi.instructorApproveEnrollment(id);
      setPendingEnrollments((p) => p.filter((e) => e.id !== id));
    } catch {
      alert('승인에 실패했습니다.');
    } finally {
      setEnrollmentLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const handleReject = async (id: string) => {
    if (!confirm('이 수강신청을 거절하시겠습니까?')) return;
    setEnrollmentLoading((p) => ({ ...p, [id]: true }));
    try {
      await lmsApi.instructorRejectEnrollment(id);
      setPendingEnrollments((p) => p.filter((e) => e.id !== id));
    } catch {
      alert('거절에 실패했습니다.');
    } finally {
      setEnrollmentLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const totalEnrolled = courses.reduce((s, c) => s + (c.enrolledCount ?? 0), 0);
  const avgCompletion = courses.length > 0
    ? Math.round(courses.reduce((s, c) => s + (c.completionRate ?? 0), 0) / courses.length)
    : 0;
  const pendingCount = pendingEnrollments.length;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <GraduationCap size={22} color={C.primary} />
            강사 대시보드
          </h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>내 강의를 관리하고 수강생 현황을 확인합니다.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/instructor/courses/new')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={14} /> 새 강의
          </button>
          <button
            onClick={() => navigate('/instructor/courses')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            강의 목록 <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
          <KpiCard label="총 강의" value={courses.length} sub={`공개 ${courses.filter(c => c.isPublished).length}개`} accent={C.primary} icon={<BookOpen size={16} color={C.primary} />} />
          <KpiCard label="총 수강생" value={totalEnrolled} sub="누적 수강신청" accent="#3b82f6" icon={<Users size={16} color="#3b82f6" />} />
          <KpiCard label="평균 완료율" value={`${avgCompletion}%`} sub="활성 강의 기준" accent="#8b5cf6" icon={<GraduationCap size={16} color="#8b5cf6" />} />
          <KpiCard label="승인 대기" value={pendingCount} sub="수강신청 검토 필요" accent="#f59e0b" icon={<Clock size={16} color="#f59e0b" />} />
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>불러오는 중...</div>
      )}

      {/* Pending Enrollments */}
      {!loading && pendingEnrollments.length > 0 && (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>승인 대기 수강신청</h2>
            <span style={{ padding: '1px 8px', backgroundColor: '#fef3c7', color: '#92400e', borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
              {pendingCount}건
            </span>
          </div>
          <div style={{ divide: 'divide' }}>
            {pendingEnrollments.map((e) => (
              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #f9fafb' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#111827', margin: 0, truncate: 'true' }}>
                    {e.userName || e.userEmail || e.userId}
                  </p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '2px 0 0' }}>
                    {e.course?.title ?? e.courseId} · {new Date(e.enrolledAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    disabled={!!enrollmentLoading[e.id]}
                    onClick={() => handleApprove(e.id)}
                    style={{ padding: '6px 14px', backgroundColor: C.primary, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: enrollmentLoading[e.id] ? 0.6 : 1 }}
                  >
                    승인
                  </button>
                  <button
                    disabled={!!enrollmentLoading[e.id]}
                    onClick={() => handleReject(e.id)}
                    style={{ padding: '6px 14px', backgroundColor: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: enrollmentLoading[e.id] ? 0.6 : 1 }}
                  >
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Course List */}
      {!loading && (
        <div style={{ backgroundColor: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#111827', margin: 0 }}>내 강의 목록</h2>
            <button
              onClick={() => navigate('/instructor/courses')}
              style={{ fontSize: 12, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              전체 보기 →
            </button>
          </div>
          {courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 20px' }}>
              <BookOpen size={40} color="#d1d5db" style={{ marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>등록된 강의가 없습니다.</p>
              <button
                onClick={() => navigate('/instructor/courses/new')}
                style={{ padding: '8px 20px', backgroundColor: C.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                첫 강의 만들기
              </button>
            </div>
          ) : (
            <>
              {courses.slice(0, 5).map((course) => (
                <div
                  key={course.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: '1px solid #f9fafb', cursor: 'pointer' }}
                  onClick={() => navigate(`/instructor/courses/${course.id}`)}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: '#f3f4f6', flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {course.thumbnail
                      ? <img src={course.thumbnail} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <BookOpen size={20} color="#d1d5db" />
                    }
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {course.title}
                      </span>
                      <span style={{ padding: '1px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, flexShrink: 0, ...(STATUS_COLOR[course.status] ?? STATUS_COLOR.draft) }}>
                        {STATUS_LABEL[course.status] ?? course.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#9ca3af' }}>
                      {course.enrolledCount !== undefined && <span>{course.enrolledCount}명 수강</span>}
                      {course.completionRate !== undefined && <span>완료율 {Math.round(course.completionRate)}%</span>}
                      {course.duration > 0 && <span><Clock size={10} style={{ marginRight: 2 }} />{course.duration}분</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/instructor/courses/${course.id}`)}
                      style={{ padding: '5px 12px', backgroundColor: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      편집
                    </button>
                    <button
                      onClick={() => navigate(`/instructor/courses/${course.id}/enrollments`)}
                      style={{ padding: '5px 12px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      수강자
                    </button>
                  </div>
                </div>
              ))}
              {courses.length > 5 && (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <button
                    onClick={() => navigate('/instructor/courses')}
                    style={{ fontSize: 13, color: C.primary, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                  >
                    {courses.length - 5}개 더 보기 →
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
