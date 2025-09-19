import React, { useRef, useEffect, useState } from 'react';
import { Smartphone, Tablet, Monitor, RefreshCw, ExternalLink } from 'lucide-react';
import { useCustomizer } from '../../context/CustomizerContext';
import { PreviewDevice } from '../../types/customizer-types';
import { generateCSS } from '../../utils/css-generator';

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
  url = process.env.REACT_APP_MAIN_SITE_URL || 'https://neture.co.kr',
  onLoad,
}) => {
  const { state, setPreviewDevice } = useCustomizer();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState(url);
  
  const { previewDevice } = state;
  
  // Handle device change
  const handleDeviceChange = (device: PreviewDevice) => {
    setPreviewDevice(device);
  };
  
  // Inject CSS into iframe
  const injectCSS = () => {
    if (!iframeRef.current?.contentWindow) return;
    
    try {
      const css = generateCSS(state.settings);
      
      // Create or update style element
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
      iframeRef.current.contentWindow.postMessage(
        {
          type: 'customizer-update',
          settings: state.settings,
          css,
        },
        '*'
      );
    } catch (error) {
      console.error('Failed to inject CSS:', error);
    }
  };
  
  // Handle iframe load
  const handleIframeLoad = () => {
    setIsLoading(false);
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
  
  // Refresh preview
  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      iframeRef.current.src = iframeRef.current.src;
    }
  };
  
  // Open in new tab
  const handleExternalLink = () => {
    window.open(currentUrl, '_blank');
  };
  
  // Update CSS when settings change
  useEffect(() => {
    injectCSS();
  }, [state.settings]);
  
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
          <button
            onClick={() => handleDeviceChange('desktop')}
            variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
            title="Desktop preview"
          >
            <Monitor size={16} />
            <span>Desktop</span>
          </button>
          <button
            onClick={() => handleDeviceChange('tablet')}
            variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
            title="Tablet preview"
          >
            <Tablet size={16} />
            <span>Tablet</span>
          </button>
          <button
            onClick={() => handleDeviceChange('mobile')}
            variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
            title="Mobile preview"
          >
            <Smartphone size={16} />
            <span>Mobile</span>
          </button>
        </div>
        
        <div className="wp-customizer-preview-actions">
          <span className="wp-customizer-preview-url">{currentUrl}</span>
          <button
            onClick={handleRefresh}
            className="wp-button-icon"
            title="Refresh preview"
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'spin' : ''} />
          </button>
          <button
            onClick={handleExternalLink}
            className="wp-button-icon"
            title="Open in new tab"
          >
            <ExternalLink size={16} />
          </button>
        </div>
      </div>
      
      {/* Preview Body */}
      <div className="wp-customizer-preview-body">
        <div 
          className={getPreviewClasses()}
          style={{
            width: deviceSizes[previewDevice].width,
            height: deviceSizes[previewDevice].height,
            maxWidth: '100%',
            maxHeight: '100%',
          }}
        >
          {isLoading && (
            <div className="wp-customizer-preview-loading">
              <RefreshCw size={32} className="spin" />
              <p>Loading preview...</p>
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            id="customizer-preview-iframe"
            className="wp-customizer-iframe"
            src={currentUrl}
            onLoad={handleIframeLoad}
            title="Site Preview"
            style={{
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 0.3s',
            }}
          />
        </div>
      </div>
    </div>
  );
};