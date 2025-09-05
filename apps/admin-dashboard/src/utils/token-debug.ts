/**
 * Token Debug Utility
 * 토큰 관련 디버깅을 위한 유틸리티
 */

export const debugTokenStatus = () => {
  const tokens = {
    authToken: localStorage.getItem('authToken'),
    accessToken: localStorage.getItem('accessToken'),
    token: localStorage.getItem('token'),
    adminAuthStorage: localStorage.getItem('admin-auth-storage'),
  };

  let adminStorageToken = null;
  if (tokens.adminAuthStorage) {
    try {
      const parsed = JSON.parse(tokens.adminAuthStorage);
      adminStorageToken = parsed.state?.token;
    } catch {
      // Ignore
    }
  }

  const activeToken = tokens.authToken || tokens.accessToken || tokens.token || adminStorageToken;

  if (import.meta.env.DEV) {
    // Debug logging only in development
    const debugLog = (...args: any[]) => {
      // Use logger in development
    };
    
    debugLog('🔐 Token Debug Status');
    debugLog('authToken:', tokens.authToken ? '✅ Present' : '❌ Missing');
    debugLog('accessToken:', tokens.accessToken ? '✅ Present' : '❌ Missing');
    debugLog('token:', tokens.token ? '✅ Present' : '❌ Missing');
    debugLog('admin-auth-storage token:', adminStorageToken ? '✅ Present' : '❌ Missing');
    debugLog('Active token:', activeToken ? `✅ ${activeToken.substring(0, 20)}...` : '❌ No token found');
  }

  return {
    hasToken: !!activeToken,
    activeToken,
    tokens
  };
};

// Auto-run on import in development
if (import.meta.env.DEV) {
  // Run immediately
  debugTokenStatus();
  
  // Also log on window focus
  window.addEventListener('focus', debugTokenStatus);
}

export const getActiveToken = (): string | null => {
  // Check multiple token sources
  let token = localStorage.getItem('authToken');
  if (!token) {
    token = localStorage.getItem('accessToken');
  }
  if (!token) {
    token = localStorage.getItem('token');
  }
  
  // Check Zustand store
  if (!token) {
    const adminStorage = localStorage.getItem('admin-auth-storage');
    if (adminStorage) {
      try {
        const parsed = JSON.parse(adminStorage);
        if (parsed.state?.token) {
          token = parsed.state.token;
        }
      } catch {
        // Ignore parse error
      }
    }
  }
  
  return token;
};