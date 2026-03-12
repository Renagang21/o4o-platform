/**
 * PatientHealthProfile — 환자 건강 프로필
 * WO-GLYCOPHARM-PATIENT-PROFILE-V1
 *
 * 환자 본인이 관리하는 당뇨 건강 데이터.
 * userId = users.id (unique, 1:1).
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type DiabetesType = 'type1' | 'type2' | 'gestational' | 'prediabetes';
export type TreatmentMethod = 'insulin' | 'oral' | 'diet' | 'combined';

@Entity({ name: 'patient_health_profiles' })
export class PatientHealthProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  @Index()
  userId!: string;

  @Column({ name: 'diabetes_type', type: 'varchar', length: 20, nullable: true })
  diabetesType?: string | null;

  @Column({ name: 'treatment_method', type: 'varchar', length: 20, nullable: true })
  treatmentMethod?: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 1, nullable: true })
  height?: string | null;

  @Column({ type: 'numeric', precision: 5, scale: 1, nullable: true })
  weight?: string | null;

  @Column({ name: 'target_hba1c', type: 'numeric', precision: 3, scale: 1, nullable: true })
  targetHbA1c?: string | null;

  @Column({ name: 'target_glucose_low', type: 'int', default: 70 })
  targetGlucoseLow!: number;

  @Column({ name: 'target_glucose_high', type: 'int', default: 180 })
  targetGlucoseHigh!: number;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
