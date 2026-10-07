/**
 * SignagePlayerSelectPage — K-Cosmetics
 * WO-O4O-KCOSMETICS-SIGNAGE-PLAYER-V1
 *
 * /store/marketing/signage/player
 * 게시된 플레이리스트 목록 → 새 탭 fullscreen 재생
 *
 * WO-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1:
 *   화면 본체를 @o4o/store-ui-core 의 SignagePlayerSelectView 로 이관 (accent class 만 서비스 소유).
 */

import { SignagePlayerSelectView } from '@o4o/store-ui-core';
import { fetchStorePlaylists } from '../../../api/storePlaylist';

export function SignagePlayerSelectPage() {
  return (
    <SignagePlayerSelectView
      fetchStorePlaylists={fetchStorePlaylists}
      // store.neture.co.kr 이식(§21-15): 송출 화면도 K-Cosmetics 서비스 경로(chrome-free route)로 연다
      playPathPrefix="/work/k-cosmetics/store/marketing/signage/play"
      playButtonClassName="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-pink-600 text-white hover:bg-pink-700 transition-colors"
      searchInputClassName="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
    />
  );
}
