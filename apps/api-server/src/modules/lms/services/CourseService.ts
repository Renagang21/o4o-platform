import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { Course, CourseStatus, ContentKind, CourseVisibility } from '@o4o/lms-core';
import { sanitizeInstructor } from '../utils/sanitize-user.js';
import { notificationService } from '../../../services/NotificationService.js';
import logger from '../../../utils/logger.js';

/** O4O Tag Policy V1 — sanitize (trim / #strip / 30char / dedup) */
function sanitizeCourseTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return [...new Set<string>(
    tags.map((t: any) => String(t).trim().replace(/^#/, ''))
      .filter(Boolean)
      .filter((t: string) => t.length <= 30)
  )];
}

export interface CreateCourseRequest {
  title: string;
  description: string;
  thumbnail?: string;
  duration?: number;
  instructorId: string;
  organizationId?: string;
  isOrganizationExclusive?: boolean;
  isRequired?: boolean;
  requiresApproval?: boolean;
  maxEnrollments?: number;
  startAt?: Date;
  endAt?: Date;
  credits?: number;
  metadata?: Record<string, any>;
  tags?: string[];
  // Paid Course (WO-LMS-PAID-COURSE-V1)
  isPaid?: boolean;
  price?: number;
  // WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1: 코스형 자료 vs 일반 강의 분류 (미전달 시 LECTURE)
  contentKind?: ContentKind;
  // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1: 공개/회원제 (미전달 시 MEMBERS)
  visibility?: CourseVisibility;
}

export interface UpdateCourseRequest extends Partial<CreateCourseRequest> {
  status?: CourseStatus;
}

export interface CourseFilters {
  status?: CourseStatus;
  organizationId?: string;
  instructorId?: string;
  isRequired?: boolean;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  // WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1: 미전달 시 'lecture'만 조회 (기본 필터).
  // 모든 종류를 보고 싶으면 'all'을 명시.
  contentKind?: ContentKind | 'all';
  // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-POLICY-V1: 미전달 시 필터 미적용(전체).
  // 비로그인 컨트롤러에서 PUBLIC을 강제 주입.
  visibility?: CourseVisibility;
}

export class CourseService extends BaseService<Course> {
  private static instance: CourseService;
  private courseRepository: Repository<Course>;

  constructor() {
    const courseRepository = AppDataSource.getRepository(Course);
    super(courseRepository);
    this.courseRepository = courseRepository;
  }

  static getInstance(): CourseService {
    if (!CourseService.instance) {
      CourseService.instance = new CourseService();
    }
    return CourseService.instance;
  }

  // CRUD Operations
  async createCourse(data: CreateCourseRequest): Promise<Course> {
    // WO-LMS-PAID-COURSE-V1 + WO-LMS-INSTRUCTOR-ROLE-V1: 제약 검증
    if (data.isPaid) {
      if (data.organizationId) {
        throw new Error('v1: 유료 과정은 플랫폼 전체(organizationId=null)만 가능합니다');
      }
      if (data.maxEnrollments) {
        throw new Error('v1: 유료 과정은 인원 제한을 사용할 수 없습니다');
      }
      // requiresApproval 허용 (강사 승인 모델)
      if (!data.requiresApproval && (!data.price || Number(data.price) <= 0)) {
        throw new Error('유료 과정은 가격이 필수입니다 (강사 승인 모델 제외)');
      }
    }

    // O4O Tag Policy V1 — sanitize + required
    const sanitizedTags = sanitizeCourseTags(data.tags);
    if (sanitizedTags.length === 0) {
      throw new Error('태그를 1개 이상 입력해주세요');
    }

    const course = this.courseRepository.create({
      ...data,
      tags: sanitizedTags,
      status: CourseStatus.DRAFT,
      currentEnrollments: 0,
      isPublished: false,
      // WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1: 미전달 시 LECTURE 기본
      contentKind: data.contentKind ?? ContentKind.LECTURE,
      // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-V1: 미전달 시 MEMBERS 기본
      visibility: data.visibility ?? CourseVisibility.MEMBERS,
    });

    const saved = await this.courseRepository.save(course);

    logger.info(`[LMS] Course created: ${saved.title}`, { id: saved.id });

    return saved;
  }

  async getCourse(id: string): Promise<Course | null> {
    const course = await this.courseRepository.findOne({
      where: { id },
      relations: ['instructor', 'organization']
    });
    if (course) {
      (course as any).instructor = sanitizeInstructor((course as any).instructor);
    }
    return course;
  }

  async listCourses(filters: CourseFilters = {}): Promise<{ courses: Course[]; total: number }> {
    const {
      status,
      organizationId,
      instructorId,
      isRequired,
      search,
      tags,
      page = 1,
      limit = 20,
      contentKind,
      visibility,
    } = filters;

    const query = this.courseRepository.createQueryBuilder('course');

    // WO-KPA-CONTENT-COURSE-KIND-SEPARATION-V1: 미전달 시 LECTURE만, 'all'이면 미적용
    if (contentKind === undefined) {
      query.andWhere('course.contentKind = :contentKind', { contentKind: ContentKind.LECTURE });
    } else if (contentKind !== 'all') {
      query.andWhere('course.contentKind = :contentKind', { contentKind });
    }

    // WO-KPA-LMS-COURSE-VISIBILITY-ACCESS-POLICY-V1: visibility 명시 시 필터 적용
    if (visibility) {
      query.andWhere('course.visibility = :visibility', { visibility });
    }

    // Filters
    if (status) {
      query.andWhere('course.status = :status', { status });
    }

    if (organizationId) {
      query.andWhere('course.organizationId = :organizationId', { organizationId });
    }

    if (instructorId) {
      query.andWhere('course.instructorId = :instructorId', { instructorId });
    }

    if (isRequired !== undefined) {
      query.andWhere('course.isRequired = :isRequired', { isRequired });
    }

    if (search) {
      query.andWhere('(course.title ILIKE :search OR course.description ILIKE :search OR course.tags::text ILIKE :search)', {
        search: `%${search}%`
      });
    }

    if (tags && tags.length > 0) {
      query.andWhere('course.tags && :tags', { tags });
    }

    // Pagination
    query
      .orderBy('course.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Include relations
    query.leftJoinAndSelect('course.instructor', 'instructor');
    query.leftJoinAndSelect('course.organization', 'organization');

    const [courses, total] = await query.getManyAndCount();

    // WO-KPA-LMS-INSTRUCTOR-RESPONSE-SANITIZATION-V1
    for (const course of courses) {
      (course as any).instructor = sanitizeInstructor((course as any).instructor);
    }

    return { courses, total };
  }

  async updateCourse(id: string, data: UpdateCourseRequest): Promise<Course> {
    const course = await this.getCourse(id);
    if (!course) {
      throw new Error(`Course not found: ${id}`);
    }

    // WO-LMS-PAID-COURSE-V1 + WO-LMS-INSTRUCTOR-ROLE-V1: 제약 검증 (변경 후 상태 기준)
    const willBePaid = data.isPaid ?? course.isPaid;
    if (willBePaid) {
      const orgId = data.organizationId ?? course.organizationId;
      const willRequireApproval = data.requiresApproval ?? course.requiresApproval;
      const maxEnroll = data.maxEnrollments ?? course.maxEnrollments;
      const price = data.price ?? course.price;

      if (orgId) {
        throw new Error('v1: 유료 과정은 플랫폼 전체(organizationId=null)만 가능합니다');
      }
      if (maxEnroll) {
        throw new Error('v1: 유료 과정은 인원 제한을 사용할 수 없습니다');
      }
      // requiresApproval 허용 (강사 승인 모델)
      if (!willRequireApproval && (!price || Number(price) <= 0)) {
        throw new Error('유료 과정은 가격이 필수입니다 (강사 승인 모델 제외)');
      }
    }

    // O4O Tag Policy V1 — sanitize + required (when tags provided)
    if (data.tags !== undefined) {
      const sanitizedTags = sanitizeCourseTags(data.tags);
      if (sanitizedTags.length === 0) {
        throw new Error('태그를 1개 이상 입력해주세요');
      }
      data.tags = sanitizedTags;
    }

    // WO-O4O-LMS-COURSE-REAPPROVAL-FLOW-V1
    // PUBLISHED 강의가 수정되면 자동으로 PENDING_REVIEW 전환 (운영자 재승인 필요).
    // data.status가 명시적으로 지정된 경우(예: 운영자/admin이 archive 등 다른 전이 수행)는 그대로 존중.
    const wasPublished = course.status === CourseStatus.PUBLISHED;

    // Update fields
    Object.assign(course, data);

    if (wasPublished && !data.status) {
      course.status = CourseStatus.PENDING_REVIEW;
      course.rejectionReason = null;
      logger.info('[LMS] Course auto-reverted to PENDING_REVIEW (content edited)', {
        id: course.id,
        title: course.title,
      });
    }

    const updated = await this.courseRepository.save(course);

    logger.info(`[LMS] Course updated: ${updated.title}`, { id: updated.id });

    return updated;
  }

  /**
   * WO-O4O-LMS-COURSE-REAPPROVAL-FLOW-V1
   * 콘텐츠(레슨/퀴즈/과제/라이브) 변경 시 호출되는 상태 전환 헬퍼.
   *
   *   PUBLISHED  → PENDING_REVIEW (재검토 트리거, rejectionReason 클리어)
   *   기타 상태  → no-op
   *
   * 호출 측: LessonService / QuizService / AssignmentService / LiveService 의 mutation 메서드.
   * 콘텐츠 변경이 발생하면 운영자 재승인 없이는 사용자 노출 안 되도록 보장.
   */
  async maybeRevertToPendingReview(courseId: string): Promise<void> {
    if (!courseId) return;
    const course = await this.courseRepository.findOne({ where: { id: courseId } });
    if (course && course.status === CourseStatus.PUBLISHED) {
      course.status = CourseStatus.PENDING_REVIEW;
      course.rejectionReason = null;
      await this.courseRepository.save(course);
      logger.info('[LMS] Course auto-reverted to PENDING_REVIEW (related content changed)', {
        id: courseId,
        title: course.title,
      });
    }
  }

  async deleteCourse(id: string): Promise<void> {
    const course = await this.getCourse(id);
    if (!course) {
      throw new Error(`Course not found: ${id}`);
    }

    // Soft delete - archive course
    course.status = CourseStatus.ARCHIVED;
    course.isPublished = false;
    await this.courseRepository.save(course);

    logger.info(`[LMS] Course archived: ${course.title}`, { id });
  }

  async publishCourse(id: string): Promise<Course> {
    const course = await this.getCourse(id);
    if (!course) {
      throw new Error(`Course not found: ${id}`);
    }

    course.publish();
    const updated = await this.courseRepository.save(course);

    logger.info(`[LMS] Course published: ${updated.title}`, { id: updated.id });

    return updated;
  }

  /**
   * WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1
   * 강사 승인 요청 — DRAFT 또는 REJECTED → PENDING_REVIEW.
   * PUBLISHED / PENDING_REVIEW 상태에서는 거부.
   */
  async submitForReview(id: string): Promise<Course> {
    const course = await this.getCourse(id);
    if (!course) {
      throw new Error(`Course not found: ${id}`);
    }

    if (
      course.status !== CourseStatus.DRAFT &&
      course.status !== CourseStatus.REJECTED
    ) {
      throw new Error(
        `INVALID_STATUS_TRANSITION: status='${course.status}' is not eligible for submit-review`,
      );
    }

    course.submitForReview();
    const updated = await this.courseRepository.save(course);

    logger.info(`[LMS] Course submitted for review`, {
      id: updated.id,
      title: updated.title,
    });

    // WO-O4O-LMS-NOTIFICATION-INTEGRATION-V1
    await notificationService.createNotification({
      userId: updated.instructorId,
      organizationId: updated.organizationId,
      type: 'lms.course_submitted',
      title: '강의 검토 요청',
      message: '강의가 검토 요청 상태로 변경되었습니다.',
      metadata: {
        courseId: updated.id,
        courseTitle: updated.title,
      },
    });

    return updated;
  }

  /**
   * WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1
   * 운영자 승인 — PENDING_REVIEW → PUBLISHED.
   */
  async approveCourse(id: string): Promise<Course> {
    const course = await this.getCourse(id);
    if (!course) {
      throw new Error(`Course not found: ${id}`);
    }

    if (course.status !== CourseStatus.PENDING_REVIEW) {
      throw new Error(
        `INVALID_STATUS_TRANSITION: only PENDING_REVIEW can be approved (current: '${course.status}')`,
      );
    }

    course.publish();
    const updated = await this.courseRepository.save(course);

    logger.info(`[LMS] Course approved & published`, {
      id: updated.id,
      title: updated.title,
    });

    // WO-O4O-LMS-NOTIFICATION-INTEGRATION-V1
    await notificationService.createNotification({
      userId: updated.instructorId,
      organizationId: updated.organizationId,
      type: 'lms.course_approved',
      title: '강의 승인 완료',
      message: '강의가 승인되었습니다.',
      metadata: {
        courseId: updated.id,
        courseTitle: updated.title,
      },
    });

    return updated;
  }

  /**
   * WO-O4O-LMS-COURSE-APPROVAL-FLOW-V1
   * 운영자 반려 — PENDING_REVIEW → REJECTED + 사유 저장.
   */
  async rejectCourse(id: string, reason: string): Promise<Course> {
    const course = await this.getCourse(id);
    if (!course) {
      throw new Error(`Course not found: ${id}`);
    }

    if (course.status !== CourseStatus.PENDING_REVIEW) {
      throw new Error(
        `INVALID_STATUS_TRANSITION: only PENDING_REVIEW can be rejected (current: '${course.status}')`,
      );
    }

    const trimmed = (reason || '').trim();
    if (!trimmed) {
      throw new Error('REJECTION_REASON_REQUIRED');
    }

    course.reject(trimmed);
    const updated = await this.courseRepository.save(course);

    logger.info(`[LMS] Course rejected`, {
      id: updated.id,
      title: updated.title,
      reason: trimmed,
    });

    // WO-O4O-LMS-NOTIFICATION-INTEGRATION-V1
    await notificationService.createNotification({
      userId: updated.instructorId,
      organizationId: updated.organizationId,
      type: 'lms.course_rejected',
      title: '강의 반려',
      message: '강의가 반려되었습니다.',
      metadata: {
        courseId: updated.id,
        courseTitle: updated.title,
        rejectionReason: trimmed,
      },
    });

    return updated;
  }

  async unpublishCourse(id: string): Promise<Course> {
    const course = await this.getCourse(id);
    if (!course) {
      throw new Error(`Course not found: ${id}`);
    }

    course.status = CourseStatus.DRAFT;
    course.isPublished = false;
    const updated = await this.courseRepository.save(course);

    logger.info(`[LMS] Course unpublished: ${updated.title}`, { id: updated.id });

    return updated;
  }

  async archiveCourse(id: string): Promise<Course> {
    const course = await this.getCourse(id);
    if (!course) {
      throw new Error(`Course not found: ${id}`);
    }

    course.archive();
    const updated = await this.courseRepository.save(course);

    logger.info(`[LMS] Course archived: ${updated.title}`, { id: updated.id });

    return updated;
  }

  async incrementEnrollment(id: string): Promise<void> {
    const course = await this.getCourse(id);
    if (!course) {
      throw new Error(`Course not found: ${id}`);
    }

    course.incrementEnrollments();
    await this.courseRepository.save(course);
  }

  async decrementEnrollment(id: string): Promise<void> {
    const course = await this.getCourse(id);
    if (!course) {
      throw new Error(`Course not found: ${id}`);
    }

    course.decrementEnrollments();
    await this.courseRepository.save(course);
  }
}
