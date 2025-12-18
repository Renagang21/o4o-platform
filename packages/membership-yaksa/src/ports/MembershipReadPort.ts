/**
 * MembershipReadPort
 * Phase R1: Structural Stabilization
 *
 * 다른 앱(annualfee-yaksa, reporting-yaksa 등)이
 * membership 데이터에 접근하기 위한 읽기 전용 인터페이스
 *
 * 사용 규칙:
 * - Entity 직접 접근 ❌
 * - Repository 문자열 접근 ❌
 * - MembershipReadPort만 사용 ⭕
 *
 * 데이터 소유권은 membership-yaksa가 유지
 */

/**
 * 회원 기본 정보 DTO
 * 다른 앱에서 필요한 최소한의 회원 정보
 */
export interface MemberBasicInfo {
  /** 회원 ID */
  id: string;
  /** 사용자 ID (auth-core User) */
  userId: string;
  /** 조직 ID */
  organizationId: string;
  /** 이름 */
  name: string;
  /** 이메일 (optional) */
  email?: string;
  /** 전화번호 (optional) */
  phone?: string;
  /** 면허번호 */
  licenseNumber: string;
  /** 회원등록번호 (optional) */
  registrationNumber?: string;
}

/**
 * 회원 상태 정보 DTO
 */
export interface MemberStatusInfo {
  /** 회원 ID */
  id: string;
  /** 활성 여부 */
  isActive: boolean;
  /** 자격 검증 완료 여부 */
  isVerified: boolean;
  /** 카테고리 ID (optional) */
  categoryId?: string;
  /** 카테고리 이름 (optional) */
  categoryName?: string;
  /** 연회비 필요 여부 */
  requiresAnnualFee: boolean;
}

/**
 * 회원 알림용 정보 DTO
 * 알림/이메일 발송에 필요한 정보
 */
export interface MemberNotificationInfo {
  /** 회원 ID */
  memberId: string;
  /** 사용자 ID */
  userId: string;
  /** 이름 */
  name: string;
  /** 이메일 (optional) */
  email?: string;
  /** 면허번호 */
  licenseNumber?: string;
}

/**
 * 회원 조회 옵션
 */
export interface FindMemberOptions {
  /** 조직 ID로 필터링 */
  organizationId?: string;
  /** 활성 회원만 */
  activeOnly?: boolean;
  /** 검증된 회원만 */
  verifiedOnly?: boolean;
  /** 카테고리 ID로 필터링 */
  categoryId?: string;
}

/**
 * MembershipReadPort Interface
 *
 * 다른 앱이 membership 데이터에 접근하는 유일한 방법
 */
export interface MembershipReadPort {
  /**
   * ID로 회원 기본 정보 조회
   */
  getMemberById(memberId: string): Promise<MemberBasicInfo | null>;

  /**
   * User ID로 회원 기본 정보 조회
   */
  getMemberByUserId(userId: string): Promise<MemberBasicInfo | null>;

  /**
   * ID로 회원 상태 정보 조회
   */
  getMemberStatus(memberId: string): Promise<MemberStatusInfo | null>;

  /**
   * 알림용 회원 정보 조회
   */
  getMemberForNotification(memberId: string): Promise<MemberNotificationInfo | null>;

  /**
   * 여러 회원 기본 정보 조회
   */
  getMembersByIds(memberIds: string[]): Promise<MemberBasicInfo[]>;

  /**
   * 조건에 맞는 회원 목록 조회
   */
  findMembers(options: FindMemberOptions): Promise<MemberBasicInfo[]>;

  /**
   * 회원 연회비 납부 여부 확인
   */
  isMemberPaidForYear(memberId: string, year: number): Promise<boolean>;

  /**
   * 조직 내 회원 수 조회
   */
  getMemberCountByOrganization(organizationId: string): Promise<number>;
}
