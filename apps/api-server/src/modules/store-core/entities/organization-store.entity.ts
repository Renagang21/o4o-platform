/**
 * OrganizationStore Entity
 * organizations 테이블의 확장 뷰 엔티티
 *
 * WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1 Phase B-1a
 *
 * 기존 Organization (organization-core, Frozen)의 기본 필드 +
 * Phase A에서 추가된 storefront/약국 확장 필드를 포함.
 * KPA/GlycoPharm 코드에서 organizations 테이블 접근 시 사용.
 *
 * ESM RULES (CLAUDE.md §4): string-based relation, type-only import
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

@Entity('organizations')
export class OrganizationStore {

  // === 기본 조직 필드 (기존 organizations 테이블) ===

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  /** DB 컬럼: "parentId" (camelCase quoted — SnakeNamingStrategy 비활성) */
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  /** DB 컬럼: "isActive" (camelCase quoted) */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  level: number;

  @Column({ type: 'text' })
  path: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /** DB 컬럼: "childrenCount" (camelCase quoted) */
  @Column({ type: 'int', default: 0 })
  childrenCount: number;

  // === Phase A 확장 필드 (snake_case — 신규 추가 컬럼) ===

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  business_number: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by_user_id: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  storefront_config: Record<string, any>;

  @Column({ type: 'varchar', length: 30, default: 'BASIC' })
  template_profile: string;

  @Column({ type: 'jsonb', nullable: true })
  storefront_blocks: any[] | null;

  // === Relations (string-based per CLAUDE.md §4) ===

  @ManyToOne('OrganizationStore', { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: any;

  @OneToMany('OrganizationStore', 'parent')
  children: any[];

  // === Timestamps ===

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
