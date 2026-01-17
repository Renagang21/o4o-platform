import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import type { SignagePlaylist } from './SignagePlaylist.entity.js';

/**
 * SignagePlaylistShare Entity
 *
 * Tracks playlist sharing between organizations.
 * - Share permissions and status
 * - Sharing statistics
 * - Cross-organization content distribution
 */
@Entity('signage_playlist_shares')
@Index(['serviceKey'])
@Index(['playlistId'])
@Index(['sharedWithOrganizationId'])
@Index(['status'])
@Unique(['playlistId', 'sharedWithOrganizationId'])
export class SignagePlaylistShare {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ========== Scope ==========
  @Column({ type: 'varchar', length: 50 })
  @Index()
  serviceKey!: string;

  // ========== Sharing Info ==========
  @Column({ type: 'uuid' })
  @Index()
  playlistId!: string;

  @Column({ type: 'uuid' })
  @Index()
  sharedByOrganizationId!: string;

  @Column({ type: 'uuid' })
  @Index()
  sharedWithOrganizationId!: string;

  @Column({ type: 'uuid', nullable: true })
  sharedByUserId!: string | null;

  // ========== Share Status ==========
  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending',
  })
  status!: 'pending' | 'accepted' | 'rejected' | 'revoked';

  // ========== Permissions ==========
  @Column({ type: 'boolean', default: false })
  canEdit!: boolean;

  @Column({ type: 'boolean', default: true })
  canUse!: boolean;

  @Column({ type: 'boolean', default: false })
  canReshare!: boolean;

  // ========== Timestamps ==========
  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  // ========== Metadata ==========
  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  // ========== Relations (string-based for ESM) ==========
  @ManyToOne('SignagePlaylist', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'playlistId' })
  playlist!: SignagePlaylist;
}
