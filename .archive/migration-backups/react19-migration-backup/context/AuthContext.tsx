import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authApi } from '../api/auth/authApi';
import { AuthState, LoginRequest, RegisterRequest, User } from '../api/auth/types';

// UserRole 타입 정의 및 export - 모든 가능한 역할 포함
export type UserRole = 'user' | 'admin' | 'administrator' | 'manager' | 'partner' | 'operator' | 'member' | 'seller' | 'affiliate' | 'contributor' | 'vendor' | 'supplier';

// User 타입 re-export
export type { User };

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGIN_FAILURE'; payload: { message: string; code: string } }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER_START' }
  | { type: 'REGISTER_SUCCESS'; payload: { user: User } }
  | { type: 'REGISTER_FAILURE'; payload: { message: string; code: string } };

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
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
    case 'LOGOUT':
      return initialState;
    default:
      return state;
  }
};

const AuthContext = createContext<{
  state: AuthState;
  user: User | null;  // 직접 접근을 위한 user 추가
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
} | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = authApi.getToken();
    if (token) {
      authApi.getCurrentUser()
        .then(user => {
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, token },
          });
        })
        .catch(() => {
          dispatch({ type: 'LOGOUT' });
        });
    }
  }, []);

  const login = async (data: LoginRequest) => {
    try {
      dispatch({ type: 'LOGIN_START' });
      const response = await authApi.login(data);
      authApi.setToken(response.token);
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user: response.user, token: response.token },
      });
    } catch (error: any) {
      dispatch({
        type: 'LOGIN_FAILURE',
        payload: {
          message: error.response?.data?.message || '로그인에 실패했습니다.',
          code: error.response?.data?.code || 'UNKNOWN_ERROR',
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
          message: error.response?.data?.message || '회원가입에 실패했습니다.',
          code: error.response?.data?.code || 'UNKNOWN_ERROR',
        },
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ state, user: state.user, login, register, logout }}>
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

