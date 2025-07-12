import { User, UserRole, UserStatus, BusinessInfo } from '../../types/user';

export const createMockUser = (overrides: Partial<User> = {}): User => {
  const baseUser: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: `user${Date.now()}@example.com`,
    name: '홍길동',
    role: 'customer' as UserRole,
    status: 'approved' as UserStatus,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isEmailVerified: true,
    ...overrides
  };

  return baseUser;
};

export const createMockBusinessUser = (overrides: Partial<User> = {}): User => {
  const businessInfo: BusinessInfo = {
    businessName: '테스트 비즈니스',
    businessType: '소매업',
    businessNumber: '123-45-67890',
    businessAddress: '서울시 강남구 테헤란로 123',
    representativeName: '김사장',
    contactPhone: '02-1234-5678'
  };

  return createMockUser({
    role: 'business',
    businessInfo,
    ...overrides
  });
};

export const createMockUserList = (count: number = 20): User[] => {
  const users: User[] = [];
  
  for (let i = 0; i < count; i++) {
    const roles: UserRole[] = ['admin', 'customer', 'business', 'affiliate'];
    const statuses: UserStatus[] = ['pending', 'approved', 'rejected', 'suspended'];
    
    const role = roles[i % roles.length];
    const status = statuses[i % statuses.length];
    
    const user = createMockUser({
      id: `user_${i + 1}`,
      email: `user${i + 1}@example.com`,
      name: `사용자${i + 1}`,
      role,
      status,
      createdAt: new Date(Date.now() - (i * 86400000)).toISOString(), // i일 전
      lastLoginAt: Math.random() > 0.3 ? new Date(Date.now() - (Math.floor(Math.random() * 7) * 86400000)).toISOString() : undefined,
      businessInfo: role === 'business' ? {
        businessName: `비즈니스${i + 1}`,
        businessType: '소매업',
        businessNumber: `123-45-${String(67890 + i).padStart(5, '0')}`,
        businessAddress: `서울시 강남구 테헤란로 ${123 + i}`,
        representativeName: `대표${i + 1}`,
        contactPhone: `02-1234-${String(5678 + i).padStart(4, '0')}`
      } : undefined
    });
    
    users.push(user);
  }
  
  return users;
};

// 특정 사용자 생성 헬퍼들
export const createMockUsers = {
  admin: (overrides: Partial<User> = {}) => createMockUser({
    role: 'admin',
    name: '관리자',
    email: 'admin@example.com',
    status: 'approved',
    ...overrides
  }),

  customer: (overrides: Partial<User> = {}) => createMockUser({
    role: 'customer',
    name: '일반회원',
    email: 'customer@example.com',
    status: 'approved',
    ...overrides
  }),

  business: (overrides: Partial<User> = {}) => createMockBusinessUser({
    name: '사업자회원',
    email: 'business@example.com',
    status: 'approved',
    ...overrides
  }),

  affiliate: (overrides: Partial<User> = {}) => createMockUser({
    role: 'affiliate',
    name: '파트너회원',
    email: 'affiliate@example.com',
    status: 'approved',
    ...overrides
  }),

  pending: (overrides: Partial<User> = {}) => createMockUser({
    status: 'pending',
    name: '승인대기회원',
    email: 'pending@example.com',
    approvedAt: undefined,
    approvedBy: undefined,
    ...overrides
  }),

  suspended: (overrides: Partial<User> = {}) => createMockUser({
    status: 'suspended',
    name: '정지회원',
    email: 'suspended@example.com',
    ...overrides
  })
};