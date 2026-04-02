/**
 * CareAppointment entity
 * WO-GLYCOPHARM-APPOINTMENT-SYSTEM-V1
 *
 * 환자-약사 상담 예약.
 * Status: requested → confirmed/rejected → completed/cancelled
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'care_appointments' })
export class CareAppointment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  @Index()
  patientId!: string;

  @Column({ name: 'patient_email', type: 'varchar', length: 255 })
  patientEmail!: string;

  @Column({ name: 'patient_name', type: 'varchar', length: 100 })
  patientName!: string;

  @Column({ name: 'pharmacy_id', type: 'uuid' })
  @Index()
  pharmacyId!: string;

  @Column({ name: 'pharmacy_name', type: 'varchar', length: 200 })
  pharmacyName!: string;

  @Column({ name: 'pharmacist_id', type: 'uuid', nullable: true })
  pharmacistId?: string | null;

  @Column({ name: 'scheduled_at', type: 'timestamptz' })
  @Index()
  scheduledAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'requested' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason?: string | null;

  // WO-O4O-CARE-CONSULTATION-RESULT-SHARING-V1
  @Column({ name: 'consultation_summary', type: 'text', nullable: true })
  consultationSummary?: string | null;

  @Column({ name: 'consultation_recommendation', type: 'text', nullable: true })
  consultationRecommendation?: string | null;

  @Column({ name: 'consultation_shared_at', type: 'timestamptz', nullable: true })
  consultationSharedAt?: Date | null;

  @Column({ name: 'consultation_recorded_by', type: 'uuid', nullable: true })
  consultationRecordedBy?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
