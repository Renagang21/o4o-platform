import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Smartphone,
  Tablet,
  Monitor,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Loader2,
  WifiOff,
  Shield,
} from 'lucide-react';
import { useCustomizer } from '../../context/CustomizerContext';
import { PreviewDevice } from '../../types/customizer-types';
import { generateCSS } from '../../utils/css-generator';
import { Button } from '@o4o/ui';
import debounce from 'lodash/debounce';

/**
 * Enhanced Preview Component with improved loading and error handling
 */

interface EnhancedPreviewProps {
  url?: string;
  onLoad?: () => void;
}

const deviceSizes: Record<PreviewDevice, { width: number; height: number }> = {
  desktop: { width: 0, height: 0 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

type LoadingState = 'initial' | 'loading' | 'loaded' | 'error' | 'blocked';

export const EnhancedPreview: React.FC<EnhancedPreviewProps> = ({
  url = '/',
  onLoad,
}) => {
  const { state, setPreviewDevice } = useCustomizer();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>('initial');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [retryCount, setRetryCount] = useState(0);
  const loadTimeoutRef = useRef<NodeJS.Timeout>();
  const cssUpdateTimeoutRef = useRef<NodeJS.Timeout>();

  const { previewDevice } = state;

  // Generate optimized CSS with caching
  const css = useMemo(() => generateCSS(state.settings), [state.settings]);

  // Create preview URL with fallback options
  const getPreviewUrl = useCallback(() => {
    try {
      // Try direct URL first
      if (url.startsWith('http')) {
        return url;
      }
      
      // Use relative URL for same-origin
      const origin = window.location.origin;
      return `${origin}${url.startsWith('/') ? url : '/' + url}`;
    } catch (error) {
      // Error generating preview URL
      return '/';
    }
  }, [url]);

  const currentUrl = getPreviewUrl();

  // Debounced CSS injection for performance
  const injectCSS = useMemo(
    () =>
      debounce(() => {
        if (!iframeRef.current?.contentWindow) return;

        try {
          // Try direct DOM access first
          const doc = iframeRef.current.contentDocument;
          if (doc) {
            let styleEl = doc.getElementById('astra-customizer-css');
            if (!styleEl) {
              styleEl = doc.createElement('style');
              styleEl.id = 'astra-customizer-css';
              doc.head?.appendChild(styleEl);
            }
            if (styleEl) {
              styleEl.textContent = css;
            }
          }
        } catch (error) {
          // Fallback to postMessage for cross-origin
          // Using postMessage for CSS injection when cross-origin
        }

        // Always send postMessage for compatibility
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            {
              type: 'customizer-update',
              settings: state.settings,
              css,
            },
            '*'
          );
        }
      }, 100),
    [css, state.settings]
  );

  // Enhanced iframe load handler
  const handleIframeLoad = useCallback(() => {
    clearTimeout(loadTimeoutRef.current);
    
    // Check if iframe actually loaded content
    try {
      const doc = iframeRef.current?.contentDocument;
      const hasContent = doc && (doc.body?.innerHTML || '').length > 100;
      
      if (hasContent || iframeRef.current?.contentWindow) {
        setLoadingState('loaded');
        setRetryCount(0);
        injectCSS();
        onLoad?.();
      } else {
        throw new Error('Empty iframe content');
      }
    } catch (error) {
      // Cross-origin or blocked
      // Preview loaded (cross-origin)
      setLoadingState('loaded');
      injectCSS();
      onLoad?.();
    }
  }, [injectCSS, onLoad]);

  // Handle iframe errors
  const handleIframeError = useCallback(
    (error?: string) => {
      clearTimeout(loadTimeoutRef.current);
      
      if (retryCount < 2) {
        // Auto-retry with delay
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          setLoadingState('loading');
          if (iframeRef.current) {
            iframeRef.current.src = currentUrl;
          }
        }, 1000 * (retryCount + 1));
      } else {
        setLoadingState('error');
        setErrorMessage(
          error || 'Failed to load preview. The site may be blocking embedded frames.'
        );
      }
    },
    [currentUrl, retryCount]
  );

  // Setup iframe with timeouts and error handling
  useEffect(() => {
    if (!iframeRef.current) return;

    setLoadingState('loading');
    
    // Set loading timeout
    loadTimeoutRef.current = setTimeout(() => {
      if (loadingState === 'loading') {
        handleIframeError('Preview loading timeout');
      }
    }, 10000); // 10 second timeout

    // Cleanup
    return () => {
      clearTimeout(loadTimeoutRef.current);
      clearTimeout(cssUpdateTimeoutRef.current);
    };
  }, [currentUrl]);

  // Inject CSS on changes
  useEffect(() => {
    if (loadingState === 'loaded') {
      injectCSS();
    }
  }, [css, loadingState, injectCSS]);

  // Handle device change
  const handleDeviceChange = (device: PreviewDevice) => {
    setPreviewDevice(device);
    // Force refresh on device change for responsive testing
    if (iframeRef.current && device !== 'desktop') {
      const viewport = `width=${deviceSizes[device].width}`;
      iframeRef.current.contentWindow?.postMessage(
        {
          type: 'viewport-change',
          viewport,
        },
        '*'
      );
    }
  };

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // Refresh preview
  const refreshPreview = () => {
    setRetryCount(0);
    setLoadingState('loading');
    setErrorMessage('');
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  };

  // Render loading state
  const renderLoadingOverlay = () => {
    if (loadingState === 'loaded') return null;

    return (
      <div className="wp-customizer-preview-overlay">
        {loadingState === 'loading' && (
          <div className="wp-customizer-preview-loading">
            <Loader2 className="wp-customizer-preview-spinner" size={32} />
            <p>Loading preview...</p>
            {retryCount > 0 && (
              <p className="wp-customizer-preview-retry">
                Retry attempt {retryCount}/2
              </p>
            )}
          </div>
        )}

        {loadingState === 'error' && (
          <div className="wp-customizer-preview-error">
            <AlertTriangle size={48} />
            <h3>Preview Error</h3>
            <p>{errorMessage}</p>
            <div className="wp-customizer-preview-error-actions">
              <Button onClick={refreshPreview} variant="primary">
                <RefreshCw size={16} />
                Try Again
              </Button>
              <Button
                onClick={() => window.open(currentUrl, '_blank')}
                variant="secondary"
              >
                <ExternalLink size={16} />
                Open in New Tab
              </Button>
            </div>
            <details className="wp-customizer-preview-error-details">
              <summary>Technical Details</summary>
              <p>
                This error often occurs when the site blocks embedding in iframes
                (X-Frame-Options or CSP headers). Try opening the preview in a new tab.
              </p>
            </details>
          </div>
        )}

        {loadingState === 'blocked' && (
          <div className="wp-customizer-preview-blocked">
            <Shield size={48} />
            <h3>Security Block</h3>
            <p>The preview cannot be displayed due to security restrictions.</p>
            <Button
              onClick={() => window.open(currentUrl, '_blank')}
              variant="primary"
            >
              <ExternalLink size={16} />
              Open in New Tab
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="wp-customizer-preview" ref={containerRef}>
      {/* Preview Header */}
      <div className="wp-customizer-preview-header">
        <div className="wp-customizer-preview-devices">
          <button
            className={`wp-customizer-device-button ${
              previewDevice === 'desktop' ? 'active' : ''
            }`}
            onClick={() => handleDeviceChange('desktop')}
            title="Desktop view"
          >
            <Monitor size={20} />
          </button>
          <button
            className={`wp-customizer-device-button ${
              previewDevice === 'tablet' ? 'active' : ''
            }`}
            onClick={() => handleDeviceChange('tablet')}
            title="Tablet view"
          >
            <Tablet size={20} />
          </button>
          <button
            className={`wp-customizer-device-button ${
              previewDevice === 'mobile' ? 'active' : ''
            }`}
            onClick={() => handleDeviceChange('mobile')}
            title="Mobile view"
          >
            <Smartphone size={20} />
          </button>
        </div>

        <div className="wp-customizer-preview-url">
          <input
            type="text"
            value={currentUrl}
            readOnly
            className="wp-customizer-preview-url-input"
          />
        </div>

        <div className="wp-customizer-preview-actions">
          <button
            onClick={refreshPreview}
            className="wp-customizer-preview-action"
            title="Refresh preview"
            disabled={loadingState === 'loading'}
          >
            <RefreshCw
              size={18}
              className={loadingState === 'loading' ? 'spin' : ''}
            />
          </button>
          <button
            onClick={toggleFullscreen}
            className="wp-customizer-preview-action"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <button
            onClick={() => window.open(currentUrl, '_blank')}
            className="wp-customizer-preview-action"
            title="Open in new tab"
          >
            <ExternalLink size={18} />
          </button>
        </div>
      </div>

      {/* Preview Frame */}
      <div
        className={`wp-customizer-preview-frame wp-customizer-preview-${previewDevice}`}
      >
        <div className="wp-customizer-preview-wrapper">
          {renderLoadingOverlay()}
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="wp-customizer-preview-iframe"
            onLoad={handleIframeLoad}
            onError={() => handleIframeError()}
            style={{
              width:
                previewDevice === 'desktop'
                  ? '100%'
                  : `${deviceSizes[previewDevice].width}px`,
              height:
                previewDevice === 'desktop'
                  ? '100%'
                  : `${deviceSizes[previewDevice].height}px`,
              transform: `scale(${scale})`,
              transformOrigin: 'top center',
            }}
          />
        </div>
      </div>
    </div>
  );
};