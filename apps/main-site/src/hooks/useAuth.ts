import { useAuth as useAuthContext } from '../context/AuthContext';
import { LoginRequest, RegisterRequest } from '../api/auth/types';
import { AxiosError } from 'axios';

export const useAuth = () => {
  const context = useAuthContext();

  const login = async (data: LoginRequest) => {
    try {
      await context.login(data);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error instanceof AxiosError && error.response?.data?.message 
          ? error.response.data.message 
          : '로그인에 실패했습니다.',
      };
    }
  };

  const register = async (data: RegisterRequest) => {
    try {
      await context.register(data);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: error instanceof AxiosError && error.response?.data?.message 
          ? error.response.data.message 
          : '회원가입에 실패했습니다.',
      };
    }
  };

  const logout = async () => {
    try {
      await context.logout();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        message: '로그아웃에 실패했습니다.',
      };
    }
  };

  return {
    user: context.state.user,
    isAuthenticated: context.state.isAuthenticated,
    isLoading: context.state.isLoading,
    error: context.state.error,
    login,
    register,
    logout,
  };
}; 