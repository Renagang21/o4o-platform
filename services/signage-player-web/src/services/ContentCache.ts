/**
 * ContentCache
 *
 * Sprint 2-4: Offline-first caching with IndexedDB
 * - Persistent media storage
 * - LRU eviction policy
 * - Size-aware cache management
 * - Cache statistics
 *
 * Phase 2: Digital Signage Production Upgrade
 */

import type { CachedContent, CacheStats, MediaContent, Playlist } from '../types/signage';

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'signage-player-cache';
const DB_VERSION = 1;

const STORES = {
  MEDIA: 'media',
  PLAYLISTS: 'playlists',
  METADATA: 'metadata',
} as const;

// ============================================================================
// Types
// ============================================================================

interface CacheConfig {
  maxSizeMb: number;
  defaultTtlMs: number;
  cleanupIntervalMs: number;
}

interface MediaCacheEntry extends CachedContent {
  lastAccessedAt: number;
}

interface PlaylistCacheEntry {
  id: string;
  playlist: Playlist;
  cachedAt: number;
  expiresAt: number;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSizeMb: 500,
  defaultTtlMs: 60 * 60 * 1000, // 1 hour
  cleanupIntervalMs: 5 * 60 * 1000, // 5 minutes
};

// ============================================================================
// ContentCache Class
// ============================================================================

export class ContentCache {
  private db: IDBDatabase | null = null;
  private config: CacheConfig;
  private cleanupTimer: number | null = null;
  private stats: CacheStats = {
    totalSize: 0,
    itemCount: 0,
    hitRate: 0,
    missRate: 0,
    lastCleanup: 0,
  };
  private hitCount = 0;
  private missCount = 0;
  private initPromise: Promise<void> | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.openDatabase();
    await this.initPromise;
    this.startCleanupLoop();
  }

  private openDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.warn('[ContentCache] IndexedDB not supported');
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[ContentCache] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.info('[ContentCache] Database opened successfully');
        this.updateStats();
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Media store
        if (!db.objectStoreNames.contains(STORES.MEDIA)) {
          const mediaStore = db.createObjectStore(STORES.MEDIA, { keyPath: 'id' });
          mediaStore.createIndex('mediaId', 'mediaId', { unique: false });
          mediaStore.createIndex('expiresAt', 'expiresAt', { unique: false });
          mediaStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
        }

        // Playlists store
        if (!db.objectStoreNames.contains(STORES.PLAYLISTS)) {
          const playlistStore = db.createObjectStore(STORES.PLAYLISTS, { keyPath: 'id' });
          playlistStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains(STORES.METADATA)) {
          db.createObjectStore(STORES.METADATA, { keyPath: 'key' });
        }
      };
    });
  }

  // ============================================================================
  // Media Caching
  // ============================================================================

  /**
   * Cache media content
   */
  async cacheMedia(media: MediaContent): Promise<boolean> {
    if (!this.db || !media.url) return false;

    try {
      // Check if already cached and not expired
      const existing = await this.getMediaEntry(media.id);
      if (existing && existing.expiresAt > Date.now()) {
        // Update last accessed
        existing.lastAccessedAt = Date.now();
        await this.saveMediaEntry(existing);
        return true;
      }

      // Fetch the media content
      const response = await fetch(media.url);
      if (!response.ok) {
        throw new Error(`Failed to fetch media: ${response.status}`);
      }

      const blob = await response.blob();

      // Check size limits
      const currentSize = await this.getTotalSize();
      const maxBytes = this.config.maxSizeMb * 1024 * 1024;

      if (currentSize + blob.size > maxBytes) {
        // Evict old entries
        await this.evictToFit(blob.size);
      }

      const entry: MediaCacheEntry = {
        id: `media_${media.id}`,
        mediaId: media.id,
        url: media.url,
        blob,
        cachedAt: Date.now(),
        expiresAt: Date.now() + this.config.defaultTtlMs,
        size: blob.size,
        contentType: blob.type || media.mimeType || 'application/octet-stream',
        lastAccessedAt: Date.now(),
      };

      await this.saveMediaEntry(entry);
      await this.updateStats();

      return true;
    } catch (error) {
      console.error(`[ContentCache] Failed to cache media ${media.id}:`, error);
      return false;
    }
  }

  /**
   * Get cached media content
   */
  async getMedia(mediaId: string): Promise<Blob | null> {
    if (!this.db) return null;

    try {
      const entry = await this.getMediaEntry(mediaId);

      if (!entry) {
        this.missCount++;
        return null;
      }

      // Check expiration
      if (entry.expiresAt < Date.now()) {
        await this.deleteMediaEntry(entry.id);
        this.missCount++;
        return null;
      }

      // Update last accessed
      entry.lastAccessedAt = Date.now();
      await this.saveMediaEntry(entry);

      this.hitCount++;
      return entry.blob || null;
    } catch (error) {
      console.error(`[ContentCache] Failed to get media ${mediaId}:`, error);
      this.missCount++;
      return null;
    }
  }

  /**
   * Get cached media as object URL
   */
  async getMediaUrl(mediaId: string): Promise<string | null> {
    const blob = await this.getMedia(mediaId);
    return blob ? URL.createObjectURL(blob) : null;
  }

  /**
   * Check if media is cached
   */
  async hasMedia(mediaId: string): Promise<boolean> {
    if (!this.db) return false;

    const entry = await this.getMediaEntry(mediaId);
    return entry !== null && entry.expiresAt > Date.now();
  }

  // ============================================================================
  // Playlist Caching
  // ============================================================================

  /**
   * Cache playlist data
   */
  async cachePlaylist(playlist: Playlist, ttlMs?: number): Promise<boolean> {
    if (!this.db) return false;

    try {
      const entry: PlaylistCacheEntry = {
        id: playlist.id,
        playlist,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (ttlMs || this.config.defaultTtlMs),
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([STORES.PLAYLISTS], 'readwrite');
        const store = transaction.objectStore(STORES.PLAYLISTS);
        const request = store.put(entry);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error(`[ContentCache] Failed to cache playlist ${playlist.id}:`, error);
      return false;
    }
  }

  /**
   * Get cached playlist
   */
  async getPlaylist(playlistId: string): Promise<Playlist | null> {
    if (!this.db) return null;

    try {
      const entry = await this.getPlaylistEntry(playlistId);

      if (!entry) return null;

      if (entry.expiresAt < Date.now()) {
        await this.deletePlaylistEntry(playlistId);
        return null;
      }

      return entry.playlist;
    } catch (error) {
      console.error(`[ContentCache] Failed to get playlist ${playlistId}:`, error);
      return null;
    }
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hitCount + this.missCount;
    return {
      ...this.stats,
      hitRate: total > 0 ? this.hitCount / total : 0,
      missRate: total > 0 ? this.missCount / total : 0,
    };
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (!this.db) return;

    await Promise.all([
      this.clearStore(STORES.MEDIA),
      this.clearStore(STORES.PLAYLISTS),
    ]);

    this.hitCount = 0;
    this.missCount = 0;
    await this.updateStats();
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    if (!this.db) return 0;

    const now = Date.now();
    let removed = 0;

    // Cleanup expired media
    const mediaEntries = await this.getAllMediaEntries();
    for (const entry of mediaEntries) {
      if (entry.expiresAt < now) {
        await this.deleteMediaEntry(entry.id);
        removed++;
      }
    }

    // Cleanup expired playlists
    const playlistEntries = await this.getAllPlaylistEntries();
    for (const entry of playlistEntries) {
      if (entry.expiresAt < now) {
        await this.deletePlaylistEntry(entry.id);
        removed++;
      }
    }

    this.stats.lastCleanup = now;
    await this.updateStats();

    console.info(`[ContentCache] Cleanup removed ${removed} entries`);
    return removed;
  }

  /**
   * Dispose and close database
   */
  dispose(): void {
    this.stopCleanupLoop();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private startCleanupLoop(): void {
    this.stopCleanupLoop();
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  private stopCleanupLoop(): void {
    if (this.cleanupTimer !== null) {
      window.clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private async getMediaEntry(mediaId: string): Promise<MediaCacheEntry | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MEDIA], 'readonly');
      const store = transaction.objectStore(STORES.MEDIA);
      const index = store.index('mediaId');
      const request = index.get(mediaId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveMediaEntry(entry: MediaCacheEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MEDIA], 'readwrite');
      const store = transaction.objectStore(STORES.MEDIA);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteMediaEntry(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MEDIA], 'readwrite');
      const store = transaction.objectStore(STORES.MEDIA);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllMediaEntries(): Promise<MediaCacheEntry[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.MEDIA], 'readonly');
      const store = transaction.objectStore(STORES.MEDIA);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async getPlaylistEntry(playlistId: string): Promise<PlaylistCacheEntry | null> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PLAYLISTS], 'readonly');
      const store = transaction.objectStore(STORES.PLAYLISTS);
      const request = store.get(playlistId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async deletePlaylistEntry(id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PLAYLISTS], 'readwrite');
      const store = transaction.objectStore(STORES.PLAYLISTS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getAllPlaylistEntries(): Promise<PlaylistCacheEntry[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORES.PLAYLISTS], 'readonly');
      const store = transaction.objectStore(STORES.PLAYLISTS);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  private async clearStore(storeName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async getTotalSize(): Promise<number> {
    const entries = await this.getAllMediaEntries();
    return entries.reduce((total, entry) => total + entry.size, 0);
  }

  private async evictToFit(neededBytes: number): Promise<void> {
    const entries = await this.getAllMediaEntries();
    const maxBytes = this.config.maxSizeMb * 1024 * 1024;
    const currentSize = entries.reduce((total, entry) => total + entry.size, 0);

    if (currentSize + neededBytes <= maxBytes) return;

    // Sort by last accessed (oldest first) for LRU eviction
    const sorted = entries.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

    let freedBytes = 0;
    const targetFree = currentSize + neededBytes - maxBytes + (maxBytes * 0.1); // Free 10% extra

    for (const entry of sorted) {
      if (freedBytes >= targetFree) break;

      await this.deleteMediaEntry(entry.id);
      freedBytes += entry.size;
    }

    console.info(`[ContentCache] Evicted ${freedBytes} bytes to fit new content`);
  }

  private async updateStats(): Promise<void> {
    if (!this.db) return;

    const mediaEntries = await this.getAllMediaEntries();
    const playlistEntries = await this.getAllPlaylistEntries();

    this.stats.totalSize = mediaEntries.reduce((total, entry) => total + entry.size, 0);
    this.stats.itemCount = mediaEntries.length + playlistEntries.length;
  }
}

// Export singleton factory
let cacheInstance: ContentCache | null = null;

export async function getContentCache(config?: Partial<CacheConfig>): Promise<ContentCache> {
  if (!cacheInstance) {
    cacheInstance = new ContentCache(config);
    await cacheInstance.init();
  }
  return cacheInstance;
}

export function resetContentCache(): void {
  if (cacheInstance) {
    cacheInstance.dispose();
    cacheInstance = null;
  }
}
