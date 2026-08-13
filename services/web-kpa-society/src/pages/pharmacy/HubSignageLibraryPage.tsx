/**
 * HubSignageLibraryPage — KPA Store HUB 사이니지 라이브러리
 *
 * Hub 공용공간에서 운영자가 제공하는 사이니지 미디어/플레이리스트를 탐색하고
 * "내 약국에 추가" 로 Asset Snapshot Copy 를 실행하는 페이지.
 *
 * WO-O4O-KPA-STORE-HUB-STANDARD-TABLE-AND-SIGNAGE-MENU-IA-V1: 표준 DataTable/Pagination
 * WO-O4O-KPA-STORE-HUB-UX-CONSISTENCY-CLEANUP-V1:
 *   (A-3) 현재 페이지만 정렬되는 컬럼 정렬 UI 제거 → `sortable={false}`
 *   (A-5) 값 복사형 사본 정책 안내
 *   (A-6) 가져오기 직후 사본 확인 경로 배너
 * WO-O4O-SUPPLIER-CONTENT-PRODUCER-UI-CLEANUP-V1: producer 필터에서 'supplier' 제거
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1:
 *   K-Cosmetics·GlycoPharm 과 동일했던 652L 사본을 공통 `useSignageLibrary` + `SignageLibraryView`
 *   로 대체. 위 A-3 / A-5 / A-6 결정은 config(sortable / guideText / importedTargets)로 보존한다.
 *
 * ── 사이니지 구조 원칙 (WO-O4O-SIGNAGE-STRUCTURE-CONSOLIDATION-V1) ──
 * 1. Hub = 원본 (signage_media, signage_playlists)
 * 2. Store = snapshot 조합 (o4o_asset_snapshots → store_playlist_items)
 * 3. clone 사용 금지 — assetSnapshotApi.copy() 단일 경로만 사용
 * 4. Playlist가 유일한 재생 단위 (store_playlists)
 */

import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { SignageLibraryView, useSignageLibrary } from '@o4o/store-ui-core';
import type { SignageProducerTab } from '@o4o/store-ui-core';
import { assetSnapshotApi } from '../../api/assetSnapshot';
import { hubContentApi } from '../../api/hubContent';
import type { HubContentItemResponse, HubSourceDomain } from '@o4o/types/hub-content';
import { SIGNAGE_MEDIA_TYPE_LABELS } from '@o4o/types/signage';
import { HUB_PRODUCER_LABELS } from '@o4o/types/hub-content';

const PRODUCER_TABS: readonly SignageProducerTab[] = [
  { key: 'all', label: '전체' },
  { key: 'operator', label: '운영자' },
  { key: 'community', label: '커뮤니티' },
] as const;

const OWNER_LABEL = '내 약국';
const SERVICE_KEY = 'kpa-society';

/** WO-O4O-KPA-MY-STORE-FINAL-CLEANUP-AND-CLOSEOUT-V1: legacy redirect 경유 없이 canonical 직접 연결 */
const PLAYLIST_PATH = '/store/marketing/signage/playlist';
const VIDEOS_PATH = '/store/marketing/signage/videos';

async function fetchDomain(
  sourceDomain: HubSourceDomain,
  query: { page: number; limit: number },
): Promise<{ items: HubContentItemResponse[]; total: number }> {
  const res = await hubContentApi.list({
    serviceKey: SERVICE_KEY,
    sourceDomain,
    page: query.page,
    limit: query.limit,
  });
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
    const res = await assetSnapshotApi.copy({
      sourceService: 'kpa',
      sourceAssetId: item.id,
      assetType: 'signage',
    });
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
      description="플랫폼이 제공하는 매장 화면 콘텐츠·플레이리스트를 탐색해 내 약국에 추가하거나, 내 약국 전용 플레이리스트를 직접 구성하세요."
      tableId="store-hub-signage"
      producerTabs={PRODUCER_TABS}
      guide={{ href: PLAYLIST_PATH, linkLabel: '디지털사이니지 운영 화면' }}
      mediaTypeLabels={SIGNAGE_MEDIA_TYPE_LABELS}
      producerLabels={HUB_PRODUCER_LABELS}
      /* A-3: 현재 페이지만 정렬되는 컬럼 정렬 UI 는 KPA 에서 노출하지 않는다. */
      sortable={false}
      headerAction={
        <Link
          to={PLAYLIST_PATH}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 shrink-0"
        >
          <Plus className="w-4 h-4" />
          플레이리스트 만들기
        </Link>
      }
      /* A-6: 가져오기 직후 사본 확인 경로 */
      importedTargets={{
        media: VIDEOS_PATH,
        playlist: PLAYLIST_PATH,
        mediaLabel: '내 약국 사이니지 자료함에서 보기 →',
        playlistLabel: '내 약국 플레이리스트에서 보기 →',
      }}
      renderLink={({ to, className, children }) => (
        <Link to={to} className={className}>
          {children}
        </Link>
      )}
    />
  );
}

export default HubSignageLibraryPage;
