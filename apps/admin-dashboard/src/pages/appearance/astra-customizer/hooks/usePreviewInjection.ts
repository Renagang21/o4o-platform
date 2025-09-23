import { useEffect, useRef, useCallback } from 'react';
import { AstraCustomizerSettings } from '../types/customizer-types';
import { generateCSS } from '../utils/css-generator';
import { getCustomizerPostMessage, PREVIEW_SCRIPT } from '../utils/postmessage';

interface UsePreviewInjectionOptions {
  settings: AstraCustomizerSettings;
  iframeId?: string;
  autoInject?: boolean;
}

export function usePreviewInjection({
  settings,
  iframeId = 'customizer-preview-iframe',
  autoInject = true,
}: UsePreviewInjectionOptions) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const injectedRef = useRef(false);
  const postMessage = getCustomizerPostMessage();
  
  /**
   * Get the iframe element
   */
  const getIframe = useCallback((): HTMLIFrameElement | null => {
    if (iframeRef.current) {
      return iframeRef.current;
    }
    
    const iframe = document.getElementById(iframeId) as HTMLIFrameElement;
    if (iframe) {
      iframeRef.current = iframe;
      return iframe;
    }
    
    return null;
  }, [iframeId]);
  
  /**
   * Inject the preview script into the iframe
   */
  const injectScript = useCallback(() => {
    const iframe = getIframe();
    if (!iframe || !iframe.contentDocument) {
      return false;
    }
    
    try {
      // Check if script already injected
      if (iframe.contentDocument.getElementById('astra-customizer-script')) {
        return true;
      }
      
      // Create and inject script
      const script = iframe.contentDocument.createElement('script');
      script.id = 'astra-customizer-script';
      script.textContent = PREVIEW_SCRIPT;
      iframe.contentDocument.head.appendChild(script);
      
      injectedRef.current = true;
      return true;
    } catch (error) {
      // Failed to inject preview script
      return false;
    }
  }, [getIframe]);
  
  /**
   * Inject CSS into the iframe
   */
  const injectCSS = useCallback((css?: string) => {
    const iframe = getIframe();
    if (!iframe || !iframe.contentDocument) {
      return false;
    }
    
    try {
      const generatedCSS = css || generateCSS(settings);
      
      let styleEl = iframe.contentDocument.getElementById('astra-customizer-css');
      if (!styleEl) {
        styleEl = iframe.contentDocument.createElement('style');
        styleEl.id = 'astra-customizer-css';
        iframe.contentDocument.head.appendChild(styleEl);
      }
      
      styleEl.textContent = generatedCSS;
      return true;
    } catch (error) {
      // Failed to inject CSS
      return false;
    }
  }, [getIframe, settings]);
  
  /**
   * Update preview with new settings
   */
  const updatePreview = useCallback((newSettings?: AstraCustomizerSettings) => {
    const settingsToUse = newSettings || settings;
    const css = generateCSS(settingsToUse);
    
    // Try direct injection first
    const injected = injectCSS(css);
    
    // Also send via PostMessage
    const iframe = getIframe();
    if (iframe?.contentWindow) {
      postMessage.setTargetWindow(iframe.contentWindow);
      postMessage.sendSettingsUpdate(settingsToUse, css);
    }
    
    return injected;
  }, [settings, injectCSS, getIframe, postMessage]);
  
  /**
   * Force refresh the preview
   */
  const refreshPreview = useCallback(() => {
    const iframe = getIframe();
    if (iframe) {
      injectedRef.current = false;
      iframe.src = iframe.src;
    }
  }, [getIframe]);
  
  /**
   * Handle iframe load event
   */
  const handleIframeLoad = useCallback(() => {
    // Wait a bit for iframe to be ready
    setTimeout(() => {
      if (injectScript()) {
        updatePreview();
      }
    }, 100);
  }, [injectScript, updatePreview]);
  
  // Auto-inject when iframe loads
  useEffect(() => {
    if (!autoInject) return;
    
    const iframe = getIframe();
    if (!iframe) return;
    
    iframe.addEventListener('load', handleIframeLoad);
    
    // If already loaded, inject immediately
    if (iframe.contentDocument?.readyState === 'complete') {
      handleIframeLoad();
    }
    
    return () => {
      iframe.removeEventListener('load', handleIframeLoad);
    };
  }, [autoInject, getIframe, handleIframeLoad]);
  
  // Update preview when settings change
  useEffect(() => {
    if (injectedRef.current && autoInject) {
      updatePreview();
    }
  }, [settings, updatePreview, autoInject]);
  
  // Listen for PostMessage events
  useEffect(() => {
    const unsubscribe = postMessage.on('preview-ready', () => {
      updatePreview();
    });
    
    return unsubscribe;
  }, [postMessage, updatePreview]);
  
  return {
    injectScript,
    injectCSS,
    updatePreview,
    refreshPreview,
    isInjected: injectedRef.current,
    iframe: iframeRef.current,
  };
}

/**
 * Hook to handle live preview updates with selective refresh
 */
export function useSelectiveRefresh(settings: AstraCustomizerSettings) {
  const previousSettingsRef = useRef(settings);
  const postMessage = getCustomizerPostMessage();
  
  useEffect(() => {
    const previousSettings = previousSettingsRef.current;
    
    // Determine what changed
    const changes: string[] = [];
    
    // Check each section for changes
    Object.keys(settings).forEach(key => {
      if (key === '_meta') return;
      
      const prevValue = previousSettings[key as keyof AstraCustomizerSettings];
      const newValue = settings[key as keyof AstraCustomizerSettings];
      
      if (JSON.stringify(prevValue) !== JSON.stringify(newValue)) {
        changes.push(key);
      }
    });
    
    // Send selective refresh message
    if (changes.length > 0) {
      postMessage.send('selective-refresh', { changes, settings });
    }
    
    previousSettingsRef.current = settings;
  }, [settings, postMessage]);
}