import { FC, createContext, useContext, useEffect, useState, ReactNode  } from 'react';
import Cookies from 'js-cookie';
import { authAPI } from '../services/api';
import toast from 'react-hot-toast';

// 공통 타입 import
import { 
  User, 
  UserRole, 
  AuthContextType, 
  UserPermissions,
  LoginResponse,
  AuthVerifyResponse 
} from '../types/user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && user.status === 'approved';

  // 사용자 데이터 정규화 함수 (id 속성 추가)
  const normalizeUserData = (userData: Partial<User> & { _id?: string }): User => {
    return {
      ...userData,
      id: userData._id || userData.id || '', // MongoDB _id를 id로 매핑
    } as User;
  };

  // 로그인
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authAPI.login(email, password);
      const { token, user: userData }: LoginResponse = response.data;

      // 사용자 데이터 정규화 (id 속성 추가)
      const normalizedUser = normalizeUserData(userData);

      // 쿠키에 토큰 저장 (24시간)
      Cookies.set('authToken', token, { expires: 1 });
      Cookies.set('user', JSON.stringify(normalizedUser), { expires: 1 });

      setUser(normalizedUser);
      toast.success('로그인되었습니다.');
      return true;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '로그인에 실패했습니다.';
      const errorCode = error.response?.data?.code;

      switch (errorCode) {
        case 'INVALID_CREDENTIALS':
          toast.error('이메일 또는 비밀번호가 올바르지 않습니다.');
          break;
        case 'ACCOUNT_PENDING':
          toast.warning('계정 승인 대기 중입니다. 관리자 승인 후 이용하실 수 있습니다.');
          break;
        case 'ACCOUNT_REJECTED':
          toast.error('계정이 거부되었습니다. 관리자에게 문의하세요.');
          break;
        case 'ACCOUNT_SUSPENDED':
          toast.error('계정이 정지되었습니다. 관리자에게 문의하세요.');
          break;
        default:
          toast.error(errorMessage);
      }
      return false;
    }
  };

  // 로그아웃
  const logout = () => {
    Cookies.remove('authToken');
    Cookies.remove('user');
    setUser(null);
    toast.info('로그아웃되었습니다.');
  };

  // 사용자 정보 업데이트
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      // id 속성 유지
      updatedUser.id = updatedUser._id || updatedUser.id;
      
      setUser(updatedUser);
      Cookies.set('user', JSON.stringify(updatedUser), { expires: 1 });
    }
  };

  // 인증 상태 확인
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      
      // 쿠키에서 토큰과 사용자 정보 확인
      const token = Cookies.get('authToken');
      const storedUser = Cookies.get('user');

      if (!token || !storedUser) {
        setUser(null);
        return;
      }

      // 저장된 사용자 정보 복원
      const userData = JSON.parse(storedUser);
      
      // 토큰 유효성 검증
      const response = await authAPI.verifyToken();
      const verifyData: AuthVerifyResponse = response.data;
      
      if (verifyData.valid) {
        // 서버에서 받은 최신 사용자 정보 사용
        const normalizedUser = normalizeUserData(verifyData.user);
        setUser(normalizedUser);
      } else {
        // 토큰이 유효하지 않으면 로그아웃
        logout();
      }
    } catch (error: any) {
      // 토큰 검증 실패 시 로그아웃
      logout();
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 인증 상태 확인
  useEffect(() => {
    checkAuthStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        updateUser,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// AuthContext export
export { AuthContext };

// 커스텀 훅
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 권한 확인 훅
export const usePermissions = (): UserPermissions => {
  const { user } = useAuth();

  return {
    isAdmin: user?.role === 'admin',
    isManager: user?.role === 'manager',
    isPartner: user?.role === 'partner', 
    isUser: user?.role === 'user',
    isManagerOrAdmin: user?.role === 'admin' || user?.role === 'manager',
    hasRole: (roles: UserRole[]) => user ? roles.includes(user.role) : false,
    canAccessAdmin: user?.role === 'admin' || user?.role === 'manager',
  };
};

// 타입 재export (호환성)
export type { User, UserRole, AuthContextType, UserPermissions };
