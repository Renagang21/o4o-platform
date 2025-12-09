import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { CmsMediaFile } from './CmsMediaFile.entity.js';

@Entity('cms_media')
export class CmsMedia {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  folderId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  uploadedBy!: string | null; // User ID

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  altText!: string | null;

  @Column({ type: 'text', nullable: true })
  caption!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 100 })
  type!: string; // image, video, audio, document, archive, other

  @Column({ type: 'varchar', length: 255 })
  mimeType!: string;

  @Column({ type: 'varchar', length: 500 })
  originalFilename!: string;

  @Column({ type: 'bigint', default: 0 })
  fileSize!: number; // In bytes

  @Column({ type: 'int', nullable: true })
  width!: number | null; // For images/videos

  @Column({ type: 'int', nullable: true })
  height!: number | null;

  @Column({ type: 'int', nullable: true })
  duration!: number | null; // For audio/video in seconds

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>; // EXIF, codec info, etc.

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => CmsMediaFile, (file) => file.media)
  files!: CmsMediaFile[];
}
