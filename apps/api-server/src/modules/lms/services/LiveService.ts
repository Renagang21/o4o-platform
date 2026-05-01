import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  Lesson,
  Progress,
  ProgressStatus,
  Enrollment,
} from '@o4o/lms-core';
import logger from '../../../utils/logger.js';
import { CompletionService } from './CompletionService.js';

/**
 * LiveService
 *
 * WO-O4O-LMS-LIVE-MINIMAL-V1
 *
 * Live lessons use 3 columns directly on lms_lessons (no separate table):
 *   liveStartAt / liveEndAt / liveUrl
 * "Join" click === lesson completed (mirrors AssignmentService submit pattern).
 */

export interface UpsertLiveRequest {
  liveStartAt: Date | string;
  liveEndAt: Date | string;
  liveUrl: string;
}

export interface LiveLessonInfo {
  lessonId: string;
  liveStartAt: string | null;
  liveEndAt: string | null;
  liveUrl: string | null;
}

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'];

/**
 * Validate that a URL is a YouTube URL (youtube.com or youtu.be).
 * Returns the parsed URL or throws Error('INVALID_YOUTUBE_URL').
 */
export function validateYoutubeUrl(input: string): string {
  if (typeof input !== 'string' || input.trim().length === 0) {
    throw new Error('INVALID_YOUTUBE_URL');
  }
  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new Error('INVALID_YOUTUBE_URL');
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error('INVALID_YOUTUBE_URL');
  }
  if (!YOUTUBE_HOSTS.includes(parsed.hostname.toLowerCase())) {
    throw new Error('INVALID_YOUTUBE_URL');
  }
  return parsed.toString();
}

export class LiveService {
  private static instance: LiveService;
  private lessonRepository: Repository<Lesson>;
  private progressRepository: Repository<Progress>;
  private enrollmentRepository: Repository<Enrollment>;

  constructor() {
    this.lessonRepository = AppDataSource.getRepository(Lesson);
    this.progressRepository = AppDataSource.getRepository(Progress);
    this.enrollmentRepository = AppDataSource.getRepository(Enrollment);
  }

  static getInstance(): LiveService {
    if (!LiveService.instance) {
      LiveService.instance = new LiveService();
    }
    return LiveService.instance;
  }

  /**
   * Upsert live fields on a lesson (instructor).
   * Throws Error('LESSON_NOT_FOUND' | 'INVALID_RANGE' | 'INVALID_YOUTUBE_URL').
   */
  async upsertLive(lessonId: string, data: UpsertLiveRequest): Promise<Lesson> {
    const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
    if (!lesson) throw new Error('LESSON_NOT_FOUND');

    const start = new Date(data.liveStartAt);
    const end = new Date(data.liveEndAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      throw new Error('INVALID_RANGE');
    }

    const url = validateYoutubeUrl(data.liveUrl);

    lesson.liveStartAt = start;
    lesson.liveEndAt = end;
    lesson.liveUrl = url;

    const saved = await this.lessonRepository.save(lesson);
    logger.info('[Live] Upserted', { lessonId, start, end });
    return saved;
  }

  async getLiveByLesson(lessonId: string): Promise<LiveLessonInfo | null> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      select: ['id', 'liveStartAt', 'liveEndAt', 'liveUrl'],
    });
    if (!lesson) return null;
    if (!lesson.liveStartAt && !lesson.liveEndAt && !lesson.liveUrl) return null;
    return {
      lessonId: lesson.id,
      liveStartAt: lesson.liveStartAt ? lesson.liveStartAt.toISOString() : null,
      liveEndAt: lesson.liveEndAt ? lesson.liveEndAt.toISOString() : null,
      liveUrl: lesson.liveUrl ?? null,
    };
  }

  /**
   * Mark live lesson as completed for the user (called on "join" click).
   * Mirrors AssignmentService.completeLessonProgress (no grading).
   */
  async joinLive(lessonId: string, userId: string): Promise<{ lessonCompleted: boolean }> {
    const lesson = await this.lessonRepository.findOne({
      where: { id: lessonId },
      select: ['id', 'courseId'],
    });
    if (!lesson) throw new Error('LESSON_NOT_FOUND');

    const lessonCompleted = await this.completeLessonProgress(
      lesson.id,
      lesson.courseId,
      userId,
    );

    logger.info('[Live] Joined', { lessonId, userId, lessonCompleted });
    return { lessonCompleted };
  }

  private async completeLessonProgress(
    lessonId: string,
    courseId: string | undefined,
    userId: string,
  ): Promise<boolean> {
    if (!courseId) return false;

    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });
    if (!enrollment) return false;

    let progress = await this.progressRepository.findOne({
      where: { enrollmentId: enrollment.id, lessonId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        enrollmentId: enrollment.id,
        lessonId,
        status: ProgressStatus.IN_PROGRESS,
        startedAt: new Date(),
      });
    }

    progress.complete();
    progress.attempts = (progress.attempts || 0) + 1;
    await this.progressRepository.save(progress);

    const completedCount = await this.progressRepository.count({
      where: { enrollmentId: enrollment.id, status: ProgressStatus.COMPLETED },
    });
    const totalLessons = await this.lessonRepository.count({
      where: { courseId, isPublished: true },
    });

    enrollment.updateProgress(completedCount, totalLessons);

    if (completedCount >= totalLessons && totalLessons > 0) {
      enrollment.complete(enrollment.averageQuizScore ?? undefined);
      try {
        const completionService = CompletionService.getInstance();
        await completionService.createCompletion(userId, courseId, enrollment.id);
      } catch (err) {
        logger.warn('[Live] Completion creation failed', {
          courseId,
          userId,
          error: (err as Error).message,
        });
      }
    }

    await this.enrollmentRepository.save(enrollment);
    return true;
  }
}
