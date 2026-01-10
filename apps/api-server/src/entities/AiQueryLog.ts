/**
 * AI Query Log Entity
 * Phase 1 - AI 질문 로그 및 일 사용량 추적
 *
 * AIUsageLog와 별도로:
 * - 질문 횟수 기반 제한 추적
 * - 서비스 맥락 정보 저장
 * - 일별 사용량 집계용
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type AiQueryContextType = 'service' | 'free';

@Entity('ai_query_logs')
@Index(['userId', 'queryDate'])
@Index(['userId', 'createdAt'])
export class AiQueryLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** 사용자 ID */
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  /** 질문 내용 */
  @Column({ type: 'text' })
  question!: string;

  /** AI 응답 */
  @Column({ type: 'text', nullable: true })
  answer!: string | null;

  /** 맥락 유형: service (상품/페이지 맥락) | free (자유 질문) */
  @Column({ name: 'context_type', type: 'varchar', length: 20 })
  contextType!: AiQueryContextType;

  /** 맥락 ID (상품ID, 페이지ID 등) - 자유 질문은 null */
  @Column({ name: 'context_id', type: 'varchar', length: 100, nullable: true })
  contextId!: string | null;

  /** 맥락 데이터 (상품 정보, 카테고리 등) */
  @Column({ name: 'context_data', type: 'json', nullable: true })
  contextData!: Record<string, any> | null;

  /** 첨부된 정보 (AI가 참조한 제품/카테고리/정보) */
  @Column({ name: 'attached_info', type: 'json', nullable: true })
  attachedInfo!: Record<string, any> | null;

  /** 질문 일자 (YYYY-MM-DD 형식, 일별 집계용) */
  @Column({ name: 'query_date', type: 'date' })
  queryDate!: string;

  /** 성공 여부 */
  @Column({ type: 'boolean', default: true })
  success!: boolean;

  /** 에러 메시지 */
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  /** 응답 시간 (ms) */
  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
