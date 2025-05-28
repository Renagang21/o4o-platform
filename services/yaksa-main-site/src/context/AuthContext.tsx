import React, { createContext, useContext, useState, ReactNode } from 'react';

// 'User' 인터페이스를 export 합니다.
export interface User {
  id: string; // id 속성이 여기에 포함되어 있어야 합니다.
  name: string;
  email: string;
  role: 'admin' | 'yaksa' | 'user';
}

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

// AuthContext를 export 합니다.
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth는 user만 반환하도록
export const useAuth = (): User | null => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context.user;
};

