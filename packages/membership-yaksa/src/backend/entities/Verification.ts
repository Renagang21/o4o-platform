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
 * Verification Entity
 *
 * 회원 자격 검증 이력
 * 약사 면허번호 검증, 신원 확인 등의 프로세스 기록
 *
 * @example
 * ```typescript
 * {
 *   memberId: "member-kim",
 *   verifierId: "admin-park",
 *   method: "license_api",
 *   status: "approved",
 *   detail: {
 *     "licenseNumber": "12345-67890",
 *     "apiResponse": {...},
 *     "verifiedAt": "2025-01-15T10:30:00Z"
 *   }
 * }
 * ```
 */
@Entity('yaksa_member_verifications')
@Index(['memberId'])
@Index(['verifierId'])
@Index(['status'])
export class Verification {
  /**
   * 검증 ID (PK)
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
  @ManyToOne('Member', (member: Member) => member.verifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'memberId' })
  member!: Member;

  /**
   * 검증자 (관리자) ID (FK → users.id)
   */
  @Column({ type: 'uuid' })
  verifierId!: string;

  /**
   * 검증 방법
   *
   * - license_api: 약사 면허 API 조회
   * - manual_upload: 서류 업로드 수동 확인
   * - phone_verification: 전화 본인 확인
   * - identity_verification: 신원 확인 서비스
   */
  @Column({ type: 'varchar', length: 100 })
  method!: string;

  /**
   * 검증 상태
   *
   * - pending: 검증 대기
   * - approved: 승인
   * - rejected: 거부
   * - expired: 만료
   */
  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status!: 'pending' | 'approved' | 'rejected' | 'expired';

  /**
   * 검증 상세 정보 (JSON)
   *
   * @example
   * ```typescript
   * {
   *   "licenseNumber": "12345-67890",
   *   "licenseIssueDate": "2010-03-15",
   *   "apiResponse": {...},
   *   "uploadedFiles": ["https://...", "https://..."],
   *   "notes": "정상 확인"
   * }
   * ```
   */
  @Column({ type: 'jsonb' })
  detail!: Record<string, any>;

  /**
   * 거부 사유 (status='rejected'인 경우)
   */
  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  /**
   * 검증 완료 일시
   */
  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  /**
   * 검증 만료 일시
   */
  @Column({ type: 'timestamp', nullable: true })
  expiresAt?: Date;

  /**
   * 생성일시 (검증 요청 시각)
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정일시
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * 검증 승인 처리
   */
  approve(verifierId: string, notes?: string): void {
    this.status = 'approved';
    this.verifierId = verifierId;
    this.verifiedAt = new Date();
    if (notes) {
      this.detail = { ...this.detail, approvalNotes: notes };
    }
  }

  /**
   * 검증 거부 처리
   */
  reject(verifierId: string, reason: string): void {
    this.status = 'rejected';
    this.verifierId = verifierId;
    this.rejectionReason = reason;
    this.verifiedAt = new Date();
  }

  /**
   * 검증이 유효한지 확인
   */
  isValid(): boolean {
    if (this.status !== 'approved') return false;
    if (!this.expiresAt) return true;
    return new Date() < this.expiresAt;
  }
}
