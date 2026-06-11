export { MyDashboardPage } from './MyDashboardPage';
export { MyProfilePage } from './MyProfilePage';
export { MySettingsPage } from './MySettingsPage';
export { MyCertificatesPage } from './MyCertificatesPage';
export { PersonalStatusReportPage } from './PersonalStatusReportPage';
export { AnnualReportFormPage } from './AnnualReportFormPage';
export { default as MyForumDashboardPage } from './MyForumDashboardPage';
export { default as RequestCategoryPage } from './RequestCategoryPage';
export { default as MyRequestsPage } from './MyRequestsPage';
export { default as ForumMemberManagementPage } from './ForumMemberManagementPage';
export { MyQualificationsPage } from './MyQualificationsPage';
export { MyEnrollmentsPage } from './MyEnrollmentsPage'; // WO-O4O-ENROLLMENT-SYSTEM-V1
export { MyCreditsPage } from './MyCreditsPage'; // WO-O4O-CREDIT-SYSTEM-V1
// WO-O4O-MYPAGE-TIER1-DEAD-STUB-CLEANUP-V1:
//   MyCompletionsPage 제거. /mypage/completions → /mypage/certificates redirect 유지.
//   route 에서 import 없이 barrel 만 export 됐던 legacy.
