/**
 * LoadingScreen
 *
 * Sprint 2-4: Loading screen with mode-appropriate styling
 *
 * Phase 2: Digital Signage Production Upgrade
 */

import type { PlayerMode } from '../../types/signage';

interface LoadingScreenProps {
  mode: PlayerMode;
}

export default function LoadingScreen({ mode }: LoadingScreenProps) {
  // Zero-UI mode: minimal black screen
  if (mode === 'zero-ui') {
    return (
      <div className="loading-screen loading-zero-ui">
        <style>{`
          .loading-zero-ui {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: #000;
          }
        `}</style>
      </div>
    );
  }

  // Other modes: show loading indicator
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner" />
        <p className="loading-text">Loading content...</p>
      </div>

      <style>{`
        .loading-screen {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .loading-content {
          text-align: center;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-top-color: #fff;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-text {
          color: rgba(255, 255, 255, 0.6);
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
