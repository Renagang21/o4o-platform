import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Assignment Entity
 *
 * WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
 *
 * Minimal assignment metadata attached to a lesson (1:1 by lessonId).
 * Submission/grading model intentionally minimal: text-only, no file
 * upload, no instructor grading. Submission == lesson completed.
 */

export type AssignmentSubmissionType = 'text';

@Entity('lms_assignments')
@Index(['lessonId'], { unique: true })
export class Assignment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  lessonId!: string;

  @Column({ type: 'text', nullable: true })
  instructions?: string;

  @Column({ type: 'varchar', length: 20, default: 'text' })
  submissionType!: AssignmentSubmissionType;

  @Column({ type: 'timestamp', nullable: true })
  dueDate?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
