import type { Repository, DataSource } from 'typeorm';
import { YaksaLicenseProfile } from '../entities/YaksaLicenseProfile.entity.js';
import { CreditRecord } from '../entities/CreditRecord.entity.js';

/**
 * LicenseProfileService
 *
 * Manages pharmacist license information and training requirements.
 * Handles license CRUD, credit calculations, and renewal checks.
 */
export class LicenseProfileService {
  private repo: Repository<YaksaLicenseProfile>;
  private creditRepo: Repository<CreditRecord>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(YaksaLicenseProfile);
    this.creditRepo = dataSource.getRepository(CreditRecord);
  }

  /**
   * Get license profile by user ID
   */
  async getProfile(userId: string): Promise<YaksaLicenseProfile | null> {
    return this.repo.findOne({ where: { userId } });
  }

  /**
   * Get license profile by ID
   */
  async getProfileById(id: string): Promise<YaksaLicenseProfile | null> {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Get all profiles for an organization
   */
  async getProfilesByOrganization(organizationId: string): Promise<YaksaLicenseProfile[]> {
    return this.repo.find({ where: { organizationId } });
  }

  /**
   * Create a new license profile
   */
  async createProfile(data: Partial<YaksaLicenseProfile>): Promise<YaksaLicenseProfile> {
    const profile = this.repo.create({
      ...data,
      totalCredits: 0,
      currentYearCredits: 0,
      isRenewalRequired: false,
    });
    return this.repo.save(profile);
  }

  /**
   * Update license profile
   */
  async updateProfile(
    profileId: string,
    data: Partial<YaksaLicenseProfile>
  ): Promise<YaksaLicenseProfile | null> {
    await this.repo.update(profileId, data);
    return this.getProfileById(profileId);
  }

  /**
   * Check if license renewal is required based on credit requirements
   * @param profileId - Profile ID to check
   * @param requiredCredits - Required annual credits (default: 8)
   */
  async checkRenewalRequired(profileId: string, requiredCredits: number = 8): Promise<boolean> {
    const profile = await this.getProfileById(profileId);
    if (!profile) return false;

    const currentYear = new Date().getFullYear();
    const yearCredits = await this.calculateYearCredits(profile.userId, currentYear);

    const isRequired = yearCredits < requiredCredits;

    // Update profile if status changed
    if (profile.isRenewalRequired !== isRequired) {
      await this.repo.update(profileId, { isRenewalRequired: isRequired });
    }

    return isRequired;
  }

  /**
   * Recalculate total credits for a user
   */
  async recalculateCredits(userId: string): Promise<number> {
    const credits = await this.creditRepo.find({ where: { userId } });
    const totalCredits = credits.reduce(
      (sum, record) => sum + Number(record.creditsEarned),
      0
    );

    const currentYear = new Date().getFullYear();
    const currentYearCredits = credits
      .filter(record => record.creditYear === currentYear)
      .reduce((sum, record) => sum + Number(record.creditsEarned), 0);

    // Update profile with recalculated credits
    await this.repo.update(
      { userId },
      { totalCredits, currentYearCredits }
    );

    return totalCredits;
  }

  /**
   * Calculate credits for a specific year
   */
  async calculateYearCredits(userId: string, year: number): Promise<number> {
    const credits = await this.creditRepo.find({
      where: { userId, creditYear: year },
    });

    return credits.reduce(
      (sum, record) => sum + Number(record.creditsEarned),
      0
    );
  }

  /**
   * Update license verification status
   */
  async verifyLicense(profileId: string): Promise<YaksaLicenseProfile | null> {
    await this.repo.update(profileId, {
      lastVerifiedAt: new Date(),
    });
    return this.getProfileById(profileId);
  }

  /**
   * Reset yearly credits for all profiles (typically called at year start)
   */
  async resetYearlyCreditsForAll(): Promise<void> {
    await this.repo.update({}, { currentYearCredits: 0 });
  }

  /**
   * Get profiles requiring renewal
   */
  async getProfilesRequiringRenewal(): Promise<YaksaLicenseProfile[]> {
    return this.repo.find({ where: { isRenewalRequired: true } });
  }

  /**
   * Delete a profile
   */
  async deleteProfile(profileId: string): Promise<boolean> {
    const result = await this.repo.delete(profileId);
    return (result.affected ?? 0) > 0;
  }
}
