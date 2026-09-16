/**
 * Store Workspace Home — Pharmacy Hub (WO-O4O-STORE-WORKSPACE-INTEGRATION-AND-MY-SERVICES-V1 §10)
 *
 * 공통 StoreWorkspaceHomeView 를 조립만 한다. 매장 이름은 기존 store-dashboard 계약에서 읽는다 (새 API 0).
 */
import { useEffect, useState } from 'react';
import { StoreWorkspaceHomeView } from '@o4o/store-ui-core';
import { BRAND } from '../../config/service';
import { fetchStoreDashboard } from '../../lib/api/pharmacyHubOrders';
import { PHARMACY_HUB_STORE_WORKSPACE_PATHS } from '../../layouts/StoreOwnerShell';

export default function StoreOwnerWorkspaceHomePage() {
  const [storeName, setStoreName] = useState<string | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    fetchStoreDashboard()
      .then((d) => {
        if (alive && d.store.status === 'connected' && d.store.name) setStoreName(d.store.name);
      })
      .catch(() => {
        /* 이름을 못 읽어도 업무공간 Home 은 그대로 보인다 (조회 실패 ≠ 매장 없음) */
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <StoreWorkspaceHomeView
      paths={PHARMACY_HUB_STORE_WORKSPACE_PATHS}
      accent="blue"
      storeName={storeName}
      serviceName={BRAND.name}
    />
  );
}
