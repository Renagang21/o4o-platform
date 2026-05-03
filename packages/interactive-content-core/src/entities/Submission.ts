import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * Submission Entity
 *
 * WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
 * WO-O4O-LMS-ASSIGNMENT-GRADING-V1: gradingStatus / score / feedback / gradedAt / gradedBy 추가
 *
 * 1 row per (assignment, user). Re-submission overwrites the same row.
 *
 * 정책 (WO-O4O-LMS-ASSIGNMENT-GRADING-V1):
 *   - submission == lesson 진도 완료 인정 (변경 없음)
 *   - grading == 강사 평가/피드백 데이터 (수료/인증서/Credit 조건 아님)
 *   - 'returned' 처리, 낮은 점수, 'failed' 판정 모두 이미 지급된 Credit은 회수하지 않음
 */

export type SubmissionStatus = 'submitted';
export type GradingStatus = 'ungraded' | 'graded' | 'returned';

@Entity('lms_submissions')
@Unique(['assignmentId', 'userId'])
@Index(['userId'])
@Index(['lessonId'])
export class Submission {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  assignmentId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  lessonId!: string;

  @Column({ type: 'text', nullable: true })
  content?: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt!: Date;

  @Column({ type: 'varchar', length: 20, default: 'submitted' })
  status!: SubmissionStatus;

  // ── WO-O4O-LMS-ASSIGNMENT-GRADING-V1 ─────────────────────────────────
  @Column({ type: 'varchar', length: 20, default: 'ungraded' })
  gradingStatus!: GradingStatus;

  @Column({ type: 'integer', nullable: true })
  score?: number | null;

  @Column({ type: 'text', nullable: true })
  feedback?: string | null;

  @Column({ type: 'timestamp', nullable: true })
  gradedAt?: Date | null;

  @Column({ type: 'uuid', nullable: true })
  gradedBy?: string | null;
  // ── ─────────────────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
