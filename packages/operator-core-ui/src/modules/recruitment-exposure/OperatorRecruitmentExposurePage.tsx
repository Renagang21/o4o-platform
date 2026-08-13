/**
 * OperatorRecruitmentExposurePage — 판매자 모집 노출 승인 (공통 페이지 셸)
 *
 * WO-O4O-SELLER-RECRUITMENT-EXPOSURE-OPERATOR-UI-V1 (원본 업무)
 * WO-O4O-OPERATOR-RECRUITMENT-EXPOSURE-STANDARD-LIST-ADOPTION-V1 (필터 + URL sync)
 * WO-O4O-OPERATOR-CROSSSERVICE-CORE-ONLY-AND-VIEW-DUPLICATION-CLEANUP-V1:
 *   KPA / K-Cosmetics / GlycoPharm 에 복제돼 있던 페이지 셸을 공통화.
 *
 * 보존:
 *   - 카드 승인 큐(RecruitmentExposureConsole) 그대로
 *   - exposureStatus 필터 + URL sync(`recruitmentExposure_status`), 기본 `pending` 은 param 생략
 *   - 조회 실패를 0건(=승인 대상 없음)으로 위장하지 않는 4상태 계약
 *
 * 에러 표면 정합: 조회 실패는 공통 `LoadError`(KCos/GP 형태), 처리 실패는 `toast.error`(KPA 형태)로
 * 수렴했다. KPA 의 자체 빨간 패널과 KCos 의 `window.alert` 는 각각 여기에 흡수된다.
 */

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RecruitmentExposureConsole } from '@o4o/operator-ux-core';
import { toast } from '@o4o/error-handling';
import { LoadError } from '@o4o/ui';
import type {
  RecruitmentExposureItem,
  OperatorRecruitmentExposurePageProps,
} from './types';

const URL_KEY = 'recruitmentExposure_status';
const DEFAULT_STATUS = 'pending';

export function OperatorRecruitmentExposurePage({
  client,
  audienceLabel,
}: OperatorRecruitmentExposurePageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterStatus, setFilterStatus] = useState<string>(
    () => searchParams.get(URL_KEY) || DEFAULT_STATUS,
  );
  const [items, setItems] = useState<RecruitmentExposureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  // 조회 실패를 0건으로 위장하지 않는다(4상태 계약: loading/error/empty/ready).
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const next = await client.list(
        filterStatus && filterStatus !== 'all' ? filterStatus : null,
      );
      setItems(next ?? []);
    } catch {
      setItems([]);
      setLoadError(true);
    }
    setLoading(false);
  }, [client, filterStatus]);

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
        await client.decide(id, action, note);
        await load();
      } catch {
        toast.error('처리에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
      setBusyId(null);
    },
    [client, load],
  );

  if (loadError && !loading) {
    return <LoadError onRetry={() => void load()} />;
  }

  return (
    <RecruitmentExposureConsole
      items={items}
      loading={loading}
      busyId={busyId}
      audienceLabel={audienceLabel}
      filterStatus={filterStatus}
      onFilterChange={setFilterStatus}
      onApprove={(id, note) => decide(id, 'approve', note)}
      onReject={(id, note) => decide(id, 'reject', note)}
    />
  );
}
