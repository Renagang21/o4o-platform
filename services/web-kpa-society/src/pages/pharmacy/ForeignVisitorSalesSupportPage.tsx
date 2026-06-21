/**
 * 외국인 여행객 판매지원 (매장 측 진입점) — KPA-Society
 * WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1
 *
 * 공통 ForeignVisitorSalesSupportPanel(store-ui-core) + self-scoped entitlement check.
 * 결제/기능 본체는 후속 WO. 현재는 잠금/이용중 분기만.
 * coreApiClient 사용 — /store-entitlements 는 /api/v1/kpa 네임스페이스 밖(/api/v1)이다.
 */
import { ForeignVisitorSalesSupportPanel } from '@o4o/store-ui-core';
import { coreApiClient } from '../../api/client';

const SERVICE_KEY = 'kpa';
const PLAN_CODE = 'FOREIGN_VISITOR_SALES_SUPPORT';

export function ForeignVisitorSalesSupportPage() {
  return (
    <ForeignVisitorSalesSupportPanel
      check={async () => {
        const res = await coreApiClient.get<{ success: boolean; data?: { active?: boolean } }>(
          '/store-entitlements/me/check',
          { serviceKey: SERVICE_KEY, planCode: PLAN_CODE },
        );
        return res?.data?.active === true;
      }}
    />
  );
}

export default ForeignVisitorSalesSupportPage;
