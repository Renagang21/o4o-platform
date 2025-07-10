import React, { useState, ReactNode } from 'react';
import { AuthContext } from './AuthContext';
import { AuthClient, type User } from '@o4o/auth-client';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const authClient = new AuthClient(process.env.VITE_API_BASE_URL || '');

  const login = async (email: string, password: string) => {
    const response = await authClient.login({ email, password });
    setUser(response.user);
  };

  const logout = () => {
    authClient.logout();
    setUser(null);
  };

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};