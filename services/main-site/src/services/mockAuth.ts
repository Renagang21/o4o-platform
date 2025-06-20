// 임시 모의 인증 서비스 (API 서버 연결 전까지 사용)

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'b2c' | 'yaksa';
  status: 'active' | 'pending' | 'rejected' | 'suspended';
}

// 임시 사용자 데이터
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@neture.co.kr',
    name: '관리자',
    role: 'admin',
    status: 'active'
  },
  {
    id: '2', 
    email: 'user@neture.co.kr',
    name: '일반사용자',
    role: 'user',
    status: 'active'
  },
  {
    id: '3',
    email: 'test@example.com',
    name: '테스트 사용자',
    role: 'b2c',
    status: 'active'
  }
];

// 모의 비밀번호 (실제로는 해시되어야 함)
const mockPasswords: Record<string, string> = {
  'admin@neture.co.kr': 'admin123',
  'user@neture.co.kr': 'user123',
  'test@example.com': 'test123'
};

export const mockAuthService = {
  // 로그인
  async login(email: string, password: string) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 네트워크 지연 모방
    
    const user = mockUsers.find(u => u.email === email);
    
    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }
    
    if (user.status !== 'active') {
      const statusMessages = {
        pending: '계정 승인 대기 중입니다.',
        rejected: '계정이 거부되었습니다.',
        suspended: '계정이 정지되었습니다.'
      };
      throw new Error(statusMessages[user.status]);
    }
    
    if (mockPasswords[email] !== password) {
      throw new Error('비밀번호가 올바르지 않습니다.');
    }
    
    const token = `mock_token_${user.id}_${Date.now()}`;
    
    return {
      data: {
        user,
        token,
        refreshToken: `refresh_${token}`
      }
    };
  },

  // 비밀번호 찾기
  async forgotPassword(email: string) {
    await new Promise(resolve => setTimeout(resolve, 1500)); // 네트워크 지연 모방
    
    const user = mockUsers.find(u => u.email === email);
    
    if (!user) {
      throw new Error('등록되지 않은 이메일입니다.');
    }
    
    // 실제로는 이메일 발송
    console.log(`[모의 이메일 발송] ${email}로 비밀번호 재설정 링크 발송됨`);
    
    // 실제 이메일 발송 로직을 시뮬레이션
    return {
      success: true,
      message: '비밀번호 재설정 링크가 발송되었습니다.'
    };
  },

  // 토큰 검증
  async verifyToken(token: string) {
    if (token.startsWith('mock_token_')) {
      const userId = token.split('_')[2];
      const user = mockUsers.find(u => u.id === userId);
      return { user };
    }
    throw new Error('유효하지 않은 토큰입니다.');
  },

  // 회원가입
  async register(userData: {
    email: string;
    password: string;
    name: string;
    businessInfo?: any;
  }) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 이메일 중복 체크
    if (mockUsers.find(u => u.email === userData.email)) {
      throw new Error('이미 등록된 이메일입니다.');
    }
    
    const newUser: User = {
      id: (mockUsers.length + 1).toString(),
      email: userData.email,
      name: userData.name,
      role: 'user',
      status: 'pending' // 승인 대기
    };
    
    mockUsers.push(newUser);
    mockPasswords[userData.email] = userData.password;
    
    return {
      data: {
        user: newUser,
        message: '회원가입이 완료되었습니다. 관리자 승인을 기다려주세요.'
      }
    };
  }
};

// 개발 환경에서만 콘솔에 임시 계정 정보 출력
if (import.meta.env.DEV) {
  console.log('🔐 임시 로그인 계정:');
  console.log('관리자: admin@neture.co.kr / admin123');
  console.log('일반사용자: user@neture.co.kr / user123');
  console.log('테스트: test@example.com / test123');
}