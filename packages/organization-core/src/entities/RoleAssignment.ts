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
import { Organization } from './Organization';

/**
 * RoleAssignment Entity
 *
 * 사용자 권한 할당 엔티티 (조직 스코프 지원)
 *
 * Phase 2에서 scopeType/scopeId 기능을 실제로 활용합니다.
 *
 * @example
 * ```typescript
 * // 전역 관리자
 * {
 *   userId: "user-admin",
 *   role: "super_admin",
 *   scopeType: "global",
 *   scopeId: null
 * }
 *
 * // 서울지부 관리자
 * {
 *   userId: "user-seoul-admin",
 *   role: "admin",
 *   scopeType: "organization",
 *   scopeId: "org-seoul"
 * }
 * ```
 */
@Entity('role_assignments')
@Index(['userId'])
@Index(['scopeType', 'scopeId'])
@Index(['userId', 'role', 'scopeType', 'scopeId'], { unique: true })
export class RoleAssignment {
  /**
   * 권한 할당 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 사용자 ID (FK → users.id)
   */
  @Column({ type: 'uuid' })
  userId!: string;

  /**
   * 역할
   *
   * 예: "super_admin", "admin", "manager", "instructor", "moderator"
   */
  @Column({ type: 'varchar', length: 100 })
  role!: string;

  /**
   * 권한 스코프 타입
   * - global: 전역 권한 (모든 리소스에 대한 권한)
   * - organization: 조직 권한 (특정 조직에 대한 권한)
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: 'global',
  })
  scopeType!: 'global' | 'organization';

  /**
   * 스코프 ID
   *
   * scopeType='organization'인 경우 조직 ID
   * scopeType='global'인 경우 null
   */
  @Column({ type: 'uuid', nullable: true })
  scopeId?: string;

  /**
   * 조직 관계 (scopeType='organization'인 경우)
   */
  @ManyToOne(() => Organization, { nullable: true })
  @JoinColumn({ name: 'scopeId' })
  organization?: Organization;

  /**
   * 활성 여부
   */
  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  /**
   * 생성일시 (자동)
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 수정일시 (자동)
   */
  @UpdateDateColumn()
  updatedAt!: Date;
}
