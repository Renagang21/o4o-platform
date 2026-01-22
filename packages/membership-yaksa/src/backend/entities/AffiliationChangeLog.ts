import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { Member } from './Member.js';

/**
 * AffiliationChangeType
 * 소속 변경 유형
 */
export type AffiliationChangeType =
  | 'initial'       // 최초 소속 설정
  | 'transfer'      // 조직 이동 (지부/분회 변경)
  | 'promotion'     // 직책 승진
  | 'demotion'      // 직책 변경 (하향)
  | 'position_change' // 직책 변경 (수평)
  | 'reactivation'  // 재활성화
  | 'deactivation'; // 비활성화

/**
 * AffiliationChangeLog Entity
 *
 * 회원의 조직 소속 변경 이력을 기록
 *
 * Phase 2: 조직 연동 고도화
 * - 소속 변경 시 자동으로 로그 기록
 * - 변경 전/후 정보 저장
 * - 변경 사유 및 변경자 추적
 *
 * @example
 * ```typescript
 * {
 *   memberId: "member-kim",
 *   changeType: "transfer",
 *   fromOrganizationId: "org-seoul-gangnam",
 *   toOrganizationId: "org-seoul-seocho",
 *   fromPosition: "평회원",
 *   toPosition: "평회원",
 *   reason: "근무지 이전",
 *   changedBy: "admin-user-id"
 * }
 * ```
 */
@Entity('yaksa_affiliation_change_logs')
@Index(['memberId'])
@Index(['fromOrganizationId'])
@Index(['toOrganizationId'])
@Index(['createdAt'])
@Index(['changeType'])
export class AffiliationChangeLog {
  /**
   * 변경 로그 ID (PK)
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
   * 변경 유형
   */
  @Column({ type: 'varchar', length: 50 })
  changeType!: AffiliationChangeType;

  /**
   * 이전 조직 ID (최초 소속이면 null)
   */
  @Column({ type: 'uuid', nullable: true })
  fromOrganizationId?: string;

  /**
   * 이전 조직명 (스냅샷)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  fromOrganizationName?: string;

  /**
   * 새 조직 ID
   */
  @Column({ type: 'uuid', nullable: true })
  toOrganizationId?: string;

  /**
   * 새 조직명 (스냅샷)
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  toOrganizationName?: string;

  /**
   * 이전 직책
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  fromPosition?: string;

  /**
   * 새 직책
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  toPosition?: string;

  /**
   * 이전 공식 직책 (officialRole)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  fromOfficialRole?: string;

  /**
   * 새 공식 직책 (officialRole)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  toOfficialRole?: string;

  /**
   * 변경 사유
   */
  @Column({ type: 'text', nullable: true })
  reason?: string;

  /**
   * 변경자 ID (관리자 또는 시스템)
   */
  @Column({ type: 'uuid', nullable: true })
  changedBy?: string;

  /**
   * 변경자 이름 (스냅샷)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  changedByName?: string;

  /**
   * 확장 메타데이터
   *
   * @example
   * ```typescript
   * {
   *   "previousAffiliationId": "aff-123",
   *   "newAffiliationId": "aff-456",
   *   "autoProcessed": true,
   *   "triggerSource": "workplace_change"
   * }
   * ```
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * 생성일시 (변경 발생 시점)
   */
  @CreateDateColumn()
  createdAt!: Date;
}
