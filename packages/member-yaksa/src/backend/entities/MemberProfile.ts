/**
 * MemberProfile Entity
 *
 * 약사회 회원 프로필 엔티티
 * - 약사 개인 정보 (면허번호, 직역)
 * - 약국/소속기관 정보
 * - 프로필 상태 관리
 *
 * @package @o4o-apps/member-yaksa
 * @phase 1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// =====================================================
// Types
// =====================================================

/**
 * 직역 유형
 *
 * - OWNER_PHARMACIST: 개설약사 (약국 대표)
 * - STAFF_PHARMACIST: 근무약사
 * - HOSPITAL_PHARMACIST: 병원약사
 * - PUBLIC_PHARMACIST: 공직약사
 * - INDUSTRY_PHARMACIST: 산업약사 (제약사 등)
 * - SUSPENDED: 휴직
 */
export type OccupationType =
  | 'OWNER_PHARMACIST'
  | 'STAFF_PHARMACIST'
  | 'HOSPITAL_PHARMACIST'
  | 'PUBLIC_PHARMACIST'
  | 'INDUSTRY_PHARMACIST'
  | 'SUSPENDED';

/**
 * 프로필 상태
 *
 * - active: 정상 활성화
 * - pending_verification: 검증 대기 (면허 확인 등)
 * - needs_review: 검토 필요 (정보 불일치 등)
 */
export type ProfileStatus =
  | 'active'
  | 'pending_verification'
  | 'needs_review';

// =====================================================
// Entity
// =====================================================

/**
 * MemberProfile Entity
 *
 * 약사회 회원의 핵심 프로필 정보
 *
 * 🔒 정책 (Phase 0에서 고정):
 * 1. pharmacistLicenseNumber: READ-ONLY (API 수정 불가)
 * 2. occupationType: READ-ONLY (reporting-yaksa 승인 시 자동 변경)
 * 3. pharmacyName/Address: 본인만 수정 가능
 * 4. 조직 소속: organization-core 테이블 기반 (여기 저장 안함)
 */
@Entity('member_profiles')
@Index(['userId'], { unique: true })
@Index(['occupationType'])
@Index(['pharmacistLicenseNumber'])
export class MemberProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 연결된 사용자 ID (users.id)
   * - 1:1 관계
   */
  @Column({ type: 'uuid', unique: true })
  userId!: string;

  // =====================================================
  // 🔒 약사 고유 식별자 (READ-ONLY)
  // =====================================================

  /**
   * 약사 면허번호
   *
   * 🔒 정책:
   * - 조회만 가능
   * - 사용자 직접 수정 불가
   * - 수정 필요 시 관리자(본회)에게 요청
   * - reporting-yaksa 승인 시 자동 업데이트 가능
   */
  @Column({ type: 'varchar', length: 50 })
  pharmacistLicenseNumber!: string;

  // =====================================================
  // 직역 정보 (READ-ONLY)
  // =====================================================

  /**
   * 직역 유형
   *
   * 🔒 정책:
   * - 수정 불가
   * - reporting-yaksa(신상신고) 승인 시 자동 변경
   * - MemberProfile에서는 읽기 전용 표시
   */
  @Column({
    type: 'varchar',
    length: 30,
    default: 'OWNER_PHARMACIST',
  })
  occupationType!: OccupationType;

  // =====================================================
  // 직역별 소속 정보
  // =====================================================

  /**
   * 약국명 (개설/근무약사)
   *
   * 🧑‍⚕️ 정책:
   * - 약사 본인만 수정 가능
   * - 관리자 수정 불가
   * - 수정 시 "본인 책임" 안내 필수
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  pharmacyName?: string;

  /**
   * 약국 주소 (개설/근무약사)
   *
   * 🧑‍⚕️ 정책:
   * - 약사 본인만 수정 가능
   * - 관리자 수정 불가
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  pharmacyAddress?: string;

  /**
   * 약국 연락처
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  pharmacyPhone?: string;

  /**
   * 병원명 (병원약사)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  hospitalName?: string;

  /**
   * 기관명 (공직약사)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  agencyName?: string;

  /**
   * 회사명 (산업약사)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  companyName?: string;

  // =====================================================
  // 프로필 상태
  // =====================================================

  /**
   * 프로필 상태
   *
   * - active: 정상 활성화
   * - pending_verification: 면허 확인 대기
   * - needs_review: 정보 검토 필요
   */
  @Column({
    type: 'varchar',
    length: 30,
    default: 'active',
  })
  profileStatus!: ProfileStatus;

  /**
   * 프로필 완성도 (0-100)
   * - 필수 정보 입력 여부에 따라 계산
   */
  @Column({ type: 'int', default: 0 })
  completionRate!: number;

  // =====================================================
  // 확장 필드
  // =====================================================

  /**
   * 메타데이터 (자유 확장 영역)
   *
   * 용도:
   * - 추가 정보 저장
   * - 서비스별 확장 데이터
   * - 마이그레이션 없이 필드 추가 가능
   */
  @Column({ type: 'jsonb', default: {} })
  metadata!: Record<string, any>;

  // =====================================================
  // Timestamps
  // =====================================================

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  /**
   * 마지막 프로필 수정일
   * - 사용자가 직접 수정한 경우만 업데이트
   */
  @Column({ type: 'timestamp', nullable: true })
  lastProfileUpdateAt?: Date;
}

export default MemberProfile;
