/**
 * StoreLibraryItem Entity
 *
 * WO-O4O-STORE-LIBRARY-API-INTEGRATION-V1
 *
 * 매장 자료실 항목 (Display Domain).
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

@Entity({ name: 'store_library_items' })
@Index('IDX_store_library_items_org_active', ['organizationId', 'isActive'])
export class StoreLibraryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  @Index('IDX_store_library_items_org')
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

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
