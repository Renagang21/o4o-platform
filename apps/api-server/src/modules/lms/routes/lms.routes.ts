import { Router } from 'express';
import { CourseController } from '../controllers/CourseController.js';
import { LessonController } from '../controllers/LessonController.js';
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
// ENROLLMENT ROUTES (TODO)
// ========================================

// ========================================
// PROGRESS ROUTES (TODO)
// ========================================

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
