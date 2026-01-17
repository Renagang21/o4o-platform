/**
 * SignagePlayerPage
 *
 * Sprint 2-4: Production signage player page
 * - Supports multiple modes (zero-ui, minimal, preview, debug)
 * - URL-based configuration
 * - Schedule-aware playback
 *
 * Phase 2: Digital Signage Production Upgrade
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PlayerController } from '../components/player';
import type { PlayerConfig, PlayerMode } from '../types/signage';
import { DEFAULT_PLAYER_CONFIG } from '../types/signage';

// ============================================================================
// Types
// ============================================================================

interface RouteParams {
  serviceKey?: string;
  channelId?: string;
  code?: string;
}

// ============================================================================
// SignagePlayerPage Component
// ============================================================================

export default function SignagePlayerPage() {
  const { serviceKey, channelId, code } = useParams<RouteParams>();
  const [searchParams] = useSearchParams();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build configuration from URL params
  const config = useMemo<PlayerConfig>(() => {
    // Mode from query param
    const modeParam = searchParams.get('mode') as PlayerMode | null;
    const mode: PlayerMode = ['zero-ui', 'minimal', 'preview', 'debug'].includes(modeParam || '')
      ? (modeParam as PlayerMode)
      : 'zero-ui';

    // API URL
    const apiUrl = searchParams.get('apiUrl') || import.meta.env.VITE_API_URL || 'https://api.neture.co.kr';

    // Other settings from query params
    const defaultDuration = parseInt(searchParams.get('duration') || '10', 10);
    const preloadCount = parseInt(searchParams.get('preload') || '2', 10);
    const transitionDuration = parseInt(searchParams.get('transition') || '300', 10);
    const loop = searchParams.get('loop') !== 'false';
    const autoplay = searchParams.get('autoplay') !== 'false';
    const muted = searchParams.get('muted') !== 'false';
    const enableOffline = searchParams.get('offline') !== 'false';
    const cacheTtlMinutes = parseInt(searchParams.get('cacheTtl') || '60', 10);
    const maxCacheSizeMb = parseInt(searchParams.get('cacheSize') || '500', 10);
    const heartbeatIntervalMs = parseInt(searchParams.get('heartbeat') || '60000', 10);
    const showDebugInfo = mode === 'debug' || searchParams.get('debug') === 'true';

    return {
      ...DEFAULT_PLAYER_CONFIG,
      mode,
      channelId,
      channelCode: code,
      serviceKey,
      apiUrl,
      defaultDuration,
      preloadCount,
      transitionDuration,
      loop,
      autoplay,
      muted,
      enableOffline,
      cacheTtlMinutes,
      maxCacheSizeMb,
      heartbeatIntervalMs,
      showDebugInfo,
    };
  }, [serviceKey, channelId, code, searchParams]);

  // Validate required params
  useEffect(() => {
    if (!serviceKey) {
      setError('Service key is required');
      return;
    }

    if (!channelId && !code) {
      setError('Channel ID or code is required');
      return;
    }

    setError(null);
  }, [serviceKey, channelId, code]);

  // Handle player ready
  const handleReady = () => {
    setReady(true);
    console.info('[SignagePlayerPage] Player ready', config);
  };

  // Handle player error
  const handleError = (err: Error) => {
    console.error('[SignagePlayerPage] Player error:', err);
    setError(err.message);
  };

  // Show error if configuration is invalid
  if (error) {
    return (
      <div className="player-error-page">
        <h1>Configuration Error</h1>
        <p>{error}</p>
        <p className="usage">
          Usage: /signage/:serviceKey/channel/:channelId<br />
          Or: /signage/:serviceKey/channel/code/:code
        </p>
        <style>{`
          .player-error-page {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #000;
            color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            text-align: center;
          }
          .player-error-page h1 {
            color: #f44;
            margin-bottom: 1rem;
          }
          .player-error-page p {
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 0.5rem;
          }
          .player-error-page .usage {
            margin-top: 2rem;
            font-family: monospace;
            font-size: 0.875rem;
            opacity: 0.5;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="signage-player-page" data-mode={config.mode}>
      <PlayerController
        config={config}
        onReady={handleReady}
        onError={handleError}
      />
      <style>{`
        .signage-player-page {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #000;
          overflow: hidden;
        }

        .player-controller {
          width: 100%;
          height: 100%;
          position: relative;
        }

        .media-renderer {
          width: 100%;
          height: 100%;
          position: absolute;
          top: 0;
          left: 0;
        }

        .media-image,
        .media-video,
        .media-youtube,
        .media-vimeo,
        .media-iframe,
        .media-text {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .media-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #111;
          color: #666;
        }

        .player-empty {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          color: #444;
        }
      `}</style>
    </div>
  );
}
