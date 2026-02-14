import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'care_coaching_sessions' })
export class CareCoachingSession {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  @Index()
  patientId!: string;

  @Column({ name: 'pharmacist_id', type: 'uuid' })
  pharmacistId!: string;

  @Column({ name: 'snapshot_id', type: 'uuid', nullable: true })
  snapshotId?: string | null;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ name: 'action_plan', type: 'text' })
  actionPlan!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
