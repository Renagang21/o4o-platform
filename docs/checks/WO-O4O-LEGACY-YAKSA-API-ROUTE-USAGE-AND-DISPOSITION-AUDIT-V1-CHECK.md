# WO-O4O-LEGACY-YAKSA-API-ROUTE-USAGE-AND-DISPOSITION-AUDIT-V1 — CHECK

**작업 성격:** READ-ONLY 감사 · 처분 결정
**판정:** **PASS**
**작성일:** 2026-08-05

---

## 1. 기준 commit · origin/main · 작업 트리

| 항목 | 값 |
|------|-----|
| branch | `main` |
| 감사 기준 HEAD | `5704631b83ba42fecba5a06352aee6eb6e2d2ea1` |
| CHECK 작성 시 HEAD = origin/main | `7485581333afada02b109e2b0978147dcdcbfde3` (기준 commit 을 ancestor 로 포함) |
| 그 사이 유입된 타 세션 commit | `cd4451920` (easy-drug 파생 EN·ZH 노출 중단), `748558133` (pharmacy-hub CHECK 문서) — **둘 다 yaksa route·entity·admin 화면 무관**, 감사 결론에 영향 없음 |
| 작업 트리 | **not clean** — 타 세션 WIP 60건 (전부 `apps/api-server/src/scripts/**` HFF-ZH 번역 산출물) |
| CHECK 경로 충돌 | **없음** (`git status --short -- docs/checks` → 0건) |

작업 트리가 clean 이 아니므로 본 WO 사전점검 4항에 따라 **read-only 감사만** 수행했다. 타 세션 WIP 는 수정·삭제·stash·stage 하지 않았다.

## 2. 선행 커밋 포함 여부

| Commit | 내용 | `merge-base --is-ancestor` |
|--------|------|:---:|
| `4f63b2844` | Legacy 역할·scope 사용 감사 CHECK | YES |
| `5a9826925` | `platform:admin`·`platform:operator` 제거 | YES |
| `b442bbb9c` | 역할 제거 CHECK | YES |
| `2e06c94f1` | 백엔드 JWT scope 축 제거 | YES |
| `47e7db8d1` | JWT scope 제거 CHECK | YES |

5건 모두 포함 확인.

---

## 3. 모집단 — `/api/v1/yaksa/*` endpoint 전수

### 3-1. 모집단 확정 방법

- `app.use('/api/v1/yaksa', ...)` 전수 검색 결과 **api-server 내 mount 는 1곳뿐**: `apps/api-server/src/bootstrap/register-routes.ts:645` → `createYaksaRoutes(dataSource)`.
- `createYaksaRoutes` (`apps/api-server/src/routes/yaksa/yaksa.routes.ts:45`) 는 `createYaksaController(...)` 를 `router.use('/', ...)` 로 단일 mount 한다.
- 따라서 `/api/v1/yaksa` prefix 에서 **실제로 응답하는 endpoint = 이 controller 가 선언한 12개가 전부**다.
- 코드에 존재하나 mount 되지 않은 동명 라우터(§7-2)는 이 prefix 에서 404 로 확인했다.

### 3-2. Endpoint inventory (필수 산출물 ①)

| # | Method | Route | Controller (line) | 기능 | Read/Write | Guard |
|---|--------|-------|-------------------|------|:---:|-------|
| 1 | GET | `/api/v1/yaksa/posts` | yaksa.controller.ts:77 | 게시글 목록 (페이지네이션·필터) | Read | **없음 (public)** |
| 2 | GET | `/api/v1/yaksa/posts/:id` | :126 | 게시글 상세 | Read **+ Write** (`view_count` 증가) | **없음 (public)** |
| 3 | GET | `/api/v1/yaksa/categories` | :150 | 카테고리 목록 | Read | **없음 (public)** |
| 4 | GET | `/api/v1/yaksa/admin/posts` | :183 | 전체 상태 게시글 목록 | Read | requireAuth + requireYaksaScope |
| 5 | POST | `/api/v1/yaksa/admin/posts` | :221 | 게시글 생성 | Write (post + log) | requireAuth + requireYaksaScope |
| 6 | PUT | `/api/v1/yaksa/admin/posts/:id` | :260 | 게시글 수정 | Write (post + log) | requireAuth + requireYaksaScope |
| 7 | PATCH | `/api/v1/yaksa/admin/posts/:id/status` | :303 | 게시글 상태 전이 | Write (post + log) | requireAuth + requireYaksaScope |
| 8 | GET | `/api/v1/yaksa/admin/categories` | :340 | 카테고리 목록 (관리자) | Read | requireAuth + requireYaksaScope |
| 9 | POST | `/api/v1/yaksa/admin/categories` | :366 | 카테고리 생성 | Write | requireAuth + requireYaksaScope |
| 10 | PUT | `/api/v1/yaksa/admin/categories/:id` | :402 | 카테고리 수정 | Write | requireAuth + requireYaksaScope |
| 11 | PATCH | `/api/v1/yaksa/admin/categories/:id/status` | :440 | 카테고리 활성/비활성 | Write | requireAuth + requireYaksaScope |
| 12 | GET | `/api/v1/yaksa/admin/logs/posts` | :471 | 게시글 변경 로그 조회 | Read | requireAuth + requireYaksaScope |

**총 12 endpoint** (public 3 / admin 9).

---

## 4. route → controller → service → data 실행 경로

```
register-routes.ts:644-646
  → createYaksaRoutes(dataSource)                      routes/yaksa/yaksa.routes.ts:45
    → coreRequireAuth                                  middleware/auth.middleware.ts (re-export shim)
                                                        → common/middleware/auth.middleware.js
    → requireYaksaScope(scope)                         yaksa.routes.ts:24  (role 판정만)
    → createYaksaController(...)                       routes/yaksa/controllers/yaksa.controller.ts:61
      → express-validator (query/body/param)
      → new YaksaService(dataSource)                   routes/yaksa/services/yaksa.service.ts:30
        → new YaksaRepository(dataSource)              routes/yaksa/repositories/yaksa.repository.ts
          → YaksaCategory   → public.yaksa_categories
          → YaksaPost       → public.yaksa_posts
          → YaksaPostLog    → public.yaksa_post_logs
```

- Entity 3종은 `apps/api-server/src/database/entities.ts:140-143, 665-667` 에 등록되어 있다.
- `apps/api-server/src/middleware/auth.middleware.ts` 는 로직 없는 재export shim (`export * from '../common/middleware/auth.middleware.js'`) 이므로 canonical `requireAuth` 와 동일하다.
- Service 계층 외부(다른 모듈)에서 `YaksaService` · `YaksaRepository` · Yaksa entity 3종을 import 하는 코드는 **entities.ts 등록 외 0건**.

---

## 5. 소비처 분류 (필수 산출물 ②)

| Endpoint | Production | Internal 호출 | Test | Docs | History | External 가능성 |
|----------|:---:|:---:|:---:|:---:|:---:|---|
| 1 GET /posts | **0** | 0 | 0 | 0 | 0 | 미인증 공개 — 30일 로그상 실사용 0 |
| 2 GET /posts/:id | **0** | 0 | 0 | 0 | 0 | 동일 |
| 3 GET /categories | **0** | 0 | 0 | 0 | 0 | 동일 |
| 4 GET /admin/posts | **0** (unrouted 화면 2건) | 0 | 0 | 주석 1 | 0 | 로그상 0 |
| 5 POST /admin/posts | **0** | 0 | 0 | 0 | 0 | 로그상 0 |
| 6 PUT /admin/posts/:id | **0** | 0 | 0 | 0 | 0 | 로그상 0 |
| 7 PATCH /admin/posts/:id/status | **0** | 0 | 0 | 0 | 0 | 로그상 0 |
| 8 GET /admin/categories | **0** (unrouted 화면 2건) | 0 | 0 | 주석 1 | 0 | 로그상 0 |
| 9 POST /admin/categories | **0** | 0 | 0 | 0 | 0 | 로그상 0 |
| 10 PUT /admin/categories/:id | **0** | 0 | 0 | 0 | 0 | 로그상 0 |
| 11 PATCH /admin/categories/:id/status | **0** | 0 | 0 | 0 | 0 | 로그상 0 |
| 12 GET /admin/logs/posts | **0** | 0 | 0 | 0 | 0 | 로그상 0 |

### 5-1. 코드상 유일한 호출 지점 — 모두 **라우팅되지 않은 화면**

| 파일 | 호출 |
|------|------|
| `apps/admin-dashboard/src/pages/yaksa-forum/PostListPage.tsx:123,154` | `/yaksa/admin/categories`, `/yaksa/admin/posts` |
| `apps/admin-dashboard/src/pages/yaksa-forum/PostDetailPage.tsx:104` | `/yaksa/admin/posts/:id` |
| `apps/admin-dashboard/src/pages/yaksa-forum/CategoryListPage.tsx:60` | `/yaksa/admin/categories` |

이 3화면은 `YaksaForumRouter.tsx` 만이 lazy import 하고, `YaksaForumRouter` 는 **자기 디렉터리의 `index.ts` 에서 export 될 뿐 App.tsx·라우트 파일·메뉴 어디에서도 import 되지 않는다** (전 저장소 검색 결과 자기 참조 3건이 전부). 즉 `/admin/yaksa-forum` 화면은 존재하지 않으며, 이 API 호출은 **실행되지 않는다.**

- `apps/admin-dashboard/src/config/service-entry.ts:84` 의 `routePatterns: ['/admin/forum','/admin/yaksa-forum']` 은 라우트 선언이 아니라 서비스 엔트리 **패턴 문자열**이다. 실제 라우트를 만들지 않는다.
- `apps/admin-dashboard/src/routes/yaksa.routes.tsx` 는 이름과 달리 `/admin/membership/*` · `/admin/reporting/*` · `/admin/yaksa/*` (yaksa-admin · accounting) 만 선언한다. 본 감사 대상 endpoint 를 소비하는 라우트는 **0건**이며, `/admin/yaksa/forum` 은 canonical `/forum/boards` 로 `Navigate` redirect 한다.

### 5-2. 서버 내부 호출 · 배치 · 스크립트

- 내부 호출 0건. 배치·cron·스크립트 0건.
- `apps/api-server/scripts/delete-seed-data.sql` 만이 `yaksa_posts`·`yaksa_categories` 의 **seed 행 삭제 유틸**로 테이블명을 언급한다 (endpoint 소비 아님).

### 5-3. 테스트 · 문서 · 역사 참조 (production 소비로 계산하지 않음)

- 테스트: `routes/yaksa` · `YaksaService` · `YaksaPost` 를 참조하는 테스트 **0건**.
- 문서: `docs/` 내 `api/v1/yaksa` 언급은 본 트랙 CHECK 3건(`4f63b2844`, `b442bbb9c` 계열, JWT scope CHECK)뿐 — 계약 문서가 아니다.
- Migration: `yaksa_posts`·`yaksa_categories`·`yaksa_post_logs` 를 생성/변경하는 migration **0건** (테이블은 synchronize 또는 수동 seed 로 생성된 것으로 보인다).
- `bundles/yaksa.bundle.json` 은 `appId` 조합 정의(`forum-yaksa`, `b2b-yaksa` 등)이며 본 route 를 참조하지 않는다.

### 5-4. 이름이 비슷하나 **다른 축** (혼동 금지 — 감사 대상 아님)

| 대상 | 실제 위치 | 관계 |
|------|-----------|------|
| `/api/v1/membership/*` | membership-yaksa | 현행 실서비스 |
| `/api/v1/lms-yaksa/*` | lms-yaksa | 현행 실서비스 |
| `/admin/yaksa/*`, `/admin/yaksa-hub`, `/admin/yaksa/accounting/*` | admin-dashboard 라우트 | 현행 화면 (yaksa-admin·accounting·scheduler 소비) |
| `/api/v1/forum/recommendations/yaksa` | `routes/forum/forum.recommendation.routes.ts:29` | forum prefix. 컨트롤러 JSDoc 의 `/api/v1/yaksa/forum/recommendations` 는 **stale 주석** |
| `packages/forum-yaksa` `YaksaCommunity*` | 별도 도메인(커뮤니티) | 본 route 와 무관 |

---

## 6. 데이터 read/write 와 side effect

| 테이블 | 쓰는 endpoint | 프로덕션 현재 상태 (2026-08-05 실측) |
|--------|---------------|--------------------------------------|
| `public.yaksa_posts` | 2(view_count), 5, 6, 7 | **0행** — status `draft`/`hidden`/`deleted`/`published` 전 구간 total 0 |
| `public.yaksa_categories` | 9, 10, 11 | **5행, 전부 seed** — `created_at` 이 `2026-01-08T06:16:05.670Z` 단일값, id 가 `a1b2c3d4-…` 패턴, 각 `post_count` 0 (slug: notices/general/academic/jobs/regulations). `status=inactive` 0행 |
| `public.yaksa_post_logs` | 5, 6, 7 (create/update/status_change 기록) | 게시글이 0행이므로 로그 생성 경로가 성립한 적 없음 |

실측 방법: **미인증 공개 endpoint 를 통한 read-only 조회**(`GET /api/v1/yaksa/posts?status=…`, `GET /api/v1/yaksa/categories?status=…`). 운영 DB 에 대한 write 는 물론 SQL 직접 실행도 하지 않았다.

**Side effect:** 트랜잭션·알림·감사 로그(플랫폼 audit)·파일·외부 호출 **없음**. 승인 상태·업무 상태 전이 **없음**. `organizationId`·`serviceKey`·`storeId` 등 경계 컬럼이 엔티티에 **아예 없다** — 어떤 조직·서비스에도 귀속되지 않는 전역 게시판이다. 다른 기능이 이 3테이블을 읽는 코드는 0건.

---

## 7. 현재 인증·권한·membership·소유권 경계

### 7-1. 적용 경계

- **admin 9개**: `requireAuth` → `requireYaksaScope('yaksa:admin')`. `requireYaksaScope` 는 `2e06c94f1` 이후 **`platform:super_admin` role 단일 조건**이며, 그 외 전부 403 (`YAKSA_403`). membership·organization·resource ownership guard **없음** (필요도 없다 — 소유 축이 존재하지 않는다).
- **public 3개**: 인증 없음.

실 프로덕션 확인: `GET /api/v1/yaksa/admin/posts` (무인증) → **401 `AUTH_REQUIRED`**. 공개 3종 → 200.

### 7-2. 같은 prefix 의 미mount 경로 (404 실측)

| 경로 | 코드상 참조처 | 프로덕션 |
|------|----------------|:---:|
| `/api/v1/yaksa/forum/*` | `apps/main-site/src/lib/yaksa/forum-data.ts`, `packages/forum-yaksa/src/backend/routes/yaksa.search.routes.ts` (mount 0건) | **404** |
| `/api/v1/yaksa/organizations`, `/api/v1/yaksa/user/profile` | 동 forum-data.ts | **404** |
| `/api/v1/yaksa/reports*` | `apps/admin-dashboard/src/lib/api/yaksaAdmin.ts:217-241` | **404** |

즉 `/api/v1/yaksa` prefix 를 향한 **코드상 호출 중 상당수가 이미 404** 이며, 본 12 endpoint 와는 별개 문제다 (§12 후속 참조).

### 7-3. 발견된 경계 결함 (현재 무해)

`GET /api/v1/yaksa/posts` 는 **미인증**임에도 `status` 쿼리로 `draft`·`hidden`·`deleted` 게시글을 조회할 수 있다 (controller:83, 109-111 — 기본값만 `published` 로 채운다). 현재 데이터가 0행이라 노출 실피해는 없으나, 이 route 를 살릴 경우 반드시 선행 수정이 필요한 결함이다. REMOVE 판정을 강화하는 근거로 기록한다.

### 7-4. 제거 시 권한 우회·기능 손실 여부

제거해도 우회 경로가 생기지 않는다 (route 자체가 사라지므로 404). 손실되는 현행 업무 기능도 없다 — 소비 화면 0, 데이터 0, 내부 호출 0.

---

## 8. 대체 경로 비교 (필수 산출물 ③)

canonical 후보 = `/api/v1/forum/*` (`apps/api-server/src/routes/forum/forum.routes.ts`, `register-routes.ts:159` mount, KPA reference implementation, F6 Boundary Policy 상 Community = `organizationId` 경계).

| Legacy endpoint | 현행 후보 | 계약 일치 | 권한 일치 | Side effect 일치 | 판단 |
|---|---|:---:|:---:|:---:|---|
| GET /yaksa/posts | GET /forum/posts | 부분 (필드·페이지네이션 상이) | 불일치 (`optionalAuth` + 조직 경계) | 불일치 | 기능 목적은 동일. 이전할 소비처가 0이므로 **REPLACE 불필요** |
| GET /yaksa/posts/:id | GET /forum/posts/:id | 부분 | 불일치 | 불일치 (조회수 처리 상이) | 동상 |
| GET /yaksa/categories | GET /forum/categories | 부분 | 불일치 | 불일치 | 동상 |
| /yaksa/admin/posts (GET·POST·PUT·PATCH) | /forum/posts + /forum/admin/* | 부분 | 불일치 (`authenticate` + 조직·역할) | 불일치 | 동상 |
| /yaksa/admin/categories (GET·POST·PUT·PATCH) | /forum/categories (CRUD) + /forum/admin/* | 부분 | 불일치 | 불일치 | 동상 |
| GET /yaksa/admin/logs/posts | /forum/moderation (성격 상이) | **불일치** | 불일치 | 불일치 | 전용 로그 모델. 대체 API로 확정하지 않음 |

**결론:** 명칭·목적이 겹치더라도 요청·응답·권한·경계·side effect 가 모두 다르므로 이들을 "대체 API" 로 확정하지 않는다. 다만 **이전해야 할 production 소비처가 0건**이므로 REPLACE 판정 자체가 성립하지 않는다. 게시판 업무가 필요해지면 canonical forum 이 이미 그 역할을 수행하고 있다는 사실만 기록한다 (`/admin/yaksa/forum` 라우트가 이미 `/forum/boards` 로 redirect 하고 있는 것이 그 근거다).

---

## 9. 외부 소비 가능성 — 실호출 로그 확인

`gcloud logging read` (Cloud Run `o4o-core-api`, `httpRequest.requestUrl:"/api/v1/yaksa"`, `--freshness=30d`, limit 50):

- 반환된 27건 중 **26건이 `curl/8.12.1`** — 본 감사 및 직전 트랙 감사의 확인 요청이다 (2026-08-04 ~ 08-05).
- 브라우저 UA 1건: `2026-07-30 GET /api/v1/yaksa/accounting/summary` → **404** (yaksa-accounting 화면의 오호출이며 본 12 endpoint 가 아니다).
- **본 12 endpoint 에 대한 실제 클라이언트 호출 0건.**

한계: Cloud Logging 기본 보존이 30일이라 30일 이전 호출은 확인할 수 없다. 다만 `yaksa_posts` 가 0행이고 `yaksa_categories` 가 seed 단일 시점이므로, 과거에 write 소비자가 존재했을 가능성도 데이터로 반증된다.

---

## 10. Endpoint 별 판정 · 최종 처분표 (필수 산출물 ④)

| # | Endpoint | 판정 | 핵심 근거 | 선행조건 | 후속 WO |
|---|----------|:---:|-----------|----------|---------|
| 1 | GET /yaksa/posts | **REMOVE** | production 소비 0 · 내부 호출 0 · 데이터 0행 · 30일 실호출 0 | §11 공통 | 코드 제거 WO |
| 2 | GET /yaksa/posts/:id | **REMOVE** | 상동. 유일한 write(`view_count`)도 대상 데이터가 0행 | §11 공통 | 〃 |
| 3 | GET /yaksa/categories | **REMOVE** | 상동. 응답은 seed 5행뿐 | §11 공통 | 〃 |
| 4 | GET /yaksa/admin/posts | **REMOVE** | 소비 화면이 라우팅되지 않음 · 실호출 0 | §11 공통 | 〃 |
| 5 | POST /yaksa/admin/posts | **REMOVE** | 생성 이력 0 (posts 0행 · logs 미생성) | §11 공통 | 〃 |
| 6 | PUT /yaksa/admin/posts/:id | **REMOVE** | 대상 데이터 0행 | §11 공통 | 〃 |
| 7 | PATCH /yaksa/admin/posts/:id/status | **REMOVE** | 대상 데이터 0행 · 업무 상태 전이 없음 | §11 공통 | 〃 |
| 8 | GET /yaksa/admin/categories | **REMOVE** | 소비 화면 unrouted · 실호출 0 | §11 공통 | 〃 |
| 9 | POST /yaksa/admin/categories | **REMOVE** | 운영 중 생성 이력 없음(전 행 seed 단일 시각) | §11 공통 | 〃 |
| 10 | PUT /yaksa/admin/categories/:id | **REMOVE** | 상동 | §11 공통 | 〃 |
| 11 | PATCH /yaksa/admin/categories/:id/status | **REMOVE** | 상동 · inactive 0행 | §11 공통 | 〃 |
| 12 | GET /yaksa/admin/logs/posts | **REMOVE** | 로그 대상 0 · 대체 API 없음이나 보존할 업무 기능도 없음 | §11 공통 | 〃 |

**KEEP 0 / REPLACE 0 / REMOVE 12 / HOLD 0.**

판정 근거 요약 (WO 의 REMOVE 4조건 대응):
1. production 소비처 없음 — 코드상 호출 3파일이 모두 미라우팅 화면, 30일 실호출 0.
2. 서버 내부 호출·외부 계약 근거 없음 — internal import 0, 계약 문서 0, 테스트 0.
3. 독립된 현행 업무 기능 없음 — 조직·서비스 경계가 없는 전역 게시판이며 canonical forum 이 그 업무를 수행 중.
4. 데이터 write·소유 책임 없음 — 3테이블 모두 실 운영 데이터 0 (카테고리는 seed).
5. 현행 Yaksa 실서비스 패키지·화면·membership 기능과 **연결점 0** (§13).

---

## 11. REMOVE 후속 WO 의 삭제 전제조건 · 영향 파일

**전제조건**
1. `apps/api-server/src/database/entities.ts` 의 Yaksa entity 3종 등록(140-143, 665-667)을 **함께** 제거해야 한다. 남기면 orphan 엔티티가 된다.
2. **DB 테이블(`yaksa_posts`·`yaksa_categories`·`yaksa_post_logs`) DROP 은 본 CHECK 의 판정 범위 밖**이다. DROP 은 사용자 승인 + migration 이 필요하며, route 제거와 분리해 순서를 잡는 것이 안전하다 (route 제거 → 관찰 → DROP).
3. `apps/api-server/scripts/delete-seed-data.sql` 의 `yaksa_*` 구문은 테이블 DROP 시점에 lockstep 으로 정리한다.
4. 배포 후 `/api/v1/yaksa/posts` 가 404 로 바뀌는지 확인한다 (현재 200).

**영향 파일 (route 제거 범위)**

| 파일 | 조치 |
|------|------|
| `apps/api-server/src/routes/yaksa/**` (13파일) | 디렉터리 삭제 (entities 3종 포함 여부는 위 ①②와 함께 결정) |
| `apps/api-server/src/bootstrap/register-routes.ts:105, 643-649` | import + mount 블록 제거 |
| `apps/api-server/src/database/entities.ts:139-143, 664-667` | entity 등록 제거 |
| `apps/admin-dashboard/src/pages/yaksa-forum/**` (5파일) | 미라우팅 화면. 같은 WO 에서 은퇴 권장 (남기면 소비처 재유입 위험) |

## 12. REPLACE 후속 — 해당 없음

이전할 production 소비처가 0건이므로 REPLACE 대상 endpoint 는 없다. 다만 본 감사에서 확인된 **별개의 404 부채**를 후속 판단 대상으로 기록한다 (이번 WO 범위 밖, 코드 변경 0):

| 항목 | 내용 |
|------|------|
| FOLLOWUP-A | `apps/main-site/src/lib/yaksa/forum-data.ts` 의 `/api/v1/yaksa/forum/*`·`/organizations`·`/user/profile` 7개 호출이 전부 404 (mock fallback 동작 추정). 화면 존폐·경로 정합을 별도 판단 |
| FOLLOWUP-B | `apps/admin-dashboard/src/lib/api/yaksaAdmin.ts:217-241` 의 `/api/v1/yaksa/reports*` 4개 호출이 404 |
| FOLLOWUP-C | `packages/forum-yaksa/src/backend/routes/yaksa.search.routes.ts` 는 어디에도 mount 되지 않음 |
| FOLLOWUP-D | `ForumRecommendationController.ts:84` JSDoc 의 `/api/v1/yaksa/forum/recommendations` 는 stale (실경로 `/api/v1/forum/recommendations/yaksa`) |
| FOLLOWUP-E | (route 를 살릴 경우에만 유효) §7-3 미인증 `status` 필터 노출 결함 |

## 13. 현행 Yaksa 실서비스 무영향 확인

| 대상 | 본 12 endpoint 와의 연결 | 영향 |
|------|--------------------------|:---:|
| `@o4o/membership-yaksa` · `/api/v1/membership/*` | 없음 (별도 entity·route) | 없음 |
| `@o4o/forum-yaksa` (`YaksaCommunity*`) | 없음 (별도 테이블·도메인) | 없음 |
| `@o4o/lms-yaksa` · `/api/v1/lms-yaksa/*` | 없음 | 없음 |
| `@o4o/annualfee-yaksa`, `yaksa-accounting`, `yaksa-admin`, `yaksa-scheduler`, `reporting-yaksa`, `member-yaksa` | 없음 | 없음 |
| `/admin/yaksa/*` 화면군 (승인·보고·임원·교육·회비·회계) | 없음 (각기 다른 API 소비) | 없음 |
| KPA 현행 role·membership 기능 | 없음 | 없음 |
| canonical `/api/v1/forum/*` | 없음 (독립 entity·경계) | 없음 |

`yaksa` 명칭 일치만으로 legacy 로 판정한 대상은 없다. 판정은 전부 mount → controller → service → repository → 테이블 실행 경로와 실측 데이터·로그에 근거한다.

## 14. 코드 · DB · 계정 · 역할 · migration · 배포 변경 0

| 항목 | 결과 |
|------|:---:|
| production 코드 변경 | **0** (`git status` 상 본 세션 변경 파일 0, CHECK 문서만 신규) |
| route·guard·JWT scope·프런트 호출 변경 | **0** |
| 운영 DB write (INSERT/UPDATE/DELETE/DROP/ALTER) | **0** — SQL 자체를 실행하지 않았다 |
| 운영 DB read | 공개 HTTP endpoint 조회만 (SQL 직접 접속 미수행) |
| 계정·역할·membership 변경 | **0** |
| schema·migration·seed 변경 | **0** |
| 배포 | **0** |
| `pnpm-lock.yaml` | 미변경 |

본 세션이 기동한 cloud-sql-proxy 프로세스는 자기 PID 만 종료했다. 타 세션 proxy(5433·5439)는 건드리지 않았다.

## 15. 타 세션 WIP 보존

`apps/api-server/src/scripts/**` HFF-ZH 산출물 60건은 조회조차 하지 않았고 수정·삭제·stash·stage 하지 않았다. 본 커밋은 CHECK 파일 1건만 path-specific 으로 포함한다.

---

## 16. 완료 문장

`/api/v1/yaksa/*`를 이름만으로 삭제하지 않고 실제 소비처·데이터·권한·대체 계약을 조사하여 endpoint별 처분을 확정했다. 이번 감사에서는 production 코드와 운영 데이터에 어떠한 변경도 하지 않았다.

**최종 판정: PASS** — 12 endpoint 전부 **REMOVE**, HOLD 0. 후속은 별도의 코드 제거 WO 로 진행한다 (DB 테이블 DROP 은 사용자 승인 후 별도 단계).
