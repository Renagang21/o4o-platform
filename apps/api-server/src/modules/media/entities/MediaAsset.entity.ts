/**
 * MediaAsset Entity — WO-O4O-COMMON-MEDIA-LIBRARY-FOUNDATION-V1
 *
 * O4O 플랫폼 공용 미디어 라이브러리 자산.
 * 동의된 파일만 등록, 서비스 무관 공용 재사용 가능.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'media_assets' })
@Index('IDX_media_assets_uploaded_by', ['uploadedBy'])
@Index('IDX_media_assets_asset_type', ['assetType'])
@Index('IDX_media_assets_service_key', ['serviceKey'])
@Index('IDX_media_assets_folder', ['folder'])
export class MediaAsset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  url!: string;

  @Column({ name: 'gcs_path', type: 'text' })
  gcsPath!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 500 })
  fileName!: string;

  @Column({ name: 'original_name', type: 'varchar', length: 500 })
  originalName!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 255 })
  mimeType!: string;

  @Column({ name: 'file_size', type: 'bigint', default: 0 })
  fileSize!: number;

  @Column({ name: 'asset_type', type: 'varchar', length: 50, default: 'image' })
  assetType!: string;

  @Column({ type: 'int', nullable: true })
  width!: number | null;

  @Column({ type: 'int', nullable: true })
  height!: number | null;

  @Column({ type: 'varchar', length: 50, default: 'general' })
  folder!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 100, nullable: true })
  serviceKey!: string | null;

  @Column({ name: 'uploaded_by', type: 'uuid', nullable: true })
  uploadedBy!: string | null;

  @Column({ name: 'is_library_public', type: 'boolean', default: true })
  isLibraryPublic!: boolean;

  @Column({ name: 'consented_at', type: 'timestamptz' })
  consentedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
