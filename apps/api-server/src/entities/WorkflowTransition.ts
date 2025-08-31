import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { WorkflowState } from './WorkflowState';

export enum TransitionTrigger {
  MANUAL = 'manual',
  AUTOMATIC = 'automatic',
  CONDITIONAL = 'conditional',
  TIMER = 'timer',
  EVENT = 'event'
}

@Entity('workflow_transitions')
export class WorkflowTransition {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  displayName?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 100 })
  workflowName: string;

  // Source state
  @ManyToOne(() => WorkflowState, state => state.outgoingTransitions, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'from_state_id' })
  fromState: WorkflowState;

  @Column({ name: 'from_state_id' })
  fromStateId: string;

  // Target state
  @ManyToOne(() => WorkflowState, state => state.incomingTransitions, {
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'to_state_id' })
  toState: WorkflowState;

  @Column({ name: 'to_state_id' })
  toStateId: string;

  @Column({ 
    type: 'enum', 
    enum: TransitionTrigger,
    default: TransitionTrigger.MANUAL
  })
  trigger: TransitionTrigger;

  @Column({ type: 'json', nullable: true })
  conditions?: any;

  @Column({ type: 'json', nullable: true })
  actions?: any;

  @Column({ type: 'json', nullable: true })
  metadata?: any;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  requiredRole?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  requiredPermission?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  entityType?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entityId?: string;

  @Column({ type: 'timestamp', nullable: true })
  transitionedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}