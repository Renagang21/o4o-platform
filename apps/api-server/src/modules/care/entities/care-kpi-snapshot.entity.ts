import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'care_kpi_snapshots' })
export class CareKpiSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  @Index()
  patientId!: string;

  @Column({ type: 'int' })
  tir!: number;

  @Column({ type: 'int' })
  cv!: number;

  @Column({ name: 'risk_level', type: 'varchar', length: 20 })
  riskLevel!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
