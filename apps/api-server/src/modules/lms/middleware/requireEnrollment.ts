/**
 * requireEnrollment Middleware
 *
 * WO-LMS-PAID-COURSE-V1
 *
 * 유료 강의 접근 제어 미들웨어.
 * isPaid=false → 무조건 통과 (기존 동작 유지)
 * isPaid=true → 활성 Enrollment 필수
 */

import type { Request, Response, NextFunction } from 'express';
import { AppDataSource } from '../../../database/connection.js';
import { Course, Enrollment, EnrollmentStatus } from '@o4o/lms-core';
import { In } from 'typeorm';

interface RequireEnrollmentOptions {
  /** lesson 라우트에서 lessonId → courseId 역추적 */
  checkLesson?: boolean;
}

/**
 * requireEnrollment 미들웨어 팩토리
 *
 * - 무료 강의: 무조건 통과
 * - 유료 강의: IN_PROGRESS 또는 COMPLETED 상태의 Enrollment 필수
 */
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

    // Course 조회
    const courseRepo = AppDataSource.getRepository(Course);
    const course = await courseRepo.findOne({
      where: { id: courseId },
      select: ['id', 'isPaid'],
    });

    if (!course) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    // 무료 강의는 통과
    if (!course.isPaid) {
      return next();
    }

    // 유료 강의 → 활성 Enrollment 필수 (APPROVED도 허용 — WO-LMS-INSTRUCTOR-ROLE-V1)
    const enrollmentRepo = AppDataSource.getRepository(Enrollment);
    const enrollment = await enrollmentRepo.findOne({
      where: {
        userId,
        courseId,
        status: In([EnrollmentStatus.APPROVED, EnrollmentStatus.IN_PROGRESS, EnrollmentStatus.COMPLETED]),
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: '유료 강의는 결제 후 수강할 수 있습니다',
        code: 'ENROLLMENT_REQUIRED',
      });
    }

    // enrollment 정보를 요청에 첨부
    (req as any).enrollment = enrollment;
    next();
  };
}
