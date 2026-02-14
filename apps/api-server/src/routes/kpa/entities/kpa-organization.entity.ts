/**
 * KPA Organization Entity
 * 약사회 조직 (본회, 지부, 분회 등)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export type KpaOrganizationType = 'association' | 'branch' | 'group';

@Entity('kpa_organizations')
export class KpaOrganization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 50 })
  type: KpaOrganizationType;

  @Column({ type: 'uuid', nullable: true })
  parent_id: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  storefront_config: Record<string, any>;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Self-referencing relation for hierarchy
  @ManyToOne('KpaOrganization', { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: KpaOrganization | null;

  @OneToMany('KpaOrganization', 'parent')
  children: KpaOrganization[];
}
