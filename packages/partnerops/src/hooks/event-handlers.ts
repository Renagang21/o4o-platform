/**
 * PartnerOps Event Handlers
 *
 * Partner-Core 이벤트 구독 및 처리
 *
 * @package @o4o/partnerops
 */

import type { DataSource, Repository } from 'typeorm';
import {
  Partner,
  PartnerConversion,
  PartnerConversionService,
  PartnerClick,
  PartnerLink,
  ConversionStatus,
} from '@o4o/partner-core';

export interface EventContext {
  dataSource: DataSource;
}

/**
 * Partner-Core 이벤트: partner.created
 * 파트너 생성 시 PartnerOps에서 후처리
 */
export async function handlePartnerCreated(
  context: EventContext,
  data: {
    partnerId: string;
    userId: string;
    name: string;
    level: string;
  }
): Promise<void> {
  console.log(`[PartnerOps] Partner created: ${data.partnerId} (${data.name})`);
  // 향후 알림, 분석 등 추가 가능
}

/**
 * Partner-Core 이벤트: partner.level-changed
 * 파트너 레벨 변경 시 알림 처리
 */
export async function handlePartnerLevelChanged(
  context: EventContext,
  data: {
    partnerId: string;
    previousLevel: string;
    newLevel: string;
  }
): Promise<void> {
  console.log(
    `[PartnerOps] Partner level changed: ${data.partnerId} (${data.previousLevel} -> ${data.newLevel})`
  );
  // 향후 레벨업 알림, 혜택 적용 등 추가 가능
}

/**
 * Partner-Core 이벤트: click.recorded
 * 클릭 기록 시 후처리 (분석용)
 */
export async function handleClickRecorded(
  context: EventContext,
  data: {
    clickId: string;
    partnerId: string;
    linkId: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> {
  console.log(`[PartnerOps] Click recorded: ${data.clickId} for partner ${data.partnerId}`);
  // 향후 실시간 대시보드 업데이트 등 추가 가능
}

/**
 * Partner-Core 이벤트: conversion.created
 * 전환 생성 시 후처리
 */
export async function handleConversionCreated(
  context: EventContext,
  data: {
    conversionId: string;
    partnerId: string;
    orderId: string;
    orderAmount: number;
    commissionAmount: number;
  }
): Promise<void> {
  console.log(
    `[PartnerOps] Conversion created: ${data.conversionId} for partner ${data.partnerId}, ` +
    `order: ${data.orderId}, amount: ${data.orderAmount}`
  );
  // 향후 실시간 대시보드 업데이트, 알림 등 추가 가능
}

/**
 * Partner-Core 이벤트: conversion.confirmed
 * 전환 확정 시 후처리
 */
export async function handleConversionConfirmed(
  context: EventContext,
  data: {
    conversionId: string;
    partnerId: string;
    commissionAmount: number;
  }
): Promise<void> {
  console.log(
    `[PartnerOps] Conversion confirmed: ${data.conversionId}, commission: ${data.commissionAmount}`
  );
  // 향후 파트너 알림 등 추가 가능
}

/**
 * Partner-Core 이벤트: commission.settled
 * 커미션 정산 완료 시 후처리
 */
export async function handleCommissionSettled(
  context: EventContext,
  data: {
    commissionId: string;
    partnerId: string;
    settlementBatchId: string;
    amount: number;
  }
): Promise<void> {
  console.log(
    `[PartnerOps] Commission settled: ${data.commissionId}, batch: ${data.settlementBatchId}`
  );
  // 향후 파트너 알림 등 추가 가능
}

/**
 * Partner-Core 이벤트: settlement.paid
 * 정산 지급 완료 시 후처리
 */
export async function handleSettlementPaid(
  context: EventContext,
  data: {
    settlementBatchId: string;
    partnerId: string;
    netAmount: number;
    paidAt: Date;
  }
): Promise<void> {
  console.log(
    `[PartnerOps] Settlement paid: ${data.settlementBatchId}, amount: ${data.netAmount}`
  );
  // 향후 파트너 알림 (이메일/SMS) 등 추가 가능
}

/**
 * Order 이벤트: order.completed
 * 주문 완료 시 Partner-Core를 통해 전환 처리
 *
 * Note: 이 핸들러는 Partner-Core의 PartnerConversionService를 사용하여
 * 전환을 생성합니다. PartnerOps는 UI 래퍼 역할만 합니다.
 */
export async function handleOrderCompleted(
  context: EventContext,
  data: {
    orderId: string;
    orderNumber?: string;
    orderAmount: number;
    sessionId?: string;
    partnerId?: string;
    clickId?: string;
    productType?: string;
  }
): Promise<void> {
  const { dataSource } = context;

  // partnerId나 sessionId, clickId 중 하나는 있어야 함
  if (!data.partnerId && !data.sessionId && !data.clickId) {
    return;
  }

  console.log(`[PartnerOps] Processing order completion: ${data.orderId}`);

  try {
    // Partner-Core repositories
    const partnerRepository = dataSource.getRepository(Partner);
    const conversionRepository = dataSource.getRepository(PartnerConversion);
    const clickRepository = dataSource.getRepository(PartnerClick);
    const linkRepository = dataSource.getRepository(PartnerLink);

    // Partner-Core 서비스 사용
    const conversionService = new PartnerConversionService(
      conversionRepository,
      clickRepository,
      linkRepository,
      partnerRepository
    );

    // sessionId가 있으면 세션 기반 전환 생성
    if (data.sessionId && !data.partnerId) {
      await conversionService.createConversionBySession(
        data.sessionId,
        data.orderId,
        data.orderNumber || '',
        data.orderAmount,
        data.productType
      );
      console.log(`[PartnerOps] Conversion recorded via session: ${data.sessionId}`);
      return;
    }

    // partnerId가 없으면 처리하지 않음
    if (!data.partnerId) {
      console.log(`[PartnerOps] No partner found for conversion`);
      return;
    }

    // Partner-Core의 전환 생성 사용
    await conversionService.createConversion({
      partnerId: data.partnerId,
      clickId: data.clickId,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      orderAmount: data.orderAmount,
      productType: data.productType,
    });

    console.log(`[PartnerOps] Conversion recorded for partner: ${data.partnerId}`);
  } catch (error) {
    console.error('[PartnerOps] Failed to record conversion:', error);
  }
}

/**
 * Event handler registry for PartnerOps
 */
export const eventHandlers = {
  // Partner-Core events
  'partner-core.partner.created': handlePartnerCreated,
  'partner-core.partner.level-changed': handlePartnerLevelChanged,
  'partner-core.click.recorded': handleClickRecorded,
  'partner-core.conversion.created': handleConversionCreated,
  'partner-core.conversion.confirmed': handleConversionConfirmed,
  'partner-core.commission.settled': handleCommissionSettled,
  'partner-core.settlement.paid': handleSettlementPaid,
  // Order events
  'order.completed': handleOrderCompleted,
};

export default eventHandlers;
