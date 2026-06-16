/**
 * StoreRecruitmentApplicationsPage (K-Cosmetics) — 신청·승인 현황
 *
 * WO-O4O-CROSSSERVICE-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1
 * 기존 GET /neture/partner/applications/mine(본인 신청) 를 authClient.api(/api/v1)로 조회.
 */
import { useEffect, useState } from 'react';
import { StoreRecruitmentApplicationsView, type StoreRecruitmentApplicationRow } from '@o4o/store-ui-core';
import { api } from '../../lib/apiClient';

export default function StoreRecruitmentApplicationsPage() {
  const [rows, setRows] = useState<StoreRecruitmentApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.get('/neture/partner/applications/mine');
        setRows(res.data?.data ?? []);
      } catch {
        setRows([]);
      }
      setLoading(false);
    })();
  }, []);

  return <StoreRecruitmentApplicationsView applications={rows} loading={loading} />;
}
