/**
 * CareMessage Entity — 환자 ↔ 약사 1:1 메시징
 * WO-O4O-CARE-QNA-SYSTEM-V1
 *
 * patient_id + pharmacy_id 로 thread scope
 * sender_type 으로 방향 구분
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity({ name: 'care_messages' })
export class CareMessage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  @Index()
  patientId!: string;

  @Column({ name: 'pharmacy_id', type: 'uuid' })
  @Index()
  pharmacyId!: string;

  @Column({ name: 'sender_type', type: 'varchar', length: 20 })
  senderType!: 'patient' | 'pharmacist';

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId!: string;

  @Column({ name: 'message_type', type: 'varchar', length: 20, default: 'text' })
  messageType!: 'text' | 'coaching_ref';

  @Column({ type: 'text' })
  content!: string;

  @Column({ name: 'coaching_id', type: 'uuid', nullable: true })
  coachingId?: string | null;

  @Column({ type: 'varchar', length: 10, default: 'sent' })
  status!: 'sent' | 'read';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt?: Date | null;
}
