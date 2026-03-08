import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * CareCoachingDraft — WO-O4O-CARE-AI-COACHING-DRAFT-V1
 *
 * AI가 생성한 코칭 초안. 약사가 검토 후 승인/폐기.
 * 승인 시 care_coaching_sessions에 실제 세션 생성.
 */
@Entity({ name: 'care_coaching_drafts' })
export class CareCoachingDraft {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  @Index()
  patientId!: string;

  @Column({ name: 'snapshot_id', type: 'uuid' })
  snapshotId!: string;

  @Column({ name: 'pharmacy_id', type: 'uuid' })
  @Index()
  pharmacyId!: string;

  @Column({ name: 'draft_message', type: 'text' })
  draftMessage!: string;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  status!: 'draft' | 'approved' | 'discarded';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
