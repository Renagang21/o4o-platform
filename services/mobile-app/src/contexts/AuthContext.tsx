/**
 * AuthContext — O4O Mobile App 인증 컨텍스트
 *
 * 토큰 저장: expo-secure-store (Native Keystore/Keychain 기반)
 * 향후 개선 예정: PKCE 플로우, Refresh Token 자동 갱신
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import {
  loginApi,
  setAuthToken,
  setUnauthorizedHandler,
  isAccessTokenExpired,
} from '../api/client';

const ACCESS_TOKEN_KEY = 'o4o_mobile_access_token';

interface User {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
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

  // 세션 만료 처리 중복/루프 가드. 다수의 401 이 동시에 와도 1회만 로그아웃한다.
  const expiringRef = useRef(false);
  const hasSessionRef = useRef(false);

  function clearSession() {
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {});
    setAuthToken(null);
    setToken(null);
    setUser(null);
    hasSessionRef.current = false;
  }

  // 401(세션 만료) 핸들러 — apiClient 인터셉터가 호출.
  const handleSessionExpired = useCallback(() => {
    // 이미 로그아웃 중이거나 세션이 없으면 무시 (루프 방지).
    if (expiringRef.current || !hasSessionRef.current) return;
    expiringRef.current = true;
    clearSession();
    router.replace('/(auth)/login');
    Alert.alert('세션 만료', '로그인 시간이 만료되었습니다. 다시 로그인해 주세요.');
  }, []);

  // 인터셉터에 핸들러 등록 (마운트 1회).
  useEffect(() => {
    setUnauthorizedHandler(handleSessionExpired);
    return () => setUnauthorizedHandler(null);
  }, [handleSessionExpired]);

  // 앱 시작 시 저장된 토큰 복원 (만료 토큰은 즉시 폐기).
  useEffect(() => {
    async function restoreToken() {
      try {
        const stored = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
        if (stored && !isAccessTokenExpired(stored)) {
          setToken(stored);
          setAuthToken(stored);
          hasSessionRef.current = true;
        } else if (stored) {
          // 만료/손상 토큰은 복원하지 않고 폐기 → 로그인 화면으로.
          await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY).catch(() => {});
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
      throw new Error(result.error ?? result.message ?? '로그인에 실패했습니다.');
    }

    // 토큰은 data.tokens.accessToken (현행 봉투). data.accessToken 은 레거시 fallback.
    const accessToken = result.data.tokens?.accessToken ?? result.data.accessToken;
    const userData = result.data.user;

    if (!accessToken) {
      throw new Error('로그인 응답에서 토큰을 확인하지 못했습니다.');
    }

    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    setAuthToken(accessToken);
    setToken(accessToken);
    setUser(userData);
    hasSessionRef.current = true;
    expiringRef.current = false; // 새 세션 시작 — 다음 만료를 다시 처리할 수 있도록 가드 해제

    router.replace('/(app)');
  }

  function logout() {
    clearSession();
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
