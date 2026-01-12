import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { User } from '../modules/auth/entities/User.js';

/**
 * KYC 문서 (Know Your Customer Documents)
 *
 * 역할 신청 시 제출하는 각종 증빙 서류를 관리합니다.
 *
 * 문서 타입:
 * - business_registration: 사업자등록증
 * - id_card: 신분증
 * - bank_statement: 통장사본
 * - tax_certificate: 사업자 과세증명서
 * - etc: 기타
 *
 * @see 01_schema_baseline.md
 */
@Entity('kyc_documents')
@Index(['userId'])
@Index(['verificationStatus'])
@Index(['documentType'])
export class KycDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 문서 소유자
   */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /**
   * 문서 타입
   *
   * 'business_registration' | 'id_card' | 'bank_statement' | 'tax_certificate' | 'etc'
   */
  @Column({ type: 'varchar', length: 50 })
  documentType!: string;

  /**
   * 파일 URL
   *
   * S3, CDN 등의 저장소 경로
   */
  @Column({ type: 'varchar', length: 500 })
  fileUrl!: string;

  /**
   * 원본 파일명
   */
  @Column({ type: 'varchar', length: 255 })
  fileName!: string;

  /**
   * 파일 크기 (bytes)
   */
  @Column({ type: 'integer', nullable: true })
  fileSize?: number;

  /**
   * MIME 타입
   *
   * 'image/jpeg', 'image/png', 'application/pdf' 등
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType?: string;

  /**
   * 검증 상태
   *
   * - PENDING: 검증 대기 중
   * - VERIFIED: 검증 완료
   * - REJECTED: 검증 거부
   */
  @Column({ type: 'varchar', length: 50, default: 'PENDING' })
  verificationStatus!: 'PENDING' | 'VERIFIED' | 'REJECTED';

  /**
   * 검증 완료 시각
   */
  @Column({ type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  /**
   * 검증자 (관리자)
   */
  @Column({ name: 'verified_by', type: 'uuid', nullable: true })
  verifiedBy?: string;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'verified_by' })
  verifier?: User;

  /**
   * 검증 의견
   *
   * - 검증 완료: "서류 확인 완료"
   * - 검증 거부: "사업자등록증 만료됨"
   */
  @Column({ type: 'text', nullable: true })
  verificationNote?: string;

  /**
   * 생성 시각
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정 시각
   */
  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper methods

  /**
   * 검증 완료 처리
   */
  verify(verifierId: string, note?: string): void {
    this.verificationStatus = 'VERIFIED';
    this.verifiedAt = new Date();
    this.verifiedBy = verifierId;
    if (note) {
      this.verificationNote = note;
    }
  }

  /**
   * 검증 거부 처리
   */
  rejectVerification(verifierId: string, note: string): void {
    this.verificationStatus = 'REJECTED';
    this.verifiedAt = new Date();
    this.verifiedBy = verifierId;
    this.verificationNote = note;
  }

  /**
   * 검증 완료 여부
   */
  isVerified(): boolean {
    return this.verificationStatus === 'VERIFIED';
  }
}
