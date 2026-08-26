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
 *
 * WO-O4O-CHANNELS-TYPEORM-ENTITY-REGISTRATION-AND-RUNTIME-CLOSURE-V1:
 *   이 table 은 migration(1736700000000-CreateChannelPlaybackLog)이 snake_case 컬럼으로
 *   생성했는데, entity 는 camelCase property 만 선언하고 있었고 AppDataSource 에는
 *   namingStrategy 가 없다(connection.ts 에서 SnakeNamingStrategy 는 주석 처리됨).
 *   그래서 이 entity 를 등록하는 순간 "column channelId does not exist" 로 실패한다.
 *   기존 production table 의 schema 는 바꾸지 않고(=DDL/migration 0), entity 쪽에
 *   실제 컬럼명을 명시적으로 mapping 해서 정합을 맞춘다.
 *   즉 아래 name: 값은 production 실제 컬럼명이며 임의로 바꾸면 안 된다.
 */
@Entity('channel_playback_logs')
@Index(['channelId', 'playedAt'])
@Index(['contentId'])
@Index(['serviceKey', 'organizationId'])
export class ChannelPlaybackLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // === Context ===

  @Column({ name: 'channel_id', type: 'uuid' })
  channelId!: string;

  @Column({ name: 'content_id', type: 'uuid' })
  contentId!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50, nullable: true })
  serviceKey!: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId!: string | null;

  // === Playback Info ===

  @Column({ name: 'played_at', type: 'timestamp' })
  playedAt!: Date;

  @Column({ name: 'duration_sec', type: 'int' })
  durationSec!: number;

  @Column({ type: 'boolean', default: true })
  completed!: boolean;

  // === Source ===

  @Column({ type: 'varchar', length: 30 })
  source!: string; // 'signage-web' | future sources

  // === Audit ===

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
