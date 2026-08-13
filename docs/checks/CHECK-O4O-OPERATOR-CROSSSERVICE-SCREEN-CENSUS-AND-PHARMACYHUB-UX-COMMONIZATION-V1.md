# CHECK-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1

> **WO**: WO-O4O-OPERATOR-CROSSSERVICE-SCREEN-CENSUS-AND-PHARMACYHUB-UX-COMMONIZATION-V1
> **작업일**: 2026-08-13 · **브랜치**: `work/operator-commonization-v1` · **상태**: 완료

---

## 1. 조사 방법

- 모집단은 **WO 목록이 아니라 코드에서 직접** 만들었다.
  - KPA `services/web-kpa-society/src/routes/OperatorRoutes.tsx`
  - K-Cosmetics `services/web-k-cosmetics/src/App.tsx` (operator block)
  - Neture `services/web-neture/src/App.tsx` (`path="/operator*"`)
  - Pharmacy-Hub `services/web-pharmacy-hub/src/App.tsx` (`/operator` nested)
- 화면 본체 규모(LOC)와 공통 패키지(`@o4o/operator-core-ui` · `@o4o/operator-ux-core` · `@o4o/ui`) 소비 여부를
  파일 단위로 전수 수집하여 판정 근거로 사용했다.
- 메뉴 정본(`kpaConfig` / `kcosmeticsConfig` / Neture domainIA / PH `UNIFIED_MENU`)은
  **실제 브라우저에서 sidebar 그룹을 모두 펼쳐 링크를 수집**해 route 와 대조했다.

### 판정 기준

| 판정 | 정의 |
|---|---|
| `FULLY_COMMON` | 화면 본체가 공통 패키지 모듈. 서비스 파일은 client/config 주입 wrapper. |
| `CORE_ONLY` | 공통 core(컴포넌트·훅)는 쓰지만 **화면 본체가 서비스별로 중복** 존재. |
| `VIEW_DUPLICATED` | 같은 업무 화면이 2개 이상 서비스에 각각 구현. 공통 모듈 없음. |
| `SERVICE_SPECIFIC` | 그 서비스에만 존재하는 고유 업무. 공통화 대상 아님. |
| `NOT_IMPLEMENTED` | 업무가 없거나 placeholder 뿐. **가짜 화면을 만들지 않는다.** |
| `OUT_OF_SCOPE` | alias/redirect/catch-all 등 화면이 아닌 route 엔트리. |

---

## 2. 집계 (§5 완료 기준)

```text
전체 모집단: 154
  ├ 운영자 route entry 152 (KPA 66 / KCos 49 / Neture 34 / PH 3, 그 중 alias·redirect 12)
  └ 화면이 없는 미구현 업무 2 (Pharmacy-Hub)

FULLY_COMMON    : 43
CORE_ONLY       : 9
VIEW_DUPLICATED : 49
SERVICE_SPECIFIC: 39
NOT_IMPLEMENTED : 2
OUT_OF_SCOPE    : 12
미조사          : 0
```

서비스별 실화면 수: KPA 59 · K-Cosmetics 47 · Neture 31 · Pharmacy-Hub 3 (합계 140).

---

## 3. 이번에 변경한 것

### 3-1. 설문(Survey) 화면 공통화 — VIEW_DUPLICATED 해소

`packages/operator-core-ui/src/modules/surveys/` 신설
(`types.ts` / `OperatorSurveyListPage.tsx` / `OperatorSurveyCreatePage.tsx` / `index.ts`, 루트 `index.ts` re-export).

서비스는 client + config(accent·actionPolicyKey·경로)만 주입한다.
API endpoint·payload 계약은 그대로다(백엔드 무변경).

| 파일 | before | after |
|---|---:|---:|
| KPA `survey/OperatorSurveyListPage.tsx` | 526 | 14 |
| KPA `survey/OperatorSurveyCreatePage.tsx` | 266 | 13 |
| KCos `survey/OperatorSurveyListPage.tsx` | 224 | 13 |
| KCos `survey/OperatorSurveyCreatePage.tsx` | 269 | 13 |
| KPA `survey/surveysConsole.ts` (신규 adapter) | — | 47 |
| KCos `survey/surveysConsole.ts` (신규 adapter) | — | 47 |
| **합계** | **1,285** | **147** |

중복 View 제거 규모 = **1,138 LOC** (공통 모듈로 이관).

### 3-2. Pharmacy-Hub 운영자 홈 — placeholder 제거

- `/operator` = `RoleEntryPage`(후속 예정 기능 안내 placeholder) → **삭제**.
- `pages/operator/OperatorDashboardPage.tsx` 신설 (110 LOC) — 공통 `OperatorDashboardLayout` 5-Block.
  - KPI/Action Queue/Quick Action 은 **실재 업무(가입 신청 승인·반려)의 실데이터**로만 구성.
  - AI Summary · Activity Log 는 원천이 없어 비움. **미구현 업무를 가짜 카드로 만들지 않았다.**
  - 조회 실패는 0 으로 삼키지 않고 에러 상태 + 재시도 버튼으로 표시.
- 상태별 건수는 기존 목록 endpoint 의 `pagination.total` 사용 — **신규 API 없음**.
- `config/operatorMenuGroups.ts` 에 `dashboard` 메뉴 항목 추가
  (route 가 실재하게 되었으므로 데드링크가 아니다. KPA/KCos 와 동일한 항목 형태).

`MembershipsPage`(62 LOC)는 이미 공통 `OperatorMembersConsolePage` 편입 상태이므로
본 WO 에서 추가 변경하지 않았다.

---

## 4. Pharmacy-Hub 운영자 영역의 실제 남은 기능

| 화면 | 상태 |
|---|---|
| `/operator` 운영자 홈(5-Block) | 구현 (본 WO) |
| `/operator/memberships` 가입 신청 목록·승인·반려 | 구현 (공통 콘솔) |
| `/operator/memberships/:membershipId` 신청 상세 | 구현 (서비스 고유 — 사업자 프로필) |

### NOT_IMPLEMENTED (화면 만들지 않음)

| 업무 | 근거 |
|---|---|
| 커뮤니티 운영 · 신고 처리 | 백엔드 기능·route 없음. 제거한 placeholder 의 "후속 예정" 항목. |
| 공지 · 운영자 콘텐츠 | 동일. |

Pharmacy-Hub 백엔드 운영자 endpoint 는 4개(`GET` 목록 / `GET :id` / `PATCH :id/approve` / `PATCH :id/reject`)뿐이며,
공통 `/api/v1/operator/members` 에 `pharmacy-hub:operator` 를 **의도적으로 mount 하지 않은** 상태다(기존 설계).
따라서 위 2개 업무는 UI 만 먼저 만들 수 없다.

---

## 5. 브라우저 검증 (§4)

빌드는 `VITE_API_BASE_URL=https://api.neture.co.kr` 로 하고 `vite preview` 로 기동했다
(PH 5173 / KPA 5174 / KCos 5175 / Neture 5176). 로그인은 `docs/local/TEST-ACCOUNTS.local.md` 계정.

| 항목 | 결과 |
|---|---|
| `/operator` 진입 | KPA · KCos · Neture · PH 모두 정상 렌더 |
| 전 route 직접 진입(deep link) | KPA 52 / KCos 39 / Neture 31 경로 스크립트 sweep — **JS 예외·화이트스크린 0** |
| sidebar 메뉴 전수 | 그룹 전체 펼쳐 링크 수집: KPA 37 · KCos 30 · Neture 20 · PH 2 → **전부 실재 route (데드링크 0)** |
| desktop + mobile | 1440×900 / 390×844 — 4개 서비스 모두 가로 overflow 없음, 모바일 drawer 정상 |
| 목록 / 상세 / empty | PH 목록·pending 빈 상태·행 모달·상세 deep link 확인 |
| error 상태 | Neture `/operator/actions` 에서 "데이터를 불러오지 못했습니다 + 다시 시도" 정상 표시 |
| 동일 업무 화면 비교 | 설문(KPA/KCos) 공통 모듈로 동일 렌더 확인. 회원·매장·포럼은 판정표 참조 |
| PH placeholder 존재 여부 | **없음** (RoleEntryPage 제거 확인) |
| 승인·반려 action | **미검증** — production write 이고 안전한 테스트 데이터가 없어 실행하지 않았다 |
| 설문 저장 | **미검증** — 동일 사유(작성 화면 렌더까지만 확인) |

### 범위 외 발견 (수정하지 않음, 별도 WO 필요)

| 위치 | 현상 |
|---|---|
| Neture `/operator/actions` | `GET /api/v1/neture/operator/actions` **500**. 화면은 에러 상태로 정상 처리. |
| Neture `/operator/settings/notifications` | `GET /api/operator/settings/notifications` **403** |
| Neture `/operator/ai-card-report`, `/operator/ai-operations` | `GET /api/ai/*` **403** |

403 3건은 계정 권한 축 문제로 보이며 본 WO 의 변경과 무관하다(변경 전에도 동일).

---

## 6. 남은 공통화 대상 (CORE_ONLY / VIEW_DUPLICATED 잔여 설명)

### CORE_ONLY 9건

| 대상 | 내용 |
|---|---|
| 회원 콘솔 3건 (KPA 660 / KCos 317 / Neture 466) | 공통 `OperatorMembersConsolePage` 를 쓰지만 서비스 확장 셸이 크다. KPA 는 자격/약국 축, Neture 는 자체 목록 셸. |
| 매장 목록 2건 (KCos 187 / Neture 184) | `OperatorStoresList` 소비. KPA 는 81 LOC 로 이미 얇음 → KCos/Neture 를 KPA 형태로 줄이는 것이 남은 작업. |
| 모집 노출 승인 2건 (KPA 110 / KCos 91) | 공통 `RecruitmentExposureConsole` + 서비스별 fetch/에러 셸 중복. 3번째 소비처 `web-glycopharm` 은 본 WO 4개 서비스 밖이라 손대지 않았다. |
| Neture `members` legacy alias | 동일 컴포넌트 재노출. |
| Neture `forum-analytics` (212) | KPA/KCos 는 30 LOC 공통 wrapper. Neture 만 자체 구현 — 다음 우선순위 1순위. |

### VIEW_DUPLICATED 49건 (업무 축으로 묶으면 9개 덩어리)

| 업무 | 규모(대략) | 비고 |
|---|---|---|
| 사이니지 HQ(미디어·플레이리스트·템플릿·강제 콘텐츠) | KPA 3,134 / KCos 2,230 | 최대 덩어리. 데이터 모델 차이 확인 후 별도 WO. |
| QR 목록·작성 | KPA 1,013 / KCos 669 | |
| 블로그 목록·작성 | KPA 802 / KCos 567 | |
| POP 목록·작성 | KPA 781 / KCos 557 | |
| 매장 상세 | KPA 580 / KCos 433 | |
| 매장 채널 | KPA 412 / KCos 396 | 차이 작아 공통화 난이도 낮음. |
| 이벤트 오퍼 | KPA 1,082 / KCos 275 | 업무 범위 자체가 달라 사전 정렬 필요. |
| 운영 분석 | KPA 383 / Neture 322 | |
| 회원 상세 · 문의 | KPA 72·365 / KCos 69 / Neture 104·282 | 문의는 KCos 만 공통 모듈(69) 사용 중. |

본 WO 는 §2 가 지시한 "가능한 범위에서 한 번에 공통화" 를 **설문 축 + PharmacyHub UX** 로 수행했다.
위 잔여는 화면 본체 차이가 커서 API/데이터 모델 정렬이 선행돼야 하며, 무리하게 합치면
서비스별 업무 의미(§3 보존 대상)를 훼손한다.

---

## 7. 보존 확인 (§3)

- 기존 URL: 변경 0건. Pharmacy-Hub 도 `/operator` 3 URL 그대로.
- 서비스별 권한: guard·capability 변경 0건.
- API·DB 계약: 변경 0건 (설문은 기존 endpoint 그대로, PH 는 기존 목록 endpoint 재사용).
- 서비스별 업무 의미 / KPA 고유 거버넌스(약관·감사 로그·자격 심사) / Neture 고유 사업 기능(펀딩·공급자 승인·상품 승인): 무변경.

---

## 8. 검증

- `tsc --noEmit`: Pharmacy-Hub EXIT=0 · KPA EXIT=0 · K-Cosmetics EXIT=0
- `vite build`: 4개 서비스 성공
- 브라우저 smoke: §5

---

## 9. 부록 — 전수 census 표


#### KPA

| route | 화면 | 판정 | 근거 |
|---|---|:---:|---|
| `/operator` | KpaOperatorDashboard(209) | FULLY_COMMON | OperatorDashboardLayout+AxisNavigationSection+RoleGuideCard 공통, 서비스별 config만 |
| `/operator/ai-report` | OperatorAiReportPage(13)+config(23) | FULLY_COMMON | @o4o/ui AiReportPage |
| `/operator/forum-requests` | ForumRequestsManagementPage(140) | FULLY_COMMON | operator-core-ui forum-requests |
| `/operator/forum-categories` | ForumCategoriesManagementPage(20) | FULLY_COMMON | operator-core-ui forum-categories |
| `/operator/community` | CommunityManagementPage(629) | SERVICE_SPECIFIC | KPA Home 편집(커뮤니티 홈 구성) — 타 서비스 대응 화면 없음 |
| `/operator/forum-delete-requests` | ForumDeleteRequestsPage(62) | FULLY_COMMON | operator-core-ui forum-delete-requests |
| `/operator/forum-analytics` | ForumAnalyticsDashboard(32) | FULLY_COMMON | operator-core-ui forum-analytics |
| `/operator/content` | ContentManagementPage(37) | FULLY_COMMON | operator-core-ui CmsContentManager |
| `/operator/signage/hq-media` | HqMediaPage(541) | VIEW_DUPLICATED | KCos HqMediaPage(415) 동일 업무 별도 구현 |
| `/operator/signage/hq-media/:mediaId` | HqMediaDetailPage(307) | VIEW_DUPLICATED | KCos(284) |
| `/operator/signage/hq-playlists` | HqPlaylistsPage(295) | VIEW_DUPLICATED | KCos(227) |
| `/operator/signage/hq-playlists/new` | HqPlaylistCreatePage(120) | VIEW_DUPLICATED | KCos(96) |
| `/operator/signage/hq-playlists/:playlistId` | HqPlaylistDetailPage(598) | VIEW_DUPLICATED | KCos(373) |
| `/operator/signage/templates` | TemplatesPage(347) | VIEW_DUPLICATED | KCos(205) |
| `/operator/signage/templates/:templateId` | TemplateDetailPage(372) | VIEW_DUPLICATED | KCos(296) |
| `/operator/signage/forced-content` | ForcedContentPage(554) | VIEW_DUPLICATED | KCos(434) |
| `/operator/tablet/screen-sets` | OperatorTabletScreenSetsPage(262) | SERVICE_SPECIFIC | 태블릿 화면 세트 원본 — KPA 전용 |
| `/operator/legal` | LegalManagementPage(323) | SERVICE_SPECIFIC | KPA 거버넌스(약관) |
| `/operator/audit-logs` | AuditLogPage(333) | SERVICE_SPECIFIC | KPA 거버넌스(감사 로그) |
| `/operator/docs` | OperatorContentHubPage(707) | SERVICE_SPECIFIC | KPA 콘텐츠 허브 |
| `/operator/content-hub/:id` | OperatorContentDetailPage(326) | SERVICE_SPECIFIC | KPA 콘텐츠 허브 상세 |
| `/operator/resources` | OperatorResourcesPage(22) | FULLY_COMMON | operator-core-ui resources |
| `/operator/resources/new` | OperatorContentHubPage(707) | SERVICE_SPECIFIC | 콘텐츠 허브 컴포넌트 재사용 |
| `/operator/resources/:id/edit` | OperatorContentDetailPage(326) | SERVICE_SPECIFIC | 콘텐츠 허브 컴포넌트 재사용 |
| `/operator/forum` | OperatorForumPage(41) | FULLY_COMMON | operator-core-ui forum-hub |
| `/operator/members` | MemberManagementPage(660) | CORE_ONLY | OperatorMembersConsolePage 소비하나 KPA 전용 확장 셸 660L |
| `/operator/product-applications` | ProductApplicationManagementPage(72) | FULLY_COMMON | operator-core-ui product-applications |
| `/operator/approvals` | SupplierContentApprovalPage(423) | SERVICE_SPECIFIC | KPA 공급자 콘텐츠 승인 |
| `/operator/event-offers` | EventOfferManagePage(1082) | VIEW_DUPLICATED | KCos EventOfferApprovalsPage(275) |
| `/operator/recruitment-exposure` | RecruitmentExposureApprovalPage(110) | CORE_ONLY | RecruitmentExposureConsole 공통 + 서비스별 fetch/에러 셸 중복 |
| `/operator/products` | OperatorProductsPage(56) | FULLY_COMMON | operator-core-ui product-order-view |
| `/operator/orders` | OperatorOrdersPage(52) | FULLY_COMMON | operator-core-ui product-order-view |
| `/operator/qualification-requests` | QualificationRequestsPage(529) | SERVICE_SPECIFIC | 약사 자격 심사 — KPA 고유 거버넌스 |
| `/operator/lms` | OperatorLmsCoursesPage(27) | FULLY_COMMON | operator-core-ui lms-courses |
| `/operator/guide-contents` | OperatorGuideContentsPage(14) | FULLY_COMMON | operator-core-ui guide-contents |
| `/operator/stores` | OperatorStoresPage(81) | FULLY_COMMON | operator-core-ui stores |
| `/operator/stores/:storeId` | OperatorStoreDetailPage(580) | VIEW_DUPLICATED | KCos StoreDetailPage(433) |
| `/operator/store-channels` | OperatorStoreChannelsPage(412) | VIEW_DUPLICATED | KCos(396) |
| `/operator/users/:id` | UserDetailPage(72) | VIEW_DUPLICATED | KCos(69)/Neture(104) |
| `/operator/surveys` | OperatorSurveyListPage(14) | FULLY_COMMON | 본 WO 공통화 — operator-core-ui surveys |
| `/operator/surveys/new` | OperatorSurveyCreatePage(13) | FULLY_COMMON | 본 WO 공통화 |
| `/operator/blog` | OperatorBlogListPage(526) | VIEW_DUPLICATED | KCos(369) |
| `/operator/blog/new` | OperatorBlogWritePage(276) | VIEW_DUPLICATED | KCos(198) |
| `/operator/blog/:id/edit` | OperatorBlogWritePage(276) | VIEW_DUPLICATED | KCos(198) |
| `/operator/pop` | OperatorPopListPage(500) | VIEW_DUPLICATED | KCos(359) |
| `/operator/pop/new` | OperatorPopWritePage(281) | VIEW_DUPLICATED | KCos(198) |
| `/operator/pop/:id/edit` | OperatorPopWritePage(281) | VIEW_DUPLICATED | KCos(198) |
| `/operator/qr` | OperatorQrListPage(537) | VIEW_DUPLICATED | KCos(384) |
| `/operator/qr/new` | OperatorQrWritePage(476) | VIEW_DUPLICATED | KCos(285) |
| `/operator/qr/:id/edit` | OperatorQrWritePage(476) | VIEW_DUPLICATED | KCos(285) |
| `/operator/video` | OperatorVideoListPage(493) | SERVICE_SPECIFIC | QR 전용 동영상 — KPA 만 보유 |
| `/operator/video/new` | OperatorVideoWritePage(299) | SERVICE_SPECIFIC | 동일 |
| `/operator/video/:id/edit` | OperatorVideoWritePage(299) | SERVICE_SPECIFIC | 동일 |
| `/operator/multilingual-product-contents` | OperatorMultilingualContentListPage(501) | SERVICE_SPECIFIC | 다국어 상품 콘텐츠 — KPA 만 보유 |
| `/operator/multilingual-product-contents/new` | OperatorMultilingualContentWritePage(424) | SERVICE_SPECIFIC | 동일 |
| `/operator/multilingual-product-contents/:id` | OperatorMultilingualContentWritePage(424) | SERVICE_SPECIFIC | 동일 |
| `/operator/collaboration-requests` | CollaborationRequestsPage(365) | VIEW_DUPLICATED | 문의 업무를 KCos 는 공통(69), KPA 는 자체 365L |
| `/operator/analytics` | OperatorAnalyticsPage(383) | VIEW_DUPLICATED | Neture AnalyticsPage(322) |
| `/operator/roles` | RoleManagementPage(25) | FULLY_COMMON | @o4o/ui RoleManagementPage |

#### KCOS

| route | 화면 | 판정 | 근거 |
|---|---|:---:|---|
| `/operator` | KCosmeticsOperatorDashboard(141) | FULLY_COMMON | 공통 5-Block 대시보드 |
| `/operator/applications` | OperatorApplicationsPage(255) | SERVICE_SPECIFIC | KCos 신청 관리 |
| `/operator/product-applications` | ProductApplicationManagementPage(84) | FULLY_COMMON | operator-core-ui product-applications |
| `/operator/products` | OperatorProductsPage(56) | FULLY_COMMON | operator-core-ui product-order-view |
| `/operator/products/:productId` | ProductDetailPage(309) | SERVICE_SPECIFIC | KCos 상품 상세 |
| `/operator/stores` | StoresPage(187) | CORE_ONLY | OperatorStoresList 소비하나 서비스 셸 중복(KPA 81 대비) |
| `/operator/stores/:storeId` | StoreDetailPage(433) | VIEW_DUPLICATED | KPA(580) |
| `/operator/store-channels` | OperatorStoreChannelsPage(396) | VIEW_DUPLICATED | KPA(412) |
| `/operator/orders` | OrdersPage(51) | FULLY_COMMON | operator-core-ui product-order-view |
| `/operator/event-offers` | EventOfferApprovalsPage(275) | VIEW_DUPLICATED | KPA(1082) |
| `/operator/recruitment-exposure` | RecruitmentExposureApprovalPage(91) | CORE_ONLY | RecruitmentExposureConsole 공통 + 서비스 셸 |
| `/operator/signage/content` | SignageContentHubPage | SERVICE_SPECIFIC | KCos 안내 영상·자료 |
| `/operator/signage/playlist/:id` | SignagePlaylistDetailPage | SERVICE_SPECIFIC | 동일 계열 |
| `/operator/signage/media/:id` | SignageMediaDetailPage | SERVICE_SPECIFIC | 동일 계열 |
| `/operator/signage/hq-media` | HqMediaPage(415) | VIEW_DUPLICATED | KPA(541) |
| `/operator/signage/hq-media/:mediaId` | HqMediaDetailPage(284) | VIEW_DUPLICATED | KPA(307) |
| `/operator/signage/hq-playlists` | HqPlaylistsPage(227) | VIEW_DUPLICATED | KPA(295) |
| `/operator/signage/hq-playlists/new` | HqPlaylistCreatePage(96) | VIEW_DUPLICATED | KPA(120) |
| `/operator/signage/hq-playlists/:playlistId` | HqPlaylistDetailPage(373) | VIEW_DUPLICATED | KPA(598) |
| `/operator/signage/templates` | SignageTemplatesPage(205) | VIEW_DUPLICATED | KPA(347) |
| `/operator/signage/templates/:templateId` | SignageTemplateDetailPage(296) | VIEW_DUPLICATED | KPA(372) |
| `/operator/signage/forced-content` | ForcedContentPage(434) | VIEW_DUPLICATED | KPA(554) |
| `/operator/members` | UsersPage(317) | CORE_ONLY | OperatorMembersConsolePage 소비 + 서비스 확장 셸 |
| `/operator/members/:id` | UserDetailPage(69) | VIEW_DUPLICATED | KPA(72)/Neture(104) |
| `/operator/ai-report` | AiReportPage(21)+config(155) | FULLY_COMMON | @o4o/ui AiReportPage |
| `/operator/store-cockpit` | StoreCockpitPage(657) | SERVICE_SPECIFIC | KCos 매장 코크핏 |
| `/operator/forum` | OperatorForumPage(37) | FULLY_COMMON | operator-core-ui forum-hub |
| `/operator/forum-requests` | ForumRequestsPage(42) | FULLY_COMMON | operator-core-ui forum-requests |
| `/operator/forum-categories` | ForumCategoriesManagementPage(52) | FULLY_COMMON | operator-core-ui forum-categories |
| `/operator/forum-delete-requests` | ForumDeleteRequestsPage(48) | FULLY_COMMON | operator-core-ui forum-delete-requests |
| `/operator/forum-analytics` | ForumAnalyticsPage(30) | FULLY_COMMON | operator-core-ui forum-analytics |
| `/operator/guide-contents` | OperatorGuideContentsPage(14) | FULLY_COMMON | operator-core-ui guide-contents |
| `/operator/resources` | OperatorResourcesPage(19) | FULLY_COMMON | operator-core-ui resources |
| `/operator/content-management` | OperatorContentPage(29) | FULLY_COMMON | operator-core-ui CmsContentManager |
| `/operator/contacts` | OperatorContactInquiriesPage(69) | FULLY_COMMON | operator-core-ui contact-inquiry |
| `/operator/lms` | OperatorLmsCoursesPage(27) | FULLY_COMMON | operator-core-ui lms-courses |
| `/operator/surveys` | OperatorSurveyListPage(13) | FULLY_COMMON | 본 WO 공통화 |
| `/operator/surveys/new` | OperatorSurveyCreatePage(13) | FULLY_COMMON | 본 WO 공통화 |
| `/operator/blog` | OperatorBlogListPage(369) | VIEW_DUPLICATED | KPA(526) |
| `/operator/blog/new` | OperatorBlogWritePage(198) | VIEW_DUPLICATED | KPA(276) |
| `/operator/blog/:id/edit` | OperatorBlogWritePage(198) | VIEW_DUPLICATED | KPA(276) |
| `/operator/pop` | OperatorPopListPage(359) | VIEW_DUPLICATED | KPA(500) |
| `/operator/pop/new` | OperatorPopWritePage(198) | VIEW_DUPLICATED | KPA(281) |
| `/operator/pop/:id/edit` | OperatorPopWritePage(198) | VIEW_DUPLICATED | KPA(281) |
| `/operator/qr` | OperatorQrListPage(384) | VIEW_DUPLICATED | KPA(537) |
| `/operator/qr/new` | OperatorQrWritePage(285) | VIEW_DUPLICATED | KPA(476) |
| `/operator/qr/:id/edit` | OperatorQrWritePage(285) | VIEW_DUPLICATED | KPA(476) |

#### NETURE

| route | 화면 | 판정 | 근거 |
|---|---|:---:|---|
| `/operator` | NetureOperatorDashboard(113) | FULLY_COMMON | 공통 5-Block 대시보드 |
| `/operator/members` | UsersManagementPage(466) | CORE_ONLY | operator-core-ui 회원 모듈 부분 소비 + Neture 자체 목록 셸 |
| `/operator/members/:id` | UserDetailPage(104) | VIEW_DUPLICATED | KPA(72)/KCos(69) |
| `/operator/users` | UsersManagementPage(466) | CORE_ONLY | legacy alias 경로(동일 컴포넌트) |
| `/operator/users/:id` | UserDetailPage(104) | VIEW_DUPLICATED | legacy alias 경로 |
| `/operator/stores` | StoreManagementPage(184) | CORE_ONLY | OperatorStoresList + Neture 셸 |
| `/operator/orders` | OrdersManagementPage(448) | VIEW_DUPLICATED | KPA/KCos 는 공통 product-order-view(52/51), Neture 만 자체 448L |
| `/operator/ai-report` | OperatorAiReportPage(13) | FULLY_COMMON | @o4o/ui AiReportPage |
| `/operator/settings/notifications` | EmailNotificationSettingsPage(271) | SERVICE_SPECIFIC | Neture 이메일 알림 설정 |
| `/operator/applications` | RegistrationRequestsPage(880) | SERVICE_SPECIFIC | Neture 가입 신청(공급자/파트너) |
| `/operator/community` | ForumManagementPage(50) | FULLY_COMMON | operator-core-ui forum-requests |
| `/operator/forum-delete` | ForumDeletePage(77) | FULLY_COMMON | operator-core-ui forum-delete-requests |
| `/operator/forum-delete-requests` | ForumDeleteRequestsPage(60) | FULLY_COMMON | operator-core-ui forum-delete-requests |
| `/operator/forum-analytics` | ForumAnalyticsPage(212) | CORE_ONLY | KPA/KCos 는 30L 공통 wrapper, Neture 만 212L 자체 구현 |
| `/operator/all-registered-products` | AllRegisteredProductsPage(1132) | SERVICE_SPECIFIC | Neture 유통 상품 원장 |
| `/operator/recruiting-products` | RecruitingProductsOverviewPage(379) | SERVICE_SPECIFIC | 판매자 모집 제품 |
| `/operator/ai-card-report` | AiCardReportPage | SERVICE_SPECIFIC | Neture AI 카드 노출 리포트 |
| `/operator/ai-operations` | AiOperationsPage | SERVICE_SPECIFIC | Neture AI 운영 상태 |
| `/operator/ai/asset-quality` | AssetQualityPage | SERVICE_SPECIFIC | Context Asset 품질 관리 |
| `/operator/homepage-cms` | HomepageCmsPage(316) | SERVICE_SPECIFIC | Neture 홈페이지 CMS |
| `/operator/guide-contents` | OperatorGuideContentsPage(14) | FULLY_COMMON | operator-core-ui guide-contents |
| `/operator/analytics` | OperatorAnalyticsPage(322) | VIEW_DUPLICATED | KPA(383) |
| `/operator/category-mapping-rules` | CategoryMappingRulesPage(343) | SERVICE_SPECIFIC | Neture 카테고리 매핑 규칙 |
| `/operator/market-trial` | MarketTrialApprovalsPage(635) | SERVICE_SPECIFIC | 유통참여형 펀딩 관리 |
| `/operator/market-trial/:id` | MarketTrialApprovalDetailPage(1249) | SERVICE_SPECIFIC | 동일 |
| `/operator/product-service-approvals` | ProductServiceApprovalPage(1168) | SERVICE_SPECIFIC | 서비스별 상품 승인 |
| `/operator/product-approvals` | OperatorProductApprovalPage(584) | SERVICE_SPECIFIC | 상품 승인 관리 |
| `/operator/product-candidates` | ProductCandidateReviewPage(793) | SERVICE_SPECIFIC | 상품 후보 검토 |
| `/operator/actions` | OperatorActionQueuePage(225) | SERVICE_SPECIFIC | Neture Action Queue 전용 화면 |
| `/operator/suppliers` | OperatorSupplierApprovalPage(798) | SERVICE_SPECIFIC | 공급자 승인 |
| `/operator/contact-messages` | OperatorContactMessagesPage(282) | VIEW_DUPLICATED | KCos contacts 는 공통 모듈(69), Neture 는 자체 282L |

#### PH

| route | 화면 | 판정 | 근거 |
|---|---|:---:|---|
| `/operator` | OperatorDashboardPage(110) | FULLY_COMMON | 본 WO 신설 — OperatorDashboardLayout 5-Block |
| `/operator/memberships` | MembershipsPage(62) | FULLY_COMMON | operator-core-ui OperatorMembersConsolePage |
| `/operator/memberships/:membershipId` | MembershipDetailPage(185) | SERVICE_SPECIFIC | PH 가입 신청 상세(사업자 프로필) — 대응 공통 모듈 없음 |

#### OUT_OF_SCOPE — alias / redirect / catch-all 12건

| 서비스 | route | 대상 |
|---|---|---|
| KPA | `/operator/forum-management` | → `/operator/forum-requests` |
| KPA | `/operator/community-management` | → `/operator/community` |
| KPA | `/operator/news` | → `/operator/content` |
| KPA | `/operator/lms/courses` | → `/operator/lms` |
| KPA | `/operator/users` | → `/operator/members` |
| KPA | `/operator/operators` | → `/operator/members` |
| KPA | `/operator/*` | → `/operator` (catch-all) |
| KCos | `/operator/users` | → `/operator/members` |
| KCos | `/operator/users/:id` | → `/operator/members` |
| Neture | `/operator/supply` | → `/operator/all-registered-products` |
| Neture | `/operator/all-products` | → `/operator/all-registered-products` |
| Neture | `/operator/supplier-quality` | → `/operator/suppliers` |

#### route 는 있으나 sidebar 메뉴에 없는 화면 (deep link 전용)

| 서비스 | route | 판단 |
|---|---|---|
| KPA | `/operator/legal` | 거버넌스 화면. RoleGuard(KPA_ADMIN) 로 보호되며 메뉴 미노출은 의도로 본다. |
| KPA | `/operator/collaboration-requests` | 메뉴 없음 — 노출 여부는 IA 판단 필요(별도 WO). |
| KPA | `/operator/content-hub/:id`, `/operator/users/:id`, `*/new`, `*/:id/edit` | 목록에서 진입하는 하위 화면. 정상. |
| KCos | `/operator/products/:productId`, `/operator/members/:id`, `signage/*/:id` | 동일. 정상. |
| Neture | `/operator/market-trial/:id`, `/operator/members/:id`, `/operator/users*` | 동일 + legacy alias. 정상. |
| Neture | `/operator/product-service-approvals`, `/operator/product-approvals` | 메뉴 미노출. 승인 그룹 IA 정리 필요(별도 WO). |

메뉴에는 있으나 route 가 없는 항목(데드링크)은 **4개 서비스 모두 0건**이다.
