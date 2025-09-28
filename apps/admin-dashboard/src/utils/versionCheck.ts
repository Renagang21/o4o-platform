// Version checking utility for cache invalidation
export const checkVersion = async () => {
  try {
    const response = await fetch('/version.json?t=' + Date.now());
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
export const initVersionCheck = () => {
  checkVersion();
  
  // Check periodically (every 30 minutes instead of 5)
  setInterval(checkVersion, 30 * 60 * 1000);
  
  // Check on visibility change but with debouncing
  let visibilityTimeout: NodeJS.Timeout;
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      clearTimeout(visibilityTimeout);
      visibilityTimeout = setTimeout(() => {
        checkVersion();
      }, 5000); // Wait 5 seconds before checking
    }
  });
};