import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AuthState, 
  AuthResponse, 
  LoginFormData, 
  RegisterFormData,
  AuthUser
} from '@/types/auth';
import { apiClient } from '@/lib/api-client';

interface AuthContextType extends AuthState {
  login: (data: LoginFormData) => Promise<AuthResponse>;
  register: (data: RegisterFormData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
    error: null
  });

  // Load auth state from localStorage on mount
  useEffect(() => {
    const loadAuthState = () => {
      const accessToken = localStorage.getItem('accessToken');
      const refreshToken = localStorage.getItem('refreshToken');
      const userStr = localStorage.getItem('user');
      
      if (accessToken && userStr) {
        try {
          const user = JSON.parse(userStr) as AuthUser;
          setState({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
            error: null
          });
          
          // Set default authorization header
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (error) {
          console.error('Failed to parse auth state:', error);
          clearAuthState();
        }
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    loadAuthState();
  }, []);

  const saveAuthState = (data: AuthResponse['data']) => {
    if (!data) return;

    const { user, accessToken, refreshToken } = data;
    
    // Save to localStorage
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }

    // Set authorization header
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;

    // Update state
    setState({
      user,
      accessToken,
      refreshToken: refreshToken || null,
      isAuthenticated: true,
      isLoading: false,
      error: null
    });
  };

  const clearAuthState = () => {
    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // Clear authorization header
    delete apiClient.defaults.headers.common['Authorization'];

    // Reset state
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null
    });
  };

  const login = async (data: LoginFormData): Promise<AuthResponse> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await apiClient.post<AuthResponse>('/api/auth/login', data);
      
      if (response.data.success && response.data.data) {
        saveAuthState(response.data.data);
      }
      
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '로그인 중 오류가 발생했습니다';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return error.response?.data || { 
        success: false, 
        message: errorMessage 
      };
    }
  };

  const register = async (data: RegisterFormData): Promise<AuthResponse> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await apiClient.post<AuthResponse>('/api/auth/register', {
        email: data.email,
        password: data.password,
        name: data.name,
        termsAccepted: data.termsAccepted,
        privacyAccepted: data.privacyAccepted,
        marketingAccepted: data.marketingAccepted
      });
      
      setState(prev => ({ ...prev, isLoading: false }));
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || '회원가입 중 오류가 발생했습니다';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return error.response?.data || { 
        success: false, 
        message: errorMessage 
      };
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint if authenticated
      if (state.isAuthenticated) {
        await apiClient.post('/api/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthState();
      navigate('/auth/login');
    }
  };

  const refreshToken = async () => {
    try {
      const currentRefreshToken = state.refreshToken || localStorage.getItem('refreshToken');
      
      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<AuthResponse>('/api/auth/refresh', {
        refreshToken: currentRefreshToken
      });

      if (response.data.success && response.data.data) {
        saveAuthState(response.data.data);
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      clearAuthState();
      navigate('/auth/login');
    }
  };

  // Setup axios interceptor for token refresh
  useEffect(() => {
    const interceptor = apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await refreshToken();
            originalRequest.headers['Authorization'] = `Bearer ${state.accessToken}`;
            return apiClient(originalRequest);
          } catch (refreshError) {
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.interceptors.response.eject(interceptor);
    };
  }, [state.accessToken, refreshToken]);

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    refreshToken
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};