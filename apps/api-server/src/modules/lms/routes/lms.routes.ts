import { Router } from 'express';
import { CourseController } from '../controllers/CourseController.js';
import { LessonController } from '../controllers/LessonController.js';
import { EnrollmentController } from '../controllers/EnrollmentController.js';
import { ProgressController } from '../controllers/ProgressController.js';
import { CertificateController } from '../controllers/CertificateController.js';
import { EventController } from '../controllers/EventController.js';
import { AttendanceController } from '../controllers/AttendanceController.js';
// Phase 1 Refoundation: Quiz/Survey Core
import { QuizController } from '../controllers/QuizController.js';
import { SurveyController } from '../controllers/SurveyController.js';
import { requireAuth, requireAdmin } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';

const router: Router = Router();

// ========================================
// COURSE ROUTES
// ========================================

// POST /api/v1/lms/courses - Create Course
router.post('/courses', requireAuth, asyncHandler(CourseController.createCourse));

// GET /api/v1/lms/courses - List Courses
router.get('/courses', requireAuth, asyncHandler(CourseController.listCourses));

// GET /api/v1/lms/courses/:id - Get Course by ID
router.get('/courses/:id', requireAuth, asyncHandler(CourseController.getCourse));

// PATCH /api/v1/lms/courses/:id - Update Course
router.patch('/courses/:id', requireAuth, asyncHandler(CourseController.updateCourse));

// DELETE /api/v1/lms/courses/:id - Archive Course
router.delete('/courses/:id', requireAuth, asyncHandler(CourseController.deleteCourse));

// POST /api/v1/lms/courses/:id/publish - Publish Course
router.post('/courses/:id/publish', requireAuth, asyncHandler(CourseController.publishCourse));

// POST /api/v1/lms/courses/:id/unpublish - Unpublish Course
router.post('/courses/:id/unpublish', requireAuth, asyncHandler(CourseController.unpublishCourse));

// POST /api/v1/lms/courses/:id/archive - Archive Course
router.post('/courses/:id/archive', requireAuth, asyncHandler(CourseController.archiveCourse));

// ========================================
// LESSON ROUTES
// ========================================

// POST /api/v1/lms/courses/:courseId/lessons - Create Lesson
router.post('/courses/:courseId/lessons', requireAuth, asyncHandler(LessonController.createLesson));

// GET /api/v1/lms/courses/:courseId/lessons - List Lessons for Course
router.get('/courses/:courseId/lessons', requireAuth, asyncHandler(LessonController.listLessonsByCourse));

// GET /api/v1/lms/lessons/:id - Get Lesson by ID
router.get('/lessons/:id', requireAuth, asyncHandler(LessonController.getLesson));

// PATCH /api/v1/lms/lessons/:id - Update Lesson
router.patch('/lessons/:id', requireAuth, asyncHandler(LessonController.updateLesson));

// DELETE /api/v1/lms/lessons/:id - Delete Lesson
router.delete('/lessons/:id', requireAuth, asyncHandler(LessonController.deleteLesson));

// POST /api/v1/lms/courses/:courseId/lessons/reorder - Reorder Lessons
router.post('/courses/:courseId/lessons/reorder', requireAuth, asyncHandler(LessonController.reorderLessons));

// ========================================
// ENROLLMENT ROUTES
// ========================================

// POST /api/v1/lms/courses/:courseId/enroll - Enroll in Course
router.post('/courses/:courseId/enroll', requireAuth, asyncHandler(EnrollmentController.enrollCourse));

// GET /api/v1/lms/enrollments - List Enrollments
router.get('/enrollments', requireAuth, asyncHandler(EnrollmentController.listEnrollments));

// GET /api/v1/lms/enrollments/me - Get My Enrollments
router.get('/enrollments/me', requireAuth, asyncHandler(EnrollmentController.getMyEnrollments));

// GET /api/v1/lms/enrollments/:id - Get Enrollment by ID
router.get('/enrollments/:id', requireAuth, asyncHandler(EnrollmentController.getEnrollment));

// PATCH /api/v1/lms/enrollments/:id - Update Enrollment
router.patch('/enrollments/:id', requireAuth, asyncHandler(EnrollmentController.updateEnrollment));

// POST /api/v1/lms/enrollments/:id/start - Start Enrollment
router.post('/enrollments/:id/start', requireAuth, asyncHandler(EnrollmentController.startEnrollment));

// POST /api/v1/lms/enrollments/:id/complete - Complete Enrollment
router.post('/enrollments/:id/complete', requireAuth, asyncHandler(EnrollmentController.completeEnrollment));

// POST /api/v1/lms/enrollments/:id/cancel - Cancel Enrollment
router.post('/enrollments/:id/cancel', requireAuth, asyncHandler(EnrollmentController.cancelEnrollment));

// ========================================
// PROGRESS ROUTES
// ========================================

// POST /api/v1/lms/progress - Record Progress
router.post('/progress', requireAuth, asyncHandler(ProgressController.recordProgress));

// GET /api/v1/lms/progress - List Progress
router.get('/progress', requireAuth, asyncHandler(ProgressController.listProgress));

// GET /api/v1/lms/enrollments/:enrollmentId/progress - Get Progress by Enrollment
router.get('/enrollments/:enrollmentId/progress', requireAuth, asyncHandler(ProgressController.getProgressByEnrollment));

// GET /api/v1/lms/progress/:id - Get Progress by ID
router.get('/progress/:id', requireAuth, asyncHandler(ProgressController.getProgress));

// PATCH /api/v1/lms/progress/:id - Update Progress
router.patch('/progress/:id', requireAuth, asyncHandler(ProgressController.updateProgress));

// POST /api/v1/lms/progress/:id/complete - Complete Progress
router.post('/progress/:id/complete', requireAuth, asyncHandler(ProgressController.completeProgress));

// POST /api/v1/lms/progress/:id/submit-quiz - Submit Quiz
router.post('/progress/:id/submit-quiz', requireAuth, asyncHandler(ProgressController.submitQuiz));

// ========================================
// CERTIFICATE ROUTES
// ========================================

// POST /api/v1/lms/certificates/issue - Issue Certificate
router.post('/certificates/issue', requireAuth, asyncHandler(CertificateController.issueCertificate));

// GET /api/v1/lms/certificates - List Certificates
router.get('/certificates', requireAuth, asyncHandler(CertificateController.listCertificates));

// GET /api/v1/lms/certificates/me - Get My Certificates
router.get('/certificates/me', requireAuth, asyncHandler(CertificateController.getMyCertificates));

// GET /api/v1/lms/certificates/verify/:verificationCode - Verify Certificate (Public)
router.get('/certificates/verify/:verificationCode', asyncHandler(CertificateController.verifyCertificate));

// GET /api/v1/lms/certificates/number/:certificateNumber - Get Certificate by Number
router.get('/certificates/number/:certificateNumber', requireAuth, asyncHandler(CertificateController.getCertificateByNumber));

// GET /api/v1/lms/certificates/:id - Get Certificate by ID
router.get('/certificates/:id', requireAuth, asyncHandler(CertificateController.getCertificate));

// PATCH /api/v1/lms/certificates/:id - Update Certificate
router.patch('/certificates/:id', requireAuth, asyncHandler(CertificateController.updateCertificate));

// POST /api/v1/lms/certificates/:id/revoke - Revoke Certificate
router.post('/certificates/:id/revoke', requireAuth, asyncHandler(CertificateController.revokeCertificate));

// POST /api/v1/lms/certificates/:id/renew - Renew Certificate
router.post('/certificates/:id/renew', requireAuth, asyncHandler(CertificateController.renewCertificate));

// ========================================
// EVENTS ROUTES
// ========================================

// POST /api/v1/lms/events - Create Event
router.post('/events', requireAuth, asyncHandler(EventController.createEvent));

// GET /api/v1/lms/events - List Events
router.get('/events', requireAuth, asyncHandler(EventController.listEvents));

// GET /api/v1/lms/events/:id - Get Event by ID
router.get('/events/:id', requireAuth, asyncHandler(EventController.getEvent));

// PATCH /api/v1/lms/events/:id - Update Event
router.patch('/events/:id', requireAuth, asyncHandler(EventController.updateEvent));

// DELETE /api/v1/lms/events/:id - Delete Event
router.delete('/events/:id', requireAuth, asyncHandler(EventController.deleteEvent));

// POST /api/v1/lms/events/:id/start - Start Event
router.post('/events/:id/start', requireAuth, asyncHandler(EventController.startEvent));

// POST /api/v1/lms/events/:id/complete - Complete Event
router.post('/events/:id/complete', requireAuth, asyncHandler(EventController.completeEvent));

// POST /api/v1/lms/events/:id/cancel - Cancel Event
router.post('/events/:id/cancel', requireAuth, asyncHandler(EventController.cancelEvent));

// ========================================
// ATTENDANCE ROUTES
// ========================================

// POST /api/v1/lms/attendance/checkin - Check In
router.post('/attendance/checkin', requireAuth, asyncHandler(AttendanceController.checkIn));

// POST /api/v1/lms/events/:eventId/attendance - Mark Attendance (Manual)
router.post('/events/:eventId/attendance', requireAuth, asyncHandler(AttendanceController.markAttendance));

// GET /api/v1/lms/attendance - List Attendance
router.get('/attendance', requireAuth, asyncHandler(AttendanceController.listAttendance));

// GET /api/v1/lms/events/:eventId/attendance - List Attendance by Event
router.get('/events/:eventId/attendance', requireAuth, asyncHandler(AttendanceController.listAttendanceByEvent));

// GET /api/v1/lms/attendance/:id - Get Attendance by ID
router.get('/attendance/:id', requireAuth, asyncHandler(AttendanceController.getAttendance));

// PATCH /api/v1/lms/attendance/:id - Update Attendance
router.patch('/attendance/:id', requireAuth, asyncHandler(AttendanceController.updateAttendance));

// ========================================
// QUIZ ROUTES (Phase 1 Refoundation)
// ========================================

// POST /api/v1/lms/quizzes - Create Quiz
router.post('/quizzes', requireAuth, asyncHandler(QuizController.createQuiz));

// GET /api/v1/lms/quizzes - List Quizzes
router.get('/quizzes', requireAuth, asyncHandler(QuizController.listQuizzes));

// GET /api/v1/lms/quizzes/:id - Get Quiz by ID
router.get('/quizzes/:id', requireAuth, asyncHandler(QuizController.getQuiz));

// PATCH /api/v1/lms/quizzes/:id - Update Quiz
router.patch('/quizzes/:id', requireAuth, asyncHandler(QuizController.updateQuiz));

// DELETE /api/v1/lms/quizzes/:id - Delete Quiz
router.delete('/quizzes/:id', requireAuth, asyncHandler(QuizController.deleteQuiz));

// POST /api/v1/lms/quizzes/:id/publish - Publish Quiz
router.post('/quizzes/:id/publish', requireAuth, asyncHandler(QuizController.publishQuiz));

// POST /api/v1/lms/quizzes/:id/unpublish - Unpublish Quiz
router.post('/quizzes/:id/unpublish', requireAuth, asyncHandler(QuizController.unpublishQuiz));

// POST /api/v1/lms/quizzes/:id/questions - Add Question
router.post('/quizzes/:id/questions', requireAuth, asyncHandler(QuizController.addQuestion));

// DELETE /api/v1/lms/quizzes/:id/questions/:questionId - Remove Question
router.delete('/quizzes/:id/questions/:questionId', requireAuth, asyncHandler(QuizController.removeQuestion));

// POST /api/v1/lms/quizzes/:id/questions/reorder - Reorder Questions
router.post('/quizzes/:id/questions/reorder', requireAuth, asyncHandler(QuizController.reorderQuestions));

// POST /api/v1/lms/quizzes/:id/attempts - Start Attempt
router.post('/quizzes/:id/attempts', requireAuth, asyncHandler(QuizController.startAttempt));

// GET /api/v1/lms/quizzes/:id/attempts - Get User Attempts
router.get('/quizzes/:id/attempts', requireAuth, asyncHandler(QuizController.getUserAttempts));

// GET /api/v1/lms/quizzes/attempts/:attemptId - Get Attempt by ID
router.get('/quizzes/attempts/:attemptId', requireAuth, asyncHandler(QuizController.getAttempt));

// POST /api/v1/lms/quizzes/attempts/:attemptId/answers - Submit Answer
router.post('/quizzes/attempts/:attemptId/answers', requireAuth, asyncHandler(QuizController.submitAnswer));

// POST /api/v1/lms/quizzes/attempts/:attemptId/complete - Complete Attempt
router.post('/quizzes/attempts/:attemptId/complete', requireAuth, asyncHandler(QuizController.completeAttempt));

// GET /api/v1/lms/quizzes/:id/stats - Get Quiz Stats
router.get('/quizzes/:id/stats', requireAuth, asyncHandler(QuizController.getQuizStats));

// GET /api/v1/lms/quizzes/bundle/:bundleId - Get Quizzes by Bundle (Frontend Compatibility)
router.get('/quizzes/bundle/:bundleId', requireAuth, asyncHandler(QuizController.getQuizzesByBundle));

// GET /api/v1/lms/quizzes/:id/attempts/me - Get My Attempts (Frontend Compatibility)
router.get('/quizzes/:id/attempts/me', requireAuth, asyncHandler(QuizController.getMyAttempts));

// ========================================
// SURVEY ROUTES (Phase 1 Refoundation)
// ========================================

// POST /api/v1/lms/surveys - Create Survey
router.post('/surveys', requireAuth, asyncHandler(SurveyController.createSurvey));

// GET /api/v1/lms/surveys - List Surveys
router.get('/surveys', requireAuth, asyncHandler(SurveyController.listSurveys));

// GET /api/v1/lms/surveys/:id - Get Survey by ID
router.get('/surveys/:id', requireAuth, asyncHandler(SurveyController.getSurvey));

// PATCH /api/v1/lms/surveys/:id - Update Survey
router.patch('/surveys/:id', requireAuth, asyncHandler(SurveyController.updateSurvey));

// DELETE /api/v1/lms/surveys/:id - Delete Survey
router.delete('/surveys/:id', requireAuth, asyncHandler(SurveyController.deleteSurvey));

// POST /api/v1/lms/surveys/:id/publish - Publish Survey
router.post('/surveys/:id/publish', requireAuth, asyncHandler(SurveyController.publishSurvey));

// POST /api/v1/lms/surveys/:id/close - Close Survey
router.post('/surveys/:id/close', requireAuth, asyncHandler(SurveyController.closeSurvey));

// POST /api/v1/lms/surveys/:id/archive - Archive Survey
router.post('/surveys/:id/archive', requireAuth, asyncHandler(SurveyController.archiveSurvey));

// GET /api/v1/lms/surveys/:id/questions - Get Questions
router.get('/surveys/:id/questions', requireAuth, asyncHandler(SurveyController.getQuestions));

// POST /api/v1/lms/surveys/:id/questions - Add Question
router.post('/surveys/:id/questions', requireAuth, asyncHandler(SurveyController.addQuestion));

// PATCH /api/v1/lms/surveys/questions/:questionId - Update Question
router.patch('/surveys/questions/:questionId', requireAuth, asyncHandler(SurveyController.updateQuestion));

// DELETE /api/v1/lms/surveys/questions/:questionId - Delete Question
router.delete('/surveys/questions/:questionId', requireAuth, asyncHandler(SurveyController.deleteQuestion));

// POST /api/v1/lms/surveys/:id/questions/reorder - Reorder Questions
router.post('/surveys/:id/questions/reorder', requireAuth, asyncHandler(SurveyController.reorderQuestions));

// POST /api/v1/lms/surveys/:id/responses - Start Response
router.post('/surveys/:id/responses', requireAuth, asyncHandler(SurveyController.startResponse));

// GET /api/v1/lms/surveys/:id/responses - Get Survey Responses
router.get('/surveys/:id/responses', requireAuth, asyncHandler(SurveyController.getSurveyResponses));

// GET /api/v1/lms/surveys/responses/:responseId - Get Response by ID
router.get('/surveys/responses/:responseId', requireAuth, asyncHandler(SurveyController.getResponse));

// POST /api/v1/lms/surveys/responses/:responseId/answers - Submit Answer
router.post('/surveys/responses/:responseId/answers', requireAuth, asyncHandler(SurveyController.submitAnswer));

// POST /api/v1/lms/surveys/responses/:responseId/complete - Complete Response
router.post('/surveys/responses/:responseId/complete', requireAuth, asyncHandler(SurveyController.completeResponse));

// GET /api/v1/lms/surveys/:id/stats - Get Survey Stats
router.get('/surveys/:id/stats', requireAuth, asyncHandler(SurveyController.getSurveyStats));

// GET /api/v1/lms/surveys/:id/question-stats - Get Question Stats
router.get('/surveys/:id/question-stats', requireAuth, asyncHandler(SurveyController.getQuestionStats));

// GET /api/v1/lms/surveys/bundle/:bundleId - Get Surveys by Bundle (Frontend Compatibility)
router.get('/surveys/bundle/:bundleId', requireAuth, asyncHandler(SurveyController.getSurveysByBundle));

// GET /api/v1/lms/surveys/:id/responses/check - Check if User Responded (Frontend Compatibility)
router.get('/surveys/:id/responses/check', requireAuth, asyncHandler(SurveyController.checkUserResponse));

export default router;
