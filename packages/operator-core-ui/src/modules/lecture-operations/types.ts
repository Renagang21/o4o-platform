export type CourseStatus = 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';

export type LessonType = 'video' | 'article' | 'quiz' | 'assignment';

export type CourseVisibility = 'public' | 'members';

export interface Pagination { total: number; page: number; limit: number; totalPages: number }

export type Paginated<T> = { success: boolean; data: T[]; pagination?: Pagination };

export interface ProfessionalInfo { audience?: string; outcomes?: string; prerequisites?: string; instructorBio?: string; expertise?: string; reviewedAt?: string }

export interface LessonAttachment { name: string; url: string; type: string; size: number }

export interface LectureCourse {
  metadata?: Record<string, unknown> & { professionalInfo?: ProfessionalInfo };
  id: string;
  title: string;
  description: string | null;
  thumbnail: string | null;
  status: CourseStatus;
  visibility: CourseVisibility;
  contentKind?: string;
  category?: string | null;
  serviceKey?: string | null;
  instructorId: string;
  instructorName?: string | null;
  instructor?: { id: string; name?: string | null } | null;
  duration?: number;
  lessonCount?: number;
  enrollmentCount?: number;
  currentEnrollments?: number;
  requiresApproval: boolean;
  isPaid: boolean;
  tags?: string[] | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  publishedAt?: string | null;
}

export interface LectureLesson {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  type: LessonType;
  content: string | null;
  videoUrl: string | null;
  order: number;
  duration: number;
  isPublished?: boolean;
  isPreview?: boolean;
  isFree?: boolean;
  attachments?: LessonAttachment[];
  metadata?: Record<string, unknown> & { captions?: import('@o4o/lms-ui').LmsCaptionTrack[] };
}

export interface LectureEnrollment {
  id: string;
  courseId: string;
  userId: string;
  status: string;
  /** 서버(Enrollment entity)의 영속 필드는 `progressPercentage`. `progress` 는 구 응답 호환용. */
  progressPercentage?: number;
  progress?: number;
  completedLessons?: number;
  metadata?: { completedLessonIds?: string[] } | null;
  course?: Pick<LectureCourse, 'id' | 'title' | 'thumbnail' | 'lessonCount'> | null;
  user?: { id: string; email?: string; name?: string | null } | null;
  createdAt?: string;
}

export interface LectureCertificate {
  id: string;
  certificateNumber: string;
  courseId: string;
  userId: string;
  status?: string;
  issuedAt: string;
  expiresAt?: string | null;
  verificationCode?: string;
  course?: { id: string; title: string } | null;
  user?: { id: string; name?: string | null; email?: string } | null;
}

export interface QuizQuestionDraft {
  /**
   * 4차 P1-14: 기존 문항의 id 는 편집·저장 왕복에서 반드시 보존한다.
   * 채점은 attempt 의 questionId ↔ quiz.questions[].id 매칭이고 updateQuiz 는 배열을 그대로 저장하므로,
   * id 를 빼고 저장하면 기존 제출이 전부 오답 처리된다. 새 문항만 id 없이 보낸다(서버가 발급).
   */
  id?: string;
  question: string;
  type: 'single' | 'multi' | 'text';
  options: string[];
  answer: string | string[];
  points: number;
  order: number;
}

export interface LectureQuiz {
  id: string;
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  questions: Array<QuizQuestionDraft & { id: string }>;
  passingScore: number;
  isPublished?: boolean;
}

export interface UpsertQuizDto {
  lessonId: string;
  courseId: string;
  title: string;
  description?: string;
  questions: QuizQuestionDraft[];
  passingScore: number;
  isPublished?: boolean;
}

export interface LectureAssignment {
  id: string;
  lessonId: string;
  instructions: string | null;
  dueDate: string | null;
  maxScore?: number | null;
}

export interface LectureSubmission {
  id: string;
  userId: string;
  content: string | null;
  submittedAt: string | null;
  gradingStatus?: string | null;
  score?: number | null;
  feedback?: string | null;
  userName?: string | null;
  gradedAt?: string | null;
}

export interface InstructorApplication {
  id: string;
  userId: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  bio?: string | null;
  expertise?: string | null;
  createdAt: string;
  reviewNote?: string | null;
  user?: { id: string; name?: string | null; email?: string } | null;
}

export interface CourseInput {
  metadata?: { professionalInfo?: ProfessionalInfo };
  title: string;
  description: string;
  thumbnail?: string | null;
  tags?: string[];
  visibility?: CourseVisibility;
  requiresApproval?: boolean;
}

export interface LessonInput {
  isFree?: boolean;
  attachments?: LessonAttachment[];
  metadata?: Record<string, unknown> & { captions?: import('@o4o/lms-ui').LmsCaptionTrack[] };
  title: string;
  type: LessonType;
  description?: string | null;
  content?: string | null;
  videoUrl?: string | null;
  order?: number;
  duration?: number;
  isPublished?: boolean;
}

export interface OperatorCourseReviewLesson {
  id: string;
  title: string;
  description: string | null;
  type: string;
  order: number;
  duration: number | null;
  isPublished: boolean;
  isFree: boolean;
  videoUrl: string | null;
  attachments: Array<{ name: string; url: string; type: string; size: number }>;
  content: Record<string, unknown> | null;
  hasQuiz: boolean;
  quizQuestionCount: number;
  hasAssignment: boolean;
}

export interface OperatorCourseReview {
  course: {
    professionalInfo?: ProfessionalInfo;
    id: string;
    title: string;
    description: string | null;
    status: CourseStatus;
    visibility: string;
    instructorId: string;
    isPaid: boolean;
    requiresApproval: boolean;
    rejectionReason: string | null;
    thumbnail: string | null;
    createdAt: string | null;
    updatedAt: string | null;
  };
  curriculum: OperatorCourseReviewLesson[];
  readOnly: true;
}

export interface MissingCertificate { enrollmentId: string; userId: string; courseId: string; userName?: string; courseTitle: string }

export interface CertificateState { isValid?: boolean; expiresAt?: string | null }

export interface CertificateOperation {
  actorId: string | null; at: string; action: 'issue' | 'renew' | 'update' | 'revoke';
  reason: string | null; before: CertificateState | null; after: CertificateState | null;
  months?: number | null; changedFields?: string[] | null; trigger?: 'operator' | 'completion' | null;
}
