/**
 * 기본 가입 승인 · 정지 orchestration 의 후속 처리 (DESIGN §3-1 · §5 · §13)
 *
 * **인계 대상 — 인증 · 가입 트랙**: role 발급 · 회수와 승인 orchestration 은 인증 · 가입 트랙 소유다.
 * Store 쪽 연결(업무 영역 · slug)은 pharmacy-store-link.ts 계약을 호출한다 — 같은 로직을 다시 만들지 않는다.
 *
 * 매장 판정은 `neture_pharmacy_memberships.status='active'` 가 한다. 여기서 붙이는 role 은 그 판정을 쓰지 않는
 * 기존 소비처(JWT role 로 화면 · 콘텐츠 사본을 여는 곳)를 위한 표식이다.
 *   - role `neture:store_owner` + service_memberships('neture') ensure(F11 — membership 없이 role 금지)
 * 정지 · 종료 시 role 을 거둔다. service_memberships('neture') 는 공급자 축과 공유될 수 있어 건드리지 않는다.
 */
import type { DataSource } from 'typeorm';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import { ensureServiceMembershipsForRoles } from '../../../services/admin/service-membership-ensure.js';
import type { PharmacyStoreProvisioner } from './pharmacy-membership.service.js';
import { activatePharmacyStore, deactivatePharmacyStore } from './pharmacy-store-link.js';

export const NETURE_STORE_OWNER_ROLE = 'neture:store_owner';

export function createPharmacyStoreProvisioner(dataSource: DataSource): PharmacyStoreProvisioner {
  return {
    async activate({ userId, organizationId, pharmacyName, decidedBy }) {
      // 인증 · 가입 트랙: role 표식
      await ensureServiceMembershipsForRoles(userId, [NETURE_STORE_OWNER_ROLE]);
      await roleAssignmentService.assignRole({ userId, role: NETURE_STORE_OWNER_ROLE, assignedBy: decidedBy });
      // Store 트랙 계약
      await activatePharmacyStore(dataSource, { organizationId, pharmacyName });
    },

    async deactivate({ userId, organizationId }) {
      await roleAssignmentService.removeRole(userId, NETURE_STORE_OWNER_ROLE);
      await deactivatePharmacyStore(dataSource, organizationId);
    },
  };
}
