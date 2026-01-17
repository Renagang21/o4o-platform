/**
 * PlayerOverlay
 *
 * Sprint 2-4: UI overlay for minimal/preview modes
 * - Playback controls
 * - Content info display
 * - Progress indicator
 *
 * Phase 2: Digital Signage Production Upgrade
 */

import { useState, useEffect } from 'react';
import type { PlayerMode, PlaylistItem } from '../../types/signage';

// ============================================================================
// Types
// ============================================================================

interface PlayerOverlayProps {
  mode: PlayerMode;
  isPlaying: boolean;
  currentItem: PlaylistItem | null;
  playlistName?: string;
  onPlay: () => void;
  onPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

// ============================================================================
// PlayerOverlay Component
// ============================================================================

export default function PlayerOverlay({
  mode,
  isPlaying,
  currentItem,
  playlistName,
  onPlay,
  onPause,
  onNext,
  onPrevious,
}: PlayerOverlayProps) {
  const [visible, setVisible] = useState(true);
  const [hideTimeout, setHideTimeout] = useState<number | null>(null);

  // Auto-hide overlay in minimal mode
  useEffect(() => {
    if (mode === 'minimal' && isPlaying) {
      const timeout = window.setTimeout(() => {
        setVisible(false);
      }, 3000);
      setHideTimeout(timeout);

      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [mode, isPlaying, currentItem]);

  // Show overlay on mouse move
  const handleMouseMove = () => {
    if (mode === 'minimal') {
      setVisible(true);
      if (hideTimeout) {
        clearTimeout(hideTimeout);
      }
      const timeout = window.setTimeout(() => {
        setVisible(false);
      }, 3000);
      setHideTimeout(timeout);
    }
  };

  // Always visible in preview/debug mode
  const showOverlay = mode !== 'minimal' || visible;

  return (
    <div
      className={`player-overlay ${showOverlay ? 'visible' : 'hidden'}`}
      onMouseMove={handleMouseMove}
      data-mode={mode}
    >
      {/* Top bar with info */}
      {mode !== 'minimal' && (
        <div className="overlay-top">
          <div className="overlay-info">
            {playlistName && <span className="playlist-name">{playlistName}</span>}
            {currentItem && (
              <span className="content-name">{currentItem.media.name}</span>
            )}
          </div>
        </div>
      )}

      {/* Center controls */}
      <div className="overlay-center">
        <button
          className="control-btn"
          onClick={onPrevious}
          aria-label="Previous"
        >
          <PreviousIcon />
        </button>

        <button
          className="control-btn control-btn-primary"
          onClick={isPlaying ? onPause : onPlay}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        <button
          className="control-btn"
          onClick={onNext}
          aria-label="Next"
        >
          <NextIcon />
        </button>
      </div>

      {/* Bottom bar with progress */}
      {mode === 'preview' && currentItem && (
        <div className="overlay-bottom">
          <div className="content-details">
            <span className="content-type">{currentItem.media.mediaType}</span>
            {currentItem.displayDuration && (
              <span className="content-duration">{currentItem.displayDuration}s</span>
            )}
          </div>
        </div>
      )}

      <style>{`
        .player-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.5) 0%,
            transparent 30%,
            transparent 70%,
            rgba(0, 0, 0, 0.5) 100%
          );
          transition: opacity 0.3s ease;
          z-index: 100;
        }

        .player-overlay.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .player-overlay.visible {
          opacity: 1;
        }

        .overlay-top {
          padding: 1rem;
        }

        .overlay-info {
          display: flex;
          gap: 1rem;
          color: #fff;
        }

        .playlist-name {
          font-size: 0.875rem;
          opacity: 0.8;
        }

        .content-name {
          font-size: 1rem;
          font-weight: 600;
        }

        .overlay-center {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
        }

        .control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3rem;
          height: 3rem;
          border: none;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }

        .control-btn-primary {
          width: 4rem;
          height: 4rem;
          background: rgba(255, 255, 255, 0.3);
        }

        .control-btn svg {
          width: 1.5rem;
          height: 1.5rem;
        }

        .control-btn-primary svg {
          width: 2rem;
          height: 2rem;
        }

        .overlay-bottom {
          padding: 1rem;
        }

        .content-details {
          display: flex;
          gap: 1rem;
          color: #fff;
          font-size: 0.875rem;
        }

        .content-type {
          text-transform: uppercase;
          opacity: 0.6;
        }

        .content-duration {
          opacity: 0.8;
        }

        [data-mode="debug"] .overlay-top {
          background: rgba(0, 0, 0, 0.7);
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  );
}

function PreviousIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6V6zm3.5 6l8.5 6V6l-8.5 6z" />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 18l8.5-6L6 6v12zm10-12v12h2V6h-2z" />
    </svg>
  );
}
