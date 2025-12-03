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
import type { User } from '../../../entities/User.js';
import type { SellerProduct } from '../../../entities/SellerProduct.js';
import type { SellerChannelAccount } from '../../../entities/SellerChannelAccount.js';

/**
 * ChannelProductLink Entity
 * Phase PD-9: Multichannel RPA 1차
 *
 * Maps an O4O SellerProduct to an external channel's product.
 * Tracks export status and external product identifiers.
 */

export enum ChannelProductStatus {
  DRAFT = 'draft',           // Link created but not exported yet
  EXPORTED = 'exported',      // Successfully exported to channel
  FAILED = 'failed',         // Export failed
  INACTIVE = 'inactive',     // Deactivated on channel
  OUT_OF_SYNC = 'out_of_sync' // Local product changed, needs re-export
}

@Entity('channel_product_links')
@Index(['sellerId', 'channelAccountId'])
@Index(['sellerId', 'sellerProductId'])
@Index(['channelAccountId', 'status'])
@Index(['channelAccountId', 'externalProductId'])
@Index(['sellerId', 'channelAccountId', 'sellerProductId'], { unique: true })
export class ChannelProductLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Seller (owner of this link)
   */
  @Column('uuid')
  sellerId: string;

  @ManyToOne('User', { nullable: false })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  /**
   * Channel account this product is linked to
   */
  @Column('uuid')
  channelAccountId: string;

  @ManyToOne('SellerChannelAccount', { nullable: false, eager: true })
  @JoinColumn({ name: 'channelAccountId' })
  channelAccount: SellerChannelAccount;

  /**
   * Internal product (SellerProduct)
   */
  @Column('uuid')
  sellerProductId: string;

  @ManyToOne('SellerProduct', { nullable: false, eager: true })
  @JoinColumn({ name: 'sellerProductId' })
  sellerProduct: SellerProduct;

  /**
   * External channel's product ID or SKU
   * Set after successful export
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  externalProductId: string | null;

  /**
   * External product page URL
   * Set after successful export
   */
  @Column({ type: 'text', nullable: true })
  externalUrl: string | null;

  /**
   * Export status
   */
  @Column({
    type: 'enum',
    enum: ChannelProductStatus,
    default: ChannelProductStatus.DRAFT
  })
  status: ChannelProductStatus;

  /**
   * Last sync timestamp
   */
  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date | null;

  /**
   * Last export/sync error message
   */
  @Column({ type: 'text', nullable: true })
  lastErrorMessage: string | null;

  /**
   * Channel-specific metadata
   * Can include: category mapping, option mapping, custom fields, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Whether this link is active
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Export count (for tracking)
   */
  @Column({ type: 'integer', default: 0 })
  exportCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Helper method to mark export as successful
   */
  markExported(externalProductId: string, externalUrl?: string): void {
    this.status = ChannelProductStatus.EXPORTED;
    this.externalProductId = externalProductId;
    this.externalUrl = externalUrl || null;
    this.lastSyncAt = new Date();
    this.lastErrorMessage = null;
    this.exportCount += 1;
  }

  /**
   * Helper method to mark export as failed
   */
  markFailed(errorMessage: string): void {
    this.status = ChannelProductStatus.FAILED;
    this.lastSyncAt = new Date();
    this.lastErrorMessage = errorMessage;
  }

  /**
   * Helper method to mark as out of sync
   */
  markOutOfSync(): void {
    this.status = ChannelProductStatus.OUT_OF_SYNC;
  }
}
