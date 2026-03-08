import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * CareAlert — WO-O4O-CARE-ALERT-ENGINE-V1
 *
 * Snapshot 생성 후 자동 평가되는 알림.
 * 약사가 Dashboard에서 확인/해결.
 */
@Entity({ name: 'care_alerts' })
export class CareAlert {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'pharmacy_id', type: 'uuid' })
  @Index()
  pharmacyId!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  @Index()
  patientId!: string;

  @Column({ name: 'alert_type', type: 'varchar', length: 30 })
  alertType!: string;

  @Column({ type: 'varchar', length: 10 })
  severity!: 'critical' | 'warning' | 'info';

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'varchar', length: 15, default: 'open' })
  status!: 'open' | 'acknowledged' | 'resolved';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;
}
