import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { Course, CourseStatus, CourseLevel } from '@o4o/lms-core';
import logger from '../../../utils/logger.js';

export interface CreateCourseRequest {
  title: string;
  description: string;
  thumbnail?: string;
  level?: CourseLevel;
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
}

export interface UpdateCourseRequest extends Partial<CreateCourseRequest> {
  status?: CourseStatus;
}

export interface CourseFilters {
  status?: CourseStatus;
  level?: CourseLevel;
  organizationId?: string;
  instructorId?: string;
  isRequired?: boolean;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
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

    const course = this.courseRepository.create({
      ...data,
      status: CourseStatus.DRAFT,
      currentEnrollments: 0,
      isPublished: false
    });

    const saved = await this.courseRepository.save(course);

    logger.info(`[LMS] Course created: ${saved.title}`, { id: saved.id });

    return saved;
  }

  async getCourse(id: string): Promise<Course | null> {
    return this.courseRepository.findOne({
      where: { id },
      relations: ['instructor', 'organization']
    });
  }

  async listCourses(filters: CourseFilters = {}): Promise<{ courses: Course[]; total: number }> {
    const {
      status,
      level,
      organizationId,
      instructorId,
      isRequired,
      search,
      tags,
      page = 1,
      limit = 20
    } = filters;

    const query = this.courseRepository.createQueryBuilder('course');

    // Filters
    if (status) {
      query.andWhere('course.status = :status', { status });
    }

    if (level) {
      query.andWhere('course.level = :level', { level });
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
      query.andWhere('(course.title ILIKE :search OR course.description ILIKE :search)', {
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

    // Update fields
    Object.assign(course, data);

    const updated = await this.courseRepository.save(course);

    logger.info(`[LMS] Course updated: ${updated.title}`, { id: updated.id });

    return updated;
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
