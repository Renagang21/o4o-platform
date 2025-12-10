import type { Repository, DataSource } from 'typeorm';
import { CreditRecord, CreditType } from '../entities/CreditRecord.entity.js';

/**
 * CreditRecordService
 *
 * Manages credit records for pharmacist continuing education.
 * Handles credit CRUD, calculations, and aggregations.
 */
export class CreditRecordService {
  private repo: Repository<CreditRecord>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(CreditRecord);
  }

  /**
   * Get credit record by ID
   */
  async getCreditRecord(id: string): Promise<CreditRecord | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Get all credit records for a user
   */
  async getCredits(userId: string): Promise<CreditRecord[]> {
    return this.repo.find({
      where: { userId },
      order: { earnedAt: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Get credit records for a specific course
   */
  async getCreditsByCourse(courseId: string): Promise<CreditRecord[]> {
    return this.repo.find({
      where: { courseId },
      order: { earnedAt: 'DESC' },
    });
  }

  /**
   * Get credit records for a user and specific year
   */
  async getCreditsByYear(userId: string, year: number): Promise<CreditRecord[]> {
    return this.repo.find({
      where: { userId, creditYear: year },
      order: { earnedAt: 'DESC' },
    });
  }

  /**
   * Add a new credit record
   */
  async addCreditRecord(
    userId: string,
    courseId: string | null,
    credits: number,
    certificateId?: string,
    options?: {
      creditType?: CreditType;
      courseTitle?: string;
      enrollmentId?: string;
      earnedAt?: Date;
      note?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<CreditRecord> {
    const earnedAt = options?.earnedAt ?? new Date();
    const creditYear = earnedAt.getFullYear();

    const record = this.repo.create({
      userId,
      courseId: courseId ?? undefined,
      creditsEarned: credits,
      certificateId,
      creditType: options?.creditType ?? CreditType.COURSE_COMPLETION,
      courseTitle: options?.courseTitle,
      enrollmentId: options?.enrollmentId,
      earnedAt,
      creditYear,
      isVerified: options?.creditType !== CreditType.EXTERNAL, // External credits require verification
      note: options?.note,
      metadata: options?.metadata,
    });

    return this.repo.save(record);
  }

  /**
   * Add external credit record (requires verification)
   */
  async addExternalCredit(
    userId: string,
    credits: number,
    note: string,
    metadata?: Record<string, any>
  ): Promise<CreditRecord> {
    return this.addCreditRecord(userId, null, credits, undefined, {
      creditType: CreditType.EXTERNAL,
      note,
      metadata,
    });
  }

  /**
   * Add manual adjustment credit
   */
  async addManualAdjustment(
    userId: string,
    credits: number,
    note: string,
    verifiedBy: string
  ): Promise<CreditRecord> {
    const earnedAt = new Date();
    const creditYear = earnedAt.getFullYear();

    const record = this.repo.create({
      userId,
      creditsEarned: credits,
      creditType: CreditType.MANUAL_ADJUSTMENT,
      earnedAt,
      creditYear,
      isVerified: true,
      verifiedBy,
      note,
    });

    return this.repo.save(record);
  }

  /**
   * Calculate total credits for a user
   */
  async calculateTotalCredits(userId: string): Promise<number> {
    const credits = await this.repo.find({
      where: { userId, isVerified: true },
    });

    return credits.reduce(
      (sum, record) => sum + Number(record.creditsEarned),
      0
    );
  }

  /**
   * Calculate credits for a specific year
   */
  async calculateYearCredits(userId: string, year: number): Promise<number> {
    const credits = await this.repo.find({
      where: { userId, creditYear: year, isVerified: true },
    });

    return credits.reduce(
      (sum, record) => sum + Number(record.creditsEarned),
      0
    );
  }

  /**
   * Aggregate credits by year for a user
   * Returns a map of year -> total credits
   */
  async aggregateCreditsByYear(userId: string): Promise<Record<number, number>> {
    const credits = await this.repo.find({
      where: { userId, isVerified: true },
    });

    const aggregated: Record<number, number> = {};

    for (const record of credits) {
      const year = record.creditYear;
      aggregated[year] = (aggregated[year] ?? 0) + Number(record.creditsEarned);
    }

    return aggregated;
  }

  /**
   * Aggregate credits by type for a user
   */
  async aggregateCreditsByType(userId: string): Promise<Record<CreditType, number>> {
    const credits = await this.repo.find({
      where: { userId, isVerified: true },
    });

    const aggregated: Record<string, number> = {
      [CreditType.COURSE_COMPLETION]: 0,
      [CreditType.ATTENDANCE]: 0,
      [CreditType.EXTERNAL]: 0,
      [CreditType.MANUAL_ADJUSTMENT]: 0,
    };

    for (const record of credits) {
      aggregated[record.creditType] += Number(record.creditsEarned);
    }

    return aggregated as Record<CreditType, number>;
  }

  /**
   * Get credit summary for a user
   */
  async getCreditSummary(userId: string): Promise<{
    totalCredits: number;
    currentYearCredits: number;
    byYear: Record<number, number>;
    byType: Record<CreditType, number>;
    unverifiedCredits: number;
  }> {
    const currentYear = new Date().getFullYear();

    const [totalCredits, currentYearCredits, byYear, byType, unverifiedCredits] =
      await Promise.all([
        this.calculateTotalCredits(userId),
        this.calculateYearCredits(userId, currentYear),
        this.aggregateCreditsByYear(userId),
        this.aggregateCreditsByType(userId),
        this.calculateUnverifiedCredits(userId),
      ]);

    return {
      totalCredits,
      currentYearCredits,
      byYear,
      byType,
      unverifiedCredits,
    };
  }

  /**
   * Calculate unverified credits for a user
   */
  async calculateUnverifiedCredits(userId: string): Promise<number> {
    const credits = await this.repo.find({
      where: { userId, isVerified: false },
    });

    return credits.reduce(
      (sum, record) => sum + Number(record.creditsEarned),
      0
    );
  }

  /**
   * Verify a credit record
   */
  async verifyCredit(creditId: string, verifiedBy: string): Promise<CreditRecord | null> {
    const record = await this.getCreditRecord(creditId);
    if (!record) return null;

    await this.repo.update(creditId, {
      isVerified: true,
      verifiedBy,
    });

    return this.getCreditRecord(creditId);
  }

  /**
   * Reject/unverify a credit record
   */
  async rejectCredit(creditId: string, note: string): Promise<CreditRecord | null> {
    const record = await this.getCreditRecord(creditId);
    if (!record) return null;

    const existingNote = record.note ? `${record.note}\n` : '';
    await this.repo.update(creditId, {
      isVerified: false,
      note: `${existingNote}[Rejected] ${note}`,
    });

    return this.getCreditRecord(creditId);
  }

  /**
   * Get unverified credit records (for admin review)
   */
  async getUnverifiedCredits(): Promise<CreditRecord[]> {
    return this.repo.find({
      where: { isVerified: false },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Check if user has credit record for a specific course
   */
  async hasCreditForCourse(userId: string, courseId: string): Promise<boolean> {
    const record = await this.repo.findOne({
      where: { userId, courseId },
    });
    return !!record;
  }

  /**
   * Update a credit record
   */
  async updateCreditRecord(
    creditId: string,
    payload: Partial<CreditRecord>
  ): Promise<CreditRecord | null> {
    const record = await this.getCreditRecord(creditId);
    if (!record) return null;

    // Recalculate creditYear if earnedAt is changed
    if (payload.earnedAt) {
      payload.creditYear = new Date(payload.earnedAt).getFullYear();
    }

    await this.repo.update(creditId, payload);
    return this.getCreditRecord(creditId);
  }

  /**
   * Delete a credit record
   */
  async deleteCreditRecord(creditId: string): Promise<boolean> {
    const result = await this.repo.delete(creditId);
    return (result.affected ?? 0) > 0;
  }

  /**
   * Bulk add credit records (for batch processing)
   */
  async bulkAddCreditRecords(
    records: Array<{
      userId: string;
      courseId?: string;
      credits: number;
      certificateId?: string;
      creditType?: CreditType;
      courseTitle?: string;
      earnedAt?: Date;
      note?: string;
    }>
  ): Promise<CreditRecord[]> {
    const creditRecords = records.map(record => {
      const earnedAt = record.earnedAt ?? new Date();
      return this.repo.create({
        userId: record.userId,
        courseId: record.courseId,
        creditsEarned: record.credits,
        certificateId: record.certificateId,
        creditType: record.creditType ?? CreditType.COURSE_COMPLETION,
        courseTitle: record.courseTitle,
        earnedAt,
        creditYear: earnedAt.getFullYear(),
        isVerified: record.creditType !== CreditType.EXTERNAL,
        note: record.note,
      });
    });

    return this.repo.save(creditRecords);
  }
}
