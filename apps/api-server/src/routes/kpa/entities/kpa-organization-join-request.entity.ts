/**
 * KPA Organization Join Request Entity
 *
 * WO-CONTEXT-JOIN-REQUEST-MVP-V1
 *
 * 조직 가입 / 역할 승격 / 운영자 요청 관리
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type JoinRequestType = 'join' | 'promotion' | 'operator';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';
export type RequestedRole = 'admin' | 'manager' | 'member' | 'moderator';

@Entity('kpa_organization_join_requests')
@Index(['organization_id', 'status'])
@Index(['user_id', 'status'])
export class KpaOrganizationJoinRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 요청자 사용자 ID
   */
  @Column({ type: 'uuid' })
  user_id: string;

  /**
   * 대상 조직 ID
   */
  @Column({ type: 'uuid' })
  organization_id: string;

  /**
   * 요청한 역할
   */
  @Column({ type: 'varchar', length: 20, default: 'member' })
  requested_role: RequestedRole;

  /**
   * 세부 역할 (예: 총무, 학술위원장 등)
   */
  @Column({ type: 'varchar', length: 50, nullable: true })
  requested_sub_role: string | null;

  /**
   * 요청 유형
   * - join: 조직 가입
   * - promotion: 역할 승격
   * - operator: 운영자 요청
   */
  @Column({ type: 'varchar', length: 20 })
  request_type: JoinRequestType;

  /**
   * 추가 정보 (서비스/조직별)
   */
  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, any> | null;

  /**
   * 처리 상태
   */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: JoinRequestStatus;

  /**
   * 승인/반려 처리자 ID
   */
  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string | null;

  /**
   * 승인/반려 처리 시각
   */
  @Column({ type: 'timestamp', nullable: true })
  reviewed_at: Date | null;

  /**
   * 처리 메모
   */
  @Column({ type: 'text', nullable: true })
  review_note: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
