/**
 * SignagePlayerSelectPage — 디지털사이니지 TV 재생 대상 선택 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8
 *   KPA / GlycoPharm / K-Cosmetics 와 **같은 공통 View** 를 소비하는 thin adapter.
 *   PharmacyHub 의 매장 셸 basePath 는 `/store-owner` 라 재생 경로만 prop 으로 주입한다
 *   (공통 View 의 기본값 `/store/marketing/signage/play` 는 그대로 보존).
 */
import { SignagePlayerSelectView, type SignageSelectPlaylist } from '@o4o/store-ui-core';
import { fetchPlaylists } from '../../lib/api/pharmacyHubStoreSignage';

async function fetchStorePlaylists(): Promise<SignageSelectPlaylist[]> {
  const res = await fetchPlaylists();
  return res.items.map((p) => ({
    id: p.id,
    name: p.name,
    itemCount: p.itemCount,
    playlistType: p.playlistType,
    publishStatus: p.publishStatus,
  }));
}

export default function SignagePlayerSelectPage() {
  return (
    <SignagePlayerSelectView
      fetchStorePlaylists={fetchStorePlaylists}
      playPathPrefix="/store-owner/signage/play"
    />
  );
}
