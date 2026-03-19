/**
 * Store Playlist API — Neture
 *
 * WO-O4O-SIGNAGE-STORE-ACTION-EXPANSION-V1
 * Adapted from GlycoPharm StorePlaylist API for Neture's api client.
 */

import { api } from '../apiClient';

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
  const res = await api.get('/neture/store-playlists');
  return (res.data as { success: boolean; data: StorePlaylist[] }).data ?? [];
}

export async function createStorePlaylist(
  name: string,
  playlistType: PlaylistType = 'LIST',
): Promise<StorePlaylist> {
  const res = await api.post('/neture/store-playlists', { name, playlistType });
  return (res.data as { success: boolean; data: StorePlaylist }).data;
}

export async function updateStorePlaylist(
  id: string,
  updates: { name?: string; publishStatus?: PlaylistPublishStatus; isActive?: boolean },
): Promise<StorePlaylist> {
  const res = await api.patch(`/neture/store-playlists/${id}`, updates);
  return (res.data as { success: boolean; data: StorePlaylist }).data;
}

export async function deleteStorePlaylist(id: string): Promise<void> {
  await api.delete(`/neture/store-playlists/${id}`);
}

// ─────────────────────────────────────────────────────
// Playlist Items
// ─────────────────────────────────────────────────────

export async function fetchPlaylistItems(playlistId: string): Promise<StorePlaylistItem[]> {
  const res = await api.get(`/neture/store-playlists/${playlistId}/items`);
  return (res.data as { success: boolean; data: StorePlaylistItem[] }).data ?? [];
}

export async function addPlaylistItem(
  playlistId: string,
  snapshotId: string,
): Promise<StorePlaylistItem> {
  const res = await api.post(`/neture/store-playlists/${playlistId}/items`, { snapshotId });
  return (res.data as { success: boolean; data: StorePlaylistItem }).data;
}

export async function reorderPlaylistItems(
  playlistId: string,
  order: string[],
): Promise<void> {
  await api.patch(`/neture/store-playlists/${playlistId}/items/reorder`, { order });
}

export async function deletePlaylistItem(
  playlistId: string,
  itemId: string,
): Promise<void> {
  await api.delete(`/neture/store-playlists/${playlistId}/items/${itemId}`);
}
