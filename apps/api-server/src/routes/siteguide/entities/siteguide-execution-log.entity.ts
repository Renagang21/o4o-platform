/**
 * SiteGuideExecutionLog Entity
 *
 * WO-SITEGUIDE-CORE-EXECUTION-V1
 * 실행 로그 (요약 수준)
 *
 * Schema: siteguide (독립 스키마)
 *
 * Note: 상세 대화 내용은 저장하지 않음 (프라이버시)
 * 운영/디버깅/차단 판단용 최소 정보만 기록
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SiteGuideExecutionType {
  QUERY = 'query',
  HEALTH_CHECK = 'health_check',
}

export enum SiteGuideExecutionResult {
  SUCCESS = 'success',
  BLOCKED = 'blocked',
  ERROR = 'error',
}

@Entity({ name: 'siteguide_execution_logs', schema: 'siteguide' })
export class SiteGuideExecutionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'business_id', type: 'uuid' })
  @Index()
  businessId!: string;

  /**
   * API Key ID (추적용)
   */
  @Column({ name: 'api_key_id', type: 'uuid', nullable: true })
  apiKeyId?: string | null;

  /**
   * 실행 유형
   */
  @Column({
    name: 'execution_type',
    type: 'enum',
    enum: SiteGuideExecutionType,
    default: SiteGuideExecutionType.QUERY,
  })
  executionType!: SiteGuideExecutionType;

  /**
   * 실행 결과
   */
  @Column({
    type: 'enum',
    enum: SiteGuideExecutionResult,
  })
  @Index()
  result!: SiteGuideExecutionResult;

  /**
   * 차단/에러 사유 (blocked/error인 경우)
   */
  @Column({ name: 'error_code', type: 'varchar', length: 50, nullable: true })
  errorCode?: string | null;

  /**
   * 요청 도메인 (Origin)
   */
  @Column({ name: 'request_domain', type: 'varchar', length: 255, nullable: true })
  requestDomain?: string | null;

  /**
   * 응답 시간 (ms)
   */
  @Column({ name: 'response_time_ms', type: 'int', nullable: true })
  responseTimeMs?: number | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt!: Date;
}
