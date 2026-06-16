/**
 * RecruitmentExposureApprovalPage (K-Cosmetics) — 판매자 모집 노출 승인
 *
 * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1
 *
 * k-cosmetics serviceKey 로 고정된 per-service proxy(/api/v1/cosmetics/operator/recruitment-exposure)를
 * 자기 서비스 operator scope(cosmetics:operator)로 호출. 공통 RecruitmentExposureConsole 렌더.
 */
import { useCallback, useEffect, useState } from 'react';
import { RecruitmentExposureConsole, type RecruitmentExposureItem } from '@o4o/operator-ux-core';
import { api } from '../../lib/apiClient';

const BASE = '/cosmetics/operator/recruitment-exposure';

export default function RecruitmentExposureApprovalPage() {
  const [items, setItems] = useState<RecruitmentExposureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(BASE);
      setItems(res.data?.data ?? []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = useCallback(
    async (id: string, action: 'approve' | 'reject', note?: string) => {
      setBusyId(id);
      try {
        await api.patch(`${BASE}/${id}/${action}`, { note });
        await load();
      } catch {
        window.alert('처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
      setBusyId(null);
    },
    [load],
  );

  return (
    <RecruitmentExposureConsole
      items={items}
      loading={loading}
      busyId={busyId}
      audienceLabel="매장 사용자"
      onApprove={(id, note) => decide(id, 'approve', note)}
      onReject={(id, note) => decide(id, 'reject', note)}
    />
  );
}
