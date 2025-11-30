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
 * LMSEvent Entity
 *
 * Represents scheduled events for courses (lectures, workshops, exams, etc.)
 */

export enum LMSEventType {
  LECTURE = 'lecture',
  WORKSHOP = 'workshop',
  EXAM = 'exam',
  WEBINAR = 'webinar',
  LIVE_SESSION = 'live_session',
}

export enum EventStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('lms_events')
@Index(['courseId', 'startAt'])
@Index(['organizationId'])
export class LMSEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Course relationship
  @Column({ type: 'uuid' })
  courseId!: string;

  @ManyToOne(() => Course)
  @JoinColumn({ name: 'courseId' })
  course!: Course;

  // Organization relationship (for organization-specific events)
  @Column({ type: 'uuid', nullable: true })
  organizationId?: string;

  @ManyToOne('Organization', { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: any;

  // Event Information
  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: LMSEventType, default: LMSEventType.LECTURE })
  type!: LMSEventType;

  @Column({ type: 'enum', enum: EventStatus, default: EventStatus.SCHEDULED })
  status!: EventStatus;

  // Schedule
  @Column({ type: 'timestamp' })
  startAt!: Date;

  @Column({ type: 'timestamp' })
  endAt!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  timezone?: string;

  // Location
  @Column({ type: 'varchar', length: 500, nullable: true })
  location?: string; // Physical location

  @Column({ type: 'varchar', length: 500, nullable: true })
  onlineUrl?: string; // Online meeting URL (Zoom, Google Meet, etc.)

  @Column({ type: 'boolean', default: false })
  isOnline!: boolean;

  // Instructor
  @Column({ type: 'uuid', nullable: true })
  instructorId?: string;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'instructorId' })
  instructor?: any;

  // Attendance
  @Column({ type: 'boolean', default: false })
  requiresAttendance!: boolean;

  @Column({ type: 'varchar', length: 20, nullable: true })
  attendanceCode?: string; // Code for checking in

  @Column({ type: 'integer', default: 0 })
  attendanceCount!: number;

  // Capacity
  @Column({ type: 'integer', nullable: true })
  maxAttendees?: number;

  @Column({ type: 'integer', default: 0 })
  currentAttendees!: number;

  // Additional Information
  @Column({ type: 'jsonb', nullable: true })
  metadata?: {
    recordingUrl?: string;
    materials?: Array<{ name: string; url: string }>;
    agenda?: string[];
  };

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Helper Methods

  /**
   * Check if event is upcoming
   */
  isUpcoming(): boolean {
    return this.status === EventStatus.SCHEDULED && new Date() < this.startAt;
  }

  /**
   * Check if event is ongoing
   */
  isOngoing(): boolean {
    const now = new Date();
    return now >= this.startAt && now <= this.endAt;
  }

  /**
   * Check if event is past
   */
  isPast(): boolean {
    return new Date() > this.endAt;
  }

  /**
   * Check if event is full
   */
  isFull(): boolean {
    if (!this.maxAttendees) return false;
    return this.currentAttendees >= this.maxAttendees;
  }

  /**
   * Generate attendance code
   */
  static generateAttendanceCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  /**
   * Start event
   */
  start(): void {
    this.status = EventStatus.IN_PROGRESS;
  }

  /**
   * Complete event
   */
  complete(): void {
    this.status = EventStatus.COMPLETED;
  }

  /**
   * Cancel event
   */
  cancel(): void {
    this.status = EventStatus.CANCELLED;
  }

  /**
   * Increment attendee count
   */
  incrementAttendees(): void {
    this.currentAttendees++;
    this.attendanceCount++;
  }
}
