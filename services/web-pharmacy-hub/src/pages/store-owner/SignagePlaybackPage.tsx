/**
 * SignagePlaybackPage — 사이니지 플레이리스트 전체화면 재생 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §8
 *   /store-owner/signage/play/:playlistId — 매장 셸(header/sidebar) 밖 top-level route.
 *
 *   화면 본체는 공통 SignagePlaybackView 다. PharmacyHub 의 매장 사이니지 원장은
 *   공통 `store_playlists` / `store_playlist_items`(스냅샷) 이므로
 *   (docs/baseline/O4O-SIGNAGE-STORE-PLAYLIST-MODEL-BOUNDARY-V1 — KEEP-LEGACY),
 *   스냅샷 contentJson 을 공통 View 의 재생 item 형태로 옮기는 adapter 만 서비스가 소유한다.
 *
 *   PharmacyHub 에는 HQ/community 공개 사이니지 카탈로그(signage_media 축)가 없다.
 *   따라서 2차 공개 조회는 성공할 수 없고, 없는 API 를 호출하지 않고 즉시 실패로 답한다.
 */
import {
  SignagePlaybackView,
  type SignagePlaybackApi,
  type SignagePlaybackPlaylist,
  type SignagePlaybackItem,
} from '@o4o/store-ui-core';
import { fetchPlaylists, fetchPlaylistItems, type PlaylistItem } from '../../lib/api/pharmacyHubStoreSignage';

/** store_playlist_items 스냅샷 → 공통 재생 item */
function snapshotToPlaybackItem(item: PlaylistItem): SignagePlaybackItem {
  const cj = (item.contentJson || {}) as Record<string, unknown>;
  const mimeType = cj.mimeType as string | undefined;
  const mediaType =
    (cj.mediaType as string) || (mimeType?.startsWith('video') ? 'video' : 'image');
  const url =
    (cj.sourceUrl as string) ||
    (cj.fileUrl as string) ||
    (cj.url as string) ||
    (cj.imageUrl as string) ||
    '';
  return {
    id: item.id,
    displayOrder: item.displayOrder,
    isActive: true,
    media: {
      name: item.title,
      mediaType,
      url,
      embedId: (cj.embedId as string) || undefined,
    },
  };
}

const playbackApi: SignagePlaybackApi = {
  fetchOwnedPlaylist: async (playlistId): Promise<SignagePlaybackPlaylist | null> => {
    const [{ items: playlists }, items] = await Promise.all([
      fetchPlaylists(),
      fetchPlaylistItems(playlistId),
    ]);
    const playlist = playlists.find((p) => p.id === playlistId);
    if (!playlist) return null;
    return {
      id: playlist.id,
      name: playlist.name,
      isLoop: true,
      items: items.map(snapshotToPlaybackItem),
    };
  },
  // 공개 카탈로그 축이 없다 — 존재하지 않는 endpoint 를 호출하지 않는다.
  fetchPublicPlaylist: async () => ({ success: false }),
};

export default function SignagePlaybackPage() {
  return <SignagePlaybackView api={playbackApi} />;
}
