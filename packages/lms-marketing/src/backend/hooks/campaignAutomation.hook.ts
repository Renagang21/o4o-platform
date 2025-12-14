/**
 * Campaign Automation Hooks
 *
 * Event hooks for campaign lifecycle automation.
 * Phase R11: Marketing Automation System
 */

import type { DataSource } from 'typeorm';
import {
  getCampaignAutomationService,
  initCampaignAutomationService,
} from '../services/CampaignAutomationService.js';
import {
  getSupplierOnboardingService,
  initSupplierOnboardingService,
} from '../services/SupplierOnboardingService.js';

/**
 * Event types for campaign lifecycle
 */
export type CampaignEventType =
  | 'campaign_created'
  | 'campaign_published'
  | 'campaign_ended'
  | 'campaign_engagement_update';

/**
 * Campaign event data
 */
export interface CampaignEventData {
  campaignType: 'quiz' | 'survey' | 'product';
  campaignId: string;
  supplierId: string;
  action: CampaignEventType;
  data?: Record<string, unknown>;
}

/**
 * Campaign event handlers
 */
const eventHandlers: Map<CampaignEventType, ((data: CampaignEventData) => Promise<void>)[]> = new Map();

/**
 * Register an event handler
 */
export function onCampaignEvent(
  eventType: CampaignEventType,
  handler: (data: CampaignEventData) => Promise<void>
): void {
  const handlers = eventHandlers.get(eventType) || [];
  handlers.push(handler);
  eventHandlers.set(eventType, handlers);
}

/**
 * Emit a campaign event
 */
export async function emitCampaignEvent(data: CampaignEventData): Promise<void> {
  const handlers = eventHandlers.get(data.action) || [];
  for (const handler of handlers) {
    try {
      await handler(data);
    } catch (error) {
      console.error(`[CampaignAutomationHook] Error in handler for ${data.action}:`, error);
    }
  }
}

/**
 * Initialize automation hooks
 */
export function initAutomationHooks(dataSource: DataSource): void {
  // Initialize services if not already
  try {
    initCampaignAutomationService(dataSource);
  } catch {
    // Already initialized
  }

  try {
    initSupplierOnboardingService(dataSource);
  } catch {
    // Already initialized
  }

  // Handler: Update onboarding checklist when campaign is created
  onCampaignEvent('campaign_created', async (data) => {
    try {
      const onboardingService = getSupplierOnboardingService();
      // Refresh checklist progress
      await onboardingService.getOnboardingChecklist(data.supplierId);
      console.log(`[CampaignAutomationHook] Updated onboarding for supplier ${data.supplierId} after ${data.campaignType} creation`);
    } catch (error) {
      console.error('[CampaignAutomationHook] Error updating onboarding:', error);
    }
  });

  // Handler: Log campaign published event
  onCampaignEvent('campaign_published', async (data) => {
    console.log(`[CampaignAutomationHook] Campaign published: ${data.campaignType} ${data.campaignId}`);
    // Could trigger notifications, analytics updates, etc.
  });

  // Handler: Log campaign ended event
  onCampaignEvent('campaign_ended', async (data) => {
    console.log(`[CampaignAutomationHook] Campaign ended: ${data.campaignType} ${data.campaignId}`);
    // Could trigger end-of-campaign reports, notifications, etc.
  });

  // Handler: Process engagement updates
  onCampaignEvent('campaign_engagement_update', async (data) => {
    // Could trigger real-time analytics updates, notifications, etc.
    console.log(`[CampaignAutomationHook] Engagement update: ${data.campaignType} ${data.campaignId}`);
  });

  console.log('[CampaignAutomationHook] Automation hooks initialized');
}

/**
 * Schedule automation job (to be called from lifecycle activate)
 */
export function scheduleAutomationJob(dataSource: DataSource, intervalMs: number = 60000): NodeJS.Timeout {
  const automationService = initCampaignAutomationService(dataSource);

  const runAutomation = async () => {
    try {
      const result = await automationService.runAllAutomation();
      if (result.totalProcessed > 0) {
        console.log(
          `[CampaignAutomation] Processed ${result.totalProcessed} campaigns: ` +
          `${result.totalSuccessful} successful, ${result.totalFailed} failed`
        );
      }
    } catch (error) {
      console.error('[CampaignAutomation] Error running automation:', error);
    }
  };

  // Run immediately
  runAutomation();

  // Schedule periodic runs
  return setInterval(runAutomation, intervalMs);
}

/**
 * Stop scheduled automation job
 */
export function stopAutomationJob(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
  console.log('[CampaignAutomation] Automation job stopped');
}
