/**
 * PlayerController
 *
 * Sprint 2-4: Production player controller component
 * - Orchestrates PlaybackEngine, ScheduleResolver, ContentCache
 * - Handles mode switching (zero-ui, minimal, preview, debug)
 * - Error recovery and reconnection
 *
 * Phase 2: Digital Signage Production Upgrade
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { PlaybackEngine, EngineState, PlaybackEventType } from '../../engine/PlaybackEngine';
import { ScheduleResolver, type ResolvedContent } from '../../services/ScheduleResolver';
import { getContentCache, type ContentCache } from '../../services/ContentCache';
import { PlayerTelemetry, ErrorTracker } from '../../services/PlayerTelemetry';
import type { PlayerConfig, PlayerMode, PlaylistItem } from '../../types/signage';
import MediaRenderer from './MediaRenderer';
import PlayerOverlay from './PlayerOverlay';
import DebugPanel from './DebugPanel';
import LoadingScreen from './LoadingScreen';
import ErrorScreen from './ErrorScreen';

// ============================================================================
// Types
// ============================================================================

interface PlayerControllerProps {
  config: PlayerConfig;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

type ControllerState =
  | 'initializing'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'empty'
  | 'error'
  | 'offline';

// ============================================================================
// PlayerController Component
// ============================================================================

export default function PlayerController({ config, onReady, onError }: PlayerControllerProps) {
  // State
  const [controllerState, setControllerState] = useState<ControllerState>('initializing');
  const [currentItem, setCurrentItem] = useState<PlaylistItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});

  // Refs
  const engineRef = useRef<PlaybackEngine | null>(null);
  const resolverRef = useRef<ScheduleResolver | null>(null);
  const cacheRef = useRef<ContentCache | null>(null);
  const telemetryRef = useRef<PlayerTelemetry | null>(null);
  const errorTrackerRef = useRef<ErrorTracker | null>(null);
  const contentRef = useRef<ResolvedContent | null>(null);

  // ============================================================================
  // Initialization
  // ============================================================================

  useEffect(() => {
    initializePlayer();

    return () => {
      cleanup();
    };
  }, [config]);

  const initializePlayer = async () => {
    try {
      setControllerState('initializing');

      // Initialize cache
      cacheRef.current = await getContentCache({
        maxSizeMb: config.maxCacheSizeMb,
        defaultTtlMs: config.cacheTtlMinutes * 60 * 1000,
      });

      // Initialize schedule resolver
      resolverRef.current = new ScheduleResolver({
        apiUrl: config.apiUrl,
        serviceKey: config.serviceKey || '',
        channelId: config.channelId,
        refreshIntervalMs: 60000,
      });

      // Initialize playback engine
      engineRef.current = new PlaybackEngine({
        preloadAhead: config.preloadCount,
        defaultDurationMs: config.defaultDuration * 1000,
        transitionDurationMs: config.transitionDuration,
        loop: config.loop,
        autoAdvance: config.autoplay,
      });

      // Setup engine events
      engineRef.current.addEventListener((event) => {
        handleEngineEvent(event);
      });

      // Initialize telemetry
      if (config.channelId) {
        telemetryRef.current = new PlayerTelemetry({
          apiUrl: config.apiUrl,
          serviceKey: config.serviceKey || '',
          channelId: config.channelId,
          heartbeatIntervalMs: config.heartbeatIntervalMs,
        });
        telemetryRef.current.start();

        errorTrackerRef.current = new ErrorTracker({
          apiUrl: config.apiUrl,
          serviceKey: config.serviceKey || '',
          channelId: config.channelId,
        });
      }

      // Setup network listeners
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Start content resolution
      await loadContent();

      onReady?.();
    } catch (error) {
      console.error('[PlayerController] Initialization failed:', error);
      setErrorMessage((error as Error).message);
      setControllerState('error');
      onError?.(error as Error);
    }
  };

  const cleanup = () => {
    engineRef.current?.dispose();
    resolverRef.current?.dispose();
    cacheRef.current?.dispose();
    telemetryRef.current?.dispose();

    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };

  // ============================================================================
  // Content Loading
  // ============================================================================

  const loadContent = async () => {
    if (!resolverRef.current || !engineRef.current) return;

    try {
      setControllerState('loading');

      const content = await resolverRef.current.resolveActiveContent();
      contentRef.current = content;

      if (content.items.length === 0) {
        setControllerState('empty');
        return;
      }

      // Preload media to cache
      if (config.enableOffline && cacheRef.current) {
        for (const item of content.items) {
          await cacheRef.current.cacheMedia(item.media);
        }
      }

      // Load into engine
      await engineRef.current.loadPlaylist(content.items);

      // Start playback if autoplay
      if (config.autoplay) {
        await engineRef.current.play();
        setControllerState('playing');
      }

      // Start auto-refresh
      resolverRef.current.startAutoRefresh((newContent) => {
        handleContentUpdate(newContent);
      });

      updateDebugInfo();
    } catch (error) {
      console.error('[PlayerController] Content load failed:', error);

      // Try offline content
      if (config.enableOffline) {
        await loadOfflineContent();
      } else {
        setErrorMessage((error as Error).message);
        setControllerState('error');
      }
    }
  };

  const loadOfflineContent = async () => {
    if (!cacheRef.current || !engineRef.current) {
      setControllerState('offline');
      return;
    }

    // Try to load from cached playlist
    const cachedPlaylist = contentRef.current?.playlist?.id
      ? await cacheRef.current.getPlaylist(contentRef.current.playlist.id)
      : null;

    if (cachedPlaylist && cachedPlaylist.items.length > 0) {
      await engineRef.current.loadPlaylist(cachedPlaylist.items);
      if (config.autoplay) {
        await engineRef.current.play();
        setControllerState('playing');
      }
    } else {
      setControllerState('offline');
    }
  };

  const handleContentUpdate = async (content: ResolvedContent) => {
    if (!engineRef.current) return;

    // Check if content actually changed
    const currentPlaylistId = contentRef.current?.playlist?.id;
    const newPlaylistId = content.playlist?.id;

    if (currentPlaylistId !== newPlaylistId || hasItemsChanged(content)) {
      contentRef.current = content;

      if (content.items.length === 0) {
        engineRef.current.stop();
        setControllerState('empty');
        return;
      }

      // Reload engine with new content
      await engineRef.current.loadPlaylist(content.items);

      if (config.autoplay && controllerState !== 'paused') {
        await engineRef.current.play();
        setControllerState('playing');
      }
    }

    updateDebugInfo();
  };

  const hasItemsChanged = (newContent: ResolvedContent): boolean => {
    const oldItems = contentRef.current?.items || [];
    const newItems = newContent.items;

    if (oldItems.length !== newItems.length) return true;

    for (let i = 0; i < oldItems.length; i++) {
      if (oldItems[i].id !== newItems[i].id) return true;
    }

    return false;
  };

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleEngineEvent = (event: any) => {
    switch (event.type) {
      case PlaybackEventType.STATE_CHANGE:
        if (event.state === EngineState.PLAYING) {
          setControllerState('playing');
        } else if (event.state === EngineState.PAUSED) {
          setControllerState('paused');
        } else if (event.state === EngineState.ERROR) {
          setControllerState('error');
        }
        break;

      case PlaybackEventType.ITEM_START:
        if (engineRef.current?.currentItem) {
          const item = contentRef.current?.items.find(
            (i) => i.id === engineRef.current?.currentItem?.playlistItemId
          );
          setCurrentItem(item || null);

          // Log playback start
          if (item && telemetryRef.current) {
            telemetryRef.current.logPlaybackStart(
              contentRef.current?.playlist?.id || '',
              item.mediaId
            );
          }
        }
        break;

      case PlaybackEventType.ITEM_END:
        // Log playback end
        if (currentItem && telemetryRef.current && contentRef.current?.playlist) {
          const engineItem = engineRef.current?.currentItem;
          const duration = engineItem?.startedAt
            ? Math.round((Date.now() - engineItem.startedAt.getTime()) / 1000)
            : 0;

          telemetryRef.current.logPlaybackEnd(
            contentRef.current.playlist.id,
            currentItem.mediaId,
            duration,
            true
          );
        }
        break;

      case PlaybackEventType.ITEM_ERROR:
        if (event.error && currentItem && telemetryRef.current && contentRef.current?.playlist) {
          telemetryRef.current.logPlaybackEnd(
            contentRef.current.playlist.id,
            currentItem.mediaId,
            0,
            false,
            event.error.message
          );
        }
        break;
    }

    updateDebugInfo();
  };

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    if (controllerState === 'offline') {
      loadContent();
    }
  }, [controllerState]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    if (controllerState !== 'playing') {
      setControllerState('offline');
    }
  }, [controllerState]);

  const handleVideoEnded = useCallback(() => {
    engineRef.current?.onVideoEnded();
  }, []);

  const handleRetry = useCallback(() => {
    loadContent();
  }, []);

  // ============================================================================
  // Debug Info
  // ============================================================================

  const updateDebugInfo = () => {
    if (!config.showDebugInfo) return;

    setDebugInfo({
      state: controllerState,
      online: isOnline,
      playlist: contentRef.current?.playlist?.name,
      schedule: contentRef.current?.schedule?.name,
      currentItem: currentItem?.media.name,
      queueStatus: engineRef.current?.getQueueStatus(),
      cacheStats: cacheRef.current?.getStats(),
      telemetryStatus: telemetryRef.current?.getStatus(),
    });
  };

  // ============================================================================
  // Controls (for non-zero-ui modes)
  // ============================================================================

  const handlePlay = useCallback(() => {
    engineRef.current?.play();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pause();
  }, []);

  const handleNext = useCallback(() => {
    engineRef.current?.next();
  }, []);

  const handlePrevious = useCallback(() => {
    engineRef.current?.previous();
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  // Loading state
  if (controllerState === 'initializing' || controllerState === 'loading') {
    return <LoadingScreen mode={config.mode} />;
  }

  // Error state
  if (controllerState === 'error') {
    return (
      <ErrorScreen
        mode={config.mode}
        message={errorMessage || 'An error occurred'}
        onRetry={handleRetry}
      />
    );
  }

  // Offline state
  if (controllerState === 'offline') {
    return (
      <ErrorScreen
        mode={config.mode}
        message="No network connection. Waiting for content..."
        onRetry={handleRetry}
        isOffline
      />
    );
  }

  // Empty state
  if (controllerState === 'empty') {
    return (
      <div className="player-empty">
        <p>No content scheduled</p>
      </div>
    );
  }

  // Playing state
  return (
    <div className="player-controller" data-mode={config.mode}>
      {/* Main content renderer */}
      {currentItem && (
        <MediaRenderer
          item={currentItem}
          cache={cacheRef.current || undefined}
          onVideoEnded={handleVideoEnded}
          muted={config.muted}
          transitionDuration={config.transitionDuration}
        />
      )}

      {/* Overlay for minimal/preview modes */}
      {config.mode !== 'zero-ui' && (
        <PlayerOverlay
          mode={config.mode}
          isPlaying={controllerState === 'playing'}
          currentItem={currentItem}
          playlistName={contentRef.current?.playlist?.name}
          onPlay={handlePlay}
          onPause={handlePause}
          onNext={handleNext}
          onPrevious={handlePrevious}
        />
      )}

      {/* Debug panel */}
      {config.mode === 'debug' && <DebugPanel info={debugInfo} />}
    </div>
  );
}
