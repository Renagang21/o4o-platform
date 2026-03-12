import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'health_readings' })
export class HealthReading {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  @Index()
  patientId!: string;

  @Column({ name: 'metric_type', type: 'varchar', length: 50, default: 'glucose' })
  metricType!: string;

  @Column({ name: 'value_numeric', type: 'numeric', precision: 10, scale: 2, nullable: true })
  valueNumeric?: string | null;

  @Column({ name: 'value_text', type: 'text', nullable: true })
  valueText?: string | null;

  @Column({ type: 'varchar', length: 20, default: 'mg/dL' })
  unit!: string;

  @Column({ name: 'measured_at', type: 'timestamptz' })
  measuredAt!: Date;

  @Column({ name: 'source_type', type: 'varchar', length: 30, default: 'manual' })
  sourceType!: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  metadata!: Record<string, unknown>;

  @Column({ name: 'pharmacy_id', type: 'uuid', nullable: true })
  @Index()
  pharmacyId?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
