/**
 * RecruitmentExposureApprovalPage (KPA) — 판매자 모집 노출 승인
 *
 * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1
 *
 * kpa-society serviceKey 로 고정된 per-service proxy(/api/v1/kpa/operator/recruitment-exposure)를
 * 자기 서비스 operator scope(kpa:operator)로 호출. 공통 RecruitmentExposureConsole 렌더.
 *
 * WO-O4O-OPERATOR-RECRUITMENT-EXPOSURE-STANDARD-LIST-ADOPTION-V1 (최소 개선):
 *   카드 승인 큐 유지. exposureStatus 필터 + URL sync(recruitmentExposure_status) + 기본 pending.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RecruitmentExposureConsole, type RecruitmentExposureItem } from '@o4o/operator-ux-core';
import { apiClient } from '../../api/client';

const BASE = '/operator/recruitment-exposure';
const URL_KEY = 'recruitmentExposure_status';
const DEFAULT_STATUS = 'pending';

export default function RecruitmentExposureApprovalPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<string>(
    () => searchParams.get(URL_KEY) || DEFAULT_STATUS,
  );
  const [items, setItems] = useState<RecruitmentExposureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = filterStatus && filterStatus !== 'all' ? `?exposureStatus=${filterStatus}` : '';
      const res = await apiClient.get<{ success: boolean; data: RecruitmentExposureItem[] }>(`${BASE}${qs}`);
      setItems(res?.data ?? []);
    } catch {
      // 조회 실패를 빈 목록(=승인 대상 없음)으로 위장하지 않는다 — 오류 + 재시도 노출
      setItems([]);
      setError('노출 승인 대상을 불러오지 못했습니다.');
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
        await apiClient.patch(`${BASE}/${id}/${action}`, { note });
        await load();
      } catch {
        window.alert('처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
      setBusyId(null);
    },
    [load],
  );

  // 조회 실패는 빈 목록이 아니라 오류 상태로 구분 표시 (공용 콘솔 계약 미변경 — 페이지 레벨 처리)
  if (error && !loading) {
    return (
      <div className="max-w-4xl p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">판매자 모집 노출 승인</h1>
        </div>
        <div className="py-16 text-center text-red-600 rounded-xl border border-red-200 bg-red-50">
          <p className="text-sm">{error}</p>
          <button
            onClick={() => void load()}
            className="mt-3 px-4 py-1.5 text-xs text-red-700 border border-red-300 rounded-lg hover:bg-red-100"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

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
