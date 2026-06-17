/**
 * RecruitmentExposureApprovalPage (GlycoPharm) — 판매자 모집 노출 승인
 *
 * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1
 *
 * glycopharm serviceKey 로 고정된 per-service proxy(/api/v1/glycopharm/operator/recruitment-exposure)를
 * 자기 서비스 operator scope(glycopharm:operator)로 호출. 공통 RecruitmentExposureConsole 렌더.
 *
 * WO-O4O-OPERATOR-RECRUITMENT-EXPOSURE-STANDARD-LIST-ADOPTION-V1 (최소 개선):
 *   카드 승인 큐 유지. exposureStatus 필터 + URL sync(recruitmentExposure_status) + 기본 pending.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RecruitmentExposureConsole, type RecruitmentExposureItem } from '@o4o/operator-ux-core';
import { api } from '../../lib/apiClient';

const BASE = '/glycopharm/operator/recruitment-exposure';
const URL_KEY = 'recruitmentExposure_status';
const DEFAULT_STATUS = 'pending';

export default function RecruitmentExposureApprovalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<string>(
    () => searchParams.get(URL_KEY) || DEFAULT_STATUS,
  );
  const [items, setItems] = useState<RecruitmentExposureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = filterStatus && filterStatus !== 'all' ? `?exposureStatus=${filterStatus}` : '';
      const res = await api.get(`${BASE}${qs}`);
      setItems(res.data?.data ?? []);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => { void load(); }, [load]);

  // URL query sync (default pending 은 param 생략)
  useEffect(() => {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        if (filterStatus === DEFAULT_STATUS) sp.delete(URL_KEY);
        else sp.set(URL_KEY, filterStatus);
        return sp;
      },
      { replace: true },
    );
  }, [filterStatus, setSearchParams]);

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
      audienceLabel="매장/약국 사용자"
      filterStatus={filterStatus}
      onFilterChange={setFilterStatus}
      onApprove={(id, note) => decide(id, 'approve', note)}
      onReject={(id, note) => decide(id, 'reject', note)}
    />
  );
}
