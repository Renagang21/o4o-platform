/**
 * Store Tablet Displays Management Page — K-Cosmetics
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 * WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1: Idle 재생 목록 편집 섹션
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1:
 *   화면 본체를 @o4o/store-ui-core 의 StoreTabletDisplaysView 로 이관.
 *   이 파일은 API adapter + Idle 편집기 주입만 담는 thin adapter 다.
 *
 * API: /store/tablets/* (platform-level, 변경 없음)
 */

import { StoreTabletDisplaysView, type StoreTabletDisplaysApi } from '@o4o/store-ui-core';
import { IdlePlaylistEditor, type IdlePlaylistItem } from '@o4o/tablet-kiosk-core';
import {
  fetchTablets,
  fetchTabletDisplays,
  fetchProductPool,
  saveTabletDisplays,
  fetchTabletIdlePlaylist,
  saveTabletIdlePlaylist,
} from '@/services/tabletDisplayApi';

const tabletApi: StoreTabletDisplaysApi<IdlePlaylistItem> = {
  fetchTablets,
  fetchProductPool,
  fetchTabletDisplays,
  saveTabletDisplays,
  fetchTabletIdlePlaylist,
  saveTabletIdlePlaylist,
};

export default function StoreTabletDisplaysPage() {
  return (
    <StoreTabletDisplaysView<IdlePlaylistItem>
      api={tabletApi}
      backTo="/store/commerce/local-products"
      renderIdleEditor={({ items, onChange, disabled }) => (
        <IdlePlaylistEditor items={items} onChange={onChange} disabled={disabled} />
      )}
    />
  );
}
