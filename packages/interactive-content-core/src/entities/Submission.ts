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
 *
 * 1 row per (assignment, user). Re-submission overwrites the same row.
 */

export type SubmissionStatus = 'submitted';

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
