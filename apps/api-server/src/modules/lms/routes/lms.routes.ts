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
// Phase 2 Refoundation: Marketing Campaign Controllers
import { ProductContentController } from '../controllers/ProductContentController.js';
import { QuizCampaignController } from '../controllers/QuizCampaignController.js';
import { SurveyCampaignController } from '../controllers/SurveyCampaignController.js';
// WO-LMS-INSTRUCTOR-ROLE-V1
import { InstructorController } from '../controllers/InstructorController.js';
import { requireAuth, requireAdmin } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { requireEnrollment } from '../middleware/requireEnrollment.js';
import { requireInstructor } from '../middleware/requireInstructor.js';

const router: Router = Router();

// ========================================
// COURSE ROUTES
// WO-KPA-A-ADMIN-OPERATOR-REALIGNMENT-V1: Write ops require instructor/admin
// ========================================

// POST /api/v1/lms/courses - Create Course
router.post('/courses', requireAuth, requireInstructor, asyncHandler(CourseController.createCourse));

// GET /api/v1/lms/courses - List Courses
router.get('/courses', requireAuth, asyncHandler(CourseController.listCourses));

// GET /api/v1/lms/courses/:id - Get Course by ID
router.get('/courses/:id', requireAuth, asyncHandler(CourseController.getCourse));

// PATCH /api/v1/lms/courses/:id - Update Course
router.patch('/courses/:id', requireAuth, requireInstructor, asyncHandler(CourseController.updateCourse));

// DELETE /api/v1/lms/courses/:id - Archive Course
router.delete('/courses/:id', requireAuth, requireInstructor, asyncHandler(CourseController.deleteCourse));

// POST /api/v1/lms/courses/:id/publish - Publish Course
router.post('/courses/:id/publish', requireAuth, requireInstructor, asyncHandler(CourseController.publishCourse));

// POST /api/v1/lms/courses/:id/unpublish - Unpublish Course
router.post('/courses/:id/unpublish', requireAuth, requireInstructor, asyncHandler(CourseController.unpublishCourse));

// POST /api/v1/lms/courses/:id/archive - Archive Course
router.post('/courses/:id/archive', requireAuth, requireInstructor, asyncHandler(CourseController.archiveCourse));

// ========================================
// LESSON ROUTES
// ========================================

// POST /api/v1/lms/courses/:courseId/lessons - Create Lesson
router.post('/courses/:courseId/lessons', requireAuth, requireInstructor, asyncHandler(LessonController.createLesson));

// GET /api/v1/lms/courses/:courseId/lessons - List Lessons for Course
router.get('/courses/:courseId/lessons', requireAuth, requireEnrollment(), asyncHandler(LessonController.listLessonsByCourse));

// GET /api/v1/lms/lessons/:id - Get Lesson by ID
router.get('/lessons/:id', requireAuth, requireEnrollment({ checkLesson: true }), asyncHandler(LessonController.getLesson));

// PATCH /api/v1/lms/lessons/:id - Update Lesson
router.patch('/lessons/:id', requireAuth, requireInstructor, asyncHandler(LessonController.updateLesson));

// DELETE /api/v1/lms/lessons/:id - Delete Lesson
router.delete('/lessons/:id', requireAuth, requireInstructor, asyncHandler(LessonController.deleteLesson));

// POST /api/v1/lms/courses/:courseId/lessons/reorder - Reorder Lessons
router.post('/courses/:courseId/lessons/reorder', requireAuth, requireInstructor, asyncHandler(LessonController.reorderLessons));

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
router.post('/certificates/issue', requireAuth, requireAdmin, asyncHandler(CertificateController.issueCertificate));

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
router.patch('/certificates/:id', requireAuth, requireAdmin, asyncHandler(CertificateController.updateCertificate));

// POST /api/v1/lms/certificates/:id/revoke - Revoke Certificate
router.post('/certificates/:id/revoke', requireAuth, requireAdmin, asyncHandler(CertificateController.revokeCertificate));

// POST /api/v1/lms/certificates/:id/renew - Renew Certificate
router.post('/certificates/:id/renew', requireAuth, requireAdmin, asyncHandler(CertificateController.renewCertificate));

// ========================================
// EVENTS ROUTES
// ========================================

// POST /api/v1/lms/events - Create Event
router.post('/events', requireAuth, requireInstructor, asyncHandler(EventController.createEvent));

// GET /api/v1/lms/events - List Events
router.get('/events', requireAuth, asyncHandler(EventController.listEvents));

// GET /api/v1/lms/events/:id - Get Event by ID
router.get('/events/:id', requireAuth, asyncHandler(EventController.getEvent));

// PATCH /api/v1/lms/events/:id - Update Event
router.patch('/events/:id', requireAuth, requireInstructor, asyncHandler(EventController.updateEvent));

// DELETE /api/v1/lms/events/:id - Delete Event
router.delete('/events/:id', requireAuth, requireInstructor, asyncHandler(EventController.deleteEvent));

// POST /api/v1/lms/events/:id/start - Start Event
router.post('/events/:id/start', requireAuth, requireInstructor, asyncHandler(EventController.startEvent));

// POST /api/v1/lms/events/:id/complete - Complete Event
router.post('/events/:id/complete', requireAuth, requireInstructor, asyncHandler(EventController.completeEvent));

// POST /api/v1/lms/events/:id/cancel - Cancel Event
router.post('/events/:id/cancel', requireAuth, requireInstructor, asyncHandler(EventController.cancelEvent));

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
router.post('/quizzes', requireAuth, requireInstructor, asyncHandler(QuizController.createQuiz));

// GET /api/v1/lms/quizzes - List Quizzes
router.get('/quizzes', requireAuth, asyncHandler(QuizController.listQuizzes));

// GET /api/v1/lms/quizzes/:id - Get Quiz by ID
router.get('/quizzes/:id', requireAuth, asyncHandler(QuizController.getQuiz));

// PATCH /api/v1/lms/quizzes/:id - Update Quiz
router.patch('/quizzes/:id', requireAuth, requireInstructor, asyncHandler(QuizController.updateQuiz));

// DELETE /api/v1/lms/quizzes/:id - Delete Quiz
router.delete('/quizzes/:id', requireAuth, requireInstructor, asyncHandler(QuizController.deleteQuiz));

// POST /api/v1/lms/quizzes/:id/publish - Publish Quiz
router.post('/quizzes/:id/publish', requireAuth, requireInstructor, asyncHandler(QuizController.publishQuiz));

// POST /api/v1/lms/quizzes/:id/unpublish - Unpublish Quiz
router.post('/quizzes/:id/unpublish', requireAuth, requireInstructor, asyncHandler(QuizController.unpublishQuiz));

// POST /api/v1/lms/quizzes/:id/questions - Add Question
router.post('/quizzes/:id/questions', requireAuth, requireInstructor, asyncHandler(QuizController.addQuestion));

// DELETE /api/v1/lms/quizzes/:id/questions/:questionId - Remove Question
router.delete('/quizzes/:id/questions/:questionId', requireAuth, requireInstructor, asyncHandler(QuizController.removeQuestion));

// POST /api/v1/lms/quizzes/:id/questions/reorder - Reorder Questions
router.post('/quizzes/:id/questions/reorder', requireAuth, requireInstructor, asyncHandler(QuizController.reorderQuestions));

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
router.post('/surveys', requireAuth, requireInstructor, asyncHandler(SurveyController.createSurvey));

// GET /api/v1/lms/surveys - List Surveys
router.get('/surveys', requireAuth, asyncHandler(SurveyController.listSurveys));

// GET /api/v1/lms/surveys/:id - Get Survey by ID
router.get('/surveys/:id', requireAuth, asyncHandler(SurveyController.getSurvey));

// PATCH /api/v1/lms/surveys/:id - Update Survey
router.patch('/surveys/:id', requireAuth, requireInstructor, asyncHandler(SurveyController.updateSurvey));

// DELETE /api/v1/lms/surveys/:id - Delete Survey
router.delete('/surveys/:id', requireAuth, requireInstructor, asyncHandler(SurveyController.deleteSurvey));

// POST /api/v1/lms/surveys/:id/publish - Publish Survey
router.post('/surveys/:id/publish', requireAuth, requireInstructor, asyncHandler(SurveyController.publishSurvey));

// POST /api/v1/lms/surveys/:id/close - Close Survey
router.post('/surveys/:id/close', requireAuth, requireInstructor, asyncHandler(SurveyController.closeSurvey));

// POST /api/v1/lms/surveys/:id/archive - Archive Survey
router.post('/surveys/:id/archive', requireAuth, requireInstructor, asyncHandler(SurveyController.archiveSurvey));

// GET /api/v1/lms/surveys/:id/questions - Get Questions
router.get('/surveys/:id/questions', requireAuth, asyncHandler(SurveyController.getQuestions));

// POST /api/v1/lms/surveys/:id/questions - Add Question
router.post('/surveys/:id/questions', requireAuth, requireInstructor, asyncHandler(SurveyController.addQuestion));

// PATCH /api/v1/lms/surveys/questions/:questionId - Update Question
router.patch('/surveys/questions/:questionId', requireAuth, requireInstructor, asyncHandler(SurveyController.updateQuestion));

// DELETE /api/v1/lms/surveys/questions/:questionId - Delete Question
router.delete('/surveys/questions/:questionId', requireAuth, requireInstructor, asyncHandler(SurveyController.deleteQuestion));

// POST /api/v1/lms/surveys/:id/questions/reorder - Reorder Questions
router.post('/surveys/:id/questions/reorder', requireAuth, requireInstructor, asyncHandler(SurveyController.reorderQuestions));

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

// ========================================
// MARKETING: PRODUCT CONTENT ROUTES (Phase 2 Refoundation)
// ========================================

// POST /api/v1/lms/marketing/products - Create ProductContent
router.post('/marketing/products', requireAuth, requireInstructor, asyncHandler(ProductContentController.createProductContent));

// GET /api/v1/lms/marketing/products - List ProductContents
router.get('/marketing/products', requireAuth, asyncHandler(ProductContentController.listProductContents));

// GET /api/v1/lms/marketing/products/published - Get Published ProductContents
router.get('/marketing/products/published', requireAuth, asyncHandler(ProductContentController.findPublished));

// GET /api/v1/lms/marketing/products/supplier/:supplierId - Get ProductContents by Supplier
router.get('/marketing/products/supplier/:supplierId', requireAuth, asyncHandler(ProductContentController.findBySupplier));

// GET /api/v1/lms/marketing/products/:id - Get ProductContent by ID
router.get('/marketing/products/:id', requireAuth, asyncHandler(ProductContentController.getProductContent));

// PATCH /api/v1/lms/marketing/products/:id - Update ProductContent
router.patch('/marketing/products/:id', requireAuth, requireInstructor, asyncHandler(ProductContentController.updateProductContent));

// DELETE /api/v1/lms/marketing/products/:id - Delete ProductContent
router.delete('/marketing/products/:id', requireAuth, requireInstructor, asyncHandler(ProductContentController.deleteProductContent));

// POST /api/v1/lms/marketing/products/:id/publish - Publish ProductContent
router.post('/marketing/products/:id/publish', requireAuth, requireInstructor, asyncHandler(ProductContentController.publishProductContent));

// POST /api/v1/lms/marketing/products/:id/pause - Pause ProductContent
router.post('/marketing/products/:id/pause', requireAuth, requireInstructor, asyncHandler(ProductContentController.pauseProductContent));

// POST /api/v1/lms/marketing/products/:id/archive - Archive ProductContent
router.post('/marketing/products/:id/archive', requireAuth, requireInstructor, asyncHandler(ProductContentController.archiveProductContent));

// ========================================
// MARKETING: QUIZ CAMPAIGN ROUTES (Phase 2 Refoundation)
// ========================================

// POST /api/v1/lms/marketing/quiz-campaigns - Create QuizCampaign
router.post('/marketing/quiz-campaigns', requireAuth, requireInstructor, asyncHandler(QuizCampaignController.createCampaign));

// GET /api/v1/lms/marketing/quiz-campaigns - List QuizCampaigns
router.get('/marketing/quiz-campaigns', requireAuth, asyncHandler(QuizCampaignController.listCampaigns));

// GET /api/v1/lms/marketing/quiz-campaigns/active - Get Active QuizCampaigns
router.get('/marketing/quiz-campaigns/active', requireAuth, asyncHandler(QuizCampaignController.findActiveCampaigns));

// GET /api/v1/lms/marketing/quiz-campaigns/:id - Get QuizCampaign by ID
router.get('/marketing/quiz-campaigns/:id', requireAuth, asyncHandler(QuizCampaignController.getCampaign));

// PATCH /api/v1/lms/marketing/quiz-campaigns/:id - Update QuizCampaign
router.patch('/marketing/quiz-campaigns/:id', requireAuth, requireInstructor, asyncHandler(QuizCampaignController.updateCampaign));

// DELETE /api/v1/lms/marketing/quiz-campaigns/:id - Delete QuizCampaign
router.delete('/marketing/quiz-campaigns/:id', requireAuth, requireInstructor, asyncHandler(QuizCampaignController.deleteCampaign));

// POST /api/v1/lms/marketing/quiz-campaigns/:id/activate - Activate QuizCampaign
router.post('/marketing/quiz-campaigns/:id/activate', requireAuth, requireInstructor, asyncHandler(QuizCampaignController.activateCampaign));

// POST /api/v1/lms/marketing/quiz-campaigns/:id/pause - Pause QuizCampaign
router.post('/marketing/quiz-campaigns/:id/pause', requireAuth, requireInstructor, asyncHandler(QuizCampaignController.pauseCampaign));

// POST /api/v1/lms/marketing/quiz-campaigns/:id/complete - Complete QuizCampaign
router.post('/marketing/quiz-campaigns/:id/complete', requireAuth, requireInstructor, asyncHandler(QuizCampaignController.completeCampaign));

// POST /api/v1/lms/marketing/quiz-campaigns/:id/archive - Archive QuizCampaign
router.post('/marketing/quiz-campaigns/:id/archive', requireAuth, requireInstructor, asyncHandler(QuizCampaignController.archiveCampaign));

// POST /api/v1/lms/marketing/quiz-campaigns/:id/participation - Record Participation
router.post('/marketing/quiz-campaigns/:id/participation', requireAuth, asyncHandler(QuizCampaignController.recordParticipation));

// POST /api/v1/lms/marketing/quiz-campaigns/:id/completion - Record Completion
router.post('/marketing/quiz-campaigns/:id/completion', requireAuth, asyncHandler(QuizCampaignController.recordCompletion));

// ========================================
// MARKETING: SURVEY CAMPAIGN ROUTES (Phase 2 Refoundation)
// ========================================

// POST /api/v1/lms/marketing/survey-campaigns - Create SurveyCampaign
router.post('/marketing/survey-campaigns', requireAuth, requireInstructor, asyncHandler(SurveyCampaignController.createCampaign));

// GET /api/v1/lms/marketing/survey-campaigns - List SurveyCampaigns
router.get('/marketing/survey-campaigns', requireAuth, asyncHandler(SurveyCampaignController.listCampaigns));

// GET /api/v1/lms/marketing/survey-campaigns/active - Get Active SurveyCampaigns
router.get('/marketing/survey-campaigns/active', requireAuth, asyncHandler(SurveyCampaignController.findActiveCampaigns));

// GET /api/v1/lms/marketing/survey-campaigns/:id - Get SurveyCampaign by ID
router.get('/marketing/survey-campaigns/:id', requireAuth, asyncHandler(SurveyCampaignController.getCampaign));

// PATCH /api/v1/lms/marketing/survey-campaigns/:id - Update SurveyCampaign
router.patch('/marketing/survey-campaigns/:id', requireAuth, requireInstructor, asyncHandler(SurveyCampaignController.updateCampaign));

// DELETE /api/v1/lms/marketing/survey-campaigns/:id - Delete SurveyCampaign
router.delete('/marketing/survey-campaigns/:id', requireAuth, requireInstructor, asyncHandler(SurveyCampaignController.deleteCampaign));

// POST /api/v1/lms/marketing/survey-campaigns/:id/activate - Activate SurveyCampaign
router.post('/marketing/survey-campaigns/:id/activate', requireAuth, requireInstructor, asyncHandler(SurveyCampaignController.activateCampaign));

// POST /api/v1/lms/marketing/survey-campaigns/:id/pause - Pause SurveyCampaign
router.post('/marketing/survey-campaigns/:id/pause', requireAuth, requireInstructor, asyncHandler(SurveyCampaignController.pauseCampaign));

// POST /api/v1/lms/marketing/survey-campaigns/:id/complete - Complete SurveyCampaign
router.post('/marketing/survey-campaigns/:id/complete', requireAuth, requireInstructor, asyncHandler(SurveyCampaignController.completeCampaign));

// POST /api/v1/lms/marketing/survey-campaigns/:id/archive - Archive SurveyCampaign
router.post('/marketing/survey-campaigns/:id/archive', requireAuth, requireInstructor, asyncHandler(SurveyCampaignController.archiveCampaign));

// POST /api/v1/lms/marketing/survey-campaigns/:id/response - Record Response
router.post('/marketing/survey-campaigns/:id/response', requireAuth, asyncHandler(SurveyCampaignController.recordResponse));

// POST /api/v1/lms/marketing/survey-campaigns/:id/completed - Record Completed
router.post('/marketing/survey-campaigns/:id/completed', requireAuth, asyncHandler(SurveyCampaignController.recordCompleted));

// ========================================
// INSTRUCTOR ROUTES (WO-LMS-INSTRUCTOR-ROLE-V1)
// ========================================

// POST /api/v1/lms/instructor/apply - Apply for Instructor Role
router.post('/instructor/apply', requireAuth, asyncHandler(InstructorController.apply));

// GET /api/v1/lms/instructor/applications - List Instructor Applications (Admin)
router.get('/instructor/applications', requireAdmin, asyncHandler(InstructorController.listApplications));

// POST /api/v1/lms/instructor/applications/:id/approve - Approve Application (Admin)
router.post('/instructor/applications/:id/approve', requireAdmin, asyncHandler(InstructorController.approveApplication));

// POST /api/v1/lms/instructor/applications/:id/reject - Reject Application (Admin)
router.post('/instructor/applications/:id/reject', requireAdmin, asyncHandler(InstructorController.rejectApplication));

// GET /api/v1/lms/instructor/courses - My Courses (Instructor)
router.get('/instructor/courses', requireAuth, requireInstructor, asyncHandler(InstructorController.myCourses));

// GET /api/v1/lms/instructor/enrollments - Pending Enrollments for My Courses (Instructor)
router.get('/instructor/enrollments', requireAuth, requireInstructor, asyncHandler(InstructorController.pendingEnrollments));

// POST /api/v1/lms/instructor/enrollments/:id/approve - Approve Enrollment (Instructor)
router.post('/instructor/enrollments/:id/approve', requireAuth, requireInstructor, asyncHandler(InstructorController.approveEnrollment));

// POST /api/v1/lms/instructor/enrollments/:id/reject - Reject Enrollment (Instructor)
router.post('/instructor/enrollments/:id/reject', requireAuth, requireInstructor, asyncHandler(InstructorController.rejectEnrollment));

export default router;
