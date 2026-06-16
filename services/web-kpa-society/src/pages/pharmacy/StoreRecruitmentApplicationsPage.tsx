/**
 * StoreRecruitmentApplicationsPage (KPA) — 신청·승인 현황
 *
 * WO-O4O-CROSSSERVICE-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1
 * 기존 GET /neture/partner/applications/mine(neture 도메인, 본인 신청) 를 coreApiClient(/api/v1)로 조회.
 * WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1: pending 신청 본인 취소.
 */
import { useCallback, useEffect, useState } from 'react';
import { StoreRecruitmentApplicationsView, type StoreRecruitmentApplicationRow } from '@o4o/store-ui-core';
import { coreApiClient } from '../../api/client';

export default function StoreRecruitmentApplicationsPage() {
  const [rows, setRows] = useState<StoreRecruitmentApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = useCallback(
    async (applicationId: string) => {
      if (!window.confirm('이 신청을 취소하면 공급자가 더 이상 해당 신청을 심사하지 않습니다.\n취소하시겠습니까?')) return;
      setCancellingId(applicationId);
      try {
        await coreApiClient.post(`/neture/partner/applications/${applicationId}/cancel`);
        await load();
      } catch {
        window.alert('신청 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
      setCancellingId(null);
    },
    [load],
  );

  return (
    <StoreRecruitmentApplicationsView
      applications={rows}
      loading={loading}
      onCancelApplication={handleCancel}
      cancellingId={cancellingId}
    />
  );
}
