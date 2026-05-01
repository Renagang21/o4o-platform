// Local entities (remain in lms-core)
export { InstructorApplication } from './InstructorApplication.js';
export { EngagementLog, EngagementEventType } from './EngagementLog.js';
export type { EngagementMetadata } from './EngagementLog.js';

// Interactive Content (re-export from @o4o/interactive-content-core for backward compatibility)
export {
  // Phase 1
  Quiz, QuizAttempt, AttemptStatus,
  Survey, SurveyStatus, SurveyOwnerType, SurveyVisibility, SurveyQuestion, QuestionType, SurveyResponse, ResponseStatus,
  ContentBundle, ContentBundleType,
  // Phase 2
  Course, CourseStatus, ContentKind, CourseVisibility,
  Lesson, LessonType,
} from '@o4o/interactive-content-core';
export type {
  QuizQuestion, QuizAnswer,
  QuestionOption,
  QuestionAnswer,
  ContentItem,
} from '@o4o/interactive-content-core';

// Education Extension (re-export from @o4o/education-extension for backward compatibility)
export {
  Enrollment, EnrollmentStatus,
  Progress, ProgressStatus,
  Certificate,
  LMSEvent, LMSEventType, EventStatus,
  Attendance, AttendanceStatus,
} from '@o4o/education-extension';
