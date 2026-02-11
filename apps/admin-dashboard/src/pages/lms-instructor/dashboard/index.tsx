/**
 * Instructor Dashboard
 *
 * WO-LMS-INSTRUCTOR-DASHBOARD-UX-REFINEMENT-V1
 *
 * 3영역: 상태 요약 카드 / 강좌 목록 테이블 / 수강 승인 모달
 */

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Clock, UserCheck, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AGModal, AGConfirmModal } from '@/components/ag/AGModal';
import { instructorApi, type InstructorCourse, type EnrollmentItem } from '@/lib/api/lmsInstructor';

export default function InstructorDashboard() {
  // ── State ──
  const [courses, setCourses] = useState<InstructorCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<InstructorCourse | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);

  // Confirm
  const [confirmAction, setConfirmAction] = useState<{
    type: 'approve' | 'reject';
    enrollment: EnrollmentItem;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Data Fetch ──
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await instructorApi.getMyCourses();
      setCourses(res.data || []);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        setError('강사 권한이 필요합니다. 강사 신청 후 승인을 받아주세요.');
      } else {
        setError('강좌 목록을 불러오지 못했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const fetchEnrollments = useCallback(async (courseId: string) => {
    try {
      setEnrollmentsLoading(true);
      const res = await instructorApi.getPendingEnrollments(courseId);
      setEnrollments(res.data || []);
    } catch {
      setEnrollments([]);
    } finally {
      setEnrollmentsLoading(false);
    }
  }, []);

  // ── Handlers ──
  const openEnrollmentModal = (course: InstructorCourse) => {
    setSelectedCourse(course);
    setModalOpen(true);
    fetchEnrollments(course.id);
  };

  const handleAction = async () => {
    if (!confirmAction) return;
    try {
      setActionLoading(true);
      if (confirmAction.type === 'approve') {
        await instructorApi.approveEnrollment(confirmAction.enrollment.id);
      } else {
        await instructorApi.rejectEnrollment(confirmAction.enrollment.id);
      }
      // Refresh
      if (selectedCourse) {
        await fetchEnrollments(selectedCourse.id);
      }
      await fetchCourses();
    } catch {
      // silent — API error
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  // ── Computed ──
  const totalCourses = courses.length;
  const pendingCount = courses.reduce((sum, c) => sum + (c.currentEnrollments || 0), 0);
  // pendingCount from API represents pending enrollments count
  // For approved count we don't have a separate field, so we show total enrollments label differently

  // ── Render ──
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-red-700">{error}</p>
          <Button variant="outline" className="mt-4" onClick={fetchCourses}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">강사 대시보드</h1>
        <p className="mt-1 text-sm text-gray-500">
          내 강좌 관리 및 수강 신청 승인
        </p>
      </div>

      {/* ── A. 상태 요약 카드 ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">내 강좌</CardTitle>
            <BookOpen className="h-5 w-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCourses}개</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">신청 대기</CardTitle>
            <Clock className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingCount}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">수강생</CardTitle>
            <UserCheck className="h-5 w-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{pendingCount > 0 ? '—' : '0'}명</div>
          </CardContent>
        </Card>
      </div>

      {/* ── B. 강좌 목록 테이블 ── */}
      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">아직 개설한 강좌가 없습니다.</p>
            <p className="text-sm text-gray-400 mt-1">
              강좌를 먼저 생성해 주세요.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">내 강좌 목록</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>강좌명</TableHead>
                  <TableHead className="w-24 text-center">유형</TableHead>
                  <TableHead className="w-24 text-center">승인 필요</TableHead>
                  <TableHead className="w-28 text-center">신청 대기</TableHead>
                  <TableHead className="w-28 text-center">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell className="font-medium">{course.title}</TableCell>
                    <TableCell className="text-center">
                      {course.isPaid ? (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">유료</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">무료</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {course.requiresApproval ? (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">승인제</Badge>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {course.currentEnrollments > 0 ? (
                        <span className="font-semibold text-amber-600">{course.currentEnrollments}명</span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {course.requiresApproval && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEnrollmentModal(course)}
                        >
                          신청 관리
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── C. 수강 신청 관리 모달 ── */}
      <AGModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={`수강 신청 관리 — ${selectedCourse?.title || ''}`}
        size="lg"
      >
        {enrollmentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : enrollments.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="mx-auto h-10 w-10 text-gray-300 mb-3" />
            <p className="text-gray-500">현재 대기 중인 수강 신청이 없습니다.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>신청자</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead className="w-32">신청일</TableHead>
                <TableHead className="w-24 text-center">승인</TableHead>
                <TableHead className="w-24 text-center">거절</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell className="font-medium">
                    {enrollment.user?.name ||
                      (enrollment.user?.firstName && enrollment.user?.lastName
                        ? `${enrollment.user.lastName}${enrollment.user.firstName}`
                        : enrollment.user?.email || '—')}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {enrollment.user?.email || '—'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(enrollment.createdAt).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                      onClick={() => setConfirmAction({ type: 'approve', enrollment })}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => setConfirmAction({ type: 'reject', enrollment })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </AGModal>

      {/* ── Confirm Dialog ── */}
      <AGConfirmModal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleAction}
        title={confirmAction?.type === 'approve' ? '수강 승인' : '수강 거절'}
        message={
          confirmAction?.type === 'approve'
            ? `${confirmAction.enrollment.user?.name || confirmAction.enrollment.user?.email || '해당 사용자'}의 수강을 승인하시겠습니까?`
            : `${confirmAction?.enrollment.user?.name || confirmAction?.enrollment.user?.email || '해당 사용자'}의 수강을 거절하시겠습니까?`
        }
        confirmLabel={confirmAction?.type === 'approve' ? '승인' : '거절'}
        variant={confirmAction?.type === 'reject' ? 'danger' : 'primary'}
        loading={actionLoading}
      />
    </div>
  );
}
