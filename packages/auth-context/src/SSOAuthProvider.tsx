import { FC, useEffect, useState } from 'react';
import { CookieAuthProvider, CookieAuthProviderProps } from './CookieAuthProvider';
import { ssoClient, User } from '@o4o/auth-client';

export interface SSOAuthProviderProps extends CookieAuthProviderProps {
  enableSSO?: boolean;
  ssoCheckInterval?: number;
}

export const SSOAuthProvider: FC<SSOAuthProviderProps> = ({ 
  children, 
  onAuthChange,
  enableSSO = true
}) => {
  useEffect(() => {
    if (!enableSSO) return;

    // Initialize SSO monitoring
    ssoClient.initialize((user: User | null) => {
      // When SSO detects a session change, trigger auth check
      if (!user) {
        // Session was invalidated, reload to trigger logout
        window.location.reload();
      }
    });

    return () => {
      ssoClient.destroy();
    };
  }, [enableSSO]);

  // Enhanced auth change handler that broadcasts SSO events
  const handleAuthChange = (user: User | null) => {
    onAuthChange?.(user);
    
    if (enableSSO) {
      if (user) {
        ssoClient.broadcastLogin();
      } else {
        ssoClient.broadcastLogout();
      }
    }
  };

  return (
    <CookieAuthProvider onAuthChange={handleAuthChange}>
      {children}
    </CookieAuthProvider>
  );
};

// Hook to check SSO status
export const useSSO = () => {
  const [hasSession, setHasSession] = useState(false);
  
  useEffect(() => {
    const checkSession = () => {
      setHasSession(ssoClient.hasSession());
    };
    
    checkSession();
    
    // Check periodically
    const interval = setInterval(checkSession, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return { hasSession };
};