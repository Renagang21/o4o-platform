/**
 * NetureSupplierLibrary — 공급자 자료실
 *
 * WO-O4O-NETURE-LIBRARY-RENAMING-V1
 *
 * 공급자가 파트너/판매자에게 제공하는 참고 자료 (이미지, 설명, 배너, 가이드).
 * 자동 적용·강제 배포 없음. HUB 연동 없음.
 *
 * DB 테이블명: neture_supplier_contents (변경 금지)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import type { NetureSupplier } from './NetureSupplier.entity.js';

/**
 * 자료 유형
 */
export enum LibraryItemType {
  DESCRIPTION = 'description',
  IMAGE = 'image',
  BANNER = 'banner',
  GUIDE = 'guide',
}

/**
 * 자료 상태
 */
export enum LibraryItemStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

// Backward-compatible aliases
export const ContentType = LibraryItemType;
export type ContentType = LibraryItemType;
export const ContentStatus = LibraryItemStatus;
export type ContentStatus = LibraryItemStatus;

@Entity('neture_supplier_contents')
export class NetureSupplierLibrary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'supplier_id' })
  supplierId: string;

  @Column({
    type: 'enum',
    enum: LibraryItemType,
    default: LibraryItemType.DESCRIPTION,
  })
  type: LibraryItemType;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string;

  @Column({
    type: 'enum',
    enum: LibraryItemStatus,
    default: LibraryItemStatus.DRAFT,
  })
  status: LibraryItemStatus;

  @Column({ name: 'available_services', type: 'simple-array', nullable: true })
  availableServices: string[];

  @Column({ name: 'available_areas', type: 'simple-array', nullable: true })
  availableAreas: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date;

  @ManyToOne('NetureSupplier', {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'supplier_id' })
  supplier: NetureSupplier;
}

// Backward-compatible class alias
export const NetureSupplierContent = NetureSupplierLibrary;
export type NetureSupplierContent = NetureSupplierLibrary;
