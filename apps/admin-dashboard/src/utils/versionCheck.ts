// Version checking utility for cache invalidation
// Last updated: 2025-09-30
let lastCheckTime = 0;
const MIN_CHECK_INTERVAL = 60000; // Minimum 1 minute between checks

export const checkVersion = async () => {
  // Prevent too frequent checks
  const now = Date.now();
  if (now - lastCheckTime < MIN_CHECK_INTERVAL) {
    return;
  }
  lastCheckTime = now;
  
  try {
    const response = await fetch('/version.json?t=' + now);
    const data = await response.json();
    const storedVersion = localStorage.getItem('app-version');
    
    if (storedVersion && storedVersion !== data.version) {
      // New version detected, clearing cache...
      
      // Clear all caches
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }
      
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Store new version
      localStorage.setItem('app-version', data.version);
      
      // Force reload
      window.location.reload();
    } else if (!storedVersion) {
      localStorage.setItem('app-version', data.version);
    }
  } catch (error) {
    // Version check failed - silently ignore
  }
};

// Check version on app load
let initialized = false;

export const initVersionCheck = () => {
  // Prevent multiple initializations
  if (initialized) return;
  initialized = true;
  
  checkVersion();
  
  // Check periodically (every 30 minutes)
  const intervalId = setInterval(checkVersion, 30 * 60 * 1000);
  
  // Check on visibility change but with debouncing
  let visibilityTimeout: NodeJS.Timeout;
  const handleVisibilityChange = () => {
    if (!document.hidden) {
      clearTimeout(visibilityTimeout);
      visibilityTimeout = setTimeout(() => {
        checkVersion();
      }, 10000); // Wait 10 seconds before checking
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Cleanup function for potential future use
  return () => {
    clearInterval(intervalId);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    initialized = false;
  };
};