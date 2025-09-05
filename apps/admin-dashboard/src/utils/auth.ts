/**
 * Authentication utilities for Admin Dashboard
 */

// 테스트용 임시 토큰 생성 (개발 환경에서만 사용)
export const generateTestToken = () => {
  // 실제 운영 환경에서는 로그인 API를 통해 토큰을 받아야 합니다
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.test-signature';
  return testToken;
};

// 토큰 저장
export const saveToken = (token: string) => {
  localStorage.setItem('authToken', token);
};

// 토큰 가져오기
export const getToken = () => {
  let token = localStorage.getItem('authToken');
  
  // 개발 환경에서 토큰이 없으면 테스트 토큰 생성
  if (!token && import.meta.env.DEV) {
    token = generateTestToken();
    saveToken(token);
  }
  
  return token;
};

// 토큰 제거 (로그아웃)
export const removeToken = () => {
  localStorage.removeItem('authToken');
};

// 토큰 유효성 확인
export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  
  try {
    // JWT 토큰의 기본 구조 확인 (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // 실제로는 만료 시간 확인 등의 검증이 필요
    return true;
  } catch {
    return false;
  }
};

// 인증 상태 확인
export const isAuthenticated = (): boolean => {
  const token = getToken();
  return isTokenValid(token);
};

// 개발 환경 자동 로그인
export const autoLoginForDev = () => {
  if (import.meta.env.DEV && !isAuthenticated()) {
    const testToken = generateTestToken();
    saveToken(testToken);
    // Dev mode: Auto-login with test token
  }
};