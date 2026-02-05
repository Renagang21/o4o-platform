/**
 * Role Migration Log Entity
 *
 * WO-P1-SERVICE-ROLE-PREFIX-IMPLEMENTATION-V1 - Phase 0
 *
 * Tracks the migration progress of user roles from legacy to prefixed format.
 * Used for monitoring, auditing, and rollback capability.
 *
 * ⚠️ TEMPORARY ENTITY - Remove after migration complete (Phase 7)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { User } from '../modules/auth/entities/User.js';
import type { ServiceKey } from '../types/roles.js';

/**
 * Migration status values
 */
export type RoleMigrationStatus =
  | 'pending'      // Not yet migrated
  | 'in_progress'  // Migration in progress
  | 'completed'    // Successfully migrated
  | 'failed'       // Migration failed
  | 'skipped';     // Skipped (e.g., no roles to migrate)

@Entity('role_migration_log')
export class RoleMigrationLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  service_key: ServiceKey | null;

  @Column({ type: 'simple-array', default: [] })
  legacy_roles: string[];

  @Column({ type: 'simple-array', default: [] })
  prefixed_roles: string[];

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  migration_status: RoleMigrationStatus;

  @Column({ type: 'timestamp', nullable: true })
  migrated_at: Date | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne('User')
  @JoinColumn({ name: 'user_id' })
  user: User;
}
