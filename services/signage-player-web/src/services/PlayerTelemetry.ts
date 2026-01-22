/**
 * PlayerTelemetry
 *
 * Sprint 2-4: Enhanced heartbeat and playback logging
 * - Batch logging with retry
 * - Offline queue persistence
 * - Performance metrics collection
 * - Error tracking
 *
 * Phase 2: Digital Signage Production Upgrade
 */

import type { HeartbeatPayload, PlaybackLogEntry } from '../types/signage';

// ============================================================================
// Constants
// ============================================================================

const PLAYER_VERSION = '2.0.0';
const LOG_QUEUE_KEY = 'signage-player-log-queue';
const MAX_QUEUE_SIZE = 100;
const BATCH_SIZE = 10;
const RETRY_DELAYS = [1000, 5000, 15000, 30000]; // Progressive retry delays

// ============================================================================
// Types
// ============================================================================

interface TelemetryConfig {
  apiUrl: string;
  serviceKey: string;
  channelId: string;
  heartbeatIntervalMs: number;
  batchIntervalMs: number;
  enabled: boolean;
}

interface QueuedLogEntry {
  id: string;
  entry: PlaybackLogEntry;
  attempts: number;
  createdAt: number;
}

interface PerformanceMetrics {
  memoryMb?: number;
  cpuPercent?: number;
  networkType?: string;
  batteryLevel?: number;
  fps?: number;
  bufferHealth?: number;
}

const DEFAULT_CONFIG: Partial<TelemetryConfig> = {
  heartbeatIntervalMs: 60000,
  batchIntervalMs: 30000,
  enabled: true,
};

// ============================================================================
// PlayerTelemetry Class
// ============================================================================

export class PlayerTelemetry {
  private config: TelemetryConfig;
  private playerId: string;
  private startTime: number;
  private heartbeatTimer: number | null = null;
  private batchTimer: number | null = null;
  private logQueue: QueuedLogEntry[] = [];
  private currentPlaylistId: string | null = null;
  private currentMediaId: string | null = null;
  private isPlaying: boolean = false;
  private lastHeartbeatSuccess: boolean = true;

  constructor(
    config: Partial<TelemetryConfig> & Pick<TelemetryConfig, 'apiUrl' | 'serviceKey' | 'channelId'>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config } as TelemetryConfig;
    this.playerId = this.generatePlayerId();
    this.startTime = Date.now();
    this.loadQueueFromStorage();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Start telemetry collection
   */
  start(): void {
    if (!this.config.enabled) return;

    // Send initial heartbeat
    this.sendHeartbeat();

    // Start heartbeat loop
    this.heartbeatTimer = window.setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatIntervalMs);

    // Start batch processing loop
    this.batchTimer = window.setInterval(() => {
      this.processBatch();
    }, this.config.batchIntervalMs);
  }

  /**
   * Stop telemetry collection
   */
  stop(): void {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.batchTimer !== null) {
      window.clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush remaining logs
    this.processBatch();
  }

  /**
   * Update current playback state
   */
  updatePlaybackState(playlistId: string | null, mediaId: string | null, isPlaying: boolean): void {
    this.currentPlaylistId = playlistId;
    this.currentMediaId = mediaId;
    this.isPlaying = isPlaying;
  }

  /**
   * Log a playback event
   */
  logPlayback(entry: Omit<PlaybackLogEntry, 'channelId'>): void {
    if (!this.config.enabled) return;

    const fullEntry: PlaybackLogEntry = {
      ...entry,
      channelId: this.config.channelId,
    };

    this.queueLog(fullEntry);
  }

  /**
   * Log playback start
   */
  logPlaybackStart(playlistId: string, mediaId: string): void {
    this.updatePlaybackState(playlistId, mediaId, true);
  }

  /**
   * Log playback end
   */
  logPlaybackEnd(
    playlistId: string,
    mediaId: string,
    durationSec: number,
    completed: boolean,
    errorMessage?: string
  ): void {
    this.logPlayback({
      playlistId,
      mediaId,
      durationSec,
      completed,
      playedAt: new Date().toISOString(),
      errorMessage,
    });
  }

  /**
   * Force send heartbeat immediately
   */
  async forceHeartbeat(): Promise<boolean> {
    return this.sendHeartbeat();
  }

  /**
   * Get telemetry status
   */
  getStatus(): {
    playerId: string;
    uptimeSec: number;
    queueSize: number;
    lastHeartbeatSuccess: boolean;
  } {
    return {
      playerId: this.playerId,
      uptimeSec: Math.round((Date.now() - this.startTime) / 1000),
      queueSize: this.logQueue.length,
      lastHeartbeatSuccess: this.lastHeartbeatSuccess,
    };
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    this.stop();
    this.saveQueueToStorage();
  }

  // ============================================================================
  // Heartbeat
  // ============================================================================

  private async sendHeartbeat(): Promise<boolean> {
    try {
      const metrics = this.collectMetrics();
      const payload: HeartbeatPayload = {
        channelId: this.config.channelId,
        playerId: this.playerId,
        playerVersion: PLAYER_VERSION,
        deviceType: this.detectDeviceType(),
        platform: this.detectPlatform(),
        uptimeSec: Math.round((Date.now() - this.startTime) / 1000),
        currentPlaylistId: this.currentPlaylistId || undefined,
        currentMediaId: this.currentMediaId || undefined,
        isPlaying: this.isPlaying,
        metrics,
      };

      const response = await fetch(
        `${this.config.apiUrl}/api/signage/${this.config.serviceKey}/channels/${this.config.channelId}/heartbeat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );

      this.lastHeartbeatSuccess = response.ok;
      return response.ok;
    } catch (error) {
      console.debug('[PlayerTelemetry] Heartbeat failed:', error);
      this.lastHeartbeatSuccess = false;
      return false;
    }
  }

  // ============================================================================
  // Playback Logging
  // ============================================================================

  private queueLog(entry: PlaybackLogEntry): void {
    const queuedEntry: QueuedLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entry,
      attempts: 0,
      createdAt: Date.now(),
    };

    this.logQueue.push(queuedEntry);

    // Trim queue if too large
    if (this.logQueue.length > MAX_QUEUE_SIZE) {
      this.logQueue = this.logQueue.slice(-MAX_QUEUE_SIZE);
    }

    // Save to storage for persistence
    this.saveQueueToStorage();
  }

  private async processBatch(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const batch = this.logQueue.slice(0, BATCH_SIZE);
    const entries = batch.map((q) => q.entry);

    try {
      const response = await fetch(
        `${this.config.apiUrl}/api/signage/${this.config.serviceKey}/channels/${this.config.channelId}/playback-logs`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs: entries }),
        }
      );

      if (response.ok) {
        // Remove successfully sent entries
        const sentIds = new Set(batch.map((q) => q.id));
        this.logQueue = this.logQueue.filter((q) => !sentIds.has(q.id));
        this.saveQueueToStorage();
      } else {
        // Mark as failed and retry later
        this.handleBatchFailure(batch);
      }
    } catch (error) {
      console.debug('[PlayerTelemetry] Batch send failed:', error);
      this.handleBatchFailure(batch);
    }
  }

  private handleBatchFailure(batch: QueuedLogEntry[]): void {
    for (const entry of batch) {
      const queueEntry = this.logQueue.find((q) => q.id === entry.id);
      if (queueEntry) {
        queueEntry.attempts++;

        // Remove if too many attempts
        if (queueEntry.attempts > RETRY_DELAYS.length) {
          this.logQueue = this.logQueue.filter((q) => q.id !== entry.id);
        }
      }
    }
    this.saveQueueToStorage();
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  private saveQueueToStorage(): void {
    try {
      localStorage.setItem(LOG_QUEUE_KEY, JSON.stringify(this.logQueue));
    } catch (error) {
      console.debug('[PlayerTelemetry] Failed to save queue:', error);
    }
  }

  private loadQueueFromStorage(): void {
    try {
      const stored = localStorage.getItem(LOG_QUEUE_KEY);
      if (stored) {
        this.logQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.debug('[PlayerTelemetry] Failed to load queue:', error);
      this.logQueue = [];
    }
  }

  // ============================================================================
  // Metrics Collection
  // ============================================================================

  private collectMetrics(): PerformanceMetrics {
    const metrics: PerformanceMetrics = {};

    // Memory (Chrome only)
    if ((performance as any).memory) {
      metrics.memoryMb = Math.round(
        (performance as any).memory.usedJSHeapSize / 1024 / 1024
      );
    }

    // Network type
    if ((navigator as any).connection) {
      metrics.networkType = (navigator as any).connection.effectiveType;
    }

    // Battery (if available)
    if ((navigator as any).getBattery) {
      (navigator as any).getBattery().then((battery: any) => {
        metrics.batteryLevel = Math.round(battery.level * 100);
      });
    }

    return metrics;
  }

  private detectDeviceType(): string {
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes('tizen') || ua.includes('webos')) {
      return 'tv';
    }
    if (ua.includes('android')) {
      if (ua.includes('tv') || ua.includes('aftm') || ua.includes('aftb')) {
        return 'tv';
      }
      return 'kiosk';
    }
    return 'web';
  }

  private detectPlatform(): string {
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes('tizen')) return 'tizen';
    if (ua.includes('webos')) return 'webos';
    if (ua.includes('android')) return 'android';
    if (ua.includes('chrome')) return 'chrome';
    if (ua.includes('firefox')) return 'firefox';
    if (ua.includes('safari')) return 'safari';
    if (ua.includes('edge')) return 'edge';
    return 'unknown';
  }

  private generatePlayerId(): string {
    // Try to get persistent ID from storage
    const storedId = localStorage.getItem('signage-player-id');
    if (storedId) return storedId;

    // Generate new ID
    const newId = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('signage-player-id', newId);
    return newId;
  }
}

// ============================================================================
// Error Tracker
// ============================================================================

export class ErrorTracker {
  private config: { apiUrl: string; serviceKey: string; channelId: string };
  private errorQueue: Array<{ error: Error; context: Record<string, unknown>; timestamp: number }> = [];
  private maxQueueSize = 20;

  constructor(config: { apiUrl: string; serviceKey: string; channelId: string }) {
    this.config = config;
    this.setupGlobalHandler();
  }

  /**
   * Track an error
   */
  track(error: Error, context: Record<string, unknown> = {}): void {
    this.errorQueue.push({
      error,
      context,
      timestamp: Date.now(),
    });

    // Trim queue
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue = this.errorQueue.slice(-this.maxQueueSize);
    }

    // Send immediately
    this.sendError(error, context);
  }

  /**
   * Get recent errors
   */
  getRecentErrors(): Array<{ message: string; context: Record<string, unknown>; timestamp: number }> {
    return this.errorQueue.map((e) => ({
      message: e.error.message,
      context: e.context,
      timestamp: e.timestamp,
    }));
  }

  private setupGlobalHandler(): void {
    window.onerror = (_message, source, lineno, colno, error) => {
      if (error) {
        this.track(error, { source, lineno, colno });
      }
      return false;
    };

    window.onunhandledrejection = (event) => {
      const error = event.reason instanceof Error
        ? event.reason
        : new Error(String(event.reason));
      this.track(error, { type: 'unhandledrejection' });
    };
  }

  private async sendError(error: Error, context: Record<string, unknown>): Promise<void> {
    try {
      await fetch(
        `${this.config.apiUrl}/api/signage/${this.config.serviceKey}/channels/${this.config.channelId}/errors`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
          }),
        }
      );
    } catch (err) {
      // Silently ignore send failures
      console.debug('[ErrorTracker] Failed to send error:', err);
    }
  }
}

// Export singleton factories
let telemetryInstance: PlayerTelemetry | null = null;
let errorTrackerInstance: ErrorTracker | null = null;

export function getPlayerTelemetry(
  config?: Partial<TelemetryConfig> & Pick<TelemetryConfig, 'apiUrl' | 'serviceKey' | 'channelId'>
): PlayerTelemetry {
  if (!telemetryInstance && config) {
    telemetryInstance = new PlayerTelemetry(config);
  }
  if (!telemetryInstance) {
    throw new Error('PlayerTelemetry not initialized. Call with config first.');
  }
  return telemetryInstance;
}

export function getErrorTracker(
  config?: { apiUrl: string; serviceKey: string; channelId: string }
): ErrorTracker {
  if (!errorTrackerInstance && config) {
    errorTrackerInstance = new ErrorTracker(config);
  }
  if (!errorTrackerInstance) {
    throw new Error('ErrorTracker not initialized. Call with config first.');
  }
  return errorTrackerInstance;
}

export function resetTelemetry(): void {
  if (telemetryInstance) {
    telemetryInstance.dispose();
    telemetryInstance = null;
  }
  errorTrackerInstance = null;
}
