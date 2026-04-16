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
    // ── POLICY: IR-O4O-MARKETING-CONTENT-REWARD-POLICY-V1 ─────────────────────────
    // 재완료 정책:
    //   CourseCompletion은 동일 userId + courseId 기준 1회만 생성한다.
    //   재참여 후 재완료가 발생하더라도 Completion 레코드를 재생성하지 않는다.
    //   (DB UNIQUE 제약 + 아래 dedup 체크로 이중 보호)
    // 수료증 발급 정책:
    //   Completion 생성 시 CertificateService.issueCertificate()를 자동 호출하며,
    //   이미 발급된 경우 CertificateService 내부에서 throw → 이 catch 블록에서 warn 처리.
    //   재완료 시에도 수료증을 재발급하지 않는다.
    // ────────────────────────────────────────────────────────────────────────────────
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
