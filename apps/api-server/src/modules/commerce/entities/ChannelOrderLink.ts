import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import type { Order } from './Order.js';
import type { SellerChannelAccount } from '../../../entities/SellerChannelAccount.js';

/**
 * ChannelOrderLink Entity
 * Phase PD-9: Multichannel RPA 1차
 *
 * Maps an external channel order to an internal O4O Order.
 * Tracks import status and external order identifiers.
 */

export enum ChannelOrderStatus {
  IMPORT_PENDING = 'import_pending',  // Detected in channel, not imported yet
  IMPORTED = 'imported',               // Successfully created O4O Order
  FAILED = 'failed',                  // Import failed
  CANCELLED = 'cancelled'             // External order was cancelled
}

@Entity('channel_order_links')
@Index(['channelAccountId', 'externalOrderId'], { unique: true })
@Index(['channelAccountId', 'status'])
@Index(['internalOrderId'])
@Index(['createdAt'])
export class ChannelOrderLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Channel account where this order originated
   */
  @Column('uuid')
  channelAccountId: string;

  @ManyToOne('SellerChannelAccount', { nullable: false, eager: true })
  @JoinColumn({ name: 'channelAccountId' })
  channelAccount: SellerChannelAccount;

  /**
   * External channel's order ID
   * Unique per channelAccountId
   */
  @Column({ type: 'varchar', length: 100 })
  externalOrderId: string;

  /**
   * Internal O4O Order ID
   * Set after successful import
   */
  @Column({ type: 'uuid', nullable: true })
  internalOrderId: string | null;

  @ManyToOne('Order', { nullable: true })
  @JoinColumn({ name: 'internalOrderId' })
  internalOrder: Order | null;

  /**
   * Import status
   */
  @Column({
    type: 'enum',
    enum: ChannelOrderStatus,
    default: ChannelOrderStatus.IMPORT_PENDING
  })
  status: ChannelOrderStatus;

  /**
   * Last sync timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date | null;

  /**
   * Last import/sync error message
   */
  @Column({ type: 'text', nullable: true })
  lastErrorMessage: string | null;

  /**
   * Raw order data from external channel
   * Stored for reference and debugging
   */
  @Column({ type: 'jsonb', nullable: true })
  externalOrderData: Record<string, any> | null;

  /**
   * Channel-specific metadata
   * Can include: buyer info, payment info, shipping info, channel fees, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * External order creation date (if available)
   */
  @Column({ type: 'timestamp', nullable: true })
  externalOrderDate: Date | null;

  /**
   * Import retry count
   */
  @Column({ type: 'integer', default: 0 })
  retryCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Helper method to mark import as successful
   */
  markImported(internalOrderId: string): void {
    this.status = ChannelOrderStatus.IMPORTED;
    this.internalOrderId = internalOrderId;
    this.lastSyncAt = new Date();
    this.lastErrorMessage = null;
  }

  /**
   * Helper method to mark import as failed
   */
  markFailed(errorMessage: string): void {
    this.status = ChannelOrderStatus.FAILED;
    this.lastSyncAt = new Date();
    this.lastErrorMessage = errorMessage;
    this.retryCount += 1;
  }

  /**
   * Helper method to check if retry is allowed
   */
  canRetry(maxRetries: number = 3): boolean {
    return this.retryCount < maxRetries;
  }
}
