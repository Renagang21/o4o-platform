/**
 * Neture 기본 가입 승인 · 정지에 맞춘 매장 표식 (DESIGN §3-1 · §5)
 *
 * 매장 판정은 `neture_pharmacy_memberships.status='active'` 가 한다. 여기서 붙이는 것은 그 판정을 쓰지 않는
 * 기존 소비처를 위한 표식뿐이다.
 *   - role `neture:store_owner` + service_memberships('neture') ensure : JWT role 로 화면 · 콘텐츠 사본(F3)을 여는 소비처
 *   - organization_service_enrollments('kpa-society')                 : 매장의 약국 업무 영역(web-store 서비스 문맥 · My Services).
 *                                                                        세미프랜차이즈 가입이 아니다.
 *   - platform_store_slugs('kpa')                                      : QR · 태블릿 등 매장 공개 주소
 * 정지 · 종료 시 role 을 거두고 enrollment 를 inactive 로 둔다. service_memberships('neture') 는 공급자 축과 공유될 수
 * 있어 건드리지 않는다.
 */
import type { DataSource } from 'typeorm';
import { StoreSlugService } from '@o4o/platform-core/store-identity';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import { ensureServiceMembershipsForRoles } from '../../../services/admin/service-membership-ensure.js';
import { organizationOpsService } from '../../organization/services/organization-ops.service.js';
import {
  KPA_CANONICAL_SERVICE_CODE,
  KPA_STORE_SLUG_SERVICE_KEY,
} from '../../../routes/kpa/services/kpa-store-organization.provisioning.js';
import type { PharmacyStoreProvisioner } from './pharmacy-membership.service.js';
import logger from '../../../utils/logger.js';

export const NETURE_STORE_OWNER_ROLE = 'neture:store_owner';

export function createPharmacyStoreProvisioner(dataSource: DataSource): PharmacyStoreProvisioner {
  return {
    async activate({ userId, organizationId, pharmacyName, decidedBy }) {
      await ensureServiceMembershipsForRoles(userId, [NETURE_STORE_OWNER_ROLE]);
      await roleAssignmentService.assignRole({ userId, role: NETURE_STORE_OWNER_ROLE, assignedBy: decidedBy });
      await organizationOpsService.enrollService({ organizationId, serviceCode: KPA_CANONICAL_SERVICE_CODE });
      await dataSource.query(
        `UPDATE organization_service_enrollments SET status = 'active', updated_at = NOW()
          WHERE organization_id = $1 AND service_code = $2 AND status <> 'active'`,
        [organizationId, KPA_CANONICAL_SERVICE_CODE],
      );
      try {
        const slugService = new StoreSlugService(dataSource);
        const existing = await slugService.findByStoreId(organizationId, KPA_STORE_SLUG_SERVICE_KEY);
        if (!existing) {
          const slug = await slugService.generateUniqueSlug(pharmacyName);
          await slugService.reserveSlug({ storeId: organizationId, serviceKey: KPA_STORE_SLUG_SERVICE_KEY, slug });
        }
      } catch (err) {
        // 매장 주소 예약 실패는 비차단(기존 KPA 프로비저닝과 같은 정책).
        logger.warn('[NeturePharmacyProvisioner] store slug reservation failed', {
          organizationId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    },

    async deactivate({ userId, organizationId }) {
      await roleAssignmentService.removeRole(userId, NETURE_STORE_OWNER_ROLE);
      await dataSource.query(
        `UPDATE organization_service_enrollments SET status = 'inactive', updated_at = NOW()
          WHERE organization_id = $1 AND service_code = $2`,
        [organizationId, KPA_CANONICAL_SERVICE_CODE],
      );
    },
  };
}
