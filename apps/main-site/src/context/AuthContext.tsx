import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authApi } from '../api/auth/authApi';
import { AuthState, LoginRequest, RegisterRequest, User, UserRole } from '../api/auth/types';

// User 타입과 UserRole re-export
export type { User, UserRole };

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string; isSSO: boolean } }
  | { type: 'LOGIN_FAILURE'; payload: { message: string; code: string } }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER_START' }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User } }
  | { type: 'REGISTER_FAILURE'; payload: { message: string; code: string } }
  | { type: 'TOKEN_REFRESH_SUCCESS'; payload: { token: string } }
  | { type: 'TOKEN_REFRESH_FAILURE' };

// AuthState 확장
interface ExtendedAuthState extends AuthState {
  isSSO: boolean;
  tokenExpiry: number | null;
}

const initialState: ExtendedAuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isSSO: false,
  tokenExpiry: null,
};

const authReducer = (state: ExtendedAuthState, action: AuthAction): ExtendedAuthState => {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REGISTER_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isSSO: action.payload.isSSO,
        tokenExpiry: action.payload.isSSO ? Date.now() + (15 * 60 * 1000) : null, // SSO는 15분 후 만료
      };
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
    case 'REGISTER_FAILURE':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
      };
    case 'TOKEN_REFRESH_SUCCESS':
      return {
        ...state,
        token: action.payload.token,
        tokenExpiry: Date.now() + (15 * 60 * 1000), // 15분 후 만료
        error: null,
      };
    case 'TOKEN_REFRESH_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        token: null,
        user: null,
        isSSO: false,
        tokenExpiry: null,
      };
    case 'LOGOUT':
      return initialState;
    default:
      return state;
  }
};

const AuthContext = createContext<{
  state: ExtendedAuthState;
  user: User | null;
  login: (email: string, password: string) => Promise<void>; // 새로운 로그인 인터페이스
  logout: () => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>; // 회원가입 추가
  refreshToken: () => Promise<boolean>; // 토큰 갱신
  isSSO: boolean; // SSO 사용 여부
} | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // 초기 인증 상태 복원
  useEffect(() => {
    const initializeAuth = async () => {
      if (authApi.isAuthenticated()) {
        try {
          const user = await authApi.getCurrentUser();
          const token = authApi.getToken();
          const isSSO = authApi.isUsingSSO();
          
          if (user && token) {
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: { user, token, isSSO },
            });
          }
        } catch (error: any) {
          console.error('인증 상태 복원 실패:', error);
          dispatch({ type: 'LOGOUT' });
        }
      }
    };

    initializeAuth();
  }, []);

  // SSO 토큰 자동 갱신 타이머
  useEffect(() => {
    if (state.isSSO && state.tokenExpiry) {
      const refreshTime = state.tokenExpiry - Date.now() - (2 * 60 * 1000); // 만료 2분 전
      
      if (refreshTime > 0) {
        const timer = setTimeout(async () => {
          try {
            const success = await authApi.refreshToken();
            if (success) {
              const newToken = authApi.getToken();
              if (newToken) {
                dispatch({
                  type: 'TOKEN_REFRESH_SUCCESS',
                  payload: { token: newToken },
                });
              }
            } else {
              dispatch({ type: 'TOKEN_REFRESH_FAILURE' });
            }
          } catch (error: any) {
            console.error('토큰 갱신 실패:', error);
            dispatch({ type: 'TOKEN_REFRESH_FAILURE' });
          }
        }, refreshTime);

        return () => clearTimeout(timer);
      }
    }
  }, [state.isSSO, state.tokenExpiry]);

  const login = async (email: string, password: string) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      
      const response = await authApi.login({ email, password });
      const isSSO = authApi.isUsingSSO();
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { 
          user: response.user, 
          token: response.token,
          isSSO 
        },
      });
    } catch (error: any) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: {
          message: error instanceof Error ? error.message : '로그인에 실패했습니다.',
          code: 'LOGIN_ERROR',
        },
      });
      throw error;
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      dispatch({ type: 'REGISTER_START' });
      
      const response = await authApi.register(data);
      
      dispatch({
        type: 'REGISTER_SUCCESS',
        payload: { user: response.user },
      });
    } catch (error: any) {
      dispatch({
        type: 'REGISTER_FAILURE',
        payload: {
          message: error instanceof Error ? error.message : '회원가입에 실패했습니다.',
          code: 'REGISTER_ERROR',
        },
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error: any) {
      console.error('로그아웃 오류:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const success = await authApi.refreshToken();
      if (success) {
        const newToken = authApi.getToken();
        if (newToken) {
          dispatch({
            type: 'TOKEN_REFRESH_SUCCESS',
            payload: { token: newToken },
          });
        }
      }
      return success;
    } catch (error: any) {
      console.error('토큰 갱신 실패:', error);
      dispatch({ type: 'TOKEN_REFRESH_FAILURE' });
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      state, 
      user: state.user, 
      login, 
      logout, 
      register, 
      refreshToken,
      isSSO: state.isSSO 
    }}>
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

// AuthContext export 추가
export { AuthContext };

