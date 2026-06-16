/**
 * StoreRecruitmentApplicationsPage (KPA) — 신청·승인 현황
 *
 * WO-O4O-CROSSSERVICE-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1
 * 기존 GET /neture/partner/applications/mine(neture 도메인, 본인 신청) 를 coreApiClient(/api/v1)로 조회.
 */
import { useEffect, useState } from 'react';
import { StoreRecruitmentApplicationsView, type StoreRecruitmentApplicationRow } from '@o4o/store-ui-core';
import { coreApiClient } from '../../api/client';

export default function StoreRecruitmentApplicationsPage() {
  const [rows, setRows] = useState<StoreRecruitmentApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await coreApiClient.get<{ success: boolean; data: StoreRecruitmentApplicationRow[] }>(
          '/neture/partner/applications/mine',
        );
        setRows(res?.data ?? []);
      } catch {
        setRows([]);
      }
      setLoading(false);
    })();
  }, []);

  return <StoreRecruitmentApplicationsView applications={rows} loading={loading} />;
}
