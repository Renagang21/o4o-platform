# IR-O4O-COMMUNITY-FORUM-CROSSSERVICE-COMMONIZATION-RECHECK-V1

> **작업명:** IR-O4O-COMMUNITY-FORUM-CROSSSERVICE-COMMONIZATION-RECHECK-V1
> **유형:** Read-only 조사 (코드/UI/API/DB/route/menu 수정 없음)
> **목표:** KPA-Society, GlycoPharm, K-Cosmetics, Neture 4개 서비스의 사용자-facing community/forum 공통화가 실제로 완료 상태인지 전체 재점검
> **작성일:** 2026-06-12

---

## 1. 조사 개요

이 공통화 채팅방에서 운영자 공통화 / 운영자 대시보드 부가 섹션 / Bulk Action Flow P1 / Store Hub / My Page 축은 완료 고정되었다. 본 IR은 다음 축인 **사용자-facing community/forum 서비스 전체**를 재점검한다. 운영자 포럼 신청·삭제요청 콘솔은 이미 별도 축에서 공통화 완료되었으므로(분류 J), 본 IR은 operator console이 아니라 사용자-facing 영역과 그 경계를 본다.

**가장 중요한 조사 결과(아키텍처 정정):** 조사 초기에 일부 탐색이 `apps/main-site` / `apps/admin-dashboard` 를 사용자 frontend 로 오인했으나, **현재 실제 사용자-facing 서비스 frontend 는 `services/web-*` 4개**이다. `apps/main-site/src/pages/forum` 은 **DEAD**(어디서도 import/route 안 됨), `apps/admin-dashboard/src/pages/forum` 은 **ORPHANED**(컴포넌트 존재하나 route 미연결), `apps/forum-api` 는 mock/sandbox 다. 본 보고서의 모든 사용자-facing 판정은 `services/web-*` 기준으로 정정된 결과다.

---

## 2. 사전 git 상태

| 항목 | 값 |
|------|------|
| branch | `main` |
| HEAD | `2d2f0996f0d561bed32113760c7ac2d0e7240db0` |
| origin/main ahead/behind | `0 / 0` (동기화됨) |
| 조사 기준 commit | `2d2f0996f0d561bed32113760c7ac2d0e7240db0` |

**git status --short (다른 세션 WIP — 본 IR 미관여):**
```
 M docs/investigations/CHECK-O4O-OPERATOR-ORDER-VIEW-LOOP-COMPLETION-V1.md
?? docs/investigations/IR-O4O-OPERATOR-DASHBOARD-AUX-SECTION-COMMONIZATION-AUDIT-V1.md
?? docs/investigations/IR-O4O-STORE-HUB-CROSSSERVICE-COMMONIZATION-RECHECK-V1.md
?? (스크린샷 png 다수, c:tmp 스크립트)
```
다른 세션 WIP 가 존재하나 본 IR 은 신규 문서 1건만 생성하고 그 외 파일은 건드리지 않았다.

---

## 3. 조사 대상 서비스와 범위

| 서비스 | 사용자 frontend (현행) | community/forum backend |
|--------|------------------------|--------------------------|
| KPA-Society (reference) | `services/web-kpa-society` | `routes/forum/*` + `routes/kpa/controllers/*` |
| GlycoPharm | `services/web-glycopharm` | `routes/forum/*` + `routes/glycopharm/controllers/*` |
| K-Cosmetics | `services/web-k-cosmetics` | `routes/forum/*` + `routes/cosmetics/controllers/*` |
| Neture | `services/web-neture` | `routes/forum/*` + `routes/neture/controllers/*` |

공통 backend 는 `apps/api-server/src/routes/forum/*` (전 서비스 공유) + `packages/forum-core` / `forum-yaksa` / `forum-cosmetics` / `forum-pharmacy`.

---

## 4. route/menu 매트릭스

### 4.1 사용자-facing forum route (services/web-*/src/App.tsx)

| route | KPA | Neture | GlycoPharm | K-Cosmetics |
|-------|-----|--------|-----------|------------|
| `/forum` (hub/home) | ✅ ForumHomePage | ✅ ForumHubPage | ✅ ForumHubPage | ✅ ForumHubPage |
| post list | ✅ `/forum/all` ForumListPage | ✅ `/forum/posts` ForumPage | ✅ `/forum/posts` ForumPage | ✅ `/forum/posts` ForumPage |
| post detail | ✅ `/forum/post/:id` | ✅ `/forum/post/:slug` | ✅ `/forum/posts/:id` | ✅ `/forum/post/:postId` |
| write | ✅ `/forum/write`, `/forum/:slug/write` | ✅ `/forum/write` | ✅ `/forum/write` | ✅ `/forum/write` (protected) |
| edit | ✅ `/forum/edit/:id` | ⚠️ 미라우팅 | ⚠️ 미라우팅 | ⚠️ 미라우팅 |
| 동적 forum feed | ✅ `/forum/:slug` ForumFeedPage | (board props) | — | — |
| 포럼 생성 신청 | ✅ `/forum/request` | ❌ 없음 | ✅ `/forum/request-category` | ✅ `/forum/request-category` |
| 내 신청 현황 | ✅ (mypage) MyRequestsPage | ❌ 없음 | ✅ `/forum/my-requests` | ⚠️ 폼만, 목록 미라우팅 |
| 내 포럼 대시보드 | ✅ (mypage) | ❌ 없음 | ✅ `/forum/my-dashboard` | ✅ `/forum/my-dashboard` |
| 멤버 관리(폐쇄형) | ✅ (mypage) | ❌ 없음 | ✅ `/forum/my-dashboard/:forumId/members` | ✅ 동일 |
| feedback | ❌ | ❌ | ✅ `/forum/feedback` ForumFeedbackPage | ❌ |

**route 파일:** web-kpa-society App.tsx:585–594 · web-neture App.tsx:670–673 · web-glycopharm App.tsx:549–559 · web-k-cosmetics App.tsx:409–445

### 4.2 menu/nav

**4개 서비스 모두 상단 header nav 에 forum/community 직접 항목 없음.** 진입은 community home(`/`) 카드 또는 직접 URL. (navigation.ts: kpa 18–45 / neture 19–39 / glyco 18–36 / kcos 17–33). 이는 의도된 UX 선택으로 판단되며 dead link 는 아니다.

### 4.3 route/menu 불일치 (요약)

- **edit route 비대칭** — KPA 만 `/forum/edit/:id` 라우팅, Neture/GP/KCos 는 미라우팅(편집 진입점 불명확). → 분류 D
- **My Page 위치 불일치** — KPA 는 내 포럼/신청을 mypage 하위에, GP/KCos 는 `/forum/*` 하위에 둠. → 분류 D (§11 참조)
- **K-Cos my-requests 목록 미라우팅** — RequestCategoryPage(폼)만 있고 신청 현황 목록 route 없음. → 분류 D
- **dead link 0** — 위는 "있어야 할 화면이 없음"이지 깨진 링크는 아님.

---

## 5. KPA community/forum 조사 결과 (reference)

KPA 가 forum 기능 최다 보유(편집 route, ForumSearchBar, ClosedForumAccessBlocker, 신청 현황 분리 추적). 사용자-facing 화면은 `services/web-kpa-society/src/pages/forum/` 5종 + `components/forum/` 6종(ClosedForumAccessBlocker, ForumHubSection, ForumActivitySection, ForumSearchBar, ForumSearchResults, ForumWritePrompt).

**KPA 고유(약사·약대생 커뮤니티 성격 — 유지 대상, 분류 H):**
- 분회/지부(organizationId/branchId) 스코프 포럼 신청·승인 (`routes/kpa/controllers/forum-request.controller.ts`)
- 폐쇄형 포럼 멤버십 가입·승인 (`forum-membership.controller.ts`) + ClosedForumAccessBlocker UI
- community hub 의 **quick-links** (KPA 만 보유, GP/KCos/Neture 없음)
- ForumSearchBar / ForumActivitySection 등 커뮤니티 활동 중심 UI

**공통 community 기능(타 서비스 공유 대상):** 포럼 목록/상세/작성, 댓글, 좋아요/AppreciationPanel, 카테고리, pagination, empty/loading/error.

**주의:** KPA 는 신청 API 가 **이중**이다 — 레거시 `/api/v1/kpa/.../forum-requests/*`(kpa.routes.ts:212) + 통합 `/api/v1/forum/category-requests/*`(forum.routes.ts:177). §12 참조.

---

## 6. GlycoPharm community/forum 조사 결과

`services/web-glycopharm/src/pages/forum/` **9종**으로 사용자-facing 화면이 4서비스 중 가장 풍부: ForumHubPage, ForumPage, ForumPostDetailPage, ForumWritePage, **ForumFeedbackPage(GP 고유)**, ForumMemberManagementPage, MyForumDashboardPage, MyRequestsPage, RequestCategoryPage.

- 포럼 신청·내 신청 현황·내 대시보드·멤버 관리까지 KPA 와 거의 동등(분류 B — UI 포크).
- **GP 고유:** ForumFeedbackPage(moderation/피드백 폼) — 타 서비스 없음(분류 D 또는 H 판단 필요).
- backend: `glycopharm-community-hub.controller.ts` (ads/sponsors, 테이블 부재 시 빈 배열 graceful degrade). operator forum/delete-request 콘솔 보유.
- 이전 조사(Agent)가 "GP 사용자 forum 0" 이라 한 것은 **레거시 apps/admin-dashboard 오인** 결과이며, 실제로는 사용자-facing 풍부.

---

## 7. K-Cosmetics community/forum 조사 결과

`services/web-k-cosmetics/src/pages/forum/` **7종**: ForumHubPage, ForumPage, PostDetailPage, ForumWritePage, ForumMemberManagementPage, MyForumDashboardPage, RequestCategoryPage.

- 포럼 hub/목록/상세/작성/내 대시보드/멤버관리/신청 보유 — GP 와 거의 동급.
- **편차:** post detail param 이 `:postId`(타 서비스 `:id`/`:slug`), my-requests 목록 route 부재(폼만).
- `packages/forum-cosmetics` 에 화장품 도메인 메타(skinType/concerns) 백엔드 존재하나, **카테고리/skinType/concerns 가 하드코딩 enum**(CosmeticsForumController.ts:219–302) — 분류 E. 단 이는 도메인 reference 데이터 성격이라 즉시 위험은 아님.
- backend: `cosmetics-community-hub.controller.ts` (ads/sponsors, quick-links 없음).

---

## 8. Neture community/forum 조사 결과

`services/web-neture/src/pages/forum/` **4종**(ForumHubPage, ForumPage, ForumPostPage, ForumWritePage)으로 4서비스 중 **가장 thin**.

- 보유: 포럼 hub/목록/상세/작성, 댓글, 좋아요, pagination, empty/loading/error.
- **미보유(타 서비스 대비):** 포럼 생성 신청 route, 내 신청 현황, 내 포럼 대시보드, 멤버 관리 — 사용자-facing route 없음.
- 단, 공급자 영역(`/supplier/my-forum`, `/supplier/forum/request-category`)에서 supplier-scoped 신청/관리가 별도 존재. 즉 Neture 는 **공급자 정체성에 맞춰 community 진입을 supplier 경로로 재배치**한 형태.
- operator/admin 경계는 깨끗(§10). CHECK-O4O-NETURE-OPERATOR-FORUM-MENU-ROUTE-MISMATCH-V1 이후 operator 콘솔 route 정합.
- blog 는 WO-O4O-NETURE-BLOG-RETIRE-V1 로 의도적 제거(forum+content+AI editor 가 canonical).

**판단:** Neture 의 thin 함 중 상당수는 supplier 중심 정체성에 따른 의도된 축소(분류 H)이나, **일반 사용자(비공급자)의 포럼 신청/내 포럼 경로 부재**는 정책 확인이 필요한 회색지대(분류 C/D 후보).

---

## 9. 사용자-facing forum 기능 parity

| 기능 | KPA | Neture | GP | KCos | 분류 |
|------|----|-------|----|----|------|
| 포럼 hub/home | ✅ | ✅ | ✅ | ✅ | A (ForumHubTemplate 공유) |
| 게시글 목록 | ✅ | ✅ | ✅ | ✅ | A/B |
| 게시글 상세 | ✅ | ✅ | ✅ | ✅ | B (UI 포크) |
| 작성 | ✅ | ✅ | ✅ | ✅ | A/B |
| 수정 | ✅ route | ⚠️ | ⚠️ | ⚠️ | D |
| 댓글 | ✅ | ✅ | ✅ | ✅ | B |
| 좋아요/Appreciation | ✅ | ✅ | ✅ | ✅ | B |
| 북마크 | ❌ | ❌ | ❌ | ❌ | E (전 서비스 미구현) |
| 신고 | ❌ route | ❌ | ❌ | ❌ | E (backend만) |
| 카테고리/필터 | ✅ | ✅ | ✅ | ✅ | A |
| 검색 | ✅ ForumSearchBar | ⚠️ | ⚠️ | ⚠️ | D (KPA만 UI) |
| pagination | ✅ | ✅ | ✅ | ✅ | A |
| 내 포럼/내 글 | ✅(mypage) | ❌ | ✅(forum) | ✅(forum) | D (위치 불일치) |
| 포럼 생성 신청 | ✅ | ❌(supplier 경로) | ✅ | ✅ | C |
| 내 신청 현황 | ✅ | ❌ | ✅ | ⚠️ | D |
| 멤버 관리(폐쇄형) | ✅ | ❌ | ✅ | ✅ | B |
| feedback | ❌ | ❌ | ✅ | ❌ | D (GP 고유) |
| empty/loading/error | ✅ | ✅ | ✅ | ✅ | A |

**공통화 정도:** hub/카테고리/댓글/좋아요/pagination/상태표현은 공통(A/B). 목록·상세·작성 **page JSX 는 서비스별 포크**(inline style vs Tailwind) — 공통 page 라이브러리 부재가 가장 큰 잔여 편차.

---

## 10. operator/admin forum 경계 확인

- 사용자-facing(`/forum/*`, supplier 경로)와 operator 콘솔(`/operator/*`, `/admin/*`)이 route prefix 로 명확히 분리됨. 사용자 화면에 operator action 혼입 없음, operator 콘솔에 사용자 UI 혼입 없음 → **분류 J(이미 operator 축에서 완료) 영역과 충돌 없음**.
- backend: 통합 operator API `/api/v1/forum/operator/*`(operator-forum.routes.ts), `requireServiceOperator` 게이트.
- 신청/승인/삭제요청 책임 경계: 사용자=신청·삭제요청 제출 / operator=검토·승인·반려·생성. Neture 기준 깨끗하게 분리됨(데이터 모델 `forum_category_requests` 공유로 상태 전이).

---

## 11. My Page와 forum 경계 확인

- KPA 는 "내 포럼 대시보드 / 내 신청 현황 / 멤버 관리"를 **mypage 하위**에 둔다. GP/KCos 는 동일 기능을 **`/forum/my-*` 하위**에 둔다.
- 두 위치가 공존하나 충돌(중복 라우트)은 아님 — 같은 기능의 IA 배치 차이.
- My Page 공통화 축(완료 고정)과의 정합 관점에서, forum 내 활동(내 글/내 포럼)의 canonical 위치를 mypage 로 통일할지 여부는 후속 판단 대상. KPA `/mypage/my-forums` 가 My Page 영역과 구조적으로 충돌하지는 않음.

---

## 12. API/backend contract 확인

**공통(전 서비스 공유) — 양호:**
- `/api/v1/forum/*` : posts/comments/categories/like/pin/membership/moderation/stats (forum.routes.ts)
- `/api/v1/forum/category-requests/*` (통합 신청), `/api/v1/forum/operator/*` (통합 operator), `/forum/notifications`, `/forum/ai`, `/forum/recommendations`, `/forum/search`
- 서비스별 community-hub(ads/sponsors; KPA만 quick-links) 는 공유 `CommunityHubService` 재사용.

**확인된 contract 편차/이슈:**
1. **KPA 신청 API 이중화** — 레거시 `/api/v1/kpa/.../forum-requests/*`(kpa.routes.ts:212) 와 통합 `/api/v1/forum/category-requests/*`(forum.routes.ts:177) 공존. 혼선/중복 정리 후보. (분류 F/정리)
2. **GP delete-request 스코프 비표준** — operator-forum-delete-request.controller.ts:36,69 가 통합 콘솔의 `serviceCode` 가 아닌 하드코딩 `organizationId = FORUM_ORGS.GLYCOPHARM` 로 필터. boundary 모델 불일치(Boundary Policy 상 Broadcast=serviceKey vs Store Ops=organizationId 혼재).
3. **serviceCode 추출 위치** — `/forum/category-requests/*` 및 operator 라우트가 serviceCode 를 **body/query** 에서 추출(forum-category-request.routes.ts:33,60,85,117; operator-forum.routes.ts:65). operator 라우트는 `requireServiceOperator` 화이트리스트 검증이 있어 완화되나, 플랫폼 원칙(URL path 추출)과는 거리가 있음. read-only 단계 플래그.
4. **search organizationId 파라미터** — search.controller.ts 가 organizationId 를 query 로 수용. cross-org 검색 가능성 — 후속 검증 필요.
5. **apps/forum-api = mock/sandbox** (mockThreads/mockReplies 하드코딩) — production 미사용. **apps/forum-web** 별도 SPA, 현 서비스 frontend 아님.

---

## 13. UI-UX 공통성 확인

**공유 자산(실제 import 확인):**
- `@o4o/shared-space-ui` → **ForumHubTemplate**(hub 페이지 공통, 전 서비스), **AppreciationPanel**
- `@o4o/forum-core/utils` → blocksToHtml/htmlToBlocks
- `@o4o/content-editor` → ContentRenderer
- `@o4o/forum-core/public-ui` → CommentSection, ForumBlockRenderer (단 public-ui 실 컴포넌트는 2종뿐)

**포크(공통화 미완):**
- 목록/상세/작성 page 가 서비스별 자체 JSX. 스타일 체계 불일치 — Neture/GP inline style, KCos Tailwind, KPA BaseTable+inline. status/category badge 도 서비스별 하드코딩.
- mobile 반응형 편차(KCos Tailwind 반응형 / Neture·GP 비반응형).

→ **page-level 공통 라이브러리 부재** 가 forum 공통화의 핵심 잔여 과제.

---

## 14. mock/TODO/no-op/dead surface 목록

| 항목 | 위치 | 성격 |
|------|------|------|
| apps/forum-api 전체 | `apps/forum-api/src/routes/forum.routes.ts:64–111,340,389` | mock 데이터 sandbox, production 미사용 (DEAD) |
| apps/main-site forum | `apps/main-site/src/pages/forum/*` | import/route 0 (DEAD, 레거시) |
| apps/admin-dashboard forum | `apps/admin-dashboard/src/pages/forum/index.tsx` | 컴포넌트 존재, route 미연결 (ORPHANED) |
| KCos forum 카테고리/skinType/concerns | `packages/forum-cosmetics/.../CosmeticsForumController.ts:219–302` | 하드코딩 enum (도메인 reference) |
| 북마크 | 전 서비스 | UI 전무 (미구현) |
| 신고 | 전 서비스 사용자 화면 | backend 존재, 사용자 route/UI 없음 |
| forum-cosmetics lifecycle | `packages/forum-cosmetics/src/lifecycle/{activate,deactivate}.ts` | TODO 이벤트 핸들러 등록 미완 |

**live mock surface 잔존 여부:** 사용자-facing `services/web-*` 에는 가짜 데이터로 정상 기능처럼 보이는 화면 없음(정직한 empty/loading/error 사용). mock 은 모두 DEAD/레거시(apps/forum-api, apps/main-site) 또는 도메인 reference enum 에 국한.

---

## 15. route/menu/dead link 목록

- **dead link: 0** (사용자-facing). 4.3 의 불일치는 "있어야 할 화면 미라우팅"이지 깨진 링크 아님.
- **dead route 디렉터리:** apps/main-site/src/pages/forum, apps/admin-dashboard/src/pages/forum (둘 다 사용자 앱에서 미참조).
- **route-without-menu:** 전 서비스 forum 이 header nav 미노출(의도된 community-home 진입).
- **menu-without-route:** 발견 없음.

---

## 16. 개인정보/보안 위험 목록

| # | 위험 | 위치 | 평가 |
|---|------|------|------|
| S1 | `sanitizeUser` 가 **email/phone 미제거** (password 등 12개 필드만 제거) | ForumControllerBase.ts:154–168 | author join 이 email/phone 컬럼을 select 하면 노출. 컬럼 select 여부 후속 검증 필요 (중) |
| S2 | author-only edit/delete 가 **하드코딩 role `['admin','manager']`** 체크, RBAC `forumPermissions` util 미사용 | ForumPostController.ts:346,442 | 서비스별 role(kpa:admin 등) 미반영. RBAC SSOT 와 정합성 점검 필요 (중) |
| S3 | 폐쇄형 포럼 BYPASS_ROLES 에 `kpa:admin` 등 포함 — 멤버십 테이블이 service-scoped 가 아니면 **cross-service bypass** 가능 | ForumControllerBase.ts:128 | forum_category_members 스코프 스키마 확인 필요 (중) |
| S4 | search organizationId query 파라미터 수용 | search.controller.ts | cross-org 검색 가능성 (중) |
| S5 | serviceCode body/query 추출 | forum-category-request.routes.ts / operator-forum.routes.ts:65 | operator 는 화이트리스트 검증으로 완화, 사용자 신청 경로는 점검 필요 (중) |
| — | 실명 노출(`nickname ?? name`) | flatten 로직 | 책임성 위한 의도된 노출. 익명 옵션 부재(정책) (저) |
| — | showContactOnPost 연락처(Kakao) 노출 | 사용자 opt-in | 의도된 동작, opt-in 이라 양호 |

> read-only 단계 플래그이며, 각 항목은 별도 보안 WO 에서 실제 select 컬럼/스키마/런타임으로 확정해야 한다.

---

## 17. 분류표

| 분류 | 의미 | 대표 항목 |
|------|------|----------|
| A | 공통화 완료 | hub(ForumHubTemplate), 카테고리, 댓글, Appreciation, pagination, empty/loading/error |
| B | 기능 동등·UI 편차 | 목록/상세/작성 page, 멤버 관리, 좋아요 |
| C | KPA 보유·타 서비스 thin | Neture 포럼 신청(일반 사용자 경로), quick-links |
| D | route/menu 불일치 | edit route(KPA만), 검색 UI(KPA만), my-* 위치 차, KCos my-requests 목록, GP feedback |
| E | mock/dead | apps/forum-api, apps/main-site forum, 북마크, 신고 UI, KCos 하드코딩 enum |
| F | backend/API 정리 필요 | KPA 신청 이중 API, GP delete-request org 스코프, serviceCode 추출 위치 |
| G | operator/사용자 혼합 | 발견 없음(경계 양호) |
| H | 도메인 차이로 유지 | KPA 분회/약사 멤버십, Neture supplier-scoped community 축소 |
| I | 개인정보/보안 | §16 S1–S5 |
| J | operator 콘솔 축 완료 | 통합 operator/delete-request 콘솔 |

---

## 18. 즉시 WO 가능한 후보

1. **WO-O4O-FORUM-USER-PAGE-COMMONIZATION-V1** — 목록/상세/작성 page 를 공통 page 컴포넌트(@o4o/shared-space-ui 또는 forum-core public-ui)로 추출, 서비스는 config/adapter 만. (분류 B 해소, 1인 유지보수성 ↑)
2. **WO-O4O-FORUM-EDIT-ROUTE-PARITY-V1** — Neture/GP/KCos 에 게시글 수정 route/진입점 정합(작성자 본인). (분류 D)
3. **WO-O4O-FORUM-SEARCH-UI-PARITY-V1** — KPA ForumSearchBar 패턴을 공통화하여 타 서비스 검색 UI 제공(backend search API 이미 공통). (분류 D)
4. **레거시 dead surface 제거 WO** — apps/main-site/src/pages/forum, apps/admin-dashboard/src/pages/forum, apps/forum-api 정리(별도 dead-code 축과 조율). (분류 E)

## 19. backend/API 선행 후보

1. **WO-O4O-FORUM-REQUEST-API-DEDUP-V1** — KPA 레거시 `/kpa/.../forum-requests/*` 를 통합 `/forum/category-requests/*` 로 일원화. (분류 F)
2. **WO-O4O-FORUM-GP-DELETE-REQUEST-BOUNDARY-V1** — GP delete-request 의 하드코딩 organizationId 스코프를 통합 serviceCode 모델로 정렬. (분류 F)
3. **WO-O4O-FORUM-SERVICEKEY-EXTRACTION-AUDIT-V1** — serviceCode body/query 추출을 plathform 원칙(경로/검증)으로 정렬 + search organizationId 가드. (분류 F/I)
4. **WO-O4O-FORUM-AUTHOR-PII-GUARD-V1** — sanitizeUser email/phone 포함, author select 컬럼 점검, edit/delete RBAC util 전환, 폐쇄형 cross-service bypass 검증. (분류 I, S1–S3,S5)

## 20. 다른 축으로 이관할 후보

- **북마크/신고 사용자 UI** — community 기능 신규 개발 성격. 공통화 축이 아닌 forum feature 확장 축으로 이관.
- **KCos forum 도메인 메타(skinType/concerns) 실데이터화** — Cosmetics 도메인 축으로 이관.
- **dead surface 제거** — 별도 dead-code cleanup 축과 합동.
- **Neture 일반 사용자 포럼 신청 경로 여부** — Neture 도메인/정체성 정책 결정 후 처리(IR 단계 결론 보류).

## 21. 우선순위 제안

| 순위 | 항목 | 근거 |
|:---:|------|------|
| 1 | WO-O4O-FORUM-AUTHOR-PII-GUARD-V1 (§19-4) | 개인정보/보안 — 위험 최우선 |
| 2 | WO-O4O-FORUM-REQUEST-API-DEDUP-V1 (§19-1) | 이중 API 혼선 제거, 후속 공통화 선행 |
| 3 | WO-O4O-FORUM-USER-PAGE-COMMONIZATION-V1 (§18-1) | 잔여 편차 최대(page 포크) 해소, 유지보수성 |
| 4 | WO-O4O-FORUM-EDIT-ROUTE-PARITY-V1 / SEARCH-UI-PARITY-V1 (§18-2,3) | 사용자 기능 parity |
| 5 | GP delete-request boundary / serviceKey audit (§19-2,3) | contract 정합 |
| 6 | 레거시 dead surface 제거 (§18-4) | 위험 낮음, cleanup 축 합동 |

---

## 22. Current Structure vs O4O Philosophy Conflict Check

| 점검 | 결과 |
|------|------|
| community/forum 이 사용자 참여 공간으로 작동하는가 | ✅ 4서비스 모두 사용자-facing 포럼 hub/목록/상세/작성/댓글 작동 |
| KPA 약사·약대생 커뮤니티 성격 유지 | ✅ 분회/멤버십/활동 UI 유지(분류 H) |
| GP/KCos/Neture 에 KPA 고유 기능 강제하지 않았는가 | ✅ quick-links/분회 등 미강제, 공통 기능만 공유 |
| 사용자 forum 과 operator/admin 관리 혼합 | ✅ route prefix 분리, 혼합 없음(분류 G 없음) |
| 신청/승인/삭제요청 책임 경계 | ✅ 사용자=제출 / operator=검토·승인 명확. 단 KPA 신청 API 이중화 정리 필요 |
| My Page 와 forum 활동 경계 | ⚠️ KPA(mypage) vs GP/KCos(/forum) 위치 차 — canonical 위치 통일 후보 |
| mock 없이 정직한 기능/empty state | ✅ 사용자 화면 mock 없음. mock 은 DEAD 레거시에 국한 |
| 공통화가 1인 유지보수성 향상 방향인가 | ⚠️ hub/유틸은 공유되나 page JSX 포크로 4중 유지보수 부담 → §18-1 권장 |
| 개인정보/권한 경계 안전한가 | ⚠️ §16 S1–S5 플래그 — 보안 WO 선행 권장 |

**종합 판단:** forum/커뮤니티 축은 **"사용자-facing 기능은 4서비스 모두 작동(공통화 골격 존재)하나, ① page-level UI 공통화 미완(포크), ② route parity 편차(edit/검색/my-*), ③ backend contract 이중화·경계 비표준, ④ 개인정보/권한 플래그 5건"이 남은 미완료 상태**다. "완료 고정"으로 보기 어렵고, 보안(§19-4)·API 이중화(§19-1)·page 공통화(§18-1) 순으로 후속 WO 가 필요하다.

---

## 최종 보고 요약

- **수정 파일 없음** (신규 IR 문서 1건만 생성)
- **생성 IR 문서:** `docs/investigations/IR-O4O-COMMUNITY-FORUM-CROSSSERVICE-COMMONIZATION-RECHECK-V1.md`
- **조사 기준 commit:** `2d2f0996f0d561bed32113760c7ac2d0e7240db0` (main, origin 동기화)
- **4서비스 route/menu:** 4개 모두 `/forum` hub+목록+상세+작성 보유, header nav 미노출(community-home 진입), edit/검색/my-* 에 편차
- **KPA reference 적합성:** ✅ 적합 — 기능 최다·구조 기준선. 단 KPA 고유(분회/멤버십/quick-links)는 무이식.
- **사용자 forum parity:** 핵심 기능 공통(A/B), page JSX 포크가 최대 편차
- **operator/admin 경계:** ✅ 양호(혼합 없음, 분류 J 충돌 없음)
- **API/backend contract:** 공통 골격 양호, KPA 신청 이중 API·GP delete-request org 스코프·serviceCode 추출 위치 정리 필요
- **mock/dead surface:** apps/forum-api(mock), apps/main-site forum(dead), apps/admin-dashboard forum(orphaned), 북마크/신고 UI 부재, KCos 하드코딩 enum
- **개인정보/보안:** S1(email/phone sanitize 누락) · S2(하드코딩 role) · S3(폐쇄형 cross-service bypass) · S4(search org) · S5(serviceCode 추출) — 보안 WO 선행 권장
- **우선순위:** 보안 PII 가드 → 신청 API 일원화 → page 공통화 → route parity → contract 정렬 → dead 제거
- **git status:** 사전 상태와 동일, 다른 세션 WIP 미관여
