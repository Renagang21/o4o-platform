/**
 * RecruitmentApplicationsPage — 신청·승인 현황 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §7
 *   KPA / GlycoPharm / K-Cosmetics 가 이미 쓰는 service-neutral 계약
 *   (GET /neture/partner/applications/mine · POST .../:id/cancel) 을 그대로 채택한다.
 *   조회 실패를 0건으로 위장하지 않는다(4상태 계약).
 */
import { useCallback, useEffect, useState } from 'react';
import { StoreRecruitmentApplicationsView, type StoreRecruitmentApplicationRow } from '@o4o/store-ui-core';
import { LoadError } from '@o4o/ui';
import { api } from '../../lib/apiClient';

export default function RecruitmentApplicationsPage() {
  const [rows, setRows] = useState<StoreRecruitmentApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await api.get('/neture/partner/applications/mine');
      setRows(res.data?.data ?? []);
    } catch {
      setLoadError(true);
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
        await api.post(`/neture/partner/applications/${applicationId}/cancel`);
        await load();
      } catch {
        window.alert('신청 취소에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
      setCancellingId(null);
    },
    [load],
  );

  if (loadError && !loading) {
    return <LoadError onRetry={() => void load()} />;
  }

  return (
    <StoreRecruitmentApplicationsView
      applications={rows}
      loading={loading}
      onCancelApplication={handleCancel}
      cancellingId={cancellingId}
    />
  );
}
