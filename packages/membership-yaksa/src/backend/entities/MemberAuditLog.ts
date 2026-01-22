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
 * AuditAction
 * 감사 로그 액션 유형
 */
export type AuditAction =
  | 'create'          // 회원 생성
  | 'update'          // 회원 정보 수정
  | 'delete'          // 회원 삭제
  | 'verify'          // 검증 상태 변경
  | 'activate'        // 활성화
  | 'deactivate'      // 비활성화
  | 'role_change'     // 역할 변경
  | 'category_change' // 카테고리 변경
  | 'fee_payment'     // 연회비 납부
  | 'bulk_update';    // 일괄 업데이트

/**
 * FieldChange
 * 필드 변경 내역
 */
export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
  label?: string;  // 한글 필드명
}

/**
 * MemberAuditLog Entity
 *
 * 회원 정보 변경 이력을 추적하는 감사 로그
 *
 * Phase 2: 회원 변경 이력(Audit Log) 기능
 * - 변경된 필드 목록
 * - 변경 전→후 값
 * - 변경자(User)
 * - 변경 사유(optional)
 *
 * @example
 * ```typescript
 * {
 *   memberId: "member-kim",
 *   action: "update",
 *   changedFields: [
 *     { field: "officialRole", oldValue: "none", newValue: "director", label: "직책" },
 *     { field: "phone", oldValue: "010-1234-5678", newValue: "010-8765-4321", label: "연락처" }
 *   ],
 *   changedBy: "admin-user-id",
 *   reason: "임원 선출에 따른 직책 변경"
 * }
 * ```
 */
@Entity('yaksa_member_audit_logs')
@Index(['memberId'])
@Index(['action'])
@Index(['changedBy'])
@Index(['createdAt'])
export class MemberAuditLog {
  /**
   * 감사 로그 ID (PK)
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
   * 액션 유형
   */
  @Column({ type: 'varchar', length: 50 })
  action!: AuditAction;

  /**
   * 액션 설명
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  actionDescription?: string;

  /**
   * 변경된 필드 목록 (JSON)
   *
   * 각 필드의 이전 값과 새 값을 포함
   */
  @Column({ type: 'jsonb', nullable: true })
  changedFields?: FieldChange[];

  /**
   * 변경 전 전체 스냅샷 (선택적)
   *
   * 중요한 변경의 경우 전체 이전 상태 저장
   */
  @Column({ type: 'jsonb', nullable: true })
  previousSnapshot?: Record<string, any>;

  /**
   * 변경 후 전체 스냅샷 (선택적)
   */
  @Column({ type: 'jsonb', nullable: true })
  newSnapshot?: Record<string, any>;

  /**
   * 변경자 ID (관리자 User ID)
   */
  @Column({ type: 'uuid', nullable: true })
  changedBy?: string;

  /**
   * 변경자 이름 (스냅샷)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  changedByName?: string;

  /**
   * 변경 사유
   */
  @Column({ type: 'text', nullable: true })
  reason?: string;

  /**
   * IP 주소
   */
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  /**
   * User Agent
   */
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  /**
   * 요청 ID (추적용)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  requestId?: string;

  /**
   * 확장 메타데이터
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * 생성일시 (변경 발생 시점)
   */
  @CreateDateColumn()
  createdAt!: Date;
}
