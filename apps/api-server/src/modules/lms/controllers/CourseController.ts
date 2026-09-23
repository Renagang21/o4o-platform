import { Request, Response } from 'express';
import { CourseStatus, CourseVisibility } from '@o4o/lms-core';
import { BaseController } from '../../../common/base.controller.js';
import { CourseService } from '../services/CourseService.js';
import logger from '../../../utils/logger.js';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';
import {
  hasLectureAdminRole,
  hasLectureOperatorRole,
  isActiveLectureLearner,
  isLectureCourse,
  isPlatformSuperAdmin,
  resolveLectureMembershipStatus,
} from '../middleware/lecture-access.js';
// WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1
import {
  resolveLmsServiceScope,
  isCourseInServiceScope,
  InvalidLmsServiceKeyError,
  INVALID_SERVICE_KEY_CODE,
} from '../utils/lms-service-scope.js';

/**
 * CourseController
 * LMS Module - Course Management
 * Handles Course CRUD and publishing operations
 *
 * WO-KPA-A-LMS-COURSE-OWNERSHIP-GUARD-V1:
 * - All write operations verify course.instructorId === userId
 * WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 Phase 2:
 * - 소유자 override 는 `lecture:admin` (break-glass 포함) 만. `kpa:admin` bypass 제거.
 * - 생성 강의의 serviceKey 는 서버가 `lecture` 로 강제한다 (클라이언트 값 · membership 추론 금지).
 * PR #225 merge-gate (Codex P1):
 * - members 강의는 active lecture membership 이 있어야 목록·상세에 노출된다 (로그인만으로는 불가).
 * - 모든 write 대상은 `course.serviceKey === 'lecture'` 만 — legacy 강의는 non-disclosure 404
 *   (operator routes 의 approve/reject/archive 와 동일 규칙, `isLectureCourse`).
 * - serviceKey 는 PATCH 로 바꿀 수 없다 (CourseService.updateCourse allowlist).
 * 7차 재검토(Codex):
 * - P1-17 학습자 목록·상세는 PUBLISHED 만 — 운영자 승인 전 초안은 비노출(404). 전체 상태가 필요한
 *   운영 목록은 `/operator/courses`(requireLectureOperator) 가 따로 있다.
 * - P2-7 생성 시 instructorId 는 serviceKey 와 같이 서버가 요청자로 고정한다(타인 명의 초안 금지).
 * 8차 재검토(Codex):
 * - P2-9 게시 전 강의 예외는 role·소유권만으로 주지 않는다 — 현재 active Lecture membership 을
 *   함께 요구한다(정지·해지된 강사, stale operator/admin role 은 통과하지 못한다).
 */
export class CourseController extends BaseController {
  private static isOwnerOrAdmin(req: Request, userId: string, courseInstructorId: string): boolean {
    if (hasLectureAdminRole(req)) return true;
    return courseInstructorId === userId;
  }

  /**
   * 7차 P1-17: 학습자 경로에서 게시 전 강의를 볼 수 있는 주체 — 소유 강사와 Lecture 운영자(admin 포함).
   * 그 외에는 상태를 드러내지 않고 404 로 답한다.
   * 8차 P2-9: role·소유권은 필요조건일 뿐이다. 초안은 visibility 기본값이 public 이라 뒤의
   * members 판정이 돌지 않으므로, 여기서 active Lecture membership 을 직접 확인한다 —
   * membership 이 정지·해지된 강사나 stale role 토큰은 자기 초안이라도 열지 못한다.
   * (`platform:super_admin` break-glass 만 예외.)
   */
  private static async canSeeUnpublished(req: Request, courseInstructorId: string): Promise<boolean> {
    const userId = (req as any).user?.id;
    if (!userId) return false;
    if (isPlatformSuperAdmin(req)) return true;
    const isOwner = courseInstructorId === userId;
    const isLectureStaff = hasLectureOperatorRole(req) || hasLectureAdminRole(req);
    if (!isOwner && !isLectureStaff) return false;
    return (await resolveLectureMembershipStatus(req)) === 'active';
  }

  /** write 대상 강의를 로드한다. 없거나 Lecture 소유가 아니면 404 를 보내고 null 을 돌려준다. */
  private static async loadLectureCourseOr404(res: Response, id: string) {
    const course = await CourseService.getInstance().getCourse(id);
    if (!course || !isLectureCourse(course.serviceKey)) {
      BaseController.notFound(res, 'Course not found');
      return null;
    }
    return course;
  }

  static async createCourse(req: Request, res: Response): Promise<any> {
    try {
      const data = req.body;
      const userId = (req as any).user?.id;

      // 강의 생성 자격은 라우트 guard(active lecture membership + lecture:instructor)가
      // 이미 판정했다. 유료 여부에 따른 별도 role 판정(legacy lms:instructor/kpa:admin)은 제거.

      // 7차 P2-7: instructorId 는 클라이언트 값을 신뢰하지 않는다 — serviceKey 와 동일하게 서버가
      // 요청자로 고정한다 (Lecture 강사가 타인 명의의 강의 초안을 만들 수 없다).
      data.instructorId = userId;

      // WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1 §8:
      //   Lecture 가 LMS runtime 의 유일한 Application Service 다. 생성 강의의 서비스 귀속은
      //   클라이언트 serviceKey 나 생성자의 "첫 active membership" 추론이 아니라 서버가 고정한다.
      data.serviceKey = SERVICE_KEYS.LECTURE;

      const service = CourseService.getInstance();
      const course = await service.createCourse(data);

      return BaseController.created(res, { course });
    } catch (error: any) {
      logger.error('[CourseController.createCourse] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async getCourse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CourseService.getInstance();

      // WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1: 목록과 동일한 경계를 상세에도 적용.
      // 무경계 요청(legacy/admin)은 현행대로 통과한다.
      let serviceScope: string | undefined;
      try {
        serviceScope = resolveLmsServiceScope(req);
      } catch (e) {
        if (e instanceof InvalidLmsServiceKeyError) {
          return BaseController.badRequest(res, '알 수 없는 serviceKey 입니다', INVALID_SERVICE_KEY_CODE);
        }
        throw e;
      }

      const course = await service.getCourse(id);

      if (!course) {
        return BaseController.notFound(res, 'Course not found');
      }

      // 다른 서비스의 강의는 존재 자체를 노출하지 않는다 (403 아닌 404).
      if (!isCourseInServiceScope(course.serviceKey, serviceScope)) {
        return BaseController.notFound(res, 'Course not found');
      }

      // 7차 P1-17: 학습자 상세는 게시된 강의만. 소유 강사·운영자만 게시 전 상태를 열람한다.
      // (비노출은 403 이 아니라 404 — 존재 자체를 드러내지 않는다.)
      if (
        course.status !== CourseStatus.PUBLISHED &&
        !(await CourseController.canSeeUnpublished(req, course.instructorId))
      ) {
        return BaseController.notFound(res, 'Course not found');
      }

      // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-POLICY-V1
      // 비로그인 사용자는 'public' 강의만 조회 가능. 'members'는 401(MEMBERS_ONLY).
      // PR #225 merge-gate(Codex P1): 로그인만으로는 members 강의를 열지 않는다 —
      // active lecture membership 이 없으면 403 (제목·설명 등 본문 비노출).
      if (course.visibility !== CourseVisibility.PUBLIC) {
        const isAuthenticated = !!(req as any).user;
        if (!isAuthenticated) {
          return BaseController.unauthorized(res, '회원 전용 강의입니다. 로그인이 필요합니다.', 'MEMBERS_ONLY');
        }
        if (!(await isActiveLectureLearner(req))) {
          return BaseController.forbidden(res, '회원 전용 강의입니다. O4O 강의 회원 가입이 필요합니다.', 'LECTURE_MEMBERSHIP_REQUIRED');
        }
      }

      return BaseController.ok(res, { course });
    } catch (error: any) {
      logger.error('[CourseController.getCourse] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async listCourses(req: Request, res: Response): Promise<any> {
    try {
      const filters: any = { ...req.query };
      const service = CourseService.getInstance();

      // WO-O4O-LMS-PUBLIC-COURSE-LIST-SERVICE-SCOPE-V1: service boundary.
      // 클라이언트가 보낸 raw serviceKey 를 그대로 쓰지 않고, 검증된 canonical 값으로 덮어쓴다.
      try {
        filters.serviceKey = resolveLmsServiceScope(req);
      } catch (e) {
        if (e instanceof InvalidLmsServiceKeyError) {
          return BaseController.badRequest(res, '알 수 없는 serviceKey 입니다', INVALID_SERVICE_KEY_CODE);
        }
        throw e;
      }

      // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-POLICY-V1
      // 비로그인은 visibility='public' 강제. 클라이언트가 다른 값을 보내도 덮어씀.
      // PR #225 merge-gate(Codex P1): 로그인했어도 active lecture membership 이 없으면 동일하게
      // public 만 — members 강의는 목록에서도 제외한다.
      if (!(await isActiveLectureLearner(req))) {
        filters.visibility = CourseVisibility.PUBLIC;
      }

      // 7차 P1-17: 학습자 목록은 클라이언트 status 를 쓰지 않는다 — 서버가 PUBLISHED 로 고정한다.
      // 전체 상태가 필요한 운영 목록은 같은 handler 를 쓰는 `/operator/courses` 뿐이며,
      // 그 라우트는 requireLectureOperator 가 이미 판정했다(경로 + role 둘 다 확인).
      const isOperatorListing = req.path.startsWith('/operator/') && hasLectureOperatorRole(req);
      if (!isOperatorListing) {
        filters.status = CourseStatus.PUBLISHED;
      }

      const { courses, total } = await service.listCourses(filters);

      return BaseController.okPaginated(res, courses, {
        total,
        page: Number(filters.page) || 1,
        limit: Number(filters.limit) || 20,
        totalPages: Math.ceil(total / (Number(filters.limit) || 20))
      });
    } catch (error: any) {
      // Graceful fallback: return empty data if table or column doesn't exist
      if (error.message?.includes('does not exist') && (error.message?.includes('relation') || error.message?.includes('column'))) {
        logger.warn('[CourseController.listCourses] LMS schema issue - returning empty courses', { detail: error.message });
        return BaseController.okPaginated(res, [], {
          total: 0,
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          totalPages: 0
        });
      }
      logger.error('[CourseController.listCourses] Error', { error: error.message });
      return BaseController.error(res, error);
    }
  }

  static async updateCourse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const data = req.body;
      const userId = (req as any).user?.id;
      const service = CourseService.getInstance();

      const course = await CourseController.loadLectureCourseOr404(res, id);
      if (!course) return;
      if (!CourseController.isOwnerOrAdmin(req, userId, course.instructorId)) {
        return BaseController.forbidden(res, 'You can only modify your own courses');
      }

      const updated = await service.updateCourse(id, data);

      return BaseController.ok(res, { course: updated });
    } catch (error: any) {
      logger.error('[CourseController.updateCourse] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async deleteCourse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const service = CourseService.getInstance();

      const course = await CourseController.loadLectureCourseOr404(res, id);
      if (!course) return;
      if (!CourseController.isOwnerOrAdmin(req, userId, course.instructorId)) {
        return BaseController.forbidden(res, 'You can only delete your own courses');
      }

      await service.deleteCourse(id);

      return BaseController.ok(res, { message: 'Course archived successfully' });
    } catch (error: any) {
      logger.error('[CourseController.deleteCourse] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  /**
   * WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1
   * 직접 publish 는 Lecture 운영자(`lecture:operator` ⊂ `lecture:admin`) override 경로.
   * 일반 강사는 submit-review 를 사용해야 함 → 403.
   * PR #225 merge-gate(Codex P1): 호출자 role 만이 아니라 대상 강의도 검사한다 —
   * `course.serviceKey !== 'lecture'`(legacy KPA/PH/null) 는 approve/reject/archive 와 같이 404.
   */
  static async publishCourse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const service = CourseService.getInstance();

      const course = await CourseController.loadLectureCourseOr404(res, id);
      if (!course) return;

      // 강사는 직접 publish 금지 — submit-review 사용
      if (!hasLectureOperatorRole(req)) {
        return BaseController.forbidden(
          res,
          '강의 공개는 운영자 승인을 거쳐야 합니다. 승인 요청을 사용해주세요.',
          'PUBLISH_REQUIRES_APPROVAL',
        );
      }

      const updated = await service.publishCourse(id);

      return BaseController.ok(res, { course: updated, message: 'Course published successfully' });
    } catch (error: any) {
      logger.error('[CourseController.publishCourse] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  /**
   * WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1
   * 강사 승인 요청 — DRAFT 또는 REJECTED → PENDING_REVIEW.
   * 본인 강의 또는 lecture:admin 만 호출 가능.
   */
  static async submitForReview(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const userRoles: string[] = (req as any).user?.roles || [];
      const service = CourseService.getInstance();

      const course = await CourseController.loadLectureCourseOr404(res, id);
      if (!course) return;
      if (!CourseController.isOwnerOrAdmin(req, userId, course.instructorId)) {
        return BaseController.forbidden(res, 'You can only submit your own courses for review');
      }

      const updated = await service.submitForReview(id, {
        id: userId,
        role: userRoles[0] ?? null,
      });

      return BaseController.ok(res, {
        course: updated,
        message: '승인 요청이 접수되었습니다',
      });
    } catch (error: any) {
      logger.error('[CourseController.submitForReview] Error', { error: error.message });

      if (error.message?.startsWith('INVALID_STATUS_TRANSITION')) {
        return BaseController.badRequest(
          res,
          '현재 상태에서는 승인 요청할 수 없습니다',
          'INVALID_STATUS_TRANSITION',
        );
      }
      if (error.message?.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async unpublishCourse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const service = CourseService.getInstance();

      const course = await CourseController.loadLectureCourseOr404(res, id);
      if (!course) return;
      if (!CourseController.isOwnerOrAdmin(req, userId, course.instructorId)) {
        return BaseController.forbidden(res, 'You can only unpublish your own courses');
      }

      const updated = await service.unpublishCourse(id);

      return BaseController.ok(res, { course: updated, message: 'Course unpublished successfully' });
    } catch (error: any) {
      logger.error('[CourseController.unpublishCourse] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }

  static async archiveCourse(req: Request, res: Response): Promise<any> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const service = CourseService.getInstance();

      const course = await CourseController.loadLectureCourseOr404(res, id);
      if (!course) return;
      if (!CourseController.isOwnerOrAdmin(req, userId, course.instructorId)) {
        return BaseController.forbidden(res, 'You can only archive your own courses');
      }

      const updated = await service.archiveCourse(id);

      return BaseController.ok(res, { course: updated, message: 'Course archived successfully' });
    } catch (error: any) {
      logger.error('[CourseController.archiveCourse] Error', { error: error.message });

      if (error.message && error.message.includes('not found')) {
        return BaseController.notFound(res, error.message);
      }

      return BaseController.error(res, error);
    }
  }
}
