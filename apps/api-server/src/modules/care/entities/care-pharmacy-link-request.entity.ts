/**
 * CarePharmacyLinkRequest Entity
 * WO-GLYCOPHARM-PATIENT-PHARMACY-LINK-FLOW-V1
 *
 * 환자 → 약국 연결 요청.
 * 승인 시 glucoseview_customers 레코드 생성.
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'care_pharmacy_link_requests' })
export class CarePharmacyLinkRequest {
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

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: string;

  @Column({ type: 'text', nullable: true })
  message?: string | null;

  @Column({ name: 'reject_reason', type: 'text', nullable: true })
  rejectReason?: string | null;

  @Column({ name: 'handled_by', type: 'uuid', nullable: true })
  handledBy?: string | null;

  @Column({ name: 'handled_at', type: 'timestamptz', nullable: true })
  handledAt?: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
