import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

/**
 * ExternalChannel Entity
 * Phase PD-9: Multichannel RPA 1차
 *
 * Represents an external sales channel (marketplace/platform)
 * where sellers can export products and import orders.
 *
 * Examples: Naver SmartStore, Coupang, Community Mall, Influencer Shop
 */

export enum ChannelStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance'
}

@Entity('external_channels')
@Index(['code'], { unique: true })
@Index(['status'])
export class ExternalChannel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Unique channel code identifier
   * Examples: 'test_channel', 'naver_smartstore', 'coupang', 'community_mall'
   */
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  /**
   * Display name of the channel
   * Examples: "테스트 채널", "네이버 스마트스토어", "쿠팡"
   */
  @Column({ type: 'varchar', length: 100 })
  name: string;

  /**
   * Channel status
   */
  @Column({
    type: 'enum',
    enum: ChannelStatus,
    default: ChannelStatus.ACTIVE
  })
  status: ChannelStatus;

  /**
   * Channel-specific metadata
   * Can include: API base URL, documentation URL, supported features, etc.
   */
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  /**
   * Description of the channel
   */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /**
   * Display order for UI
   */
  @Column({ type: 'integer', default: 0 })
  displayOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
