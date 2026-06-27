/**
 * KPA Store Owner Guard Utility
 *
 * WO-O4O-KPA-APPROVED-STORE-OWNER-AUTO-AUTHORIZATION-FIX-V1
 *
 * O4O 정책: 매장 경영자가 서비스 가입을 신청하고 운영자가 승인하면, 별도의 소유자 지정
 * 절차 없이 해당 서비스의 내 매장을 즉시 이용할 수 있다. 따라서 "매장 소유" 판정의 SSOT 는
 * 생성자(created_by_user_id) 가 아니라 **승인 결과(role_assignments.kpa:store_owner, RBAC F9)** 다.
 *
 * blog/pop/qr/video staff 컨트롤러가 created_by 를 검사하던 탓에, 승인된 경영자라도 약국 레코드
 * 생성자가 아니면 403("Not the store owner") 이 발생하던 결함을 수정한다.
 *
 * 교차 매장 차단(다른 매장 접근 금지): role 게이트 통과 후 사용자의 org 를 해석해
 * `resolvedOrg === store.id` 일 때만 허용한다.
 *
 * org 해석은 store-content.controller 의 resolveDualOrgId 선례와 동일:
 *   organization_members (isStoreOwner) 우선 → kpa_members fallback.
 *
 * 본 유틸은 KPA 전용이다. GlycoPharm / K-Cosmetics 는 호출하지 않으며, 해당 서비스의 동일
 * 패턴 정비는 별도 parity WO 로 분리한다.
 */
import type { DataSource } from 'typeorm';
import { isStoreOwner } from '../../../utils/store-owner.utils.js';
import { KpaMember } from '../../kpa/entities/kpa-member.entity.js';

/**
 * 승인된 KPA 매장 경영자가 특정 매장(store = organizations.id)의 소유자인지 판정.
 *
 * @returns true = 해당 매장 경영자(접근 허용), false = 비소유/미승인(차단)
 */
export async function kpaStoreOwnerOwnsStore(
  dataSource: DataSource,
  userId: string,
  storeId: string,
): Promise<boolean> {
  // 1) RBAC SSOT: kpa:store_owner role (승인 시 자동 부여)
  const { isOwner, organizationId } = await isStoreOwner(dataSource, userId, 'kpa');
  if (!isOwner) return false;

  // 2) org 해석: organization_members 우선, kpa_members fallback (store-content 선례 동일)
  let orgId: string | null = organizationId;
  if (!orgId) {
    const member = await dataSource
      .getRepository(KpaMember)
      .findOne({ where: { user_id: userId } });
    orgId = member?.organization_id ?? null;
  }

  // 3) 교차 매장 차단: 해석된 org 가 이 매장과 동일할 때만 허용
  return orgId != null && orgId === storeId;
}
