import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { AppDataSource } from '../../../database/connection.js';
import { InstructorApplication, Enrollment, EnrollmentStatus, Course, ContentKind } from '@o4o/lms-core';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import logger from '../../../utils/logger.js';
// WO-O4O-LMS-ASSIGNMENT-GRADING-V1
import { AssignmentService } from '../services/AssignmentService.js';
import { LessonService } from '../services/LessonService.js';
import { CourseService } from '../services/CourseService.js';

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
      const { page = '1', limit = '20', contentKind } = req.query;

      const courseRepo = AppDataSource.getRepository(Course);
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 20;

      // WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1: 미전달 시 LECTURE만, 'all'이면 미적용
      const where: any = { instructorId: userId };
      if (contentKind === undefined) {
        where.contentKind = ContentKind.LECTURE;
      } else if (contentKind !== 'all') {
        where.contentKind = contentKind;
      }

      const [courses, total] = await courseRepo.findAndCount({
        where,
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
  // 콘텐츠별 참여자 관리 (WO-O4O-MARKETING-CONTENT-OPERATIONS-MVP-V1)
  // ========================================

  /**
   * GET /instructor/participants/:courseId
   * 콘텐츠별 참여자 목록 + 수료증/보상 지급 여부
   * 파라미터: status(all|in_progress|completed|cancelled), page, limit, sort
   */
  static async participants(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const userId = (req as any).user?.id;

      // 소유권 확인 (dashboardStats와 동일 패턴)
      const courseRepo = AppDataSource.getRepository(Course);
      const course = await courseRepo.findOne({ where: { id: courseId }, select: ['id', 'title', 'credits', 'instructorId'] });
      if (!course) return BaseController.notFound(res, 'Course not found');
      const isKpaAdmin = await roleAssignmentService.hasAnyRole(userId, ['kpa:admin']);
      if (course.instructorId !== userId && !isKpaAdmin) {
        return BaseController.forbidden(res, '본인 콘텐츠의 참여자만 조회할 수 있습니다');
      }

      const { status, credited, query: nameSearch, page = '1', limit = '20', sort = 'enrolledAt_desc' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const query = enrollmentRepo
        .createQueryBuilder('e')
        .where('e.courseId = :courseId', { courseId })
        .leftJoinAndSelect('e.user', 'user');

      // 상태 필터
      if (status && status !== 'all') {
        const statusMap: Record<string, string> = {
          in_progress: 'in_progress',
          completed: 'completed',
          cancelled: 'cancelled',
          pending: 'pending',
          approved: 'approved',
          rejected: 'rejected',
          expired: 'expired',
        };
        const mapped = statusMap[status];
        if (mapped) query.andWhere('e.status = :status', { status: mapped });
      }

      // 보상 지급 필터 (WO-O4O-MARKETING-CONTENT-OPERATIONS-ENHANCEMENT-V2)
      if (credited === 'false') {
        if (!status || status === 'all') {
          query.andWhere('e.status = :completedStatus', { completedStatus: 'completed' });
        }
        query.andWhere(
          `NOT EXISTS (SELECT 1 FROM credit_transactions ct2 WHERE ct2.source_type = 'course_complete' AND ct2.source_id = :courseId AND ct2.user_id = e.user_id)`
        );
      } else if (credited === 'true') {
        query.andWhere(
          `EXISTS (SELECT 1 FROM credit_transactions ct2 WHERE ct2.source_type = 'course_complete' AND ct2.source_id = :courseId AND ct2.user_id = e.user_id)`
        );
      }

      // 이름 검색 (ILIKE)
      if (nameSearch && nameSearch.trim()) {
        query.andWhere('user.name ILIKE :nameSearch', { nameSearch: `%${nameSearch.trim()}%` });
      }

      // 정렬
      const sortMap: Record<string, [string, 'ASC' | 'DESC']> = {
        enrolledAt_desc: ['e.enrolledAt', 'DESC'],
        enrolledAt_asc:  ['e.enrolledAt', 'ASC'],
        completedAt_desc: ['e.completedAt', 'DESC'],
        completedAt_asc:  ['e.completedAt', 'ASC'],
      };
      const [sortCol, sortDir] = sortMap[sort] ?? ['e.enrolledAt', 'DESC'];
      query.orderBy(sortCol, sortDir).addOrderBy('e.createdAt', 'DESC');

      query.skip((pageNum - 1) * limitNum).take(limitNum);

      const [enrollments, total] = await query.getManyAndCount();

      // 요약 통계 (전체 — 필터 무관)
      const summaryRows = await enrollmentRepo
        .createQueryBuilder('e')
        .select('e.status', 'status')
        .addSelect('COUNT(*)::int', 'cnt')
        .where('e.courseId = :courseId', { courseId })
        .groupBy('e.status')
        .getRawMany();

      const summaryMap: Record<string, number> = {};
      for (const row of summaryRows) summaryMap[row.status] = Number(row.cnt);
      const totalAll = Object.values(summaryMap).reduce((a, b) => a + b, 0);

      // credit_transactions — 이 페이지 userIds 기준으로 한 번만 조회 (N+1 방지)
      // amount + createdAt도 함께 조회 (WO-O4O-MARKETING-CONTENT-REWARD-DETAIL-MVP-V1)
      const userIds = enrollments.map(e => e.userId).filter(Boolean);
      let creditMap = new Map<string, { amount: number; creditedAt: string }>();
      if (userIds.length > 0) {
        const creditRows = await AppDataSource
          .getRepository('CreditTransaction')
          .createQueryBuilder('ct')
          .select('ct.userId', 'userId')
          .addSelect('ct.amount', 'amount')
          .addSelect('ct.createdAt', 'creditedAt')
          .where('ct.sourceType = :type', { type: 'course_complete' })
          .andWhere('ct.sourceId = :courseId', { courseId })
          .andWhere('ct.userId IN (:...userIds)', { userIds })
          .getRawMany();
        creditMap = new Map(
          creditRows.map((r: any) => [r.userId, { amount: Number(r.amount), creditedAt: r.creditedAt }])
        );
      }

      const items = enrollments.map(e => {
        const creditInfo = creditMap.get(e.userId);
        return {
          enrollmentId: e.id,
          userId: e.userId,
          userName: (e.user as any)?.name || '(이름 없음)',
          enrolledAt: e.enrolledAt ?? e.createdAt,
          status: e.status,
          progressPercentage: e.progressPercentage ?? 0,
          completedAt: e.completedAt ?? null,
          certificateIssued: !!e.certificateId,
          credited: !!creditInfo,
          creditAmount: creditInfo?.amount ?? null,
          creditedAt: creditInfo?.creditedAt ?? null,
        };
      });

      return BaseController.ok(res, {
        course: { id: course.id, title: course.title },
        summary: {
          total: totalAll,
          inProgress: summaryMap['in_progress'] ?? 0,
          completed: summaryMap['completed'] ?? 0,
          cancelled: summaryMap['cancelled'] ?? 0,
        },
        items,
        pagination: { page: pageNum, limit: limitNum, total },
      });
    } catch (error: any) {
      logger.error('[InstructorController.participants] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ========================================
  // 보상 운영 요약 통계 (WO-O4O-MARKETING-CONTENT-OPERATIONS-ENHANCEMENT-V2)
  // ========================================

  /**
   * GET /instructor/participants/:courseId/summary
   * 보상 운영 요약 통계 (강의 전체 기준 aggregate)
   */
  static async participantsSummary(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const userId = (req as any).user?.id;

      const courseRepo = AppDataSource.getRepository(Course);
      const course = await courseRepo.findOne({ where: { id: courseId }, select: ['id', 'title', 'instructorId'] });
      if (!course) return BaseController.notFound(res, 'Course not found');
      const isKpaAdmin = await roleAssignmentService.hasAnyRole(userId, ['kpa:admin']);
      if (course.instructorId !== userId && !isKpaAdmin) {
        return BaseController.forbidden(res, '본인 콘텐츠의 통계만 조회할 수 있습니다');
      }

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);

      // 상태별 카운트
      const statusRows = await enrollmentRepo
        .createQueryBuilder('e')
        .select('e.status', 'status')
        .addSelect('COUNT(*)::int', 'cnt')
        .where('e.courseId = :courseId', { courseId })
        .groupBy('e.status')
        .getRawMany();

      const statusMap: Record<string, number> = {};
      for (const row of statusRows) statusMap[row.status] = Number(row.cnt);
      const totalAll = Object.values(statusMap).reduce((a, b) => a + b, 0);

      // 보상 지급 통계 (COUNT + SUM)
      const creditStats = await AppDataSource
        .getRepository('CreditTransaction')
        .createQueryBuilder('ct')
        .select('COUNT(*)::int', 'creditedCount')
        .addSelect('COALESCE(SUM(ct.amount), 0)::int', 'totalCredits')
        .where('ct.sourceType = :type', { type: 'course_complete' })
        .andWhere('ct.sourceId = :courseId', { courseId })
        .getRawOne();

      // 완료(미지급) 카운트 — NOT EXISTS 서브쿼리
      const uncreditedRow = await enrollmentRepo
        .createQueryBuilder('e')
        .select('COUNT(*)::int', 'cnt')
        .where('e.courseId = :courseId', { courseId })
        .andWhere('e.status = :status', { status: 'completed' })
        .andWhere(
          `NOT EXISTS (SELECT 1 FROM credit_transactions ct2 WHERE ct2.source_type = 'course_complete' AND ct2.source_id = :courseId AND ct2.user_id = e.user_id)`
        )
        .getRawOne();

      return BaseController.ok(res, {
        total: totalAll,
        inProgress: statusMap['in_progress'] ?? 0,
        completed: statusMap['completed'] ?? 0,
        cancelled: statusMap['cancelled'] ?? 0,
        creditedCount: Number(creditStats?.creditedCount ?? 0),
        uncreditedCompletedCount: Number(uncreditedRow?.cnt ?? 0),
        totalCredits: Number(creditStats?.totalCredits ?? 0),
      });
    } catch (error: any) {
      logger.error('[InstructorController.participantsSummary] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  // ========================================
  // CSV 내보내기 (WO-O4O-MARKETING-CONTENT-OPERATIONS-ENHANCEMENT-V2)
  // ========================================

  /**
   * GET /instructor/participants/:courseId/export
   * 참여자 CSV 내보내기 (필터 반영 전체 다운로드)
   */
  static async participantsExport(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const userId = (req as any).user?.id;

      const courseRepo = AppDataSource.getRepository(Course);
      const course = await courseRepo.findOne({ where: { id: courseId }, select: ['id', 'title', 'instructorId'] });
      if (!course) return BaseController.notFound(res, 'Course not found');
      const isKpaAdmin = await roleAssignmentService.hasAnyRole(userId, ['kpa:admin']);
      if (course.instructorId !== userId && !isKpaAdmin) {
        return BaseController.forbidden(res, '본인 콘텐츠만 내보낼 수 있습니다');
      }

      const { status, credited, query: nameSearch } = req.query as Record<string, string>;

      const enrollmentRepo = AppDataSource.getRepository(Enrollment);
      const exportQuery = enrollmentRepo
        .createQueryBuilder('e')
        .where('e.courseId = :courseId', { courseId })
        .leftJoinAndSelect('e.user', 'user');

      if (status && status !== 'all') {
        const statusMap: Record<string, string> = {
          in_progress: 'in_progress', completed: 'completed', cancelled: 'cancelled',
          pending: 'pending', approved: 'approved', rejected: 'rejected', expired: 'expired',
        };
        const mapped = statusMap[status];
        if (mapped) exportQuery.andWhere('e.status = :status', { status: mapped });
      }

      if (credited === 'false') {
        if (!status || status === 'all') {
          exportQuery.andWhere('e.status = :completedStatus', { completedStatus: 'completed' });
        }
        exportQuery.andWhere(
          `NOT EXISTS (SELECT 1 FROM credit_transactions ct2 WHERE ct2.source_type = 'course_complete' AND ct2.source_id = :courseId AND ct2.user_id = e.user_id)`
        );
      } else if (credited === 'true') {
        exportQuery.andWhere(
          `EXISTS (SELECT 1 FROM credit_transactions ct2 WHERE ct2.source_type = 'course_complete' AND ct2.source_id = :courseId AND ct2.user_id = e.user_id)`
        );
      }

      if (nameSearch && nameSearch.trim()) {
        exportQuery.andWhere('user.name ILIKE :nameSearch', { nameSearch: `%${nameSearch.trim()}%` });
      }

      exportQuery.orderBy('e.enrolledAt', 'DESC');
      const enrollments = await exportQuery.getMany();

      // credit_transactions — 전체 userIds 기준 한 번 조회
      const allUserIds = enrollments.map(e => e.userId).filter(Boolean);
      let creditMap = new Map<string, { amount: number; creditedAt: string }>();
      if (allUserIds.length > 0) {
        const creditRows = await AppDataSource
          .getRepository('CreditTransaction')
          .createQueryBuilder('ct')
          .select('ct.userId', 'userId')
          .addSelect('ct.amount', 'amount')
          .addSelect('ct.createdAt', 'creditedAt')
          .where('ct.sourceType = :type', { type: 'course_complete' })
          .andWhere('ct.sourceId = :courseId', { courseId })
          .andWhere('ct.userId IN (:...allUserIds)', { allUserIds })
          .getRawMany();
        creditMap = new Map(
          creditRows.map((r: any) => [r.userId, { amount: Number(r.amount), creditedAt: r.creditedAt }])
        );
      }

      // CSV 생성 (UTF-8 BOM)
      const fmtDate = (d: Date | string | null) => {
        if (!d) return '';
        const dt = new Date(d as string);
        return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, '0')}.${String(dt.getDate()).padStart(2, '0')}`;
      };
      const esc = (v: string) =>
        v.includes(',') || v.includes('"') || v.includes('\n')
          ? `"${v.replace(/"/g, '""')}"`
          : v;

      const statusLabel: Record<string, string> = {
        in_progress: '진행중', completed: '완료', cancelled: '취소',
        pending: '대기', approved: '승인', rejected: '거절', expired: '만료',
      };

      const headers = ['이름', '참여일', '상태', '진도율(%)', '완료일', '수료증', '보상지급', '보상금액(Credit)', '보상지급일'];
      const rows = enrollments.map(e => {
        const creditInfo = creditMap.get(e.userId);
        return [
          (e.user as any)?.name || '',
          fmtDate(e.enrolledAt ?? e.createdAt),
          statusLabel[e.status] ?? e.status,
          String(e.progressPercentage ?? 0),
          fmtDate(e.completedAt),
          e.certificateId ? 'Y' : 'N',
          creditInfo ? 'Y' : 'N',
          creditInfo ? String(creditInfo.amount) : '',
          creditInfo ? fmtDate(creditInfo.creditedAt) : '',
        ].map(esc).join(',');
      });

      const BOM = '\uFEFF';
      const csv = BOM + [headers.map(esc).join(','), ...rows].join('\r\n');

      const safeTitle = course.title.replace(/[^\w가-힣]/g, '_').slice(0, 30);
      const filename = `participants_${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      return res.send(csv);
    } catch (error: any) {
      logger.error('[InstructorController.participantsExport] Error', { error: error.message });
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

  // ========================================
  // WO-O4O-LMS-ASSIGNMENT-GRADING-V1: 과제 채점
  // ========================================

  /**
   * 강사 강의 ownership 체크 (kpa:admin 우회 허용).
   */
  private static async checkLessonOwnership(
    lessonId: string,
    userId: string,
  ): Promise<{ allowed: boolean; notFound: boolean; courseId?: string }> {
    const lesson = await LessonService.getInstance().getLesson(lessonId);
    if (!lesson) return { allowed: false, notFound: true };

    const isKpaAdmin = await roleAssignmentService.hasAnyRole(userId, ['kpa:admin']);
    if (isKpaAdmin) return { allowed: true, notFound: false, courseId: lesson.courseId };

    const course = await CourseService.getInstance().getCourse(lesson.courseId);
    if (!course) return { allowed: false, notFound: true };

    return {
      allowed: course.instructorId === userId,
      notFound: false,
      courseId: lesson.courseId,
    };
  }

  /**
   * GET /api/v1/lms/instructor/lessons/:lessonId/submissions
   * 특정 lesson의 모든 submission 조회 (강사 ownership 체크).
   */
  static async listLessonSubmissions(req: Request, res: Response): Promise<any> {
    try {
      const { lessonId } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) return BaseController.unauthorized(res, 'User not authenticated');

      const own = await InstructorController.checkLessonOwnership(lessonId, userId);
      if (own.notFound) return BaseController.notFound(res, 'Lesson not found');
      if (!own.allowed) {
        return BaseController.forbidden(res, '본인 강의의 제출물만 조회할 수 있습니다.');
      }

      const rows = await AssignmentService.getInstance().listSubmissionsForLesson(lessonId);
      const items = rows.map(({ submission, userName }) => ({
        id: submission.id,
        userId: submission.userId,
        userName: userName ?? '(이름 없음)',
        content: submission.content ?? null,
        submittedAt: submission.submittedAt,
        status: submission.status,
        gradingStatus: submission.gradingStatus,
        score: submission.score ?? null,
        feedback: submission.feedback ?? null,
        gradedAt: submission.gradedAt ?? null,
        gradedBy: submission.gradedBy ?? null,
      }));

      return BaseController.ok(res, {
        lessonId,
        courseId: own.courseId,
        items,
      });
    } catch (error: any) {
      logger.error('[InstructorController.listLessonSubmissions] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  /**
   * POST /api/v1/lms/instructor/submissions/:submissionId/grade
   * 강사 채점.
   * Body: { gradingStatus: 'graded' | 'returned', score?, feedback? }
   *
   * 정책 (WO-O4O-LMS-ASSIGNMENT-GRADING-V1):
   *   - 본인 강의의 submission만 채점 가능 (kpa:admin 우회 허용)
   *   - 기존 lesson 진도/Credit/수료/인증서 흐름은 변경하지 않음
   */
  static async gradeSubmission(req: Request, res: Response): Promise<any> {
    try {
      const { submissionId } = req.params;
      const userId = (req as any).user?.id;
      if (!userId) return BaseController.unauthorized(res, 'User not authenticated');

      const { gradingStatus, score, feedback } = req.body || {};

      // Submission → lesson → course ownership 체크
      const submissionRepo = AppDataSource.getRepository('Submission');
      const submission: any = await submissionRepo.findOne({ where: { id: submissionId } });
      if (!submission) return BaseController.notFound(res, 'Submission not found');

      const own = await InstructorController.checkLessonOwnership(submission.lessonId, userId);
      if (own.notFound) return BaseController.notFound(res, 'Lesson not found');
      if (!own.allowed) {
        return BaseController.forbidden(res, '본인 강의의 제출물만 채점할 수 있습니다.');
      }

      try {
        const updated = await AssignmentService.getInstance().gradeSubmission(submissionId, userId, {
          gradingStatus,
          score: typeof score === 'number' ? score : null,
          feedback: typeof feedback === 'string' ? feedback : null,
        });
        return BaseController.ok(res, { submission: updated });
      } catch (err: any) {
        if (err?.code === 'INVALID_SCORE') {
          return BaseController.error(res, err.message, 400, 'INVALID_SCORE');
        }
        if (err?.code === 'FEEDBACK_REQUIRED') {
          return BaseController.error(res, err.message, 400, 'FEEDBACK_REQUIRED');
        }
        if (err?.code === 'INVALID_GRADING_STATUS') {
          return BaseController.error(res, err.message, 400, 'INVALID_GRADING_STATUS');
        }
        throw err;
      }
    } catch (error: any) {
      logger.error('[InstructorController.gradeSubmission] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
