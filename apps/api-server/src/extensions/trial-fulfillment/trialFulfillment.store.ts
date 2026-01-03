/**
 * TrialFulfillmentExtension - In-Memory Store
 *
 * H8-3: Trial 참여자 Fulfillment 상태 관리
 * Phase 1: In-Memory Store (서버 재시작 시 데이터 유실)
 *
 * @package H8-3 - TrialFulfillmentExtension
 */

/**
 * Fulfillment Status (Extension 내부 상태)
 *
 * 상태 전이:
 * pending → address_collected → order_created → shipped → delivered → fulfilled
 */
export type FulfillmentStatus =
    | 'pending'           // 초기 상태 (참여 완료, 이행 대기)
    | 'address_collected' // 배송 주소 수집 완료
    | 'order_created'     // 주문 생성 완료
    | 'shipped'           // 배송 시작
    | 'delivered'         // 배송 완료
    | 'fulfilled';        // 최종 이행 완료 (Trial Core 동기화)

/**
 * Fulfillment Record
 */
export interface FulfillmentRecord {
    participationId: string;
    trialId: string;
    status: FulfillmentStatus;
    orderId?: string;              // NetureOrder ID (order_created 이후)
    orderNumber?: string;          // NetureOrder Number
    createdAt: string;
    updatedAt: string;
    statusHistory: StatusTransition[];
}

/**
 * Status Transition Log
 */
export interface StatusTransition {
    from: FulfillmentStatus;
    to: FulfillmentStatus;
    timestamp: string;
    reason?: string;
}

/**
 * In-Memory Store
 * Key: participationId
 * Value: FulfillmentRecord
 */
const fulfillmentStore: Map<string, FulfillmentRecord> = new Map();

/**
 * 상태 전이 유효성 검사
 * @param from 현재 상태
 * @param to 목표 상태
 * @returns 유효한 전이인지 여부
 */
export function isValidTransition(from: FulfillmentStatus, to: FulfillmentStatus): boolean {
    const validTransitions: Record<FulfillmentStatus, FulfillmentStatus[]> = {
        pending: ['address_collected'],
        address_collected: ['order_created'],
        order_created: ['shipped'],
        shipped: ['delivered'],
        delivered: ['fulfilled'],
        fulfilled: [], // 최종 상태, 더 이상 전이 불가
    };

    return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Fulfillment 레코드 생성
 */
export function createFulfillment(
    participationId: string,
    trialId: string
): FulfillmentRecord {
    const now = new Date().toISOString();
    const record: FulfillmentRecord = {
        participationId,
        trialId,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        statusHistory: [],
    };

    fulfillmentStore.set(participationId, record);
    return record;
}

/**
 * Fulfillment 레코드 조회
 */
export function getFulfillment(participationId: string): FulfillmentRecord | undefined {
    return fulfillmentStore.get(participationId);
}

/**
 * Fulfillment 상태 업데이트
 * @param participationId 참여 ID
 * @param newStatus 새로운 상태
 * @param reason 상태 변경 사유 (선택)
 * @returns 업데이트된 레코드 또는 undefined (실패 시)
 */
export function updateFulfillmentStatus(
    participationId: string,
    newStatus: FulfillmentStatus,
    reason?: string
): FulfillmentRecord | undefined {
    const record = fulfillmentStore.get(participationId);
    if (!record) {
        return undefined;
    }

    // 상태 전이 유효성 검사
    if (!isValidTransition(record.status, newStatus)) {
        console.warn(
            `[TrialFulfillment] Invalid state transition: ${record.status} → ${newStatus} for ${participationId}`
        );
        return undefined;
    }

    const now = new Date().toISOString();

    // 상태 이력 추가
    record.statusHistory.push({
        from: record.status,
        to: newStatus,
        timestamp: now,
        reason,
    });

    record.status = newStatus;
    record.updatedAt = now;

    fulfillmentStore.set(participationId, record);
    return record;
}

/**
 * 주문 정보 연결
 */
export function linkOrder(
    participationId: string,
    orderId: string,
    orderNumber: string
): FulfillmentRecord | undefined {
    const record = fulfillmentStore.get(participationId);
    if (!record) {
        return undefined;
    }

    record.orderId = orderId;
    record.orderNumber = orderNumber;
    record.updatedAt = new Date().toISOString();

    fulfillmentStore.set(participationId, record);
    return record;
}

/**
 * Fulfillment 레코드 존재 여부 확인
 */
export function hasFulfillment(participationId: string): boolean {
    return fulfillmentStore.has(participationId);
}

/**
 * 특정 상태의 Fulfillment 목록 조회
 */
export function getFulfillmentsByStatus(status: FulfillmentStatus): FulfillmentRecord[] {
    const results: FulfillmentRecord[] = [];
    for (const record of fulfillmentStore.values()) {
        if (record.status === status) {
            results.push(record);
        }
    }
    return results;
}

/**
 * Trial ID로 Fulfillment 목록 조회
 */
export function getFulfillmentsByTrialId(trialId: string): FulfillmentRecord[] {
    const results: FulfillmentRecord[] = [];
    for (const record of fulfillmentStore.values()) {
        if (record.trialId === trialId) {
            results.push(record);
        }
    }
    return results;
}

/**
 * Order ID로 Fulfillment 조회
 */
export function getFulfillmentByOrderId(orderId: string): FulfillmentRecord | undefined {
    for (const record of fulfillmentStore.values()) {
        if (record.orderId === orderId) {
            return record;
        }
    }
    return undefined;
}

/**
 * Store 통계 (디버깅용)
 */
export function getStoreStats() {
    const statusCounts: Record<FulfillmentStatus, number> = {
        pending: 0,
        address_collected: 0,
        order_created: 0,
        shipped: 0,
        delivered: 0,
        fulfilled: 0,
    };

    for (const record of fulfillmentStore.values()) {
        statusCounts[record.status]++;
    }

    return {
        totalRecords: fulfillmentStore.size,
        byStatus: statusCounts,
        participationIds: Array.from(fulfillmentStore.keys()),
    };
}
