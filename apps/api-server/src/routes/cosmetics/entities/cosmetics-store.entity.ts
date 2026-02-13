/**
 * CosmeticsStore Entity
 *
 * WO-KCOS-STORES-PHASE1-V1: K-Cosmetics Store Core
 * Schema: cosmetics (isolated from Core)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { CosmeticsStoreMember } from './cosmetics-store-member.entity.js';
import type { CosmeticsStoreListing } from './cosmetics-store-listing.entity.js';
import type { CosmeticsStorePlaylist } from './cosmetics-store-playlist.entity.js';

export enum CosmeticsStoreStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended',
}

@Entity({ name: 'cosmetics_stores', schema: 'cosmetics' })
export class CosmeticsStore {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  code!: string;

  @Column({ name: 'business_number', type: 'varchar', length: 100, unique: true })
  @Index()
  businessNumber!: string;

  @Column({ name: 'owner_name', type: 'varchar', length: 200 })
  ownerName!: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 50, nullable: true })
  contactPhone?: string | null;

  @Column({ type: 'text', nullable: true })
  address?: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  region?: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: CosmeticsStoreStatus.DRAFT,
  })
  @Index()
  status!: CosmeticsStoreStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations - Using string references for ESM compatibility
  @OneToMany('CosmeticsStoreMember', 'store')
  members?: CosmeticsStoreMember[];

  @OneToMany('CosmeticsStoreListing', 'store')
  listings?: CosmeticsStoreListing[];

  @OneToMany('CosmeticsStorePlaylist', 'store')
  playlists?: CosmeticsStorePlaylist[];
}
