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
import type { User } from './User.js';
import type { ExternalChannel } from './ExternalChannel.js';

/**
 * SellerChannelAccount Entity
 * Phase PD-9: Multichannel RPA 1차
 *
 * Represents a Seller's connection/account to an external sales channel.
 * Each seller can have multiple accounts (e.g., multiple Naver stores).
 */

@Entity('seller_channel_accounts')
@Index(['sellerId', 'channelCode'])
@Index(['sellerId', 'isActive'])
@Index(['channelCode', 'isActive'])
export class SellerChannelAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Seller (User with seller role)
   */
  @Column('uuid')
  sellerId: string;

  @ManyToOne('User', { nullable: false })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  /**
   * Channel code (references ExternalChannel.code)
   * Using code instead of ID for easier query and flexibility
   */
  @Column({ type: 'varchar', length: 50 })
  channelCode: string;

  @ManyToOne('ExternalChannel', { nullable: false, eager: true })
  @JoinColumn({ name: 'channelCode', referencedColumnName: 'code' })
  channel: ExternalChannel;

  /**
   * Display name for this account (seller-defined)
   * Examples: "내 메인 스토어", "쿠팡 테스트몰"
   */
  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  /**
   * Channel-specific credentials and configuration
   * Structure depends on the channel:
   * - test_channel: { storeId: string }
   * - naver_smartstore: { storeId: string, apiKey?: string, apiSecret?: string }
   * - coupang: { vendorId: string, apiKey?: string }
   */
  @Column({ type: 'jsonb', nullable: true })
  credentials: Record<string, any> | null;

  /**
   * Whether this account is currently active
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  /**
   * Last sync timestamp (for order import tracking)
   */
  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt: Date | null;

  /**
   * Last sync status
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  lastSyncStatus: string | null; // 'success' | 'failed' | null

  /**
   * Last sync error message
   */
  @Column({ type: 'text', nullable: true })
  lastSyncError: string | null;

  /**
   * Additional metadata for this account
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Helper method to update sync status
   */
  updateSyncStatus(status: 'success' | 'failed', error?: string): void {
    this.lastSyncAt = new Date();
    this.lastSyncStatus = status;
    this.lastSyncError = error || null;
  }
}
