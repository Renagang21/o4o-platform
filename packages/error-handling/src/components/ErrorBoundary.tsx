/**
 * O4O Platform Error Boundary
 *
 * WO-O4O-FRONTEND-ERROR-HANDLING-STANDARDIZATION
 *
 * Features:
 * - Stale chunk detection with auto-reload (10s infinite loop guard)
 * - Korean error UI
 * - Custom fallback support
 * - Error callback for logging
 *
 * Reference: apps/admin-dashboard/src/components/ErrorBoundary.tsx
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  /** Called when an error is caught (for external logging) */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class O4OErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error);
    this.props.onError?.(error, errorInfo);

    // Stale chunk detection → auto-reload
    const isChunkError =
      error.message?.includes('Failed to fetch dynamically imported module') ||
      error.message?.includes('Loading chunk') ||
      error.message?.includes('ChunkLoadError') ||
      error.name === 'ChunkLoadError';

    if (isChunkError) {
      const reloadKey = 'chunk-error-reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();

      // 무한 리로드 방지: 10초 내 재시도 차단
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
        return;
      }
    }

    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    window.location.reload();
  };

  public render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9fafb', padding: '48px 16px' }}>
        <div style={{ maxWidth: '448px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#9888;&#65039;</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
            문제가 발생했습니다
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
            예기치 않은 오류가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>

          {this.state.error && (
            <details style={{ textAlign: 'left', background: '#fef2f2', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
              <summary style={{ cursor: 'pointer', fontSize: '14px', color: '#dc2626' }}>
                상세 정보 보기
              </summary>
              <pre style={{ marginTop: '8px', fontSize: '12px', color: '#991b1b', overflow: 'auto', maxHeight: '192px', whiteSpace: 'pre-wrap' }}>
                {this.state.error.toString()}
              </pre>
            </details>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={this.handleReset}
              style={{ width: '100%', padding: '10px 16px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
            >
              페이지 새로고침
            </button>
            <button
              onClick={() => window.history.back()}
              style={{ width: '100%', padding: '10px 16px', backgroundColor: 'white', color: '#374151', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px', cursor: 'pointer' }}
            >
              이전 페이지로 돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }
}
