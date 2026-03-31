import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * CareAction — WO-O4O-CARE-ACTION-ENGINE-V2.2
 *
 * 시간 기반 분석에서 생성된 Action의 생명주기를 추적한다.
 * status: suggested → in_progress → completed | dismissed | expired
 */
@Entity({ name: 'care_actions' })
@Index('idx_care_actions_dedup', ['patientId', 'actionType', 'sourceType', 'sourceKey'])
export class CareAction {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  @Index()
  patientId!: string;

  @Column({ name: 'pharmacy_id', type: 'uuid' })
  @Index()
  pharmacyId!: string;

  @Column({ name: 'action_type', type: 'varchar', length: 30 })
  actionType!: string;

  @Column({ name: 'source_type', type: 'varchar', length: 30 })
  sourceType!: string;

  @Column({ name: 'source_key', type: 'varchar', length: 100 })
  sourceKey!: string;

  @Column({ type: 'varchar', length: 10 })
  priority!: 'HIGH' | 'MEDIUM' | 'LOW';

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 15, default: 'suggested' })
  status!: 'suggested' | 'in_progress' | 'completed' | 'dismissed' | 'expired';

  @Column({ name: 'created_by_system', type: 'boolean', default: true })
  createdBySystem!: boolean;

  @Column({ name: 'acted_by', type: 'uuid', nullable: true })
  actedBy!: string | null;

  @Column({ name: 'acted_at', type: 'timestamptz', nullable: true })
  actedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'dismissed_at', type: 'timestamptz', nullable: true })
  dismissedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
