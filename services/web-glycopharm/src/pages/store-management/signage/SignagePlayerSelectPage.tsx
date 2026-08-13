/**
 * SignagePlayerSelectPage — GlycoPharm
 * WO-KPA-STORE-SIGNAGE-IA-RESTRUCTURE-V2
 *
 * /store/marketing/signage/player
 * 게시된 플레이리스트 목록 → 새 탭 fullscreen 재생
 *
 * WO-O4O-MY-STORE-CROSSSERVICE-FINAL-COMMONIZATION-AUDIT-AND-CLEANUP-V1:
 *   화면 본체를 @o4o/store-ui-core 의 SignagePlayerSelectView 로 이관 (accent class 만 서비스 소유).
 */

import { SignagePlayerSelectView } from '@o4o/store-ui-core';
import { fetchStorePlaylists } from '@/api/storePlaylist';

export function SignagePlayerSelectPage() {
  return (
    <SignagePlayerSelectView
      fetchStorePlaylists={fetchStorePlaylists}
      playButtonClassName="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors"
      searchInputClassName="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
    />
  );
}
