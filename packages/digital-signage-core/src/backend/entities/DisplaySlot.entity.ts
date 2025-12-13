import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Display } from './Display.entity.js';

/**
 * DisplaySlot Entity
 *
 * Represents a slot/zone on a display.
 * Core structure only - no business-specific fields.
 */
@Entity('signage_display_slot')
export class DisplaySlot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  displayId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  positionX!: number;

  @Column({ type: 'int', default: 0 })
  positionY!: number;

  @Column({ type: 'int', nullable: true })
  widthPx!: number | null;

  @Column({ type: 'int', nullable: true })
  heightPx!: number | null;

  @Column({ type: 'int', default: 0 })
  zIndex!: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Display, (display) => display.slots)
  @JoinColumn({ name: 'displayId' })
  display!: Display;
}
