import axiosInstance from '../config/axios';
import { API_ENDPOINTS } from '../config/endpoints';
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from './types';

export const authApi = {
  // 회원가입
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await axiosInstance.post<RegisterResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    return response.data;
  },

  // 로그인
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await axiosInstance.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      data
    );
    return response.data;
  },

  // 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<User> => {
    const response = await axiosInstance.get<User>(API_ENDPOINTS.AUTH.ME);
    return response.data;
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT);
    localStorage.removeItem('token');
  },

  // 토큰 저장
  setToken: (token: string): void => {
    localStorage.setItem('token', token);
  },

  // 토큰 가져오기
  getToken: (): string | null => {
    return localStorage.getItem('token');
  },
}; 