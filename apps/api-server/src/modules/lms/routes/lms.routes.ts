import { Router } from 'express';
import { CourseController } from '../controllers/CourseController.js';
import { LessonController } from '../controllers/LessonController.js';
import { EnrollmentController } from '../controllers/EnrollmentController.js';
import { ProgressController } from '../controllers/ProgressController.js';
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
// CERTIFICATE ROUTES (TODO)
// ========================================

// ========================================
// EVENTS ROUTES (TODO)
// ========================================

// ========================================
// ATTENDANCE ROUTES (TODO)
// ========================================

export default router;
