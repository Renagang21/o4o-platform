/**
 * TrialShippingExtension - Repository Store
 *
 * WO-MARKET-TRIAL-DB-PERSISTENCE-INTEGRATION-V1: In-Memory → DB 전환
 */

import { DataSource, Repository } from 'typeorm';
import { MarketTrialShippingAddress } from './entities/MarketTrialShippingAddress.entity.js';

let repo: Repository<MarketTrialShippingAddress>;

/**
 * DataSource 설정 (main.ts에서 호출)
 */
export function setDataSource(ds: DataSource) {
  repo = ds.getRepository(MarketTrialShippingAddress);
}

/**
 * 배송 주소 조회
 */
export async function getShippingAddress(
  participationId: string
): Promise<MarketTrialShippingAddress | null> {
  return await repo.findOne({ where: { participationId } });
}

/**
 * 배송 주소 저장 (upsert)
 */
export async function setShippingAddress(
  participationId: string,
  address: {
    recipient_name: string;
    phone: string;
    postal_code: string;
    address: string;
    address_detail?: string;
    delivery_note?: string;
  }
): Promise<MarketTrialShippingAddress> {
  const existing = await repo.findOne({ where: { participationId } });

  if (existing) {
    existing.recipientName = address.recipient_name;
    existing.phone = address.phone;
    existing.postalCode = address.postal_code;
    existing.address = address.address;
    existing.addressDetail = address.address_detail;
    existing.deliveryNote = address.delivery_note;
    return await repo.save(existing);
  }

  const entity = repo.create({
    participationId,
    recipientName: address.recipient_name,
    phone: address.phone,
    postalCode: address.postal_code,
    address: address.address,
    addressDetail: address.address_detail,
    deliveryNote: address.delivery_note,
  });

  return await repo.save(entity);
}

/**
 * 배송 주소 존재 여부 확인
 */
export async function hasShippingAddress(participationId: string): Promise<boolean> {
  const count = await repo.count({ where: { participationId } });
  return count > 0;
}

/**
 * Store 통계 (디버깅용)
 */
export async function getStoreStats() {
  const totalAddresses = await repo.count();
  return {
    totalAddresses,
  };
}

/**
 * 배송 주소를 legacy NetureShippingAddress 형식으로 변환
 */
export function toNetureFormat(addr: MarketTrialShippingAddress) {
  return {
    recipient_name: addr.recipientName,
    phone: addr.phone,
    postal_code: addr.postalCode,
    address: addr.address,
    address_detail: addr.addressDetail,
    delivery_note: addr.deliveryNote,
  };
}
