import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Smartphone, Tablet, Monitor, RefreshCw, ExternalLink, AlertTriangle, Maximize2, Minimize2 } from 'lucide-react';
import { useCustomizer } from '../../context/CustomizerContext';
import { PreviewDevice } from '../../types/customizer-types';
import { generateCSS } from '../../utils/css-generator';
import { Button } from '@o4o/ui';

interface CustomizerPreviewProps {
  url?: string;
  onLoad?: () => void;
}

const deviceSizes: Record<PreviewDevice, { width: number; height: number }> = {
  desktop: { width: 0, height: 0 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 667 },
};

export const CustomizerPreview: React.FC<CustomizerPreviewProps> = ({
  url,
  onLoad,
}) => {
  const { state, setPreviewDevice } = useCustomizer();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [frameSize, setFrameSize] = useState<{width: number; height: number}>({ width: 0, height: 0 });
  
  // Generate preview URL (using API proxy to avoid X-Frame-Options)
  const generatePreviewUrl = () => {
    // Use API proxy instead of direct URL to bypass X-Frame-Options
    const baseUrl = process.env.REACT_APP_API_URL || 'https://api.neture.co.kr';
    const targetDomain = url ? new URL(url).host : 'neture.co.kr';
    return `${baseUrl}/api/v1/preview/site/${targetDomain}`;
  };
  
  const [currentUrl, setCurrentUrl] = useState(generatePreviewUrl());
  
  const { previewDevice } = state;

  // Simple CSS generation
  const css = generateCSS(state.settings);
  
  // Handle device change
  const handleDeviceChange = (device: PreviewDevice) => {
    setPreviewDevice(device);
    // Update URL with new device parameter
    const newUrl = generatePreviewUrl();
    setCurrentUrl(newUrl);
    if (iframeRef.current) {
      iframeRef.current.src = newUrl;
    }
  };
  
  // Update URL when preview device changes
  useEffect(() => {
    const newUrl = generatePreviewUrl();
    setCurrentUrl(newUrl);
    if (iframeRef.current) {
      iframeRef.current.src = newUrl;
    }
  }, [state.previewDevice]);
  
  // Simple CSS injection
  const injectCSS = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    
    try {
      const doc = iframeRef.current.contentDocument;
      if (!doc) return;
      
      let styleEl = doc.getElementById('astra-customizer-css');
      if (!styleEl) {
        styleEl = doc.createElement('style');
        styleEl.id = 'astra-customizer-css';
        doc.head.appendChild(styleEl);
      }
      
      styleEl.textContent = css;
      
      // Send message to iframe
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
    } catch (error) {
      console.error('Failed to inject CSS:', error);
    }
  }, [css, state.settings]);
  
  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
    setIframeError(false);
    injectCSS();
    onLoad?.();
    
    // Setup PostMessage listener in iframe
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: 'preview-ready' },
        '*'
      );
    }
  };
  
  // Handle iframe error (X-Frame-Options blocked)
  const handleIframeError = () => {
    setIsLoading(false);
    setIframeError(true);
  };
  
  // Refresh preview
  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      setIframeError(false);
      iframeRef.current.src = iframeRef.current.src;
    }
  };
  
  // Open in new tab
  const handleExternalLink = () => {
    window.open(currentUrl, '_blank');
  };
  
  // Fullscreen toggle
  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        // @ts-ignore - WebKit fallback
        if (el.requestFullscreen) await el.requestFullscreen();
        // @ts-ignore - Safari/iOS fallback
        else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        // @ts-ignore - Safari/iOS fallback
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      }
    } catch (e) {
      // no-op; some environments may block fullscreen
    }
  };
  
  useEffect(() => {
    const onFsChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    // @ts-ignore - Safari
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      // @ts-ignore - Safari
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);
  
  // Update CSS when settings change
  useEffect(() => {
    injectCSS();
  }, [injectCSS]);
  
  // Handle navigation within iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'navigate') {
        setCurrentUrl(event.data.url);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Add responsive wrapper classes
  const getPreviewClasses = () => {
    const classes = ['wp-customizer-preview-frame'];
    classes.push(`wp-customizer-preview-${previewDevice}`);
    return classes.join(' ');
  };

  // Compute scale for tablet/mobile so the frame fits within container without overflow
  const recomputeScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (previewDevice === 'desktop') {
      setScale(1);
      setFrameSize({ width: container.clientWidth, height: container.clientHeight });
      return;
    }
    const { width: targetW, height: targetH } = deviceSizes[previewDevice];
    const availW = container.clientWidth;
    const availH = container.clientHeight;
    const s = Math.min(availW / targetW, availH / targetH, 1);
    setScale(s);
    setFrameSize({ width: targetW, height: targetH });
  }, [previewDevice]);

  useEffect(() => {
    recomputeScale();
    const handleResize = () => recomputeScale();
    window.addEventListener('resize', handleResize);
    const ResizeObserverClass = (window as any).ResizeObserver;
    const ro = ResizeObserverClass ? new ResizeObserverClass(() => recomputeScale()) : null;
    if (ro && containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (ro && containerRef.current) ro.unobserve(containerRef.current);
    };
  }, [recomputeScale]);
  
  return (
    <div className="wp-customizer-preview">
      {/* Preview Header */}
      <div className="wp-customizer-preview-header">
        <div className="wp-customizer-device-buttons">
          <Button
            onClick={() => handleDeviceChange('desktop')}
            variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
            title="Desktop preview"
          >
            <Monitor size={16} />
            <span>Desktop</span>
          </Button>
          <Button
            onClick={() => handleDeviceChange('tablet')}
            variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
            title="Tablet preview"
          >
            <Tablet size={16} />
            <span>Tablet</span>
          </Button>
          <Button
            onClick={() => handleDeviceChange('mobile')}
            variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
            title="Mobile preview"
          >
            <Smartphone size={16} />
            <span>Mobile</span>
          </Button>
        </div>
        
        <div className="wp-customizer-preview-actions">
          <span className="wp-customizer-preview-url">{currentUrl}</span>
          <Button
            onClick={toggleFullscreen}
            className="wp-button-icon"
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </Button>
          <Button
            onClick={handleRefresh}
            className="wp-button-icon"
            title="Refresh preview"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          </Button>
          <Button
            onClick={handleExternalLink}
            className="wp-button-icon"
            title="Open in new tab"
          >
            <ExternalLink size={16} />
          </Button>
        </div>
      </div>
      
      {/* Preview Body */}
      <div className="wp-customizer-preview-body" ref={containerRef}>
        <div
          className={getPreviewClasses()}
          style={
            previewDevice === 'desktop'
              ? { width: '100%', height: '100%' }
              : {
                  width: `${frameSize.width}px`,
                  height: `${frameSize.height}px`,
                  transform: `scale(${scale})`,
                  transformOrigin: 'center center',
                  margin: 'auto',
                }
          }
        >
          {isLoading && !iframeError && (
            <div className="wp-customizer-preview-loading">
              <RefreshCw size={32} className="spin" />
              <p>Loading preview...</p>
            </div>
          )}
          
          {iframeError && (
            <div className="wp-customizer-preview-error">
              <AlertTriangle size={48} className="text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Preview Unavailable</h3>
              <p className="text-sm text-gray-600 mb-4">
                The site cannot be displayed in a frame due to X-Frame-Options security policy.
              </p>
              <div className="space-y-2">
                <Button 
                  onClick={handleExternalLink}
                  className="w-full"
                  variant="default"
                >
                  <ExternalLink size={16} className="mr-2" />
                  Open in New Tab
                </Button>
                <Button 
                  onClick={handleRefresh}
                  variant="outline"
                  className="w-full"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Retry Preview
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                To enable iframe preview, contact your server administrator to configure X-Frame-Options.
              </p>
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            id="customizer-preview-iframe"
            className="wp-customizer-iframe"
            src={currentUrl}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title="Site Preview"
            allowFullScreen
            allow="fullscreen"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              opacity: isLoading || iframeError ? 0 : 1,
              display: iframeError ? 'none' : 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
};
