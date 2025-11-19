import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import type { Store } from './Store.js';
import { PlaylistItem } from './PlaylistItem.js';

export enum PlaylistStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled'
}

@Entity('store_playlists')
export class StorePlaylist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PlaylistStatus,
    default: PlaylistStatus.ACTIVE
  })
  status!: PlaylistStatus;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean; // Default playlist for the store

  @Column({ type: 'boolean', default: true })
  loop!: boolean; // Whether to loop the playlist

  @Column({ type: 'int', default: 0 })
  totalDuration!: number; // Total duration in seconds

  @Column({ type: 'varchar' })
  storeId!: string;

  @ManyToOne('Store', { lazy: true })
  @JoinColumn({ name: 'storeId' })
  store!: Promise<Store>;

  @OneToMany('PlaylistItem', 'playlist')
  items!: PlaylistItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Business logic methods
  isActive(): boolean {
    return this.status === PlaylistStatus.ACTIVE;
  }

  // Note: Business logic methods removed due to items relationship removal
  // These methods should be implemented in a service class that can query PlaylistItems
}