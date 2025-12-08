/**
 * PartnerOps Event Handlers
 *
 * Handles events from dropshipping-core and other apps
 */

import { DataSource } from 'typeorm';
import { ConversionService } from '../services/ConversionService';

export interface EventContext {
  tenantId: string;
  dataSource: DataSource;
}

/**
 * Handle order.created event
 * Records a conversion if the order was referred by a partner
 */
export async function handleOrderCreated(
  context: EventContext,
  data: {
    orderId: string;
    orderAmount: number;
    referralCode?: string;
    partnerId?: string;
    linkId?: string;
    clickId?: string;
  }
): Promise<void> {
  const { tenantId, dataSource } = context;

  // Only process if there's partner attribution
  if (!data.partnerId && !data.referralCode) {
    return;
  }

  console.log(`[PartnerOps] Processing order conversion: ${data.orderId}`);

  try {
    // Get partner ID from referral code if needed
    let partnerId = data.partnerId;
    if (!partnerId && data.referralCode) {
      const partner = await dataSource.query(
        `SELECT id FROM partnerops_partners WHERE partner_code = $1 AND tenant_id = $2`,
        [data.referralCode, tenantId]
      );
      partnerId = partner[0]?.id;
    }

    if (!partnerId) {
      console.log(`[PartnerOps] No partner found for referral`);
      return;
    }

    // Get commission settings
    const settings = await dataSource.query(
      `SELECT default_commission_rate FROM partnerops_settings WHERE tenant_id = $1`,
      [tenantId]
    );
    const commissionRate = parseFloat(settings[0]?.default_commission_rate || '5.00');

    // Record conversion
    const conversionService = new ConversionService(dataSource);
    await conversionService.recordConversion(tenantId, {
      partnerId,
      linkId: data.linkId,
      clickId: data.clickId,
      orderId: data.orderId,
      orderAmount: data.orderAmount,
      commissionRate,
    });

    console.log(`[PartnerOps] Conversion recorded for partner: ${partnerId}`);
  } catch (error) {
    console.error('[PartnerOps] Failed to record conversion:', error);
  }
}

/**
 * Handle commission.applied event
 * Updates partner conversion status
 */
export async function handleCommissionApplied(
  context: EventContext,
  data: {
    orderId: string;
    commissionId: string;
    status: string;
  }
): Promise<void> {
  const { tenantId, dataSource } = context;

  console.log(`[PartnerOps] Commission applied for order: ${data.orderId}`);

  try {
    // Update conversion status to approved
    await dataSource.query(
      `UPDATE partnerops_conversions
       SET status = 'approved'
       WHERE order_id = $1 AND tenant_id = $2 AND status = 'pending'`,
      [data.orderId, tenantId]
    );
  } catch (error) {
    console.error('[PartnerOps] Failed to update conversion status:', error);
  }
}

/**
 * Handle settlement.closed event
 * Updates partner conversion status to paid
 */
export async function handleSettlementClosed(
  context: EventContext,
  data: {
    settlementId: string;
    orderIds: string[];
  }
): Promise<void> {
  const { tenantId, dataSource } = context;

  console.log(`[PartnerOps] Settlement closed: ${data.settlementId}`);

  try {
    // Update conversions to paid status
    if (data.orderIds?.length > 0) {
      await dataSource.query(
        `UPDATE partnerops_conversions
         SET status = 'paid'
         WHERE order_id = ANY($1) AND tenant_id = $2 AND status = 'approved'`,
        [data.orderIds, tenantId]
      );
    }
  } catch (error) {
    console.error('[PartnerOps] Failed to update settlement status:', error);
  }
}

export default {
  handleOrderCreated,
  handleCommissionApplied,
  handleSettlementClosed,
};
