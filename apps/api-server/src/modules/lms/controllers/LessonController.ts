import { Request, Response } from 'express';
import { BaseController } from '../../../common/base.controller.js';
import { LessonService } from '../services/LessonService.js';
import { CourseService } from '../services/CourseService.js';
import logger from '../../../utils/logger.js';
// WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1
import {
  resolveLmsServiceScope,
  isCourseInServiceScope,
  InvalidLmsServiceKeyError,
  INVALID_SERVICE_KEY_CODE,
} from '../utils/lms-service-scope.js';
// WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1
import { guardLessonScope } from '../utils/lms-scope-guard.js';
import { rolesIncludeLectureAdmin, isLectureCourse } from '../middleware/lecture-access.js';

/**
 * LessonController
 * LMS Module - Lesson Management
 * Handles Lesson CRUD and reordering operations
 *
 * WO-KPA-A-LMS-COURSE-OWNERSHIP-GUARD-V1:
 * - All write operations verify parent course.instructorId === userId
 * - lecture:admin bypasses ownership check (WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2)
 * - PR #225 merge-gate: 대상 course 가 lecture 가 아니면(legacy KPA/PH) 소유자·lecture:admin 여부와 무관하게
 *   non-disclosure 404 — Lecture runtime 이 타 서비스 강의를 ID 로 변경할 수 없다.
 */
export class LessonController extends BaseController {
  private static async checkCourseOwnership(courseId: string, userId: string, userRoles: string[]): Promise<{ allowed: boolean; notFound: boolean }> {
    const courseService = CourseService.getInstance();
    const course = await courseService.getCourse(courseId);
    if (!course || !isLectureCourse(course.serviceKey)) return { allowed: false, notFound: true };
    if (rolesIncludeLectureAdmin(userRoles)) return { allowed: true, notFound: false };
    return { allowed: course.instructorId === userId, notFound: false };
  }

  /**
   * PR #225 merge-gate 11차 P2: 미발행(draft) lesson 은 learner 에게 보이지 않는다.
   *
   * learner 경로(`/courses/:courseId/lessons`, `/lessons/:id`)는 `requireEnrollment` 만 통과하면
   * `isPublished=false` 인 초안까지 그대로 돌려줬다. 강사 초안 접근은 별도 경로
   * (`/instructor/courses/:courseId/lessons`)가 담당하지만, 소유자 · lecture:admin 이
   * learner 경로로 들어온 경우까지 막지 않기 위해 여기서만 예외를 둔다.
   * 소유권은 role 을 대체하지 않으므로, scope(lecture) 판정은 호출부가 이미 끝낸 뒤에만 쓴다.
   */
  private static canSeeUnpublishedLessons(req: Request, course: { instructorId?: string | null } | null | undefined): boolean {
    const userId = (req as any).user?.id;
    const userRoles: string[] = (req as any).user?.roles || [];
    if (rolesIncludeLectureAdmin(userRoles)) return true;
    return Boolean(userId) && course?.instructorId === userId;
  }

  static async createLesson(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await LessonController.checkCourseOwnership(courseId, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Course not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only add lessons to your own courses');

      const data = { ...req.body, courseId };
      const service = LessonService.getInstance();
      const lesson = await service.createLesson(data);

      return BaseController.created(res, { lesson });
    } catch (error: any) {
      logger.error('[LessonController.createLesson] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getLesson(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;

      // WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1 §5:
      // lesson → course 역추적으로 service boundary 판정. lessonId 만 알아도
      // 타 서비스 lesson 을 열람할 수 없다.
      if (!(await guardLessonScope(req, res, id))) return;

      const service = LessonService.getInstance();

      const lesson = await service.getLesson(id);

      if (!lesson) {
        return BaseController.notFound(res, 'Lesson not found');
      }

      // 11차 P2: 미발행 lesson 은 소유자 · lecture:admin 이 아니면 존재를 알리지 않는다.
      if (lesson.isPublished === false) {
        const course = await CourseService.getInstance().getCourse(lesson.courseId);
        if (!LessonController.canSeeUnpublishedLessons(req, course)) {
          return BaseController.notFound(res, 'Lesson not found');
        }
      }

      return BaseController.ok(res, { lesson });
    } catch (error: any) {
      logger.error('[LessonController.getLesson] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listLessonsByCourse(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const filters = req.query;
      const service = LessonService.getInstance();

      // WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1: 강의와 동일한 service boundary.
      // scope 가 있는 요청에서만 course 를 조회한다 (무경계 요청은 추가 쿼리 0).
      let serviceScope: string | undefined;
      try {
        serviceScope = resolveLmsServiceScope(req);
      } catch (e) {
        if (e instanceof InvalidLmsServiceKeyError) {
          return BaseController.badRequest(res, '알 수 없는 serviceKey 입니다', INVALID_SERVICE_KEY_CODE);
        }
        throw e;
      }
      let course: Awaited<ReturnType<CourseService['getCourse']>> | null = null;
      if (serviceScope) {
        course = await CourseService.getInstance().getCourse(courseId);
        if (!course || !isCourseInServiceScope(course.serviceKey, serviceScope)) {
          return BaseController.notFound(res, 'Course not found');
        }
      }

      // 11차 P2: learner 목록에는 발행된 lesson 만. 소유자 · lecture:admin 만 초안을 본다
      // (요청의 isPublished 필터를 신뢰하지 않고 서버가 확정한다).
      const effectiveFilters: Record<string, any> = { ...(filters as any) };
      let canSeeDrafts = rolesIncludeLectureAdmin((req as any).user?.roles || []);
      if (!canSeeDrafts) {
        course = course ?? (await CourseService.getInstance().getCourse(courseId));
        canSeeDrafts = LessonController.canSeeUnpublishedLessons(req, course);
      }
      if (!canSeeDrafts) {
        effectiveFilters.isPublished = true;
      }

      const { lessons, total } = await service.listLessonsByCourse(courseId, effectiveFilters as any);

      return BaseController.okPaginated(res, lessons, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 100,
        totalPages: Math.ceil(total / (Number(filters.limit) || 100))
      });
    } catch (error: any) {
      logger.error('[LessonController.listLessonsByCourse] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateLesson(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];
      const service = LessonService.getInstance();

      // Load lesson to get courseId, then check course ownership
      const lesson = await service.getLesson(id);
      if (!lesson) return BaseController.notFound(res, 'Lesson not found');

      const ownership = await LessonController.checkCourseOwnership(lesson.courseId, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Lesson not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only modify lessons in your own courses');

      const updated = await service.updateLesson(id, data);

      return BaseController.ok(res, { lesson: updated });
    } catch (error: any) {
      logger.error('[LessonController.updateLesson] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async deleteLesson(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];
      const service = LessonService.getInstance();

      const lesson = await service.getLesson(id);
      if (!lesson) return BaseController.notFound(res, 'Lesson not found');

      const ownership = await LessonController.checkCourseOwnership(lesson.courseId, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Lesson not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only delete lessons in your own courses');

      await service.deleteLesson(id);

      return BaseController.ok(res, { message: 'Lesson deleted successfully' });
    } catch (error: any) {
      logger.error('[LessonController.deleteLesson] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async reorderLessons(req: Request, res: Response): Promise<any> {
    try {
      const { courseId } = req.params;
      const { lessonIds } = req.body;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];

      const ownership = await LessonController.checkCourseOwnership(courseId, userId, userRoles);
      if (ownership.notFound) return BaseController.notFound(res, 'Course not found');
      if (!ownership.allowed) return BaseController.forbidden(res, 'You can only reorder lessons in your own courses');

      const service = LessonService.getInstance();
      await service.reorderLessons(courseId, lessonIds);

      return BaseController.ok(res, { message: 'Lessons reordered successfully' });
    } catch (error: any) {
      logger.error('[LessonController.reorderLessons] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }
}
