/**
 * 외국인 여행객 판매지원 (매장 측 진입점) — GlycoPharm
 * WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-MENU-GATE-V1
 *
 * 공통 ForeignVisitorSalesSupportPanel(store-ui-core) + self-scoped entitlement check.
 * 결제/기능 본체는 후속 WO. 현재는 잠금/이용중 분기만.
 */
import { ForeignVisitorSalesSupportPanel } from '@o4o/store-ui-core';
import { api } from '@/lib/apiClient';

const SERVICE_KEY = 'glycopharm';
const PLAN_CODE = 'FOREIGN_VISITOR_SALES_SUPPORT';

export function ForeignVisitorSalesSupportPage() {
  return (
    <ForeignVisitorSalesSupportPanel
      check={async () => {
        const { data } = await api.get('/store-entitlements/me/check', {
          params: { serviceKey: SERVICE_KEY, planCode: PLAN_CODE },
        });
        return data?.data?.active === true;
      }}
    />
  );
}

export default ForeignVisitorSalesSupportPage;
