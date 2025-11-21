/**
 * Shortcode Error Boundary Component
 * HP-2: Shortcode Error Boundary
 *
 * Wraps individual shortcodes to isolate rendering errors.
 * Prevents a single broken shortcode from crashing the entire page.
 */

import React from 'react';
import { ShortcodeErrorFallback } from './ShortcodeErrorFallback';
import { logClientError } from '@/utils/logClientError';

export interface ShortcodeErrorBoundaryProps {
  /**
   * Name of the shortcode being rendered
   */
  shortcodeName: string;

  /**
   * Props passed to the shortcode component
   */
  shortcodeProps?: Record<string, any>;

  /**
   * Child component(s) to render
   */
  children: React.ReactNode;

  /**
   * Optional custom fallback component
   */
  FallbackComponent?: React.ComponentType<{
    shortcodeName: string;
    error?: Error;
  }>;
}

interface ShortcodeErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

/**
 * ShortcodeErrorBoundary Class Component
 *
 * React Error Boundaries must be class components.
 * This component catches errors in shortcode rendering and displays
 * a fallback UI instead of crashing the entire page.
 *
 * @example
 * ```tsx
 * <ShortcodeErrorBoundary shortcodeName="cart" shortcodeProps={{ productId: 123 }}>
 *   <CartShortcode productId={123} />
 * </ShortcodeErrorBoundary>
 * ```
 */
export class ShortcodeErrorBoundary extends React.Component<
  ShortcodeErrorBoundaryProps,
  ShortcodeErrorBoundaryState
> {
  constructor(props: ShortcodeErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): ShortcodeErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Log error details when caught
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Store error info in state
    this.setState({ errorInfo });

    // Log to console (development) or backend (production)
    logClientError({
      type: 'SHORTCODE_ERROR',
      shortcodeName: this.props.shortcodeName,
      message: error.message,
      stack: error.stack,
      props: this.props.shortcodeProps,
      metadata: {
        componentStack: errorInfo.componentStack,
      },
    });
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback component if provided
      if (this.props.FallbackComponent) {
        const FallbackComponent = this.props.FallbackComponent;
        return (
          <FallbackComponent
            shortcodeName={this.props.shortcodeName}
            error={this.state.error}
          />
        );
      }

      // Default fallback component
      return (
        <ShortcodeErrorFallback
          shortcodeName={this.props.shortcodeName}
          error={this.state.error}
        />
      );
    }

    // Normal render when no error
    return this.props.children;
  }
}
