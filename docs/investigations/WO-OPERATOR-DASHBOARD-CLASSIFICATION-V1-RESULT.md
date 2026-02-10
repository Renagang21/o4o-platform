# WO-OPERATOR-DASHBOARD-CLASSIFICATION-V1 결과

> **작업일**: 2026-02-10
> **기준 문서**: IR-OPERATOR-DASHBOARD-STATUS-V1-RESULT.md
> **원칙**: 사실 기반 분류, 판단/제안 금지

---

## 0. KPA 서비스 분리 선언

본 문서에서 **KPA-Society는 단일 서비스로 취급하지 않는다.**

| 코드 | 서비스명 | 라우트 기준 |
|------|---------|-----------|
| **KPA-a** | KPA Community (커뮤니티) | `/dashboard`, `/my-content`, `/pharmacy/*` |
| **KPA-b** | KPA Demo (지부/분회 데모) | `/demo/*` |
| **KPA-c** | KPA Branch SaaS (분회 서비스) | `/branch-services/*` |

---

## 1. 분류 기준

| 코드 | 분류 | 설명 |
|------|------|------|
| **A** | 운영 실행 (Operation) | 승인, 처리, CRUD, 등록/수정/삭제 |
| **B** | 상태 확인 (Status/Monitoring) | 대시보드 홈, KPI 카드, 목록 조회(편집 없음) |
| **C** | 분석/리포트 (Analytics) | 차트, 통계, KPI, AI 리포트 |
| **D** | 설정 (Configuration) | 시스템 설정, 정책, 알림, 기본값 |
| **E** | 혼합형 (Mixed) | 위 2개 이상 성격이 한 화면에 공존 |

---

## 2. 분류표

### 2-1. Neture

#### Admin (`/workspace/admin/*`)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/workspace/admin` | AdminDashboardPage | 통계 카드 + 대기항목 + AI 관리 링크 | E |
| `/workspace/admin/ai` | AiAdminDashboardPage | AI 엔진 상태, 사용량, 회로차단기 현황 | B |
| `/workspace/admin/ai/engines` | AiEnginesPage | AI 엔진 선택/전환 설정 | D |
| `/workspace/admin/ai/policy` | AiPolicyPage | AI 일일 한도, 경고 임계값, 속도 제한 | D |
| `/workspace/admin/ai/asset-quality` | AssetQualityPage | 컨텍스트 자산 품질 모니터링 | B |
| `/workspace/admin/ai/cost` | AiCostPage | AI API 호출 비용 추적/분석 | C |
| `/workspace/admin/ai/context-assets` | ContextAssetListPage | 컨텍스트 자산 목록 + CRUD | A |
| `/workspace/admin/ai/context-assets/new` | ContextAssetFormPage | 컨텍스트 자산 생성 | A |
| `/workspace/admin/ai/context-assets/:id/edit` | ContextAssetFormPage | 컨텍스트 자산 편집 | A |
| `/workspace/admin/ai/composition-rules` | AnswerCompositionRulesPage | AI 답변 조합 규칙 설정 | D |
| `/workspace/admin/ai-card-rules` | AiCardExplainPage | AI 카드 노출 규칙 설명 (조회) | B |
| `/workspace/admin/ai-card-report` | AiCardReportPage | AI 카드 KPI, 분포, 일별 추이 | C |
| `/workspace/admin/ai-business-pack` | AiBusinessPackPage | 파트너용 비즈니스 팩 가이드 | B |
| `/workspace/admin/ai-operations` | AiOperationsPage | AI 시스템 실시간 운영 모니터링 | B |
| `/workspace/admin/settings/email` | EmailSettingsPage | SMTP 이메일 배송 설정 | D |

#### Operator (`/workspace/operator/*`)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/workspace/operator` | OperatorDashboard | 서비스 현황, 공급자/파트너 통계, 최근 활동 | B |
| `/workspace/operator/ai-report` | OperatorAiReportPage | AI 운영 인사이트 리포트 | C |
| `/workspace/operator/forum-management` | ForumManagementPage | 포럼 모더레이션 | A |
| `/workspace/operator/registrations` | RegistrationRequestsPage | 가입 요청 승인/반려 | A |
| `/workspace/operator/supply` | SupplyDashboardPage | 공급 요청 관리 | A |
| `/workspace/operator/settings/notifications` | EmailNotificationSettingsPage | 이메일 알림 설정 | D |

#### Supplier (`/workspace/supplier/*`)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/workspace/supplier/dashboard` | SupplierDashboardPage | 프로필 완성도 + 요약 카드 + 서비스 상태판 + 행동 신호 | E |
| `/workspace/supplier/requests` | SellerRequestsPage | 판매자 요청 승인/반려 | A |
| `/workspace/supplier/requests/:id` | SellerRequestDetailPage | 요청 상세 처리 | A |
| `/workspace/supplier/products` | SupplierProductsPage | 제품 카탈로그 관리 | A |
| `/workspace/supplier/supply-requests` | SupplyRequestsPage | 공급망 요청 관리 | A |
| `/workspace/supplier/orders` | SupplierOrdersPage | 주문 추적 (조회 전용) | B |
| `/workspace/supplier/contents` | SupplierContentsPage | 콘텐츠 목록 관리 | A |
| `/workspace/supplier/contents/new` | ContentEditorPage | 콘텐츠 생성 (TipTap 에디터) | A |
| `/workspace/supplier/contents/:id/edit` | ContentEditorPage | 콘텐츠 편집 | A |
| `/workspace/supplier/profile` | SupplierProfilePage | 공급자 프로필 편집 | A |
| `/workspace/supplier/signage/content` | SignageContentHubPage | 사이니지 콘텐츠 관리 | A |

#### Partner (`/workspace/partner/*`)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/workspace/partner` | PartnerOverviewPage | 허브 안내 + 통계 + 제품 상태 토글 + 콘텐츠 연결 | E |
| `/workspace/partner/recruiting-products` | RecruitingProductsPage | 모집 제품 관리 | A |
| `/workspace/partner/collaboration` | CollaborationPage | 파트너 협업 관리 | A |
| `/workspace/partner/promotions` | PromotionsPage | 프로모션/캠페인 관리 | A |
| `/workspace/partner/settlements` | SettlementsPage | 커미션/정산 조회 | B |

#### Dashboard

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/workspace/my-content` | MyContentPage | KPI 카드 + 콘텐츠 CRUD + 일괄 관리 + 필터 | E |

**Neture 소계: 38 페이지** (A: 18, B: 8, C: 3, D: 5, E: 4)

---

### 2-2. GlycoPharm

#### Operator (`/operator/*`)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/operator` | OperatorDashboard | 운영 현황 종합 (KPI, 상태판, 링크) | B |
| `/operator/pharmacies` | PharmaciesPage | 세미프랜차이즈 약국 네트워크 관리 | A |
| `/operator/applications` | ApplicationsPage | 약국 프랜차이즈 신청 목록 | A |
| `/operator/applications/:id` | ApplicationDetailPage | 신청 상세 승인/반려 | A |
| `/operator/products` | ProductsPage | 네트워크 제품 카탈로그 관리 | A |
| `/operator/orders` | OrdersPage | 네트워크 주문 모니터링/처리 | A |
| `/operator/inventory` | InventoryPage | 네트워크 재고 추적/관리 | A |
| `/operator/settlements` | SettlementsPage | 정산/지급 조회 | B |
| `/operator/analytics` | AnalyticsPage | 네트워크 비즈니스 메트릭 | C |
| `/operator/reports` | ReportsPage | 청구/거래 리포트 생성 | C |
| `/operator/billing-preview` | BillingPreviewPage | 청구서 미리보기/확정 | A |
| `/operator/invoices` | InvoicesPage | 인보이스 확정/관리 | A |
| `/operator/marketing` | MarketingPage | 네트워크 프로모션 관리 | A |
| `/operator/forum-requests` | ForumRequestsPage | 포럼 요청 처리 | A |
| `/operator/forum-management` | OperatorForumManagementPage | 포럼 모더레이션 | A |
| `/operator/market-trial` | OperatorTrialSelectorPage | 시장 시범 프로그램 관리 | A |
| `/operator/store-approvals` | StoreApprovalsPage | 매장 승인 목록 | A |
| `/operator/store-approvals/:id` | StoreApprovalDetailPage | 매장 승인 상세 처리 | A |
| `/operator/store-template` | StoreTemplateManagerPage | 매장 템플릿 관리 (히어로, 추천, 공지) | D |
| `/operator/users` | UsersPage | 운영자 계정 관리 | A |
| `/operator/support` | SupportPage | 지원 티켓 처리 | A |
| `/operator/settings` | SettingsPage | 서비스 설정 | D |
| `/operator/ai-report` | AiReportPage | AI 운영 요약 리포트 | C |
| `/operator/signage/library` | ContentLibraryPage | 사이니지 라이브러리 조회 | B |
| `/operator/signage/content` | ContentHubPage | 사이니지 콘텐츠 관리 | A |
| `/operator/signage/my` | MySignagePage | 내 사이니지 항목 조회 | B |
| `/operator/signage/preview` | SignagePreviewPage | 사이니지 미리보기 | B |

#### Pharmacy (`/pharmacy/*`)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/pharmacy` | PharmacyDashboard | 약국 운영 현황 + 액션 링크 | E |
| `/pharmacy/products` | PharmacyProducts | 약국 제품 관리 | A |
| `/pharmacy/orders` | PharmacyOrders | 약국 주문 관리 | A |
| `/pharmacy/patients` | PharmacyPatients | 환자/고객 관리 | A |
| `/pharmacy/smart-display` | SmartDisplayPage | 스마트 디스플레이 설정 (레거시) | D |
| `/pharmacy/smart-display/playlists` | PlaylistsPage | 디스플레이 플레이리스트 관리 | A |
| `/pharmacy/smart-display/schedules` | SchedulesPage | 디스플레이 스케줄 관리 | A |
| `/pharmacy/smart-display/media` | MediaLibraryPage | 미디어 라이브러리 관리 | A |
| `/pharmacy/smart-display/forum` | PlaylistForumPage | 디스플레이 포럼 콘텐츠 | A |
| `/pharmacy/signage/library` | ContentLibraryPage | 사이니지 라이브러리 조회 | B |
| `/pharmacy/signage/content` | ContentHubPage | 사이니지 콘텐츠 관리 | A |
| `/pharmacy/signage/my` | MySignagePage | 내 사이니지 조회 | B |
| `/pharmacy/signage/preview` | SignagePreviewPage | 사이니지 미리보기 | B |
| `/pharmacy/market-trial` | MarketTrialListPage | 시장 시범 참여 목록 | B |
| `/pharmacy/b2b-order` | B2BOrderPage | B2B 제품 주문 | A |
| `/pharmacy/store-apply` | StoreApplyPage | 매장 개설 신청 | A |
| `/pharmacy/settings` | PharmacySettings | 약국 계정 설정 | D |
| `/pharmacy/requests` | CustomerRequestsPage | 고객 요청/문의 관리 | A |
| `/pharmacy/funnel` | FunnelPage | 전환 퍼널 시각화 | C |
| `/pharmacy/management` | PharmacyManagement | 약국 경영 관리 | A |
| `/pharmacy/management/b2b` | PharmacyB2BProducts | B2B 제품 소싱 관리 | A |

**GlycoPharm 소계: 48 페이지** (A: 30, B: 9, C: 4, D: 4, E: 1)

---

### 2-3. K-Cosmetics

#### Operator (`/operator/*`)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/operator` | OperatorIndex | 운영 현황 요약 대시보드 | B |
| `/operator/stores` | OperatorStoresPage | 매장 네트워크 관리 | A |
| `/operator/applications` | OperatorApplicationsPage | 매장 프랜차이즈 신청 처리 | A |
| `/operator/products` | OperatorProductsPage | 제품 카탈로그 관리 | A |
| `/operator/orders` | OperatorOrdersPage | 주문 모니터링/처리 | A |
| `/operator/inventory` | OperatorInventoryPage | 재고 추적/관리 | A |
| `/operator/settlements` | OperatorSettlementsPage | 정산 조회 | B |
| `/operator/analytics` | OperatorAnalyticsPage | 매출/성과 분석 | C |
| `/operator/marketing` | OperatorMarketingPage | 프로모션/캠페인 관리 | A |
| `/operator/signage/content` | SignageContentHubPage | 사이니지 콘텐츠 관리 | A |
| `/operator/users` | OperatorUsersPage | 운영자 계정 관리 | A |
| `/operator/support` | OperatorSupportPage | 지원 요청 처리 | A |
| `/operator/settings` | OperatorSettingsPage | 서비스 설정 | D |
| `/operator/ai-report` | OperatorAiReportPage | AI 운영 요약 리포트 | C |

**K-Cosmetics 소계: 14 페이지** (A: 9, B: 2, C: 2, D: 1, E: 0)

---

### 2-4. GlucoseView

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/admin` | AdminPage | 단일 페이지 탭 구조 (회원 승인 + 통계 + 배너 + 파트너 + 설정) | E |
| `/operator/glucoseview/applications` | OperatorApplicationsPage | 제공자 신청 목록 처리 | A |
| `/operator/glucoseview/applications/:id` | OperatorApplicationDetailPage | 신청 상세 검토 | A |
| `/operator/glucoseview/ai-report` | OperatorAiReportPage | AI 운영 요약 리포트 | C |

**GlucoseView 소계: 4 페이지** (A: 2, B: 0, C: 1, D: 0, E: 1)

---

### 2-5. KPA-a (Community)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/dashboard` | UserDashboardPage | 사용자 대시보드 (커뮤니티/약국경영 탭) | B |
| `/my-content` | MyContentPage | KPI 카드 + 콘텐츠 CRUD + 일괄 관리 + 확장 필터 | E |
| `/pharmacy/dashboard` | PharmacyDashboardPage | 약국 경영 대시보드 | B |

**KPA-a 소계: 3 페이지** (A: 0, B: 2, C: 0, D: 0, E: 1)

---

### 2-6. KPA-b (Demo)

#### Admin (`/demo/admin/*`)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/demo/admin/dashboard` | DashboardPage | 조직 통계 개요 | B |
| `/demo/admin/kpa-dashboard` | KpaOperatorDashboardPage | 플랫폼 관리 대시보드 | B |
| `/demo/admin/divisions` | DivisionsPage | 지부/분회 관리 | A |
| `/demo/admin/divisions/:id` | DivisionDetailPage | 조직 상세 편집 | A |
| `/demo/admin/members` | MembersPage | 회원 관리/승인 | A |
| `/demo/admin/committee-requests` | CommitteeRequestsPage | 위원회 신청 처리 | A |
| `/demo/admin/organization-requests` | OrganizationJoinRequestsPage | 조직 가입 요청 처리 | A |
| `/demo/admin/service-enrollments` | ServiceEnrollmentManagementPage | 서비스 등록 승인 | A |
| `/demo/admin/stewards` | StewardManagementPage | 간사 관리 | A |
| `/demo/admin/annual-report` | AnnualReportPage | 연차 보고서 관리 | A |
| `/demo/admin/fee` | MembershipFeePage | 회비 설정/관리 | A |
| `/demo/admin/news` | NewsPage | 공지사항 CRUD | A |
| `/demo/admin/docs` | DocsPage | 자료실 관리 | A |
| `/demo/admin/signage/content` | ContentHubPage | 사이니지 콘텐츠 관리 | A |
| `/demo/admin/forum` | ForumPage | 포럼 모더레이션 | A |
| `/demo/admin/officers` | OfficersPage | 임원 할당/관리 | A |
| `/demo/admin/settings` | SettingsPage | 지부 설정 | D |

#### Operator (`/demo/operator/*`)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/demo/operator` | OperatorDashboard | APP 통계 (콘텐츠/사이니지/포럼 요약) | B |
| `/demo/operator/ai-report` | OperatorAiReportPage | AI 운영 요약 리포트 | C |
| `/demo/operator/forum-management` | ForumManagementPage | 포럼 모더레이션 | A |
| `/demo/operator/signage/content` | ContentHubPage | 사이니지 콘텐츠 관리 | A |
| `/demo/operator/legal` | LegalManagementPage | 약관/정책 관리 | A |
| `/demo/operator/operators` | OperatorManagementPage | 운영자 추가/삭제 | A |

#### Branch Admin (`/demo/branch/:branchId/admin/*`)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/demo/branch/:id/admin/` | DashboardPage | 분회 개요 | B |
| `/demo/branch/:id/admin/news` | NewsManagementPage | 분회 뉴스 CRUD | A |
| `/demo/branch/:id/admin/forum` | ForumManagementPage | 분회 포럼 관리 | A |
| `/demo/branch/:id/admin/docs` | DocsManagementPage | 분회 자료 관리 | A |
| `/demo/branch/:id/admin/officers` | OfficersPage | 분회 임원 관리 | A |

#### Intranet (`/demo/intranet/*`)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| `/demo/intranet` | DashboardPage | 인트라넷 대시보드 | B |
| `/demo/intranet/notice` | NoticeListPage | 공지 목록/관리 | A |
| `/demo/intranet/notice/write` | NoticeWritePage | 공지 작성 | A |
| `/demo/intranet/notice/:id` | NoticeDetailPage | 공지 상세 조회 | B |
| `/demo/intranet/notice/:id/edit` | NoticeWritePage | 공지 편집 | A |
| `/demo/intranet/meetings` | MeetingListPage | 회의 목록 관리 | A |
| `/demo/intranet/meetings/new` | MeetingDetailPage | 회의 생성 | A |
| `/demo/intranet/meetings/:id` | MeetingDetailPage | 회의 상세/편집 | A |
| `/demo/intranet/documents` | DocumentListPage | 문서 관리 | A |
| `/demo/intranet/signage/content` | ContentHubPage | 사이니지 콘텐츠 관리 | A |
| `/demo/intranet/schedule` | SchedulePage | 일정 조회 | B |
| `/demo/intranet/settings` | SettingsPage | 조직 설정 | D |
| `/demo/intranet/operator` | OperatorDashboardPage | 운영자 종합 대시보드 | B |
| `/demo/intranet/feedback` | FeedbackListPage | 피드백 목록 관리 | A |
| `/demo/intranet/feedback/new` | FeedbackNewPage | 피드백 작성 | A |
| `/demo/intranet/feedback/:id` | FeedbackDetailPage | 피드백 상세 | A |
| `/demo/intranet/groupbuy` | GroupbuyManagePage | 공동구매 관리 | A |

**KPA-b 소계: 45 페이지** (A: 34, B: 8, C: 1, D: 2, E: 0)

---

### 2-7. KPA-c (Branch SaaS)

| 라우트 | 페이지명 | 기능 요약 | 분류 |
|--------|---------|----------|------|
| — | — | operator/admin 페이지 없음 (end-user 전용) | — |

**비고**: KPA-c의 분회 서비스(`/branch-services/:branchId/*`)는 현재 end-user 페이지(대시보드, 뉴스, 포럼, 공동구매, 자료, 소개)만 존재한다. 분회 admin 기능은 KPA-b의 `/demo/branch/:branchId/admin/*` 경로에서만 제공된다.

**KPA-c 소계: 0 페이지**

---

## 3. 종합 통계

### 3-1. 서비스별 분류 분포

| 서비스 | A (운영) | B (현황) | C (분석) | D (설정) | E (혼합) | 합계 |
|--------|---------|---------|---------|---------|---------|------|
| Neture | 18 | 8 | 3 | 5 | 4 | **38** |
| GlycoPharm | 30 | 9 | 4 | 4 | 1 | **48** |
| K-Cosmetics | 9 | 2 | 2 | 1 | 0 | **14** |
| GlucoseView | 2 | 0 | 1 | 0 | 1 | **4** |
| KPA-a | 0 | 2 | 0 | 0 | 1 | **3** |
| KPA-b | 34 | 8 | 1 | 2 | 0 | **45** |
| KPA-c | 0 | 0 | 0 | 0 | 0 | **0** |
| **합계** | **93** | **29** | **11** | **12** | **7** | **152** |

### 3-2. 분류 비율

| 분류 | 비율 |
|------|------|
| A (운영 실행) | 61.2% |
| B (상태 확인) | 19.1% |
| C (분석/리포트) | 7.2% |
| D (설정) | 7.9% |
| E (혼합형) | 4.6% |

### 3-3. 혼합형(E) 페이지 목록

| 서비스 | 라우트 | 페이지명 | 혼재 내용 |
|--------|--------|---------|----------|
| Neture | `/workspace/admin` | AdminDashboardPage | B+A (통계 + 관리 진입) |
| Neture | `/workspace/supplier/dashboard` | SupplierDashboardPage | B+A (요약 + 프로필 완성도 + 행동 신호) |
| Neture | `/workspace/partner` | PartnerOverviewPage | B+A (안내 + 상태 토글 + 콘텐츠 연결) |
| Neture | `/workspace/my-content` | MyContentPage | B+A (KPI 카드 + CRUD + 일괄 관리) |
| GlycoPharm | `/pharmacy` | PharmacyDashboard | B+A (운영 현황 + 액션 링크) |
| GlucoseView | `/admin` | AdminPage | A+B+D (승인 + 통계 + 배너 + 설정, 탭 구조) |
| KPA-a | `/my-content` | MyContentPage | B+A (KPI 카드 + CRUD + 일괄 관리) |

---

## 4. 종료 조건 체크

| 조건 | 충족 |
|------|------|
| 모든 operator 관련 페이지가 분류되었는가 | ✅ 152 페이지 분류 완료 |
| KPA 관련 페이지가 a/b/c로 명확히 귀속되었는가 | ✅ KPA-a: 3, KPA-b: 45, KPA-c: 0 |
| "KPA 단일 서비스" 표기가 결과물에 존재하지 않는가 | ✅ 미존재 |

---

*작업 완료: 2026-02-10*
*기준 문서: IR-OPERATOR-DASHBOARD-STATUS-V1-RESULT.md*
