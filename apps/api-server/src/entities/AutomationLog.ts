import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AutomationRule } from './AutomationRule';

@Entity('automation_logs')
export class AutomationLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  ruleId!: string;

  @Column({ length: 50 })
  status!: string; // 'success', 'failed', 'partial'

  @Column({ type: 'text', nullable: true })
  executionDetails?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ type: 'json', nullable: true })
  inputData?: any;

  @Column({ type: 'json', nullable: true })
  outputData?: any;

  @Column({ type: 'integer', nullable: true })
  executionTimeMs?: number;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => AutomationRule)
  @JoinColumn({ name: 'ruleId' })
  rule!: AutomationRule;
}