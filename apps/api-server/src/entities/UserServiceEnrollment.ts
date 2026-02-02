/**
 * UserServiceEnrollment - 사용자-서비스 등록 관계
 *
 * 플랫폼 레벨 서비스 이용 신청/승인 상태 관리.
 * 서비스별 세부 application 테이블과는 별개 레이어.
 *
 * WO-PLATFORM-SERVICE-CATALOG-AND-MY-V1
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';

export type EnrollmentStatus = 'not_applied' | 'applied' | 'approved' | 'rejected';

@Entity('user_service_enrollments')
@Unique(['userId', 'serviceCode'])
@Index(['userId', 'status'])
@Index(['serviceCode', 'status'])
export class UserServiceEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'service_code', type: 'varchar', length: 50 })
  serviceCode: string;

  @Column({
    type: 'enum',
    enum: ['not_applied', 'applied', 'approved', 'rejected'],
    default: 'not_applied',
  })
  status: EnrollmentStatus;

  @Column({ name: 'applied_at', type: 'timestamp', nullable: true })
  appliedAt: Date;

  @Column({ name: 'decided_at', type: 'timestamp', nullable: true })
  decidedAt: Date;

  @Column({ name: 'decided_by', type: 'uuid', nullable: true })
  decidedBy: string;

  @Column({ type: 'text', nullable: true })
  note: string;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ESM mandatory: string-based relations
  @ManyToOne('User')
  @JoinColumn({ name: 'user_id' })
  user: unknown;

  @ManyToOne('PlatformService')
  @JoinColumn({ name: 'service_code', referencedColumnName: 'code' })
  service: unknown;
}
