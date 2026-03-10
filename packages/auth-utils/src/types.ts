/** API 서버 /auth/me, /auth/login 응답의 user 객체 (raw) */
export interface ApiUser {
  id: string;
  email: string;
  fullName?: string;
  name?: string;
  role?: string;           // legacy 단일 역할
  roles?: string[];        // RBAC 역할 배열
  status?: string;
  phone?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;  // 서비스별 확장 필드 허용
}

/** parseAuthResponse 결과 */
export interface ParsedAuthResponse {
  user: ApiUser | null;
  tokens: { accessToken: string; refreshToken: string } | null;
}

/** 서비스별 역할 매핑 테이블 타입 */
export type RoleMap<R extends string = string> = Record<string, R>;
