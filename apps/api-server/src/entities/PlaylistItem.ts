import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { StorePlaylist } from './StorePlaylist.js';
import { SignageContent } from './SignageContent.js';

export enum ItemType {
  VIDEO = 'video',
  IMAGE = 'image'
}

@Entity('playlist_items')
export class PlaylistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: ItemType,
    default: ItemType.VIDEO
  })
  type!: ItemType;

  @Column({ type: 'int' })
  order!: number; // Display order in playlist

  @Column({ type: 'int', nullable: true })
  duration?: number; // Duration in seconds (for images)

  @Column({ type: 'json', nullable: true })
  customSettings?: {
    volume?: number;
    autoplay?: boolean;
    startTime?: number;
    endTime?: number;
  };

  @Column()
  playlistId!: string;

  @ManyToOne('StorePlaylist', { onDelete: 'CASCADE', lazy: true })
  @JoinColumn({ name: 'playlistId' })
  playlist!: Promise<StorePlaylist>;

  @Column({ nullable: true })
  contentId?: string; // For video content

  @ManyToOne('SignageContent', { nullable: true })
  @JoinColumn({ name: 'contentId' })
  content?: SignageContent;

  @Column({ nullable: true })
  imageUrl?: string; // For image content

  @Column({ nullable: true })
  title?: string; // Custom title override

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Business logic methods
  isVideo(): boolean {
    return this.type === ItemType.VIDEO && !!this.contentId;
  }

  isImage(): boolean {
    return this.type === ItemType.IMAGE && !!this.imageUrl;
  }

  getDisplayDuration(): number {
    if (this.isVideo() && this.content) {
      const startTime = this.customSettings?.startTime || 0;
      const endTime = this.customSettings?.endTime || this.content.duration || 0;
      return endTime - startTime;
    }
    return this.duration || 30; // Default 30 seconds for images
  }
}