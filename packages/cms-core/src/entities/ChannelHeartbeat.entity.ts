import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * ChannelHeartbeat Entity
 * WO-P5-CHANNEL-HEARTBEAT-P1
 *
 * Records heartbeat signals from signage players to track device health.
 * "그 채널/디바이스가 실제로 살아있는가"를 판단하는 데이터.
 */
@Entity('channel_heartbeats')
@Index(['channelId', 'receivedAt'])
@Index(['serviceKey', 'organizationId'])
export class ChannelHeartbeat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  channelId!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  serviceKey!: string | null;

  @Column({ type: 'uuid', nullable: true })
  organizationId!: string | null;

  // === Player Runtime Info ===

  @Column({ type: 'varchar', length: 50, nullable: true })
  playerVersion!: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  deviceType!: string | null; // 'web', 'tv', 'kiosk'

  @Column({ type: 'varchar', length: 50, nullable: true })
  platform!: string | null; // 'chrome', 'tizen', 'android', 'webos', etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  ipAddress!: string | null;

  // === Health Info ===

  @Column({ type: 'boolean', default: true })
  isOnline!: boolean;

  @Column({ type: 'int', nullable: true })
  uptimeSec!: number | null;

  @Column({ type: 'jsonb', default: '{}' })
  metrics!: Record<string, unknown>;
  // 예: { memoryMb: 312, cpu: 0.15, freeStorageMb: 1024 }

  // === Timestamp ===

  @CreateDateColumn()
  receivedAt!: Date;
}
