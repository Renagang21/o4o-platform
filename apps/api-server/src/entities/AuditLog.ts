import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index
} from 'typeorm';
import type { User } from '../modules/auth/entities/User.js';

/**
 * Interface for tracking changes in audit logs
 */
export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
}

/**
 * AuditLog Entity
 *
 * Tracks all administrative actions and entity changes in the system.
 * Used for compliance, debugging, and audit trail visualization.
 *
 * Features:
 * - Tracks changes to commissions, conversions, policies, etc.
 * - Records who made changes and when
 * - Stores detailed change history (before/after values)
 * - Supports filtering by entity type, user, and date
 *
 * @entity audit_logs
 */
@Entity('audit_logs')
@Index('IDX_audit_logs_entity', ['entityType', 'entityId'])
@Index('IDX_audit_logs_user', ['userId'])
@Index('IDX_audit_logs_created', ['createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Type of entity being audited
   * Examples: 'commission', 'conversion', 'policy', 'partner'
   */
  @Column({ type: 'varchar', length: 100 })
  entityType: string;

  /**
   * ID of the entity being audited
   */
  @Column({ type: 'uuid' })
  entityId: string;

  /**
   * Action performed on the entity
   * Examples: 'created', 'updated', 'deleted', 'adjusted', 'cancelled', 'paid', 'refunded'
   */
  @Column({ type: 'varchar', length: 50 })
  action: string;

  /**
   * User who performed the action
   */
  @ManyToOne('User', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user?: User;

  @Column({ type: 'uuid', nullable: true })
  userId?: string;

  /**
   * Detailed changes made to the entity
   * Array of { field, oldValue, newValue } objects
   */
  @Column({ type: 'jsonb', nullable: true })
  changes?: AuditChange[];

  /**
   * Human-readable reason for the action
   */
  @Column({ type: 'text', nullable: true })
  reason?: string;

  /**
   * IP address of the user who made the change
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  ipAddress?: string;

  /**
   * User agent string (browser/client info)
   */
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  /**
   * Timestamp when the action occurred
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Helper method to format changes for display
   */
  getFormattedChanges(): string {
    if (!this.changes || this.changes.length === 0) {
      return 'No changes recorded';
    }

    return this.changes
      .map(change => {
        const oldVal = this.formatValue(change.oldValue);
        const newVal = this.formatValue(change.newValue);
        return `${change.field}: ${oldVal} → ${newVal}`;
      })
      .join(', ');
  }

  /**
   * Helper method to format values for display
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Validates the audit log before saving
   */
  validate(): void {
    if (!this.entityType || this.entityType.trim() === '') {
      throw new Error('Entity type is required');
    }
    if (!this.entityId || this.entityId.trim() === '') {
      throw new Error('Entity ID is required');
    }
    if (!this.action || this.action.trim() === '') {
      throw new Error('Action is required');
    }
  }
}
