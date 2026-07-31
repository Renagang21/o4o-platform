# CHECK-O4O-AUTH-ONLY-ROUTE-GUARD-HARDENING-V1

> WO: `WO-O4O-AUTH-ONLY-ROUTE-GUARD-HARDENING-V1`
> 선행 IR: [`IR-O4O-NEW-USER-SERVICE-REJECTION-LOGIN-POLICY-V1`](../investigations/IR-O4O-NEW-USER-SERVICE-REJECTION-LOGIN-POLICY-V1.md)
> 일자: 2026-07-31
> 작업 전 HEAD: `be2863353e4adc46677defb73423dc1cd4b3dfe6`
> 브랜치: `main`

---

## 1. 목적

`requireAuth`(=`authenticate`) 만 적용되고 실제 소유권·조직·역할 검사가 빠진 API 를 조사하고,
**확인된 고위험 경로**를 기존 권한 구조로 보강한다. 278개 전체 일괄 변경은 하지 않는다.

이 작업은 **pending/rejected 사용자 제한 로그인(B안)을 열기 전의 선행 보안 정비**다.
IR 이 B안을 택한 근거가 "로그인 성공만으로 접근 가능한 write 경로가 존재한다" 였으므로,
그 전제를 먼저 제거한다.

---

## 2. 조사 결과 — `requireAuth` 단독 라우트 분류

전수 검색(라우트 등록 라인에 `authenticate`/`requireAuth` 는 있으나 다른 축의 가드가 없는 것) 결과
**작업 전 278건** → **작업 후 168건**(라우트 레벨 기준. dashboard-assets 10건은 핸들러 내부에서 가드하므로 라우트 레벨 카운트에는 남아 있음).

### 2.1 분류 (WO §5-A 7분류)

| 분류 | 의미 | 대표 사례 | 이번 WO 조치 |
|------|------|-----------|--------------|
| **PUBLIC_INTENTIONAL** | 인증만으로 충분한 공개성 자원 | `/cpt/forms/name/:name`, `/cpt/forms/:id/submit`, `/linked-accounts/sso/check` | 없음 (의도된 설계) |
| **AUTH_COMMON** | 본인 컨텍스트만 다룸 (`req.user.id` 로만 조회) | `/linked-accounts/sessions`, `/linked-accounts/sessions/:sessionId`(DELETE), `/logout-all-devices`, `dashboard/assets/supplier-signal`, `dashboard/assets/seller-signal` | 없음 (안전 확인) |
| **ROLE_REQUIRED (내부 검사 있음)** | 라우트에는 없으나 컨트롤러가 역할 검사 | `/api/admin/orders/*` 5건 — `adminOrderController.ts:22 isAdmin()` 이 5개 핸들러 전부에서 호출됨 | 없음 (안전 확인, 라우트 레벨 명시화는 후속) |
| **OWNERSHIP_REQUIRED (결함)** | 클라이언트 식별자를 소유권 검증 없이 신뢰 | `/api/v1/dashboard/assets*` 8건, `/api/v1/userRole/:userId/permissions` | **수정** |
| **ROLE_REQUIRED (결함)** | 관리자 전용 기능인데 가드 없음 | `/api/v1/cpt` posts/terms/forms 쓰기 13건 | **수정** |
| **ORG_REQUIRED** | 조직 경계가 필요하나 이번 범위 밖 | `forum.routes.ts` 20건, `market-trial.routes.ts` 10건, `partner.routes.ts` 11건 | 없음 (§4 잔여 목록) |
| **UNCLEAR** | 추가 조사 필요 | `ai-proxy.routes.ts` 8건, `media-library.controller.ts` 7건, `store-policy.routes.ts` 7건 | 없음 (§4 잔여 목록) |

### 2.2 확정 결함 D-A — CPT 쓰기 권한 경계 부재

- 라우트: `apps/api-server/src/routes/cpt.ts` (마운트 `bootstrap/register-routes.ts:143` → `/api/v1/cpt`)
- CPT **type / field-group / taxonomy** 쓰기는 이미 `requireAdmin`.
- 그러나 **post / term / term-relationship / form** 쓰기와 **form submission 조회**는 `authenticate` 만 걸려 있었다.
  → 임의의 로그인 사용자가 게시물·분류·폼을 생성·수정·삭제하고, 폼 제출 데이터(개인정보 가능)를 열람할 수 있었다.
- 소유권 필드: `entities/CustomPost.ts:67-68` 에 `authorId`(컬럼 `authorid`, nullable) 존재.
  `services/cpt/modules/post.module.ts:152` 가 `authorId: userId` 로 기록한다.
  단 `updatePost(postId, data)` / `deletePost(postId)` 는 **userId 를 받지 않아** 서비스 계층 소유권 판정이 불가능했다.
- `updatePost` 는 `Object.assign(post, data)` 로 payload 를 그대로 병합 → `authorId` 를 실으면 **작성자 위조** 가능.
  `createPost` 는 `postRepository.create({...data, ...})` → payload 에 `id` 를 실으면 `save()` 가 **타 게시물을 덮어쓴다**.
- 미마운트 중복 파일 확인: `apps/api-server/src/modules/cpt-acf/routes/cpt.routes.ts` (11건)는 **어디에도 마운트되지 않은 dead file** — 이번 범위 밖.

### 2.3 확정 결함 D-B — Dashboard Assets 소유권 검증 부재

- 라우트: `apps/api-server/src/routes/dashboard/dashboard-assets.routes.ts` (마운트 `register-routes.ts:968` → `/api/v1/dashboard/assets`)
- 10개 엔드포인트 전부 `authenticate` 만. 이 중 8개가 **클라이언트가 보낸 `dashboardId` / `targetDashboardId`** 를
  소유권 검증 없이 그대로 `cms_media."organizationId"` 필터/저장값으로 사용했다.

| 엔드포인트 | 식별자 출처 | 작업 전 검사 |
|-----------|-------------|--------------|
| `GET /` | `req.query.dashboardId` | 존재 여부(400)만 |
| `GET /copied-source-ids` | `req.query.dashboardId` | 존재 여부(400)만 |
| `GET /kpi` | `req.query.dashboardId` | 존재 여부(400)만 |
| `POST /copy` | `req.body.targetDashboardId` | 존재 여부(400)만 |
| `PATCH /:id` | `req.body.dashboardId` | 존재 여부(400)만 |
| `POST /:id/publish` | `req.body.dashboardId` | 존재 여부(400)만 |
| `POST /:id/archive` | `req.body.dashboardId` | 존재 여부(400)만 |
| `DELETE /:id` | `req.query.dashboardId` | 존재 여부(400)만 |
| `GET /supplier-signal` | — (`req.user.id` 사용) | 안전 |
| `GET /seller-signal` | — (`req.user.id` 사용) | 안전 |

### 2.4 `dashboardId` SSOT 확정 (WO §5-C / 중지 조건 ①)

**별도 dashboard 원장 테이블은 존재하지 않는다.** `dashboardId` 는 실제로 **호출자 본인의 `user.id`** 이며,
`cms_media."organizationId"` 컬럼이 그 값을 담도록 재사용되고 있다. 코드 근거:

| 근거 | 값 |
|------|-----|
| `services/web-kpa-society/src/pages/dashboard/MyContentPage.tsx:112` | `const dashboardId = user?.id;` |
| `services/web-neture/src/pages/dashboard/MyContentPage.tsx:112` | `const dashboardId = user?.id;` |
| `services/web-neture/src/pages/library/ContentLibraryPage.tsx:125,185` | `const userId = user?.id;` → `targetDashboardId: userId` |
| `services/web-k-cosmetics/src/pages/library/ContentLibraryPage.tsx:109,164` | `const userId = user?.id;` → `targetDashboardId: userId` |
| `services/web-neture/src/pages/content/ContentListPage.tsx:43` · `ContentDetailPage.tsx:59` | `getCopiedSourceIds(user.id)` |
| `dashboard-assets.copy-handlers.ts:166,239,319,393` | `organizationId: targetDashboardId` |

→ WO §5-C 지시대로 **변수명(`organizationId`)만 보고 별도 대시보드 원장을 신설하지 않았다.**
`services/web-glycopharm/src/api/dashboardCopy.ts` 는 클라이언트만 존재하고 실제 호출부가 없다(미사용).

### 2.5 조직·소유권 SSOT

- `organization_members` (프로덕션 12행): `id, organization_id, user_id, role, is_primary, metadata, joined_at, **left_at**, created_at, updated_at`
  → **status 컬럼 없음. 활성 소속 = `left_at IS NULL`.**
- 재사용 가능한 범용 organization/ownership 가드는 **존재하지 않았다.**
  `middleware/tenant-isolation.middleware.ts` 는 serviceGroup 축이지 소유권 축이 아니다.
  `packages/dropshipping-cosmetics/.../permissions.middleware.ts:169 requireOwnership` 은 해당 패키지 전용.
  → WO §6-C 범위(helper 1개)로 최소 helper 를 신설했다.
- 관리자 판정은 기존 `requireAdmin` 과 **동일 기준**(`roleAssignmentService.hasAnyRole(['platform:admin','platform:super_admin'])`)을 재사용.

---

## 3. 구현

### 3.1 신규 helper (1개)

**`apps/api-server/src/utils/dashboard-access.guard.ts`** (신규)

`checkDashboardAccess(dataSource, user, rawDashboardId) → AccessDecision` — 허용 근거 3가지만 판정한다.

1. `self` — `dashboardId === req.user.id` (표준 경로)
2. `organization` — `organization_members` 에 `(user_id, organization_id, left_at IS NULL)` 활성 소속
3. `admin` — `platform:admin` / `platform:super_admin`

`respondAccessDenied(res, decision, ctx)` — 표준 JSON 응답 + 거부 로깅.

- Raw SQL 은 `$1/$2` binding (Boundary Policy Guard Rule ②). 문자열 보간 0.
- 조회 실패(`organization_members` 예외)는 **거부**로 처리한다. fail-open 없음.
- 범용 ACL 프레임워크가 아니다. 판정 축 3개 고정.

### 3.2 권한 계약 (응답 코드)

| 상황 | 코드 | body.error.code |
|------|------|-----------------|
| 미인증 | **401** | `UNAUTHORIZED` |
| `dashboardId` 누락 | **400** | `INVALID_REQUEST` |
| `dashboardId` 형식 오류(비 UUID) | **400** | `INVALID_REQUEST` |
| 인증됐으나 대상에 권한 없음 | **403** | `FORBIDDEN` |
| 권한은 있으나 대상 자산 없음 | **404** | `NOT_FOUND` |

**403/404 구분 근거**: `dashboardId` 는 소유자 user id 이므로 403 이 "그 대시보드에 자산이 있는지" 를 누설하지 않는다.
자산 단위 존재 은닉은 기존 계약대로 404 를 유지한다(권한 통과 후 `findOne({id, organizationId})` 미스 → 404).

### 3.3 Dashboard Assets — 읽기·쓰기 **모두** 적용

읽기 3 + 쓰기 5 = 8개 경로 전부에 `checkDashboardAccess` 를 적용했다. (WO §6-A "읽기만 고치고 쓰기를 남기지 않는다")

- `dashboard-assets.query-handlers.ts` — list / copied-source-ids / kpi
- `dashboard-assets.mutation-handlers.ts` — update / publish / archive / delete
- `dashboard-assets.copy-handlers.ts` — copy (`targetDashboardId`)

기존의 개별 401/400 분기는 helper 로 대체되어 계약이 통일되었다.

### 3.4 CPT 쓰기 경계 보강

`apps/api-server/src/routes/cpt.ts` — 인접 라우트의 **기존 정책(코드 근거)** 인 `requireAdmin` 에 정렬. 13개 라우트:

```
POST/PUT/DELETE  /:slug/posts[/:postId]              (3)
POST             /taxonomies/:taxonomyId/terms       (1)
PUT/DELETE       /terms/:id                          (2)
POST             /term-relationships                 (1)
POST/PUT/DELETE  /forms[/:id]                        (3)
POST             /forms/:id/duplicate                (1)
PATCH            /forms/:id/status                   (1)
GET              /forms/:id/submissions              (1)
```

`apps/api-server/src/modules/cpt-acf/controllers/cpt.controller.ts` — payload 신뢰 제거(방어 심층):

- `createPost`: `id` / `authorId` 를 payload 에서 제거 → `id` 주입으로 타 게시물 덮어쓰기 차단
- `updatePost`: `id` / `authorId` 를 payload 에서 제거 → 작성자 위조 차단

읽기(`GET /:slug/posts`, `GET /forms`, `GET /terms/:id` 등)는 변경하지 않았다(§4.4 읽기/쓰기 분리).

### 3.5 사용자 권한 조회 경로

`apps/api-server/src/routes/user-role.routes.ts` — `GET /api/v1/userRole/:userId/permissions` 는
경로의 `:userId` 를 검증 없이 신뢰해 **로그인만으로 타 사용자의 역할·권한 전체를 열람**할 수 있었다.
→ **본인 또는 platform admin** 만 허용(401/403). WO §4.2 가 명시한 `userId` 불신 원칙 적용.

소비처 확인(회귀 없음): `apps/admin-dashboard/src/hooks/useAdminMenu.ts:89`(`user.id`),
`pages/test/AuthDebug.tsx:41`(`user.id`), `config/rolePermissions.ts:185`(`fetchUserPermissions` — **호출부 없는 dead 함수**).

---

## 4. 서비스 격리 확인 (WO §8)

| 요구 | 상태 |
|------|------|
| Neture 사용자가 KPA 조직 자산 접근 | 차단 (self/조직소속/admin 3근거 외 전부 403) |
| 공급자가 매장 dashboardId 임의 지정 | 차단 (`POST /copy` 의 `targetDashboardId` 검증) |
| 매장 경영자 간 상호 접근 | 차단 (서로 다른 `user.id`) |
| 운영자의 허용 범위 밖 접근 | 별도 우회 경로 신설 없음. operator 라고 통과하지 않는다 |
| platform admin 예외 | **명시적**. 기존 `requireAdmin` 과 동일 판정 기준 재사용 |
| `user.id === organization.id` 같은 추정 | 사용하지 않음. self 매칭과 조직 소속 조회를 **별개 근거**로 분리 판정 |

---

## 5. 데이터 변경

| 항목 | 결과 |
|------|------|
| migration | **0** |
| 신규 테이블 | **0** |
| 신규 role | **0** |
| 신규 membership 상태 | **0** |
| 프로덕션 DB 쓰기 | **0** (read-only SELECT 검증만 수행) |

---

## 6. 검증

### 6.1 자동 테스트 (신규)

`apps/api-server/src/__tests__/security/dashboard-assets-ownership-gate.spec.ts` — **25/25 PASS**

WO §11.1 요구대로 **목록 · copied-source-ids · KPI 세 경로를 모두 포함**했다(각 6 시나리오 × 3 = 18).

- 본인 대시보드 200 + 실제 `cms_media` 조회 발생
- 타 대시보드 403 + **`cms_media` 접근 자체가 일어나지 않음**(가드가 쿼리 이전에 차단)
- 소속 조직 대시보드 200
- `dashboardId` 누락 400 / 형식 오류 400 / 미인증 401
- platform admin 은 타 대시보드 조회 허용
- 쓰기: update 타인 403 · update 본인 200 · delete 타인 403 · delete 본인 200 · copy 타인 주입 403 · copy 누락 400

### 6.2 회귀

```
npx jest --testPathPattern=__tests__/security/ --no-coverage
→ Test Suites: 9 passed, 9 total / Tests: 210 passed, 210 total
```

```
npx tsc --noEmit -p apps/api-server/tsconfig.build.json  → exit 0
```

(`tsconfig.json` 전체 typecheck 는 `src/scripts/**` 의 **기존** 에러만 출력되며 build 대상에서 제외되어 있다.
이번 변경 파일에서 발생한 에러는 0건.)

### 6.3 정적 검증 (WO §11.4)

| 항목 | 결과 |
|------|------|
| 클라이언트 `dashboardId` 단독 신뢰 | **0** (8개 경로 전부 `checkDashboardAccess` 통과) |
| 타 조직 데이터 접근 가능 경로 (수정 범위 내) | **0** |
| raw SQL 문자열 보간 | **0** (`$1`/`$2` binding) |
| migration | **0** |
| 신규 테이블 | **0** |

### 6.4 E2E (브라우저)

**미수행.** 근거: `cms_media` 테이블이 **프로덕션에 존재하지 않는다**(§7 참조).
따라서 dashboard-assets 는 현재 프로덕션에서 빈 응답/0 KPI 만 반환하며,
브라우저로 관측 가능한 정상/비정상 대비를 만들 수 없다. 대신 6.1 의 핸들러 레벨 시나리오 테스트로 대체했다.
프로비저닝 시점에 §11.1 시나리오를 실 브라우저로 재검증할 것.

---

## 7. 잔여 위험 / 후속

1. **`cms_media` 프로덕션 미존재** — 확인된 프로덕션 CMS/CPT 계열 테이블은
   `cms_contents`, `cms_content_slots`, `cms_content_recommendations`, `custom_post_types`(0행), `custom_fields`(0행) 뿐이다.
   `cms_media` / `custom_posts` 는 없다. 즉 D-A·D-B 는 **잠재 결함(latent)** 이었고, 기능 프로비저닝 시점에 실 결함이 된다.
   이번 수정으로 프로비저닝 이전에 봉인되었다.
2. **미수정 `requireAuth` 단독 라우트 168건** — 특히 아래는 조직/소유권 축 조사가 필요하다(고위험 후보):
   - `routes/forum/forum.routes.ts` (20) — `organizationId` 경계 도메인(F6 Boundary Policy)
   - `routes/partner.routes.ts` (11) · `routes/market-trial.routes.ts` (10)
   - `modules/media/controllers/media-library.controller.ts` (7) — 미디어 소유권
   - `routes/platform/store-policy.routes.ts` (7) · `routes/ai-proxy.routes.ts` (8)
   - `modules/store-ai/controllers/product-ai-*.controller.ts` (12)
3. **`modules/cpt-acf/routes/cpt.routes.ts` dead file** (11 라우트, 미마운트) — 삭제 여부는 별도 WO.
4. **CPT posts 를 admin 이 아닌 작성자가 쓰는 시나리오** — 현재 소비처가 admin-dashboard 뿐이고 프로덕션 데이터가 0행이라
   `requireAdmin` 이 최소 권한이자 기존 정책이다. 향후 비-admin 작성자를 열려면 `custom_posts.authorid` 기반
   `작성자 OR 관리자` 판정으로 완화해야 하며, 그때 `updatePost/deletePost` 시그니처에 `userId` 를 추가해야 한다.
5. **`/api/admin/orders/*` 라우트 레벨 가드 부재** — 컨트롤러 내부 `isAdmin()` 이 5개 전부에 있어 현재는 안전하나,
   핸들러 추가 시 누락 위험이 있다. 라우트 레벨 `requireAdmin` 명시화는 후속 권장.

---

## 8. 중지 조건 판정 (WO §10)

| # | 조건 | 판정 |
|---|------|------|
| ① | `dashboardId` SSOT 확정 불가 | **해당 없음** — 코드 근거로 확정 (§2.4) |
| ② | 사용자↔organization/dashboard 관계 판정 데이터 없음 | **해당 없음** — `organization_members` + self 매칭 |
| ③ | CPT 작성자·조직 소유권 판정 필드 없음 | **부분 해당** — `authorid` 는 있으나 서비스 시그니처에 userId 없음 → 소유권 기반 대신 **기존 정책(`requireAdmin`)** 으로 정렬. 구현 확대 없음 (§7-4 로 이월) |
| ④ | 기존 정상 소비처가 권한 없는 공용 ID 접근을 전제 | **해당 없음** — 전 소비처가 `user.id` 전송 (§2.4) |
| ⑤ | 가드가 정상 업무를 광범위 중단 | **해당 없음** — 소비처 전수 확인, 정상 경로는 `self` 근거로 통과 |
| ⑥ | 신규 ACL·대규모 migration 없이 해결 불가 | **해당 없음** — helper 1개, migration 0 |
| ⑦ | 병행 작업 파일 수정 필요 | **해당 없음** — 작업 시작 시 트리 clean |
| ⑧ | 공유 Core 인데 소비처 전수 조사 불가 | **해당 없음** — dashboard-assets 소비처 4서비스 전수 확인 |

---

## 9. 변경 파일

| 파일 | 종류 |
|------|------|
| `apps/api-server/src/utils/dashboard-access.guard.ts` | 신규 |
| `apps/api-server/src/routes/dashboard/dashboard-assets.query-handlers.ts` | 수정 |
| `apps/api-server/src/routes/dashboard/dashboard-assets.mutation-handlers.ts` | 수정 |
| `apps/api-server/src/routes/dashboard/dashboard-assets.copy-handlers.ts` | 수정 |
| `apps/api-server/src/routes/cpt.ts` | 수정 |
| `apps/api-server/src/modules/cpt-acf/controllers/cpt.controller.ts` | 수정 |
| `apps/api-server/src/routes/user-role.routes.ts` | 수정 |
| `apps/api-server/src/__tests__/security/dashboard-assets-ownership-gate.spec.ts` | 신규 |
| `docs/checks/CHECK-O4O-AUTH-ONLY-ROUTE-GUARD-HARDENING-V1.md` | 신규 |

프론트엔드 변경 **0** — 정상 소비처는 이미 `user.id` 를 보내고 있어 계약 변경이 없다.
