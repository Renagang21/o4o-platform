// Version checking utility for cache invalidation
export const checkVersion = async () => {
  try {
    const response = await fetch('/version.json?t=' + Date.now());
    const data = await response.json();
    const storedVersion = localStorage.getItem('app-version');
    
    if (storedVersion && storedVersion !== data.version) {
      console.log('New version detected, clearing cache...');
      
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
      window.location.reload(true);
    } else if (!storedVersion) {
      localStorage.setItem('app-version', data.version);
    }
  } catch (error) {
    console.error('Version check failed:', error);
  }
};

// Check version on app load
export const initVersionCheck = () => {
  checkVersion();
  
  // Check periodically (every 5 minutes)
  setInterval(checkVersion, 5 * 60 * 1000);
  
  // Check on visibility change (when tab becomes active)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      checkVersion();
    }
  });
};