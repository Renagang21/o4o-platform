/**
 * StoreExecutionPage (약국 경영자) — 매장 실행 현황
 * WO-O4O-STORE-EXECUTION-HOME-TABLET-QR-V1
 *
 * "어디에서 무엇이 지금 사용 중인가" 만 보여준다. 제작·편집은 이 화면에 없다 —
 * 바꾸려면 각 위치 묶음의 링크로 태블릿 · QR 화면에 간다.
 *
 * 화면 본체는 공통 Core(`@o4o/store-ui-core` StoreExecutionHomeView) 다.
 * KPA 와 같은 파일을 쓰고, 이 페이지는 **데이터 · 링크 · 색**만 준다.
 * 신규 집계 엔드포인트를 만들지 않고 기존 목록 API 두 개를 합성한다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  StoreExecutionHomeView,
  type StoreExecutionGroup,
  type StoreExecutionQrInput,
  type StoreExecutionTabletInput,
} from '@o4o/store-ui-core';
import { fetchTablets, isTabletActive } from '../../lib/api/pharmacyHubTablet';
import { fetchStoreQrCodes } from '../../lib/api/pharmacyHubStoreQr';
import { StoreConnectionNotice, type StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

/** PH 브랜드 accent — Core 는 색을 모른다. */
const PH_EXECUTION_PALETTE = { primary: '#2563EB' };

/** 매장 미연결·모호는 공통 라우터가 409 로 내려준다 — TabletsPage 와 같은 판정. */
function connectionFromError(e: any): StoreConnectionState | null {
  const code = e?.response?.data?.code ?? e?.code;
  if (code === 'STORE_NOT_CONNECTED') return { status: 'not_connected', candidateCount: 0 };
  if (code === 'AMBIGUOUS_STORE_CONNECTION') return { status: 'ambiguous', candidateCount: 2 };
  return null;
}

export default function StoreOwnerExecutionPage() {
  const [tablets, setTablets] = useState<StoreExecutionTabletInput[]>([]);
  const [qrs, setQrs] = useState<StoreExecutionQrInput[]>([]);
  const [connection, setConnection] = useState<StoreConnectionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchTablets(),
      // 내린 QR 도 받는다 — '중지' 는 숨길 상태가 아니라 보여줄 상태다.
      fetchStoreQrCodes({ page: 1, limit: 200, includeInactive: true }),
    ])
      .then(([t, qrPage]) => {
        setTablets(
          // 내린 태블릿은 등록 취소된 기기라 매장에 없다 — 위치 묶음에 넣지 않는다.
          t.filter(isTabletActive).map((x) => ({
            id: x.id,
            name: x.name,
            location: x.location ?? null,
            isActive: isTabletActive(x),
            currentScreenSetId: x.currentScreenSetId ?? null,
          })),
        );
        setQrs(
          qrPage.items.map((q) => ({
            id: q.id,
            title: q.title,
            slug: q.slug,
            isActive: q.isActive,
            scanCount: q.scanCount,
            landable: q.landable,
            screenSetStatus: q.screenSetStatus ?? null,
            primaryPlacement: q.primaryPlacement ?? null,
            activePlacementCount: q.activePlacementCount,
          })),
        );
        setConnection({ status: 'connected', candidateCount: 1 });
        setError(null);
      })
      .catch((e: any) => {
        const conn = connectionFromError(e);
        if (conn) {
          setConnection(conn);
          setTablets([]);
          setQrs([]);
          setError(null);
        } else {
          setError(e?.message || '매장 실행 현황을 불러오지 못했습니다.');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groupLinks = (group: StoreExecutionGroup) => (
    <div className="flex items-center gap-3 text-sm">
      {group.tablets.length > 0 && (
        <Link to="/store-owner/tablets" className="text-blue-700 hover:underline">
          태블릿 화면
        </Link>
      )}
      {group.qrs.length > 0 && (
        <Link to="/store-owner/qr" className="text-blue-700 hover:underline">
          QR 관리
        </Link>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">실행 현황</h1>
          <p className="mt-1 text-sm text-gray-500">
            매장 어디에서 무엇이 지금 쓰이고 있는지 위치별로 보여줍니다. 만들기·수정은 각 화면에서 합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          새로고침
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {connection && connection.status !== 'connected' ? (
        <StoreConnectionNotice connection={connection} subject="매장 실행 현황" />
      ) : (
        <StoreExecutionHomeView
          tablets={tablets}
          qrs={qrs}
          loading={loading}
          palette={PH_EXECUTION_PALETTE}
          renderGroupLinks={groupLinks}
          emptyAction={
            <Link to="/store-owner/tablets" className="text-sm text-blue-700 hover:underline">
              태블릿 등록하러 가기
            </Link>
          }
        />
      )}
    </div>
  );
}
