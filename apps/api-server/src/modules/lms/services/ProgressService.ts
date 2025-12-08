import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { Progress, ProgressStatus } from '@o4o/lms-core';
import { EnrollmentService } from './EnrollmentService.js';
import logger from '../../../utils/logger.js';

export interface RecordProgressRequest {
  enrollmentId: string;
  lessonId: string;
  timeSpent?: number;
  completionPercentage?: number;
  score?: number;
  quizAnswers?: Record<string, any>;
}

export interface UpdateProgressRequest {
  status?: ProgressStatus;
  timeSpent?: number;
  completionPercentage?: number;
  score?: number;
  quizAnswers?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ProgressFilters {
  status?: ProgressStatus;
  enrollmentId?: string;
  lessonId?: string;
  page?: number;
  limit?: number;
}

export class ProgressService extends BaseService<Progress> {
  private static instance: ProgressService;
  private progressRepository: Repository<Progress>;
  private enrollmentService: EnrollmentService;

  constructor() {
    const progressRepository = AppDataSource.getRepository(Progress);
    super(progressRepository);
    this.progressRepository = progressRepository;
    this.enrollmentService = EnrollmentService.getInstance();
  }

  static getInstance(): ProgressService {
    if (!ProgressService.instance) {
      ProgressService.instance = new ProgressService();
    }
    return ProgressService.instance;
  }

  // CRUD Operations
  async recordProgress(data: RecordProgressRequest): Promise<Progress> {
    // Find or create progress record
    let progress = await this.progressRepository.findOne({
      where: {
        enrollmentId: data.enrollmentId,
        lessonId: data.lessonId
      }
    });

    if (!progress) {
      progress = this.progressRepository.create({
        enrollmentId: data.enrollmentId,
        lessonId: data.lessonId,
        status: ProgressStatus.NOT_STARTED,
        timeSpent: 0,
        completionPercentage: 0,
        attempts: 0
      });
    }

    // Start progress if not started
    if (progress.status === ProgressStatus.NOT_STARTED) {
      progress.start();
    }

    // Update progress data
    if (data.timeSpent !== undefined) {
      progress.addTimeSpent(data.timeSpent);
    }

    if (data.completionPercentage !== undefined) {
      progress.updateVideoProgress(data.completionPercentage, progress.timeSpent);
    }

    if (data.score !== undefined) {
      progress.score = data.score;
    }

    if (data.quizAnswers) {
      progress.quizAnswers = data.quizAnswers;
    }

    const saved = await this.progressRepository.save(progress);

    // Update enrollment progress
    await this.updateEnrollmentProgress(data.enrollmentId);

    logger.info(`[LMS] Progress recorded`, {
      progressId: saved.id,
      enrollmentId: data.enrollmentId,
      lessonId: data.lessonId
    });

    return saved;
  }

  async getProgress(id: string): Promise<Progress | null> {
    return this.progressRepository.findOne({
      where: { id },
      relations: ['enrollment', 'lesson']
    });
  }

  async getProgressByEnrollmentAndLesson(enrollmentId: string, lessonId: string): Promise<Progress | null> {
    return this.progressRepository.findOne({
      where: { enrollmentId, lessonId },
      relations: ['enrollment', 'lesson']
    });
  }

  async listProgress(filters: ProgressFilters = {}): Promise<{ progress: Progress[]; total: number }> {
    const {
      status,
      enrollmentId,
      lessonId,
      page = 1,
      limit = 100
    } = filters;

    const query = this.progressRepository.createQueryBuilder('progress');

    // Filters
    if (status) {
      query.andWhere('progress.status = :status', { status });
    }

    if (enrollmentId) {
      query.andWhere('progress.enrollmentId = :enrollmentId', { enrollmentId });
    }

    if (lessonId) {
      query.andWhere('progress.lessonId = :lessonId', { lessonId });
    }

    // Pagination
    query
      .orderBy('progress.createdAt', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    // Include relations
    query.leftJoinAndSelect('progress.enrollment', 'enrollment');
    query.leftJoinAndSelect('progress.lesson', 'lesson');

    const [progress, total] = await query.getManyAndCount();

    return { progress, total };
  }

  async updateProgress(id: string, data: UpdateProgressRequest): Promise<Progress> {
    const progress = await this.getProgress(id);
    if (!progress) {
      throw new Error(`Progress not found: ${id}`);
    }

    // Update fields
    Object.assign(progress, data);

    const updated = await this.progressRepository.save(progress);

    // Update enrollment progress
    await this.updateEnrollmentProgress(progress.enrollmentId);

    logger.info(`[LMS] Progress updated`, { id: updated.id });

    return updated;
  }

  async completeProgress(id: string, score?: number): Promise<Progress> {
    const progress = await this.getProgress(id);
    if (!progress) {
      throw new Error(`Progress not found: ${id}`);
    }

    progress.complete(score);
    const updated = await this.progressRepository.save(progress);

    // Update enrollment progress
    await this.updateEnrollmentProgress(progress.enrollmentId);

    logger.info(`[LMS] Progress completed`, { id: updated.id, score });

    return updated;
  }

  async submitQuiz(id: string, answers: Record<string, any>, score: number): Promise<Progress> {
    const progress = await this.getProgress(id);
    if (!progress) {
      throw new Error(`Progress not found: ${id}`);
    }

    progress.submitQuizAttempt(answers, score);

    // Auto-complete if score is passing (e.g., >= 70)
    if (score >= 70) {
      progress.complete(score);
    }

    const updated = await this.progressRepository.save(progress);

    // Update enrollment progress
    await this.updateEnrollmentProgress(progress.enrollmentId);

    logger.info(`[LMS] Quiz submitted`, { id: updated.id, score, attempts: progress.attempts });

    return updated;
  }

  private async updateEnrollmentProgress(enrollmentId: string): Promise<void> {
    // Count completed lessons
    const completedCount = await this.progressRepository
      .createQueryBuilder('progress')
      .where('progress.enrollmentId = :enrollmentId', { enrollmentId })
      .andWhere('progress.status = :status', { status: ProgressStatus.COMPLETED })
      .getCount();

    // Count total lessons
    const totalCount = await this.progressRepository
      .createQueryBuilder('progress')
      .where('progress.enrollmentId = :enrollmentId', { enrollmentId })
      .getCount();

    // Update enrollment
    if (totalCount > 0) {
      await this.enrollmentService.updateProgress(enrollmentId, completedCount, totalCount);
    }
  }
}
