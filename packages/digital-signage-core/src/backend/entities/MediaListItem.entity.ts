import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { MediaList } from './MediaList.entity.js';
import { MediaSource } from './MediaSource.entity.js';

/**
 * MediaListItem Entity
 *
 * Represents an item within a media list.
 * Core structure only - no business-specific fields.
 */
@Entity('signage_media_list_item')
export class MediaListItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  mediaListId!: string;

  @Column({ type: 'uuid' })
  @Index()
  mediaSourceId!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;

  @Column({ type: 'int', nullable: true })
  displayDurationSeconds!: number | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => MediaList, (list) => list.items)
  @JoinColumn({ name: 'mediaListId' })
  mediaList!: MediaList;

  @ManyToOne(() => MediaSource)
  @JoinColumn({ name: 'mediaSourceId' })
  mediaSource!: MediaSource;
}
