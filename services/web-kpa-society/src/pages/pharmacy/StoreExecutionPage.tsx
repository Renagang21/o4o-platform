/**
 * StoreExecutionPage (KPA 내 약국) — 매장 실행 현황
 * WO-O4O-STORE-EXECUTION-HOME-TABLET-QR-V1
 *
 * "어디에서 무엇이 지금 사용 중인가" 만 보여준다. 제작·편집은 이 화면에 없다 —
 * 바꾸려면 각 위치 묶음의 링크로 태블릿 화면 제작 · QR 화면에 간다.
 *
 * 화면 본체는 공통 Core(`@o4o/store-ui-core` StoreExecutionHomeView) 다.
 * Pharmacy-Hub 의 `/store-owner/execution` 과 **같은 파일**을 쓰고,
 * 이 페이지는 데이터 · 링크 · 색만 준다 (serviceKey 분기 0).
 * 신규 집계 엔드포인트를 만들지 않고 기존 목록 API 두 개를 합성한다.
 */

import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import {
  StoreExecutionHomeView,
  type StoreExecutionGroup,
  type StoreExecutionQrInput,
  type StoreExecutionTabletInput,
} from '@o4o/store-ui-core';
import { colors } from '../../styles/theme';
import { fetchTablets } from '../../api/tabletDisplays';
import { getStoreQrCodes } from '../../api/storeQr';

const KPA_EXECUTION_PALETTE = { primary: colors.primary };

const linkStyle = { color: colors.primary, fontSize: 13, textDecoration: 'none' } as const;

export default function StoreExecutionPage() {
  const [tablets, setTablets] = useState<StoreExecutionTabletInput[]>([]);
  const [qrs, setQrs] = useState<StoreExecutionQrInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetchTablets(),
      // 내린 QR 도 받는다 — '중지' 는 숨길 상태가 아니라 보여줄 상태다.
      getStoreQrCodes({ page: 1, limit: 200, includeInactive: true }),
    ])
      .then(([t, qrRes]) => {
        setTablets(
          // 내린 태블릿은 매장에 없는 기기다 — 위치 묶음에 넣지 않는다.
          t
            .filter((x) => x.is_active !== false)
            .map((x) => ({
              id: x.id,
              name: x.name,
              location: x.location ?? null,
              isActive: x.is_active !== false,
              currentScreenSetId: x.currentScreenSetId ?? null,
            })),
        );
        setQrs(
          (qrRes.data?.items ?? []).map((q) => ({
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
        setError(null);
      })
      .catch((e: any) => {
        setError(e?.message || '매장 실행 현황을 불러오지 못했습니다.');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const groupLinks = (group: StoreExecutionGroup) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {group.tablets.length > 0 && (
        <Link to="/store/commerce/tablet-displays" style={linkStyle}>
          태블릿 화면 제작
        </Link>
      )}
      {group.qrs.length > 0 && (
        <Link to="/store/marketing/qr" style={linkStyle}>
          QR 관리
        </Link>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: 1024, margin: '0 auto', padding: '24px 16px' }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 20,
              fontWeight: 700,
              color: colors.gray900,
              margin: 0,
            }}
          >
            <MapPin size={20} color={colors.primary} />
            실행 현황
          </h1>
          <p style={{ marginTop: 6, fontSize: 14, color: colors.gray500 }}>
            약국 어디에서 무엇이 지금 쓰이고 있는지 위치별로 보여줍니다. 만들기·수정은 각 화면에서 합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          style={{
            border: `1px solid ${colors.gray200}`,
            borderRadius: 6,
            background: '#FFFFFF',
            padding: '8px 16px',
            fontSize: 14,
            color: colors.gray500,
            cursor: 'pointer',
          }}
        >
          새로고침
        </button>
      </div>

      {error && <p style={{ marginBottom: 16, fontSize: 14, color: '#DC2626' }}>{error}</p>}

      <StoreExecutionHomeView
        tablets={tablets}
        qrs={qrs}
        loading={loading}
        palette={KPA_EXECUTION_PALETTE}
        renderGroupLinks={groupLinks}
        emptyAction={
          <Link to="/store/commerce/tablet-displays" style={linkStyle}>
            태블릿 화면 제작으로 가기
          </Link>
        }
      />
    </div>
  );
}
