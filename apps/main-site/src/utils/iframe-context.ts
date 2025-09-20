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
 * Initialize iframe-aware behavior
 * Should be called early in the application lifecycle
 */
export const initializeIframeContext = () => {
  const inIframe = isInIframe();
  
  if (inIframe) {
    // Running in iframe context - History API will be disabled
    
    // Add CSS class to body for iframe-specific styling
    document.body.classList.add('in-iframe');
    
    // Prevent certain behaviors that don't work well in iframes
    // Like opening new windows, etc.
    
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