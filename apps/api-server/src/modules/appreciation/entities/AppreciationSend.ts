import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * AppreciationSend — 기여 감사 포인트 이력
 * WO-O4O-APPRECIATION-POINT-LIKE-SYSTEM-PHASE1-V1
 *
 * service_point_budgets 무관 — user→user 직접 이전 구조.
 * credit_transactions는 별도 기록 (sourceType: appreciation_send / appreciation_receive).
 */

export type AppreciationTargetType = 'forum_post' | 'content' | 'lms_course';

export const APPRECIATION_TARGET_TYPES: readonly AppreciationTargetType[] = [
  'forum_post',
  'content',
  'lms_course',
] as const;

@Entity('appreciation_sends')
@Index(['fromUserId'])
@Index(['toUserId'])
@Index(['targetType', 'targetId'])
export class AppreciationSend {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'from_user_id', type: 'uuid' })
  fromUserId!: string;

  @Column({ name: 'to_user_id', type: 'uuid' })
  toUserId!: string;

  @Column({ name: 'target_type', type: 'varchar', length: 50 })
  targetType!: AppreciationTargetType;

  @Column({ name: 'target_id', type: 'uuid' })
  targetId!: string;

  @Column({ type: 'integer' })
  amount!: number;

  @Column({ type: 'varchar', length: 200, nullable: true })
  message?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
