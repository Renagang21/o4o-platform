/**
 * My Services — Pharmacy Hub (WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 §7)
 *
 * 출처 = GET /api/v1/work-scope/store-services (기존 계약) · 공통 MyServicesView 조립만.
 * organizationId 는 기존 store-dashboard 계약에서 읽어 복수 매장 사용자의 ambiguous 를 피한다.
 */
import { useEffect, useState } from 'react';
import { MyServicesView, createStoreServicesApi } from '@o4o/store-ui-core';
import { api } from '../../lib/apiClient';
import { fetchStoreDashboard } from '../../lib/api/pharmacyHubOrders';
import { PHARMACY_HUB_STORE_WORKSPACE_PATHS } from '../../layouts/StoreOwnerShell';

const storeServicesApi = createStoreServicesApi({
  get: async (url) => (await api.get(url)).data,
  post: async (url, body) => (await api.post(url, body)).data,
});

export default function StoreOwnerMyServicesPage() {
  // undefined = 아직 모름(조회 중) · null = 못 읽음(서버가 단일 매장이면 스스로 해석)
  const [organizationId, setOrganizationId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetchStoreDashboard()
      .then((d) => {
        if (alive) setOrganizationId(d.store.status === 'connected' ? d.store.organizationId : null);
      })
      .catch(() => {
        if (alive) setOrganizationId(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (organizationId === undefined) return null;

  return (
    <MyServicesView
      api={storeServicesApi}
      currentServiceKey="pharmacy-hub"
      currentMyStorePath={PHARMACY_HUB_STORE_WORKSPACE_PATHS.myStore}
      organizationId={organizationId}
      accent="blue"
    />
  );
}
