/**
 * OrganizationServiceEnrollment Entity
 * 조직-서비스 가입 junction table
 *
 * WO-O4O-ORG-SERVICE-MODEL-NORMALIZATION-V1 Phase B-1a
 *
 * 하나의 조직이 여러 서비스에 가입할 수 있음 (1:N)
 * UNIQUE(organization_id, service_code)
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
  JoinColumn,
  Index,
} from 'typeorm';

@Entity('organization_service_enrollments')
@Index(['organization_id', 'service_code'], { unique: true })
@Index(['organization_id'])
@Index(['service_code'])
@Index(['status'])
export class OrganizationServiceEnrollment {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  organization_id: string;

  @Column({ type: 'varchar', length: 50 })
  service_code: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status: string;

  @Column({ type: 'timestamp', default: () => 'NOW()' })
  enrolled_at: Date;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations (string-based per CLAUDE.md §4)
  @ManyToOne('OrganizationStore')
  @JoinColumn({ name: 'organization_id' })
  organization: any;
}
