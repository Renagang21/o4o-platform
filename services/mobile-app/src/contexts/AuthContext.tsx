/**
 * AuthContext — O4O Mobile App 인증 컨텍스트
 *
 * 토큰 저장: expo-secure-store (Native Keystore/Keychain 기반)
 * 향후 개선 예정: PKCE 플로우, Refresh Token 자동 갱신
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { loginApi, setAuthToken } from '../api/client';

const ACCESS_TOKEN_KEY = 'o4o_mobile_access_token';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthContextValue {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 앱 시작 시 저장된 토큰 복원
  useEffect(() => {
    async function restoreToken() {
      try {
        const stored = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (stored) {
          setToken(stored);
          setAuthToken(stored);
        }
      } catch {
        // 복원 실패 시 로그인 화면으로 자연스럽게 이동
      } finally {
        setIsLoading(false);
      }
    }
    restoreToken();
  }, []);

  async function login(email: string, password: string) {
    const result = await loginApi(email, password);

    if (!result.success || !result.data) {
      throw new Error(result.error ?? '로그인에 실패했습니다.');
    }

    const { accessToken, user: userData } = result.data;

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(userData);

    router.replace('/(app)');
  }

  function logout() {
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {});
    setAuthToken(null);
    setToken(null);
    setUser(null);
    router.replace('/(auth)/login');
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
