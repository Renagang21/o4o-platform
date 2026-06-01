# IR-O4O-OPERATOR-DASHBOARD-REAL-WORKFLOW-AUDIT-V1

**작성일**: 2026-05-14  
**작성자**: Claude Code (코드 기반 정적 조사)  
**조사 대상**: web-kpa-society 운영자 기능 전수 조사  
**조사 방법**: OperatorRoutes.tsx, operatorMenuGroups.ts, pages/operator/**, kpa.routes.ts 직접 읽기  
**코드 수정**: 없음

---

## 1. 운영자 라우트 전체 목록

> 소스: `services/web-kpa-society/src/routes/OperatorRoutes.tsx`

| # | 경로 | 컴포넌트 | 파일 존재 | 메뉴 노출 | 비고 |
|---|------|---------|---------|---------|-----|
| 1 | `/operator` (index) | `KpaOperatorDashboard` | ✅ | ✅ 대시보드 | 5-Block |
| 2 | `/operator/ai-report` | `OperatorAiReportPage` | ✅ | ✅ AI 리포트 | |
| 3 | `/operator/forum-management` | `ForumManagementPage` | ✅ | ✅ 포럼 관리 | |
| 4 | `/operator/community` | `CommunityManagementPage` | ✅ | ✅ Home 편집 | |
| 5 | `/operator/community-management` | → `/operator/community` redirect | — | — | 레거시 리다이렉트 |
| 6 | `/operator/forum-delete-requests` | `ForumDeleteRequestsPage` | ✅ | ✅ 삭제 요청 | |
| 7 | `/operator/forum-analytics` | `ForumAnalyticsDashboard` | ✅ | ✅ 포럼 분석 | |
| 8 | `/operator/content` | `ContentManagementPage` | ✅ | ✅ 공지사항/뉴스 | |
| 9 | `/operator/news` | → `/operator/content` redirect | — | — | 레거시 리다이렉트 |
| 10 | `/operator/signage/hq-media` | `HqMediaPage` | ✅ | ✅ HQ 미디어 | |
| 11 | `/operator/signage/hq-media/:mediaId` | `HqMediaDetailPage` | ✅ | ❌ 상세 페이지 | |
| 12 | `/operator/signage/hq-playlists` | `HqPlaylistsPage` | ✅ | ✅ HQ 플레이리스트 | |
| 13 | `/operator/signage/hq-playlists/:playlistId` | `HqPlaylistDetailPage` | ✅ | ❌ 상세 페이지 | |
| 14 | `/operator/signage/templates` | `TemplatesPage` | ✅ | ✅ 템플릿 | |
| 15 | `/operator/signage/templates/:templateId` | `TemplateDetailPage` | ✅ | ❌ 상세 페이지 | |
| 16 | `/operator/signage/forced-content` | `ForcedContentPage` | ✅ | ✅ 강제 콘텐츠 | |
| 17 | `/operator/legal` | `LegalManagementPage` | ✅ | ✅ 법률 관리 (admin-only) | |
| 18 | `/operator/audit-logs` | `AuditLogPage` | ✅ | ✅ 감사 로그 (admin-only) | |
| 19 | `/operator/docs` | `OperatorContentHubPage` | ✅ | ✅ 콘텐츠 허브 | |
| 20 | `/operator/content-hub/:id` | `OperatorContentDetailPage` | ✅ | ❌ 상세 페이지 | |
| 21 | `/operator/resources` | `OperatorResourcesPage` | ✅ | ✅ 자료실 관리 | |
| 22 | `/operator/resources/new` | `OperatorContentHubPage` | ✅ | ❌ 등록 페이지 | |
| 23 | `/operator/resources/:id/edit` | `OperatorContentDetailPage` | ✅ | ❌ 편집 페이지 | |
| 24 | `/operator/working-content` | `WorkingContentListPage` | ✅ | ❌ **메뉴 미노출** | |
| 25 | `/operator/working-content/:id` | `WorkingContentEditPage` | ✅ | ❌ 상세 페이지 | |
| 26 | `/operator/forum` | `OperatorForumPage` | ✅ | ✅ 포럼 운영 | |
| 27 | `/operator/members` | `MemberManagementPage` | ✅ | ✅ 회원 관리 | |
| 28 | `/operator/pharmacy-requests` | `PharmacyRequestManagementPage` | ✅ | ❌ **의도적 숨김** | WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1 |
| 29 | `/operator/product-applications` | `ProductApplicationManagementPage` | ✅ | ✅ 상품 신청 관리 | |
| 30 | `/operator/event-offers` | `EventOfferManagePage` | ✅ | ✅ 이벤트 오퍼 승인 | |
| 31 | `/operator/qualification-requests` | `QualificationRequestsPage` | ✅ | ✅ 강사 승인 | |
| 32 | `/operator/lms` | `OperatorLmsCoursesPage` | ✅ | ✅ 강의 관리 | |
| 33 | `/operator/lms/courses` | → `/operator/lms` redirect | — | — | 레거시 리다이렉트 |
| 34 | `/operator/guide-contents` | `OperatorGuideContentsPage` | ✅ | ✅ 안내 문구 관리 | |
| 35 | `/operator/stores` | `OperatorStoresPage` | ✅ | ❌ **의도적 숨김** | WO-KPA-OPERATOR-STORES-MENU-HIDE-V1 |
| 36 | `/operator/stores/:storeId` | `OperatorStoreDetailPage` | ✅ | ❌ 상세 페이지 | |
| 37 | `/operator/store-channels` | `OperatorStoreChannelsPage` | ✅ | ❌ **의도적 숨김** | WO-KPA-OPERATOR-STORES-MENU-HIDE-V1 |
| 38 | `/operator/users` | → `/operator/members` redirect | — | — | 레거시 리다이렉트 |
| 39 | `/operator/users/:id` | `UserDetailPage` | ✅ | ❌ 상세 페이지 | |
| 40 | `/operator/collaboration-requests` | `CollaborationRequestsPage` | ✅ | ✅ 협업 문의 | |
| 41 | `/operator/analytics` | `OperatorAnalyticsPage` | ✅ | ✅ 운영 분석 | |
| 42 | `/operator/roles` | `RoleManagementPage` | ✅ | ✅ 역할 관리 (admin-only) | |
| 43 | `/operator/operators` | → `/operator/members` redirect | — | — | 레거시 리다이렉트 |

**총 실제 페이지**: 35개 (리다이렉트 제외)  
**Dead route**: 0개 — 모든 파일 존재, 모든 라우트 활성  

---

## 2. 운영자 메뉴 구조

> 소스: `services/web-kpa-society/src/config/operatorMenuGroups.ts` (UNIFIED_MENU 기준)

```
dashboard
└─ 대시보드          /operator

users
└─ 회원 관리         /operator/members
   [약국 서비스 신청 숨김 — WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1]

approvals
├─ 상품 신청 관리    /operator/product-applications
├─ 이벤트 오퍼 승인  /operator/event-offers
└─ 협업 문의         /operator/collaboration-requests

content
├─ 공지사항/뉴스     /operator/content
├─ Home 편집         /operator/community
└─ 콘텐츠 허브       /operator/docs

resources
└─ 자료실 관리       /operator/resources

lms
├─ 강의 관리         /operator/lms
├─ 강사 승인         /operator/qualification-requests
└─ 안내 문구 관리    /operator/guide-contents

signage
├─ HQ 미디어         /operator/signage/hq-media
├─ HQ 플레이리스트   /operator/signage/hq-playlists
├─ 템플릿            /operator/signage/templates
└─ 강제 콘텐츠       /operator/signage/forced-content

forum
├─ 포럼 운영         /operator/forum
├─ 포럼 관리         /operator/forum-management
├─ 삭제 요청         /operator/forum-delete-requests
└─ 포럼 분석         /operator/forum-analytics

analytics
├─ AI 리포트         /operator/ai-report
└─ 운영 분석         /operator/analytics

system (admin-only)
├─ 법률 관리         /operator/legal
├─ 감사 로그         /operator/audit-logs
└─ 역할 관리         /operator/roles

[stores 그룹 전체 주석 처리 — WO-KPA-OPERATOR-STORES-MENU-HIDE-V1]
```

**Operator 기준 메뉴 항목**: 9개 그룹, 25개 항목  
**Admin 추가**: system 그룹 3개 항목  

---

## 3. 메뉴 ↔ 라우트 불일치 정리

### 3-1. 라우트 있음 + 메뉴 없음 (의도적 숨김)

| 경로 | 기능 | 숨김 이유 (WO) | 구현 완성도 |
|------|------|--------------|------------|
| `/operator/pharmacy-requests` | 약국 서비스 신청 관리 (승인/반려) | `WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1` | 완전 구현 (DataTable, API, approve/reject) |
| `/operator/stores` | 매장 목록 관리 | `WO-KPA-OPERATOR-STORES-MENU-HIDE-V1` | 완전 구현 (@o4o/operator-core-ui thin wrapper) |
| `/operator/stores/:storeId` | 매장 상세 | 상동 | 완전 구현 |
| `/operator/store-channels` | 채널 관리 | 상동 | 완전 구현 |
| `/operator/working-content` | 내 콘텐츠 목록 | 미기록 (명시적 WO 없음) | 완전 구현 (fetchWorkingContents API) |
| `/operator/working-content/:id` | 내 콘텐츠 편집 | 상동 | 완전 구현 |

> **결론**: 6개 라우트가 완전히 구현되어 있으나 메뉴에서 숨겨져 있다. 직접 URL 진입 시 정상 동작한다.

### 3-2. 메뉴 항목 ↔ 실제 경로 불일치

| 메뉴 레이블 | 메뉴 경로 | 실제 라우트 상태 | 비고 |
|-----------|---------|--------------|-----|
| Home 편집 | `/operator/community` | ✅ 정상 | content 그룹 배치, 실제로는 커뮤니티 홈 편집 |
| 콘텐츠 허브 | `/operator/docs` | ✅ 정상 | 경로명 `docs` ≠ "콘텐츠 허브" 개념 불명확 |
| 자료실 관리 | `/operator/resources` | ✅ 정상 | resources 독립 그룹 |

### 3-3. Dead Route
없음. 모든 라우트의 컴포넌트 파일이 존재한다.

---

## 4. 기능별 분류표

> 각 기능을 "커뮤니티 운영" / "매장 HUB 운영" / "공급자 운영" / "콘텐츠 운영" / "사이니지 운영" / "기타" 로 분류

| 기능명 | 경로 | 메뉴 | 구현 상태 | 분류 |
|--------|------|------|---------|-----|
| 5-Block 대시보드 | `/operator` | ✅ | 완전 구현 | 기타(통합) |
| 포럼 운영 허브 | `/operator/forum` | ✅ | 완전 구현 | 커뮤니티 운영 |
| 포럼 관리 | `/operator/forum-management` | ✅ | 완전 구현 | 커뮤니티 운영 |
| 포럼 삭제 요청 | `/operator/forum-delete-requests` | ✅ | 완전 구현 | 커뮤니티 운영 |
| 포럼 분석 | `/operator/forum-analytics` | ✅ | 완전 구현 | 커뮤니티 운영 |
| Home 편집 | `/operator/community` | ✅ | 완전 구현 | 커뮤니티 운영 |
| 공지사항/뉴스 | `/operator/content` | ✅ | 완전 구현 | 콘텐츠 운영 |
| 콘텐츠 허브 | `/operator/docs` | ✅ | 완전 구현 | 콘텐츠 운영 |
| 자료실 관리 | `/operator/resources` | ✅ | 완전 구현 | 콘텐츠 운영 |
| 내 콘텐츠 | `/operator/working-content` | ❌ | 완전 구현 | 콘텐츠 운영 |
| HQ 미디어 | `/operator/signage/hq-media` | ✅ | 완전 구현 | 사이니지 운영 |
| HQ 플레이리스트 | `/operator/signage/hq-playlists` | ✅ | 완전 구현 | 사이니지 운영 |
| 사이니지 템플릿 | `/operator/signage/templates` | ✅ | 완전 구현 | 사이니지 운영 |
| 강제 콘텐츠 지정 | `/operator/signage/forced-content` | ✅ | 완전 구현 | 사이니지 운영 |
| 상품 신청 관리 | `/operator/product-applications` | ✅ | 완전 구현 | 공급자/매장HUB 운영 |
| 이벤트 오퍼 승인 | `/operator/event-offers` | ✅ | 완전 구현 | 공급자/매장HUB 운영 |
| 협업 문의 | `/operator/collaboration-requests` | ✅ | 완전 구현 | 공급자 운영 |
| 약국 서비스 신청 | `/operator/pharmacy-requests` | ❌(숨김) | 완전 구현 | 매장 HUB 운영 |
| 매장 관리 | `/operator/stores` | ❌(숨김) | 완전 구현 | 매장 HUB 운영 |
| 매장 상세 | `/operator/stores/:id` | ❌(숨김) | 완전 구현 | 매장 HUB 운영 |
| 채널 관리 | `/operator/store-channels` | ❌(숨김) | 완전 구현 | 매장 HUB 운영 |
| 강의 관리 | `/operator/lms` | ✅ | 완전 구현 | LMS 운영 |
| 강사 승인 | `/operator/qualification-requests` | ✅ | 완전 구현 | LMS 운영 |
| 안내 문구 관리 | `/operator/guide-contents` | ✅ | 완전 구현 | LMS 운영 |
| 회원 관리 | `/operator/members` | ✅ | 완전 구현 | 기타(운영) |
| AI 리포트 | `/operator/ai-report` | ✅ | 완전 구현 | 기타(분석) |
| 운영 분석 | `/operator/analytics` | ✅ | 완전 구현 | 기타(분석) |
| 법률 관리 | `/operator/legal` | ✅(admin) | 완전 구현 | 기타(admin) |
| 감사 로그 | `/operator/audit-logs` | ✅(admin) | 완전 구현 | 기타(admin) |
| 역할 관리 | `/operator/roles` | ✅(admin) | 완전 구현 | 기타(admin) |

---

## 5. API 서버 운영자 엔드포인트 목록

> 소스: `apps/api-server/src/routes/kpa/kpa.routes.ts` + 개별 컨트롤러

### 5-1. Operator 스코프 (`kpa:operator`)

| 컨트롤러 | 주요 엔드포인트 | 기능 |
|---------|--------------|------|
| `operator-summary.controller.ts` | `GET /operator` (3개 집계 엔드포인트) | 대시보드 요약 |
| `operator-product-applications.controller.ts` | `GET,PATCH,DELETE /operator/product-applications` + `/batch-*` | 상품 승인 (batch 포함) |
| `event-offer-operator.controller.ts` | `GET,PATCH /operator/event-offers` (11개) | Event Offer 운영 |
| `contact-request.controller.ts` | `GET,PATCH /operator/contact-requests` | 협업 문의 처리 |
| `pharmacy-request.controller.ts` | `GET,PATCH /pharmacy-requests` | 약국 신청 승인/반려 |
| `kpa.routes.ts` inline | `GET,PATCH /operator/contact-requests` | 협업 문의 |

### 5-2. Admin 스코프 (`kpa:admin`)

| 컨트롤러 | 주요 엔드포인트 | 기능 |
|---------|--------------|------|
| `admin-force-asset.controller.ts` | `GET,POST,PATCH,DELETE /admin/force-assets` | 매장 강제 자산 지정/관리 |
| `organization.controller.ts` | `GET,POST,PATCH,DELETE /organizations` | 조직 CRUD |
| `member.controller.ts` | `GET,PATCH,DELETE /members` (10개) | 회원 관리 (KpaMember) |
| `application.controller.ts` | `GET,PATCH /applications` (7개) | 신청서 처리 |
| `kpa.routes.ts` inline | `GET /operator/audit-logs` | 감사 로그 |
| `kpa.routes.ts` inline | `POST /operator/ai/summarize-selection` | AI 선택 요약 |

### 5-3. 매장 HUB 관련 컨트롤러 (store 영역)

> `apps/api-server/src/routes/o4o-store/controllers/` 에 위치하며 kpa.routes.ts에서 마운트됨

| 컨트롤러 | 마운트 경로 | 기능 |
|---------|-----------|------|
| `store-hub.controller.ts` | `/store-hub/*` | 스토어 허브 탐색 |
| `store-asset-control.controller.ts` | `/store-assets` | 매장 자산 publish 상태 관리 |
| `store-content.controller.ts` | `/store-contents` | direct 콘텐츠 CRUD |
| `store-library-feed.controller.ts` | `/store-library/contents` | 자료함 통합 피드 |
| `pharmacy-products.controller.ts` | `/pharmacy/products` | 약국 상품 관리 |

---

## 6. 매장 HUB 운영 기능 구현 상태 상세

| 기능 | 위치 | 구현 상태 | 비고 |
|------|------|---------|-----|
| 약국 서비스 신청 승인/반려 | `PharmacyRequestManagementPage` + `pharmacy-request.controller.ts` | ✅ 완전 구현 | DataTable + approve/reject |
| 매장 목록 조회/관리 | `OperatorStoresPage` (thin wrapper) + `/api/v1/operator/stores` | ✅ 완전 구현 | @o4o/operator-core-ui 활용 |
| 매장 상세 정보 | `OperatorStoreDetailPage` + `/api/v1/operator/stores/:id` | ✅ 완전 구현 | |
| 채널 관리 | `OperatorStoreChannelsPage` | ✅ 완전 구현 | |
| 강제 자산 지정 | `admin-force-asset.controller.ts` | ✅ API 완전 구현 | **UI 없음** — admin-only, operator 화면 없음 |
| 매장 자산 publish 관리 | `store-asset-control.controller.ts` | ✅ API 완전 구현 | 매장 사용자 전용, 운영자 UI 없음 |
| Event Offer 승인 | `EventOfferManagePage` + `event-offer-operator.controller.ts` | ✅ 완전 구현 | approvals 그룹 메뉴 노출 |
| 상품 신청 승인/일괄처리 | `ProductApplicationManagementPage` + `operator-product-applications.controller.ts` | ✅ 완전 구현 | batch approve/reject/delete 포함 |
| 매장 복사 가능 콘텐츠 관리 | 해당 operator UI 없음 | ❌ UI 없음 | store-asset-control이 매장 사용자 전용 |
| 운영자 제작 콘텐츠 등록 | `OperatorContentHubPage` (`/operator/docs`) | ✅ 완전 구현 | HUB 콘텐츠 등록 |
| 공급자 제공 콘텐츠 관리 | `supplier-content.controller.ts` | ✅ API 구현 | UI 불명확 |
| 매장 제작자료 운영 흐름 | 해당 operator UI 없음 | ❌ UI 없음 | `kpa_store_contents` 운영 화면 미존재 |

---

## 7. 현재 구조 문제점

### 7-1. 커뮤니티 운영 과집중

포럼 관련 메뉴 항목이 4개 (포럼 운영 / 포럼 관리 / 삭제 요청 / 포럼 분석)로, 전체 일반 operator 메뉴 25개의 16%를 차지한다. 이 중 "포럼 운영(`/operator/forum`)"과 "포럼 관리(`/operator/forum-management`)"는 유사한 기능으로 보이며 역할 구분이 코드 주석 외에 명확하지 않다.

### 7-2. 매장 HUB 운영 기능의 숨김

완전히 구현된 4개 기능 (약국 신청 관리 / 매장 관리 / 매장 상세 / 채널 관리)이 메뉴에서 의도적으로 숨겨진 상태다. WO 주석으로 의도가 기록되어 있으나 복구 기준이 불명확하다.

```
// WO-KPA-OPERATOR-STORE-RELATED-MENU-HIDE-V1: 약국 서비스 신청 메뉴 제거 (라우트/API/DB 유지)
// WO-KPA-OPERATOR-STORES-MENU-HIDE-V1: stores 메뉴 노출 제거
```

이 기능들은 URL 직접 접근으로는 정상 동작하므로, 운영자가 URL을 알면 사용 가능한 "숨은 기능" 상태다.

### 7-3. 강제 자산 지정 기능의 UI 부재

`admin-force-asset.controller.ts`는 4개 엔드포인트(GET/POST/PATCH/DELETE)를 완전히 구현하고 있으나, 이를 활용하는 운영자 UI가 존재하지 않는다. 사이니지 `ForcedContentPage`는 사이니지 전용이며, 일반 콘텐츠/자산의 강제 지정 화면은 없다.

### 7-4. "내 콘텐츠" (`/operator/working-content`) 고립

`WorkingContentListPage` + `WorkingContentEditPage`가 구현되어 있으나:
- 메뉴에 미노출
- 진입 경로가 코드 내에서 불명확
- WO-O4O-STORE-CONTENT-USAGE-RECOMPOSE-V1 Phase 2로 만들어졌으나 현재 운영자 관점에서는 orphan 상태

### 7-5. content / resources / docs 용어 혼용

| 메뉴 레이블 | 경로 | 실제 용도 |
|-----------|------|---------|
| 공지사항/뉴스 | `/operator/content` | CMS 뉴스/공지 CRUD |
| 콘텐츠 허브 | `/operator/docs` | HUB 콘텐츠 관리 |
| 자료실 관리 | `/operator/resources` | 자료실 CRUD |

경로명 `docs`와 UI 레이블 "콘텐츠 허브", 코드 파일명 `OperatorContentHubPage`가 각각 다른 개념어를 사용한다.

### 7-6. approvals 그룹의 분류 불명확

현재 approvals 그룹:
- 상품 신청 관리 → **공급자/매장 HUB** 성격
- 이벤트 오퍼 승인 → **공급자/매장 HUB** 성격
- 협업 문의 → **커뮤니티/비즈니스** 성격

세 항목이 서로 다른 도메인에 속하나 하나의 "승인" 그룹으로 묶여있다.

---

## 8. 커뮤니티 운영 vs 매장 HUB 운영 분류표

현재 구조를 실제 업무 흐름 기준으로 분류하면:

### 커뮤니티 운영 영역

| 기능 | 현재 그룹 | 메뉴 |
|------|---------|------|
| 포럼 운영 | forum | ✅ |
| 포럼 관리 | forum | ✅ |
| 포럼 삭제 요청 | forum | ✅ |
| 포럼 분석 | forum | ✅ |
| Home 편집 | content | ✅ |
| 공지사항/뉴스 | content | ✅ |
| 회원 관리 | users | ✅ |

### 매장 HUB 운영 영역

| 기능 | 현재 그룹 | 메뉴 |
|------|---------|------|
| 상품 신청 관리 | approvals | ✅ |
| 이벤트 오퍼 승인 | approvals | ✅ |
| 약국 서비스 신청 | users (숨김) | ❌ |
| 매장 관리 | (숨김) | ❌ |
| 채널 관리 | (숨김) | ❌ |
| 강제 자산 지정 API | — | ❌ (UI 없음) |

→ **커뮤니티 운영 기능 7개 모두 메뉴 노출, 매장 HUB 운영 기능 6개 중 2개만 메뉴 노출**

### 콘텐츠/자료 영역

| 기능 | 현재 그룹 | 메뉴 |
|------|---------|------|
| 콘텐츠 허브 | content | ✅ |
| 자료실 관리 | resources | ✅ |
| 내 콘텐츠 | (메뉴 없음) | ❌ |

### 사이니지 영역

| 기능 | 현재 그룹 | 메뉴 |
|------|---------|------|
| HQ 미디어 | signage | ✅ |
| HQ 플레이리스트 | signage | ✅ |
| 사이니지 템플릿 | signage | ✅ |
| 강제 콘텐츠 지정 | signage | ✅ |

---

## 9. 운영자 IA 재구성 후보

현재 코드 기준으로 다음과 같은 재편이 가능하다 (현재 구현과의 delta 기준):

### 후보 A: 커뮤니티/매장 분리 IA

```
[커뮤니티 운영]           [매장 HUB 운영]
 포럼 운영                 약국 신청 관리 (현재 숨김)
 포럼 관리                 매장 관리 (현재 숨김)
 포럼 삭제 요청             채널 관리 (현재 숨김)
 포럼 분석                 상품 신청 관리
 Home 편집                 이벤트 오퍼 승인
 공지사항/뉴스              강제 자산 지정 (UI 신규 필요)

[콘텐츠 운영]             [사이니지 운영]
 콘텐츠 허브               HQ 미디어
 자료실 관리               HQ 플레이리스트
                           템플릿
                           강제 콘텐츠
```

변경 필요 사항:
1. 숨겨진 메뉴 3개 복원 (pharmacy-requests, stores, store-channels)
2. 강제 자산 지정 UI 신규 구현 (admin-force-asset.controller 기반)
3. approvals 그룹 분리 (상품/이벤트 → 매장 HUB 운영, 협업 → 별도)

### 후보 B: 현 구조 유지 + 매장 HUB 메뉴 복원

가장 변경 최소:
- `operatorMenuGroups.ts`의 주석 처리된 stores 그룹 항목 복원
- `users` 그룹에 pharmacy-requests 항목 재추가
- 나머지 구조 유지

---

## 10. 조사 한계

다음 항목은 정적 코드 분석으로는 판단 불가:

1. **각 페이지의 실제 데이터 로드 정합성** — API 응답과 UI 필드 매핑이 올바른지
2. **운영자 계정으로 실제 접근 시 권한 오류 여부** — RoleGuard 동작은 런타임에서만 확인 가능
3. **admin-force-asset의 실제 운영 사용 여부** — 히스토리/사용 기록 없음
4. **내 콘텐츠(`/operator/working-content`) 진입 경로** — 외부에서 이 경로로 연결하는 링크가 있는지 불명확

---

*본 조사는 2026-05-14 기준 코드 상태를 기반으로 작성되었습니다.*  
*코드 수정 없음. 파일 읽기 + 검색만 수행.*
