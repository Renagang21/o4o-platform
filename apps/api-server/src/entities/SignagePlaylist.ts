import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';

// Forward declare for type-only references
type SignagePlaylistType = SignagePlaylist;

/**
 * SignagePlaylist Entity
 * Represents a collection of slides that play in sequence
 */
@Entity('signage_playlists')
export class SignagePlaylist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ type: 'boolean', default: false })
  loop!: boolean; // Loop playlist continuously

  @OneToMany('SignagePlaylistItem', 'playlist', { cascade: true })
  items!: SignagePlaylistItem[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

/**
 * SignagePlaylistItem Entity
 * Junction table between Playlist and Slide with ordering
 */
@Entity('signage_playlist_items')
export class SignagePlaylistItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  playlistId!: string;

  @Column({ type: 'uuid' })
  slideId!: string;

  @Column({ type: 'integer' })
  order!: number; // Display order

  @Column({ type: 'integer', nullable: true })
  duration?: number; // Override slide default duration

  @ManyToOne('SignagePlaylist', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlistId' })
  playlist!: SignagePlaylist;

  @CreateDateColumn()
  createdAt!: Date;
}
