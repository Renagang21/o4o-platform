/**
 * PlayerController
 *
 * Sprint 2-4: Production player controller component
 * - Orchestrates PlaybackEngine, ScheduleResolver, ContentCache
 * - Handles mode switching (zero-ui, minimal, preview, debug)
 * - Error recovery and reconnection
 *
 * Phase 2: Digital Signage Production Upgrade
 *
 * WO-O4O-SIGNAGE-PLAYER-CORE-FULLSCREEN-START-UI-V1:
 *   재생 시작 전 "전체화면으로 재생 / 일반 화면으로 재생" 선택 화면 추가.
 *   containerRef를 단일 루트 div에 유지하여 phase 전환 후에도
 *   requestFullscreen이 동일 DOM 요소에서 동작.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { Maximize, Minimize, MonitorPlay, Play } from 'lucide-react';
import { PlaybackEngine, EngineState, PlaybackEventType } from '../../engine/PlaybackEngine';
import { ScheduleResolver, type ResolvedContent } from '../../services/ScheduleResolver';
import { getContentCache, type ContentCache } from '../../services/ContentCache';
import { PlayerTelemetry, ErrorTracker } from '../../services/PlayerTelemetry';
import type { PlayerConfig, PlaylistItem } from '../../types/signage';
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
// Fullscreen helpers
// ============================================================================

function requestFsEl(el: HTMLElement) {
  if (el.requestFullscreen) el.requestFullscreen();
  else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
}

function exitFs() {
  if (document.exitFullscreen) document.exitFullscreen();
  else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
}

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

  // WO-O4O-SIGNAGE-PLAYER-CORE-FULLSCREEN-START-UI-V1
  const [phase, setPhase] = useState<'start' | 'playing'>('start');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Refs
  const engineRef = useRef<PlaybackEngine | null>(null);
  const resolverRef = useRef<ScheduleResolver | null>(null);
  const cacheRef = useRef<ContentCache | null>(null);
  const telemetryRef = useRef<PlayerTelemetry | null>(null);
  const errorTrackerRef = useRef<ErrorTracker | null>(null);
  const contentRef = useRef<ResolvedContent | null>(null);
  // Single persistent container — requestFullscreen operates on same element across phase changes
  const containerRef = useRef<HTMLDivElement>(null);
  // phaseRef avoids stale closure in handleContentUpdate auto-refresh callback
  const phaseRef = useRef<'start' | 'playing'>('start');
  const mouseMoveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePhase = (p: 'start' | 'playing') => {
    phaseRef.current = p;
    setPhase(p);
  };

  // ============================================================================
  // Mouse move / controls visibility
  // ============================================================================

  const handleMouseMove = () => {
    setShowControls(true);
    if (mouseMoveTimerRef.current) clearTimeout(mouseMoveTimerRef.current);
    mouseMoveTimerRef.current = setTimeout(() => setShowControls(false), 3000);
  };

  useEffect(() => {
    handleMouseMove();
    return () => { if (mouseMoveTimerRef.current) clearTimeout(mouseMoveTimerRef.current); };
  }, []);

  // ============================================================================
  // Fullscreen change detection
  // ============================================================================

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  const handleFullscreenToggle = () => {
    if (isFullscreen) exitFs();
    else if (containerRef.current) requestFsEl(containerRef.current);
  };

  // ============================================================================
  // Start screen handlers
  // ============================================================================

  const handleStartNormal = async () => {
    updatePhase('playing');
    if (engineRef.current) {
      await engineRef.current.play();
      setControllerState('playing');
    }
  };

  const handleStartFullscreen = async () => {
    if (containerRef.current) requestFsEl(containerRef.current);
    updatePhase('playing');
    if (engineRef.current) {
      await engineRef.current.play();
      setControllerState('playing');
    }
  };

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

      // Load into engine — do NOT auto-start; show start screen first
      await engineRef.current.loadPlaylist(content.items);
      setControllerState('paused');
      updatePhase('start');

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
      setControllerState('paused');
      updatePhase('start');
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

      // Only restart playback if already in playing phase
      if (phaseRef.current === 'playing') {
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
      phase,
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
  // Render — single root container so requestFullscreen targets same DOM element
  // ============================================================================

  const itemCount = contentRef.current?.items.length ?? 0;
  const playlistName = contentRef.current?.playlist?.name ?? '';

  return (
    <div
      ref={containerRef}
      className="player-controller"
      data-mode={config.mode}
      onMouseMove={handleMouseMove}
    >
      {/* ── Loading ──────────────────────────────────────────────────────── */}
      {(controllerState === 'initializing' || controllerState === 'loading') && (
        <LoadingScreen mode={config.mode} />
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {controllerState === 'error' && (
        <ErrorScreen
          mode={config.mode}
          message={errorMessage || 'An error occurred'}
          onRetry={handleRetry}
        />
      )}

      {/* ── Offline ──────────────────────────────────────────────────────── */}
      {controllerState === 'offline' && (
        <ErrorScreen
          mode={config.mode}
          message="No network connection. Waiting for content..."
          onRetry={handleRetry}
          isOffline
        />
      )}

      {/* ── Empty ────────────────────────────────────────────────────────── */}
      {controllerState === 'empty' && (
        <div className="player-empty">
          <p>No content scheduled</p>
        </div>
      )}

      {/* ── Start screen ─────────────────────────────────────────────────── */}
      {phase === 'start'
        && controllerState !== 'initializing'
        && controllerState !== 'loading'
        && controllerState !== 'error'
        && controllerState !== 'offline'
        && controllerState !== 'empty' && (
        <div className="player-start-screen">
          <div className="start-card">
            <MonitorPlay className="start-icon" />
            <p className="start-playlist-name">{playlistName}</p>
            <p className="start-item-count">{itemCount}개 콘텐츠</p>

            <div className="start-buttons">
              <button
                onClick={handleStartFullscreen}
                className="start-btn start-btn-primary"
              >
                <Maximize className="btn-icon" />
                전체화면으로 재생
              </button>
              <button
                onClick={handleStartNormal}
                className="start-btn start-btn-secondary"
              >
                <Play className="btn-icon" />
                일반 화면으로 재생
              </button>
            </div>

            <div className="start-hints">
              <p>전체화면 해제: ESC 키</p>
              <p>브라우저 전체화면: F11 키</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Playback ─────────────────────────────────────────────────────── */}
      {phase === 'playing'
        && controllerState !== 'error'
        && controllerState !== 'offline'
        && controllerState !== 'empty' && (
        <>
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
              playlistName={playlistName}
              isFullscreen={isFullscreen}
              onPlay={handlePlay}
              onPause={handlePause}
              onNext={handleNext}
              onPrevious={handlePrevious}
              onFullscreenToggle={handleFullscreenToggle}
            />
          )}

          {/* Fullscreen toggle for zero-ui mode — shown briefly on mouse move */}
          {config.mode === 'zero-ui' && showControls && (
            <div className="player-fullscreen-hint">
              <button
                onClick={handleFullscreenToggle}
                className="fullscreen-hint-btn"
                title={isFullscreen ? '전체화면 해제 (ESC)' : '전체화면 전환'}
              >
                {isFullscreen ? <Minimize className="hint-icon" /> : <Maximize className="hint-icon" />}
              </button>
            </div>
          )}

          {/* Debug panel */}
          {config.mode === 'debug' && <DebugPanel info={debugInfo} />}
        </>
      )}

      <style>{`
        .player-controller {
          position: fixed;
          inset: 0;
          background: #000;
          overflow: hidden;
        }

        .player-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.875rem;
        }

        /* Start screen */
        .player-start-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }

        .start-card {
          text-align: center;
          max-width: 20rem;
          width: 100%;
          padding: 1.5rem;
        }

        .start-icon {
          width: 3rem;
          height: 3rem;
          color: rgba(255, 255, 255, 0.4);
          margin: 0 auto 1rem;
        }

        .start-playlist-name {
          color: rgba(255, 255, 255, 0.8);
          font-size: 1.125rem;
          font-weight: 500;
          margin: 0 0 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .start-item-count {
          color: rgba(255, 255, 255, 0.4);
          font-size: 0.875rem;
          margin: 0 0 2rem;
        }

        .start-buttons {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .start-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.875rem 1.25rem;
          border: none;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: background 0.15s;
        }

        .start-btn-primary {
          background: #2563eb;
          color: #fff;
          font-weight: 600;
        }

        .start-btn-primary:hover {
          background: #3b82f6;
        }

        .start-btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          font-weight: 500;
        }

        .start-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .btn-icon {
          width: 1rem;
          height: 1rem;
        }

        .start-hints {
          color: rgba(255, 255, 255, 0.3);
          font-size: 0.75rem;
          line-height: 1.6;
        }

        .start-hints p {
          margin: 0;
        }

        /* Fullscreen hint (zero-ui) */
        .player-fullscreen-hint {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 100;
        }

        .fullscreen-hint-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          background: rgba(0, 0, 0, 0.4);
          border: none;
          border-radius: 0.5rem;
          color: #fff;
          cursor: pointer;
          transition: background 0.15s;
        }

        .fullscreen-hint-btn:hover {
          background: rgba(0, 0, 0, 0.6);
        }

        .hint-icon {
          width: 1rem;
          height: 1rem;
        }
      `}</style>
    </div>
  );
}
