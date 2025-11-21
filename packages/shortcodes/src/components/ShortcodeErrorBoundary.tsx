/**
 * Shortcode Error Boundary Component
 * Universal error boundary for shortcode rendering
 *
 * Catches and isolates errors in individual shortcodes to prevent
 * full page crashes.
 */

import { Component, ReactNode } from 'react';

export interface ShortcodeErrorBoundaryProps {
  /**
   * Shortcode name for error reporting
   */
  shortcodeName: string;

  /**
   * Shortcode props for debugging
   */
  shortcodeProps?: Record<string, any>;

  /**
   * Children to render
   */
  children: ReactNode;

  /**
   * Custom error fallback component
   */
  ErrorComponent?: React.ComponentType<{
    shortcodeName: string;
    error: Error;
    errorInfo?: React.ErrorInfo;
  }>;

  /**
   * Optional error callback
   */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ShortcodeErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * Default Error Fallback Component
 */
const DefaultShortcodeErrorFallback: React.FC<{
  shortcodeName: string;
  error: Error;
}> = ({ shortcodeName, error }) => {
  // Detect development mode - safe for both browser and Node environments
  const isDev = typeof window !== 'undefined'
    ? !window.location.hostname.includes('neture.co.kr')
    : false;

  return (
    <div
      style={{
        padding: '12px 16px',
        margin: '8px 0',
        backgroundColor: '#fee',
        border: '2px solid #fcc',
        borderRadius: '8px',
        color: '#c33',
        fontSize: '14px',
      }}
    >
      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
        ⚠️ Shortcode Error
      </div>
      <div style={{ fontSize: '12px', opacity: 0.9 }}>
        Block: <code style={{ backgroundColor: '#fdd', padding: '2px 6px', borderRadius: '4px' }}>
          [{shortcodeName}]
        </code>
      </div>
      {isDev && (
        <details style={{ marginTop: '8px', fontSize: '11px' }}>
          <summary style={{ cursor: 'pointer', textDecoration: 'underline' }}>
            Developer Details
          </summary>
          <div style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#fdd',
            borderRadius: '4px',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            overflow: 'auto',
            maxHeight: '200px',
          }}>
            {error.message}
            {error.stack && (
              <>
                <br />
                <br />
                {error.stack}
              </>
            )}
          </div>
        </details>
      )}
    </div>
  );
};

/**
 * ShortcodeErrorBoundary Class Component
 *
 * Wraps individual shortcodes to catch rendering errors.
 * Must be a class component per React Error Boundary requirements.
 */
export class ShortcodeErrorBoundary extends Component<
  ShortcodeErrorBoundaryProps,
  ShortcodeErrorBoundaryState
> {
  constructor(props: ShortcodeErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  static getDerivedStateFromError(error: Error): ShortcodeErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error
    // Detect development mode - safe for both browser and Node environments
    const isDev = typeof window !== 'undefined'
      ? !window.location.hostname.includes('neture.co.kr')
      : false;

    if (isDev) {
      console.group(`🔴 [ShortcodeErrorBoundary] Error in [${this.props.shortcodeName}]`);
      console.error('Error:', error);
      console.error('Props:', this.props.shortcodeProps);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    } else {
      console.error(
        `[ShortcodeErrorBoundary] Shortcode [${this.props.shortcodeName}] crashed:`,
        error.message
      );
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Custom error component if provided
      if (this.props.ErrorComponent) {
        const ErrorComponent = this.props.ErrorComponent;
        return (
          <ErrorComponent
            shortcodeName={this.props.shortcodeName}
            error={this.state.error}
            errorInfo={this.state.errorInfo}
          />
        );
      }

      // Default error fallback
      return (
        <DefaultShortcodeErrorFallback
          shortcodeName={this.props.shortcodeName}
          error={this.state.error}
        />
      );
    }

    return this.props.children;
  }
}
