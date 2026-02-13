/**
 * CosmeticsStorePlaylist Entity
 *
 * WO-KCOS-STORES-PHASE4-SIGNAGE-INTEGRATION-V1
 * Schema: cosmetics (isolated from Core)
 *
 * Store-level signage playlists — lightweight product/campaign references
 * for digital signage displays at each store.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import type { CosmeticsStore } from './cosmetics-store.entity.js';
import type { CosmeticsStorePlaylistItem } from './cosmetics-store-playlist-item.entity.js';

@Entity({ name: 'cosmetics_store_playlists', schema: 'cosmetics' })
export class CosmeticsStorePlaylist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'store_id', type: 'uuid' })
  @Index()
  storeId!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  // Relations - Using string references for ESM compatibility
  @ManyToOne('CosmeticsStore', 'playlists')
  @JoinColumn({ name: 'store_id' })
  store?: CosmeticsStore;

  @OneToMany('CosmeticsStorePlaylistItem', 'playlist')
  items?: CosmeticsStorePlaylistItem[];
}
