import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Course } from './Course.js';

/**
 * Lesson Entity
 *
 * Represents a lesson/module within a course.
 */

export enum LessonType {
  VIDEO = 'video',
  ARTICLE = 'article',
  QUIZ = 'quiz',
  ASSIGNMENT = 'assignment',
  LIVE = 'live',
}

@Entity('lms_lessons')
@Index(['courseId', 'order'])
export class Lesson {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Course relationship
  @Column({ type: 'uuid' })
  courseId!: string;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course!: Course;

  // Basic Information
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: LessonType, default: LessonType.ARTICLE })
  type!: LessonType;

  // Content (Block Editor JSON or Markdown)
  @Column({ type: 'jsonb', nullable: true })
  content?: Record<string, any>;

  // Video Information
  @Column({ type: 'varchar', length: 500, nullable: true })
  videoUrl?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  videoThumbnail?: string;

  @Column({ type: 'integer', nullable: true })
  videoDuration?: number; // in seconds

  // Attachments
  @Column({ type: 'jsonb', nullable: true })
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
  }>;

  // Order and Duration
  @Column({ type: 'integer', default: 0 })
  order!: number; // Lesson order within course

  @Column({ type: 'integer', default: 0 })
  duration!: number; // Duration in minutes

  // Quiz/Assignment Metadata
  @Column({ type: 'jsonb', nullable: true })
  quizData?: {
    questions: Array<{
      id: string;
      question: string;
      type: 'multiple_choice' | 'true_false' | 'short_answer';
      options?: string[];
      correctAnswer: string | string[];
      points: number;
    }>;
    passingScore: number;
    timeLimit?: number; // in minutes
  };

  // Settings
  @Column({ type: 'boolean', default: true })
  isPublished!: boolean;

  @Column({ type: 'boolean', default: false })
  isFree!: boolean; // Free preview lesson

  @Column({ type: 'boolean', default: false })
  requiresCompletion!: boolean; // Must complete before next lesson

  // Additional Information
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * Check if lesson has video
   */
  hasVideo(): boolean {
    return !!this.videoUrl;
  }

  /**
   * Check if lesson has quiz
   */
  hasQuiz(): boolean {
    return this.type === LessonType.QUIZ && !!this.quizData;
  }

  /**
   * Get estimated completion time
   */
  getEstimatedTime(): number {
    if (this.duration > 0) return this.duration;
    if (this.videoDuration) return Math.ceil(this.videoDuration / 60);
    return 15; // default 15 minutes
  }
}
