/**
 * UserDetailPage Types
 * WO-O4O-USER-DETAIL-PAGE-COMMONIZATION-V1
 *
 * 5개 서비스 공통 UserDetailPage를 위한 타입 정의
 */

// ─── Data Types ─────────────────────────────────────────────

export interface RoleData {
  id: string;
  role: string;
  isActive: boolean;
  isAdminRole: boolean;
  validFrom?: string;
  validUntil?: string;
  assignedBy?: string;
  scopeType?: string;
  scopeId?: string;
  createdAt: string;
}

export interface MembershipData {
  id: string;
  serviceKey: string;
  status: string;
  role: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface BusinessInfoData {
  businessName?: string;
  businessNumber?: string;
  email?: string;
  businessType?: string;
  businessCategory?: string;
  address?: string;
  address2?: string;
}

export interface UserDetailData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  nickname?: string;
  company?: string;
  phone?: string;
  status: string;
  isActive: boolean;
  businessInfo?: BusinessInfoData;
  createdAt: string;
  updatedAt?: string;
}

// ─── API Adapter ─────────────────────────────────────────────

/**
 * 서비스별 API 클라이언트를 추상화하는 인터페이스.
 * 각 서비스가 자신의 api 인스턴스를 주입한다.
 */
export interface UserDetailApiAdapter {
  /** GET request — returns response data (unwrapped) */
  get(path: string): Promise<any>;
  /** PUT request */
  put(path: string, data?: any): Promise<any>;
  /** POST request */
  post(path: string, data?: any): Promise<any>;
  /** PATCH request */
  patch(path: string, data?: any): Promise<any>;
  /** DELETE request */
  delete(path: string): Promise<any>;
}

// ─── Config ─────────────────────────────────────────────────

export interface UserDetailConfig {
  /** 테마 색상 계열 */
  theme: 'primary' | 'blue';
  /** 사업자 정보 섹션 라벨 */
  labels: {
    /** 섹션 제목 (e.g., "사업자 정보", "약국 정보") */
    businessInfoTitle: string;
    /** 사업자/약국명 라벨 */
    businessNameLabel: string;
  };
}

// ─── Actions (서비스별 커스텀 동작) ────────────────────────────

/**
 * 서비스별 특수 동작을 정의한다.
 * - Neture: handleStatusChange를 오버라이드하여 registration endpoint 사용
 * - 그 외: 기본 MembershipConsole API 사용
 */
export interface UserDetailActions {
  /**
   * 상태 변경 핸들러를 완전히 오버라이드한다.
   * 반환하면 기본 로직을 대체한다.
   */
  handleStatusChange?: (
    userId: string,
    status: string,
    context: {
      user: UserDetailData;
      memberships: MembershipData[];
      api: UserDetailApiAdapter;
    },
  ) => Promise<void>;
}

// ─── Props ─────────────────────────────────────────────────

export interface UserDetailPageProps {
  /** API adapter (서비스별 주입) */
  apiAdapter: UserDetailApiAdapter;
  /** 테마/라벨 설정 */
  config: UserDetailConfig;
  /** 현재 사용자가 admin인지 여부 (서비스별 판단 로직이 다름) */
  isAdmin: boolean;
  /** 서비스별 커스텀 동작 */
  actions?: UserDetailActions;
  /** react-router useNavigate (호환성을 위해 외부 주입) */
  navigate: (path: string) => void;
  /** 현재 유저 ID (react-router useParams에서 추출) */
  userId?: string;
}

export interface EditUserModalProps {
  userId: string;
  apiAdapter: UserDetailApiAdapter;
  theme: 'primary' | 'blue';
  onClose: () => void;
  onSuccess: () => void;
}
