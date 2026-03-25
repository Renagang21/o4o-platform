# IR-QA-O4O-FORUM-END-TO-END-FLOW-VALIDATION-V1

> **O4O 전체 서비스 포럼 사용자/운영자 흐름 검증 보고서**
> 검증일: 2026-03-23

---

## 1. 조사/검증 대상 파일 및 화면 목록

### 백엔드 공통 (Forum Core)

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/controllers/forum/ForumControllerBase.ts` | 공통 기반 (repositories, context, slug) |
| `apps/api-server/src/controllers/forum/ForumCategoryController.ts` | 카테고리 CRUD + 소유자 API + 삭제 요청 |
| `apps/api-server/src/controllers/forum/ForumController.ts` | 위임 래퍼 (backward compat) |
| `apps/api-server/src/routes/forum/forum.routes.ts` | 공통 포럼 라우트 (`/api/v1/forum/*`) |
| `apps/api-server/src/routes/forum/forum-category-request.routes.ts` | 공통 카테고리 신청 (`/api/v1/forum/category-requests/*`) |
| `apps/api-server/src/middleware/forum-context.middleware.js` | 서비스별 포럼 컨텍스트 주입 |

### GlycoPharm

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/routes/glycopharm/glycopharm.routes.ts` | 서비스별 forumRouter (소유자 API 포함) |
| `apps/api-server/src/routes/glycopharm/controllers/operator-forum-request.controller.ts` | 운영자 포럼 신청 검토 |
| `apps/api-server/src/routes/glycopharm/controllers/operator-forum-delete-request.controller.ts` | 운영자 삭제 요청 검토 |
| `services/web-glycopharm/src/pages/store/MyForumDashboardPage.tsx` | 내 포럼 관리 대시보드 |
| `services/web-glycopharm/src/pages/operator/ForumRequestsPage.tsx` | 운영자 신청 검토 페이지 |
| `services/web-glycopharm/src/pages/operator/ForumDeleteRequestsPage.tsx` | 운영자 삭제요청 검토 페이지 |
| `services/web-glycopharm/src/pages/community/CommunityMainPage.tsx` | 커뮤니티 허브 |
| `services/web-glycopharm/src/services/api.ts` | forumRequestApi + forumDeleteRequestApi |

### KPA-Society

| 파일 | 역할 |
|------|------|
| `apps/api-server/src/routes/kpa/kpa.routes.ts` | 서비스별 forumRouter (소유자 API 미포함) |
| `apps/api-server/src/routes/kpa/controllers/forum-request.controller.ts` | KPA 자체 포럼 신청 (분회 기반) |
| `services/web-kpa-society/src/pages/forum/ForumHomePage.tsx` | 포럼 허브 |
| `services/web-kpa-society/src/pages/operator/ForumManagementPage.tsx` | 운영자 포럼 신청 관리 |
| `services/web-kpa-society/src/pages/operator/ForumAnalyticsDashboard.tsx` | 포럼 분석 |
| `services/web-kpa-society/src/pages/branch/ForumRequestPanel.tsx` | 분회 관리자 신청 검토 패널 |
| `services/web-kpa-society/src/api/forum.ts` | 포럼 API 클라이언트 |

### Neture

| 파일 | 역할 |
|------|------|
| (서비스별 forumRouter 없음 — 공통 `/api/v1/forum/*` 사용) | — |
| `services/web-neture/src/pages/forum/ForumHubPage.tsx` | 포럼 허브 |
| `services/web-neture/src/pages/operator/ForumManagementPage.tsx` | 운영자 포럼 관리 |
| `services/web-neture/src/services/forumApi.ts` | 포럼 API 클라이언트 |

### K-Cosmetics

| 파일 | 역할 |
|------|------|
| (서비스별 forumRouter 없음 — 공통 `/api/v1/forum/*` 사용) | — |
| `services/web-k-cosmetics/src/pages/forum/ForumHubPage.tsx` | 포럼 허브 |
| `services/web-k-cosmetics/src/services/forumApi.ts` | 포럼 API 클라이언트 |

---

## 2. 서비스별 사용자 흐름 표

| # | 흐름 | GlycoPharm | KPA-Society | Neture | K-Cosmetics |
|---|------|:----------:|:-----------:|:------:|:-----------:|
| 1 | 커뮤니티에서 전체 포럼 보기 | ✅ CommunityMainPage | ✅ ForumHomePage | ✅ ForumHubPage | ✅ ForumHubPage |
| 2 | 포럼 상세 진입 | ✅ | ✅ ForumDetailPage | ✅ ForumPostPage | ✅ PostDetailPage |
| 3 | 게시글 보기 / 글쓰기 | ✅ | ✅ ForumWritePage | ✅ ForumWritePage | ✅ ForumWritePage |
| 4 | 포럼 개설 신청 진입 | ✅ RequestCategoryPage | ✅ (ForumRequestPanel) | ❌ 없음 | ❌ 없음 |
| 5 | 내 신청 목록 확인 | ✅ MyForumDashboardPage | ❌ 전용 화면 없음 | ❌ 없음 | ❌ 없음 |
| 6 | "내 포럼 관리" 화면 존재 | ✅ MyForumDashboardPage | ❌ 없음 | ❌ 없음 | ❌ 없음 |
| 7 | 내 운영 포럼 목록 표시 | ✅ | ❌ | ❌ | ❌ |
| 8 | 포럼 기본 정보 수정 | ✅ (name, desc, icon) | ❌ | ❌ | ❌ |
| 9 | 포럼 삭제 요청 | ✅ (모달 + API) | ❌ | ❌ | ❌ |

**요약**: 사용자 포럼 관리 흐름(4~9)은 **GlycoPharm에만 완전 구현**. 다른 서비스는 커뮤니티 이용(1~3)만 구현됨.

---

## 3. 서비스별 운영자 흐름 표

| # | 흐름 | GlycoPharm | KPA-Society | Neture | K-Cosmetics |
|---|------|:----------:|:-----------:|:------:|:-----------:|
| 1 | 포럼 신청 목록 조회 | ✅ ForumRequestsPage | ✅ ForumManagementPage | ✅ ForumManagementPage | ❌ 없음 |
| 2 | 승인 / 반려 / 보완 | ✅ 3-action review | ✅ 3-action (분회 기반) | ⚠️ 2-action (approve/reject) | ❌ |
| 3 | 승인 시 포럼 생성 흐름 | ✅ 자동 생성 | ✅ 자동 생성 (분회 scope) | ✅ (공통 서비스 경유) | ❌ |
| 4 | 삭제 요청 목록 조회 | ✅ ForumDeleteRequestsPage | ❌ | ❌ | ❌ |
| 5 | 삭제 요청 승인/반려 | ✅ (approve → isActive=false) | ❌ | ❌ | ❌ |
| 6 | 운영자 메뉴/라우트 접근 | ✅ `/operator/forum-*` | ✅ `/operator/forum-*` | ✅ `/operator/forum-management` | ❌ |
| 7 | 포럼 분석 대시보드 | ❌ | ✅ ForumAnalyticsDashboard | ❌ | ❌ |

**요약**: 운영자 신청 검토는 GlycoPharm, KPA, Neture 3개 서비스에서 구현. 삭제 요청 검토와 포럼 분석은 각각 GlycoPharm, KPA에만 존재.

---

## 4. 서비스별 API 존재 여부 표

### 백엔드 API 엔드포인트

| API | GlycoPharm | KPA-Society | Neture | K-Cosmetics |
|-----|:----------:|:-----------:|:------:|:-----------:|
| **서비스별 forumRouter** | ✅ `/api/v1/glycopharm/forum/*` | ✅ `/api/v1/kpa/forum/*` | ❌ (공통만 사용) | ❌ (공통만 사용) |
| **포럼 CRUD (posts/comments)** | ✅ 서비스별 | ✅ 서비스별 | ✅ 공통 `/api/v1/forum/*` | ✅ 공통 `/api/v1/forum/*` |
| **카테고리 목록** | ✅ | ✅ | ✅ | ✅ |
| **카테고리 인기순** | ✅ | ✅ | ✅ | ✅ |
| **내 카테고리 목록** (`/categories/mine`) | ✅ | ❌ | ❌ (공통에는 존재) | ❌ (공통에는 존재) |
| **소유자 수정** (`/categories/:id/owner`) | ✅ | ❌ | ❌ (공통에는 존재) | ❌ (공통에는 존재) |
| **삭제 요청** (`/categories/:id/delete-request`) | ✅ | ❌ | ❌ (공통에는 존재) | ❌ (공통에는 존재) |
| **포럼 신청 생성** | ✅ 공통 API | ✅ KPA 자체 | ✅ 공통 API | ✅ 공통 API |
| **내 신청 목록** | ✅ 공통 API | ✅ KPA 자체 | ✅ 공통 API | ✅ 공통 API |
| **운영자 신청 검토** | ✅ `/glycopharm/operator/forum-requests/*` | ✅ `/kpa/branches/:id/forum-requests/*` | ❌ 서비스별 없음 | ❌ |
| **운영자 삭제요청 검토** | ✅ `/glycopharm/operator/forum-delete-requests/*` | ❌ | ❌ | ❌ |
| **포럼 분석** | ❌ | ✅ `/kpa/operator/forum-analytics` | ❌ | ❌ |

### 프론트엔드 API 클라이언트

| API 메서드 | GlycoPharm | KPA-Society | Neture | K-Cosmetics |
|-----------|:----------:|:-----------:|:------:|:-----------:|
| `getMyCategories()` | ✅ forumRequestApi | ❌ | ❌ | ❌ |
| `updateMyCategory()` | ✅ forumRequestApi | ❌ | ❌ | ❌ |
| `requestDeleteCategory()` | ✅ forumRequestApi | ❌ | ❌ | ❌ |
| `forumDeleteRequestApi.*` | ✅ (getAll, approve, reject) | ❌ | ❌ | ❌ |
| Forum 신청 생성/조회 | ✅ forumRequestApi | ✅ (내장) | ✅ ForumManagementPage 내부 | ❌ |
| 운영자 신청 리뷰 | ✅ forumRequestApi.review | ✅ 분회 API | ✅ ForumManagementPage 내부 | ❌ |

---

## 5. 역할 분리 상태 비교

| 역할 | GlycoPharm | KPA-Society | Neture | K-Cosmetics |
|------|:----------:|:-----------:|:------:|:-----------:|
| **커뮤니티 Forum = 일반 이용** | ✅ 분리됨 (CommunityMainPage) | ✅ 분리됨 (ForumHomePage) | ✅ 분리됨 (ForumHubPage) | ✅ 분리됨 (ForumHubPage) |
| **대시보드 Forum = 내 포럼 관리** | ✅ MyForumDashboardPage | ❌ 미구현 | ❌ 미구현 | ❌ 미구현 |
| **운영자 Forum = 승인/검토** | ✅ ForumRequestsPage + ForumDeleteRequestsPage | ✅ ForumManagementPage | ⚠️ ForumManagementPage (부분) | ❌ 미구현 |

**핵심 발견**:
- 커뮤니티↔대시보드↔운영자 3중 분리가 **완전히 구현된 서비스는 GlycoPharm뿐**
- KPA와 Neture는 커뮤니티↔운영자 2중 분리만 존재
- K-Cosmetics는 커뮤니티만 존재 (운영자 포럼 관리 자체가 없음)

---

## 6. 구현 완료 / 부분 구현 / 미구현 분류

### 기능별 구현 수준

| 기능 | GlycoPharm | KPA-Society | Neture | K-Cosmetics |
|------|:----------:|:-----------:|:------:|:-----------:|
| 커뮤니티 포럼 이용 (조회/글쓰기/댓글) | 🟢 완료 | 🟢 완료 | 🟢 완료 | 🟢 완료 |
| 포럼 개설 신청 | 🟢 완료 | 🟢 완료 (분회 기반) | 🟡 부분 (UI만) | 🔴 미구현 |
| 내 신청 목록 확인 | 🟢 완료 | 🔴 미구현 | 🔴 미구현 | 🔴 미구현 |
| 내 포럼 관리 대시보드 | 🟢 완료 | 🔴 미구현 | 🔴 미구현 | 🔴 미구현 |
| 소유자 기본 정보 수정 | 🟢 완료 | 🔴 미구현 | 🔴 미구현 | 🔴 미구현 |
| 소유자 삭제 요청 | 🟢 완료 | 🔴 미구현 | 🔴 미구현 | 🔴 미구현 |
| 운영자 신청 검토 | 🟢 완료 | 🟢 완료 | 🟡 부분 | 🔴 미구현 |
| 운영자 삭제 요청 검토 | 🟢 완료 | 🔴 미구현 | 🔴 미구현 | 🔴 미구현 |
| 포럼 분석 대시보드 | 🔴 미구현 | 🟢 완료 | 🔴 미구현 | 🔴 미구현 |

---

## 7. 전체 종합 판단

### 아키텍처 현황

```
Forum Core (공통)
├── ForumControllerBase → repositories, context, slug
├── ForumCategoryController → CRUD + 소유자 API + 삭제 요청 (Phase 2/3/4)
├── ForumController → 위임 래퍼
├── forum.routes.ts → 공통 라우트 (/categories/mine, /owner, /delete-request 포함)
└── forum-category-request.routes.ts → 공통 신청 API (serviceCode 격리)

서비스별 적용 현황:
├── GlycoPharm
│   ├── glycopharm.routes.ts → forumRouter (소유자 3개 라우트 포함)
│   ├── operator-forum-request.controller.ts → 신청 검토
│   ├── operator-forum-delete-request.controller.ts → 삭제 검토
│   └── Frontend: MyForumDashboardPage + ForumDeleteRequestsPage (완전)
│
├── KPA-Society
│   ├── kpa.routes.ts → forumRouter (소유자 라우트 미포함)
│   ├── forum-request.controller.ts → 자체 신청 시스템 (분회 기반)
│   └── Frontend: ForumManagementPage + ForumAnalyticsDashboard (신청만)
│
├── Neture
│   ├── (서비스별 forumRouter 없음 — 공통만)
│   └── Frontend: ForumHubPage + ForumManagementPage (부분)
│
└── K-Cosmetics
    ├── (서비스별 forumRouter 없음 — 공통만)
    └── Frontend: ForumHubPage 만 (운영자 미구현)
```

### 핵심 관찰

1. **공통 API는 이미 존재**: `/api/v1/forum/categories/mine`, `/categories/:id/owner`, `/categories/:id/delete-request`는 공통 forum.routes.ts에 이미 등록됨. 그러나 **서비스별 forumRouter에는 GlycoPharm만 적용**.

2. **KPA는 별도 경로**: KPA는 자체 `forum-request.controller.ts`를 갖고 있어 공통 `category-requests` API와 병행. 분회(branch) 기반 조직 구조 때문에 독자 패턴이 필요.

3. **Neture/K-Cosmetics는 공통 API만 사용**: 서비스별 forumRouter가 없어 모든 포럼 기능이 `/api/v1/forum/*`을 직접 호출. 따라서 소유자 API도 공통 라우트에서 접근 가능하나, **프론트엔드가 이를 호출하지 않음**.

4. **ForumController에 delegate는 있으나 라우트에 미등록**: `listMyCategories`, `updateMyCategory`, `requestDeleteCategory` delegate가 ForumController에 존재하나, KPA forumRouter에는 등록되지 않음.

---

## 8. Q1-Q9 답변

### Q1. 각 서비스에서 포럼 사용자 흐름은 어디까지 구현되어 있는가?

| 서비스 | 구현 범위 |
|--------|----------|
| **GlycoPharm** | 완전 — 커뮤니티 이용 + 신청 + 내 신청 확인 + 내 포럼 관리 + 수정 + 삭제 요청 |
| **KPA-Society** | 커뮤니티 이용 + 신청(분회 기반) — 내 포럼 관리 미구현 |
| **Neture** | 커뮤니티 이용만 — 신청 UI 없음, 내 포럼 관리 없음 |
| **K-Cosmetics** | 커뮤니티 이용만 — 신청/관리 전무 |

### Q2. 각 서비스에서 포럼 운영자 흐름은 어디까지 구현되어 있는가?

| 서비스 | 구현 범위 |
|--------|----------|
| **GlycoPharm** | 완전 — 신청 검토(3-action) + 삭제 요청 검토 |
| **KPA-Society** | 신청 검토(3-action, 분회 기반) + 포럼 분석 — 삭제 요청 없음 |
| **Neture** | 신청 검토(2-action) — 삭제 요청 없음 |
| **K-Cosmetics** | 전무 |

### Q3. 사용자 대시보드 Forum이 여전히 공개 허브와 중복되는 서비스가 있는가?

**없음.** GlycoPharm은 대시보드 Forum이 "내 포럼 관리"로 명확히 분리됨. 다른 서비스에는 대시보드 Forum 자체가 없어 중복 문제 없음.

### Q4. "내 포럼 관리" 화면이 실제로 구현된 서비스는 어디인가?

**GlycoPharm만.** `MyForumDashboardPage.tsx` — 내 신청 + 내 포럼 + 수정 모달 + 삭제 요청 모달.

### Q5. 포럼 신청/승인 흐름이 완전한 서비스와 부분 구현 서비스는 어디인가?

| 수준 | 서비스 |
|------|--------|
| **완전** | GlycoPharm (공통 API + 운영자 검토), KPA-Society (자체 API + 분회 검토) |
| **부분** | Neture (운영자 검토 페이지 있으나 사용자 신청 UI 없음) |
| **미구현** | K-Cosmetics |

### Q6. 삭제 요청 흐름이 구현된 서비스는 어디인가?

**GlycoPharm만.** 백엔드(requestDeleteCategory + operator approve/reject) + 프론트엔드(MyForumDashboardPage + ForumDeleteRequestsPage) 모두 완전 구현.

### Q7. 서비스별 차이가 단순 UI 차이인지, API/구조 차이인지 판별하라.

**API/구조 차이가 크다.**

| 차이 유형 | 내용 |
|----------|------|
| **라우트 구조 차이** | GlycoPharm/KPA는 서비스별 forumRouter 보유, Neture/K-Cosmetics는 공통 API만 사용 |
| **신청 시스템 차이** | GlycoPharm은 공통 API, KPA는 자체 분회 기반 API, Neture/K-Cosmetics는 프론트엔드 미연결 |
| **소유자 API 차이** | 공통 forum.routes.ts에 존재하나, 서비스별 forumRouter에는 GlycoPharm만 등록 |
| **운영자 컨트롤러 차이** | 각 서비스별 독립 operator 컨트롤러 (공통화되지 않음) |
| **UI 차이** | 구조 차이의 결과로 발생 (API 없으면 UI도 없음) |

### Q8. 현재 전체 포럼 구조는 A/B/C 중 무엇인가?

**B. 일부 서비스 정리가 더 필요하다**

근거:
- Forum Core(공통)와 공통 API 기반은 충분히 존재
- ForumController의 delegate(listMyCategories, updateMyCategory, requestDeleteCategory)는 이미 준비됨
- 공통 forum.routes.ts에 소유자 라우트 3개가 이미 등록됨
- 그러나 서비스별 forumRouter(KPA, GlycoPharm)에는 GlycoPharm만 적용
- 프론트엔드 API 클라이언트와 페이지가 GlycoPharm 외에는 미구현
- KPA의 분회 기반 신청 시스템은 구조적으로 다른 패턴이어서 단순 복사 불가

### Q9. 다음 단계는 A/B/C 중 무엇이 적절한가?

**A + B 조합이 적절하다.**

| 단계 | 대상 | 설명 |
|------|------|------|
| **1단계: Neture/K-Cosmetics 확산** (A) | 프론트엔드 | 이미 공통 API(`/api/v1/forum/categories/mine` 등)가 존재하므로, 프론트엔드 MyForumDashboardPage + API 클라이언트만 확산하면 됨. 서비스별 forumRouter 추가 불필요 — 공통 API로 충분. |
| **2단계: KPA 소유자 라우트 추가** (B) | 백엔드 + 프론트 | KPA forumRouter에 `/categories/mine`, `/owner`, `/delete-request` 3개 라우트 등록 + MyForumDashboardPage 적용 |
| **3단계: 삭제 요청 공통화** (B) | 백엔드 | operator-forum-delete-request.controller.ts를 서비스 공통으로 분리하거나, 각 서비스에 복제 |

---

## 8. 후속 조치 권고

### 즉시 확산 가능 (Low Effort)

| 항목 | 대상 서비스 | 이유 |
|------|-----------|------|
| MyForumDashboardPage 확산 | Neture, K-Cosmetics | 공통 `/api/v1/forum/categories/mine`, `/owner`, `/delete-request` API가 이미 존재. 프론트엔드만 추가. |
| 포럼 신청 UI 추가 | Neture, K-Cosmetics | 공통 `/api/v1/forum/category-requests` API 존재. RequestCategoryPage + MyRequestsPage 복사/적용. |

### 서비스별 보정 필요 (Medium Effort)

| 항목 | 대상 서비스 | 이유 |
|------|-----------|------|
| KPA forumRouter에 소유자 라우트 등록 | KPA-Society | `forumController.listMyCategories` delegate 존재하나 라우트 미등록 |
| 운영자 삭제 요청 확산 | KPA, Neture, K-Cosmetics | operator-forum-delete-request.controller.ts 패턴 복제 또는 공통화 |
| K-Cosmetics 운영자 포럼 관리 페이지 | K-Cosmetics | 현재 운영자 포럼 관리 자체가 전무 |

### 추가 구조 정리 필요 (Higher Effort)

| 항목 | 이유 |
|------|------|
| KPA 신청 시스템 통일 검토 | KPA는 분회 기반 자체 API 사용 중. 공통 category-requests API와 병행 구조 정리 필요 여부 판단 |
| 운영자 포럼 삭제 요청을 공통 레이어로 | 현재 glycopharm 컨트롤러에만 존재. 서비스별 operator 컨트롤러마다 복제하는 대신, 공통 forum routes에 통합 고려 |
| 포럼 분석 대시보드 공통화 | KPA만 보유. GlycoPharm/Neture에도 필요한지 판단 |

---

## 부록: 백엔드 API 경로 정리

### 공통 Forum API (`/api/v1/forum/*`)

```
GET    /api/v1/forum/posts                         (공개)
GET    /api/v1/forum/posts/:id                      (공개)
POST   /api/v1/forum/posts                          (인증)
PUT    /api/v1/forum/posts/:id                      (인증)
DELETE /api/v1/forum/posts/:id                      (인증)
POST   /api/v1/forum/posts/:id/like                 (인증)
GET    /api/v1/forum/posts/:postId/comments         (공개)
POST   /api/v1/forum/comments                       (인증)
GET    /api/v1/forum/categories                     (공개)
GET    /api/v1/forum/categories/popular             (공개)
GET    /api/v1/forum/categories/mine                (인증) ← 소유자
GET    /api/v1/forum/categories/:id                 (공개)
PATCH  /api/v1/forum/categories/:id/owner           (인증) ← 소유자
POST   /api/v1/forum/categories/:id/delete-request  (인증) ← 소유자
POST   /api/v1/forum/category-requests              (인증) ← 신청
GET    /api/v1/forum/category-requests/my            (인증) ← 내 신청
```

### GlycoPharm Forum API (`/api/v1/glycopharm/forum/*`)

```
(위 공통 API와 동일 구조 + forumContextMiddleware로 glycopharm scope 주입)
GET    /api/v1/glycopharm/forum/categories/mine                (인증)
PATCH  /api/v1/glycopharm/forum/categories/:id/owner           (인증)
POST   /api/v1/glycopharm/forum/categories/:id/delete-request  (인증)
```

### KPA Forum API (`/api/v1/kpa/forum/*`)

```
(공통 CRUD만 — 소유자 API 미등록)
GET    /api/v1/kpa/forum/categories                 (공개)
GET    /api/v1/kpa/forum/categories/:id             (공개)
POST   /api/v1/kpa/forum/categories                 (kpa:admin)
PUT    /api/v1/kpa/forum/categories/:id             (kpa:admin)
DELETE /api/v1/kpa/forum/categories/:id             (kpa:admin)
(mine, owner, delete-request 없음)
```

### Neture / K-Cosmetics Forum API

```
서비스별 forumRouter 없음 → 공통 /api/v1/forum/* 직접 사용
(소유자 API는 공통에 존재하나 프론트엔드 미연결)
```

---

*검증 완료: 2026-03-23*
*검증자: AI (Claude)*
*상태: 완료*
