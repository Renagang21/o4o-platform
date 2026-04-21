/**
 * StoreExecutionAsset Entity
 *
 * WO-KPA-STORE-ASSET-STRUCTURE-REFACTOR-V1
 *
 * 매장 실행 자산 (Execution Assets). store_library_items 에서 rename.
 * usage_type: 자산의 사용 목적 (pop | qr | signage | banner | notice)
 * Commerce Object가 아니며, Checkout/EcommerceOrder와 연결 금지.
 * organization_id로 멀티테넌트 격리.
 * Neture FK 금지 — 프리필은 클라이언트 측에서만 처리.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'store_execution_assets' })
@Index('IDX_store_execution_assets_org_active', ['organizationId', 'isActive'])
export class StoreExecutionAsset {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index('IDX_store_execution_assets_org')
  organizationId!: string;

  @Column({ type: 'varchar', length: 300 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'file_url', type: 'varchar', length: 1000, nullable: true })
  fileUrl?: string | null;

  @Column({ name: 'file_name', type: 'varchar', length: 500, nullable: true })
  fileName?: string | null;

  @Column({ name: 'file_size', type: 'int', nullable: true })
  fileSize?: number | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 200, nullable: true })
  mimeType?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string | null;

  @Column({ name: 'asset_type', type: 'varchar', length: 50, default: 'file' })
  assetType!: string;

  @Column({ name: 'usage_type', type: 'varchar', length: 20, nullable: true })
  usageType?: string | null;

  @Column({ name: 'url', type: 'varchar', length: 1000, nullable: true })
  url?: string | null;

  @Column({ name: 'html_content', type: 'text', nullable: true })
  htmlContent?: string | null;

  @Column({ name: 'source_type', type: 'varchar', length: 50, default: 'uploaded' })
  sourceType!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
