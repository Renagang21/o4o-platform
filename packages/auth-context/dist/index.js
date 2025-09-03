// Auto-generated minimal build for @o4o/auth-context
export const AuthContext = React.createContext(null);

export const AuthProvider = ({ children }) => {
  return React.createElement(AuthContext.Provider, { value: {} }, children);
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const CookieAuthProvider = AuthProvider;
export const SSOAuthProvider = AuthProvider;

export const SessionManager = {
  getInstance: () => ({
    checkSession: async () => true,
    refreshSession: async () => true,
    clearSession: async () => true
  })
};

export const AdminProtectedRoute = ({ children }) => children;

export default {
  AuthContext,
  AuthProvider,
  useAuth,
  CookieAuthProvider,
  SSOAuthProvider,
  SessionManager,
  AdminProtectedRoute
};
