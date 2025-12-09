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
import { CmsMedia } from './CmsMedia.entity.js';

@Entity('cms_media_files')
export class CmsMediaFile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  mediaId!: string;

  @Column({ type: 'varchar', length: 100 })
  variant!: string; // original, thumbnail, small, medium, large, webp, etc.

  @Column({ type: 'varchar', length: 1000 })
  path!: string; // Storage path

  @Column({ type: 'varchar', length: 2000, nullable: true })
  url!: string | null; // Public URL (if available)

  @Column({ type: 'varchar', length: 100 })
  storage!: string; // local, s3, gcs, azure, cdn

  @Column({ type: 'varchar', length: 255 })
  mimeType!: string;

  @Column({ type: 'bigint', default: 0 })
  fileSize!: number;

  @Column({ type: 'int', nullable: true })
  width!: number | null;

  @Column({ type: 'int', nullable: true })
  height!: number | null;

  @Column({ type: 'int', nullable: true })
  quality!: number | null; // Compression quality

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => CmsMedia, (media) => media.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mediaId' })
  media!: CmsMedia;
}
