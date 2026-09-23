/**
 * requireEnrollment Middleware
 *
 * WO-O4O-LMS-VISIBILITY-ENROLLMENT-INTEGRATION-V1
 *
 * 강의 visibility + enrollment 통합 접근 제어 미들웨어.
 *
 * PUBLIC  강의 → membership 불요. 단 isPaid·requiresApproval 이면 enrollment 는 여전히 필요하다
 *                (9차 P1-18 — "공개 + 승인 필요" 강의의 무승인 제출 방지).
 * MEMBERS 강의 → active lecture membership 필수 (WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 §7)
 *   그 위에 아래 정책 순서대로 적용:
 *   1. isPaid=true        → 승인된 Enrollment 필수 (결제 강의)
 *   2. requiresApproval=true → 승인된 Enrollment 필수 (강사 승인 강의)
 *   3. 그 외              → membership 만으로 통과 (무료·승인불필요 회원제)
 *
 * 종전 "MEMBERS = 로그인만" 판정은 Lecture membership boundary 결함이라 제거했다.
 */

import type { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../../database/connection.js';
import { Course, CourseStatus, CourseVisibility, Enrollment, EnrollmentStatus } from '@o4o/lms-core';
import { In } from 'typeorm';
// WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1
import {
  resolveLmsServiceScope,
  isCourseInServiceScope,
  InvalidLmsServiceKeyError,
  INVALID_SERVICE_KEY_CODE,
} from '../utils/lms-service-scope.js';
import {
  resolveLectureMembershipStatus,
  isPlatformSuperAdmin,
  hasLectureAdminRole,
  hasLectureInstructorRole,
  hasLectureOperatorRole,
} from './lecture-access.js';

/**
 * 9차 P2-10: "소유 강사 예외" 는 소유권만으로 성립하지 않는다.
 * 이 파일 머리말·lecture-access.ts 의 계약대로 **현재 role + active membership** 을 함께 요구한다 —
 * 강사 role 이 회수되었거나 membership 이 정지된 사용자는 자기 강의의 평가도 이 경로로 읽지 못한다.
 * `platform:super_admin` break-glass 만 예외.
 */
async function canReadOwnCourseAssessments(
  req: Request,
  userId: string,
  courseInstructorId: string | null | undefined,
): Promise<boolean> {
  if (isPlatformSuperAdmin(req)) return true;
  const isOwningInstructor = courseInstructorId === userId && hasLectureInstructorRole(req);
  if (!isOwningInstructor && !hasLectureAdminRole(req)) return false;
  return (await resolveLectureMembershipStatus(req)) === 'active';
}

/**
 * 13차 Codex P1: **미게시 강의는 학습자 경로에서 열리지 않는다.**
 * PUBLISHED 강의가 수정되면 CourseService 가 PENDING_REVIEW 로 되돌리는데, 이 미들웨어가
 * status 를 보지 않아 승인 대기 중인 본문을 계속 읽고 평가 attempt/submission 까지 저장됐다.
 * 예외는 `CourseController.canSeeUnpublished` 와 동일 판정 — 소유 강사 · lecture staff 이고
 * 둘 다 현재 role + active membership 을 요구한다. break-glass 만 무조건 통과.
 */
async function canSeeUnpublishedCourse(
  req: Request,
  userId: string,
  courseInstructorId: string | null | undefined,
): Promise<boolean> {
  if (isPlatformSuperAdmin(req)) return true;
  const isOwningInstructor =
    Boolean(courseInstructorId) && courseInstructorId === userId && hasLectureInstructorRole(req);
  const isLectureStaff = hasLectureOperatorRole(req) || hasLectureAdminRole(req);
  if (!isOwningInstructor && !isLectureStaff) return false;
  return (await resolveLectureMembershipStatus(req)) === 'active';
}

interface RequireEnrollmentOptions {
  /** lesson 라우트에서 lessonId → courseId 역추적 */
  checkLesson?: boolean;
  /**
   * 4차 P1-15: 평가 제출(quiz submit / assignment submit) 라우트에서
   * quizId · assignmentId → course 역추적. membership 만으로 유료·승인 강의의
   * attempt/submission 을 쓸 수 없게 동일한 enrollment 정책을 적용한다.
   */
  checkQuiz?: boolean;
  checkAssignment?: boolean;
  /**
   * 7차 P2-8: 강사 편집 화면이 쓰는 조회(평가 읽기)에서 소유 강사·lecture:admin 은
   * enrollment 없이 통과시킨다. 학습자 정책(visibility · membership · 유료/승인 enrollment)은 그대로.
   */
  allowCourseOwner?: boolean;
}

/** quiz → (lesson) → course. lessonId 가 없으면 quiz.courseId 를 쓴다. */
const QUIZ_COURSE_SQL = `
  SELECT COALESCE(l."courseId", q."courseId") AS course_id
    FROM lms_quizzes q
    LEFT JOIN lms_lessons l ON l.id = q."lessonId"
   WHERE q.id = $1
   LIMIT 1`;

/** assignment → lesson → course. */
const ASSIGNMENT_COURSE_SQL = `
  SELECT l."courseId" AS course_id
    FROM lms_assignments a
    JOIN lms_lessons l ON l.id = a."lessonId"
   WHERE a.id = $1
   LIMIT 1`;

export function requireEnrollment(options?: RequireEnrollmentOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // courseId 결정
    let courseId = req.params.courseId;

    // lesson 경로인 경우: lessonId → courseId 역추적
    const lessonParam = req.params.id ?? req.params.lessonId;
    if (!courseId && lessonParam && options?.checkLesson) {
      const lessonRepo = AppDataSource.getRepository('Lesson');
      const lesson = await lessonRepo.findOne({
        where: { id: lessonParam },
        select: ['id', 'courseId'],
      });
      if (!lesson) {
        return res.status(404).json({ success: false, error: 'Lesson not found' });
      }
      courseId = (lesson as any).courseId;
    }

    // 평가 제출 경로: quizId · assignmentId → courseId 역추적 (Raw SQL parameter binding — CLAUDE.md §7 Guard Rule 2)
    if (!courseId && (options?.checkQuiz || options?.checkAssignment)) {
      const isQuiz = Boolean(options?.checkQuiz);
      const id = isQuiz ? req.params.quizId : req.params.assignmentId;
      const notFound = isQuiz ? 'Quiz not found' : 'Assignment not found';
      if (!id) {
        return res.status(404).json({ success: false, error: notFound });
      }
      const rows: Array<{ course_id: string | null }> = await AppDataSource.query(
        isQuiz ? QUIZ_COURSE_SQL : ASSIGNMENT_COURSE_SQL,
        [id],
      );
      const resolved = rows?.[0]?.course_id;
      if (!resolved) {
        return res.status(404).json({ success: false, error: notFound });
      }
      courseId = resolved;
    }

    if (!courseId) {
      return next(); // courseId를 결정할 수 없으면 통과 (다른 미들웨어/컨트롤러가 처리)
    }

    // Course 조회 — visibility, isPaid, requiresApproval 모두 로드
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({
      where: { id: courseId },
      select: ['id', 'visibility', 'isPaid', 'requiresApproval', 'serviceKey', 'instructorId', 'status'],
    });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    // WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1 §3 / §5:
    // service boundary 는 enrollment 권한과 별개이며 항상 먼저 판정한다.
    // enrollment 가 있어도 타 서비스 course/lesson 에는 접근할 수 없다.
    let serviceScope: string | undefined;
    try {
      serviceScope = resolveLmsServiceScope(req);
    } catch (e) {
      if (e instanceof InvalidLmsServiceKeyError) {
        return res
          .status(400)
          .json({ success: false, error: '알 수 없는 serviceKey 입니다', code: INVALID_SERVICE_KEY_CODE });
      }
      throw e;
    }
    if (!isCourseInServiceScope(course.serviceKey, serviceScope)) {
      // non-disclosure — scope 밖 resource 는 존재를 드러내지 않는다
      const message = options?.checkLesson ? 'Lesson not found' : 'Course not found';
      return res.status(404).json({ success: false, error: message });
    }

    // 13차 Codex P1: scope 다음, 학습자 정책보다 먼저 — 게시 상태 판정.
    // 비노출은 403 이 아니라 404 (CourseController.getCourse 와 동일한 non-disclosure).
    if (
      (course as any).status !== CourseStatus.PUBLISHED &&
      !(await canSeeUnpublishedCourse(req, userId, (course as any).instructorId))
    ) {
      const message = options?.checkLesson
        ? 'Lesson not found'
        : options?.checkQuiz
          ? 'Quiz not found'
          : options?.checkAssignment
            ? 'Assignment not found'
            : 'Course not found';
      return res.status(404).json({ success: false, error: message });
    }

    // 7차 P2-8 + 9차 P2-10: scope 판정 이후에만 — 소유 강사(현재 role + active membership)·
    // lecture:admin 은 자기 강의의 평가를 수강 없이 읽는다.
    if (options?.allowCourseOwner && (await canReadOwnCourseAssessments(req, userId, (course as any).instructorId))) {
      return next();
    }

    // MEMBERS 강의: active lecture membership 이 선행 조건이다 (role 불요 · break-glass 만 예외).
    // PUBLIC 강의는 membership 을 요구하지 않는다 — 다만 아래 enrollment 판정은 건너뛰지 않는다.
    if (course.visibility !== CourseVisibility.PUBLIC && !isPlatformSuperAdmin(req)) {
      const membershipStatus = await resolveLectureMembershipStatus(req);
      if (membershipStatus === 'not_found') {
        return res.status(403).json({
          success: false,
          error: '회원 전용 강의입니다. O4O 강의 서비스 가입이 필요합니다.',
          code: 'MEMBERSHIP_NOT_FOUND',
        });
      }
      if (membershipStatus === 'inactive') {
        return res.status(403).json({
          success: false,
          error: '서비스 멤버십이 활성 상태가 아닙니다.',
          code: 'MEMBERSHIP_NOT_ACTIVE',
        });
      }
    }

    // 9차 P1-18: 유료·승인 강의의 enrollment 요구는 visibility 와 독립이다.
    // 종전에는 PUBLIC 이면 여기 오기 전에 통과시켜, "공개 + 승인 필요" 강의에서 승인 없이
    // quiz attempt / assignment submission 이 저장되고 합격 보상까지 나갈 수 있었다.
    const needsEnrollmentCheck = course.isPaid || course.requiresApproval;

    if (!needsEnrollmentCheck) {
      // 무료·승인불필요 강의 → (PUBLIC) 또는 (MEMBERS + membership) 만으로 통과
      return next();
    }

    // 유료 또는 강사 승인 필요 → 승인된 Enrollment 확인
    const enrollmentRepo = AppDataSource.getRepository(Enrollment);
    const enrollment = await enrollmentRepo.findOne({
      where: {
        userId,
        courseId,
        status: In([EnrollmentStatus.APPROVED, EnrollmentStatus.IN_PROGRESS, EnrollmentStatus.COMPLETED]),
      },
    });

    if (!enrollment) {
      const errorMessage = course.isPaid
        ? '유료 강의는 결제 후 수강할 수 있습니다'
        : '강사 승인 후 수강할 수 있습니다';
      const errorCode = course.isPaid ? 'ENROLLMENT_REQUIRED' : 'APPROVAL_REQUIRED';
      return res.status(403).json({ success: false, error: errorMessage, code: errorCode });
    }

    // enrollment 정보를 요청에 첨부
    (req as any).enrollment = enrollment;
    next();
  };
}
