/**
 * CustomizerPreview - Live preview iframe with PostMessage communication
 */

import React, { forwardRef, useEffect, useState } from 'react';
import { CustomizerSettings } from '../WordPressCustomizer';
import { Loader2 } from 'lucide-react';

interface CustomizerPreviewProps {
  settings: CustomizerSettings;
  devicePreview: 'desktop' | 'tablet' | 'mobile';
}

export const CustomizerPreview = forwardRef<HTMLIFrameElement, CustomizerPreviewProps>(
  ({ settings, devicePreview }, ref) => {
    const [isLoading, setIsLoading] = useState(true);
    const [previewUrl, setPreviewUrl] = useState('/preview');

    useEffect(() => {
      // Add device class to iframe on load
      if (ref && 'current' in ref && ref.current) {
        const iframe = ref.current;
        
        iframe.onload = () => {
          setIsLoading(false);
          
          // Send initial settings to iframe
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'initSettings',
              data: settings
            }, '*');
          }
        };
      }
    }, [ref, settings]);

    // Update preview when device changes
    useEffect(() => {
      if (ref && 'current' in ref && ref.current?.contentWindow) {
        ref.current.contentWindow.postMessage({
          type: 'deviceChange',
          device: devicePreview
        }, '*');
      }
    }, [devicePreview, ref]);

    return (
      <div className="preview-container">
        {isLoading && (
          <div className="preview-loading">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="mt-2 text-sm text-gray-600">Loading preview...</p>
          </div>
        )}
        
        <iframe
          ref={ref}
          src={previewUrl}
          className={`preview-iframe ${isLoading ? 'loading' : ''}`}
          title="Theme Preview"
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    );
  }
);

CustomizerPreview.displayName = 'CustomizerPreview';

export default CustomizerPreview;