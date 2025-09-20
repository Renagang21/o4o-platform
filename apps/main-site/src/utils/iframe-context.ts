/**
 * Iframe context detection and management utilities
 * Helps prevent History API errors when the site is embedded in an iframe
 */

/**
 * Check if the current window is running inside an iframe
 */
export const isInIframe = (): boolean => {
  try {
    return window !== window.parent;
  } catch (e) {
    // If we can't access parent due to cross-origin, assume we're in iframe
    return true;
  }
};

/**
 * Safe wrapper for History API methods that checks iframe context
 */
export const safeHistoryAPI = {
  pushState: (data: any, title: string, url?: string | URL | null) => {
    if (!isInIframe()) {
      try {
        window.history.pushState(data, title, url);
      } catch (error) {
        console.warn('History.pushState failed:', error);
      }
    } else {
      // History.pushState skipped in iframe context
    }
  },

  replaceState: (data: any, title: string, url?: string | URL | null) => {
    if (!isInIframe()) {
      try {
        window.history.replaceState(data, title, url);
      } catch (error) {
        console.warn('History.replaceState failed:', error);
      }
    } else {
      // History.replaceState skipped in iframe context
    }
  },

  back: () => {
    if (!isInIframe()) {
      try {
        window.history.back();
      } catch (error) {
        console.warn('History.back failed:', error);
      }
    } else {
      // History.back skipped in iframe context
    }
  },

  forward: () => {
    if (!isInIframe()) {
      try {
        window.history.forward();
      } catch (error) {
        console.warn('History.forward failed:', error);
      }
    } else {
      // History.forward skipped in iframe context
    }
  },

  go: (delta: number) => {
    if (!isInIframe()) {
      try {
        window.history.go(delta);
      } catch (error) {
        console.warn('History.go failed:', error);
      }
    } else {
      // History.go skipped in iframe context
    }
  }
};

/**
 * Patch the global History API to prevent errors in iframe context
 * This must be called before React Router initializes
 */
export const patchHistoryAPI = () => {
  if (!isInIframe()) return; // Only patch in iframe context

  // Store original methods
  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);
  const originalBack = window.history.back.bind(window.history);
  const originalForward = window.history.forward.bind(window.history);
  const originalGo = window.history.go.bind(window.history);

  // Override pushState - completely silent in iframe
  window.history.pushState = function(data: any, title: string, url?: string | URL | null) {
    // Completely ignore in iframe context - no errors, no actions
    return;
  };

  // Override replaceState - completely silent in iframe
  window.history.replaceState = function(data: any, title: string, url?: string | URL | null) {
    // Completely ignore in iframe context - no errors, no actions
    return;
  };

  // Override navigation methods to prevent errors
  window.history.back = function() {
    // In iframe context, back navigation is usually blocked
    // Send message to parent instead
    try {
      window.parent.postMessage({ type: 'navigate-back' }, '*');
    } catch (error) {
      // Silently ignore
    }
  };

  window.history.forward = function() {
    try {
      window.parent.postMessage({ type: 'navigate-forward' }, '*');
    } catch (error) {
      // Silently ignore
    }
  };

  window.history.go = function(delta: number) {
    try {
      window.parent.postMessage({ type: 'navigate-go', delta }, '*');
    } catch (error) {
      // Silently ignore
    }
  };
  
  // Also override the prototype to catch any other calls
  const HistoryProto = Object.getPrototypeOf(window.history);
  
  // Backup originals
  const originalPushStateProto = HistoryProto.pushState;
  const originalReplaceStateProto = HistoryProto.replaceState;
  
  // Override prototype methods
  HistoryProto.pushState = function(data: any, title: string, url?: string | URL | null) {
    // Silent in iframe
    return;
  };
  
  HistoryProto.replaceState = function(data: any, title: string, url?: string | URL | null) {
    // Silent in iframe
    return;
  };
};

/**
 * Initialize iframe-aware behavior
 * Should be called early in the application lifecycle
 */
export const initializeIframeContext = () => {
  const inIframe = isInIframe();
  
  if (inIframe) {
    // Running in iframe context - History API will be disabled
    
    // Patch the global History API BEFORE React Router starts
    patchHistoryAPI();
    
    // Add CSS class to body for iframe-specific styling
    document.body.classList.add('in-iframe');
    
    // Send message to parent frame that we're ready
    try {
      window.parent.postMessage({
        type: 'iframe-ready',
        url: window.location.href
      }, '*');
    } catch (error) {
      console.warn('Could not send message to parent frame:', error);
    }
  } else {
    document.body.classList.add('standalone');
  }
  
  return inIframe;
};

/**
 * Safe navigation for iframe context
 * Uses window.location instead of History API when in iframe
 */
export const safeNavigate = (url: string) => {
  if (isInIframe()) {
    // In iframe, use location.href for navigation
    window.location.href = url;
  } else {
    // In standalone, can use normal navigation
    safeHistoryAPI.pushState(null, '', url);
  }
};