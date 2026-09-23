import { Router, Request, Response } from 'express';
import { CourseController } from '../controllers/CourseController.js';
import { LessonController } from '../controllers/LessonController.js';
import { EnrollmentController } from '../controllers/EnrollmentController.js';
import { CertificateController } from '../controllers/CertificateController.js';
// WO-LMS-INSTRUCTOR-ROLE-V1
import { InstructorController } from '../controllers/InstructorController.js';
// WO-O4O-QUIZ-SYSTEM-V1
import { QuizController } from '../controllers/QuizController.js';
// WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
import { AssignmentController } from '../controllers/AssignmentController.js';
// WO-O4O-COMPLETION-V1
import { CompletionController } from '../controllers/CompletionController.js';
import { requireAuth, optionalAuth } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { requireEnrollment } from '../middleware/requireEnrollment.js';
import { requireInstructor } from '../middleware/requireInstructor.js';
// WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2: Lecture 접근 계약 (KPA guard · 서비스 allowlist 제거)
import { requireLectureLearner, requireLectureOperator, isLectureCourse } from '../middleware/lecture-access.js';
import { lmsContextMiddleware } from '../utils/lms-service-scope.js';
import { apiLimiter } from '../../../middleware/rateLimiter.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
// WO-O4O-LMS-GLOBAL-OPERATOR-ROUTES-V1
import { CourseService } from '../services/CourseService.js';
import { AppDataSource } from '../../../database/connection.js';
import logger from '../../../utils/logger.js';

const router: Router = Router();

// ========================================
// WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2 — 접근 계약
//
//   `/api/v1/lms/*` 는 이제 O4O 강의(lecture) 서비스 전용 runtime 이다.
//   - 모든 요청의 LMS service scope 는 서버가 `lecture` 로 고정한다. 클라이언트 `?serviceKey`
//     는 무시된다 (route context 가 우선 — lms-service-scope.ts 우선순위 1).
//   - Learner   : requireAuth + requireLectureLearner  (active lecture membership · role 불요)
//   - Instructor: requireAuth + requireInstructor      (membership + lecture:instructor)
//   - Operator  : requireAuth + requireLectureOperator (membership + lecture:operator ⊂ lecture:admin)
//   - kpa:admin / cosmetics:* / pharmacy-hub:* / legacy lms:instructor 는 어떤 경로도 통과하지 못한다.
//   - 운영 대상 강의는 course.serviceKey === 'lecture' 만. 그 외는 non-disclosure 404.
// ========================================
router.use(lmsContextMiddleware({ serviceCode: SERVICE_KEYS.LECTURE }));
// PR #225 merge-gate(CodeQL js/missing-rate-limiting): middleware/rateLimiter 의 apiLimiter(분당 60)를 모든 LMS 라우트에 건다.
//
// 11차 P1-30: **라우터 레벨(router.use)로 걸지 않는다.**
//   apiLimiter.keyGenerator 는 `${trustedClientIp}:${req.user?.id ?? 'anonymous'}` 라서, 라우터 레벨에서
//   각 라우트의 optionalAuth / requireAuth 보다 먼저 실행되면 req.user 가 비어 있어 로그인 사용자도 전부
//   `<IP>:anonymous` 한 버킷으로 묶인다 — 약국·강의실·사내망처럼 NAT 를 공유하면 서로 무관한 사용자들이
//   분당 60 요청 예산을 나눠 쓰게 된다(강의 상세·레슨 플레이어 동시 로드로 429).
//   그래서 **각 라우트에서 auth 미들웨어 바로 뒤**에 apiLimiter 를 둔다. 순서는 전 라우트 동일하다:
//     requireAuth  → apiLimiter → role/membership guard → enrollment guard → controller
//     optionalAuth → apiLimiter → controller
//     (인증 없는 공개 검증 2개) apiLimiter → controller
//   토큰이 없거나 무효하면 optionalAuth/requireAuth 가 req.user 를 채우지 않으므로 키는 그대로
//   `<IP>:anonymous` 다 — 무효 토큰으로 개인 버킷을 만들어 IP 한도를 우회할 수 없다.
//   Auth Core(requireAuth/optionalAuth)는 수정하지 않는다.

// ========================================
// COURSE ROUTES
// WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Write ops require instructor/admin
// ========================================

// POST /api/v1/lms/courses - Create Course
router.post('/courses', requireAuth, apiLimiter, requireInstructor, asyncHandler(CourseController.createCourse));

// GET /api/v1/lms/courses - List Courses
// WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-POLICY-V1: optionalAuth — 비로그인은 visibility='public'만 노출
router.get('/courses', optionalAuth, apiLimiter, asyncHandler(CourseController.listCourses));

// GET /api/v1/lms/courses/:id - Get Course by ID
// WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-POLICY-V1: optionalAuth — members 강의는 비로그인 시 401(MEMBERS_ONLY)
router.get('/courses/:id', optionalAuth, apiLimiter, asyncHandler(CourseController.getCourse));

// PATCH /api/v1/lms/courses/:id - Update Course
router.patch('/courses/:id', requireAuth, apiLimiter, requireInstructor, asyncHandler(CourseController.updateCourse));

// DELETE /api/v1/lms/courses/:id - Archive Course
router.delete('/courses/:id', requireAuth, apiLimiter, requireInstructor, asyncHandler(CourseController.deleteCourse));

// POST /api/v1/lms/courses/:id/publish - Publish Course (Lecture 운영자 override 경로)
// WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1: 강사 직접 publish 금지 — submit-review 사용
router.post('/courses/:id/publish', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(CourseController.publishCourse));

// POST /api/v1/lms/courses/:id/submit-review - 강사 승인 요청
// WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1: DRAFT 또는 REJECTED → PENDING_REVIEW
router.post('/courses/:id/submit-review', requireAuth, apiLimiter, requireInstructor, asyncHandler(CourseController.submitForReview));

// POST /api/v1/lms/courses/:id/unpublish - Unpublish Course
router.post('/courses/:id/unpublish', requireAuth, apiLimiter, requireInstructor, asyncHandler(CourseController.unpublishCourse));

// POST /api/v1/lms/courses/:id/archive - Archive Course
router.post('/courses/:id/archive', requireAuth, apiLimiter, requireInstructor, asyncHandler(CourseController.archiveCourse));

// ========================================
// LESSON ROUTES
// ========================================

// POST /api/v1/lms/courses/:courseId/lessons - Create Lesson
router.post('/courses/:courseId/lessons', requireAuth, apiLimiter, requireInstructor, asyncHandler(LessonController.createLesson));

// GET /api/v1/lms/courses/:courseId/lessons - List Lessons for Course
router.get('/courses/:courseId/lessons', requireAuth, apiLimiter, requireEnrollment(), asyncHandler(LessonController.listLessonsByCourse));

// GET /api/v1/lms/lessons/:id - Get Lesson by ID
router.get('/lessons/:id', requireAuth, apiLimiter, requireEnrollment({ checkLesson: true }), asyncHandler(LessonController.getLesson));

// PATCH /api/v1/lms/lessons/:id - Update Lesson
router.patch('/lessons/:id', requireAuth, apiLimiter, requireInstructor, asyncHandler(LessonController.updateLesson));

// DELETE /api/v1/lms/lessons/:id - Delete Lesson
router.delete('/lessons/:id', requireAuth, apiLimiter, requireInstructor, asyncHandler(LessonController.deleteLesson));

// POST /api/v1/lms/courses/:courseId/lessons/reorder - Reorder Lessons
router.post('/courses/:courseId/lessons/reorder', requireAuth, apiLimiter, requireInstructor, asyncHandler(LessonController.reorderLessons));

// ========================================
// QUIZ ROUTES (WO-O4O-QUIZ-SYSTEM-V1)
// ========================================

// GET /api/v1/lms/lessons/:lessonId/quiz - Get Quiz for Lesson
//   7차 P2-8: 문항 조회에도 강의 접근 정책(visibility · membership · 유료/승인 enrollment)을 적용한다.
//   소유 강사·lecture:admin 은 allowCourseOwner 로 통과(편집 화면은 별도 instructor 경로를 쓴다).
router.get('/lessons/:lessonId/quiz', requireAuth, apiLimiter, requireEnrollment({ checkLesson: true, allowCourseOwner: true }), asyncHandler(QuizController.getQuizForLesson));

// GET /api/v1/lms/instructor/lessons/:lessonId/quiz — 강사 편집용 (정답 포함 · 소유자 또는 lecture:admin)
//   PR #225 merge-gate(Codex P1): 강사 편집기는 learner sanitized 응답을 쓰지 않는다 (정답 유실 방지).
router.get('/instructor/lessons/:lessonId/quiz', requireAuth, apiLimiter, requireInstructor, asyncHandler(QuizController.getQuizForLessonAsInstructor));

// POST /api/v1/lms/quizzes - Create Quiz (Instructor)
router.post('/quizzes', requireAuth, apiLimiter, requireInstructor, asyncHandler(QuizController.createQuiz));

// POST /api/v1/lms/quizzes/:quizId/submit - Submit Quiz Answers
//   4차 P1-15: membership 만으로는 유료·승인 강의의 attempt(보상 포함)를 쓸 수 없다 — 동일한 enrollment 정책 적용.
router.post('/quizzes/:quizId/submit', requireAuth, apiLimiter, requireLectureLearner, requireEnrollment({ checkQuiz: true }), asyncHandler(QuizController.submitQuiz));

// GET /api/v1/lms/quizzes/:quizId/attempts - Get User's Attempts
router.get('/quizzes/:quizId/attempts', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(QuizController.getAttempts));

// PATCH /api/v1/lms/quizzes/:quizId - Update Quiz (Instructor)
router.patch('/quizzes/:quizId', requireAuth, apiLimiter, requireInstructor, asyncHandler(QuizController.updateQuiz));

// ========================================
// ASSIGNMENT ROUTES (WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1)
// ========================================

// GET /api/v1/lms/lessons/:lessonId/assignment - Get assignment for a lesson
//   7차 P2-8: quiz 조회와 동일한 정책 — 비회원·미등록자는 과제 안내를 읽을 수 없다.
router.get('/lessons/:lessonId/assignment', requireAuth, apiLimiter, requireEnrollment({ checkLesson: true, allowCourseOwner: true }), asyncHandler(AssignmentController.getAssignmentForLesson));

// POST /api/v1/lms/assignments - Upsert assignment (Instructor)
router.post('/assignments', requireAuth, apiLimiter, requireInstructor, asyncHandler(AssignmentController.upsertAssignment));

// POST /api/v1/lms/assignments/:assignmentId/submit - Submit assignment (Learner)
//   4차 P1-15: quiz submit 과 같은 정책 — 제출을 저장하기 전에 enrollment 를 판정한다.
router.post('/assignments/:assignmentId/submit', requireAuth, apiLimiter, requireLectureLearner, requireEnrollment({ checkAssignment: true }), asyncHandler(AssignmentController.submitAssignment));

// GET /api/v1/lms/assignments/:assignmentId/my - Get current user's submission
router.get('/assignments/:assignmentId/my', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(AssignmentController.getMySubmission));

// ========================================
// COMPLETION ROUTES (WO-O4O-COMPLETION-V1)
// ========================================

// GET /api/v1/lms/completions/me - Get My Completions
router.get('/completions/me', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(CompletionController.getMyCompletions));

// ========================================
// ENROLLMENT ROUTES
// ========================================

// POST /api/v1/lms/courses/:courseId/enroll - Enroll in Course
router.post('/courses/:courseId/enroll', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(EnrollmentController.enrollCourse));

// GET /api/v1/lms/enrollments - List Enrollments
router.get('/enrollments', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(EnrollmentController.listEnrollments));

// GET /api/v1/lms/enrollments/me - Get My Enrollments
router.get('/enrollments/me', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(EnrollmentController.getMyEnrollments));

// GET /api/v1/lms/enrollments/:id - Get Enrollment by ID
router.get('/enrollments/:id', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(EnrollmentController.getEnrollment));

// PATCH /api/v1/lms/enrollments/:id - Update Enrollment
router.patch('/enrollments/:id', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(EnrollmentController.updateEnrollment));

// POST /api/v1/lms/enrollments/:id/start - Start Enrollment
router.post('/enrollments/:id/start', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(EnrollmentController.startEnrollment));

// POST /api/v1/lms/enrollments/:id/complete - Complete Enrollment
router.post('/enrollments/:id/complete', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(EnrollmentController.completeEnrollment));

// POST /api/v1/lms/enrollments/:id/cancel - Cancel Enrollment
router.post('/enrollments/:id/cancel', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(EnrollmentController.cancelEnrollment));

// GET /api/v1/lms/enrollments/me/course/:courseId - Get My Enrollment for a Course (WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1)
router.get('/enrollments/me/course/:courseId', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(EnrollmentController.getMyEnrollmentForCourse));

// POST /api/v1/lms/enrollments/:courseId/progress - Update Lesson Progress (WO-O4O-LMS-ROUTING-INTEGRATION-FIX-V1)
router.post('/enrollments/:courseId/progress', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(EnrollmentController.updateLessonProgress));

// ========================================
// CERTIFICATE ROUTES
// ========================================

// POST /api/v1/lms/certificates/issue - Issue Certificate
router.post('/certificates/issue', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(CertificateController.issueCertificate));

// GET /api/v1/lms/certificates - List Certificates
router.get('/certificates', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(CertificateController.listCertificates));

// GET /api/v1/lms/certificates/me - Get My Certificates
router.get('/certificates/me', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(CertificateController.getMyCertificates));

// GET /api/v1/lms/certificates/verify/:verificationCode - Verify Certificate (Public)
router.get('/certificates/verify/:verificationCode', apiLimiter, asyncHandler(CertificateController.verifyCertificate));

// GET /api/v1/lms/certificates/number/:certificateNumber - Get Certificate by Number
router.get('/certificates/number/:certificateNumber', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(CertificateController.getCertificateByNumber));

// GET /api/v1/lms/certificates/:id/pdf - Download Certificate PDF (WO-O4O-LMS-CERTIFICATE-PDF-V1)
router.get('/certificates/:id/pdf', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(CertificateController.downloadPdf));

// GET /api/v1/lms/certificates/:id/verify - Public Certificate Verification (WO-O4O-LMS-CERTIFICATE-VERIFICATION-V1)
router.get('/certificates/:id/verify', apiLimiter, asyncHandler(CertificateController.verifyPublic));

// GET /api/v1/lms/certificates/:id - Get Certificate by ID
router.get('/certificates/:id', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(CertificateController.getCertificate));

// PATCH /api/v1/lms/certificates/:id - Update Certificate
router.patch('/certificates/:id', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(CertificateController.updateCertificate));

// POST /api/v1/lms/certificates/:id/revoke - Revoke Certificate
router.post('/certificates/:id/revoke', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(CertificateController.revokeCertificate));

// POST /api/v1/lms/certificates/:id/renew - Renew Certificate
router.post('/certificates/:id/renew', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(CertificateController.renewCertificate));

// ========================================
// INSTRUCTOR ROUTES (WO-LMS-INSTRUCTOR-ROLE-V1)
// ========================================

// POST /api/v1/lms/instructor/apply - Apply for Instructor Role
router.post('/instructor/apply', requireAuth, apiLimiter, requireLectureLearner, asyncHandler(InstructorController.apply));

// GET /api/v1/lms/instructor/applications - List Instructor Applications (Admin)
router.get('/instructor/applications', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(InstructorController.listApplications));

// POST /api/v1/lms/instructor/applications/:id/approve - Approve Application (Admin)
router.post('/instructor/applications/:id/approve', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(InstructorController.approveApplication));

// POST /api/v1/lms/instructor/applications/:id/reject - Reject Application (Admin)
router.post('/instructor/applications/:id/reject', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(InstructorController.rejectApplication));

// GET /api/v1/lms/instructor/courses - My Courses (Instructor)
router.get('/instructor/courses', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.myCourses));

// GET /api/v1/lms/instructor/courses/:courseId/lessons - Instructor Lessons (WO-O4O-LMS-MEMBERSHIP-COURSE-E2E-BUGFIX-V1)
router.get('/instructor/courses/:courseId/lessons', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.courseLessons));

// GET /api/v1/lms/instructor/courses/:courseId/points - 강의 포인트 지급 현황 (WO-O4O-KPA-LMS-OPERATIONS-POINT-REWARD-VIEW-V1)
router.get('/instructor/courses/:courseId/points', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.coursePoints));

// GET /api/v1/lms/instructor/enrollments - Pending Enrollments for My Courses (Instructor)
router.get('/instructor/enrollments', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.pendingEnrollments));

// GET /api/v1/lms/instructor/dashboard/courses - 강사 강의 목록 + 요약 통계 (WO-O4O-LMS-INSTRUCTOR-DASHBOARD-MVP-V1)
router.get('/instructor/dashboard/courses', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.dashboardCourses));

// GET /api/v1/lms/instructor/participants/:courseId/summary - 보상 운영 요약 통계 (WO-O4O-MARKETING-CONTENT-OPERATIONS-ENHANCEMENT-V2)
router.get('/instructor/participants/:courseId/summary', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.participantsSummary));

// GET /api/v1/lms/instructor/participants/:courseId/export - CSV 내보내기 (WO-O4O-MARKETING-CONTENT-OPERATIONS-ENHANCEMENT-V2)
router.get('/instructor/participants/:courseId/export', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.participantsExport));

// GET /api/v1/lms/instructor/participants/:courseId - 콘텐츠별 참여자 관리 (WO-O4O-MARKETING-CONTENT-OPERATIONS-MVP-V1)
router.get('/instructor/participants/:courseId', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.participants));

// GET /api/v1/lms/instructor/dashboard/stats/:courseId - 강의별 운영 지표 (WO-O4O-LMS-INSTRUCTOR-DASHBOARD-MVP-V1)
router.get('/instructor/dashboard/stats/:courseId', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.dashboardStats));

// POST /api/v1/lms/instructor/enrollments/:id/approve - Approve Enrollment (Instructor)
router.post('/instructor/enrollments/:id/approve', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.approveEnrollment));

// POST /api/v1/lms/instructor/enrollments/:id/reject - Reject Enrollment (Instructor)
router.post('/instructor/enrollments/:id/reject', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.rejectEnrollment));

// WO-O4O-LMS-ASSIGNMENT-GRADING-V1: 과제 채점

// GET /api/v1/lms/instructor/lessons/:lessonId/submissions - List submissions (Instructor)
router.get('/instructor/lessons/:lessonId/submissions', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.listLessonSubmissions));

// POST /api/v1/lms/instructor/submissions/:submissionId/grade - Grade submission (Instructor)
router.post('/instructor/submissions/:submissionId/grade', requireAuth, apiLimiter, requireInstructor, asyncHandler(InstructorController.gradeSubmission));

// NOTE: TEMPLATE ROUTES (WO-O4O-TEMPLATE-SYSTEM-FOUNDATION) 제거
// (WO-O4O-LMS-TEMPLATE-AND-CONTENT-CORE-DEAD-CODE-CLEANUP-V1 — 미사용 scaffold, frontend 0)

// ========================================
// OPERATOR COURSE ACTION ROUTES (WO-O4O-LMS-GLOBAL-OPERATOR-ROUTES-V1)
// WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2: Lecture Operator 전용.
//   guard = requireLectureOperator, 대상 = course.serviceKey === 'lecture' (그 외 404).
// ========================================

// GET /api/v1/lms/operator/courses — 운영 목록 (status/contentKind/search 필터는 listCourses 계약 그대로)
//   7차 P1-17: 학습자 목록(GET /courses)은 서버가 status=published 로 고정하므로, 전체 상태 열람은 이 경로만.
router.get('/operator/courses', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(CourseController.listCourses));

// GET /api/v1/lms/operator/courses/:courseId/review — 운영자 검토 전용 read-only surface
//   11차 P2: 승인·반려 전에 내용을 확인할 수 있어야 한다. learner enrollment 를 약화하지 않고
//   운영자를 자동 수강 등록하지도 않으며 instructor 권한도 주지 않는다 (write 0).
router.get('/operator/courses/:courseId/review', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(CourseController.operatorCourseReview));

// POST /api/v1/lms/operator/courses/:id/approve — PENDING_REVIEW → PUBLISHED
router.post('/operator/courses/:id/approve', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(async (req: Request, res: Response) => {
  const service = CourseService.getInstance();
  const course = await service.getCourse(req.params.id);
  if (!course) { return res.status(404).json({ success: false, error: '강의를 찾을 수 없습니다' }); }
  if (!isLectureCourse(course.serviceKey)) { return res.status(404).json({ success: false, error: '강의를 찾을 수 없습니다' }); }
  const userRoles: string[] = (req as any).user?.roles || [];
  try {
    const updated = await service.approveCourse(req.params.id, {
      id: (req as any).user?.id,
      role: userRoles[0] ?? null,
    });
    return res.json({ success: true, data: { course: updated } });
  } catch (err: any) {
    if (err.message?.startsWith('INVALID_STATUS_TRANSITION')) {
      return res.status(400).json({ success: false, error: '검토 대기(PENDING_REVIEW) 상태의 강의만 승인할 수 있습니다.', code: 'INVALID_STATUS_TRANSITION' });
    }
    throw err;
  }
}));

// POST /api/v1/lms/operator/courses/:id/reject — PENDING_REVIEW → REJECTED + rejectionReason
router.post('/operator/courses/:id/reject', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(async (req: Request, res: Response) => {
  const service = CourseService.getInstance();
  const course = await service.getCourse(req.params.id);
  if (!course) { return res.status(404).json({ success: false, error: '강의를 찾을 수 없습니다' }); }
  if (!isLectureCourse(course.serviceKey)) { return res.status(404).json({ success: false, error: '강의를 찾을 수 없습니다' }); }
  const userRoles: string[] = (req as any).user?.roles || [];
  const reason = typeof req.body?.reason === 'string' ? req.body.reason : '';
  try {
    const updated = await service.rejectCourse(req.params.id, reason, {
      id: (req as any).user?.id,
      role: userRoles[0] ?? null,
    });
    return res.json({ success: true, data: { course: updated } });
  } catch (err: any) {
    if (err.message === 'REJECTION_REASON_REQUIRED') {
      return res.status(400).json({ success: false, error: '반려 사유를 입력해주세요.', code: 'REJECTION_REASON_REQUIRED' });
    }
    if (err.message?.startsWith('INVALID_STATUS_TRANSITION')) {
      return res.status(400).json({ success: false, error: '검토 대기(PENDING_REVIEW) 상태의 강의만 반려할 수 있습니다.', code: 'INVALID_STATUS_TRANSITION' });
    }
    throw err;
  }
}));

// POST /api/v1/lms/operator/courses/:id/unpublish — PUBLISHED → DRAFT
router.post('/operator/courses/:id/unpublish', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(async (req: Request, res: Response) => {
  const service = CourseService.getInstance();
  const course = await service.getCourse(req.params.id);
  if (!course) { return res.status(404).json({ success: false, error: '강의를 찾을 수 없습니다' }); }
  if (!isLectureCourse(course.serviceKey)) { return res.status(404).json({ success: false, error: '강의를 찾을 수 없습니다' }); }
  const userRoles: string[] = (req as any).user?.roles || [];
  const updated = await service.unpublishCourse(req.params.id);
  return res.json({ success: true, data: { course: updated } });
}));

// POST /api/v1/lms/operator/courses/:id/archive — any status → ARCHIVED
router.post('/operator/courses/:id/archive', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(async (req: Request, res: Response) => {
  const service = CourseService.getInstance();
  const course = await service.getCourse(req.params.id);
  if (!course) { return res.status(404).json({ success: false, error: '강의를 찾을 수 없습니다' }); }
  if (!isLectureCourse(course.serviceKey)) { return res.status(404).json({ success: false, error: '강의를 찾을 수 없습니다' }); }
  const userRoles: string[] = (req as any).user?.roles || [];
  const updated = await service.archiveCourse(req.params.id);
  return res.json({ success: true, data: { course: updated } });
}));

// DELETE /api/v1/lms/operator/courses/:id/hard — ARCHIVED only, cascaded hard delete
router.delete('/operator/courses/:id/hard', requireAuth, apiLimiter, requireLectureOperator, asyncHandler(async (req: Request, res: Response) => {
  const service = CourseService.getInstance();
  const course = await service.getCourse(req.params.id);
  if (!course) { return res.status(404).json({ success: false, error: '강의를 찾을 수 없습니다' }); }
  if (!isLectureCourse(course.serviceKey)) { return res.status(404).json({ success: false, error: '강의를 찾을 수 없습니다' }); }
  const userRoles: string[] = (req as any).user?.roles || [];
  if (course.status !== 'archived') {
    return res.status(400).json({ success: false, error: '종료(보관) 상태의 강의만 완전 삭제할 수 있습니다.' });
  }
  const courseId = course.id;
  const title = course.title;
  const db = AppDataSource;
  await db.query(`DELETE FROM lms_progress WHERE "enrollmentId" IN (SELECT id FROM lms_enrollments WHERE "courseId" = $1)`, [courseId]);
  await db.query(`DELETE FROM lms_progress WHERE "lessonId" IN (SELECT id FROM lms_lessons WHERE "courseId" = $1)`, [courseId]);
  await db.query(`DELETE FROM lms_quiz_attempts WHERE "quizId" IN (SELECT id FROM lms_quizzes WHERE "courseId" = $1)`, [courseId]);
  await db.query(`DELETE FROM lms_quizzes WHERE "courseId" = $1`, [courseId]);
  await db.query(`DELETE FROM lms_certificates WHERE "courseId" = $1`, [courseId]);
  await db.query(`DELETE FROM lms_enrollments WHERE "courseId" = $1`, [courseId]);
  await db.query(`DELETE FROM lms_events WHERE "courseId" = $1`, [courseId]);
  await db.query(`DELETE FROM lms_lessons WHERE "courseId" = $1`, [courseId]);
  await db.query(`DELETE FROM lms_courses WHERE id = $1`, [courseId]);
  logger.info('[LmsOperator] COURSE_HARD_DELETED', { operatorId: (req as any).user?.id, courseId, title });
  return res.json({ success: true, data: { deleted: true, id: courseId, title } });
}));

export default router;
