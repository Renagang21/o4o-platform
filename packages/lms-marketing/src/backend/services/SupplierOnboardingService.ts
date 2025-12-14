/**
 * SupplierOnboardingService
 *
 * Manages supplier onboarding process and profile data.
 * Phase R11: Supplier Onboarding System
 */

import type { DataSource, Repository } from 'typeorm';
import {
  SupplierProfile,
  type OnboardingStatus,
  type OnboardingChecklistItem,
} from '../entities/SupplierProfile.entity.js';
import { ProductContent } from '../entities/ProductContent.entity.js';
import { MarketingQuizCampaign } from '../entities/MarketingQuizCampaign.entity.js';
import { SurveyCampaign } from '../entities/SurveyCampaign.entity.js';

/**
 * DTO for updating supplier profile
 */
export interface UpdateSupplierProfileDto {
  brandName?: string;
  contactEmail?: string;
  contactPhone?: string;
  categories?: string[];
  productTypes?: string[];
  region?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Onboarding checklist response
 */
export interface OnboardingChecklistResponse {
  items: OnboardingChecklistItem[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  status: OnboardingStatus;
}

let supplierOnboardingServiceInstance: SupplierOnboardingService | null = null;

export class SupplierOnboardingService {
  private profileRepository: Repository<SupplierProfile>;
  private productContentRepository: Repository<ProductContent>;
  private quizCampaignRepository: Repository<MarketingQuizCampaign>;
  private surveyCampaignRepository: Repository<SurveyCampaign>;

  constructor(private dataSource: DataSource) {
    this.profileRepository = dataSource.getRepository(SupplierProfile);
    this.productContentRepository = dataSource.getRepository(ProductContent);
    this.quizCampaignRepository = dataSource.getRepository(MarketingQuizCampaign);
    this.surveyCampaignRepository = dataSource.getRepository(SurveyCampaign);
  }

  /**
   * Get or create supplier profile
   */
  async getProfile(supplierId: string): Promise<SupplierProfile> {
    let profile = await this.profileRepository.findOne({
      where: { supplierId },
    });

    if (!profile) {
      // Create new profile with default checklist
      profile = this.profileRepository.create({
        supplierId,
        onboardingStatus: 'not_started',
        onboardingChecklist: [
          { id: 'profile', label: 'Complete brand profile', completed: false },
          { id: 'first_product', label: 'Publish first product info', completed: false },
          { id: 'first_quiz', label: 'Create first quiz campaign', completed: false },
          { id: 'first_survey', label: 'Create first survey campaign', completed: false },
          { id: 'view_dashboard', label: 'View insights dashboard', completed: false },
        ],
        categories: [],
        productTypes: [],
        metadata: {},
      });
      profile = await this.profileRepository.save(profile);
    }

    return profile;
  }

  /**
   * Update supplier profile
   */
  async updateProfile(
    supplierId: string,
    dto: UpdateSupplierProfileDto
  ): Promise<SupplierProfile> {
    const profile = await this.getProfile(supplierId);

    if (dto.brandName !== undefined) profile.brandName = dto.brandName || null;
    if (dto.contactEmail !== undefined) profile.contactEmail = dto.contactEmail || null;
    if (dto.contactPhone !== undefined) profile.contactPhone = dto.contactPhone || null;
    if (dto.categories !== undefined) profile.categories = dto.categories;
    if (dto.productTypes !== undefined) profile.productTypes = dto.productTypes;
    if (dto.region !== undefined) profile.region = dto.region || null;
    if (dto.metadata !== undefined) {
      profile.metadata = { ...profile.metadata, ...dto.metadata };
    }

    // Update onboarding status if profile is being filled
    if (profile.onboardingStatus === 'not_started') {
      profile.onboardingStatus = 'in_progress';
    }

    // Mark profile checklist item as completed if enough fields filled
    if (profile.brandName && profile.contactEmail) {
      this.markChecklistItem(profile, 'profile', true);
    }

    return this.profileRepository.save(profile);
  }

  /**
   * Get onboarding checklist with real-time progress
   */
  async getOnboardingChecklist(supplierId: string): Promise<OnboardingChecklistResponse> {
    const profile = await this.getProfile(supplierId);

    // Check actual progress from database
    await this.refreshChecklistProgress(profile);

    const completedCount = profile.onboardingChecklist.filter((item) => item.completed).length;
    const totalCount = profile.onboardingChecklist.length;

    return {
      items: profile.onboardingChecklist,
      completedCount,
      totalCount,
      progressPercent: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      status: profile.onboardingStatus,
    };
  }

  /**
   * Refresh checklist progress based on actual data
   */
  private async refreshChecklistProgress(profile: SupplierProfile): Promise<void> {
    let updated = false;

    // Check if profile is complete
    if (profile.brandName && profile.contactEmail) {
      updated = this.markChecklistItem(profile, 'profile', true) || updated;
    }

    // Check for first product info
    const productCount = await this.productContentRepository.count({
      where: { supplierId: profile.supplierId, isPublished: true },
    });
    if (productCount > 0) {
      updated = this.markChecklistItem(profile, 'first_product', true) || updated;
    }

    // Check for first quiz campaign
    const quizCount = await this.quizCampaignRepository.count({
      where: { supplierId: profile.supplierId },
    });
    if (quizCount > 0) {
      updated = this.markChecklistItem(profile, 'first_quiz', true) || updated;
    }

    // Check for first survey campaign
    const surveyCount = await this.surveyCampaignRepository.count({
      where: { supplierId: profile.supplierId },
    });
    if (surveyCount > 0) {
      updated = this.markChecklistItem(profile, 'first_survey', true) || updated;
    }

    // Note: view_dashboard is tracked via explicit API call

    if (updated) {
      await this.profileRepository.save(profile);
    }
  }

  /**
   * Mark a checklist item as completed/uncompleted
   */
  private markChecklistItem(
    profile: SupplierProfile,
    itemId: string,
    completed: boolean
  ): boolean {
    const item = profile.onboardingChecklist.find((i) => i.id === itemId);
    if (item && item.completed !== completed) {
      item.completed = completed;
      if (completed) {
        item.completedAt = new Date();
      } else {
        delete item.completedAt;
      }
      return true;
    }
    return false;
  }

  /**
   * Track dashboard view (marks checklist item)
   */
  async trackDashboardView(supplierId: string): Promise<void> {
    const profile = await this.getProfile(supplierId);
    this.markChecklistItem(profile, 'view_dashboard', true);
    await this.profileRepository.save(profile);
  }

  /**
   * Mark onboarding as completed
   */
  async markOnboardingCompleted(supplierId: string): Promise<SupplierProfile> {
    const profile = await this.getProfile(supplierId);

    // Refresh checklist progress first
    await this.refreshChecklistProgress(profile);

    // Check if all items are completed
    const allCompleted = profile.onboardingChecklist.every((item) => item.completed);

    if (allCompleted) {
      profile.onboardingStatus = 'completed';
      profile.onboardingCompletedAt = new Date();
    } else {
      // Still mark as completed if manually triggered
      profile.onboardingStatus = 'completed';
      profile.onboardingCompletedAt = new Date();
    }

    return this.profileRepository.save(profile);
  }

  /**
   * Reset onboarding progress (for testing or re-onboarding)
   */
  async resetOnboarding(supplierId: string): Promise<SupplierProfile> {
    const profile = await this.getProfile(supplierId);

    profile.onboardingStatus = 'not_started';
    profile.onboardingCompletedAt = null;
    profile.onboardingChecklist = [
      { id: 'profile', label: 'Complete brand profile', completed: false },
      { id: 'first_product', label: 'Publish first product info', completed: false },
      { id: 'first_quiz', label: 'Create first quiz campaign', completed: false },
      { id: 'first_survey', label: 'Create first survey campaign', completed: false },
      { id: 'view_dashboard', label: 'View insights dashboard', completed: false },
    ];

    return this.profileRepository.save(profile);
  }

  /**
   * Get all supplier profiles (admin)
   */
  async listProfiles(options?: {
    status?: OnboardingStatus;
    limit?: number;
    offset?: number;
  }): Promise<{ items: SupplierProfile[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (options?.status) {
      where.onboardingStatus = options.status;
    }

    const [items, total] = await this.profileRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: options?.limit || 20,
      skip: options?.offset || 0,
    });

    return { items, total };
  }
}

/**
 * Get SupplierOnboardingService singleton instance
 */
export function getSupplierOnboardingService(): SupplierOnboardingService {
  if (!supplierOnboardingServiceInstance) {
    throw new Error(
      'SupplierOnboardingService not initialized. Call initSupplierOnboardingService first.'
    );
  }
  return supplierOnboardingServiceInstance;
}

/**
 * Initialize SupplierOnboardingService with DataSource
 */
export function initSupplierOnboardingService(
  dataSource: DataSource
): SupplierOnboardingService {
  supplierOnboardingServiceInstance = new SupplierOnboardingService(dataSource);
  return supplierOnboardingServiceInstance;
}
