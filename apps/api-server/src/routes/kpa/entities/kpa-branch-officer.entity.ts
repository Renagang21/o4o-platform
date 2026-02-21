/**
 * KPA Branch Officer Entity
 * 분회 임원 정보
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

@Entity('kpa_branch_officers')
@Index(['organization_id', 'is_active', 'sort_order'])
export class KpaBranchOfficer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  position: string; // display title (분회장, 부회장, 총무, etc.)

  @Column({ type: 'varchar', length: 50 })
  role: string; // president | vice_president | secretary | treasurer | director | auditor

  @Column({ type: 'varchar', length: 200, nullable: true })
  pharmacy_name: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  email: string | null;

  @Column({ type: 'date', nullable: true })
  term_start: Date | null;

  @Column({ type: 'date', nullable: true })
  term_end: Date | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ESM string-based relation (CLAUDE.md §4)
  @ManyToOne('OrganizationStore')
  @JoinColumn({ name: 'organization_id' })
  organization: any;
}
