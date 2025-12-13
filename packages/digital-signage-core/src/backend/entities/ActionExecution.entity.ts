import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ActionExecution Entity
 *
 * Represents an execution log for signage actions.
 * Core structure only - no business-specific fields.
 */
@Entity('signage_action_execution')
export class ActionExecution {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  organizationId!: string;

  @Column({ type: 'uuid', nullable: true })
  ownerUserId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  actionType!: string; // play, stop, switch, etc.

  @Column({ type: 'uuid', nullable: true })
  @Index()
  displayId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  displaySlotId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  scheduleId!: string | null;

  @Column({ type: 'varchar', length: 100, default: 'pending' })
  status!: string; // pending, running, completed, failed

  @Column({ type: 'timestamp', nullable: true })
  executedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
