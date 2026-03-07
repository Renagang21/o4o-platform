import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * CareLlmInsight — WO-O4O-CARE-LLM-INSIGHT-V1
 *
 * LLM이 생성한 pharmacyInsight + patientMessage 캐시.
 * snapshot_id 기준 1:1 관계 (관계 데코레이터 없이 UUID 컬럼만 사용).
 */
@Entity({ name: 'care_llm_insights' })
export class CareLlmInsight {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'snapshot_id', type: 'uuid' })
  @Index()
  snapshotId!: string;

  @Column({ name: 'pharmacy_id', type: 'uuid' })
  pharmacyId!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  @Index()
  patientId!: string;

  @Column({ name: 'pharmacy_insight', type: 'text' })
  pharmacyInsight!: string;

  @Column({ name: 'patient_message', type: 'text' })
  patientMessage!: string;

  @Column({ type: 'varchar', length: 100 })
  model!: string;

  @Column({ name: 'prompt_tokens', type: 'int', default: 0 })
  promptTokens!: number;

  @Column({ name: 'completion_tokens', type: 'int', default: 0 })
  completionTokens!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
