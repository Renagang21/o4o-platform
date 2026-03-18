/**
 * Store Playlist API — 매장 사이니지 플레이리스트
 *
 * WO-O4O-GLYCOPHARM-SIGNAGE-MIGRATION-V1
 * Adapted from KPA StorePlaylist API for GlycoPharm's Axios-based api client.
 */

import { api } from '@/lib/apiClient';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

export type PlaylistType = 'SINGLE' | 'LIST';
export type PlaylistPublishStatus = 'draft' | 'published';

export interface StorePlaylist {
  id: string;
  name: string;
  playlistType: PlaylistType;
  publishStatus: PlaylistPublishStatus;
  isActive: boolean;
  sourcePlaylistId: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  forcedCount: number;
}

export interface StorePlaylistItem {
  id: string;
  snapshotId: string;
  displayOrder: number;
  isForced: boolean;
  isLocked: boolean;
  forcedStartAt: string | null;
  forcedEndAt: string | null;
  createdAt: string;
  title: string;
  contentJson: Record<string, unknown>;
  assetType: string;
}

// ─────────────────────────────────────────────────────
// Playlist CRUD
// ─────────────────────────────────────────────────────

export async function fetchStorePlaylists(): Promise<StorePlaylist[]> {
  const res = await api.get('/glycopharm/store-playlists');
  return (res.data as { success: boolean; data: StorePlaylist[] }).data ?? [];
}

export async function createStorePlaylist(
  name: string,
  playlistType: PlaylistType = 'LIST',
): Promise<StorePlaylist> {
  const res = await api.post('/glycopharm/store-playlists', { name, playlistType });
  return (res.data as { success: boolean; data: StorePlaylist }).data;
}

export async function updateStorePlaylist(
  id: string,
  updates: { name?: string; publishStatus?: PlaylistPublishStatus; isActive?: boolean },
): Promise<StorePlaylist> {
  const res = await api.patch(`/glycopharm/store-playlists/${id}`, updates);
  return (res.data as { success: boolean; data: StorePlaylist }).data;
}

export async function deleteStorePlaylist(id: string): Promise<void> {
  await api.delete(`/glycopharm/store-playlists/${id}`);
}

// ─────────────────────────────────────────────────────
// Playlist Items
// ─────────────────────────────────────────────────────

export async function fetchPlaylistItems(playlistId: string): Promise<StorePlaylistItem[]> {
  const res = await api.get(`/glycopharm/store-playlists/${playlistId}/items`);
  return (res.data as { success: boolean; data: StorePlaylistItem[] }).data ?? [];
}

export async function addPlaylistItem(
  playlistId: string,
  snapshotId: string,
): Promise<StorePlaylistItem> {
  const res = await api.post(`/glycopharm/store-playlists/${playlistId}/items`, { snapshotId });
  return (res.data as { success: boolean; data: StorePlaylistItem }).data;
}

export async function addPlaylistItemFromLibrary(
  playlistId: string,
  libraryItemId: string,
): Promise<StorePlaylistItem> {
  const res = await api.post(`/glycopharm/store-playlists/${playlistId}/items/from-library`, { libraryItemId });
  return (res.data as { success: boolean; data: StorePlaylistItem }).data;
}

export async function reorderPlaylistItems(
  playlistId: string,
  order: string[],
): Promise<void> {
  await api.patch(`/glycopharm/store-playlists/${playlistId}/items/reorder`, { order });
}

export async function deletePlaylistItem(
  playlistId: string,
  itemId: string,
): Promise<void> {
  await api.delete(`/glycopharm/store-playlists/${playlistId}/items/${itemId}`);
}
