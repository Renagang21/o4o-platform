import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

/**
 * CourseCompletion Entity
 *
 * WO-O4O-COMPLETION-V1
 * Records the fact that a user completed a course.
 * Separate from Certificate (document) — this is the record (fact).
 */
@Entity('course_completions')
@Unique(['userId', 'courseId'])
export class CourseCompletion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  @Index()
  userId!: string;

  @Column({ type: 'uuid' })
  @Index()
  courseId!: string;

  @Column({ type: 'uuid' })
  enrollmentId!: string;

  @Column({ type: 'timestamp' })
  completedAt!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
