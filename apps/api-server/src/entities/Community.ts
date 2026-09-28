import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * Community — 개체(tenant) 단위 커뮤니티
 * WO-O4O-SERVICE-IDENTITY-AND-OPERATOR-SCOPE-V1 §3
 *
 * `config/community-catalog.ts` 의 3개는 **코드 상수**였다. 개설·승인·운영자 한정을 하려면
 * 개체가 행으로 존재해야 한다. 분회(`kpa_organizations` + `branch_memberships`)와 같은 2층 구조다.
 *
 * `slug` 가 곧 주소다 — 전역 UNIQUE 이며 소문자만 저장한다(DB CHECK).
 */
@Entity('communities')
export class Community {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  slug: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** active | suspended — 개설 시점에 이미 승인된 상태로 들어온다(신청은 별도 테이블). */
  @Column({ type: 'varchar', length: 16, default: 'active' })
  status: 'active' | 'suspended';

  @Column({ type: 'uuid', name: 'created_by_user_id', nullable: true })
  createdByUserId: string | null;

  @Column({ type: 'uuid', name: 'approved_by_user_id', nullable: true })
  approvedByUserId: string | null;

  @Column({ type: 'timestamptz', name: 'approved_at', nullable: true })
  approvedAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
