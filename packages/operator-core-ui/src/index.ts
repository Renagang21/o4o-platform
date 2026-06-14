/**
 * @o4o/operator-core-ui
 *
 * WO-O4O-OPERATOR-STORES-CORE-EXTRACTION-V1
 * 설계 기준: docs/architecture/OPERATOR-CORE-DESIGN-V1.md
 *
 * Operator 영역의 페이지 수준 모듈 컬렉션. `@o4o/operator-ux-core` (공유 UI 원시)
 * 위에 빌드된 페이지 모듈(Stores, Users, Forum Analytics 등)을 모은다.
 *
 * 본 패키지는 Operator 페이지 전용이며, OPERATOR-DATATABLE-POLICY-V1 §2.1 표준에 따라
 * `@o4o/operator-ux-core` 의 DataTable 만 사용한다.
 */

// Stores Module
export {
  OperatorStoresList,
  useStoresQuery,
} from './modules/stores';
export type {
  OperatorStoreBase,
  StoresApi,
  StoresConfig,
  StoresListParams,
  StoresListResponse,
  StoresListPagination,
  StoresListStats,
  StoresRowAction,
  OperatorStoresListProps,
  UseStoresQueryArgs,
  UseStoresQueryResult,
} from './modules/stores';

// Guide Contents Module
export { GuideContentsManager } from './modules/guide-contents';
export type {
  GuideSection,
  GuideContentsConfig,
  GuideContentsClient,
  GuideContentsManagerProps,
} from './modules/guide-contents';

// CMS Content Module (WO-O4O-CONTENT-CANONICAL-CROSS-SERVICE-ALIGNMENT-V1)
export { CmsContentManager } from './modules/cms-content';
export type { CmsContentManagerProps } from './modules/cms-content';

// LMS Operator Courses Module (WO-O4O-LMS-OPERATOR-COURSES-MANAGER-EXTRACTION-V1)
export { OperatorLmsCoursesManager } from './modules/lms-courses';
export type {
  OperatorLmsCourse,
  OperatorLmsCoursesApi,
  OperatorLmsCoursesListParams,
  OperatorLmsCoursesConfig,
  OperatorLmsCoursesManagerProps,
} from './modules/lms-courses';

// LMS Instructor Courses Module (WO-O4O-LMS-INSTRUCTOR-COURSE-LIST-MANAGER-EXTRACTION-V1)
export { InstructorCoursesManager } from './modules/instructor-courses';
export type {
  InstructorCourse,
  InstructorCourseRowAction,
  InstructorCoursesApi,
  InstructorCoursesRoutes,
  InstructorCoursesConfig,
  InstructorCoursesManagerProps,
} from './modules/instructor-courses';

// LMS Instructor Course Form Shell (WO-O4O-LMS-INSTRUCTOR-COURSE-FORM-SHELL-V1)
export { InstructorCourseFormShell } from './modules/instructor-course-form';
export type {
  CourseFormVisibility,
  CourseFormReusablePolicy,
  InstructorCourseFormValues,
  InstructorCourseFormConfig,
  InstructorCourseFormShellProps,
} from './modules/instructor-course-form';

// LMS Instructor Lesson List Module (WO-O4O-LMS-INSTRUCTOR-LESSON-LIST-MANAGER-V1)
export { InstructorLessonListManager } from './modules/instructor-lesson-list';
export type {
  InstructorLessonListItem,
  InstructorLessonListHandle,
  InstructorLessonListManagerProps,
} from './modules/instructor-lesson-list';

// Common EditUserModal (WO-O4O-OPERATOR-EDITUSER-MODAL-PHASE1-NETURE-GP-KCOS-V1)
export { CommonEditUserModal } from './modules/members';
export type {
  EditUserModalOption,
  EditUserModalConfig,
  ProfileClassificationConfig,
  ApiRequestFn,
  CommonEditUserModalProps,
} from './modules/members';

// KPA EditUserModal (WO-O4O-OPERATOR-EDITUSER-MODAL-KPA-INTEGRATION-V1)
export { KpaEditUserModal } from './modules/members';
export type {
  KpaMemberStatus,
  KpaMemberBusinessInfo,
  KpaMemberForEdit,
  KpaEditUserModalProps,
} from './modules/members';

// Dashboard Modules (WO-O4O-OPERATOR-DASHBOARD-AXIS-NAVIGATION-COMMONIZATION-V1)
export { AxisNavigationSection } from './dashboard/AxisNavigationSection';
export type {
  AxisMetric,
  AxisLink,
  OperatorAxisGroup,
  AxisNavigationSectionProps,
} from './dashboard/AxisNavigationSection';

// Product Applications Module (WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1)
export { ProductApplicationManagementConsole } from './modules/product-applications';
export type {
  ProductApplication,
  ProductApplicationStats,
  ProductApplicationStatusFilter,
  ProductApplicationListParams,
  ProductApplicationListResult,
  ProductApplicationAiSummary,
  ProductApplicationsApi,
  ProductApplicationsAccent,
  ProductApplicationsConfig,
  ProductApplicationManagementConsoleProps,
} from './modules/product-applications';
