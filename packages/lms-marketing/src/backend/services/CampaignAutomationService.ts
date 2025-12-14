/**
 * CampaignAutomationService
 *
 * Manages campaign automation logic for scheduled publishing,
 * expiration, and performance-based actions.
 * Phase R11: Marketing Automation System
 */

import type { DataSource, Repository, LessThan, MoreThan, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { MarketingQuizCampaign, type CampaignStatus } from '../entities/MarketingQuizCampaign.entity.js';
import { SurveyCampaign, type SurveyCampaignStatus } from '../entities/SurveyCampaign.entity.js';

/**
 * Automation rule types
 */
export type AutomationRuleType =
  | 'auto_publish_scheduled'
  | 'auto_end_expired'
  | 'auto_pause_low_engagement'
  | 'auto_boost_high_performing';

/**
 * Automation rule configuration
 */
export interface AutomationRule {
  type: AutomationRuleType;
  enabled: boolean;
  config: Record<string, unknown>;
}

/**
 * Automation settings
 */
export interface AutomationSettings {
  autoPublishScheduled: boolean;
  autoEndExpired: boolean;
  autoPauseLowEngagement: boolean;
  lowEngagementThreshold: number; // percentage
  autoPauseDaysWithoutEngagement: number;
  autoBoostHighPerforming: boolean;
  highPerformingThreshold: number; // percentage
}

/**
 * Automation log entry
 */
export interface AutomationLogEntry {
  timestamp: Date;
  ruleType: AutomationRuleType;
  campaignType: 'quiz' | 'survey';
  campaignId: string;
  campaignTitle: string;
  action: string;
  success: boolean;
  error?: string;
}

/**
 * Automation run result
 */
export interface AutomationRunResult {
  ruleType: AutomationRuleType;
  processed: number;
  successful: number;
  failed: number;
  logs: AutomationLogEntry[];
}

let campaignAutomationServiceInstance: CampaignAutomationService | null = null;

// Default automation settings
const DEFAULT_SETTINGS: AutomationSettings = {
  autoPublishScheduled: true,
  autoEndExpired: true,
  autoPauseLowEngagement: false,
  lowEngagementThreshold: 5, // 5% engagement rate
  autoPauseDaysWithoutEngagement: 14,
  autoBoostHighPerforming: false,
  highPerformingThreshold: 50, // 50% engagement rate
};

export class CampaignAutomationService {
  private quizRepository: Repository<MarketingQuizCampaign>;
  private surveyRepository: Repository<SurveyCampaign>;
  private settings: AutomationSettings;
  private logs: AutomationLogEntry[] = [];

  constructor(private dataSource: DataSource) {
    this.quizRepository = dataSource.getRepository(MarketingQuizCampaign);
    this.surveyRepository = dataSource.getRepository(SurveyCampaign);
    this.settings = { ...DEFAULT_SETTINGS };
  }

  /**
   * Get current automation settings
   */
  getSettings(): AutomationSettings {
    return { ...this.settings };
  }

  /**
   * Update automation settings
   */
  updateSettings(updates: Partial<AutomationSettings>): AutomationSettings {
    this.settings = { ...this.settings, ...updates };
    return this.getSettings();
  }

  /**
   * Get automation logs
   */
  getLogs(options?: { limit?: number; ruleType?: AutomationRuleType }): AutomationLogEntry[] {
    let logs = [...this.logs];

    if (options?.ruleType) {
      logs = logs.filter((log) => log.ruleType === options.ruleType);
    }

    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      logs = logs.slice(0, options.limit);
    }

    return logs;
  }

  /**
   * Clear automation logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Auto-publish scheduled campaigns
   */
  async autoPublishScheduledCampaigns(): Promise<AutomationRunResult> {
    const result: AutomationRunResult = {
      ruleType: 'auto_publish_scheduled',
      processed: 0,
      successful: 0,
      failed: 0,
      logs: [],
    };

    if (!this.settings.autoPublishScheduled) {
      return result;
    }

    const now = new Date();

    // Find scheduled quiz campaigns ready to publish
    const scheduledQuizzes = await this.quizRepository
      .createQueryBuilder('campaign')
      .where('campaign.status = :status', { status: 'scheduled' })
      .andWhere('campaign.startDate <= :now', { now })
      .getMany();

    for (const campaign of scheduledQuizzes) {
      result.processed++;
      try {
        campaign.status = 'active';
        await this.quizRepository.save(campaign);
        result.successful++;
        this.addLog(result.logs, 'auto_publish_scheduled', 'quiz', campaign.id, campaign.title, 'Published', true);
      } catch (error) {
        result.failed++;
        this.addLog(result.logs, 'auto_publish_scheduled', 'quiz', campaign.id, campaign.title, 'Failed to publish', false, String(error));
      }
    }

    // Find scheduled survey campaigns ready to publish
    const scheduledSurveys = await this.surveyRepository
      .createQueryBuilder('campaign')
      .where('campaign.status = :status', { status: 'scheduled' })
      .andWhere('campaign.startDate <= :now', { now })
      .getMany();

    for (const campaign of scheduledSurveys) {
      result.processed++;
      try {
        campaign.status = 'active';
        await this.surveyRepository.save(campaign);
        result.successful++;
        this.addLog(result.logs, 'auto_publish_scheduled', 'survey', campaign.id, campaign.title, 'Published', true);
      } catch (error) {
        result.failed++;
        this.addLog(result.logs, 'auto_publish_scheduled', 'survey', campaign.id, campaign.title, 'Failed to publish', false, String(error));
      }
    }

    this.logs.push(...result.logs);
    return result;
  }

  /**
   * Auto-end expired campaigns
   */
  async autoEndExpiredCampaigns(): Promise<AutomationRunResult> {
    const result: AutomationRunResult = {
      ruleType: 'auto_end_expired',
      processed: 0,
      successful: 0,
      failed: 0,
      logs: [],
    };

    if (!this.settings.autoEndExpired) {
      return result;
    }

    const now = new Date();

    // Find active quiz campaigns that have passed end date
    const expiredQuizzes = await this.quizRepository
      .createQueryBuilder('campaign')
      .where('campaign.status = :status', { status: 'active' })
      .andWhere('campaign.endDate IS NOT NULL')
      .andWhere('campaign.endDate <= :now', { now })
      .getMany();

    for (const campaign of expiredQuizzes) {
      result.processed++;
      try {
        campaign.status = 'ended';
        await this.quizRepository.save(campaign);
        result.successful++;
        this.addLog(result.logs, 'auto_end_expired', 'quiz', campaign.id, campaign.title, 'Ended', true);
      } catch (error) {
        result.failed++;
        this.addLog(result.logs, 'auto_end_expired', 'quiz', campaign.id, campaign.title, 'Failed to end', false, String(error));
      }
    }

    // Find active survey campaigns that have passed end date
    const expiredSurveys = await this.surveyRepository
      .createQueryBuilder('campaign')
      .where('campaign.status = :status', { status: 'active' })
      .andWhere('campaign.endDate IS NOT NULL')
      .andWhere('campaign.endDate <= :now', { now })
      .getMany();

    for (const campaign of expiredSurveys) {
      result.processed++;
      try {
        campaign.status = 'ended';
        await this.surveyRepository.save(campaign);
        result.successful++;
        this.addLog(result.logs, 'auto_end_expired', 'survey', campaign.id, campaign.title, 'Ended', true);
      } catch (error) {
        result.failed++;
        this.addLog(result.logs, 'auto_end_expired', 'survey', campaign.id, campaign.title, 'Failed to end', false, String(error));
      }
    }

    // Check for surveys that reached max responses
    const maxResponseSurveys = await this.surveyRepository
      .createQueryBuilder('campaign')
      .where('campaign.status = :status', { status: 'active' })
      .andWhere('campaign.maxResponses IS NOT NULL')
      .andWhere('campaign.completionCount >= campaign.maxResponses')
      .getMany();

    for (const campaign of maxResponseSurveys) {
      result.processed++;
      try {
        campaign.status = 'ended';
        await this.surveyRepository.save(campaign);
        result.successful++;
        this.addLog(result.logs, 'auto_end_expired', 'survey', campaign.id, campaign.title, 'Ended (max responses)', true);
      } catch (error) {
        result.failed++;
        this.addLog(result.logs, 'auto_end_expired', 'survey', campaign.id, campaign.title, 'Failed to end', false, String(error));
      }
    }

    this.logs.push(...result.logs);
    return result;
  }

  /**
   * Auto-pause low engagement campaigns
   */
  async autoPauseLowEngagement(): Promise<AutomationRunResult> {
    const result: AutomationRunResult = {
      ruleType: 'auto_pause_low_engagement',
      processed: 0,
      successful: 0,
      failed: 0,
      logs: [],
    };

    if (!this.settings.autoPauseLowEngagement) {
      return result;
    }

    const threshold = this.settings.lowEngagementThreshold;
    const daysThreshold = this.settings.autoPauseDaysWithoutEngagement;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysThreshold);

    // Find active quiz campaigns with low engagement
    const lowEngagementQuizzes = await this.quizRepository
      .createQueryBuilder('campaign')
      .where('campaign.status = :status', { status: 'active' })
      .andWhere('campaign.createdAt <= :cutoff', { cutoff: cutoffDate })
      .getMany();

    for (const campaign of lowEngagementQuizzes) {
      // Calculate engagement rate
      const engagementRate = campaign.participationCount > 0
        ? (campaign.completionCount / campaign.participationCount) * 100
        : 0;

      if (engagementRate < threshold && campaign.participationCount > 10) {
        result.processed++;
        try {
          campaign.status = 'draft'; // Pause by setting to draft
          await this.quizRepository.save(campaign);
          result.successful++;
          this.addLog(result.logs, 'auto_pause_low_engagement', 'quiz', campaign.id, campaign.title, `Paused (${engagementRate.toFixed(1)}% engagement)`, true);
        } catch (error) {
          result.failed++;
          this.addLog(result.logs, 'auto_pause_low_engagement', 'quiz', campaign.id, campaign.title, 'Failed to pause', false, String(error));
        }
      }
    }

    this.logs.push(...result.logs);
    return result;
  }

  /**
   * Run all enabled automation rules
   */
  async runAllAutomation(): Promise<{
    results: AutomationRunResult[];
    totalProcessed: number;
    totalSuccessful: number;
    totalFailed: number;
  }> {
    const results: AutomationRunResult[] = [];

    results.push(await this.autoPublishScheduledCampaigns());
    results.push(await this.autoEndExpiredCampaigns());
    results.push(await this.autoPauseLowEngagement());

    const totalProcessed = results.reduce((sum, r) => sum + r.processed, 0);
    const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

    return {
      results,
      totalProcessed,
      totalSuccessful,
      totalFailed,
    };
  }

  /**
   * Helper to add log entry
   */
  private addLog(
    logs: AutomationLogEntry[],
    ruleType: AutomationRuleType,
    campaignType: 'quiz' | 'survey',
    campaignId: string,
    campaignTitle: string,
    action: string,
    success: boolean,
    error?: string
  ): void {
    logs.push({
      timestamp: new Date(),
      ruleType,
      campaignType,
      campaignId,
      campaignTitle,
      action,
      success,
      error,
    });
  }
}

/**
 * Get CampaignAutomationService singleton instance
 */
export function getCampaignAutomationService(): CampaignAutomationService {
  if (!campaignAutomationServiceInstance) {
    throw new Error(
      'CampaignAutomationService not initialized. Call initCampaignAutomationService first.'
    );
  }
  return campaignAutomationServiceInstance;
}

/**
 * Initialize CampaignAutomationService with DataSource
 */
export function initCampaignAutomationService(
  dataSource: DataSource
): CampaignAutomationService {
  campaignAutomationServiceInstance = new CampaignAutomationService(dataSource);
  return campaignAutomationServiceInstance;
}
