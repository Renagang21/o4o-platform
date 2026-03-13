import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * PatientAiInsight — WO-GLUCOSEVIEW-AI-GLUCOSE-INSIGHT-V1
 *
 * 환자 전용 on-demand AI 인사이트 캐시 (1일 1회).
 * Gemini로 생성한 summary + warning + tip 저장.
 */
@Entity({ name: 'patient_ai_insights' })
export class PatientAiInsight {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'patient_id', type: 'uuid' })
  @Index()
  patientId!: string;

  @Column({ type: 'text' })
  summary!: string;

  @Column({ type: 'text', default: '' })
  warning!: string;

  @Column({ type: 'text', default: '' })
  tip!: string;

  @Column({ type: 'varchar', length: 100 })
  model!: string;

  @Column({ name: 'prompt_tokens', type: 'int', default: 0 })
  promptTokens!: number;

  @Column({ name: 'completion_tokens', type: 'int', default: 0 })
  completionTokens!: number;

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
