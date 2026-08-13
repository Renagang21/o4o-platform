/**
 * Store Tablet Displays Management Page — GlycoPharm
 *
 * WO-O4O-STORE-LOCAL-PRODUCT-UI-V1
 * WO-O4O-TABLET-IDLE-PLAYLIST-EDITOR-V1: Idle 재생 목록 편집 섹션
 * WO-O4O-TABLET-IDLE-MEDIA-LIBRARY-V1 / WO-O4O-TABLET-IDLE-LIBRARY-SNAPSHOT-SUPPORT-V1:
 *   매장 자료함(store_library_items + o4o_asset_snapshots) 미디어를 Idle 후보로 제공.
 *   GlycoPharm 전용 동작이라 서비스에 남긴다.
 * WO-O4O-MY-STORE-TABLET-DISPLAYS-KCOS-GP-COMMONIZATION-V1:
 *   화면 본체를 @o4o/store-ui-core 의 StoreTabletDisplaysView 로 이관.
 *
 * API: /store/tablets/* (platform-level, 변경 없음)
 */

import { useCallback } from 'react';
import { StoreTabletDisplaysView, type StoreTabletDisplaysApi } from '@o4o/store-ui-core';
import { IdlePlaylistEditor, type IdlePlaylistItem, type LibraryAsset } from '@o4o/tablet-kiosk-core';
import { extractSnapshotMediaList, type SnapshotForMedia } from '@o4o/store-asset-policy-core';
import { getStoreLibraryItems } from '@/api/storeLibrary';
import { assetSnapshotApi } from '@/api/assetSnapshot';
import {
  fetchTablets,
  fetchTabletDisplays,
  fetchProductPool,
  saveTabletDisplays,
  fetchTabletIdlePlaylist,
  saveTabletIdlePlaylist,
} from '@/api/tabletDisplays';

const tabletApi: StoreTabletDisplaysApi<IdlePlaylistItem> = {
  fetchTablets,
  fetchProductPool,
  fetchTabletDisplays,
  saveTabletDisplays,
  fetchTabletIdlePlaylist,
  saveTabletIdlePlaylist,
};

export default function StoreTabletDisplaysPage() {
  // WO-O4O-TABLET-IDLE-MEDIA-LIBRARY-V1
  // WO-O4O-TABLET-IDLE-LIBRARY-SNAPSHOT-SUPPORT-V1: o4o_asset_snapshots 미디어 병합
  // 매장 자료함의 두 source 를 병합해 image/video LibraryAsset 으로 변환:
  //   1) store_library_items (직접 업로드)
  //   2) o4o_asset_snapshots (Community → Store snapshot copy)
  // runtime 은 url 만 사용 — assetId lookup 없음. 동일 url 은 dedupe 처리.
  const fetchIdleLibraryAssets = useCallback(async (): Promise<LibraryAsset[]> => {
    const directAssetsP = getStoreLibraryItems({ limit: 100 }).then((res) => {
      if (!res.success) return [] as LibraryAsset[];
      const items = res.data?.items ?? [];
      const out: LibraryAsset[] = [];
      for (const item of items) {
        const mime = item.mimeType ?? '';
        const isVideo = mime.startsWith('video/');
        const isImage = mime.startsWith('image/');
        if (!isVideo && !isImage) continue;
        const url = item.fileUrl ?? '';
        if (!url) continue;
        const asset: LibraryAsset = {
          id: item.id,
          title: item.title,
          type: isVideo ? 'video' : 'image',
          url,
        };
        if (item.fileUrl) asset.thumbnail = item.fileUrl;
        out.push(asset);
      }
      return out;
    });

    const snapshotAssetsP = assetSnapshotApi
      .list({ limit: 100 })
      .then((res) => {
        const items = res?.data?.items ?? [];
        const snapshots: SnapshotForMedia[] = items.map((s) => ({
          id: s.id,
          assetType: s.assetType,
          title: s.title,
          contentJson: s.contentJson,
        }));
        return extractSnapshotMediaList(snapshots) as LibraryAsset[];
      })
      .catch(() => [] as LibraryAsset[]);

    const [direct, fromSnapshots] = await Promise.all([directAssetsP, snapshotAssetsP]);

    const seen = new Set<string>();
    const merged: LibraryAsset[] = [];
    for (const a of [...direct, ...fromSnapshots]) {
      if (seen.has(a.url)) continue;
      seen.add(a.url);
      merged.push(a);
    }
    return merged;
  }, []);

  return (
    <StoreTabletDisplaysView<IdlePlaylistItem>
      api={tabletApi}
      backTo="/store/commerce/local-products"
      renderIdleEditor={({ items, onChange, disabled }) => (
        <IdlePlaylistEditor
          items={items}
          onChange={onChange}
          disabled={disabled}
          fetchLibraryAssets={fetchIdleLibraryAssets}
        />
      )}
    />
  );
}
