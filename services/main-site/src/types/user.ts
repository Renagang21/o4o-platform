/**
 * 사용자 관련 공통 타입 정의
 * - AuthContext와 모든 role-pages에서 공통 사용
 * - MongoDB _id와 일반적인 id 모두 지원하여 호환성 확보
 */

// UserRole 타입 정의 - 모든 가능한 역할 포함
export type UserRole = 
  | 'user' 
  | 'admin' 
  | 'administrator' 
  | 'manager' 
  | 'partner' 
  | 'operator' 
  | 'member' 
  | 'seller' 
  | 'affiliate' 
  | 'contributor' 
  | 'vendor' 
  | 'supplier'
  | 'retailer'
  | 'customer';

// 비즈니스 정보 인터페이스
export interface BusinessInfo {
  businessName: string;
  businessType: string;
  businessNumber?: string;
  address: string;
  phone: string;
}

// 사용자 상태 타입
export type UserStatus = 'pending' | 'approved' | 'rejected' | 'suspended' | 'active' | 'inactive';

// 메인 User 인터페이스
export interface User {
  _id: string;                    // MongoDB 원본 ID
  id: string;                     // 호환성을 위한 ID (= _id)
  email: string;
  name: string;
  phone?: string;
  role: UserRole;                 // 강타입 UserRole
  roles?: UserRole[];             // 호환성을 위한 배열 형태
  userType?: 'admin' | 'supplier' | 'retailer' | 'customer'; // 호환성
  status: UserStatus;
  businessInfo?: BusinessInfo;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  avatar?: string;
}

// AuthContext 관련 타입들
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAuthStatus: () => Promise<void>;
}

// 권한 확인 관련 타입
export interface UserPermissions {
  isAdmin: boolean;
  isManager: boolean;
  isPartner: boolean;
  isUser: boolean;
  isManagerOrAdmin: boolean;
  hasRole: (roles: UserRole[]) => boolean;
  canAccessAdmin: boolean;
}

// API 응답 관련 타입들
export interface LoginResponse {
  token: string;
  user: User;
}

export interface AuthVerifyResponse {
  valid: boolean;
  user: User;
}

// 확장 사용자 타입 (하위 호환성)
export interface Supplier extends User {
  companyName: string;
  businessNumber: string;
  address: string;
  contactPerson: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  website?: string;
  description?: string;
}

export interface Retailer extends User {
  storeName: string;
  storeAddress: string;
  businessNumber: string;
  grade: 'gold' | 'premium' | 'vip';
  approvalStatus: 'pending' | 'approved' | 'rejected';
  managerName: string;
  storeType: string;
}

// 인증 응답 타입 (하위 호환성)
export interface AuthResponse {
  success: boolean;
  data: {
    user: User | Supplier | Retailer;
    token: string;
  };
  message?: string;
}

// 요청 타입들
export interface LoginRequest {
  email: string;
  password: string;
  userType?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  userType: 'supplier' | 'retailer' | 'customer';
  // 공급자 추가 정보
  companyName?: string;
  businessNumber?: string;
  address?: string;
  contactPerson?: string;
  website?: string;
  description?: string;
  // 리테일러 추가 정보
  storeName?: string;
  storeAddress?: string;
  managerName?: string;
  storeType?: string;
}

// 사용자 업데이트 관련 타입
export type UserUpdateData = Partial<Omit<User, '_id' | 'id' | 'createdAt'>>;

// 역할별 컴포넌트 Props 타입
export interface RolePageProps {
  user: User;
}

// 유틸리티 타입들
export type UserWithoutId = Omit<User, 'id'>;
export type UserCreateData = Omit<User, '_id' | 'id' | 'createdAt' | 'lastLoginAt'>;
