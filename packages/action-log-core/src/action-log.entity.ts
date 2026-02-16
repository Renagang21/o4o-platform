/**
 * ActionLog Entity
 *
 * WO-PLATFORM-ACTION-LOG-CORE-V1
 *
 * 모든 Hub Trigger 실행 이력을 기록하는 엔티티.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'action_logs' })
@Index(['service_key', 'created_at'])
@Index(['user_id', 'created_at'])
export class ActionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'service_key', type: 'varchar', length: 50 })
  @Index()
  service_key!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  user_id!: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organization_id!: string | null;

  @Column({ name: 'action_key', type: 'varchar', length: 100 })
  @Index()
  action_key!: string;

  @Column({ name: 'source', type: 'varchar', length: 20 })
  source!: string;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status!: string;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  duration_ms!: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  error_message!: string | null;

  @Column({ name: 'meta', type: 'jsonb', nullable: true })
  meta!: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at!: Date;
}
