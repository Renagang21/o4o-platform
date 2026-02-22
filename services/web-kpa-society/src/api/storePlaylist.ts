/**
 * Store Playlist API — 매장 사이니지 플레이리스트
 *
 * WO-O4O-SIGNAGE-STORE-PLAYLIST-ENGINE-V1
 */

import { apiClient } from './client';

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
  const response = await apiClient.get<{ success: boolean; data: StorePlaylist[] }>(
    '/store-playlists',
  );
  return response.data ?? [];
}

export async function createStorePlaylist(
  name: string,
  playlistType: PlaylistType = 'LIST',
): Promise<StorePlaylist> {
  const response = await apiClient.post<{ success: boolean; data: StorePlaylist }>(
    '/store-playlists',
    { name, playlistType },
  );
  return response.data;
}

export async function updateStorePlaylist(
  id: string,
  updates: { name?: string; publishStatus?: PlaylistPublishStatus; isActive?: boolean },
): Promise<StorePlaylist> {
  const response = await apiClient.patch<{ success: boolean; data: StorePlaylist }>(
    `/store-playlists/${id}`,
    updates,
  );
  return response.data;
}

export async function deleteStorePlaylist(id: string): Promise<void> {
  await apiClient.delete(`/store-playlists/${id}`);
}

// ─────────────────────────────────────────────────────
// Playlist Items
// ─────────────────────────────────────────────────────

export async function fetchPlaylistItems(playlistId: string): Promise<StorePlaylistItem[]> {
  const response = await apiClient.get<{ success: boolean; data: StorePlaylistItem[] }>(
    `/store-playlists/${playlistId}/items`,
  );
  return response.data ?? [];
}

export async function addPlaylistItem(
  playlistId: string,
  snapshotId: string,
): Promise<StorePlaylistItem> {
  const response = await apiClient.post<{ success: boolean; data: StorePlaylistItem }>(
    `/store-playlists/${playlistId}/items`,
    { snapshotId },
  );
  return response.data;
}

export async function reorderPlaylistItems(
  playlistId: string,
  order: string[],
): Promise<void> {
  await apiClient.patch(`/store-playlists/${playlistId}/items/reorder`, { order });
}

export async function deletePlaylistItem(
  playlistId: string,
  itemId: string,
): Promise<void> {
  await apiClient.delete(`/store-playlists/${playlistId}/items/${itemId}`);
}
