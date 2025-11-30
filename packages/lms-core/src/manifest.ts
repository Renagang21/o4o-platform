export const manifest = {
  id: 'lms-core',
  name: 'LMS Core',
  version: '0.1.0',
  type: 'core',
  description: 'Learning Management System core functionality for O4O Platform',

  author: 'O4O Platform',
  license: 'MIT',

  /**
   * Database Tables
   */
  ownsTables: [
    'lms_courses',
    'lms_lessons',
    'lms_enrollments',
    'lms_progress',
    'lms_certificates',
    'lms_events',
    'lms_attendance',
  ],

  /**
   * Permissions
   */
  permissions: [
    'lms.read',
    'lms.write',
    'lms.manage',
    'lms.instructor',
    'lms.admin',
  ],

  /**
   * Lifecycle Hooks
   */
  lifecycle: {
    onInstall: './lifecycle/install.js',
    onUninstall: './lifecycle/uninstall.js',
  },

  /**
   * Features
   */
  features: [
    'course-management',
    'lesson-content',
    'enrollment-tracking',
    'progress-monitoring',
    'certificate-issuance',
    'event-scheduling',
    'attendance-tracking',
    'organization-scoped-courses',
  ],

  /**
   * Configuration
   */
  config: {
    enableCertificates: {
      type: 'boolean',
      default: true,
      description: 'Enable certificate issuance for completed courses',
    },
    defaultCourseDuration: {
      type: 'number',
      default: 60,
      description: 'Default course duration in minutes',
    },
    requireEnrollmentApproval: {
      type: 'boolean',
      default: false,
      description: 'Require admin approval for course enrollments',
    },
    maxConcurrentEnrollments: {
      type: 'number',
      default: 10,
      description: 'Maximum number of concurrent course enrollments per user',
    },
  },
};
