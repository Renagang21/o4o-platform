import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Store } from './Store';
import { PlaylistItem } from './PlaylistItem';

export enum PlaylistStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SCHEDULED = 'scheduled'
}

@Entity('store_playlists')
export class StorePlaylist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: PlaylistStatus,
    default: PlaylistStatus.ACTIVE
  })
  status!: PlaylistStatus;

  @Column({ default: false })
  isDefault!: boolean; // Default playlist for the store

  @Column({ default: true })
  loop!: boolean; // Whether to loop the playlist

  @Column({ type: 'int', default: 0 })
  totalDuration!: number; // Total duration in seconds

  @Column()
  storeId!: string;

  @ManyToOne(() => Store, store => store.playlists)
  @JoinColumn({ name: 'storeId' })
  store!: Store;

  @OneToMany(() => PlaylistItem, item => item.playlist, { cascade: true })
  items!: PlaylistItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Business logic methods
  isActive(): boolean {
    return this.status === PlaylistStatus.ACTIVE;
  }

  getTotalItems(): number {
    return this.items?.length || 0;
  }

  calculateTotalDuration(): number {
    if (!this.items) return 0;
    return this.items.reduce((total, item) => total + (item.duration || 0), 0);
  }
}