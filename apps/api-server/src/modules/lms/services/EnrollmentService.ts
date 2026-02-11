import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { Enrollment, EnrollmentStatus } from '@o4o/lms-core';
import { CourseService } from './CourseService.js';
import logger from '../../../utils/logger.js';

export interface EnrollCourseRequest {
  courseId: string;
  userId: string;
  organizationId?: string;
  /** 결제 핸들러에서만 true — 유료 과정 직접 등록 차단용 (WO-LMS-PAID-COURSE-V1) */
  __fromPayment?: boolean;
}

export interface UpdateEnrollmentRequest {
  status?: EnrollmentStatus;
  progressPercentage?: number;
  completedLessons?: number;
  totalLessons?: number;
  timeSpent?: number;
  finalScore?: number;
}

export interface EnrollmentFilters {
  status?: EnrollmentStatus;
  courseId?: string;
  userId?: string;
  organizationId?: string;
  page?: number;
  limit?: number;
}

export class EnrollmentService extends BaseService<Enrollment> {
  private static instance: EnrollmentService;
  private enrollmentRepository: Repository<Enrollment>;
  private courseService: CourseService;

  constructor() {
    const enrollmentRepository = AppDataSource.getRepository(Enrollment);
    super(enrollmentRepository);
    this.enrollmentRepository = enrollmentRepository;
    this.courseService = CourseService.getInstance();
  }

  static getInstance(): EnrollmentService {
    if (!EnrollmentService.instance) {
      EnrollmentService.instance = new EnrollmentService();
    }
    return EnrollmentService.instance;
  }

  // CRUD Operations
  async enrollCourse(data: EnrollCourseRequest): Promise<Enrollment> {
    // Check if already enrolled
    const existing = await this.enrollmentRepository.findOne({
      where: {
        userId: data.userId,
        courseId: data.courseId
      }
    });

    if (existing) {
      throw new Error('User is already enrolled in this course');
    }

    // Check if course is full
    const course = await this.courseService.getCourse(data.courseId);
    if (!course) {
      throw new Error(`Course not found: ${data.courseId}`);
    }

    if (course.isFull()) {
      throw new Error('Course is full');
    }

    if (!course.canEnroll()) {
      throw new Error('Course enrollment is not available');
    }

    // WO-LMS-PAID-COURSE-V1 + WO-LMS-INSTRUCTOR-ROLE-V1:
    // 유료 과정은 결제 핸들러를 통해서만 등록 가능 (단, 강사 승인 모델은 직접 등록 허용)
    if (course.isPaid && !data.__fromPayment && !course.requiresApproval) {
      throw new Error('유료 과정은 결제를 통해서만 등록할 수 있습니다');
    }

    // Get lesson count for this course
    const lessonCount = await AppDataSource.getRepository('Lesson')
      .createQueryBuilder('lesson')
      .where('lesson.courseId = :courseId', { courseId: data.courseId })
      .andWhere('lesson.isPublished = :isPublished', { isPublished: true })
      .getCount();

    // Create enrollment
    const enrollment = this.enrollmentRepository.create({
      ...data,
      organizationId: data.organizationId || course.organizationId,
      status: course.requiresApproval ? EnrollmentStatus.PENDING : EnrollmentStatus.IN_PROGRESS,
      progressPercentage: 0,
      completedLessons: 0,
      totalLessons: lessonCount,
      timeSpent: 0,
      enrolledAt: new Date(),
      startedAt: course.requiresApproval ? undefined : new Date()
    });

    const saved = await this.enrollmentRepository.save(enrollment);

    // Increment course enrollment count
    await this.courseService.incrementEnrollment(data.courseId);

    logger.info(`[LMS] User enrolled in course`, {
      enrollmentId: saved.id,
      userId: data.userId,
      courseId: data.courseId
    });

    return saved;
  }

  async getEnrollment(id: string): Promise<Enrollment | null> {
    return this.enrollmentRepository.findOne({
      where: { id },
      relations: ['course', 'user', 'organization']
    });
  }

  async getEnrollmentByUserAndCourse(userId: string, courseId: string): Promise<Enrollment | null> {
    return this.enrollmentRepository.findOne({
      where: { userId, courseId },
      relations: ['course', 'user']
    });
  }

  async listEnrollments(filters: EnrollmentFilters = {}): Promise<{ enrollments: Enrollment[]; total: number }> {
    const {
      status,
      courseId,
      userId,
      organizationId,
      page = 1,
      limit = 20
    } = filters;

    const query = this.enrollmentRepository.createQueryBuilder('enrollment');

    // Filters
    if (status) {
      query.andWhere('enrollment.status = :status', { status });
    }

    if (courseId) {
      query.andWhere('enrollment.courseId = :courseId', { courseId });
    }

    if (userId) {
      query.andWhere('enrollment.userId = :userId', { userId });
    }

    if (organizationId) {
      query.andWhere('enrollment.organizationId = :organizationId', { organizationId });
    }

    // Pagination
    query
      .orderBy('enrollment.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Include relations
    query.leftJoinAndSelect('enrollment.course', 'course');
    query.leftJoinAndSelect('enrollment.user', 'user');
    query.leftJoinAndSelect('enrollment.organization', 'organization');

    const [enrollments, total] = await query.getManyAndCount();

    return { enrollments, total };
  }

  async updateEnrollment(id: string, data: UpdateEnrollmentRequest): Promise<Enrollment> {
    const enrollment = await this.getEnrollment(id);
    if (!enrollment) {
      throw new Error(`Enrollment not found: ${id}`);
    }

    // Update fields
    Object.assign(enrollment, data);

    const updated = await this.enrollmentRepository.save(enrollment);

    logger.info(`[LMS] Enrollment updated`, { id: updated.id });

    return updated;
  }

  async startEnrollment(id: string): Promise<Enrollment> {
    const enrollment = await this.getEnrollment(id);
    if (!enrollment) {
      throw new Error(`Enrollment not found: ${id}`);
    }

    enrollment.start();
    const updated = await this.enrollmentRepository.save(enrollment);

    logger.info(`[LMS] Enrollment started`, { id: updated.id });

    return updated;
  }

  async completeEnrollment(id: string, finalScore?: number): Promise<Enrollment> {
    const enrollment = await this.getEnrollment(id);
    if (!enrollment) {
      throw new Error(`Enrollment not found: ${id}`);
    }

    enrollment.complete(finalScore);
    const updated = await this.enrollmentRepository.save(enrollment);

    logger.info(`[LMS] Enrollment completed`, { id: updated.id, finalScore });

    return updated;
  }

  async cancelEnrollment(id: string): Promise<Enrollment> {
    const enrollment = await this.getEnrollment(id);
    if (!enrollment) {
      throw new Error(`Enrollment not found: ${id}`);
    }

    enrollment.cancel();
    const updated = await this.enrollmentRepository.save(enrollment);

    // Decrement course enrollment count
    await this.courseService.decrementEnrollment(enrollment.courseId);

    logger.info(`[LMS] Enrollment cancelled`, { id: updated.id });

    return updated;
  }

  async updateProgress(enrollmentId: string, completedLessons: number, totalLessons: number): Promise<void> {
    const enrollment = await this.getEnrollment(enrollmentId);
    if (!enrollment) {
      throw new Error(`Enrollment not found: ${enrollmentId}`);
    }

    enrollment.updateProgress(completedLessons, totalLessons);
    await this.enrollmentRepository.save(enrollment);
  }

  async addTimeSpent(enrollmentId: string, minutes: number): Promise<void> {
    const enrollment = await this.getEnrollment(enrollmentId);
    if (!enrollment) {
      throw new Error(`Enrollment not found: ${enrollmentId}`);
    }

    enrollment.addTimeSpent(minutes);
    await this.enrollmentRepository.save(enrollment);
  }
}
