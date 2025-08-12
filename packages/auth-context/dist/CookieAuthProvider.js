import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { cookieAuthClient } from '@o4o/auth-client';
import { WebSocketSessionClient } from './services/WebSocketSessionClient';
const CookieAuthContext = createContext(undefined);
export const CookieAuthProvider = ({ children, onAuthChange, enableSessionSync = true, sessionCheckInterval = 30000 }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const wsClientRef = useRef(null);
    // Check authentication status
    const checkAuth = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const currentUser = await cookieAuthClient.getCurrentUser();
            setUser(currentUser);
            onAuthChange?.(currentUser);
            // Initialize WebSocket if user is authenticated and token exists
            if (currentUser && enableSessionSync) {
                const token = cookieAuthClient.getAccessToken();
                if (token) {
                    initializeSessionSync(token);
                }
            }
        }
        catch (err) {
            setUser(null);
            onAuthChange?.(null);
        }
        finally {
            setLoading(false);
        }
    }, [onAuthChange]);
    // Initialize WebSocket session sync
    const initializeSessionSync = useCallback((token) => {
        if (!enableSessionSync || !token)
            return;
        // Create WebSocket client if not exists
        if (!wsClientRef.current) {
            wsClientRef.current = new WebSocketSessionClient(cookieAuthClient.getApiUrl(), sessionCheckInterval);
        }
        // Connect with callbacks
        wsClientRef.current.connect(token, {
            onSessionEvent: (event) => {
                // console.log('[Auth] Session event:', event);
                // Handle different session events
                switch (event.event) {
                    case 'logout_all':
                    case 'removed':
                        // Force re-authentication check
                        checkAuth();
                        break;
                    case 'created':
                    case 'refreshed':
                        // New session created or refreshed, might want to notify user
                        break;
                }
            },
            onForceLogout: (reason) => {
                // console.log('[Auth] Force logout:', reason);
                // Clear local auth state
                setUser(null);
                setError(reason);
                onAuthChange?.(null);
                // Disconnect WebSocket
                wsClientRef.current?.disconnect();
            }
        });
    }, [enableSessionSync, sessionCheckInterval, checkAuth, onAuthChange]);
    // Cleanup WebSocket on unmount
    useEffect(() => {
        return () => {
            wsClientRef.current?.disconnect();
        };
    }, []);
    // Initial auth check
    useEffect(() => {
        checkAuth();
    }, [checkAuth]);
    // Login
    const login = useCallback(async (credentials) => {
        try {
            setError(null);
            setLoading(true);
            const response = await cookieAuthClient.loginWithSync(credentials);
            if (response.success && response.user) {
                setUser(response.user);
                onAuthChange?.(response.user);
                // Initialize WebSocket session sync with new token
                if (response.token) {
                    initializeSessionSync(response.token);
                }
            }
        }
        catch (err) {
            const errorMessage = err.response?.data?.error || 'Login failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
        finally {
            setLoading(false);
        }
    }, [onAuthChange]);
    // Register
    const register = useCallback(async (data) => {
        try {
            setError(null);
            setLoading(true);
            const response = await cookieAuthClient.register(data);
            if (!response.success) {
                throw new Error(response.message || 'Registration failed');
            }
            // Note: User may need approval, so we don't automatically log them in
        }
        catch (err) {
            const errorMessage = err.response?.data?.error || 'Registration failed';
            setError(errorMessage);
            throw new Error(errorMessage);
        }
        finally {
            setLoading(false);
        }
    }, []);
    // Logout
    const logout = useCallback(async () => {
        try {
            setLoading(true);
            await cookieAuthClient.logoutWithSync();
            setUser(null);
            onAuthChange?.(null);
            // Disconnect WebSocket
            wsClientRef.current?.disconnect();
        }
        catch (err) {
            console.error('Logout error:', err);
        }
        finally {
            setLoading(false);
        }
    }, [onAuthChange]);
    // Logout from all devices
    const logoutAll = useCallback(async () => {
        try {
            setLoading(true);
            await cookieAuthClient.logoutAll();
            setUser(null);
            onAuthChange?.(null);
            // Disconnect WebSocket
            wsClientRef.current?.disconnect();
        }
        catch (err) {
            console.error('Logout all error:', err);
        }
        finally {
            setLoading(false);
        }
    }, [onAuthChange]);
    // Check if user has specific role(s)
    const hasRole = useCallback((role) => {
        if (!user)
            return false;
        const roles = Array.isArray(role) ? role : [role];
        return roles.includes(user.role);
    }, [user]);
    // Check if user has specific permission
    const hasPermission = useCallback((permission) => {
        if (!user)
            return false;
        if (user.role === 'admin')
            return true; // Admin has all permissions
        return user.permissions?.includes(permission) || false;
    }, [user]);
    const value = {
        user,
        loading,
        error,
        login,
        register,
        logout,
        logoutAll,
        checkAuth,
        isAuthenticated: !!user,
        hasRole,
        hasPermission,
    };
    return (_jsx(CookieAuthContext.Provider, { value: value, children: children }));
};
export const useCookieAuth = () => {
    const context = useContext(CookieAuthContext);
    if (context === undefined) {
        throw new Error('useCookieAuth must be used within a CookieAuthProvider');
    }
    return context;
};
// Higher-order component for role-based access
export const withRole = (Component, allowedRoles) => {
    return (props) => {
        const { hasRole, loading } = useCookieAuth();
        if (loading) {
            return _jsx("div", { children: "Loading..." });
        }
        if (!hasRole(allowedRoles)) {
            return _jsx("div", { children: "Access denied. You don't have the required role." });
        }
        return _jsx(Component, { ...props });
    };
};
// Hook for role-based rendering
export const useRoleAccess = (allowedRoles) => {
    const { hasRole } = useCookieAuth();
    return hasRole(allowedRoles);
};
