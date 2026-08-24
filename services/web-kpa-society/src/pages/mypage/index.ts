export { MyDashboardPage } from './MyDashboardPage';
export { MyProfilePage } from './MyProfilePage';
export { MySettingsPage } from './MySettingsPage';
export { MyCertificatesPage } from './MyCertificatesPage';
// WO-O4O-YAKSA-REPORTS-NONFUNCTIONAL-UI-AND-DEAD-CONTRACT-REMOVAL-V1:
//   PersonalStatusReportPage 제거. route 등록 없이 barrel 만 export 됐던 Mock 화면이며,
//   제출 대상 신상신고 백엔드 도메인이 존재하지 않는다.
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
