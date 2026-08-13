/**
 * HubSignageLibraryPage — GlycoPharm Store HUB 사이니지 라이브러리
 *
 * WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-WRAPPER-V1: wrapper page 초기 추가
 * WO-O4O-GLYCOPHARM-STORE-HUB-SIGNAGE-CANONICAL-ALIGNMENT-V1: KPA canonical 패턴 이식
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   KPA·K-Cosmetics 와 동일했던 580L 사본을 공통 `useSignageLibrary` + `SignageLibraryView` 로 대체.
 *   이 파일은 이제 **API adapter + 서비스 config** 만 소유한다. 화면 동작·API 계약 무변경.
 *
 * 데이터 소스 (변경 없음):
 *   - hubContentApi.list({ sourceDomain: 'signage-media' | 'signage-playlist' })
 *   - assetSnapshotApi.copy({ assetType: 'signage' }) → /glycopharm/assets/copy
 *
 * ── 사이니지 구조 원칙 (WO-O4O-SIGNAGE-STRUCTURE-CONSOLIDATION-V1) ──
 * 1. Hub = 원본 (signage_media, signage_playlists)
 * 2. Store = snapshot 조합 (o4o_asset_snapshots → store_playlist_items)
 * 3. clone 사용 금지 — assetSnapshotApi.copy() 단일 경로만 사용
 * 4. Playlist가 유일한 재생 단위 (store_playlists)
 */

import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SignageLibraryView, useSignageLibrary } from '@o4o/store-ui-core';
import type { SignageProducerTab } from '@o4o/store-ui-core';
import { assetSnapshotApi } from '@/api/assetSnapshot';
import { hubContentApi } from '@/api/hubContent';
import type { HubContentItemResponse } from '@o4o/types/hub-content';
import { SIGNAGE_MEDIA_TYPE_LABELS } from '@o4o/types/signage';
import { HUB_PRODUCER_LABELS } from '@o4o/types/hub-content';

// WO-O4O-SUPPLIER-CONTENT-PRODUCER-UI-CLEANUP-V1 (2026-05-23):
//   'supplier' 는 PLATFORM-CONTENT-POLICY-V1 §6.3 기준 Legacy / 명문화된 예외.
//   UI 필터 옵션에서 제거 — Legacy supplier 콘텐츠는 '전체' 탭에서만 노출.
const PRODUCER_TABS: readonly SignageProducerTab[] = [
  { key: 'all', label: '전체' },
  { key: 'operator', label: '운영자' },
  { key: 'community', label: '커뮤니티' },
] as const;

const OWNER_LABEL = '내 약국';

async function fetchDomain(
  sourceDomain: string,
  query: { page: number; limit: number },
): Promise<{ items: HubContentItemResponse[]; total: number }> {
  const res = await hubContentApi.list({ sourceDomain, page: query.page, limit: query.limit });
  if (!res.success) return { items: [], total: 0 };
  return { items: res.data || [], total: res.pagination?.total || 0 };
}

export function HubSignageLibraryPage() {
  const fetchMedia = useCallback(
    (q: { page: number; limit: number }) => fetchDomain('signage-media', q),
    [],
  );
  const fetchPlaylists = useCallback(
    (q: { page: number; limit: number }) => fetchDomain('signage-playlist', q),
    [],
  );
  const copyOne = useCallback(async (item: HubContentItemResponse) => {
    const res = await assetSnapshotApi.copy({ sourceAssetId: item.id, assetType: 'signage' });
    return { title: res?.data?.title };
  }, []);

  const messages = useMemo(
    () => ({
      mediaLoadError: '미디어 목록을 불러오지 못했습니다.',
      playlistLoadError: '플레이리스트 목록을 불러오지 못했습니다.',
      copySuccess: (item: HubContentItemResponse) =>
        `"${item.title}" 이(가) ${OWNER_LABEL}에 추가되었습니다.`,
      copyDuplicate: '이미 매장에 추가된 항목입니다.',
      copyForbidden: '추가 권한이 없습니다. 매장 계정으로 로그인되어 있는지 확인하세요.',
      copyFailed: (reason: string) => `매장 추가에 실패했습니다. (${reason})`,
      bulkSuccess: (n: number) => `${n}개 항목이 ${OWNER_LABEL}에 추가되었습니다.`,
      bulkFailed: (n: number) => `${n}개 항목 추가에 실패했습니다.`,
    }),
    [],
  );

  const core = useSignageLibrary<HubContentItemResponse>({
    fetchMedia,
    fetchPlaylists,
    copyOne,
    messages,
  });

  return (
    <SignageLibraryView
      core={core}
      accent="blue"
      ownerLabel={OWNER_LABEL}
      title="플랫폼 디지털사이니지"
      description="매장 화면에 송출할 콘텐츠와 플레이리스트를 탐색하고 내 약국에 추가합니다."
      tableId="store-hub-signage"
      producerTabs={PRODUCER_TABS}
      guide={{ href: '/store/marketing/signage', linkLabel: '디지털사이니지 운영 화면' }}
      mediaTypeLabels={SIGNAGE_MEDIA_TYPE_LABELS}
      producerLabels={HUB_PRODUCER_LABELS}
      renderLink={({ to, className, children }) => (
        <Link to={to} className={className}>
          {children}
        </Link>
      )}
    />
  );
}

export default HubSignageLibraryPage;
