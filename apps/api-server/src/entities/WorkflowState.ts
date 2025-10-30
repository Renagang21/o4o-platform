import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { WorkflowTransition } from './WorkflowTransition.js';

export enum WorkflowStateType {
  START = 'start',
  INTERMEDIATE = 'intermediate',
  END = 'end',
  DECISION = 'decision'
}

@Entity('workflow_states')
export class WorkflowState {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ 
    type: 'enum', 
    enum: WorkflowStateType,
    default: WorkflowStateType.INTERMEDIATE
  })
  type: WorkflowStateType;

  @Column({ type: 'varchar', length: 100 })
  workflowName: string;

  @Column({ type: 'json', nullable: true })
  metadata?: any;

  @Column({ type: 'json', nullable: true })
  conditions?: any;

  @Column({ type: 'json', nullable: true })
  actions?: any;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  // Relations
  @OneToMany('WorkflowTransition', 'fromState')
  outgoingTransitions!: WorkflowTransition[];

  @OneToMany('WorkflowTransition', 'toState')
  incomingTransitions!: WorkflowTransition[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}