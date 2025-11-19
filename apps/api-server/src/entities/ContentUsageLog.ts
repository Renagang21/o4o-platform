import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import type { Store } from './Store.js';
import { SignageContent } from './SignageContent.js';
import { StorePlaylist } from './StorePlaylist.js';

export enum LogEventType {
  PLAY_START = 'play_start',
  PLAY_END = 'play_end',
  PLAY_PAUSE = 'play_pause',
  PLAY_RESUME = 'play_resume',
  PLAY_SKIP = 'play_skip',
  SCHEDULE_CHANGE = 'schedule_change',
  PLAYLIST_CHANGE = 'playlist_change'
}

@Entity('content_usage_logs')
export class ContentUsageLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: LogEventType
  })
  eventType!: LogEventType;

  @Column({ type: 'timestamp' })
  timestamp!: Date;

  @Column({ type: 'int', nullable: true })
  duration?: number; // Duration in seconds (for play events)

  @Column({ type: 'json', nullable: true })
  metadata?: {
    userAgent?: string;
    resolution?: string;
    volume?: number;
    position?: number; // Playback position when event occurred
    templateId?: string;
    zoneId?: string;
  };

  @Column({ type: 'varchar' })
  storeId!: string;

  @ManyToOne('Store')
  @JoinColumn({ name: 'storeId' })
  store!: Store;

  @Column({ type: 'varchar', nullable: true })
  contentId?: string;

  @ManyToOne('SignageContent', { nullable: true })
  @JoinColumn({ name: 'contentId' })
  content?: SignageContent;

  @Column({ type: 'varchar', nullable: true })
  playlistId?: string;

  @ManyToOne('StorePlaylist', { nullable: true })
  @JoinColumn({ name: 'playlistId' })
  playlist?: StorePlaylist;

  @CreateDateColumn()
  createdAt!: Date;

  // Static helper methods for creating logs
  static createPlayLog(
    storeId: string,
    contentId: string,
    playlistId: string,
    eventType: LogEventType,
    duration?: number,
    metadata?: {
      userAgent?: string;
      resolution?: string;
      volume?: number;
      position?: number;
      templateId?: string;
      zoneId?: string;
    }
  ): Partial<ContentUsageLog> {
    return {
      storeId,
      contentId,
      playlistId,
      eventType,
      duration,
      metadata,
      timestamp: new Date()
    };
  }

  static createScheduleLog(
    storeId: string,
    eventType: LogEventType,
    metadata?: Record<string, unknown>
  ): Partial<ContentUsageLog> {
    return {
      storeId,
      eventType,
      metadata,
      timestamp: new Date()
    };
  }
}