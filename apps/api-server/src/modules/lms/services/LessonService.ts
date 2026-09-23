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

export type UpdateLessonRequest = Partial<Omit<CreateLessonRequest, 'courseId'>>;

/**
 * PR #225 merge-gate 11차 P1: lesson 수정 가능 필드 allowlist.
 *
 * `updateLesson` 은 호출자가 넘긴 객체를 그대로 `Object.assign(lesson, data)` 했기 때문에
 * 타입이 `courseId` 를 제외해도 런타임 `req.body` 는 `courseId` · `id` · 소유권 파생 필드를
 * 실을 수 있었다. 소유권 검사(checkCourseOwnership)는 **수정 전 courseId** 기준으로만
 * 수행되므로, 이를 허용하면 자기 강의의 lesson 을 타인 강의로 옮길 수 있다.
 * 계약: 아래 목록 밖의 키는 조용히 버린다(400 으로 계약을 바꾸지 않는다).
 */
const UPDATABLE_LESSON_FIELDS = [
  'title',
  'description',
  'type',
  'content',
  'videoUrl',
  'videoThumbnail',
  'videoDuration',
  'attachments',
  'order',
  'duration',
  'quizData',
  'isPublished',
  'isFree',
  'requiresCompletion',
  'metadata',
] as const satisfies ReadonlyArray<keyof UpdateLessonRequest>;

export function pickUpdatableLessonFields(input: unknown): UpdateLessonRequest {
  const source = (input ?? {}) as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const key of UPDATABLE_LESSON_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      picked[key] = source[key];
    }
  }
  return picked as UpdateLessonRequest;
}

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
    // WO-O4O-LMS-LESSON-TYPE-NORMALIZATION-V1: enforce lowercase storage
    if (data.type) {
      data.type = (data.type as unknown as string).toLowerCase() as LessonType;
    }

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

    // WO-O4O-KPA-LMS-LESSON-AUTONOMY-V1:
    //   승인된 강의 내 레슨 생성은 강사 자율 영역이므로 course 재승인을 트리거하지 않는다.
    //   (이전: WO-O4O-LMS-COURSE-REAPPROVAL-FLOW-V1 호출 제거)

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

  async updateLesson(id: string, input: UpdateLessonRequest): Promise<Lesson> {
    const lesson = await this.getLesson(id);
    if (!lesson) {
      throw new Error(`Lesson not found: ${id}`);
    }

    // PR #225 merge-gate 11차 P1: allowlist 밖 키(courseId · id · 소유권 파생)는 여기서 제거한다.
    const data = pickUpdatableLessonFields(input);

    // WO-O4O-LMS-LESSON-TYPE-NORMALIZATION-V1: enforce lowercase storage
    if (data.type) {
      data.type = (data.type as unknown as string).toLowerCase() as LessonType;
    }

    // WO-O4O-LMS-REWARD-POLICY-CONTRACT-STABILIZE-V1:
    // metadata 부분 업데이트 시 기존 키(rewardPolicy 등) 유실 방지 — 통째 덮어쓰기 대신 shallow merge.
    const mergedMetadata =
      data.metadata !== undefined ? { ...(lesson.metadata ?? {}), ...data.metadata } : undefined;

    // Update fields
    Object.assign(lesson, data);

    if (mergedMetadata !== undefined) {
      lesson.metadata = mergedMetadata;
    }

    const updated = await this.lessonRepository.save(lesson);

    logger.info(`[LMS] Lesson updated: ${updated.title}`, { id: updated.id });

    // WO-O4O-KPA-LMS-LESSON-AUTONOMY-V1:
    //   승인된 강의 내 레슨 수정은 강사 자율 영역이므로 course 재승인을 트리거하지 않는다.

    return updated;
  }

  async deleteLesson(id: string): Promise<void> {
    const lesson = await this.getLesson(id);
    if (!lesson) {
      throw new Error(`Lesson not found: ${id}`);
    }

    await this.lessonRepository.remove(lesson);

    logger.info(`[LMS] Lesson deleted: ${lesson.title}`, { id });

    // WO-O4O-KPA-LMS-LESSON-AUTONOMY-V1:
    //   승인된 강의 내 레슨 삭제는 강사 자율 영역이므로 course 재승인을 트리거하지 않는다.
  }

  async reorderLessons(courseId: string, lessonIds: string[]): Promise<void> {
    for (let i = 0; i < lessonIds.length; i++) {
      await this.lessonRepository.update(
        { id: lessonIds[i], courseId },
        { order: i }
      );
    }

    logger.info(`[LMS] Lessons reordered for course ${courseId}`);

    // WO-O4O-KPA-LMS-LESSON-AUTONOMY-V1:
    //   승인된 강의 내 레슨 순서 변경은 강사 자율 영역이므로 course 재승인을 트리거하지 않는다.
  }
}
