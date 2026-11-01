# IR-O4O-UNIFIED-OPERATIONS-FUNCTION-COVERAGE-V1

> 현행 안내(2026-10-31): 협업체 이름은 **드럭스토어형 약국**, 현재 주소는 `https://drugstore.neture.co.kr`다.
> **과거 증적의 대상 보존:** 아래 “해당 협업체(당시 구명칭)”·“당시 협업체 구호스트”는 개명·주소 변경 전의 관측 대상이다. 아래 성공·실패·배포 결과를 현재 이름·주소의 운영 검증으로 읽지 않는다. 사용자 지시로 이전 표시명·주소 문자열은 재게시하지 않으며, 문서 경로와 기술 키의 현행 참조 정합은 과거 재실행을 뜻하지 않는다. 당시 원문·실제 호스트 식별자는 기존 Git 이력에서 확인하며 이력을 변경하지 않는다.

> **상태**: ACTIVE · 모집단 확보, 업무·API·권한 대조 및 중앙 구현 진행 중
> **작성일**: 2026-10-28 (Asia/Seoul)
> **기준**: main `872cbc73fdcdc261dc77c6ccf0f2e5ffd4a87c9d`
> **작업**: [통합 운영 TODO](../work-orders/WO-O4O-UNIFIED-OPERATIONS-WORKSPACE-V1.md)

사용자의 강사 신청·개설, 포럼 개설, 펀딩 개설 언급은 예시다. 아래 모집단 전체와 실제 메뉴·화면 내부 탭·API를 대조하여 직영 운영 업무를 연결한다. 기존 route의 존재만으로 현행 사업 기능·중앙 통합 대상이라고 판정하지 않는다.

## 모집단과 처리 기준

JSX AST에서 운영·관리 route 선언 164개를 추출했다. 별도 route 없이 화면 내부 탭으로 운영하는 Partner 업무도 별도 목록에 포함한다. 이 수는 구현 완료 수가 아니며 동일 업무의 별칭·상세·이전 주소와 독립 조직 화면도 포함한다.

- 각 route의 실제 역할·membership·조직·host 가드, backend endpoint, 현행 문서와 메뉴를 대조한다.
- 직영 서비스 업무는 중앙에서 실제 실행하도록 연결한다. 독립 협업체와 사업자의 자기 업무는 자체 화면·권한을 유지한다.
- redirect는 기존 주소 호환 대상으로 검증하며 별도 신규 기능으로 만들지 않는다.
- 공통 상품 DB·영구 삭제·중요 설정은 기존 Admin 전용 경계를 유지한다.
- 중앙 연결 여부와 직접 URL/API 차단, PC/mobile 검증을 각각 확인한다. 외부 링크만 제공한 항목을 중앙 구현 완료로 계산하지 않는다.

## Route별 대조 목록

아래는 소스 위치와 현재 구현 소비처를 보존한 작업용 전체 목록이다. `대조 중`은 승인 질문이 아니라 개발자가 현재 정책·실행 코드로 판정하고 있는 항목이다.

| 번호 | 소스 | 경로 | 구현 | 현재 가드/레이아웃 | 처리 분류 | 중앙 실행·API 검증 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `services/web-neture/src/App.tsx:772` | `/operator/service-contact/:serviceKey/settings` | `ServiceContactSettingsPage` | NetureLayout | 직영 운영·권한 대조 중 | 대조 중 |
| 2 | `services/web-neture/src/App.tsx:773` | `/operator/service-contact/:serviceKey` | `ServiceContactPage` | NetureLayout | 직영 운영·권한 대조 중 | 대조 중 |
| 3 | `services/web-neture/src/App.tsx:774` | `/operator/inbox/open/:kind/:scopeKey` | `OperatorInboxEntryPage` | NetureLayout | 직영 운영·권한 대조 중 | 대조 중 |
| 4 | `services/web-neture/src/App.tsx:775` | `/operator/inbox/business/:businessKey` | `OperatorInboxPage` | NetureLayout | 직영 운영·권한 대조 중 | 대조 중 |
| 5 | `services/web-neture/src/App.tsx:1074` | `/admin` | `AdminDashboardPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 6 | `services/web-neture/src/App.tsx:1075` | `/admin/users` | `UsersManagementPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 7 | `services/web-neture/src/App.tsx:1076` | `/admin/users/:id` | `UserDetailPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 8 | `services/web-neture/src/App.tsx:1077` | `/admin/stores` | `StoreManagementPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 9 | `services/web-neture/src/App.tsx:1078` | `/admin/orders` | `OrdersManagementPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 10 | `services/web-neture/src/App.tsx:1081` | `/admin/ai-report` | `Navigate` | AdminRoute / AdminLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 11 | `services/web-neture/src/App.tsx:1082` | `/admin/settings/notifications` | `EmailNotificationSettingsPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 12 | `services/web-neture/src/App.tsx:1084` | `/admin/applications` | `Navigate` | AdminRoute / AdminLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 13 | `services/web-neture/src/App.tsx:1085` | `/admin/community` | `ForumManagementPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 14 | `services/web-neture/src/App.tsx:1086` | `/admin/forum-delete-requests` | `ForumDeleteRequestsPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 15 | `services/web-neture/src/App.tsx:1088` | `/admin/forum-deleted` | `ForumDeletedManagementPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 16 | `services/web-neture/src/App.tsx:1089` | `/admin/forum-analytics` | `ForumAnalyticsPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 17 | `services/web-neture/src/App.tsx:1091` | `/admin/all-products` | `Navigate` | AdminRoute / AdminLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 18 | `services/web-neture/src/App.tsx:1092` | `/admin/ai-card-report` | `AiCardReportPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 19 | `services/web-neture/src/App.tsx:1093` | `/admin/ai-operations` | `AiOperationsPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 20 | `services/web-neture/src/App.tsx:1095` | `/admin/homepage-cms` | `HomepageCmsPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 21 | `services/web-neture/src/App.tsx:1096` | `/admin/analytics` | `OperatorAnalyticsPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 22 | `services/web-neture/src/App.tsx:1098` | `/admin/category-mapping-rules` | `CategoryMappingRulesPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 23 | `services/web-neture/src/App.tsx:1099` | `/admin/roles` | `Navigate` | AdminRoute / AdminLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 24 | `services/web-neture/src/App.tsx:1100` | `/admin/categories` | `CategoryManagementPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 25 | `services/web-neture/src/App.tsx:1101` | `/admin/brands` | `BrandManagementPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 26 | `services/web-neture/src/App.tsx:1102` | `/admin/product-cleanup` | `ProductDataCleanupPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 27 | `services/web-neture/src/App.tsx:1103` | `/admin/product-service-approvals` | `ProductServiceApprovalPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 28 | `services/web-neture/src/App.tsx:1105` | `/admin/actions` | `OperatorActionQueuePage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 29 | `services/web-neture/src/App.tsx:1108` | `/admin/members` | `AdminMemberManagementPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 30 | `services/web-neture/src/App.tsx:1109` | `/admin/operators` | `OperatorsPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 31 | `services/web-neture/src/App.tsx:1110` | `/admin/contact-messages` | `AdminContactMessagesPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 32 | `services/web-neture/src/App.tsx:1111` | `/admin/service-approvals` | `AdminServiceApprovalPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 33 | `services/web-neture/src/App.tsx:1113` | `/admin/masters` | `AdminMasterManagementPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 34 | `services/web-neture/src/App.tsx:1114` | `/admin/catalog-import` | `CatalogImportDashboardPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 35 | `services/web-neture/src/App.tsx:1115` | `/admin/catalog-import/csv` | `CSVImportPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 36 | `services/web-neture/src/App.tsx:1116` | `/admin/catalog-import/history` | `ImportHistoryPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 37 | `services/web-neture/src/App.tsx:1117` | `/admin/settlements` | `AdminSettlementsPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 38 | `services/web-neture/src/App.tsx:1118` | `/admin/community-admin` | `CommunityManagementPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 39 | `services/web-neture/src/App.tsx:1119` | `/admin/ai-admin` | `AiAdminDashboardPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 40 | `services/web-neture/src/App.tsx:1120` | `/admin/ai-admin/engines` | `AiEnginesPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 41 | `services/web-neture/src/App.tsx:1121` | `/admin/ai-admin/policy` | `AiPolicyPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 42 | `services/web-neture/src/App.tsx:1122` | `/admin/ai-admin/cost` | `AiCostPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 43 | `services/web-neture/src/App.tsx:1123` | `/admin/ai-admin/context-assets` | `ContextAssetListPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 44 | `services/web-neture/src/App.tsx:1124` | `/admin/ai-admin/context-assets/new` | `ContextAssetFormPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 45 | `services/web-neture/src/App.tsx:1125` | `/admin/ai-admin/context-assets/:id/edit` | `ContextAssetFormPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 46 | `services/web-neture/src/App.tsx:1126` | `/admin/ai-admin/composition-rules` | `AnswerCompositionRulesPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 47 | `services/web-neture/src/App.tsx:1127` | `/admin/ai-card-rules` | `AiCardExplainPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 48 | `services/web-neture/src/App.tsx:1128` | `/admin/ai-business-pack` | `AiBusinessPackPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 49 | `services/web-neture/src/App.tsx:1129` | `/admin/settings/email` | `EmailSettingsPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 50 | `services/web-neture/src/App.tsx:1130` | `/admin/settings/legal-terms` | `ServiceLegalSettingsPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 51 | `services/web-neture/src/App.tsx:1132` | `/admin/settings/contact` | `ServiceContactSettingsPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 52 | `services/web-neture/src/App.tsx:1135` | `/admin/semi-franchises` | `AdminSemiFranchisePage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 53 | `services/web-neture/src/App.tsx:1136` | `/admin/pharmacy-service-settings` | `AdminPharmacyServiceSettingsPage` | AdminRoute / AdminLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 54 | `services/web-neture/src/App.tsx:1155` | `/admin/admin-suppliers` | `Navigate` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 55 | `services/web-neture/src/App.tsx:1157` | `/admin/supplier-quality` | `Navigate` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 56 | `services/web-neture/src/App.tsx:1158` | `/operator/legal/supplier` | `SubdomainOperatorRoute` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 57 | `services/web-neture/src/App.tsx:1159` | `/admin/supplier-governance` | `AdminSupplierGovernancePage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 58 | `services/web-neture/src/App.tsx:1160` | `/admin/supplier-governance/operators` | `OperatorsPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 59 | `services/web-neture/src/App.tsx:1168` | `/operator/supplier-quality` | `Navigate` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 60 | `services/web-neture/src/App.tsx:1170` | `/operator/inbox/supplier` | `OperatorInboxPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 61 | `services/web-neture/src/App.tsx:1171` | `/operator/service-members/supplier` | `ServiceMembersPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 62 | `services/web-neture/src/App.tsx:1172` | `/operator/service-members/supplier/:id` | `ServiceMembersPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 63 | `services/web-neture/src/App.tsx:1173` | `/operator/home-presentation/supplier` | `HomePresentationPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 64 | `services/web-neture/src/App.tsx:1174` | `/operator/suppliers` | `OperatorSupplierApprovalPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 65 | `services/web-neture/src/App.tsx:1182` | `/admin/market-trial` | `Navigate` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 66 | `services/web-neture/src/App.tsx:1183` | `/operator/inbox/funding` | `OperatorInboxPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 67 | `services/web-neture/src/App.tsx:1184` | `/operator/service-members/funding` | `ServiceMembersPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 68 | `services/web-neture/src/App.tsx:1185` | `/operator/service-members/funding/:id` | `ServiceMembersPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 69 | `services/web-neture/src/App.tsx:1186` | `/operator/legal/funding` | `SubdomainOperatorRoute` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 70 | `services/web-neture/src/App.tsx:1187` | `/operator/home-presentation/funding` | `HomePresentationPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 71 | `services/web-neture/src/App.tsx:1188` | `/operator/market-trial/operators` | `SubdomainOperatorRoute` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 72 | `services/web-neture/src/App.tsx:1189` | `/operator/market-trial` | `MarketTrialApprovalsPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 73 | `services/web-neture/src/App.tsx:1190` | `/operator/market-trial/:id` | `MarketTrialApprovalDetailPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 74 | `services/web-neture/src/App.tsx:1197` | `/operator/inbox/community` | `OperatorInboxPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 75 | `services/web-neture/src/App.tsx:1198` | `/operator/service-members/community` | `ServiceMembersPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 76 | `services/web-neture/src/App.tsx:1199` | `/operator/service-members/community/:id` | `ServiceMembersPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 77 | `services/web-neture/src/App.tsx:1200` | `/operator/home-presentation/community` | `HomePresentationPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 78 | `services/web-neture/src/App.tsx:1201` | `/operator/communities/home` | `CommunityHomeManagementPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 79 | `services/web-neture/src/App.tsx:1202` | `/operator/communities` | `CommunityWorkspacePage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 80 | `services/web-neture/src/App.tsx:1203` | `/operator/communities/boards` | `CommunityServiceManagementPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 81 | `services/web-neture/src/App.tsx:1205` | `/operator/forum-delete` | `Navigate` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 82 | `services/web-neture/src/App.tsx:1206` | `/operator/forum-delete-requests` | `Navigate` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 83 | `services/web-neture/src/App.tsx:1207` | `/admin/forum-delete-requests` | `Navigate` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 84 | `services/web-neture/src/App.tsx:1215` | `/operator/legal/community` | `SubdomainOperatorRoute` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 85 | `services/web-neture/src/App.tsx:1216` | `/admin/communities` | `Navigate` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 86 | `services/web-neture/src/App.tsx:1217` | `/admin/communities/operators` | `OperatorsPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 87 | `services/web-neture/src/App.tsx:1218` | `/admin/communities/members` | `CommunityServiceManagementPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 88 | `services/web-neture/src/App.tsx:1219` | `/admin/communities/boards` | `CommunityServiceManagementPage` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 89 | `services/web-neture/src/App.tsx:1220` | `/admin/forum-deleted` | `Navigate` | SubdomainOperatorRoute / SubdomainOperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 90 | `services/web-neture/src/App.tsx:1234` | `/operator` | `NetureOperatorDashboard` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 91 | `services/web-neture/src/App.tsx:1235` | `/operator/inbox/neture` | `OperatorInboxPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 92 | `services/web-neture/src/App.tsx:1238` | `/operator/members` | `UsersManagementPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 93 | `services/web-neture/src/App.tsx:1239` | `/operator/members/:id` | `UserDetailPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 94 | `services/web-neture/src/App.tsx:1240` | `/operator/users` | `UsersManagementPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 95 | `services/web-neture/src/App.tsx:1241` | `/operator/users/:id` | `UserDetailPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 96 | `services/web-neture/src/App.tsx:1242` | `/operator/stores` | `StoreManagementPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 97 | `services/web-neture/src/App.tsx:1243` | `/operator/orders` | `OrdersManagementPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 98 | `services/web-neture/src/App.tsx:1244` | `/operator/ai-report` | `OperatorAiReportPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 99 | `services/web-neture/src/App.tsx:1245` | `/operator/settings/notifications` | `EmailNotificationSettingsPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 100 | `services/web-neture/src/App.tsx:1246` | `/operator/applications` | `RegistrationRequestsPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 101 | `services/web-neture/src/App.tsx:1247` | `/operator/community` | `ForumManagementPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 102 | `services/web-neture/src/App.tsx:1249` | `/operator/forum-delete` | `ForumDeletePage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 103 | `services/web-neture/src/App.tsx:1251` | `/operator/forum-delete-requests` | `ForumDeletePage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 104 | `services/web-neture/src/App.tsx:1252` | `/operator/forum-analytics` | `ForumAnalyticsPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 105 | `services/web-neture/src/App.tsx:1254` | `/operator/supply` | `Navigate` | OperatorRoute / OperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 106 | `services/web-neture/src/App.tsx:1255` | `/operator/all-products` | `Navigate` | OperatorRoute / OperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 107 | `services/web-neture/src/App.tsx:1256` | `/operator/all-registered-products` | `AllRegisteredProductsPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 108 | `services/web-neture/src/App.tsx:1261` | `/operator/ai-card-report` | `Navigate` | OperatorRoute / OperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 109 | `services/web-neture/src/App.tsx:1262` | `/operator/ai-operations` | `Navigate` | OperatorRoute / OperatorLayoutWrapper | 이전 주소·별칭 대조 | 대조 중 |
| 110 | `services/web-neture/src/App.tsx:1265` | `/operator/home-presentation/neture` | `HomePresentationPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 111 | `services/web-neture/src/App.tsx:1266` | `/operator/home-presentation/carepharm` | `HomePresentationPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 112 | `services/web-neture/src/App.tsx:1267` | `/operator/homepage-cms` | `HomepageCmsPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 113 | `services/web-neture/src/App.tsx:1269` | `/operator/guide-contents` | `OperatorGuideContentsPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 114 | `services/web-neture/src/App.tsx:1270` | `/operator/analytics` | `OperatorAnalyticsPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 115 | `services/web-neture/src/App.tsx:1271` | `/operator/category-mapping-rules` | `CategoryMappingRulesPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 116 | `services/web-neture/src/App.tsx:1273` | `/operator/product-service-approvals` | `ProductServiceApprovalPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 117 | `services/web-neture/src/App.tsx:1274` | `/operator/product-approvals` | `OperatorProductApprovalPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 118 | `services/web-neture/src/App.tsx:1276` | `/operator/product-candidates` | `ProductCandidateReviewPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 119 | `services/web-neture/src/App.tsx:1278` | `/operator/actions` | `OperatorActionQueuePage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 120 | `services/web-neture/src/App.tsx:1281` | `/operator/contact-messages` | `OperatorContactMessagesPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 121 | `services/web-neture/src/App.tsx:1283` | `/operator/pharmacy-memberships` | `PharmacyMembershipReviewPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 122 | `services/web-neture/src/App.tsx:1284` | `/operator/product-cleanup` | `ProductDataCleanupPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 123 | `services/web-neture/src/App.tsx:1285` | `/operator/semi-franchises` | `OperatorSemiFranchisePage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 124 | `services/web-neture/src/App.tsx:1286` | `/operator/semi-franchises/:key/contents/new` | `SemiFranchiseContentFormPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 125 | `services/web-neture/src/App.tsx:1287` | `/operator/semi-franchises/:key/contents/:id/edit` | `SemiFranchiseContentFormPage` | OperatorRoute / OperatorLayoutWrapper | 직영 운영·권한 대조 중 | 대조 중 |
| 126 | `services/web-neture/src/App.tsx:1317` | `/workspace/admin` | `Navigate` | 상위 경로·컴포넌트 내부 확인 | 이전 주소·별칭 대조 | 대조 중 |
| 127 | `services/web-neture/src/App.tsx:1318` | `/workspace/admin/*` | `Navigate` | 상위 경로·컴포넌트 내부 확인 | 이전 주소·별칭 대조 | 대조 중 |
| 128 | `services/web-neture/src/App.tsx:1319` | `/workspace/operator` | `Navigate` | 상위 경로·컴포넌트 내부 확인 | 이전 주소·별칭 대조 | 대조 중 |
| 129 | `services/web-lecture/src/App.tsx:72` | `/operator/operators` | `ServiceOperatorsPage` | AccessGate / SiteShell | 직영 운영·권한 대조 중 | 대조 중 |
| 130 | `services/web-lecture/src/App.tsx:74` | `/operator` | `OperatorCoursesPage` | AccessGate / SiteShell | 직영 운영·권한 대조 중 | 대조 중 |
| 131 | `services/web-lecture/src/App.tsx:75` | `/operator/home-presentation` | `HomePresentationPage` | AccessGate / SiteShell | 직영 운영·권한 대조 중 | 대조 중 |
| 132 | `services/web-lecture/src/App.tsx:76` | `/operator/inbox` | `OperatorInboxPage` | AccessGate / SiteShell | 직영 운영·권한 대조 중 | 대조 중 |
| 133 | `services/web-lecture/src/App.tsx:77` | `/operator/members` | `OperatorMembersPage` | AccessGate / SiteShell | 직영 운영·권한 대조 중 | 대조 중 |
| 134 | `services/web-lecture/src/App.tsx:78` | `/operator/members/:id` | `OperatorMembersPage` | AccessGate / SiteShell | 직영 운영·권한 대조 중 | 대조 중 |
| 135 | `services/web-lecture/src/App.tsx:80` | `/operator/courses/:courseId/review` | `OperatorCourseReviewPage` | AccessGate / SiteShell | 직영 운영·권한 대조 중 | 대조 중 |
| 136 | `services/web-lecture/src/App.tsx:81` | `/operator/contact` | `OperatorContactPage` | AccessGate / SiteShell | 직영 운영·권한 대조 중 | 대조 중 |
| 137 | `services/web-lecture/src/App.tsx:82` | `/operator/instructors` | `OperatorInstructorsPage` | AccessGate / SiteShell | 직영 운영·권한 대조 중 | 대조 중 |
| 138 | `services/web-lecture/src/App.tsx:83` | `/operator/certificates` | `OperatorCertificatesPage` | AccessGate / SiteShell | 직영 운영·권한 대조 중 | 대조 중 |
| 139 | `services/web-pharmacy-coop/src/App.tsx:143` | `operator/inbox` | `CooperativeInboxPage` | Layout | 직영 운영·권한 대조 중 | 대조 중 |
| 140 | `services/web-pharmacy-coop/src/App.tsx:145` | `operator` | `FederationManagement` | Layout | 직영 운영·권한 대조 중 | 대조 중 |
| 141 | `services/web-pharmacy-coop/src/App.tsx:146` | `operator/home-presentation` | `FederationHeroManagement` | Layout | 직영 운영·권한 대조 중 | 대조 중 |
| 142 | `services/web-pharmacy-coop/src/App.tsx:161` | `operator/inbox` | `CooperativeInboxPage` | CooperativeLayout / Layout | 독립 조직 자체 업무 유지 | 대조 중 |
| 143 | `services/web-pharmacy-coop/src/App.tsx:175` | `operator` | `CooperativeManagement` | CooperativeLayout / Layout | 독립 조직 자체 업무 유지 | 대조 중 |
| 144 | `services/web-pharmacy-coop/src/App.tsx:176` | `operator/home-presentation` | `CooperativeHeroManagement` | CooperativeLayout / Layout | 독립 조직 자체 업무 유지 | 대조 중 |
| 145 | `services/web-pharmacy-coop/src/App.tsx:180` | `operator/contents/new` | `CooperativeManagement` | CooperativeLayout / Layout | 독립 조직 자체 업무 유지 | 대조 중 |
| 146 | `services/web-pharmacy-coop/src/App.tsx:184` | `operator/contents/:id/edit` | `CooperativeManagement` | CooperativeLayout / Layout | 독립 조직 자체 업무 유지 | 대조 중 |
| 147 | `services/web-store/src/App.tsx:260` | `/operator/inbox` | `OperatorInboxPage` | RootShell | 매장 자기 업무·직영 심사 대조 | 대조 중 |
| 148 | `services/web-store/src/App.tsx:261` | `/operator/pharmacy-memberships` | `PharmacyReviewAccess` | RootShell | 매장 자기 업무·직영 심사 대조 | 대조 중 |
| 149 | `services/web-kpa-branch/src/App.tsx:97` | `operator/site` | `SiteSettingsPage` | BranchLayout | 독립 조직 자체 업무 유지 | 대조 중 |
| 150 | `services/web-kpa-branch/src/App.tsx:98` | `operator/posts` | `PostsAdminPage` | BranchLayout | 독립 조직 자체 업무 유지 | 대조 중 |
| 151 | `services/web-kpa-branch/src/App.tsx:99` | `operator/domains` | `DomainsPage` | BranchLayout | 독립 조직 자체 업무 유지 | 대조 중 |
| 152 | `services/web-kpa-branch/src/App.tsx:100` | `operator/annual-reports` | `AnnualReportsReviewPage` | BranchLayout | 독립 조직 자체 업무 유지 | 대조 중 |
| 153 | `services/web-kpa-branch/src/App.tsx:101` | `operator/fees` | `FeeLedgerPage` | BranchLayout | 독립 조직 자체 업무 유지 | 대조 중 |
| 154 | `services/web-kpa-branch/src/App.tsx:102` | `operator/education` | `EducationCreditsPage` | BranchLayout | 독립 조직 자체 업무 유지 | 대조 중 |
| 155 | `services/web-kpa-branch/src/App.tsx:103` | `operator/members` | `MembersConsolePage` | BranchLayout | 독립 조직 자체 업무 유지 | 대조 중 |
| 156 | `services/web-kpa-branch/src/App.tsx:104` | `operator/events` | `EventsPage` | BranchLayout | 독립 조직 자체 업무 유지 | 대조 중 |
| 157 | `services/web-kpa-branch/src/App.tsx:105` | `operator/officers` | `OfficersPage` | BranchLayout | 독립 조직 자체 업무 유지 | 대조 중 |
| 158 | `services/web-pharmacy-business/src/App.tsx:330` | `/operator/semi-franchises` | `RoleGuard` | 상위 경로·컴포넌트 내부 확인 | 독립 사업·운영 책임 대조 | 대조 중 |
| 159 | `services/web-pharmacy-business/src/App.tsx:331` | `/operator/semi-franchises/:key/contents/new` | `RoleGuard` | 상위 경로·컴포넌트 내부 확인 | 독립 사업·운영 책임 대조 | 대조 중 |
| 160 | `services/web-pharmacy-business/src/App.tsx:332` | `/operator/semi-franchises/:key/contents/:id/edit` | `RoleGuard` | 상위 경로·컴포넌트 내부 확인 | 독립 사업·운영 책임 대조 | 대조 중 |
| 161 | `services/web-pharmacy-business/src/App.tsx:334` | `/operator/collaboration-requests` | `Navigate` | 상위 경로·컴포넌트 내부 확인 | 이전 주소·별칭 대조 | 대조 중 |
| 162 | `services/web-pharmacy-business/src/App.tsx:335` | `/operator/*` | `Navigate` | 상위 경로·컴포넌트 내부 확인 | 이전 주소·별칭 대조 | 대조 중 |
| 163 | `services/web-pharmacy-business/src/App.tsx:336` | `/admin/*` | `Navigate` | 상위 경로·컴포넌트 내부 확인 | 이전 주소·별칭 대조 | 대조 중 |
| 164 | `services/web-pharmacy-business/src/App.tsx:364` | `/operator/inbox/business/:businessKey` | `Layout` | 상위 경로·컴포넌트 내부 확인 | 독립 사업·운영 책임 대조 | 대조 중 |

## 화면 내부 운영 업무

| 서비스 | 소스 | route 외 확인할 운영 기능 | 상태 |
| --- | --- | --- | --- |
| Partner | `services/web-partner/src/PartnerSite.tsx`, `packages/operator-core-ui/src/modules/partner-community-operations/PartnerCommunityOperator.tsx` | 신고 처리, 글·댓글 조회/숨김/복구/고정, 회원 상태, 게시판 생성·편집·운영 상태, 운영 이력, Admin의 운영자 지정 | 전체 기능 대조 중 |
| Funding | `services/web-neture/src/pages/operator/MarketTrialApprovalsPage.tsx`, `MarketTrialApprovalDetailPage.tsx` 및 관련 panels | 개설 심사, 상세·참여자, 모집·결과·이행 단계, 입금/환급/약정 불일치, offline 처리, 운영 이력, 포럼 연계 실패 복구 | 전체 기능 대조 중 |
| Supplier | `services/web-neture/src/pages/operator/OperatorSupplierApprovalPage.tsx` 및 관련 panels | 신청·증빙, 보완 요청·재제출, 승인·반려, 활성화 조건, 규제 상품 유형, 상태 관리와 연관 운영 정보 | 전체 기능 대조 중 |
| Lecture | `services/web-lecture/src/pages/operator/*` | 강사 신청과 근거, 강의 본문·커리큘럼·자료 검토, 승인/게시/중단/보관, 문의·기존 문의, 수료증 누락 복구·발급·갱신·폐기·이력, 홈 운영 | 전체 기능 대조 중 |
| Neture/Community | 현행 `operatorMenuGroups.ts`, `SubdomainOperatorLayoutWrapper.tsx`, 각 page 및 공통 모듈 | 회원·약국·자격, 포럼 신청·개설·설정·신고·자료·공개 범위, 콘텐츠·홈·안내·문의, 상품·매장·주문·운영 분석 등 현행 메뉴 전부 | 전체 기능 대조 중 |
| 연합회 | `services/web-pharmacy-coop/src/pages` 및 `CentralFederationOperations` | 연합회 직영 업무와 개별 조합의 자체 운영·참여 약국·콘텐츠 업무를 분리 | 전체 기능 대조 중 |

## 공통 UX·권한 검증

- Admin과 Operator의 동일한 운영 작업공간, Admin 홈/사이드바 진입, 위임된 메뉴만 노출.
- 전체 공통 회원의 표준 DataTable·체크 선택·상단 ActionBar·상태 탭·검색·상세·명확한 빈 상태/오류.
- 알림·실제 대기 집계·상세 바로 이동·처리 후 갱신. 집계 실패를 0건으로 표현하지 않음.
- 기존 서비스 역할을 유지하면서 Admin이 메뉴별 업무를 위임. 직접 API 접근과 만료·회수·자기 권한 확대 차단도 동일하게 검증.

## 확장 대조와 누락 방지 기준

`node scripts/audit/census-central-operation-surfaces.mjs`로 재현한다. 출력은 저장소의 `.tmp/central-operation-census/surfaces.json`에 고정하며 임의 경로 인자는 거부한다. 서비스·공유 UI의 TypeScript/TSX 파일을 읽고 React Router의 상위 경로·가드·조건 분기와 별도 메뉴/탭 선언도 기록한다. 최초 확장 실행은 1,231개 소스, 관리 경로 선언 164개(이전 주소 23개), 메뉴/탭 정의 14곳이다. 위 표는 기준 main의 위치를 보존한다. 이후 공유 모듈 추출로 바뀐 소비처는 아래 실행 메모에서 추적한다.

자동 추출만으로 전수 검증을 완료했다고 판정하지 않는다. computed path, 별도 컴포넌트에 정의된 상대 경로, 화면 내부 상태/모달/복구 기능, backend만 남은 기능은 수동 대조한다. 특히 Partner의 `/operator` 내부 다섯 업무와 조합별 `:cooperativeSlug/operator/*`, 분회의 별도 slug 컨텍스트를 일반 전역 서비스 메뉴로 합치지 않는다.

| 업무군 | 빠뜨리지 않을 실제 범위 | 코드 근거와 처리 기준 |
| --- | --- | --- |
| 공통 회원 | 자격 프로필 없는 계정까지 전체·상태·이름/이메일/정확한 계정 식별 검색, 체크·상단 후속 작업·상세 | `CentralPharmacistQualifications` directory 모드, `PharmacistQualificationService.list`. 회원 조회와 자격 승인 권한 분리; directory 응답에서 면허·사유 제외 |
| 공통 자격 | 신청·재신청, 근거 확인, 개인별 승인/반려/취소, 본인 승인 금지, 중복 면허와 동시 수정 방지 | 기존 원장·수동 검토 규칙 유지. 신청/결정 알림은 같은 transaction에 저장하며 면허·사유를 알림에 복사하지 않음 |
| 기존 서비스 가입 | 기존 Neture membership의 대기·반려·활성 상태, 메모·개별/일괄 처리·기존 추천 | `registrations/RegistrationRequestsPage`, `OperatorRegistrationService`. 약국 신청과 다른 원장이다. 공통 계정 상태를 변경하지 않는 최신 main 구현을 유지; `/operator/applications`를 약국 심사와 같은 메뉴로 처리하지 않음 |
| 약국·매장 | 공통 약국 신청 심사와 매장 현황 | `PharmacyMembershipReviewPage`, `StoreManagementPage`. 독립 협력사업 가입·사업 운영은 별도 |
| 공급자 | paged/상태별 목록·검색·체크 일괄 처리, 신청 상세, 기본정보 보완, 사업자/정산/신고 서류, 보완 요청·제출·해결·이력, 규제 품목군 심사·증빙, 진행 중 펀딩 조회, Admin 비활성화/재활성화 및 차단 사유 | 기존 페이지·관련 panels를 `supplier-operations`로 추출. 공급자 본인의 상품/정산/배송 업무를 중앙 운영 권한으로 편입하지 않음 |
| 강의 | 강사 소개·전문성 신청 승인/반려, 강의 본문·커리큘럼·자료 읽기 검토, 승인/반려/게시/중단/보관, 수료증 누락 조회·재발급·수동 발급·갱신·폐기·처리 이력·진위 확인 | 기존 페이지/명령·재시도 lifecycle을 `lecture-operations`로 추출. 강사 편집권/학습자 등록·수료 판정은 기존 backend 계약 유지 |
| 펀딩 | 개설 목록/상태·KPI·상세, 승인/반려·단계 전이, 참여자 복합 필터·CSV·이행 확인, 입금 정정·메모·이력, 참여금/환급/약정 예외·개별 이력, 오프라인 작업·검증·이력, 포럼 연계 실패 목록/해결/재시도 | 기존 전체 화면과 하위 panels를 `funding-operations`로 추출. 개설자·참여자 자기 업무와 중단된 commerce mutation은 복원하지 않음 |
| Neture 포럼 | 개설 승인·반려·보완·일괄 처리, 소유자 삭제 요청 처리, 직접 비활성화/복구, Admin 완전 삭제와 사전 점검/삭제 이력, 실제 분석 | 기존 forum 공통 콘솔과 admin 전용 삭제 API 재사용. operator hard delete 노출 금지 |
| 공통 커뮤니티 | 서비스 회원/제재, 게시판 개설·신청 심사, 게시판 상태, 비로그인 공개 범위·게시글 선택/해제, 첫 화면·콘텐츠·자료·뉴스 검토, Admin 회원/게시판 완전 삭제 계획·점검·실행 | `CommunityWorkspacePage` 내부 관리 기능까지 대조. `community-forums`, 기존 `community-home-operations` 재사용. business 키와 개별 게시판 소유자 권한 유지 |
| Partner | 신고 대상 열람·처리 기록, 글/댓글 숨김·복구·고정, 회원 상태, 게시판 생성·수정·운영 상태, 운영 이력 | 공유 `PartnerCommunityOperator`의 탭별 메뉴 위임. 실제 overview 응답과 명령을 위임 범위로 제한; 신고만 위임받은 담당자에게 전체 회원/글 목록을 전달하지 않음 |
| 홈·문의·법정정보 | 각 직영 서비스 홈 Hero·공지·광고·스폰서·링크, 안내 문구, 문의 상세/상태/메모/답변·실패 재시도, 기존 강의 문의, 법정정보·약관 작성/게시/보관 및 문의 설정 | `HomePresentationEditor`, 기존 Guide/Contact/Legal 모듈 재사용. 기존 문의 메시지는 새 문의 원장과 별도 확인; 현행 서비스 key로 고정 |
| 상품·유통 운영 | 전체 offer/설명/태그·승인/공급 현황, 취급 승인, 서비스별 승인·품질/분석·상세, 상품 후보 재매칭/수동 연결/반려/보관, 상품 정리·휴지통·복구·삭제 점검, 카테고리 매핑 | 해당 source pages/API 각각 연결 여부를 확인해야 한다. 공통 상품 DB의 중요 권한과 실제 service API role을 메뉴 표시로 확대하지 않음 |
| 주문·정산 | B2B 주문 필터·집계·상세와 기존 Admin 정산 계산/승인/지급/취소·연결 주문·통지 실패 복구 | 원래 B2B 계약/권한 유지. 소비자 checkout·PG·POS 등 퇴역/보류 기능을 통합 명목으로 추가하지 않음 |
| 운영 공통 | action queue의 이동/실행 항목, 운영 분석/이력, 실제 알림·대기 집계/오류, 운영자 초대·수락·메뉴 위임/회수·감사 | source에 있는 AI 리포트 empty mode는 실데이터 분석 완료가 아니다. 공통 플랫폼 AI·메일·상품 DB 설정은 기존 전체 관리자 경계 유지 |
| 연합회/독립 조직 | O4O 연합회의 조합 가입·참여 심사, 홈·문의와 개별 조합 회원/참여 약국/사업/콘텐츠/직원 운영 분리 | `requireFederation`와 `requireLocal`을 구분. 중앙 위임으로 타 조합·CarePharm·해당 협업체(당시 구명칭)·개별 분회의 비공개 원장 접근권을 만들지 않음 |

## 실행 메모 — 완료 판정과 구분

- 강의 원본 운영 화면 회귀 43건, 펀딩 원본 운영 화면 회귀 46건, 공급자 관련 원본 화면 회귀 39건, 커뮤니티 원본 화면 회귀 48건 PASS를 확인했다. 추출 후 해당 워크플로를 중앙 transport로도 검증하는 작업은 별도다.
- 메뉴 제한은 기존 role assignment 또는 수락 전 초대에 종속한다. 새로운 전역 Operator 역할/회원 원장을 만들지 않는다. 초대 수락과 메뉴 제한 이전은 같은 transaction이며 현재 서비스 역할·membership·조직 검사를 대체하지 않는다.
- 새 migration은 격리 PostgreSQL 15의 기존 50개 schema 상태와 신규 empty down/up/reapply로 검증했다. 새 테이블에도 현행 account-erasure writer fence를 적용한다. 운영 DB에는 적용하지 않았다.
- 체크리스트/metadata 등록, native 화면 연결, 실제 API 인가, desktop/mobile 브라우저 검증을 각각 완료해야 전체 완료다. 위 route 표의 대조 중 항목을 외부 링크 제공이나 예시 화면 몇 개로 완료 처리하지 않는다.

## 2026-10-29 최신 main 대조 결과

기존 모집단 표는 당시 조사 기록으로 유지한다. 아래 표는 최신 main 통합 이후의 별도 대조 결과다. 중앙 native 연결은 기존 화면·API를 재사용했다는 의미이며, 실제 Google 로그인이나 모든 운영 데이터 조합의 검증 완료를 뜻하지 않는다.

현재 1,324개 소스에서 관리 경로 165개, 별칭 23개와 메뉴·탭 정의 14곳을 확인했다. 직영 native 메뉴 72개는 catalog·실제 renderer·내비게이션의 집합 일치 테스트로 대조했다. Partner의 신고/글/회원/게시판/이력은 단일 route 내부의 별도 메뉴이며 아래 route 수와 합산하지 않는다.

| # | 현재 화면 위치 | 처리·권한 경계 | 중앙 업무 또는 유지 대상 |
| --- | --- | --- | --- |
| 1 | `services/web-kpa-branch/src/App.tsx:97` · `operator/site` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 2 | `services/web-kpa-branch/src/App.tsx:98` · `operator/posts` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 3 | `services/web-kpa-branch/src/App.tsx:99` · `operator/domains` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 4 | `services/web-kpa-branch/src/App.tsx:100` · `operator/annual-reports` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 5 | `services/web-kpa-branch/src/App.tsx:101` · `operator/fees` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 6 | `services/web-kpa-branch/src/App.tsx:102` · `operator/education` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 7 | `services/web-kpa-branch/src/App.tsx:103` · `operator/members` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 8 | `services/web-kpa-branch/src/App.tsx:104` · `operator/events` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 9 | `services/web-kpa-branch/src/App.tsx:105` · `operator/officers` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 10 | `services/web-lecture/src/App.tsx:72` · `/operator/operators` | 지정 관리 재사용 | `중앙 /admin/operators; 직영 위임만 중앙 Admin 관리` |
| 11 | `services/web-lecture/src/App.tsx:74` · `/operator` | 중앙 native 연결 | `lecture.courses` |
| 12 | `services/web-lecture/src/App.tsx:75` · `/operator/home-presentation` | 중앙 native 연결 | `lecture.home` |
| 13 | `services/web-lecture/src/App.tsx:76` · `/operator/inbox` | 중앙 native 연결 | `lecture.inbox` |
| 14 | `services/web-lecture/src/App.tsx:77` · `/operator/members` | 중앙 native 연결 | `lecture.members` |
| 15 | `services/web-lecture/src/App.tsx:78` · `/operator/members/:id` | 중앙 native 연결 | `lecture.members` |
| 16 | `services/web-lecture/src/App.tsx:80` · `/operator/courses/:courseId/review` | 중앙 native 연결 | `lecture.courses` |
| 17 | `services/web-lecture/src/App.tsx:81` · `/operator/contact` | 중앙 native 연결 | `lecture.contact` |
| 18 | `services/web-lecture/src/App.tsx:82` · `/operator/instructors` | 중앙 native 연결 | `lecture.instructors` |
| 19 | `services/web-lecture/src/App.tsx:83` · `/operator/certificates` | 중앙 native 연결 | `lecture.certificates` |
| 20 | `services/web-neture/src/App.tsx:770` · `/operator/service-contact/:serviceKey/settings` | 중앙 native 연결 | `직영 서비스별 *.contact-settings` |
| 21 | `services/web-neture/src/App.tsx:771` · `/operator/service-contact/:serviceKey` | 중앙 native 연결 | `직영 서비스별 *.inbox` |
| 22 | `services/web-neture/src/App.tsx:772` · `/operator/inbox/open/:kind/:scopeKey` | 범위별 진입 유지 | `직영 알림은 중앙 업무로 연결; 사업별 알림은 기존 사업 범위` |
| 23 | `services/web-neture/src/App.tsx:773` · `/operator/inbox/business/:businessKey` | 범위별 진입 유지 | `직영 알림은 중앙 업무로 연결; 사업별 알림은 기존 사업 범위` |
| 24 | `services/web-neture/src/App.tsx:1072` · `/admin` | 중앙 홈 재사용 | `/operations` |
| 25 | `services/web-neture/src/App.tsx:1073` · `/admin/users` | 중앙 native 연결 | `neture.service-members` |
| 26 | `services/web-neture/src/App.tsx:1074` · `/admin/users/:id` | 중앙 native 연결 | `neture.service-members` |
| 27 | `services/web-neture/src/App.tsx:1075` · `/admin/stores` | 중앙 native 연결 | `neture.stores` |
| 28 | `services/web-neture/src/App.tsx:1076` · `/admin/orders` | 중앙 native 연결 | `neture.orders` |
| 29 | `services/web-neture/src/App.tsx:1079` · `/admin/ai-report` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 30 | `services/web-neture/src/App.tsx:1080` · `/admin/settings/notifications` | 중앙 native 연결 | `neture.notifications` |
| 31 | `services/web-neture/src/App.tsx:1082` · `/admin/applications` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 32 | `services/web-neture/src/App.tsx:1083` · `/admin/community` | 중앙 native 연결 | `neture.forums` |
| 33 | `services/web-neture/src/App.tsx:1084` · `/admin/forum-delete-requests` | 중앙 native 연결 | `neture.forum-delete` |
| 34 | `services/web-neture/src/App.tsx:1086` · `/admin/forum-deleted` | 중앙 native 연결 | `neture.forum-deleted` |
| 35 | `services/web-neture/src/App.tsx:1087` · `/admin/forum-analytics` | 중앙 native 연결 | `neture.forum-analytics` |
| 36 | `services/web-neture/src/App.tsx:1089` · `/admin/all-products` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 37 | `services/web-neture/src/App.tsx:1090` · `/admin/ai-card-report` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 38 | `services/web-neture/src/App.tsx:1091` · `/admin/ai-operations` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 39 | `services/web-neture/src/App.tsx:1093` · `/admin/homepage-cms` | 중앙 native 연결 | `neture.cms` |
| 40 | `services/web-neture/src/App.tsx:1094` · `/admin/analytics` | 중앙 native 연결 | `neture.analytics` |
| 41 | `services/web-neture/src/App.tsx:1096` · `/admin/category-mapping-rules` | 중앙 native 연결 | `neture.category-mapping` |
| 42 | `services/web-neture/src/App.tsx:1097` · `/admin/roles` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 43 | `services/web-neture/src/App.tsx:1098` · `/admin/categories` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 44 | `services/web-neture/src/App.tsx:1099` · `/admin/brands` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 45 | `services/web-neture/src/App.tsx:1100` · `/admin/product-cleanup` | 중앙 native 연결 | `neture.cleanup` |
| 46 | `services/web-neture/src/App.tsx:1101` · `/admin/product-service-approvals` | 중앙 native 연결 | `neture.service-product-approvals` |
| 47 | `services/web-neture/src/App.tsx:1103` · `/admin/actions` | 중앙 native 연결 | `neture.actions` |
| 48 | `services/web-neture/src/App.tsx:1106` · `/admin/members` | 중앙 native 연결 | `neture.membership-cleanup` |
| 49 | `services/web-neture/src/App.tsx:1107` · `/admin/operators` | 지정 관리 재사용 | `중앙 /admin/operators; 독립 사업의 자체 지정은 유지` |
| 50 | `services/web-neture/src/App.tsx:1108` · `/admin/contact-messages` | 중앙 native 연결 | `neture.legacy-contact` |
| 51 | `services/web-neture/src/App.tsx:1109` · `/admin/service-approvals` | 중앙 native 연결 | `neture.service-approval-management` |
| 52 | `services/web-neture/src/App.tsx:1111` · `/admin/masters` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 53 | `services/web-neture/src/App.tsx:1112` · `/admin/catalog-import` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 54 | `services/web-neture/src/App.tsx:1113` · `/admin/catalog-import/csv` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 55 | `services/web-neture/src/App.tsx:1114` · `/admin/catalog-import/history` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 56 | `services/web-neture/src/App.tsx:1115` · `/admin/settlements` | 중앙 native 연결 | `neture.settlements` |
| 57 | `services/web-neture/src/App.tsx:1116` · `/admin/community-admin` | 중앙 native 연결 | `neture.community-advertising` |
| 58 | `services/web-neture/src/App.tsx:1117` · `/admin/ai-admin` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 59 | `services/web-neture/src/App.tsx:1118` · `/admin/ai-admin/engines` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 60 | `services/web-neture/src/App.tsx:1119` · `/admin/ai-admin/policy` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 61 | `services/web-neture/src/App.tsx:1120` · `/admin/ai-admin/cost` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 62 | `services/web-neture/src/App.tsx:1121` · `/admin/ai-admin/context-assets` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 63 | `services/web-neture/src/App.tsx:1122` · `/admin/ai-admin/context-assets/new` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 64 | `services/web-neture/src/App.tsx:1123` · `/admin/ai-admin/context-assets/:id/edit` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 65 | `services/web-neture/src/App.tsx:1124` · `/admin/ai-admin/composition-rules` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 66 | `services/web-neture/src/App.tsx:1125` · `/admin/ai-card-rules` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 67 | `services/web-neture/src/App.tsx:1126` · `/admin/ai-business-pack` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 68 | `services/web-neture/src/App.tsx:1127` · `/admin/settings/email` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 69 | `services/web-neture/src/App.tsx:1128` · `/admin/settings/legal-terms` | 중앙 native 연결 | `neture.legal` |
| 70 | `services/web-neture/src/App.tsx:1130` · `/admin/settings/contact` | 중앙 native 연결 | `직영 서비스별 *.contact-settings` |
| 71 | `services/web-neture/src/App.tsx:1133` · `/admin/semi-franchises` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 72 | `services/web-neture/src/App.tsx:1134` · `/admin/pharmacy-service-settings` | 전체 관리자 업무 보존 | `기존 플랫폼/상품 DB/AI/메일 관리 경계 유지; 서비스 Operator 위임 제외` |
| 73 | `services/web-neture/src/App.tsx:1153` · `/admin/admin-suppliers` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 74 | `services/web-neture/src/App.tsx:1155` · `/admin/supplier-quality` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 75 | `services/web-neture/src/App.tsx:1156` · `/operator/legal/supplier` | 중앙 native 연결 | `supplier.legal` |
| 76 | `services/web-neture/src/App.tsx:1157` · `/admin/supplier-governance` | 중앙 native 연결 | `supplier.governance` |
| 77 | `services/web-neture/src/App.tsx:1158` · `/admin/supplier-governance/operators` | 지정 관리 재사용 | `중앙 /admin/operators; 독립 사업의 자체 지정은 유지` |
| 78 | `services/web-neture/src/App.tsx:1166` · `/operator/supplier-quality` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 79 | `services/web-neture/src/App.tsx:1168` · `/operator/inbox/supplier` | 중앙 native 연결 | `supplier.inbox` |
| 80 | `services/web-neture/src/App.tsx:1169` · `/operator/service-members/supplier` | 중앙 native 연결 | `supplier.members` |
| 81 | `services/web-neture/src/App.tsx:1170` · `/operator/service-members/supplier/:id` | 중앙 native 연결 | `supplier.members` |
| 82 | `services/web-neture/src/App.tsx:1171` · `/operator/home-presentation/supplier` | 중앙 native 연결 | `supplier.home` |
| 83 | `services/web-neture/src/App.tsx:1172` · `/operator/suppliers` | 중앙 native 연결 | `supplier.suppliers` |
| 84 | `services/web-neture/src/App.tsx:1180` · `/admin/market-trial` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 85 | `services/web-neture/src/App.tsx:1181` · `/operator/inbox/funding` | 중앙 native 연결 | `funding.inbox` |
| 86 | `services/web-neture/src/App.tsx:1182` · `/operator/service-members/funding` | 중앙 native 연결 | `funding.members` |
| 87 | `services/web-neture/src/App.tsx:1183` · `/operator/service-members/funding/:id` | 중앙 native 연결 | `funding.members` |
| 88 | `services/web-neture/src/App.tsx:1184` · `/operator/legal/funding` | 중앙 native 연결 | `funding.legal` |
| 89 | `services/web-neture/src/App.tsx:1185` · `/operator/home-presentation/funding` | 중앙 native 연결 | `funding.home` |
| 90 | `services/web-neture/src/App.tsx:1186` · `/operator/market-trial/operators` | 지정 관리 재사용 | `중앙 /admin/operators; 독립 사업의 자체 지정은 유지` |
| 91 | `services/web-neture/src/App.tsx:1187` · `/operator/market-trial` | 중앙 native 연결 | `funding.funding` |
| 92 | `services/web-neture/src/App.tsx:1188` · `/operator/market-trial/:id` | 중앙 native 연결 | `funding.funding` |
| 93 | `services/web-neture/src/App.tsx:1195` · `/operator/inbox/community` | 중앙 native 연결 | `community.inbox` |
| 94 | `services/web-neture/src/App.tsx:1196` · `/operator/service-members/community` | 중앙 native 연결 | `community.members` |
| 95 | `services/web-neture/src/App.tsx:1197` · `/operator/service-members/community/:id` | 중앙 native 연결 | `community.members` |
| 96 | `services/web-neture/src/App.tsx:1198` · `/operator/home-presentation/community` | 중앙 native 연결 | `community.home` |
| 97 | `services/web-neture/src/App.tsx:1199` · `/operator/communities/home` | 중앙 native 연결 | `community.editorial` |
| 98 | `services/web-neture/src/App.tsx:1200` · `/operator/communities` | 중앙 native 연결 | `community.forums` |
| 99 | `services/web-neture/src/App.tsx:1201` · `/operator/communities/boards` | 중앙 native 연결 | `community.boards` |
| 100 | `services/web-neture/src/App.tsx:1203` · `/operator/forum-delete` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 101 | `services/web-neture/src/App.tsx:1204` · `/operator/forum-delete-requests` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 102 | `services/web-neture/src/App.tsx:1205` · `/admin/forum-delete-requests` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 103 | `services/web-neture/src/App.tsx:1213` · `/operator/legal/community` | 중앙 native 연결 | `community.legal` |
| 104 | `services/web-neture/src/App.tsx:1214` · `/admin/communities` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 105 | `services/web-neture/src/App.tsx:1215` · `/admin/communities/operators` | 지정 관리 재사용 | `중앙 /admin/operators; 독립 사업의 자체 지정은 유지` |
| 106 | `services/web-neture/src/App.tsx:1216` · `/admin/communities/members` | 중앙 native 연결 | `community.erase-members` |
| 107 | `services/web-neture/src/App.tsx:1217` · `/admin/communities/boards` | 중앙 native 연결 | `community.erase-boards` |
| 108 | `services/web-neture/src/App.tsx:1218` · `/admin/forum-deleted` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 109 | `services/web-neture/src/App.tsx:1232` · `/operator` | 중앙 홈 재사용 | `/operations` |
| 110 | `services/web-neture/src/App.tsx:1233` · `/operator/inbox/neture` | 중앙 native 연결 | `neture.inbox` |
| 111 | `services/web-neture/src/App.tsx:1236` · `/operator/members` | 중앙 native 연결 | `neture.service-members` |
| 112 | `services/web-neture/src/App.tsx:1237` · `/operator/members/:id` | 중앙 native 연결 | `neture.service-members` |
| 113 | `services/web-neture/src/App.tsx:1238` · `/operator/users` | 중앙 native 연결 | `neture.service-members` |
| 114 | `services/web-neture/src/App.tsx:1239` · `/operator/users/:id` | 중앙 native 연결 | `neture.service-members` |
| 115 | `services/web-neture/src/App.tsx:1240` · `/operator/stores` | 중앙 native 연결 | `neture.stores` |
| 116 | `services/web-neture/src/App.tsx:1241` · `/operator/orders` | 중앙 native 연결 | `neture.orders` |
| 117 | `services/web-neture/src/App.tsx:1242` · `/operator/ai-report` | 중앙 native 연결 | `neture.ai-report` |
| 118 | `services/web-neture/src/App.tsx:1243` · `/operator/settings/notifications` | 중앙 native 연결 | `neture.notifications` |
| 119 | `services/web-neture/src/App.tsx:1244` · `/operator/applications` | 중앙 native 연결 | `neture.applications` |
| 120 | `services/web-neture/src/App.tsx:1245` · `/operator/community` | 중앙 native 연결 | `neture.forums` |
| 121 | `services/web-neture/src/App.tsx:1247` · `/operator/forum-delete` | 중앙 native 연결 | `neture.forum-delete` |
| 122 | `services/web-neture/src/App.tsx:1249` · `/operator/forum-delete-requests` | 중앙 native 연결 | `neture.forum-delete` |
| 123 | `services/web-neture/src/App.tsx:1250` · `/operator/forum-analytics` | 중앙 native 연결 | `neture.forum-analytics` |
| 124 | `services/web-neture/src/App.tsx:1252` · `/operator/supply` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 125 | `services/web-neture/src/App.tsx:1253` · `/operator/all-products` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 126 | `services/web-neture/src/App.tsx:1254` · `/operator/all-registered-products` | 중앙 native 연결 | `neture.products` |
| 127 | `services/web-neture/src/App.tsx:1259` · `/operator/ai-card-report` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 128 | `services/web-neture/src/App.tsx:1260` · `/operator/ai-operations` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 129 | `services/web-neture/src/App.tsx:1263` · `/operator/home-presentation/neture` | 중앙 native 연결 | `neture.home` |
| 130 | `services/web-neture/src/App.tsx:1264` · `/operator/home-presentation/carepharm` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 131 | `services/web-neture/src/App.tsx:1265` · `/operator/homepage-cms` | 중앙 native 연결 | `neture.cms` |
| 132 | `services/web-neture/src/App.tsx:1267` · `/operator/guide-contents` | 중앙 native 연결 | `neture.guides` |
| 133 | `services/web-neture/src/App.tsx:1268` · `/operator/analytics` | 중앙 native 연결 | `neture.analytics` |
| 134 | `services/web-neture/src/App.tsx:1269` · `/operator/category-mapping-rules` | 중앙 native 연결 | `neture.category-mapping` |
| 135 | `services/web-neture/src/App.tsx:1271` · `/operator/product-service-approvals` | 중앙 native 연결 | `neture.service-product-approvals` |
| 136 | `services/web-neture/src/App.tsx:1272` · `/operator/product-approvals` | 중앙 native 연결 | `neture.product-approvals` |
| 137 | `services/web-neture/src/App.tsx:1274` · `/operator/product-candidates` | 중앙 native 연결 | `neture.candidates` |
| 138 | `services/web-neture/src/App.tsx:1276` · `/operator/actions` | 중앙 native 연결 | `neture.actions` |
| 139 | `services/web-neture/src/App.tsx:1279` · `/operator/contact-messages` | 중앙 native 연결 | `neture.legacy-contact` |
| 140 | `services/web-neture/src/App.tsx:1281` · `/operator/pharmacy-memberships` | 중앙 native 연결 | `neture.pharmacies` |
| 141 | `services/web-neture/src/App.tsx:1282` · `/operator/product-cleanup` | 중앙 native 연결 | `neture.cleanup` |
| 142 | `services/web-neture/src/App.tsx:1283` · `/operator/semi-franchises` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 143 | `services/web-neture/src/App.tsx:1284` · `/operator/semi-franchises/:key/contents/new` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 144 | `services/web-neture/src/App.tsx:1285` · `/operator/semi-franchises/:key/contents/:id/edit` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 145 | `services/web-neture/src/App.tsx:1315` · `/workspace/admin` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 146 | `services/web-neture/src/App.tsx:1316` · `/workspace/admin/*` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 147 | `services/web-neture/src/App.tsx:1317` · `/workspace/operator` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 148 | `services/web-pharmacy-business/src/App.tsx:302` · `/operator/home-presentation/carepharm` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 149 | `services/web-pharmacy-business/src/App.tsx:352` · `/operator/semi-franchises` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 150 | `services/web-pharmacy-business/src/App.tsx:353` · `/operator/semi-franchises/:key/contents/new` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 151 | `services/web-pharmacy-business/src/App.tsx:354` · `/operator/semi-franchises/:key/contents/:id/edit` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 152 | `services/web-pharmacy-business/src/App.tsx:356` · `/operator/collaboration-requests` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 153 | `services/web-pharmacy-business/src/App.tsx:357` · `/operator/*` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 154 | `services/web-pharmacy-business/src/App.tsx:358` · `/admin/*` | 별칭 보존 | `원래 목적지 유지; 독립 업무를 중앙 위임으로 전환하지 않음` |
| 155 | `services/web-pharmacy-business/src/App.tsx:386` · `/operator/inbox/business/:businessKey` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 156 | `services/web-pharmacy-coop/src/App.tsx:143` · `operator/inbox` | 중앙 native 연결 | `pharmcoop.inbox` |
| 157 | `services/web-pharmacy-coop/src/App.tsx:145` · `operator` | 중앙 native 연결 | `pharmcoop.federation` |
| 158 | `services/web-pharmacy-coop/src/App.tsx:146` · `operator/home-presentation` | 중앙 native 연결 | `pharmcoop.home` |
| 159 | `services/web-pharmacy-coop/src/App.tsx:161` · `:cooperativeSlug/operator/inbox` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 160 | `services/web-pharmacy-coop/src/App.tsx:175` · `:cooperativeSlug/operator` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 161 | `services/web-pharmacy-coop/src/App.tsx:176` · `:cooperativeSlug/operator/home-presentation` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 162 | `services/web-pharmacy-coop/src/App.tsx:180` · `:cooperativeSlug/operator/contents/new` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 163 | `services/web-pharmacy-coop/src/App.tsx:184` · `:cooperativeSlug/operator/contents/:id/edit` | 독립 사업·자기 업무 유지 | `기존 사업/분회/조합 소속·역할과 비공개 범위 유지` |
| 164 | `services/web-store/src/App.tsx:260` · `/operator/inbox` | 자기 업무 유지 | `매장 업무 알림 범위 유지` |
| 165 | `services/web-store/src/App.tsx:261` · `/operator/pharmacy-memberships` | 중앙 native 연결 | `neture.pharmacies` |

### 원장·API·화면의 대조 근거

- `central-operation-renderers.tsx`와 `central-operation-menu.ts`: 메뉴별 원본 공유 모듈·직접 경로. 각 모듈의 transport factory가 원래 API를 사용한다. `central-operation-menu.middleware.ts`는 실제 API 요청을 업무로 분류하고 `central-operation-menu-grants.ts`가 현재 역할·위임·Google proof를 검사한다.
- 회원·자격: 공통 directory/면허 심사와 서비스 membership을 구별한다. `ServiceMembersWorkspace`의 서비스 탈퇴와 `AdminMemberManagementPage`의 Neture 가입 관계 정리는 별도다. `mode=hard`만 Admin 업무 메뉴로 검사하며 공통 계정·타 서비스 관계를 삭제하지 않는다.
- 상품: 일반 취급/서비스별 상품 검토와 기존 Admin 상품 승인·철회 API는 별도다. 카테고리·브랜드·마스터·일괄등록 및 전역 상품 DB의 중요 업무는 기존 관리자 경계를 유지한다. 공통 상품 DB의 새 Operator 위임은 하지 않았다.
- 강의·공급자·펀딩: `lecture-operations`, `supplier-operations`, `funding-operations`의 원본 상세·서류·수료·참여자·입금·환급·복구 패널을 재사용한다. 승인뿐 아니라 원래 처리 lifecycle/동시성/실패 후 재시도 테스트를 유지했다.
- 커뮤니티: 공개 설정·게시판·포럼·삭제 점검·신고·편집/홈/자료/뉴스를 기존 모듈로 연결했다. 최신 main의 공개 글 선택 변경 시 완료 안내 초기화를 공유 화면에도 반영했다. 원래 조직별 비공개 범위와 본인 소유 업무는 유지한다.
- Partner: 단일 화면의 5개 업무 탭과 overview 응답·명령을 위임 범위로 제한한다. 연합회와 개별 조합은 `requireFederation`/`requireLocal` 및 slug로 구별하며 중앙 역할만으로 개별 조합·해당 협업체(당시 구명칭)·CarePharm·분회 내부 권한을 만들지 않는다.
- 플랫폼 AI·메일·상품 DB 설정은 서비스의 일상 Operator 업무와 구분하여 기존 보호 화면을 보존했다. 이 항목을 중앙 native 메뉴 구현이나 서비스 Operator 위임 완료로 계산하지 않는다.

최종 테스트·CI·배포 결과는 통합 운영 WO에 시점별로 기록한다. 자동 census는 동작 검증을 대체하지 않는다.

최종 구현은 PR #878로 main `307e86ffe7b5901f27b375e1cbcebf3003cf15bb`에 반영됐다. 72개 native 업무, 165개 route 및 내부 메뉴·탭의 판정은 유지하며 [운영 반영 CHECK](../checks/CHECK-O4O-UNIFIED-MEMBERSHIP-ADMIN-DELIVERY-V1.md)에 CI·배포·read-only 확인과 실계정 미검증 범위를 기록했다. 이 대조표를 실제 Google 로그인·모든 업무 명령의 운영 실행 증적으로 해석하지 않는다.
