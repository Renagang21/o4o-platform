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
 * Phase B-4 Step 3: Seller Authorization Audit Log
 *
 * Tracks all state changes and actions performed on authorization requests.
 * Provides audit trail for compliance and debugging.
 *
 * Created: 2025-01-04
 */

export enum AuditAction {
  REQUEST = 'REQUEST',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REVOKE = 'REVOKE',
  CANCEL = 'CANCEL',
}

@Entity('seller_authorization_audit_logs')
@Index(['authorizationId', 'createdAt'])
@Index(['actorId', 'createdAt'])
export class SellerAuthorizationAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  authorizationId!: string;

  @ManyToOne('SellerAuthorization', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'authorizationId' })
  authorization!: SellerAuthorization;

  @Column({ type: 'varchar', length: 20 })
  action!: AuditAction;

  @Column({ type: 'uuid' })
  actorId!: string;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  @Column({ type: 'timestamp', nullable: true })
  cooldownUntil?: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  // Factory Methods

  static createRequestLog(
    authorizationId: string,
    sellerId: string,
    metadata?: Record<string, any>
  ): Partial<SellerAuthorizationAuditLog> {
    return {
      authorizationId,
      action: AuditAction.REQUEST,
      actorId: sellerId,
      metadata,
    };
  }

  static createApprovalLog(
    authorizationId: string,
    approvedBy: string
  ): Partial<SellerAuthorizationAuditLog> {
    return {
      authorizationId,
      action: AuditAction.APPROVE,
      actorId: approvedBy,
    };
  }

  static createRejectionLog(
    authorizationId: string,
    rejectedBy: string,
    reason: string,
    cooldownUntil: Date
  ): Partial<SellerAuthorizationAuditLog> {
    return {
      authorizationId,
      action: AuditAction.REJECT,
      actorId: rejectedBy,
      reason,
      cooldownUntil,
    };
  }

  static createRevocationLog(
    authorizationId: string,
    revokedBy: string,
    reason: string
  ): Partial<SellerAuthorizationAuditLog> {
    return {
      authorizationId,
      action: AuditAction.REVOKE,
      actorId: revokedBy,
      reason,
    };
  }

  static createCancellationLog(
    authorizationId: string,
    sellerId: string
  ): Partial<SellerAuthorizationAuditLog> {
    return {
      authorizationId,
      action: AuditAction.CANCEL,
      actorId: sellerId,
    };
  }
}
