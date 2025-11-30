import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { LMSEvent } from './LMSEvent.js';

/**
 * Attendance Entity
 *
 * Tracks user attendance for LMS events.
 */

export enum AttendanceStatus {
  PRESENT = 'present',
  LATE = 'late',
  ABSENT = 'absent',
  EXCUSED = 'excused',
}

@Entity('lms_attendance')
@Unique(['eventId', 'userId'])
@Index(['eventId', 'status'])
@Index(['userId'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Event relationship
  @Column({ type: 'uuid' })
  eventId!: string;

  @ManyToOne(() => LMSEvent)
  @JoinColumn({ name: 'eventId' })
  event!: LMSEvent;

  // User relationship
  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user?: any;

  // Attendance Status
  @Column({ type: 'enum', enum: AttendanceStatus, default: AttendanceStatus.ABSENT })
  status!: AttendanceStatus;

  // Check-in Information
  @Column({ type: 'timestamp', nullable: true })
  checkedInAt?: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  usedCode?: string; // Attendance code used for check-in

  @Column({ type: 'varchar', length: 100, nullable: true })
  checkInMethod?: string; // 'code' | 'manual' | 'automatic'

  // Location (for in-person events)
  @Column({ type: 'varchar', length: 500, nullable: true })
  checkInLocation?: string;

  @Column({ type: 'jsonb', nullable: true })
  geoLocation?: {
    latitude: number;
    longitude: number;
  };

  // Notes
  @Column({ type: 'text', nullable: true })
  notes?: string; // Excuse notes or admin notes

  @Column({ type: 'uuid', nullable: true })
  markedBy?: string; // User ID of person who marked attendance

  // Additional Information
  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // Timestamps
  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt?: Date;

  // Helper Methods

  /**
   * Mark as present
   */
  markPresent(code?: string, method: string = 'code'): void {
    this.status = AttendanceStatus.PRESENT;
    this.checkedInAt = new Date();
    if (code) {
      this.usedCode = code;
    }
    this.checkInMethod = method;
  }

  /**
   * Mark as late
   */
  markLate(code?: string): void {
    this.status = AttendanceStatus.LATE;
    this.checkedInAt = new Date();
    if (code) {
      this.usedCode = code;
    }
    this.checkInMethod = 'code';
  }

  /**
   * Mark as absent
   */
  markAbsent(notes?: string, markedBy?: string): void {
    this.status = AttendanceStatus.ABSENT;
    if (notes) {
      this.notes = notes;
    }
    if (markedBy) {
      this.markedBy = markedBy;
    }
  }

  /**
   * Mark as excused
   */
  markExcused(notes: string, markedBy?: string): void {
    this.status = AttendanceStatus.EXCUSED;
    this.notes = notes;
    if (markedBy) {
      this.markedBy = markedBy;
    }
  }

  /**
   * Check if attended (present or late)
   */
  hasAttended(): boolean {
    return this.status === AttendanceStatus.PRESENT ||
           this.status === AttendanceStatus.LATE;
  }

  /**
   * Set geo location
   */
  setGeoLocation(latitude: number, longitude: number): void {
    this.geoLocation = { latitude, longitude };
  }
}
