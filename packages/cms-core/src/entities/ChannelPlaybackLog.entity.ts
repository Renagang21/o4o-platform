import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * ChannelPlaybackLog Entity
 * WO-P5-CHANNEL-PLAYBACK-LOG-P0
 *
 * Records actual playback events from signage players.
 * "무엇이, 언제, 어디서, 얼마나 노출되었는가"를 증명 가능한 데이터로 남긴다.
 */
@Entity('channel_playback_logs')
@Index(['channelId', 'playedAt'])
@Index(['contentId'])
@Index(['serviceKey', 'organizationId'])
export class ChannelPlaybackLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // === Context ===

  @Column({ type: 'uuid' })
  channelId!: string;

  @Column({ type: 'uuid' })
  contentId!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  serviceKey!: string | null;

  @Column({ type: 'uuid', nullable: true })
  organizationId!: string | null;

  // === Playback Info ===

  @Column({ type: 'timestamp' })
  playedAt!: Date;

  @Column({ type: 'int' })
  durationSec!: number;

  @Column({ type: 'boolean', default: true })
  completed!: boolean;

  // === Source ===

  @Column({ type: 'varchar', length: 30 })
  source!: string; // 'signage-web' | future sources

  // === Audit ===

  @CreateDateColumn()
  createdAt!: Date;
}
