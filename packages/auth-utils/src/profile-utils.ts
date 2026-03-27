/**
 * WO-O4O-PROFILE-ABSTRACTION-V1
 *
 * Role ↔ Profile 매핑 정의 및 공통 타입.
 *
 * 원칙:
 *   Role  → 접근 권한 (RBAC)
 *   Profile → 자격 / 속성 / 비즈니스 의미
 *
 * Naming 규칙: {service}_{type}_profiles
 *
 * 이 모듈은 프론트엔드/백엔드 공유 패키지이므로 DB 의존 없음.
 * DB 기반 조회는 api-server auth-helpers.ts에서 구현.
 */

// ─── Profile Table Config ────────────────────────────────────────────────

export interface ProfileConfig {
  /** DB 테이블 이름 */
  table: string;
  /** 서비스 키 */
  service: string;
  /** 프로필 타입 (student, pharmacist, ...) */
  type: string;
  /** 사람 읽기용 라벨 */
  label: string;
}

/**
 * Role → Profile 매핑.
 * role이 부여되면 대응 profile이 존재해야 함 (정합성 규칙).
 */
export const PROFILE_MAP: Record<string, ProfileConfig> = {
  'kpa:pharmacist': {
    table: 'kpa_pharmacist_profiles',
    service: 'kpa',
    type: 'pharmacist',
    label: '약사 자격',
  },
  'kpa:student': {
    table: 'kpa_student_profiles',
    service: 'kpa',
    type: 'student',
    label: '약대생 자격',
  },
} as const;

