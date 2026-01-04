/**
 * Data Transfer Objects (DTOs) for Organization-Core
 */

/**
 * CreateOrganizationDto
 *
 * 조직 생성 요청 DTO
 */
export interface CreateOrganizationDto {
  /**
   * 조직명 (필수, 최대 255자)
   */
  name: string;

  /**
   * 조직 코드 (필수, 최대 100자, 고유값)
   */
  code: string;

  /**
   * 조직 유형 (필수)
   * - division: 지부 (최상위 조직)
   * - branch: 분회 (하위 조직)
   */
  type: 'division' | 'branch';

  /**
   * 상위 조직 ID (선택적, null = 최상위)
   */
  parentId?: string;

  /**
   * 확장 필드 (선택적)
   */
  metadata?: Record<string, any>;
}

/**
 * UpdateOrganizationDto
 *
 * 조직 수정 요청 DTO
 */
export interface UpdateOrganizationDto {
  /**
   * 조직명 (선택적)
   */
  name?: string;

  /**
   * 확장 필드 (선택적, 병합됨)
   */
  metadata?: Record<string, any>;

  /**
   * 활성 여부 (선택적)
   */
  isActive?: boolean;
}

/**
 * ListOrganizationDto
 *
 * 조직 목록 조회 요청 DTO
 */
export interface ListOrganizationDto {
  /**
   * 조직 유형 필터
   */
  type?: 'division' | 'branch';

  /**
   * 상위 조직 ID (하위 조직만 조회)
   */
  parentId?: string;

  /**
   * 활성 여부 필터 (기본값: true)
   */
  isActive?: boolean;

  /**
   * 검색어 (조직명/코드)
   */
  search?: string;

  /**
   * 페이지 번호 (기본값: 1)
   */
  page?: number;

  /**
   * 페이지 크기 (기본값: 20)
   */
  limit?: number;
}

/**
 * CreateOrganizationMemberDto
 *
 * 조직 멤버 추가 요청 DTO
 */
export interface CreateOrganizationMemberDto {
  /**
   * 회원 ID (필수)
   */
  userId: string;

  /**
   * 조직 내 역할 (필수)
   */
  role: 'admin' | 'manager' | 'member' | 'moderator';

  /**
   * 주 소속 조직 여부 (선택적, 기본값: false)
   */
  isPrimary?: boolean;

  /**
   * 확장 필드 (선택적)
   */
  metadata?: Record<string, any>;
}

/**
 * UpdateOrganizationMemberDto
 *
 * 조직 멤버 수정 요청 DTO
 */
export interface UpdateOrganizationMemberDto {
  /**
   * 역할 변경 (선택적)
   */
  role?: 'admin' | 'manager' | 'member' | 'moderator';

  /**
   * 주 소속 조직 변경 (선택적)
   */
  isPrimary?: boolean;

  /**
   * 확장 필드 변경 (선택적)
   */
  metadata?: Record<string, any>;
}

/**
 * ListOrganizationMemberDto
 *
 * 조직 멤버 목록 조회 요청 DTO
 */
export interface ListOrganizationMemberDto {
  /**
   * 역할 필터
   */
  role?: 'admin' | 'manager' | 'member' | 'moderator';

  /**
   * 탈퇴 멤버 포함 여부 (기본값: false)
   */
  includeLeft?: boolean;

  /**
   * 페이지 번호 (기본값: 1)
   */
  page?: number;

  /**
   * 페이지 크기 (기본값: 20)
   */
  limit?: number;
}
