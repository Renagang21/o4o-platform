import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index
} from 'typeorm';
import { User } from './User';

export type ApprovalAction = 'approved' | 'rejected' | 'status_changed' | 'pending';

@Entity('approval_logs')
@Index(['user_id', 'created_at'])
export class ApprovalLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  user_id: string;

  @Column({ type: 'uuid' })
  admin_id: string;

  @Column({
    type: 'enum',
    enum: ['approved', 'rejected', 'status_changed', 'pending']
  })
  action: ApprovalAction;

  @Column({ type: 'varchar', length: 50, nullable: true })
  previous_status: string;

  @Column({ type: 'varchar', length: 50 })
  new_status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    ip_address?: string;
    user_agent?: string;
    [key: string]: any;
  };

  @CreateDateColumn()
  created_at: Date;
  
  @Column({ type: 'timestamp', nullable: true })
  updated_at?: Date;

  // Relations
  @ManyToOne(() => User, user => user.approvalLogs)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => User, user => user.adminActions)
  @JoinColumn({ name: 'admin_id' })
  admin: User;
}