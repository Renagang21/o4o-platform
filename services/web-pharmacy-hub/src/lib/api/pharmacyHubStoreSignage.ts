/**
 * Pharmacy-Hub 디지털 사이니지 API 클라이언트
 *
 * WO-PHARMACY-HUB-STORE-EXECUTION-ASSETS-V1 (범위 D)
 *
 * 계약 (backend: controllers/pharmacy-hub/PharmacyHubStoreSignageController.ts):
 *   GET    /pharmacy-hub/store-owner/signage/playlists
 *   POST   /pharmacy-hub/store-owner/signage/playlists
 *   GET    /pharmacy-hub/store-owner/signage/sources
 *   PATCH  /pharmacy-hub/store-owner/signage/playlists/:id
 *   DELETE /pharmacy-hub/store-owner/signage/playlists/:id            (보관)
 *   GET    /pharmacy-hub/store-owner/signage/playlists/:id/items
 *   POST   /pharmacy-hub/store-owner/signage/playlists/:id/items/from-library
 *   POST   /pharmacy-hub/store-owner/signage/playlists/:id/items/from-media
 *   PATCH  /pharmacy-hub/store-owner/signage/playlists/:id/items/reorder
 *   DELETE /pharmacy-hub/store-owner/signage/playlists/:id/items/:itemId
 *
 * 원장은 공통 `store_playlists` / `store_playlist_items` / `o4o_asset_snapshots` 다 — 신규 테이블 0.
 * 항목 추가는 매장 소유 **독립 사본(스냅샷)** 을 만든다. 원본은 수정되지 않는다.
 */
import { api } from '../apiClient';
import type { StoreConnectionState } from '../../components/store-owner/StoreConnectionNotice';

const BASE = '/pharmacy-hub/store-owner/signage';

function unwrap<T>(body: any, fallbackMessage: string): T {
  if (!body?.success) {
    throw new Error(body?.error || fallbackMessage);
  }
  return body.data as T;
}

export type PlaylistType = 'SINGLE' | 'LIST';
export type PublishStatus = 'draft' | 'published';

export interface Playlist {
  id: string;
  name: string;
  playlistType: string;
  publishStatus: string;
  isActive: boolean;
  sourcePlaylistId: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  forcedCount: number;
}

export interface PlaylistItem {
  id: string;
  snapshotId: string | null;
  displayOrder: number;
  isForced: boolean;
  isLocked: boolean;
  createdAt: string;
  title?: string;
  contentJson?: any;
  assetType?: string;
}

export interface SignageSources {
  storeConnection: StoreConnectionState;
  libraryAssets: Array<{
    id: string;
    title: string;
    assetType: string;
    mimeType: string | null;
    fileUrl: string | null;
  }>;
  /** 매장 소유 signage_media. Pharmacy-Hub 는 등록 경로가 없어 보통 빈 배열이며 정상이다. */
  media: Array<{
    id: string;
    name: string;
    mediaType: string;
    sourceType: string;
    thumbnailUrl: string | null;
  }>;
}

export async function fetchPlaylists(): Promise<{
  storeConnection: StoreConnectionState;
  items: Playlist[];
}> {
  const res = await api.get(`${BASE}/playlists`);
  return unwrap(res.data, '재생 목록을 불러오지 못했습니다.');
}

export async function fetchSignageSources(): Promise<SignageSources> {
  const res = await api.get(`${BASE}/sources`);
  return unwrap<SignageSources>(res.data, '자료를 불러오지 못했습니다.');
}

export async function createPlaylist(name: string, playlistType: PlaylistType): Promise<Playlist> {
  const res = await api.post(`${BASE}/playlists`, { name, playlistType });
  return unwrap<Playlist>(res.data, '재생 목록을 만들지 못했습니다.');
}

export async function updatePlaylist(
  id: string,
  input: { name?: string; publishStatus?: PublishStatus },
): Promise<Playlist> {
  const res = await api.patch(`${BASE}/playlists/${id}`, input);
  return unwrap<Playlist>(res.data, '재생 목록을 수정하지 못했습니다.');
}

/** 보관(is_active=false). 물리 삭제가 아니다. */
export async function archivePlaylist(id: string): Promise<void> {
  const res = await api.delete(`${BASE}/playlists/${id}`);
  unwrap<unknown>(res.data, '재생 목록을 보관하지 못했습니다.');
}

export async function fetchPlaylistItems(id: string): Promise<PlaylistItem[]> {
  const res = await api.get(`${BASE}/playlists/${id}/items`);
  return unwrap<{ items: PlaylistItem[] }>(res.data, '항목을 불러오지 못했습니다.').items;
}

export async function addItemFromLibrary(playlistId: string, libraryItemId: string): Promise<void> {
  const res = await api.post(`${BASE}/playlists/${playlistId}/items/from-library`, { libraryItemId });
  unwrap<unknown>(res.data, '자료를 추가하지 못했습니다.');
}

export async function addItemFromMedia(playlistId: string, mediaId: string): Promise<void> {
  const res = await api.post(`${BASE}/playlists/${playlistId}/items/from-media`, { mediaId });
  unwrap<unknown>(res.data, '미디어를 추가하지 못했습니다.');
}

export async function reorderItems(playlistId: string, order: string[]): Promise<void> {
  const res = await api.patch(`${BASE}/playlists/${playlistId}/items/reorder`, { order });
  unwrap<unknown>(res.data, '순서를 바꾸지 못했습니다.');
}

export async function deletePlaylistItem(playlistId: string, itemId: string): Promise<void> {
  const res = await api.delete(`${BASE}/playlists/${playlistId}/items/${itemId}`);
  unwrap<unknown>(res.data, '항목을 삭제하지 못했습니다.');
}
