/**
 * KPA Branch Doc Entity
 * 분회 자료실 문서
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

@Entity('kpa_branch_docs')
@Index(['organization_id', 'is_public', 'created_at'])
export class KpaBranchDoc {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 300 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50, default: 'general' })
  category: string; // general | regulation | form | guide

  @Column({ type: 'varchar', length: 500, nullable: true })
  file_url: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  file_name: string | null;

  @Column({ type: 'bigint', default: 0 })
  file_size: number;

  @Column({ type: 'boolean', default: true })
  is_public: boolean;

  @Column({ type: 'int', default: 0 })
  download_count: number;

  @Column({ type: 'boolean', default: false })
  is_deleted: boolean;

  @Column({ type: 'uuid', nullable: true })
  uploaded_by: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // ESM string-based relation (CLAUDE.md §4)
  @ManyToOne('KpaOrganization')
  @JoinColumn({ name: 'organization_id' })
  organization: any;
}
