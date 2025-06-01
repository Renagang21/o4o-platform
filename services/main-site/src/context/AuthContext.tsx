import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 'User' 인터페이스를 export 합니다.
export interface User {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
}

export type UserRole = 'user' | 'member' | 'contributor' | 'seller' | 'vendor' | 'partner' | 'operator' | 'administrator';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  register: (data: Omit<User, 'id'> & { password: string }) => Promise<{ success: boolean; message?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// mock 사용자 데이터
const mockUsers: (User & { password: string })[] = [
  { id: '1', name: '최고관리자', email: 'admin@neture.co.kr', password: 'admin123', roles: ['administrator', 'operator'] },
  { id: '2', name: '운영자', email: 'operator@neture.co.kr', password: 'operator123', roles: ['operator'] },
  { id: '3', name: '판매자', email: 'seller@neture.co.kr', password: 'seller123', roles: ['seller'] },
  { id: '4', name: '공급자', email: 'vendor@neture.co.kr', password: 'vendor123', roles: ['vendor'] },
  { id: '5', name: '제휴사', email: 'partner@neture.co.kr', password: 'partner123', roles: ['partner'] },
  { id: '6', name: '콘텐츠기여자', email: 'contributor@neture.co.kr', password: 'contrib123', roles: ['contributor'] },
  { id: '7', name: '일반회원', email: 'member@neture.co.kr', password: 'member123', roles: ['member'] },
  { id: '8', name: '방문자', email: 'user@neture.co.kr', password: 'user123', roles: ['user'] },
];

const LOCAL_KEY = 'neture_auth_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  // localStorage에서 유저 정보 불러오기
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_KEY);
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  // 로그인 함수
  const login = async (email: string, password: string) => {
    const found = mockUsers.find(u => u.email === email && u.password === password);
    if (found) {
      const { password, ...userInfo } = found;
      setUser(userInfo);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(userInfo));
      return { success: true };
    }
    return { success: false, message: '이메일 또는 비밀번호가 올바르지 않습니다.' };
  };

  // 로그아웃 함수
  const logout = () => {
    setUser(null);
    localStorage.removeItem(LOCAL_KEY);
  };

  // 회원가입 함수 (mock)
  const register = async (data: Omit<User, 'id'> & { password: string }) => {
    if (mockUsers.find(u => u.email === data.email)) {
      return { success: false, message: '이미 존재하는 이메일입니다.' };
    }
    const newUser: User = { id: String(Date.now()), name: data.name, email: data.email, roles: data.roles };
    mockUsers.push({ ...newUser, password: data.password });
    return { success: true };
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

