/**
 * TrialShippingExtension - In-Memory Store
 *
 * H8-2: Trial 참여자 배송 주소 저장소
 * Phase 1: In-Memory Store (서버 재시작 시 데이터 유실)
 *
 * @package H8-2 - TrialShippingExtension
 */

import { NetureShippingAddress } from '../../routes/neture/entities/neture-order.entity.js';

/**
 * In-Memory Store
 * Key: participationId
 * Value: NetureShippingAddress
 */
const shippingAddressStore: Map<string, NetureShippingAddress> = new Map();

/**
 * 배송 주소 조회
 */
export function getShippingAddress(
    participationId: string
): NetureShippingAddress | undefined {
    return shippingAddressStore.get(participationId);
}

/**
 * 배송 주소 저장
 */
export function setShippingAddress(
    participationId: string,
    address: NetureShippingAddress
): void {
    shippingAddressStore.set(participationId, address);
}

/**
 * 배송 주소 존재 여부 확인
 */
export function hasShippingAddress(participationId: string): boolean {
    return shippingAddressStore.has(participationId);
}

/**
 * Store 통계 (디버깅용)
 */
export function getStoreStats() {
    return {
        totalAddresses: shippingAddressStore.size,
        participationIds: Array.from(shippingAddressStore.keys()),
    };
}
