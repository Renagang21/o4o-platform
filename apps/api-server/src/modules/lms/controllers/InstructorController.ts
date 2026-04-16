import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AppDataSource } from '../../../database/connection.js';
import { InstructorApplication, Enrollment, EnrollmentStatus, Course } from '@o4o/lms-core';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import logger from '../../../utils/logger.js';

/**
 * InstructorController
 *
 * WO-LMS-INSTRUCTOR-ROLE-V1
 *
 * 강사 신청, 수강 승인/거절 등 강사 역할 관련 API
 */
export class InstructorController extends BaseController {
  // ========================================
  // 강사 신청
  // ========================================

  /**
   * POST /instructor/apply
   * 강사 신청 (일반 사용자)
   */
  static async apply(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return BaseController.unauthorized(res);
      }

      const repo = AppDataSource.getRepository(InstructorApplication);

      // 중복 신청 확인
      const existing = await repo.findOne({
        where: { userId, status: 'pending' },
      });
      if (existing) {
        return BaseController.badRequest(res, '이미 대기 중인 강사 신청이 있습니다');
      }

      // 이미 승인된 경우 확인
      const approved = await repo.findOne({
        where: { userId, status: 'approved' },
      });
      if (approved) {
        return BaseController.badRequest(res, '이미 강사로 승인되었습니다');
      }

      const application = repo.create({ userId, status: 'pending' });
      const saved = await repo.save(application);

      logger.info('[InstructorController] Instructor application created', {
        applicationId: saved.id,
        userId,
      });

      return BaseController.created(res, { application: saved });
    } catch (error: any) {
      logger.error('[InstructorController.apply] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ========================================
  // 강사 신청 관리 (관리자)
  // ========================================

  /**
   * GET /instructor/applications
   * 강사 신청 목록 (관리자)
   */
  static async listApplications(req: Request, res: Response): Promise<any> {
    try {
      const { status, page = '1', limit = '20' } = req.query;
      const repo = AppDataSource.getRepository(InstructorApplication);

      const query = repo.createQueryBuilder('app');

      if (status && typeof status === 'string') {
        query.andWhere('app.status = :status', { status });
      }

      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 20;

      query
        .leftJoinAndSelect('app.user', 'user')
        .orderBy('app.createdAt', 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const [applications, total] = await query.getManyAndCount();

      return BaseController.okPaginated(res, applications, {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error: any) {
      logger.error('[InstructorController.listApplications] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * POST /instructor/applications/:id/approve
   * 강사 신청 승인 (관리자)
   */
  static async approveApplication(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;
      const repo = AppDataSource.getRepository(InstructorApplication);

      const application = await repo.findOne({ where: { id } });
      if (!application) {
        return BaseController.notFound(res, '강사 신청을 찾을 수 없습니다');
      }

      if (application.status !== 'pending') {
        return BaseController.badRequest(res, `이미 처리된 신청입니다 (현재: ${application.status})`);
      }

      // 1. 신청 승인
      application.status = 'approved';
      application.reviewedBy = adminId;
      application.reviewedAt = new Date();
      await repo.save(application);

      // 2. lms:instructor 역할 부여
      await roleAssignmentService.assignRole({
        userId: application.userId,
        role: 'lms:instructor',
        assignedBy: adminId,
      });

      logger.info('[InstructorController] Application approved + role assigned', {
        applicationId: id,
        userId: application.userId,
        assignedBy: adminId,
      });

      return BaseController.ok(res, { application, message: '강사 신청이 승인되었습니다' });
    } catch (error: any) {
      logger.error('[InstructorController.approveApplication] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * POST /instructor/applications/:id/reject
   * 강사 신청 거절 (관리자)
   */
  static async rejectApplication(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;
      const { reason } = req.body;
      const repo = AppDataSource.getRepository(InstructorApplication);

      const application = await repo.findOne({ where: { id } });
      if (!application) {
        return BaseController.notFound(res, '강사 신청을 찾을 수 없습니다');
      }

      if (application.status !== 'pending') {
        return BaseController.badRequest(res, `이미 처리된 신청입니다 (현재: ${application.status})`);
      }

      application.status = 'rejected';
      application.reviewedBy = adminId;
      application.reviewedAt = new Date();
      application.rejectionReason = reason || null;
      await repo.save(application);

      logger.info('[InstructorController] Application rejected', {
        applicationId: id,
        userId: application.userId,
        rejectedBy: adminId,
      });

      return BaseController.ok(res, { application, message: '강사 신청이 거절되었습니다' });
    } catch (error: any) {
      logger.error('[InstructorController.rejectApplication] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ========================================
  // 강사 대시보드
  // ========================================

  /**
   * GET /instructor/courses
   * 내 강좌 목록 (강사)
   */
  static async myCourses(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      const { page = '1', limit = '20' } = req.query;

      const courseRepo = AppDataSource.getRepository(Course);
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 20;

      const [courses, total] = await courseRepo.findAndCount({
        where: { instructorId: userId },
        order: { createdAt: 'DESC' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      });

      return BaseController.okPaginated(res, courses, {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error: any) {
      logger.error('[InstructorController.myCourses] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * GET /instructor/enrollments
   * 내 강좌의 PENDING 수강 목록 (강사)
   */
  static async pendingEnrollments(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;
      const { courseId, page = '1', limit = '20' } = req.query;

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 20;

      const query = enrollmentRepo.createQueryBuilder('enrollment')
        .innerJoinAndSelect('enrollment.course', 'course')
        .leftJoinAndSelect('enrollment.user', 'user')
        .where('course.instructorId = :userId', { userId })
        .andWhere('enrollment.status = :status', { status: EnrollmentStatus.PENDING });

      if (courseId && typeof courseId === 'string') {
        query.andWhere('enrollment.courseId = :courseId', { courseId });
      }

      query
        .orderBy('enrollment.createdAt', 'DESC')
        .skip((pageNum - 1) * limitNum)
        .take(limitNum);

      const [enrollments, total] = await query.getManyAndCount();

      return BaseController.okPaginated(res, enrollments, {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      });
    } catch (error: any) {
      logger.error('[InstructorController.pendingEnrollments] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ========================================
  // 강사 운영 대시보드 (WO-O4O-LMS-INSTRUCTOR-DASHBOARD-MVP-V1)
  // ========================================

  /**
   * GET /instructor/dashboard/stats/:courseId
   * 강의별 운영 지표
   */
  static async dashboardStats(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const userId = (req as any).user?.id;

      // 강좌 소유권 확인
      const courseRepo = AppDataSource.getRepository(Course);
      const course = await courseRepo.findOne({ where: { id: courseId } });
      if (!course) return BaseController.notFound(res, 'Course not found');
      const isKpaAdmin = await roleAssignmentService.hasAnyRole(userId, ['kpa:admin']);
      if (course.instructorId !== userId && !isKpaAdmin) {
        return BaseController.forbidden(res, '본인 강의의 통계만 조회할 수 있습니다');
      }

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      // 수강자 수 (상태별)
      const statusCounts = await enrollmentRepo
        .createQueryBuilder('e')
        .select('e.status', 'status')
        .addSelect('COUNT(*)::int', 'cnt')
        .where('e.courseId = :courseId', { courseId })
        .groupBy('e.status')
        .getRawMany();

      const countMap: Record<string, number> = {};
      for (const row of statusCounts) countMap[row.status] = Number(row.cnt);

      const totalEnrollments = Object.values(countMap).reduce((a, b) => a + b, 0);
      const inProgressCount = countMap['in_progress'] || 0;
      const completedCount = countMap['completed'] || 0;
      const completionRate = totalEnrollments > 0
        ? Math.round((completedCount / totalEnrollments) * 1000) / 10
        : 0;

      // 평균 진도율
      const progressRow = await enrollmentRepo
        .createQueryBuilder('e')
        .select('COALESCE(AVG(e.progressPercentage), 0)::numeric(5,1)', 'avg')
        .where('e.courseId = :courseId AND e.status IN (:...statuses)', {
          courseId,
          statuses: ['in_progress', 'completed'],
        })
        .getRawOne();
      const averageProgress = parseFloat(progressRow?.avg ?? '0');

      // 퀴즈 통계 — Quiz.courseId 직접 참조
      const quizAttemptRepo = AppDataSource.getRepository('QuizAttempt');
      const quizStatsRow = await quizAttemptRepo
        .createQueryBuilder('qa')
        .innerJoin('Quiz', 'q', 'q.id = qa.quizId')
        .select('COUNT(*)::int', 'total')
        .addSelect('COUNT(CASE WHEN qa.passed = true THEN 1 END)::int', 'passed')
        .addSelect('COALESCE(AVG(qa.score), 0)::numeric(5,1)', 'avgScore')
        .where('q.courseId = :courseId', { courseId })
        .getRawOne();

      const quizTotal = Number(quizStatsRow?.total ?? 0);
      const quizPassed = Number(quizStatsRow?.passed ?? 0);
      const quizPassRate = quizTotal > 0
        ? Math.round((quizPassed / quizTotal) * 1000) / 10
        : 0;
      const averageQuizScore = parseFloat(quizStatsRow?.avgScore ?? '0');

      // 인증서 발행 수
      const certCount = await AppDataSource.getRepository('Certificate')
        .createQueryBuilder('c')
        .where('c.courseId = :courseId', { courseId })
        .getCount();

      return BaseController.ok(res, {
        courseId,
        totalEnrollments,
        inProgressCount,
        completedCount,
        completionRate,
        averageProgress,
        quizPassRate,
        averageQuizScore,
        certificateIssuedCount: certCount,
      });
    } catch (error: any) {
      logger.error('[InstructorController.dashboardStats] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * GET /instructor/dashboard/courses
   * 강사 강의 목록 + 요약 통계 (N+1 방지)
   */
  static async dashboardCourses(req: Request, res: Response): Promise<any> {
    try {
      const userId = (req as any).user?.id;

      // 강사 본인 강의 목록
      const courseRepo = AppDataSource.getRepository(Course);
      const courses = await courseRepo.find({
        where: { instructorId: userId },
        order: { createdAt: 'DESC' },
        select: ['id', 'title', 'status', 'createdAt'],
      });

      if (courses.length === 0) {
        return BaseController.ok(res, { courses: [] });
      }

      const courseIds = courses.map(c => c.id);

      // 한 번의 쿼리로 모든 강의의 집계 통계 조회 (N+1 방지)
      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const statsRows = await enrollmentRepo
        .createQueryBuilder('e')
        .select('e.courseId', 'courseId')
        .addSelect('COUNT(*)::int', 'total')
        .addSelect('COUNT(CASE WHEN e.status = :completed THEN 1 END)::int', 'completed')
        .addSelect('COALESCE(AVG(e.progressPercentage), 0)::numeric(5,1)', 'avgProgress')
        .where('e.courseId IN (:...courseIds)', { courseIds, completed: 'completed' })
        .groupBy('e.courseId')
        .getRawMany();

      const statsMap: Record<string, { total: number; completed: number; avgProgress: number }> = {};
      for (const row of statsRows) {
        statsMap[row.courseId] = {
          total: Number(row.total),
          completed: Number(row.completed),
          avgProgress: parseFloat(row.avgProgress),
        };
      }

      const result = courses.map(c => {
        const s = statsMap[c.id] || { total: 0, completed: 0, avgProgress: 0 };
        return {
          courseId: c.id,
          title: c.title,
          status: c.status,
          totalEnrollments: s.total,
          completionRate: s.total > 0
            ? Math.round((s.completed / s.total) * 1000) / 10
            : 0,
          averageProgress: s.avgProgress,
        };
      });

      return BaseController.ok(res, { courses: result });
    } catch (error: any) {
      logger.error('[InstructorController.dashboardCourses] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ========================================
  // 수강 승인/거절 (강사)
  // ========================================

  /**
   * POST /instructor/enrollments/:id/approve
   * 수강 승인 (강사 — 본인 강좌만)
   */
  static async approveEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const enrollment = await enrollmentRepo.findOne({
        where: { id },
        relations: ['course'],
      });

      if (!enrollment) {
        return BaseController.notFound(res, '수강 정보를 찾을 수 없습니다');
      }

      // 강좌 소유권 확인
      // WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: platform:* → kpa:admin
      if (enrollment.course.instructorId !== userId) {
        const isKpaAdmin = await roleAssignmentService.hasAnyRole(userId, [
          'kpa:admin',
        ]);
        if (!isKpaAdmin) {
          return BaseController.forbidden(res, '본인 강좌의 수강만 승인할 수 있습니다');
        }
      }

      if (enrollment.status !== EnrollmentStatus.PENDING) {
        return BaseController.badRequest(res, `대기 상태의 수강만 승인할 수 있습니다 (현재: ${enrollment.status})`);
      }

      enrollment.status = EnrollmentStatus.APPROVED;
      enrollment.startedAt = new Date();
      const updated = await enrollmentRepo.save(enrollment);

      logger.info('[InstructorController] Enrollment approved', {
        enrollmentId: id,
        courseId: enrollment.courseId,
        studentId: enrollment.userId,
        approvedBy: userId,
      });

      return BaseController.ok(res, { enrollment: updated, message: '수강이 승인되었습니다' });
    } catch (error: any) {
      logger.error('[InstructorController.approveEnrollment] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * POST /instructor/enrollments/:id/reject
   * 수강 거절 (강사 — 본인 강좌만)
   */
  static async rejectEnrollment(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const enrollment = await enrollmentRepo.findOne({
        where: { id },
        relations: ['course'],
      });

      if (!enrollment) {
        return BaseController.notFound(res, '수강 정보를 찾을 수 없습니다');
      }

      // 강좌 소유권 확인
      // WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: platform:* → kpa:admin
      if (enrollment.course.instructorId !== userId) {
        const isKpaAdmin = await roleAssignmentService.hasAnyRole(userId, [
          'kpa:admin',
        ]);
        if (!isKpaAdmin) {
          return BaseController.forbidden(res, '본인 강좌의 수강만 거절할 수 있습니다');
        }
      }

      if (enrollment.status !== EnrollmentStatus.PENDING) {
        return BaseController.badRequest(res, `대기 상태의 수강만 거절할 수 있습니다 (현재: ${enrollment.status})`);
      }

      enrollment.status = EnrollmentStatus.REJECTED;
      const updated = await enrollmentRepo.save(enrollment);

      logger.info('[InstructorController] Enrollment rejected', {
        enrollmentId: id,
        courseId: enrollment.courseId,
        studentId: enrollment.userId,
        rejectedBy: userId,
      });

      return BaseController.ok(res, { enrollment: updated, message: '수강이 거절되었습니다' });
    } catch (error: any) {
      logger.error('[InstructorController.rejectEnrollment] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
