import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * ActionExecution Status
 */
export enum ActionExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * Execute Mode
 */
export enum ExecuteMode {
  IMMEDIATE = 'immediate', // Only execute if slot is empty
  REPLACE = 'replace',     // Force stop existing and execute
  REJECT = 'reject',       // Reject if slot is occupied
}

/**
 * ActionExecution Entity
 *
 * Represents an execution record for signage actions.
 * Phase 4.5: Added execute/stop/pause/resume support.
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
  mediaListId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  scheduleId!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sourceAppId!: string | null; // Which app requested the action

  @Column({ type: 'varchar', length: 100, default: ActionExecutionStatus.PENDING })
  @Index()
  status!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  executeMode!: string | null; // immediate, replace, reject

  @Column({ type: 'int', nullable: true })
  duration!: number | null; // Planned duration in seconds

  @Column({ type: 'timestamp', nullable: true })
  executedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  pausedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  stoppedBy!: string | null; // Who stopped the action (appId or userId)

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
