/**
 * AI Engine Entity
 * WO-AI-ADMIN-CONTROL-PLANE-V1
 *
 * 관리자가 선택 가능한 AI 엔진 목록
 * 현재는 Gemini 3.0 Flash만 지원
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('ai_engines')
export class AiEngine {
  @PrimaryGeneratedColumn()
  id!: number;

  /** 엔진 식별자 (예: gemini-3.0-flash) */
  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  /** 엔진 표시 이름 (예: Gemini 3.0 Flash) */
  @Column({ type: 'varchar', length: 100 })
  name!: string;

  /** 엔진 설명 */
  @Column({ type: 'text', nullable: true })
  description!: string | null;

  /** 제공자 (google, openai 등) */
  @Column({ type: 'varchar', length: 50 })
  provider!: string;

  /** 현재 활성화 여부 (동시에 1개만 활성) */
  @Column({ name: 'is_active', type: 'boolean', default: false })
  isActive!: boolean;

  /** 사용 가능 여부 (비활성화해도 엔진 자체는 사용 가능) */
  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable!: boolean;

  /** 정렬 순서 */
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
