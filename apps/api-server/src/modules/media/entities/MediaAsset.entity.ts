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

  // ─── Content Resource Metadata (WO-O4O-CONTENT-RESOURCE-METADATA-STANDARDIZATION-V1) ───
  //   서술적 메타데이터. 전부 nullable·additive. url/gcs_path/file_name/original_name(파일 속성)과 분리된
  //   Resource 속성이며, 파일 재업로드 없이 metadata PATCH 로만 수정된다. backfill 없음.

  /** 사용자 지정 표시 이름(예: 비타민C_상품대표이미지_2026). original_name(원본 파일명)과 별개. */
  @Column({ type: 'varchar', length: 300, nullable: true })
  title!: string | null;

  /** 검색·AI 추천용 설명 (Plain Text, HTML 미사용). */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** 태그 (jsonb string[]) — store 계열 tags 규약과 정렬. */
  @Column({ type: 'jsonb', nullable: true })
  tags!: string[] | null;

  /** 키워드 (사용자 직접 입력, 자동 생성 안 함). */
  @Column({ type: 'jsonb', nullable: true })
  keywords!: string[] | null;

  /** 언어 태그 (ko/en/ja/zh/vi/th/id …). 다국어 체인 아님. */
  @Column({ type: 'varchar', length: 10, nullable: true })
  language!: string | null;

  /** 생성 출처 유형 (operator/supplier/store/ai/external/import). service_key(스코프)와 별개. */
  @Column({ type: 'varchar', length: 50, nullable: true })
  source!: string | null;

  /** 용도 분류 (asset_type=파일종류와 별개). */
  @Column({ name: 'usage_type', type: 'varchar', length: 50, nullable: true })
  usageType!: string | null;

  /** 상태 (draft/active/archived 등 서비스 정의). */
  @Column({ type: 'varchar', length: 50, nullable: true })
  status!: string | null;

  /** 내부 메모. */
  @Column({ type: 'text', nullable: true })
  memo!: string | null;

  /** 메타데이터 최종 수정자 (uploaded_by=최초 등록자와 별개). */
  @Column({ name: 'updated_by', type: 'uuid', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
