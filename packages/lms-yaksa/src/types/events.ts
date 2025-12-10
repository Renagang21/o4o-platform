/**
 * LMS-Yaksa Event Types
 *
 * Type definitions for LMS Core events that Yaksa hooks listen to,
 * and Yaksa-specific events that are emitted.
 */

// ============================================
// LMS Core Events (Incoming)
// ============================================

/**
 * Event emitted when a course is completed
 */
export interface CourseCompletedEvent {
  /** User who completed the course */
  userId: string;
  /** Course that was completed */
  courseId: string;
  /** Enrollment ID for this course */
  enrollmentId: string;
  /** When the course was completed */
  completedAt: Date;
  /** Course title (snapshot) */
  courseTitle: string;
  /** Credits assigned to this course */
  courseCredits?: number;
  /** Organization ID if applicable */
  organizationId?: string;
}

/**
 * Event emitted when a certificate is issued
 */
export interface CertificateIssuedEvent {
  /** User who received the certificate */
  userId: string;
  /** Course for which certificate was issued */
  courseId: string;
  /** Certificate ID */
  certificateId: string;
  /** Enrollment ID */
  enrollmentId: string;
  /** When the certificate was issued */
  issuedAt: Date;
  /** Course title (snapshot) */
  courseTitle: string;
  /** Credits for this certificate */
  credits?: number;
  /** Organization ID if applicable */
  organizationId?: string;
}

/**
 * Event emitted when an enrollment is created
 */
export interface EnrollmentCreatedEvent {
  /** User who enrolled */
  userId: string;
  /** Course enrolled in */
  courseId: string;
  /** Enrollment ID */
  enrollmentId: string;
  /** When enrollment was created */
  enrolledAt: Date;
  /** Organization ID if applicable */
  organizationId?: string;
}

/**
 * Event emitted when enrollment progress is updated
 */
export interface ProgressUpdatedEvent {
  /** User whose progress was updated */
  userId: string;
  /** Course ID */
  courseId: string;
  /** Enrollment ID */
  enrollmentId: string;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** When progress was updated */
  updatedAt: Date;
  /** Organization ID if applicable */
  organizationId?: string;
}

/**
 * Event emitted when a lesson is completed
 */
export interface LessonCompletedEvent {
  /** User who completed the lesson */
  userId: string;
  /** Course ID containing the lesson */
  courseId: string;
  /** Lesson ID that was completed */
  lessonId: string;
  /** Enrollment ID */
  enrollmentId: string;
  /** When the lesson was completed */
  completedAt: Date;
  /** Organization ID if applicable */
  organizationId?: string;
}

// ============================================
// LMS Yaksa Events (Outgoing)
// ============================================

/**
 * Event emitted when credits are earned
 */
export interface CreditEarnedEvent {
  /** User who earned credits */
  userId: string;
  /** Credit record ID */
  creditRecordId: string;
  /** Course ID (if applicable) */
  courseId?: string;
  /** Credits earned */
  creditsEarned: number;
  /** Credit type */
  creditType: string;
  /** When credits were earned */
  earnedAt: Date;
  /** Organization ID */
  organizationId?: string;
}

/**
 * Event emitted when an assignment is completed
 */
export interface AssignmentCompletedEvent {
  /** User who completed the assignment */
  userId: string;
  /** Assignment ID */
  assignmentId: string;
  /** Course ID */
  courseId: string;
  /** Organization ID */
  organizationId: string;
  /** When assignment was completed */
  completedAt: Date;
  /** Whether completion was automatic (via hook) */
  isAutoCompleted: boolean;
}

/**
 * Event emitted when a license is verified
 */
export interface LicenseVerifiedEvent {
  /** User whose license was verified */
  userId: string;
  /** License profile ID */
  profileId: string;
  /** When license was verified */
  verifiedAt: Date;
  /** Verifier ID */
  verifiedBy?: string;
}

/**
 * Event emitted when credit is auto-recorded via hook
 */
export interface CreditAutoRecordedEvent {
  /** User who earned credits */
  userId: string;
  /** Credit record ID */
  creditRecordId: string;
  /** Course ID */
  courseId: string;
  /** Credits earned */
  creditsEarned: number;
  /** Source event that triggered auto-record */
  sourceEvent: 'course.completed' | 'certificate.issued';
  /** When credits were recorded */
  recordedAt: Date;
}

// ============================================
// Event Names Constants
// ============================================

export const LMS_CORE_EVENTS = {
  COURSE_COMPLETED: 'lms-core.course.completed',
  CERTIFICATE_ISSUED: 'lms-core.certificate.issued',
  ENROLLMENT_CREATED: 'lms-core.enrollment.created',
  ENROLLMENT_PROGRESS: 'lms-core.enrollment.progress',
  LESSON_COMPLETED: 'lms-core.lesson.completed',
} as const;

export const LMS_YAKSA_EVENTS = {
  CREDIT_EARNED: 'lms-yaksa.credit.earned',
  ASSIGNMENT_COMPLETED: 'lms-yaksa.assignment.completed',
  LICENSE_VERIFIED: 'lms-yaksa.license.verified',
  ASSIGNMENT_AUTO_COMPLETED: 'lms-yaksa.assignment.auto-completed',
  CREDIT_AUTO_RECORDED: 'lms-yaksa.credit.auto-recorded',
} as const;

export type LmsCoreEventName = typeof LMS_CORE_EVENTS[keyof typeof LMS_CORE_EVENTS];
export type LmsYaksaEventName = typeof LMS_YAKSA_EVENTS[keyof typeof LMS_YAKSA_EVENTS];
