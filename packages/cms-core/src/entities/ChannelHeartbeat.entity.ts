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
 *
 * WO-O4O-CHANNELS-TYPEORM-ENTITY-REGISTRATION-AND-RUNTIME-CLOSURE-V1:
 *   migration(1736710000000-CreateChannelHeartbeat)이 snake_case 컬럼으로 table 을
 *   만들었으나 entity 는 camelCase property 만 선언하고 있었다(naming strategy 없음).
 *   production table schema 는 그대로 두고 entity 쪽에 실제 컬럼명을 명시 mapping 한다.
 *   아래 name: 값은 production 실제 컬럼명이다.
 */
@Entity('channel_heartbeats')
@Index(['channelId', 'receivedAt'])
@Index(['serviceKey', 'organizationId'])
export class ChannelHeartbeat {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'channel_id', type: 'uuid' })
  channelId!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50, nullable: true })
  serviceKey!: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId!: string | null;

  // === Player Runtime Info ===

  @Column({ name: 'player_version', type: 'varchar', length: 50, nullable: true })
  playerVersion!: string | null;

  @Column({ name: 'device_type', type: 'varchar', length: 50, nullable: true })
  deviceType!: string | null; // 'web', 'tv', 'kiosk'

  @Column({ type: 'varchar', length: 50, nullable: true })
  platform!: string | null; // 'chrome', 'tizen', 'android', 'webos', etc.

  @Column({ name: 'ip_address', type: 'varchar', length: 100, nullable: true })
  ipAddress!: string | null;

  // === Health Info ===

  @Column({ name: 'is_online', type: 'boolean', default: true })
  isOnline!: boolean;

  @Column({ name: 'uptime_sec', type: 'int', nullable: true })
  uptimeSec!: number | null;

  @Column({ type: 'jsonb', default: '{}' })
  metrics!: Record<string, unknown>;
  // 예: { memoryMb: 312, cpu: 0.15, freeStorageMb: 1024 }

  // === Timestamp ===

  @CreateDateColumn({ name: 'received_at' })
  receivedAt!: Date;
}
