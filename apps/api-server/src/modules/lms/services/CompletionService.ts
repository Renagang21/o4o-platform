import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { CourseCompletion } from '../entities/CourseCompletion.js';
import { CertificateService } from './CertificateService.js';
import logger from '../../../utils/logger.js';

/**
 * CompletionService
 *
 * WO-O4O-COMPLETION-V1
 * Handles course completion records and auto-certificate generation.
 */
export class CompletionService {
  private static instance: CompletionService;
  private completionRepository: Repository<CourseCompletion>;

  constructor() {
    this.completionRepository = AppDataSource.getRepository(CourseCompletion);
  }

  static getInstance(): CompletionService {
    if (!CompletionService.instance) {
      CompletionService.instance = new CompletionService();
    }
    return CompletionService.instance;
  }

  /**
   * Create a course completion record and auto-issue certificate.
   * Deduplicates via UNIQUE(userId, courseId).
   * Returns the completion, or null if already exists.
   */
  async createCompletion(
    userId: string,
    courseId: string,
    enrollmentId: string,
  ): Promise<CourseCompletion | null> {
    // Dedup check
    const existing = await this.completionRepository.findOne({
      where: { userId, courseId },
    });
    if (existing) {
      logger.debug('[Completion] Already exists', { userId, courseId });
      return null;
    }

    // Create completion record
    const completion = this.completionRepository.create({
      userId,
      courseId,
      enrollmentId,
      completedAt: new Date(),
    });
    await this.completionRepository.save(completion);

    logger.info('[Completion] Course completion created', {
      completionId: completion.id,
      userId,
      courseId,
      enrollmentId,
    });

    // Auto-issue certificate
    try {
      const certService = CertificateService.getInstance();
      await certService.issueCertificate({ userId, courseId });
      logger.info('[Completion] Certificate auto-issued', { userId, courseId });
    } catch (certError) {
      // Certificate already exists or other issue — don't fail completion
      logger.warn('[Completion] Certificate auto-issue skipped', {
        userId,
        courseId,
        error: (certError as Error).message,
      });
    }

    return completion;
  }

  /**
   * Get all completions for a user.
   */
  async getMyCompletions(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ completions: CourseCompletion[]; total: number }> {
    const [completions, total] = await this.completionRepository.findAndCount({
      where: { userId },
      order: { completedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { completions, total };
  }

  /**
   * Get a specific completion record.
   */
  async getCompletion(id: string): Promise<CourseCompletion | null> {
    return this.completionRepository.findOne({ where: { id } });
  }
}
