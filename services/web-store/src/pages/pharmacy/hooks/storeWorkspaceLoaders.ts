import type { LibraryAsset } from '@o4o/tablet-kiosk-core';
import { extractSnapshotMediaList, type SnapshotForMedia } from '@o4o/store-asset-policy-core';
import { getStoreExecutionAssets } from '../../../api/storeExecutionAssets';
import { assetSnapshotApi, storeAssetControlApi } from '../../../api/assetSnapshot';
import { fetchChannelOverviewWithCode, fetchStoreSlugStatus } from '../../../api/storeHub';
import { fetchProductPool, fetchTabletDisplays, fetchTabletIdlePlaylist } from '../../../api/tabletDisplays';

/** Required sources fail together, so an unavailable source never becomes an editable empty list. */
export async function loadChannelWorkspace(includeSettings = true) {
  const [overview, assets, slug] = await Promise.all([
    fetchChannelOverviewWithCode(),
    includeSettings ? storeAssetControlApi.list({ limit: 200 }) : Promise.resolve(null),
    includeSettings ? fetchStoreSlugStatus() : Promise.resolve(null),
  ]);
  if (assets && !assets.success) throw new Error('채널 자료를 불러오지 못했습니다.');
  return { overview, assets: assets?.data.items ?? null, slug };
}

export async function loadTabletWorkspace(tabletId: string) {
  const [pool, displays, idle] = await Promise.all([
    fetchProductPool(tabletId), fetchTabletDisplays(tabletId), fetchTabletIdlePlaylist(tabletId),
  ]);
  return { pool, displays, idle };
}

export async function loadIdleLibraryAssets(): Promise<LibraryAsset[]> {
    // (1) store_execution_assets
    const directAssetsP = getStoreExecutionAssets({ limit: 100 }).then((res) => {
      if (!res.success) throw new Error('자료함을 불러오지 못했습니다. 다시 시도해 주세요.');
      const items = res.data?.items ?? [];
      const out: LibraryAsset[] = [];
      for (const item of items) {
        const mime = item.mimeType ?? '';
        const isVideo = mime.startsWith('video/');
        const isImage = mime.startsWith('image/');
        if (!isVideo && !isImage) continue;
        const url = item.fileUrl ?? item.url ?? '';
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

    // (2) o4o_asset_snapshots → 미디어 추출
    const snapshotAssetsP = assetSnapshotApi
      .list({ limit: 100 })
      .then((res) => {
        if (!res.success) throw new Error('자료함을 불러오지 못했습니다.');
        const items = res?.data?.items ?? [];
        const snapshots: SnapshotForMedia[] = items.map((s) => ({
          id: s.id,
          assetType: s.assetType,
          title: s.title,
          contentJson: s.contentJson,
        }));
        return extractSnapshotMediaList(snapshots) as LibraryAsset[];
      });

    const [direct, fromSnapshots] = await Promise.all([directAssetsP, snapshotAssetsP]);

    // dedupe by url (직접 업로드 우선)
    const seen = new Set<string>();
    const merged: LibraryAsset[] = [];
    for (const a of [...direct, ...fromSnapshots]) {
      if (seen.has(a.url)) continue;
      seen.add(a.url);
      merged.push(a);
    }
    return merged;
}
