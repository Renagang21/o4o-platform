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
import { Organization } from './Organization.js';

/**
 * OrganizationMember Entity
 *
 * 조직과 회원(User)을 연결하는 다대다(M:N) 연결 테이블입니다.
 * 한 회원이 여러 조직에 소속될 수 있으며, 각 조직에서 다른 역할을 가질 수 있습니다.
 *
 * @example
 * ```typescript
 * // 회원의 조직 소속 예시
 * {
 *   userId: "user-kim",
 *   organizationId: "org-seoul-gangnam",
 *   role: "manager",
 *   isPrimary: true,  // 주 소속 조직
 *   joinedAt: "2025-01-15"
 * }
 * ```
 */
@Entity('organization_members')
@Index(['organizationId', 'userId'], { unique: true })
@Index(['userId'])
@Index(['organizationId'])
@Index(['isPrimary'])
export class OrganizationMember {
  /**
   * 연결 ID (PK)
   */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * 조직 ID (FK → organizations.id)
   */
  @Column({ type: 'uuid' })
  organizationId!: string;

  /**
   * 조직 관계
   */
  @ManyToOne(() => Organization)
  @JoinColumn({ name: 'organizationId' })
  organization!: Organization;

  /**
   * 회원 ID (FK → users.id)
   */
  @Column({ type: 'uuid' })
  userId!: string;

  /**
   * 조직 내 역할
   * - admin: 조직 관리자 (조직 설정 변경, 멤버 관리, 콘텐츠 관리)
   * - manager: 조직 매니저 (멤버 관리, 콘텐츠 관리)
   * - member: 일반 회원 (콘텐츠 읽기/쓰기)
   * - moderator: 조직 중재자 (콘텐츠 관리 - 삭제/수정)
   */
  @Column({
    type: 'varchar',
    length: 50,
    default: 'member',
  })
  role!: 'admin' | 'manager' | 'member' | 'moderator';

  /**
   * 주 소속 조직 여부
   *
   * 한 사용자는 하나의 주 소속 조직만 가질 수 있습니다.
   * isPrimary=true는 한 사용자당 최대 1개만 허용됩니다.
   */
  @Column({ type: 'boolean', default: false })
  isPrimary!: boolean;

  /**
   * 확장 필드 (직책, 부서 등)
   *
   * @example
   * ```typescript
   * {
   *   "position": "지부장",
   *   "department": "총무부",
   *   "employeeId": "EMP-001"
   * }
   * ```
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  /**
   * 조직 가입일
   */
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  joinedAt!: Date;

  /**
   * 조직 탈퇴일 (null = 활성 회원)
   *
   * Soft delete 방식으로 탈퇴 처리됩니다.
   * leftAt이 null이 아니면 탈퇴 상태입니다.
   */
  @Column({ type: 'timestamp', nullable: true })
  leftAt?: Date;

  /**
   * 레코드 생성일시 (자동)
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * 레코드 수정일시 (자동)
   */
  @UpdateDateColumn()
  updatedAt!: Date;
}
