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
      // No target window set for PostMessage
      return;
    }
    
    const message: CustomizerMessage = {
      type,
      payload,
    };
    
    try {
      this.targetWindow.postMessage(message, this.targetOrigin);
    } catch (error) {
      // Failed to send PostMessage
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

      // Trigger registered callbacks - optimized with early exit
      const callbacks = this.listeners.get(event.data.type);
      if (!callbacks || callbacks.size === 0) {
        return;
      }

      // Use for...of instead of forEach for better performance
      const payload = event.data.payload;
      for (const callback of callbacks) {
        try {
          callback(payload);
        } catch (error) {
          // Error in PostMessage callback - fail silently
        }
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
 * Phase 2: Added customizer:update handler for real-time customCSS preview
 */
export const PREVIEW_SCRIPT = `
(function() {
  let pendingUpdate = null;
  let rafId = null;

  // Origin validation for security
  const ALLOWED_ORIGINS = [
    window.location.origin,
    'https://admin.neture.co.kr',
    'http://localhost:5173',
    'http://localhost:3000'
  ];

  function isOriginAllowed(origin) {
    return ALLOWED_ORIGINS.some(function(allowed) {
      return origin === allowed || origin.endsWith('.neture.co.kr');
    });
  }

  // Message handler with origin validation
  window.addEventListener('message', function(event) {
    // Validate origin
    if (!isOriginAllowed(event.origin)) {
      console.warn('[Customizer Preview] Blocked message from unauthorized origin:', event.origin);
      return;
    }

    if (!event.data || !event.data.type) return;

    switch(event.data.type) {
      case 'customizer:update':
        handleCustomizerUpdate(event.data.payload);
        break;
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

  /**
   * Handle customizer:update message for real-time customCSS preview
   * Phase 2: Separate handler for customCSS with dedicated style tag
   */
  function handleCustomizerUpdate(payload) {
    const { kind, value } = payload;

    if (kind === 'customCSS') {
      // Batch DOM updates with RAF
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(function() {
        let styleEl = document.getElementById('customizer-user-css');
        if (!styleEl) {
          styleEl = document.createElement('style');
          styleEl.id = 'customizer-user-css';
          // Insert at the end of head to ensure highest specificity
          document.head.appendChild(styleEl);
        }
        styleEl.textContent = value || '';

        // Trigger custom event
        window.dispatchEvent(new CustomEvent('customizer-css-update', {
          detail: { css: value }
        }));
      });
    }
  }

  function handleSettingChange(payload) {
    const { settings, css } = payload;

    // Batch DOM updates with RAF
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(function() {
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
    });
  }

  function handleDeviceChange(payload) {
    const { device } = payload;

    // Use classList API to avoid forced reflow
    requestAnimationFrame(function() {
      const classList = document.body.classList;
      classList.forEach(function(className) {
        if (className.startsWith('device-')) {
          classList.remove(className);
        }
      });
      classList.add('device-' + device);

      // Trigger custom event
      window.dispatchEvent(new CustomEvent('customizer-device-change', {
        detail: { device }
      }));
    });
  }

  function handleSave() {
    // Trigger save event
    window.dispatchEvent(new CustomEvent('customizer-save'));
  }

  function handleReset() {
    // Reset any temporary changes
    requestAnimationFrame(function() {
      const styleEl = document.getElementById('astra-customizer-css');
      if (styleEl) {
        styleEl.remove();
      }

      // Trigger reset event
      window.dispatchEvent(new CustomEvent('customizer-reset'));
    });
  }

  // Send ready message to parent
  window.parent.postMessage({ type: 'preview-ready' }, '*');

  // Track navigation efficiently using popstate and hashchange events
  let currentUrl = window.location.href;

  function notifyNavigation() {
    const newUrl = window.location.href;
    if (newUrl !== currentUrl) {
      currentUrl = newUrl;
      window.parent.postMessage({
        type: 'navigate',
        url: currentUrl
      }, '*');
    }
  }

  // Use native events instead of polling
  window.addEventListener('popstate', notifyNavigation);
  window.addEventListener('hashchange', notifyNavigation);

  // Also watch for click events on links (for SPA navigation)
  document.addEventListener('click', function(e) {
    const target = e.target.closest('a');
    if (target && target.href) {
      setTimeout(notifyNavigation, 100);
    }
  });
})();
`;