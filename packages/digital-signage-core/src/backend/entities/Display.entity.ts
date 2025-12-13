import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { DisplaySlot } from './DisplaySlot.entity.js';

/**
 * Display Entity
 *
 * Represents a display device/screen.
 * Core structure only - no business-specific fields.
 */
@Entity('signage_display')
export class Display {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'uuid', nullable: true })
  ownerUserId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  deviceCode!: string | null;

  @Column({ type: 'varchar', length: 100, default: 'offline' })
  status!: string; // online, offline, error

  @Column({ type: 'int', nullable: true })
  widthPx!: number | null;

  @Column({ type: 'int', nullable: true })
  heightPx!: number | null;

  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeat!: Date | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @OneToMany(() => DisplaySlot, (slot) => slot.display)
  slots!: DisplaySlot[];
}
