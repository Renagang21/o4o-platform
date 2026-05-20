/**
 * requireEnrollment Middleware
 *
 * WO-O4O-LMS-VISIBILITY-ENROLLMENT-INTEGRATION-V1
 *
 * 강의 visibility + enrollment 통합 접근 제어 미들웨어.
 *
 * PUBLIC  강의 → enrollment 없이 통과
 * MEMBERS 강의 → 아래 정책 순서대로 적용:
 *   1. isPaid=true        → 승인된 Enrollment 필수 (결제 강의)
 *   2. requiresApproval=true → 승인된 Enrollment 필수 (강사 승인 강의)
 *   3. 그 외              → 로그인만으로 통과 (무료·승인불필요 회원제)
 */

import type { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../../database/connection.js';
import { Course, CourseVisibility, Enrollment, EnrollmentStatus } from '@o4o/lms-core';
import { In } from 'typeorm';

interface RequireEnrollmentOptions {
  /** lesson 라우트에서 lessonId → courseId 역추적 */
  checkLesson?: boolean;
}

export function requireEnrollment(options?: RequireEnrollmentOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // courseId 결정
    let courseId = req.params.courseId;

    // lesson 경로인 경우: lessonId → courseId 역추적
    if (!courseId && req.params.id && options?.checkLesson) {
      const lessonRepo = AppDataSource.getRepository('Lesson');
      const lesson = await lessonRepo.findOne({
        where: { id: req.params.id },
        select: ['id', 'courseId'],
      });
      if (!lesson) {
        return res.status(404).json({ success: false, error: 'Lesson not found' });
      }
      courseId = (lesson as any).courseId;
    }

    if (!courseId) {
      return next(); // courseId를 결정할 수 없으면 통과 (다른 미들웨어/컨트롤러가 처리)
    }

    // Course 조회 — visibility, isPaid, requiresApproval 모두 로드
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({
      where: { id: courseId },
      select: ['id', 'visibility', 'isPaid', 'requiresApproval'],
    });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    // PUBLIC 강의: enrollment 없이 통과
    if (course.visibility === CourseVisibility.PUBLIC) {
      return next();
    }

    // MEMBERS 강의: enrollment 체크가 필요한지 판단
    const needsEnrollmentCheck = course.isPaid || course.requiresApproval;

    if (!needsEnrollmentCheck) {
      // 무료·승인불필요 회원제 강의 → 로그인만으로 통과
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
