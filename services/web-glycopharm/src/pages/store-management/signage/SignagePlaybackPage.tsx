/**
 * SignagePlaybackPage — GlycoPharm
 * WO-O4O-GLYCOPHARM-SIGNAGE-PHASE1-V1
 *
 * /store/marketing/signage/play/:playlistId
 * 플레이리스트 전체화면 재생 (자체 타이머 기반 순환)
 *
 * WO-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1:
 *   화면 본체를 @o4o/store-ui-core 의 SignagePlaybackView 로 이관.
 *   이 파일은 serviceKey 를 품은 조회 adapter + accent class 만 담는 thin adapter 다.
 *
 * SERVICE_KEY: 'glycopharm'
 */

import { SignagePlaybackView, type SignagePlaybackApi } from '@o4o/store-ui-core';
import { publicContentApi } from '@/lib/api/signageV2';
import { api, API_BASE_URL } from '@/lib/apiClient';

const SERVICE_KEY = 'glycopharm';
const SIGNAGE_BASE = `${API_BASE_URL}/api/signage/${SERVICE_KEY}`;

const playbackApi: SignagePlaybackApi = {
  fetchOwnedPlaylist: async (playlistId) => {
    const res = await api.get(`${SIGNAGE_BASE}/playlists/${playlistId}`);
    return ((res.data as any)?.data ?? res.data) as any;
  },
  fetchPublicPlaylist: (playlistId) =>
    publicContentApi.getPlaylist(playlistId) as any,
};

export default function SignagePlaybackPage() {
  return (
    <SignagePlaybackView
      api={playbackApi}
      fullscreenButtonClassName="flex items-center justify-center gap-2 w-full px-5 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-colors"
    />
  );
}
