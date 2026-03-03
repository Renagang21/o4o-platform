/**
 * StoreLibraryItem Entity
 *
 * WO-O4O-STORE-LIBRARY-FOUNDATION-V1
 *
 * 매장 내부 전용 자료실 아이템.
 * Neture 연동 없음. HUB 자동 노출 없음.
 * organization_id(= store_id)로 멀티테넌트 격리.
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
export class StoreLibraryItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'store_id', type: 'uuid' })
  @Index('IDX_store_library_items_store')
  storeId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'file_url', type: 'text' })
  fileUrl!: string;

  @Column({ name: 'file_name', type: 'varchar', length: 255 })
  fileName!: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize!: string; // bigint → string in JS

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category?: string | null;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  @Index('IDX_store_library_items_created_at')
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
