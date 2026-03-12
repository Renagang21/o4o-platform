import { Router } from 'express';
import { CourseController } from '../controllers/CourseController.js';
import { LessonController } from '../controllers/LessonController.js';
import { EnrollmentController } from '../controllers/EnrollmentController.js';
import { CertificateController } from '../controllers/CertificateController.js';
// WO-LMS-INSTRUCTOR-ROLE-V1
import { InstructorController } from '../controllers/InstructorController.js';
import { requireAuth } from '../../../common/middleware/auth.middleware.js';
import { asyncHandler } from '../../../middleware/error-handler.js';
import { requireEnrollment } from '../middleware/requireEnrollment.js';
import { requireInstructor } from '../middleware/requireInstructor.js';
// WO-KPA-A-GUARD-STANDARDIZATION-FINAL-V1: KPA scope guard replaces legacy requireKpaAdmin
import { KPA_SCOPE_CONFIG } from '@o4o/security-core';
import { createMembershipScopeGuard } from '../../../common/middleware/membership-guard.middleware.js';
const requireKpaAdmin = createMembershipScopeGuard(KPA_SCOPE_CONFIG)('kpa:admin');

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
// CERTIFICATE ROUTES
// ========================================

// POST /api/v1/lms/certificates/issue - Issue Certificate
router.post('/certificates/issue', requireAuth, requireKpaAdmin, asyncHandler(CertificateController.issueCertificate));

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
router.patch('/certificates/:id', requireAuth, requireKpaAdmin, asyncHandler(CertificateController.updateCertificate));

// POST /api/v1/lms/certificates/:id/revoke - Revoke Certificate
router.post('/certificates/:id/revoke', requireAuth, requireKpaAdmin, asyncHandler(CertificateController.revokeCertificate));

// POST /api/v1/lms/certificates/:id/renew - Renew Certificate
router.post('/certificates/:id/renew', requireAuth, requireKpaAdmin, asyncHandler(CertificateController.renewCertificate));

// ========================================
// INSTRUCTOR ROUTES (WO-LMS-INSTRUCTOR-ROLE-V1)
// ========================================

// POST /api/v1/lms/instructor/apply - Apply for Instructor Role
router.post('/instructor/apply', requireAuth, asyncHandler(InstructorController.apply));

// GET /api/v1/lms/instructor/applications - List Instructor Applications (Admin)
router.get('/instructor/applications', requireKpaAdmin, asyncHandler(InstructorController.listApplications));

// POST /api/v1/lms/instructor/applications/:id/approve - Approve Application (Admin)
router.post('/instructor/applications/:id/approve', requireKpaAdmin, asyncHandler(InstructorController.approveApplication));

// POST /api/v1/lms/instructor/applications/:id/reject - Reject Application (Admin)
router.post('/instructor/applications/:id/reject', requireKpaAdmin, asyncHandler(InstructorController.rejectApplication));

// GET /api/v1/lms/instructor/courses - My Courses (Instructor)
router.get('/instructor/courses', requireAuth, requireInstructor, asyncHandler(InstructorController.myCourses));

// GET /api/v1/lms/instructor/enrollments - Pending Enrollments for My Courses (Instructor)
router.get('/instructor/enrollments', requireAuth, requireInstructor, asyncHandler(InstructorController.pendingEnrollments));

// POST /api/v1/lms/instructor/enrollments/:id/approve - Approve Enrollment (Instructor)
router.post('/instructor/enrollments/:id/approve', requireAuth, requireInstructor, asyncHandler(InstructorController.approveEnrollment));

// POST /api/v1/lms/instructor/enrollments/:id/reject - Reject Enrollment (Instructor)
router.post('/instructor/enrollments/:id/reject', requireAuth, requireInstructor, asyncHandler(InstructorController.rejectEnrollment));

// ========================================
// TEMPLATE ROUTES (WO-O4O-TEMPLATE-SYSTEM-FOUNDATION)
// ========================================
import { TemplateController } from '../controllers/TemplateController.js';
// WO-O4O-STORE-CONTENT-COPY
import { StoreContentController } from '../controllers/StoreContentController.js';

// Library sub-paths (must be before /:id to avoid parameter capture)

// GET /api/v1/lms/templates/search - Search Templates (Library)
router.get('/templates/search', requireAuth, asyncHandler(TemplateController.searchTemplates));

// GET /api/v1/lms/templates/library - List Library Templates
router.get('/templates/library', requireAuth, asyncHandler(TemplateController.listLibrary));

// GET /api/v1/lms/templates/tags - List Tags
router.get('/templates/tags', requireAuth, asyncHandler(TemplateController.listTags));

// POST /api/v1/lms/templates/tags - Create Tag
router.post('/templates/tags', requireAuth, requireInstructor, asyncHandler(TemplateController.createTag));

// GET /api/v1/lms/templates/categories - List Categories
router.get('/templates/categories', requireAuth, asyncHandler(TemplateController.listCategories));

// POST /api/v1/lms/templates/categories - Create Category
router.post('/templates/categories', requireAuth, requireInstructor, asyncHandler(TemplateController.createCategory));

// Block/Version sub-paths

// GET /api/v1/lms/templates/versions/:versionId/blocks - Get Blocks
router.get('/templates/versions/:versionId/blocks', requireAuth, asyncHandler(TemplateController.getBlocks));

// POST /api/v1/lms/templates/versions/:versionId/blocks - Add Block
router.post('/templates/versions/:versionId/blocks', requireAuth, requireInstructor, asyncHandler(TemplateController.addBlock));

// POST /api/v1/lms/templates/versions/:versionId/blocks/reorder - Reorder Blocks
router.post('/templates/versions/:versionId/blocks/reorder', requireAuth, requireInstructor, asyncHandler(TemplateController.reorderBlocks));

// PATCH /api/v1/lms/templates/blocks/:blockId - Update Block
router.patch('/templates/blocks/:blockId', requireAuth, requireInstructor, asyncHandler(TemplateController.updateBlock));

// DELETE /api/v1/lms/templates/blocks/:blockId - Delete Block
router.delete('/templates/blocks/:blockId', requireAuth, requireInstructor, asyncHandler(TemplateController.removeBlock));

// Template CRUD

// POST /api/v1/lms/templates - Create Template
router.post('/templates', requireAuth, requireInstructor, asyncHandler(TemplateController.createTemplate));

// GET /api/v1/lms/templates - List Templates
router.get('/templates', requireAuth, asyncHandler(TemplateController.listTemplates));

// GET /api/v1/lms/templates/:id - Get Template by ID
router.get('/templates/:id', requireAuth, asyncHandler(TemplateController.getTemplate));

// PATCH /api/v1/lms/templates/:id - Update Template
router.patch('/templates/:id', requireAuth, requireInstructor, asyncHandler(TemplateController.updateTemplate));

// DELETE /api/v1/lms/templates/:id - Delete Template
router.delete('/templates/:id', requireAuth, requireInstructor, asyncHandler(TemplateController.deleteTemplate));

// POST /api/v1/lms/templates/:id/versions - Create Version
router.post('/templates/:id/versions', requireAuth, requireInstructor, asyncHandler(TemplateController.createVersion));

// GET /api/v1/lms/templates/:id/versions - List Versions
router.get('/templates/:id/versions', requireAuth, asyncHandler(TemplateController.getVersions));

// POST /api/v1/lms/templates/:id/publish - Publish Template
router.post('/templates/:id/publish', requireAuth, requireInstructor, asyncHandler(TemplateController.publishTemplate));

// POST /api/v1/lms/templates/:id/archive - Archive Template
router.post('/templates/:id/archive', requireAuth, requireInstructor, asyncHandler(TemplateController.archiveTemplate));

// GET /api/v1/lms/templates/:id/preview - Template Preview
router.get('/templates/:id/preview', requireAuth, asyncHandler(TemplateController.getTemplatePreview));

// GET /api/v1/lms/templates/:id/tags - Get Template Tags
router.get('/templates/:id/tags', requireAuth, asyncHandler(TemplateController.getTemplateTags));

// POST /api/v1/lms/templates/:id/tags - Add Tag to Template
router.post('/templates/:id/tags', requireAuth, requireInstructor, asyncHandler(TemplateController.addTagToTemplate));

// DELETE /api/v1/lms/templates/:id/tags/:tagId - Remove Tag from Template
router.delete('/templates/:id/tags/:tagId', requireAuth, requireInstructor, asyncHandler(TemplateController.removeTagFromTemplate));

// GET /api/v1/lms/templates/:id/categories - Get Template Categories
router.get('/templates/:id/categories', requireAuth, asyncHandler(TemplateController.getTemplateCategories));

// POST /api/v1/lms/templates/:id/categories - Add Category to Template
router.post('/templates/:id/categories', requireAuth, requireInstructor, asyncHandler(TemplateController.addCategoryToTemplate));

// DELETE /api/v1/lms/templates/:id/categories/:categoryId - Remove Category from Template
router.delete('/templates/:id/categories/:categoryId', requireAuth, requireInstructor, asyncHandler(TemplateController.removeCategoryFromTemplate));

// ========================================
// PUBLIC CONTENT (WO-O4O-STORE-CONTENT-USAGE) — NO AUTH
// ========================================

// GET /api/v1/lms/content/:slug - Public Content by slug (no auth)
router.get('/content/:slug', asyncHandler(StoreContentController.getPublicContent));

// ========================================
// STORE CONTENT ROUTES (WO-O4O-STORE-CONTENT-COPY)
// ========================================

// POST /api/v1/lms/store-contents/copy - Copy Template to Store (before /:id)
router.post('/store-contents/copy', requireAuth, asyncHandler(StoreContentController.copyTemplate));

// GET /api/v1/lms/store-contents - List Store Contents
router.get('/store-contents', requireAuth, asyncHandler(StoreContentController.listStoreContents));

// GET /api/v1/lms/store-contents/:id - Get Store Content
router.get('/store-contents/:id', requireAuth, asyncHandler(StoreContentController.getStoreContent));

// PATCH /api/v1/lms/store-contents/:id - Update Store Content
router.patch('/store-contents/:id', requireAuth, asyncHandler(StoreContentController.updateStoreContent));

// DELETE /api/v1/lms/store-contents/:id - Delete Store Content
router.delete('/store-contents/:id', requireAuth, asyncHandler(StoreContentController.deleteStoreContent));

// GET /api/v1/lms/store-contents/:id/blocks - Get Store Content Blocks
router.get('/store-contents/:id/blocks', requireAuth, asyncHandler(StoreContentController.getBlocks));

// PATCH /api/v1/lms/store-content-blocks/:blockId - Update Store Content Block
router.patch('/store-content-blocks/:blockId', requireAuth, asyncHandler(StoreContentController.updateBlock));

// ========================================
// STORE CONTENT USAGE (WO-O4O-STORE-CONTENT-USAGE)
// ========================================

// GET /api/v1/lms/store-contents/:id/sns - SNS Share Payload
router.get('/store-contents/:id/sns', requireAuth, asyncHandler(StoreContentController.getSNSContent));

// GET /api/v1/lms/store-contents/:id/pop - POP Display Payload
router.get('/store-contents/:id/pop', requireAuth, asyncHandler(StoreContentController.getPOPContent));

// GET /api/v1/lms/store-contents/:id/qr - QR Code Generation
router.get('/store-contents/:id/qr', requireAuth, asyncHandler(StoreContentController.getQRCode));

// ========================================
// CONTENT ANALYTICS (WO-O4O-CONTENT-ANALYTICS)
// ========================================

// POST /api/v1/lms/content-analytics/track - Track Analytics Event
router.post('/content-analytics/track', requireAuth, asyncHandler(StoreContentController.trackAnalyticsEvent));

// GET /api/v1/lms/content-analytics/content/:storeContentId - Get Content Analytics
router.get('/content-analytics/content/:storeContentId', requireAuth, asyncHandler(StoreContentController.getContentAnalytics));

// GET /api/v1/lms/content-analytics/store/:storeId - Get Store Analytics
router.get('/content-analytics/store/:storeId', requireAuth, asyncHandler(StoreContentController.getStoreAnalytics));

export default router;
