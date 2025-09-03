// @o4o/auth-context - Authentication Context Package
import * as React from 'react';

// Create AuthContext
export const AuthContext = React.createContext(null);

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = React.useState(null);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  const value = React.useMemo(() => ({
    user,
    setUser,
    isAuthenticated,
    setIsAuthenticated,
    login: async (credentials) => {
      // Placeholder login logic
      setIsAuthenticated(true);
      setUser(credentials);
    },
    logout: async () => {
      setIsAuthenticated(false);
      setUser(null);
    }
  }), [user, isAuthenticated]);

  return React.createElement(AuthContext.Provider, { value }, children);
};

// useAuth hook
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

// useCookieAuth hook (alias for useAuth with additional cookie-specific features)
export const useCookieAuth = () => {
  const authContext = useAuth();
  
  // Add cookie-specific methods
  const logoutAll = async () => {
    // Logout from all sessions
    await authContext.logout();
  };
  
  return {
    ...authContext,
    logoutAll
  };
};

// Cookie-based AuthProvider (alias for now)
export const CookieAuthProvider = AuthProvider;

// SSO AuthProvider (alias for now)
export const SSOAuthProvider = AuthProvider;

// SessionManager utility
export const SessionManager = {
  getInstance: () => ({
    checkSession: async () => true,
    refreshSession: async () => true,
    clearSession: async () => true
  })
};

// AdminProtectedRoute component
export const AdminProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    // In production, redirect to login
    return React.createElement('div', null, 'Please login to continue');
  }
  
  return children;
};

// Default export
export default {
  AuthContext,
  AuthProvider,
  useAuth,
  useCookieAuth,
  CookieAuthProvider,
  SSOAuthProvider,
  SessionManager,
  AdminProtectedRoute
};