import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export interface RuleCondition {
  field: string;
  operator: string;
  value: any;
}

export interface RuleAction {
  type: string;
  parameters: any;
}

@Entity('automation_rules')
export class AutomationRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 50 })
  triggerEvent!: string;

  @Column({ type: 'json' })
  conditions!: RuleCondition[];

  @Column({ type: 'json' })
  actions!: RuleAction[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'integer', default: 0 })
  executionCount!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}