/**
 * KPA Branch Settings Entity
 * 분회 설정 (기본정보, 기한, 회비 설정)
 *
 * WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1
 */

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

@Entity('kpa_branch_settings')
@Index(['organization_id'], { unique: true })
export class KpaBranchSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', unique: true })
  organization_id: string;

  // Basic info
  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  fax: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  working_hours: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // Deadlines (MM-DD format)
  @Column({ type: 'varchar', length: 10, nullable: true })
  membership_fee_deadline: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  annual_report_deadline: string | null;

  // Fee settings (JSON - 직능별 회비 설정)
  @Column({ type: 'jsonb', nullable: true })
  fee_settings: Record<string, any> | null;

  // Status
  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ESM string-based relation (CLAUDE.md §4)
  @ManyToOne('OrganizationStore')
  @JoinColumn({ name: 'organization_id' })
  organization: any;
}
