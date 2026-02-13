/**
 * CosmeticsStorePlaylistItem Entity
 *
 * WO-KCOS-STORES-PHASE4-SIGNAGE-INTEGRATION-V1
 * Schema: cosmetics (isolated from Core)
 *
 * Individual items in a store playlist.
 * Each item references a product, campaign, or image via UUID.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { CosmeticsStorePlaylist } from './cosmetics-store-playlist.entity.js';

@Entity({ name: 'cosmetics_store_playlist_items', schema: 'cosmetics' })
export class CosmeticsStorePlaylistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'playlist_id', type: 'uuid' })
  @Index()
  playlistId!: string;

  @Column({ name: 'asset_type', type: 'varchar', length: 50 })
  assetType!: string; // 'product' | 'campaign' | 'image'

  @Column({ name: 'reference_id', type: 'uuid' })
  referenceId!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Relations - Using string references for ESM compatibility
  @ManyToOne('CosmeticsStorePlaylist', 'items')
  @JoinColumn({ name: 'playlist_id' })
  playlist?: CosmeticsStorePlaylist;
}
