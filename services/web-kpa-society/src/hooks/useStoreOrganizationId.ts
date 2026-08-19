/**
 * useStoreOrganizationId — 내 매장 canonical organization 해석 (KPA)
 *
 * WO-O4O-KPA-SIGNAGE-CANONICAL-API-403-RESOLUTION-V1
 *
 * 왜 필요한가
 *   Signage store API(`/api/signage/kpa-society/*`)는 `X-Organization-Id` 로 넘어온
 *   조직이 **매장 조직**(organization_members owner/admin/manager + 서비스 연결)인지
 *   검사한다. 그런데 KPA signage 화면들은 `user.kpaMembership.organizationId`
 *   (= `kpa_members.organization_id`, **약사회 회원 자격 조직**)를 보내고 있었다.
 *   두 축은 같은 값이 아니며(실측: 회원 조직 ≠ 매장 조직), 정상 store_owner 도
 *   403 SIGNAGE_STORE_REQUIRED / SIGNAGE_ACCESS_DENIED 를 받았다.
 *
 *   canonical 매장 조직은 백엔드 `resolveStoreOrganization(serviceKey='kpa')` 가
 *   정한다. 프론트는 그 결과를 그대로 쓰는 기존 계약
 *   `GET /api/v1/kpa/pharmacy/store/config` 의 `organizationId` 를 사용한다.
 *   (새 API·새 계약을 만들지 않는다.)
 */

import { useEffect, useState } from 'react';
import { getStoreConfig } from '../api/pharmacyStoreConfig';

export interface StoreOrganizationState {
  /** canonical 매장 조직 id. 미해석 상태에서는 '' */
  organizationId: string;
  loading: boolean;
  /** 조회 실패 시 고정 메시지(정상 미연결과 구분) */
  error: string | null;
}

export function useStoreOrganizationId(): StoreOrganizationState {
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getStoreConfig()
      .then((cfg) => {
        if (cancelled) return;
        setOrganizationId(cfg?.organizationId || '');
      })
      .catch(() => {
        if (cancelled) return;
        setOrganizationId('');
        setError('매장 정보를 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { organizationId, loading, error };
}
