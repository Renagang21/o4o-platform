import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { CookieAuthProvider } from './CookieAuthProvider';
import { ssoClient } from '@o4o/auth-client';
export const SSOAuthProvider = ({ children, onAuthChange, enableSSO = true }) => {
    useEffect(() => {
        if (!enableSSO)
            return;
        // Initialize SSO monitoring
        ssoClient.initialize((user) => {
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
    const handleAuthChange = (user) => {
        onAuthChange?.(user);
        if (enableSSO) {
            if (user) {
                ssoClient.broadcastLogin();
            }
            else {
                ssoClient.broadcastLogout();
            }
        }
    };
    return (_jsx(CookieAuthProvider, { onAuthChange: handleAuthChange, children: children }));
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
