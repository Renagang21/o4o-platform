import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Schedule Entity
 *
 * Represents a schedule for media playback.
 * Core structure only - no business-specific fields.
 */
@Entity('signage_schedule')
export class Schedule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'uuid', nullable: true })
  ownerUserId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  displaySlotId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  mediaListId!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  startTime!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  endTime!: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  recurrenceRule!: string | null; // cron expression or similar

  @Column({ type: 'int', default: 0 })
  priority!: number;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
