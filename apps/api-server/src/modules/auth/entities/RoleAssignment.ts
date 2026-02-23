import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import type { User } from './User.js';

/**
 * 역할 할당 (Assignment)
 *
 * 승인된 역할을 사용자에게 실제로 할당합니다.
 * 권한 판정(RBAC)은 이 테이블의 `isActive = true` 레코드를 기준으로 합니다.
 *
 * 제약:
 * - 한 사용자는 동일 역할을 한 번만 active로 가질 수 있음
 *
 * @see 04_rbac_policy.md
 */
@Entity('role_assignments')
@Index(['userId'])
@Index(['role'])
@Index(['isActive'])
@Index(['userId', 'isActive'])
@Index(['userId', 'role'])
@Unique('unique_active_role_per_user', ['userId', 'role', 'isActive'])
export class RoleAssignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 할당 대상 사용자
   */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  /**
   * 역할
   *
   * 'admin' | 'supplier' | 'seller' | 'partner'
   */
  @Column({ type: 'varchar', length: 50 })
  role!: string;

  /**
   * 활성 상태
   *
   * RBAC 미들웨어는 isActive = true인 레코드만 권한으로 인정합니다.
   */
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * 유효 시작 시각
   *
   * 역할이 활성화된 시각
   */
  @Column({ name: 'valid_from', type: 'timestamp', default: () => 'NOW()' })
  validFrom!: Date;

  /**
   * 유효 종료 시각 (옵션)
   *
   * null이면 무기한 유효
   * 임시 권한 부여 시 사용
   */
  @Column({ name: 'valid_until', type: 'timestamp', nullable: true })
  validUntil?: Date;

  /**
   * 할당 시각
   */
  @Column({ name: 'assigned_at', type: 'timestamp', default: () => 'NOW()' })
  assignedAt!: Date;

  /**
   * 할당자 (관리자)
   */
  @Column({ name: 'assigned_by', type: 'uuid', nullable: true })
  assignedBy?: string;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'assigned_by' })
  assigner?: User;

  /**
   * 권한 스코프 타입
   *
   * - global: 전역 권한 (모든 리소스에 대한 권한)
   * - organization: 조직 권한 (특정 조직에 대한 권한)
   *
   * organization-core가 ALTER TABLE로 추가하는 컬럼이나,
   * 단일 Entity 관리를 위해 여기서 명시적 선언.
   */
  @Column({ name: 'scope_type', type: 'varchar', length: 50, nullable: true, default: 'global' })
  scopeType?: string;

  /**
   * 스코프 ID
   *
   * scopeType='organization'인 경우 조직 ID
   * scopeType='global'인 경우 null
   */
  @Column({ name: 'scope_id', type: 'uuid', nullable: true })
  scopeId?: string;

  /**
   * 생성 시각
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  /**
   * 수정 시각
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Helper methods

  /**
   * 현재 시점에 유효한 역할인지 체크
   */
  isValidNow(): boolean {
    if (!this.isActive) {
      return false;
    }

    const now = new Date();

    // validFrom 체크
    if (this.validFrom > now) {
      return false;
    }

    // validUntil 체크
    if (this.validUntil && this.validUntil < now) {
      return false;
    }

    return true;
  }

  /**
   * 역할 비활성화
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * 역할 활성화
   */
  activate(): void {
    this.isActive = true;
  }

  /**
   * 유효 기간 설정
   */
  setValidityPeriod(from: Date, until?: Date): void {
    this.validFrom = from;
    this.validUntil = until;
  }
}
