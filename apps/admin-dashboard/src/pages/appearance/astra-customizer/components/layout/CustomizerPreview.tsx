import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Smartphone, Tablet, Monitor, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';
import { useCustomizer } from '../../context/CustomizerContext';
import { PreviewDevice } from '../../types/customizer-types';
import { generateCSS } from '../../utils/css-generator';
import { Button } from '@o4o/ui';

interface CustomizerPreviewProps {
  url?: string;
  onLoad?: () => void;
}

const deviceSizes: Record<PreviewDevice, { width: string; height: string }> = {
  desktop: { width: '100%', height: '100%' },
  tablet: { width: '768px', height: '1024px' },
  mobile: { width: '375px', height: '667px' },
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
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Generate preview URL (using API proxy to avoid X-Frame-Options)
  const generatePreviewUrl = () => {
    // Use API proxy instead of direct URL to bypass X-Frame-Options
    const baseUrl = process.env.REACT_APP_API_URL || 'https://api.neture.co.kr';
    const targetDomain = url ? new URL(url).host : 'neture.co.kr';
    return `${baseUrl}/api/v1/preview/site/${targetDomain}`;
  };
  
  const [currentUrl, setCurrentUrl] = useState(generatePreviewUrl());
  
  const { previewDevice } = state;

  // Debounce function to prevent excessive reflows
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }, []);

  // Memoize CSS generation to prevent unnecessary recalculations
  const memoizedCSS = useMemo(() => {
    return generateCSS(state.settings);
  }, [state.settings]);

  // Optimized container size calculation
  const updateContainerSize = useCallback(() => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    setContainerSize(prev => {
      // Only update if size actually changed to prevent unnecessary re-renders
      if (prev.width !== rect.width || prev.height !== rect.height) {
        return { width: rect.width, height: rect.height };
      }
      return prev;
    });
  }, []);

  // Debounced version of container size update
  const debouncedUpdateContainerSize = useMemo(
    () => debounce(updateContainerSize, 100),
    [updateContainerSize, debounce]
  );
  
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
  
  // Optimized CSS injection with batching
  const injectCSS = useCallback(() => {
    if (!iframeRef.current?.contentWindow) return;
    
    try {
      // Use memoized CSS instead of generating on each call
      const css = memoizedCSS;
      
      // Batch DOM operations to prevent multiple reflows
      const doc = iframeRef.current.contentDocument;
      if (!doc) return;
      
      // Use requestAnimationFrame to batch DOM updates
      requestAnimationFrame(() => {
        let styleEl = doc.getElementById('astra-customizer-css');
        if (!styleEl) {
          styleEl = doc.createElement('style');
          styleEl.id = 'astra-customizer-css';
          doc.head.appendChild(styleEl);
        }
        
        // Only update if CSS actually changed
        if (styleEl.textContent !== css) {
          styleEl.textContent = css;
        }
        
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
      });
    } catch (error) {
      console.error('Failed to inject CSS:', error);
    }
  }, [memoizedCSS, state.settings]);
  
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
  
  // Optimized iframe size adjustment
  const adjustIframeSize = useCallback(() => {
    if (!iframeRef.current || !containerRef.current) return;
    
    const iframe = iframeRef.current;
    const container = containerRef.current;
    
    requestAnimationFrame(() => {
      if (previewDevice === 'desktop') {
        // For desktop, make iframe fill the container
        iframe.style.width = '100%';
        iframe.style.height = '100%';
      } else {
        // For mobile/tablet, maintain aspect ratio
        const containerRect = container.getBoundingClientRect();
        const maxWidth = containerRect.width - 40; // Account for padding
        const maxHeight = containerRect.height - 40;
        
        // Get device dimensions
        const deviceDimensions = deviceSizes[previewDevice];
        const deviceWidth = parseInt(deviceDimensions.width);
        const deviceHeight = parseInt(deviceDimensions.height);
        
        // Calculate scale to fit in container
        const scaleX = maxWidth / deviceWidth;
        const scaleY = maxHeight / deviceHeight;
        const scale = Math.min(scaleX, scaleY, 1); // Don't scale up
        
        iframe.style.width = `${deviceWidth * scale}px`;
        iframe.style.height = `${deviceHeight * scale}px`;
      }
    });
  }, [previewDevice]);

  // Use ResizeObserver for better performance than window resize events
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use debounced update to prevent excessive reflows
        debouncedUpdateContainerSize();
        adjustIframeSize();
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [debouncedUpdateContainerSize, adjustIframeSize]);

  // Update iframe size when device changes
  useEffect(() => {
    adjustIframeSize();
  }, [previewDevice, adjustIframeSize]);

  // Debounced CSS injection to prevent excessive updates
  const debouncedInjectCSS = useMemo(
    () => debounce(injectCSS, 50),
    [injectCSS, debounce]
  );

  // Update CSS when settings change (debounced)
  useEffect(() => {
    debouncedInjectCSS();
  }, [debouncedInjectCSS]);
  
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
          style={{
            width: deviceSizes[previewDevice].width,
            height: deviceSizes[previewDevice].height,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
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
            style={{
              opacity: isLoading || iframeError ? 0 : 1,
              transition: 'opacity 0.3s',
              display: iframeError ? 'none' : 'block',
            }}
          />
        </div>
      </div>
    </div>
  );
};
