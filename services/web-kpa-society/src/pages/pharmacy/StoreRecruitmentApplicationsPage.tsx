/**
 * StoreRecruitmentApplicationsPage (KPA) — 신청·승인 현황
 *
 * WO-O4O-CROSSSERVICE-STORE-SELLER-RECRUITMENT-APPLICATION-STATUS-VIEW-V1
 * 기존 GET /neture/partner/applications/mine(neture 도메인, 본인 신청) 를 coreApiClient(/api/v1)로 조회.
 * WO-O4O-SELLER-RECRUITMENT-APPLICATION-CANCEL-V1: pending 신청 본인 취소.
 * WO-O4O-KPA-STORE-SILENT-ERROR-UX-STANDARDIZATION-V1:
 *   조회 실패를 `setRows([])` 로 삼켜 "신청 내역 없음"으로 위장하던 문제 수정.
 *   실패 = 오류 상태(재시도 제공), 성공 0건 = 빈 상태로 분리한다.
 *   StoreRecruitmentApplicationsView(@o4o/store-ui-core) 는 error 계약이 없어 래퍼에서 표시한다(공통 패키지 미변경).
 */
import { useCallback, useEffect, useState } from 'react';
import { StoreRecruitmentApplicationsView, type StoreRecruitmentApplicationRow } from '@o4o/store-ui-core';
import { coreApiClient } from '../../api/client';

export default function StoreRecruitmentApplicationsPage() {
  const [rows, setRows] = useState<StoreRecruitmentApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await coreApiClient.get<{ success: boolean; data: StoreRecruitmentApplicationRow[] }>(
        '/neture/partner/applications/mine',
      );
      setRows(res?.data ?? []);
    } catch {
      // 실패 시 기존 rows 를 지우지 않는다 — 재조회 실패라면 직전 목록을 그대로 유지한다.
      setLoadError('신청·승인 현황을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
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

  // 조회 실패 + 표시할 데이터 없음 → 빈 상태 문구 대신 오류 상태(재시도)
  if (!loading && loadError && rows.length === 0) {
    return (
      <div style={ERROR_BOX}>
        <p style={ERROR_TITLE}>신청·승인 현황을 불러오지 못했습니다.</p>
        <p style={ERROR_DESC}>잠시 후 다시 시도해 주세요.</p>
        <button type="button" onClick={() => void load()} style={RETRY_BTN}>다시 시도</button>
      </div>
    );
  }

  return (
    <>
      {/* 기존 목록이 있는 상태의 재조회 실패 — 데이터는 유지하고 상단에만 안내 */}
      {loadError && rows.length > 0 && (
        <div style={INLINE_ERROR}>
          <span>최신 현황을 불러오지 못했습니다. 아래는 마지막으로 불러온 내용입니다.</span>
          <button type="button" onClick={() => void load()} style={INLINE_RETRY_BTN}>다시 시도</button>
        </div>
      )}
      <StoreRecruitmentApplicationsView
        applications={rows}
        loading={loading}
        onCancelApplication={handleCancel}
        cancellingId={cancellingId}
      />
    </>
  );
}

const ERROR_BOX: React.CSSProperties = {
  textAlign: 'center',
  padding: 48,
  backgroundColor: '#FEF2F2',
  border: '1px solid #FECACA',
  borderRadius: 8,
};
const ERROR_TITLE: React.CSSProperties = { fontSize: '1rem', fontWeight: 600, color: '#991B1B', margin: 0 };
const ERROR_DESC: React.CSSProperties = { fontSize: '0.875rem', color: '#B91C1C', margin: '8px 0 0' };
const RETRY_BTN: React.CSSProperties = {
  marginTop: 16,
  padding: '8px 18px',
  border: '1px solid #FCA5A5',
  borderRadius: 6,
  backgroundColor: '#fff',
  color: '#991B1B',
  fontSize: '0.875rem',
  cursor: 'pointer',
};
const INLINE_ERROR: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  marginBottom: 16,
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid #FECACA',
  backgroundColor: '#FEF2F2',
  color: '#991B1B',
  fontSize: '0.85rem',
};
const INLINE_RETRY_BTN: React.CSSProperties = {
  border: '1px solid #FCA5A5',
  borderRadius: 6,
  backgroundColor: '#fff',
  color: '#991B1B',
  fontSize: '0.8rem',
  padding: '4px 12px',
  cursor: 'pointer',
  flexShrink: 0,
};
