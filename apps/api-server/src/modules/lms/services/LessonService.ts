import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { Lesson, LessonType } from '@o4o/lms-core';
import logger from '../../../utils/logger.js';

export interface CreateLessonRequest {
  courseId: string;
  title: string;
  description?: string;
  type: LessonType;
  content?: Record<string, any>;
  videoUrl?: string;
  videoThumbnail?: string;
  videoDuration?: number;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;
  order?: number;
  duration?: number;
  quizData?: any;
  isPublished?: boolean;
  isFree?: boolean;
  requiresCompletion?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateLessonRequest extends Partial<Omit<CreateLessonRequest, 'courseId'>> {}

export interface LessonFilters {
  type?: LessonType;
  isPublished?: boolean;
  isFree?: boolean;
  page?: number;
  limit?: number;
}

export class LessonService extends BaseService<Lesson> {
  private static instance: LessonService;
  private lessonRepository: Repository<Lesson>;

  constructor() {
    const lessonRepository = AppDataSource.getRepository(Lesson);
    super(lessonRepository);
    this.lessonRepository = lessonRepository;
  }

  static getInstance(): LessonService {
    if (!LessonService.instance) {
      LessonService.instance = new LessonService();
    }
    return LessonService.instance;
  }

  // CRUD Operations
  async createLesson(data: CreateLessonRequest): Promise<Lesson> {
    // Get max order for this course
    if (data.order === undefined) {
      const maxOrder = await this.lessonRepository
        .createQueryBuilder('lesson')
        .where('lesson.courseId = :courseId', { courseId: data.courseId })
        .select('MAX(lesson.order)', 'max')
        .getRawOne();

      data.order = (maxOrder?.max || 0) + 1;
    }

    const lesson = this.lessonRepository.create({
      ...data,
      isPublished: data.isPublished ?? true,
      isFree: data.isFree ?? false,
      requiresCompletion: data.requiresCompletion ?? false
    });

    const saved = await this.lessonRepository.save(lesson);

    logger.info(`[LMS] Lesson created: ${saved.title}`, { id: saved.id, courseId: data.courseId });

    return saved;
  }

  async getLesson(id: string): Promise<Lesson | null> {
    return this.lessonRepository.findOne({
      where: { id },
      relations: ['course']
    });
  }

  async listLessonsByCourse(courseId: string, filters: LessonFilters = {}): Promise<{ lessons: Lesson[]; total: number }> {
    const {
      type,
      isPublished,
      isFree,
      page = 1,
      limit = 100
    } = filters;

    const query = this.lessonRepository.createQueryBuilder('lesson');

    query.where('lesson.courseId = :courseId', { courseId });

    // Filters
    if (type) {
      query.andWhere('lesson.type = :type', { type });
    }

    if (isPublished !== undefined) {
      query.andWhere('lesson.isPublished = :isPublished', { isPublished });
    }

    if (isFree !== undefined) {
      query.andWhere('lesson.isFree = :isFree', { isFree });
    }

    // Pagination
    query
      .orderBy('lesson.order', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [lessons, total] = await query.getManyAndCount();

    return { lessons, total };
  }

  async updateLesson(id: string, data: UpdateLessonRequest): Promise<Lesson> {
    const lesson = await this.getLesson(id);
    if (!lesson) {
      throw new Error(`Lesson not found: ${id}`);
    }

    // Update fields
    Object.assign(lesson, data);

    const updated = await this.lessonRepository.save(lesson);

    logger.info(`[LMS] Lesson updated: ${updated.title}`, { id: updated.id });

    return updated;
  }

  async deleteLesson(id: string): Promise<void> {
    const lesson = await this.getLesson(id);
    if (!lesson) {
      throw new Error(`Lesson not found: ${id}`);
    }

    await this.lessonRepository.remove(lesson);

    logger.info(`[LMS] Lesson deleted: ${lesson.title}`, { id });
  }

  async reorderLessons(courseId: string, lessonIds: string[]): Promise<void> {
    for (let i = 0; i < lessonIds.length; i++) {
      await this.lessonRepository.update(
        { id: lessonIds[i], courseId },
        { order: i }
      );
    }

    logger.info(`[LMS] Lessons reordered for course ${courseId}`);
  }
}
