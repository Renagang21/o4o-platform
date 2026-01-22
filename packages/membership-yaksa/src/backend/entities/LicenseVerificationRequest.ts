import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Member } from './Member.js';

/**
 * VerificationStatus
 * 면허 검증 상태
 */
export type LicenseVerificationStatus =
  | 'pending'     // 검증 대기
  | 'processing'  // 검증 진행 중
  | 'verified'    // 검증 완료 (유효)
  | 'failed'      // 검증 실패
  | 'invalid'     // 무효 면허
  | 'expired'     // 만료된 면허
  | 'error';      // 시스템 오류

/**
 * VerificationProvider
 * 면허 검증 제공자
 */
export type LicenseVerificationProvider =
  | 'manual'      // 수동 검증
  | 'kpai'        // 대한약사회 API
  | 'hira'        // 건강보험심사평가원
  | 'mohw';       // 보건복지부

/**
 * LicenseVerificationRequest Entity
 *
 * 면허 진위 확인 요청 기록
 *
 * Phase 2: 면허 검증 시스템 준비
 * - 검증 요청 기록
 * - 검증 결과 저장
 * - 외부 API 연동 준비
 *
 * Phase 3에서 실제 외부 API 연동 예정
 *
 * @example
 * ```typescript
 * {
 *   memberId: "member-kim",
 *   licenseNumber: "12345",
 *   name: "김약사",
 *   status: "verified",
 *   provider: "kpai",
 *   verificationResult: {
 *     isValid: true,
 *     licenseType: "약사",
 *     issueDate: "2010-03-15",
 *     expiryDate: null
 *   }
 * }
 * ```
 */
@Entity('yaksa_license_verification_requests')
@Index(['memberId'])
@Index(['licenseNumber'])
@Index(['status'])
@Index(['createdAt'])
export class LicenseVerificationRequest {
  /**
   * 검증 요청 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 회원 ID (FK → yaksa_members.id)
   */
  @Column({ type: 'uuid' })
  memberId!: string;

  /**
   * 회원 관계
   */
  @ManyToOne('Member', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'memberId' })
  member!: Member;

  /**
   * 검증 대상 면허번호
   */
  @Column({ type: 'varchar', length: 50 })
  licenseNumber!: string;

  /**
   * 검증 대상 이름
   */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /**
   * 검증 대상 생년월일 (선택)
   */
  @Column({ type: 'date', nullable: true })
  birthdate?: string;

  /**
   * 검증 상태
   */
  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: LicenseVerificationStatus;

  /**
   * 검증 제공자
   */
  @Column({ type: 'varchar', length: 50, default: 'manual' })
  provider!: LicenseVerificationProvider;

  /**
   * 검증 결과 (JSON)
   *
   * 외부 API 응답 또는 수동 검증 결과
   */
  @Column({ type: 'jsonb', nullable: true })
  verificationResult?: {
    isValid: boolean;
    licenseType?: string;
    issueDate?: string;
    expiryDate?: string;
    remarks?: string;
    rawResponse?: any;
  };

  /**
   * 실패 사유 (검증 실패 시)
   */
  @Column({ type: 'text', nullable: true })
  failureReason?: string;

  /**
   * 외부 API 요청 ID (추적용)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  externalRequestId?: string;

  /**
   * 요청자 ID (관리자 또는 시스템)
   */
  @Column({ type: 'uuid', nullable: true })
  requestedBy?: string;

  /**
   * 검증자 ID (수동 검증 시)
   */
  @Column({ type: 'uuid', nullable: true })
  verifiedBy?: string;

  /**
   * 검증 완료 시각
   */
  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  /**
   * 확장 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * 생성일시 (요청 시점)
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정일시
   */
  @UpdateDateColumn()
  updatedAt!: Date;
}
