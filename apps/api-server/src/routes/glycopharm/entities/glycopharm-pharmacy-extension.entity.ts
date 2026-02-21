/**
 * GlycopharmPharmacyExtension Entity
 * glycopharm 서비스 고유 확장 테이블
 *
 * WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1 Phase B-1a
 *
 * organizations 테이블에 없는 glycopharm 전용 필드를 저장.
 * PK = organization_id (1:1 관계)
 *
 * ESM RULES (CLAUDE.md §4): string-based relation, type-only import
 */

import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';

import type { GlycopharmServiceType } from './glycopharm-application.entity.js';

@Entity('glycopharm_pharmacy_extensions')
export class GlycopharmPharmacyExtension {

  @PrimaryColumn('uuid')
  organization_id: string;

  @Column({ name: 'enabled_services', type: 'jsonb', default: '[]' })
  enabled_services: GlycopharmServiceType[];

  @Column({ type: 'varchar', length: 2000, nullable: true })
  hero_image: string | null;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  logo: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  owner_name: string | null;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations (string-based per CLAUDE.md §4)
  @OneToOne('OrganizationStore')
  @JoinColumn({ name: 'organization_id' })
  organization: any;
}
