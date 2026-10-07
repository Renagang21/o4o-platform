// Account Linking Types
//
// WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1 — 축소:
//   계정 연결(linking) 도메인은 은퇴했다. password→Google 전환용 경로였고 runtime consumer 가 0이었다
//   (`services/account-linking.service.ts` · `LinkingSession` 과 함께 제거 · IR §3-4).
//   이 파일에는 **다른 축이 실제로 쓰는 타입만** 남긴다:
//     AuthProvider / LinkedAccount   — Google sub 정본(`entities/LinkedAccount.ts`)
//     AccountActivity                — 계정 활동 로그
//     Guest*                         — `/api/v1/auth/guest` (등록되어 살아 있는 경로)

// 'service' provider는 서비스/매장 사용자 인증용으로, Platform User와 분리된 경로
export type AuthProvider = 'email' | 'google' | 'kakao' | 'naver' | 'service';

// Linked account information
export interface LinkedAccount {
  id: string;
  userId: string;
  provider: AuthProvider;
  providerId?: string; // OAuth provider's user ID (Google `sub`)
  // WO-O4O-GOOGLE-IDENTITY-PREREQUISITES-V1: 운영 schema 와 일치 — 스냅샷 컬럼은 optional (Google row 에 기록하지 않음)
  email?: string;
  displayName?: string;
  profileImage?: string;
  isVerified?: boolean;
  isPrimary?: boolean;
  linkedAt?: Date;
  lastUsedAt?: Date;
}

// Account activity log
export interface AccountActivity {
  id: string;
  userId: string;
  action: 'linked' | 'unlinked' | 'merged' | 'login' | 'failed_link';
  provider: AuthProvider;
  ipAddress: string;
  userAgent: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface GuestTokenIssueRequest {
  /** Service identifier (e.g., 'kpa-pharmacy', 'neture') */
  serviceId: string;
  /** Store identifier (optional, for store-specific access) */
  storeId?: string;
  /** Device identifier (QR code ID, kiosk ID, etc.) */
  deviceId?: string;
  /** Entry point type */
  entryType: 'qr' | 'kiosk' | 'signage' | 'web';
  /** Optional metadata */
  metadata?: Record<string, any>;
}

export interface GuestTokenIssueResponse {
  success: boolean;
  /** Guest session ID for tracking */
  guestSessionId: string;
  tokens: {
    accessToken: string;
    /** No refresh token for guests - short-lived only */
    expiresIn: number;
  };
  /** Token type is always 'guest' */
  tokenType: 'guest';
  /** Service context */
  context: {
    serviceId: string;
    storeId?: string;
    deviceId?: string;
    entryType: string;
  };
}

export interface GuestUserData {
  /** Guest session ID */
  guestSessionId: string;
  /** Service ID */
  serviceId: string;
  /** Store ID (optional) */
  storeId?: string;
  /** Device ID (optional) */
  deviceId?: string;
  /** Entry type */
  entryType: 'qr' | 'kiosk' | 'signage' | 'web';
  /** Created timestamp */
  createdAt: Date;
  /** Expiry timestamp */
  expiresAt: Date;
}
