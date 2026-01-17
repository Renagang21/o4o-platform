/**
 * ErrorScreen
 *
 * Sprint 2-4: Error screen with retry functionality
 *
 * Phase 2: Digital Signage Production Upgrade
 */

import type { PlayerMode } from '../../types/signage';

interface ErrorScreenProps {
  mode: PlayerMode;
  message: string;
  onRetry?: () => void;
  isOffline?: boolean;
}

export default function ErrorScreen({
  mode,
  message,
  onRetry,
  isOffline = false,
}: ErrorScreenProps) {
  // Zero-UI mode: minimal display
  if (mode === 'zero-ui') {
    return (
      <div className="error-screen error-zero-ui">
        <style>{`
          .error-zero-ui {
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

  return (
    <div className="error-screen">
      <div className="error-content">
        <div className="error-icon">
          {isOffline ? <OfflineIcon /> : <ErrorIcon />}
        </div>
        <h2 className="error-title">
          {isOffline ? 'Offline' : 'Something went wrong'}
        </h2>
        <p className="error-message">{message}</p>
        {onRetry && (
          <button className="error-retry" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>

      <style>{`
        .error-screen {
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

        .error-content {
          text-align: center;
          max-width: 400px;
          padding: 2rem;
        }

        .error-icon {
          margin-bottom: 1.5rem;
        }

        .error-icon svg {
          width: 64px;
          height: 64px;
          color: rgba(255, 255, 255, 0.5);
        }

        .error-title {
          color: #fff;
          font-size: 1.5rem;
          margin: 0 0 0.5rem;
          font-weight: 600;
        }

        .error-message {
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.875rem;
          margin: 0 0 1.5rem;
        }

        .error-retry {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          padding: 0.75rem 2rem;
          font-size: 0.875rem;
          cursor: pointer;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .error-retry:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

function ErrorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

function OfflineIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 1l22 22" />
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}
