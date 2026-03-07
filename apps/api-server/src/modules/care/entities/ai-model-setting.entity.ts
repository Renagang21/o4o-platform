import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

/**
 * AiModelSetting — WO-O4O-CARE-LLM-INSIGHT-V1
 *
 * 서비스별 LLM 모델 설정 (model, temperature, max_tokens).
 * 관리자가 모델을 변경할 수 있도록 DB 기반 설정.
 */
@Entity({ name: 'ai_model_settings' })
export class AiModelSetting {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  service!: string;

  @Column({ type: 'varchar', length: 100, default: 'gemini-2.0-flash' })
  model!: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0.3 })
  temperature!: number;

  @Column({ name: 'max_tokens', type: 'int', default: 2048 })
  maxTokens!: number;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
