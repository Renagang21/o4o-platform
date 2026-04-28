/**
 * Event Offer Organization Resolver
 *
 * WO-O4O-EVENT-OFFER-CREATE-SERVICE-CAPSULE-V1
 *
 * "어느 조직(organization_id)으로 OPL을 생성할 것인가" 결정 로직.
 *
 * 책임 분리:
 *   - service(EventOfferService.createListing): 비즈니스 로직(검증, INSERT)
 *   - helper(이 파일):                          조직 매핑 정책 (서비스별)
 *
 * 정책:
 *   - supplier 제안 (KPA Event Offer): KPA 운영 조직(공통) 사용
 *   - operator 직접 등록 (KPA Event Offer): 운영자 본인 조직 우선, 없으면 KPA 운영 조직
 *
 * 향후 K-Cosmetics 등 신규 서비스 추가 시 (serviceKey, roleType) 분기를 이 파일에 추가.
 */

import type { DataSource } from 'typeorm';
import { SERVICE_KEYS } from '../../../constants/service-keys.js';

export interface ResolveOrganizationInput {
  dataSource: DataSource;
  userId: string;
  roleType: 'supplier' | 'operator';
  serviceKey: string;
}

/**
 * Event Offer 생성용 organization_id 결정.
 * 매칭되는 정책이 없으면 null 반환 — controller에서 ORG_UNAVAILABLE로 처리.
 */
export async function resolveOrganizationForEventOffer(
  input: ResolveOrganizationInput,
): Promise<string | null> {
  const { dataSource, userId, roleType, serviceKey } = input;

  // ── KPA Event Offer (kpa-groupbuy) ────────────────────────────────────────
  if (serviceKey === SERVICE_KEYS.KPA_GROUPBUY) {
    if (roleType === 'supplier') {
      // 공급자 제안 OPL — KPA 운영 조직(공통) 사용
      return await resolveKpaOperatorOrgFallback(dataSource);
    }
    if (roleType === 'operator') {
      // 운영자 직접 등록 — 본인 조직 우선, 없으면 KPA 공통 운영 조직
      const ownRows = await dataSource.query(
        `SELECT organization_id FROM kpa_members
         WHERE user_id = $1 AND organization_id IS NOT NULL LIMIT 1`,
        [userId],
      );
      if (ownRows[0]?.organization_id) return ownRows[0].organization_id;
      return await resolveKpaOperatorOrgFallback(dataSource);
    }
  }

  // ── K-Cosmetics Event Offer (k-cosmetics-event-offer) ────────────────────
  // WO-O4O-EVENT-OFFER-KCOS-CREATE-V1
  if (serviceKey === SERVICE_KEYS.K_COSMETICS_EVENT_OFFER) {
    if (roleType === 'operator') {
      // 사용자가 멤버인 organization 중 K-Cos에 enroll된 active 조직을 매핑.
      // KPA의 kpa_members와 달리 K-Cos는 단일 매핑 테이블이 없으므로
      // organization_members + organization_service_enrollments를 join.
      const rows = await dataSource.query(
        `SELECT om.organization_id
         FROM organization_members om
         JOIN organization_service_enrollments ose
           ON ose.organization_id = om.organization_id
          AND ose.service_code = $2
          AND ose.status = 'active'
         WHERE om.user_id = $1
           AND om.role IN ('owner','admin','manager')
           AND om.left_at IS NULL
         LIMIT 1`,
        [userId, SERVICE_KEYS.K_COSMETICS],
      );
      return rows[0]?.organization_id ?? null;
    }
    // supplier 분기는 K-Cos supplier 매핑 메커니즘이 명확해질 때까지 미구현
    // (별도 IR에서 결정 — WO-O4O-EVENT-OFFER-KCOS-CREATE-V1 §2)
    return null;
  }

  // ── 향후 추가 ─────────────────────────────────────────────────────────────
  // if (serviceKey === SERVICE_KEYS.EVENT_OFFER_NETURE) { ... }

  return null;
}

/**
 * KPA 운영자 역할 기준 공통 organization_id 조회.
 */
async function resolveKpaOperatorOrgFallback(dataSource: DataSource): Promise<string | null> {
  const rows = await dataSource.query(
    `SELECT organization_id FROM kpa_members
     WHERE role = 'operator' AND organization_id IS NOT NULL LIMIT 1`,
  );
  return rows[0]?.organization_id ?? null;
}
