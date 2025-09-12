import { AstraCustomizerSettings, CustomizerMessage } from '../types/customizer-types';

/**
 * PostMessage API for communication between customizer and preview iframe
 */

export class PostMessageAPI {
  private targetWindow: Window | null = null;
  private targetOrigin: string = '*';
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  
  constructor(targetWindow?: Window, targetOrigin?: string) {
    if (targetWindow) {
      this.targetWindow = targetWindow;
    }
    if (targetOrigin) {
      this.targetOrigin = targetOrigin;
    }
    
    this.setupMessageListener();
  }
  
  /**
   * Set the target window for sending messages
   */
  setTargetWindow(window: Window) {
    this.targetWindow = window;
  }
  
  /**
   * Set the target origin for security
   */
  setTargetOrigin(origin: string) {
    this.targetOrigin = origin;
  }
  
  /**
   * Send a message to the target window
   */
  send(type: CustomizerMessage['type'], payload?: any) {
    if (!this.targetWindow) {
      console.warn('No target window set for PostMessage');
      return;
    }
    
    const message: CustomizerMessage = {
      type,
      payload,
    };
    
    try {
      this.targetWindow.postMessage(message, this.targetOrigin);
    } catch (error) {
      console.error('Failed to send PostMessage:', error);
    }
  }
  
  /**
   * Register a listener for a specific message type
   */
  on(type: string, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
    
    return () => {
      this.off(type, callback);
    };
  }
  
  /**
   * Remove a listener
   */
  off(type: string, callback: (data: any) => void) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(type);
      }
    }
  }
  
  /**
   * Setup the message event listener
   */
  private setupMessageListener() {
    window.addEventListener('message', (event: MessageEvent<CustomizerMessage>) => {
      // Validate origin if needed
      if (this.targetOrigin !== '*' && event.origin !== this.targetOrigin) {
        return;
      }
      
      // Check if message has the expected structure
      if (!event.data || typeof event.data.type !== 'string') {
        return;
      }
      
      // Trigger registered callbacks
      const callbacks = this.listeners.get(event.data.type);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(event.data.payload);
          } catch (error) {
            console.error('Error in PostMessage callback:', error);
          }
        });
      }
    });
  }
  
  /**
   * Send settings update to preview
   */
  sendSettingsUpdate(settings: AstraCustomizerSettings, css?: string) {
    this.send('setting-change', { settings, css });
  }
  
  /**
   * Send device change to preview
   */
  sendDeviceChange(device: 'desktop' | 'tablet' | 'mobile') {
    this.send('device-change', { device });
  }
  
  /**
   * Request preview to save its state
   */
  requestPreviewSave() {
    this.send('save', {});
  }
  
  /**
   * Request preview to reset
   */
  requestPreviewReset() {
    this.send('reset', {});
  }
  
  /**
   * Destroy the PostMessage API and cleanup
   */
  destroy() {
    this.listeners.clear();
    this.targetWindow = null;
  }
}

/**
 * Create a singleton instance for the customizer
 */
let customizerPostMessage: PostMessageAPI | null = null;

export function getCustomizerPostMessage(): PostMessageAPI {
  if (!customizerPostMessage) {
    customizerPostMessage = new PostMessageAPI();
  }
  return customizerPostMessage;
}

export function destroyCustomizerPostMessage() {
  if (customizerPostMessage) {
    customizerPostMessage.destroy();
    customizerPostMessage = null;
  }
}

/**
 * Preview script to inject into the iframe
 */
export const PREVIEW_SCRIPT = `
(function() {
  // Listen for customizer messages
  window.addEventListener('message', function(event) {
    if (!event.data || !event.data.type) return;
    
    switch(event.data.type) {
      case 'setting-change':
        handleSettingChange(event.data.payload);
        break;
      case 'device-change':
        handleDeviceChange(event.data.payload);
        break;
      case 'save':
        handleSave();
        break;
      case 'reset':
        handleReset();
        break;
    }
  });
  
  function handleSettingChange(payload) {
    const { settings, css } = payload;
    
    // Update CSS
    if (css) {
      let styleEl = document.getElementById('astra-customizer-css');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'astra-customizer-css';
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = css;
    }
    
    // Trigger custom event for any JavaScript that needs to respond
    window.dispatchEvent(new CustomEvent('customizer-update', {
      detail: settings
    }));
  }
  
  function handleDeviceChange(payload) {
    const { device } = payload;
    
    // Add device class to body
    document.body.className = document.body.className
      .replace(/device-\\w+/g, '')
      .trim() + ' device-' + device;
    
    // Trigger custom event
    window.dispatchEvent(new CustomEvent('customizer-device-change', {
      detail: { device }
    }));
  }
  
  function handleSave() {
    // Trigger save event
    window.dispatchEvent(new CustomEvent('customizer-save'));
  }
  
  function handleReset() {
    // Reset any temporary changes
    const styleEl = document.getElementById('astra-customizer-css');
    if (styleEl) {
      styleEl.remove();
    }
    
    // Trigger reset event
    window.dispatchEvent(new CustomEvent('customizer-reset'));
  }
  
  // Send ready message to parent
  window.parent.postMessage({ type: 'preview-ready' }, '*');
  
  // Track navigation
  let currentUrl = window.location.href;
  setInterval(function() {
    if (window.location.href !== currentUrl) {
      currentUrl = window.location.href;
      window.parent.postMessage({ 
        type: 'navigate', 
        url: currentUrl 
      }, '*');
    }
  }, 500);
})();
`;