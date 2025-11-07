import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { SellerAuthorization } from './SellerAuthorization.js';

/**
 * Phase 9: Seller Authorization Audit Log Entity
 *
 * Tracks all state changes and actions on seller authorizations.
 * Used for compliance, debugging, and analytics.
 *
 * Actions:
 * - REQUEST: Seller requests authorization
 * - APPROVE: Supplier/Admin approves request
 * - REJECT: Supplier/Admin rejects request (cooldown starts)
 * - REVOKE: Supplier/Admin revokes authorization (permanent)
 * - CANCEL: Seller cancels their own request
 *
 * Created: 2025-01-07
 */

export enum AuditAction {
  REQUEST = 'REQUEST',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REVOKE = 'REVOKE',
  CANCEL = 'CANCEL',
}

export enum ActorRole {
  SELLER = 'seller',
  SUPPLIER = 'supplier',
  ADMIN = 'admin',
}

@Entity('seller_authorization_audit_logs')
@Index(['authorizationId', 'createdAt'])
@Index(['actorId', 'createdAt'])
@Index(['action', 'createdAt'])
export class SellerAuthorizationAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Authorization relationship
  @Column({ type: 'uuid', nullable: true })
  authorizationId!: string;

  @ManyToOne('SellerAuthorization', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorizationId' })
  authorization!: SellerAuthorization;

  // Action details
  @Column({ type: 'varchar', length: 50, nullable: true })
  action!: AuditAction;

  @Column({ type: 'uuid', nullable: true })
  actorId?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  actorRole?: ActorRole;

  // State transition
  @Column({ type: 'varchar', length: 20, nullable: true })
  statusFrom?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  statusTo?: string;

  // Additional context
  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Timestamp
  @CreateDateColumn()
  createdAt!: Date;

  // Static factory methods for common audit log creation

  /**
   * Create audit log for authorization request
   */
  static createRequestLog(
    authorizationId: string,
    sellerId: string,
    metadata?: Record<string, any>
  ): Partial<SellerAuthorizationAuditLog> {
    return {
      authorizationId,
      action: AuditAction.REQUEST,
      actorId: sellerId,
      actorRole: ActorRole.SELLER,
      statusFrom: undefined,
      statusTo: 'REQUESTED',
      metadata,
    };
  }

  /**
   * Create audit log for approval
   */
  static createApprovalLog(
    authorizationId: string,
    supplierId: string,
    metadata?: Record<string, any>
  ): Partial<SellerAuthorizationAuditLog> {
    return {
      authorizationId,
      action: AuditAction.APPROVE,
      actorId: supplierId,
      actorRole: ActorRole.SUPPLIER,
      statusFrom: 'REQUESTED',
      statusTo: 'APPROVED',
      metadata,
    };
  }

  /**
   * Create audit log for rejection
   */
  static createRejectionLog(
    authorizationId: string,
    supplierId: string,
    reason: string,
    cooldownUntil: Date,
    metadata?: Record<string, any>
  ): Partial<SellerAuthorizationAuditLog> {
    return {
      authorizationId,
      action: AuditAction.REJECT,
      actorId: supplierId,
      actorRole: ActorRole.SUPPLIER,
      statusFrom: 'REQUESTED',
      statusTo: 'REJECTED',
      reason,
      metadata: {
        ...metadata,
        cooldownUntil: cooldownUntil.toISOString(),
      },
    };
  }

  /**
   * Create audit log for revocation
   */
  static createRevocationLog(
    authorizationId: string,
    supplierId: string,
    reason: string,
    metadata?: Record<string, any>
  ): Partial<SellerAuthorizationAuditLog> {
    return {
      authorizationId,
      action: AuditAction.REVOKE,
      actorId: supplierId,
      actorRole: ActorRole.SUPPLIER,
      statusFrom: 'APPROVED',
      statusTo: 'REVOKED',
      reason,
      metadata,
    };
  }

  /**
   * Create audit log for cancellation
   */
  static createCancellationLog(
    authorizationId: string,
    sellerId: string,
    metadata?: Record<string, any>
  ): Partial<SellerAuthorizationAuditLog> {
    return {
      authorizationId,
      action: AuditAction.CANCEL,
      actorId: sellerId,
      actorRole: ActorRole.SELLER,
      statusFrom: 'REQUESTED',
      statusTo: 'CANCELLED',
      metadata,
    };
  }
}
