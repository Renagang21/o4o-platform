/**
 * TrialFulfillmentExtension - Repository Store
 *
 * WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1: In-Memory → DB 전환
 */

import { DataSource, Repository } from 'typeorm';
import {
  MarketTrialFulfillment,
  FulfillmentStatus,
  StatusTransition,
} from './entities/MarketTrialFulfillment.entity.js';

export type { FulfillmentStatus, StatusTransition };

// Re-export the entity type for controllers
export type FulfillmentRecord = MarketTrialFulfillment;

let repo: Repository<MarketTrialFulfillment>;

/**
 * DataSource 설정 (main.ts에서 호출)
 */
export function setDataSource(ds: DataSource) {
  repo = ds.getRepository(MarketTrialFulfillment);
}

/**
 * 상태 전이 유효성 검사
 */
export function isValidTransition(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
  const validTransitions: Record<FulfillmentStatus, FulfillmentStatus[]> = {
    pending: ['address_collected'],
    address_collected: ['order_created'],
    order_created: ['shipped'],
    shipped: ['delivered'],
    delivered: ['fulfilled'],
    fulfilled: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Fulfillment 레코드 생성
 */
export async function createFulfillment(
  participationId: string,
  trialId: string
): Promise<MarketTrialFulfillment> {
  const entity = repo.create({
    participationId,
    trialId,
    status: 'pending',
    statusHistory: [],
  });

  return await repo.save(entity);
}

/**
 * Fulfillment 레코드 조회
 */
export async function getFulfillment(participationId: string): Promise<MarketTrialFulfillment | null> {
  return await repo.findOne({ where: { participationId } });
}

/**
 * Fulfillment 상태 업데이트
 */
export async function updateFulfillmentStatus(
  participationId: string,
  newStatus: FulfillmentStatus,
  reason?: string
): Promise<MarketTrialFulfillment | null> {
  const record = await repo.findOne({ where: { participationId } });
  if (!record) {
    return null;
  }

  const currentStatus = record.status as FulfillmentStatus;
  if (!isValidTransition(currentStatus, newStatus)) {
    console.warn(
      `[TrialFulfillment] Invalid state transition: ${currentStatus} → ${newStatus} for ${participationId}`
    );
    return null;
  }

  const now = new Date().toISOString();

  const history: StatusTransition[] = [...(record.statusHistory || [])];
  history.push({
    from: currentStatus,
    to: newStatus,
    timestamp: now,
    reason,
  });

  record.status = newStatus;
  record.statusHistory = history;

  return await repo.save(record);
}

/**
 * 주문 정보 연결
 */
export async function linkOrder(
  participationId: string,
  orderId: string,
  orderNumber: string
): Promise<MarketTrialFulfillment | null> {
  const record = await repo.findOne({ where: { participationId } });
  if (!record) {
    return null;
  }

  record.orderId = orderId;
  record.orderNumber = orderNumber;

  return await repo.save(record);
}

/**
 * Fulfillment 레코드 존재 여부 확인
 */
export async function hasFulfillment(participationId: string): Promise<boolean> {
  const count = await repo.count({ where: { participationId } });
  return count > 0;
}

/**
 * 특정 상태의 Fulfillment 목록 조회
 */
export async function getFulfillmentsByStatus(status: FulfillmentStatus): Promise<MarketTrialFulfillment[]> {
  return await repo.find({ where: { status } });
}

/**
 * Trial ID로 Fulfillment 목록 조회
 */
export async function getFulfillmentsByTrialId(trialId: string): Promise<MarketTrialFulfillment[]> {
  return await repo.find({ where: { trialId } });
}

/**
 * Order ID로 Fulfillment 조회
 */
export async function getFulfillmentByOrderId(orderId: string): Promise<MarketTrialFulfillment | null> {
  return await repo.findOne({ where: { orderId } });
}

/**
 * Store 통계 (디버깅용)
 */
export async function getStoreStats() {
  const totalRecords = await repo.count();

  const statusCounts: Record<string, number> = {};
  const statuses: FulfillmentStatus[] = [
    'pending', 'address_collected', 'order_created', 'shipped', 'delivered', 'fulfilled',
  ];

  for (const status of statuses) {
    statusCounts[status] = await repo.count({ where: { status } });
  }

  return {
    totalRecords,
    byStatus: statusCounts,
  };
}
