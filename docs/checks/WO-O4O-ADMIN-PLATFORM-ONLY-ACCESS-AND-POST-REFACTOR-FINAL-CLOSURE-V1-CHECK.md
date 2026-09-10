# CHECK — WO-O4O-ADMIN-PLATFORM-ONLY-ACCESS-AND-POST-REFACTOR-FINAL-CLOSURE-V1

- **작성일**: 2026-09-10
- **선행 WO**: `WO-O4O-ADMIN-INFORMATION-ARCHITECTURE-AND-MENU-ROLE-REFACTOR-V1` (CLOSED)
- **대상 축**: `ADMIN_PLATFORM_ONLY_ACCESS` · `POST_REFACTOR_RESIDUALS`
- **코드 커밋**: `6be22bb19` (7 files / +304 / -174)
- **상태**: CLOSED

---

## 0. 요약

`admin.neture.co.kr` 을 O4O 플랫폼 전체 관리자 전용 사이트로 확정했다.
진입 floor 를 legacy `admin` 에서 canonical `platform:super_admin` 으로 좁혔고,
잠금 사고 없이 `sohae2100` 의 canonical 역할을 정렬했다.
`/partnerops/*` 프런트 잔재 8 라우트를 제거했고, GlycoPharm 타입 잔재는 활성 소스에 0 임을 확인했다.

**데이터(역할) 변경과 코드 변경은 서로 다른 시점·다른 경로의 작업이다. 아래 §1 과 §2 로 분리해 기록한다.**

---

## 1. 데이터 변경 — 프로덕션 role_assignments (코드 변경 아님)

> Git diff 에 포함되지 않는다. 자격정보·접속 문자열은 이 문서에 기록하지 않는다.

### 1.1 실측 (변경 전)

`role_assignments` (F9 RBAC SSOT) 기준 실측 결과.

| 항목 | 실측 |
|---|---|
| `platform:super_admin` role 존재 | YES |
| ACTIVE 보유자 (변경 전) | `super-admin@o4o.com` · `renariver21@gmail.com` (2계정) |
| `sohae2100@gmail.com` users.id | `cfd2a5e7-db28-4842-bd5c-4814cba49ca5` (active) |
| `sohae2100@gmail.com` 보유 역할 | ACTIVE 서비스 역할 10건 + `platform:super_admin` **`is_active=false`** |
| 관리자 사이트 실제 로그인 계정 | `renariver21@gmail.com` (TEST-ACCOUNTS SSOT 기준) |

핵심 사실: `sohae2100` 의 `platform:super_admin` assignment 는 **행 자체는 이미 존재**했고
`is_active=false` 로 비활성화되어 있었다 (비활성 시점 2026-07-26). 신규 부여가 아니라 재활성이 필요한 상태였다.

### 1.2 변경 (additive)

- 방식: 단일 행 대상 `UPDATE` — `BEGIN` / `COMMIT` 트랜잭션, before/after `SELECT` 동반
- 영향 행: **1 row**
- **기존 서비스 역할 10건 삭제 없음** (additive 계약 준수)
- **중복 assignment 생성 없음** — 기존 행을 재활성했으므로 `unique_active_role_per_user` 충돌 없음

### 1.3 변경 후 검증 (새 로그인 세션)

| 확인 | 결과 |
|---|---|
| 로그인 | 성공 |
| auth 응답 role 개수 | 11건 (기존 10 + `platform:super_admin`) |
| `platform:super_admin` 반영 | YES |

**이 검증이 통과한 뒤에만 §2 의 진입 floor 제한을 적용했다** (WO §2.3 잠금 방지 순서 준수).

### 1.4 변경 후 `platform:super_admin` ACTIVE 보유자

`super-admin@o4o.com` · `renariver21@gmail.com` · `sohae2100@gmail.com` — **3계정**

---

## 2. 코드 변경 — 커밋 `6be22bb19`

### 2.1 A축 · 진입 floor

**`apps/admin-dashboard/src/App.tsx`**

```diff
- <AdminProtectedRoute requiredRoles={['admin']} showContactAdmin={true}>
+ <AdminProtectedRoute requiredRoles={['platform:super_admin']} showContactAdmin={true}>
```

`['admin']` 이 위험했던 이유 (2단 확장):

1. `expandRequiredRoles('admin')` → `admin` · `super_admin` · `operator` · `platform:super_admin`
2. `SERVICE_PREFIX_ACCEPTING_ROLES = ['admin','administrator','super_admin','operator']` →
   `kpa:admin` · `neture:operator` · `pharmacy-hub:admin` 같은 **서비스 단위** 역할까지 매칭

결과적으로 서비스 운영자가 플랫폼 관리자 사이트에 진입할 수 있었다.
`platform:super_admin` 은 서비스 접두 확장 대상이 아니므로 floor 가 정확히 1개 역할로 고정된다.

거부 시 `AdminProtectedRoute` 는 **안내 화면을 렌더**한다 (redirect 아님) → login loop 구조적으로 불가.

### 2.2 A축 · rolePermissions.ts (값 변경 없음 · 주석만)

`PLATFORM_ADMIN_ROLES = ['platform:super_admin']` 과 6개 platform 전용 메뉴 선언
(`core-users` · `core-operators` · `core-points` · `platform-hub` · `ops-metrics` · `appstore-browse`)
는 이미 정합했다. floor 강화 이후 이 선언들은 **이중 방어**임을 주석으로 명시했다.

§5.3 "설정 없음 = 허용" 의존 여부: **없음.** floor 를 통과한 주체는 정의상 platform admin 이며,
platform 전용 메뉴는 추가로 명시 role 을 선언한다.

### 2.3 A축 · 백엔드 API 권한

**이번 WO 에서 백엔드 서비스 레벨 API 권한을 platform 전용으로 확대하지 않았다** (WO §5.3 금지 조항).
회귀 테스트가 `routes/admin/users.routes.ts` 의 `ADMIN_ROLES` 를 읽어 프런트 선언과 대조한다.

### 2.4 B축 · /partnerops/* 제거

| 제거 대상 | 내용 |
|---|---|
| 프런트 라우트 | `apps.routes.tsx` 의 `/partnerops/*` 1 선언 (하위 8 경로) |
| lazy import | `PartnerOpsRouter` |
| 전용 페이지 | `pages/partnerops/PartnerOpsRouter.tsx` · `PartnerOpsGuidePage.tsx` (`git rm -r`) |
| View 등록 | `ViewComponentRegistry.ts` 의 `partnerops.router` 등록 |

제거 근거: 프로덕션 8 엔드포인트 404 · 메뉴 진입점 0 · 8 경로가 이미 안내 페이지 1장으로 축소 · guard 가 legacy `partner` role 리터럴.
`supplierops` 은퇴 선례와 동일한 방식·주석 형식을 따랐다.

**보존한 것 (삭제 금지 대상):**

- `serviceGroup: 'partnerops'` — `partner-core` 가 소비하는 살아있는 공통 타입
- `appsCatalog.ts` 의 `partnerops` appId 엔트리
- **`app_registry` 의 활성 `partnerops` row — 운영 데이터이므로 WO §6.2 에 따라 삭제 중지·보고**

### 2.5 B축 · GlycoPharm 잔재 (`insight-rules.ts`)

활성 소스에서 GlycoPharm 서비스 계약 **0건**. fallback·placeholder·default 로 재추가하지 않았다.
`SERVICE_LINKS` 키와 `AIServiceId` union 의 exhaustiveness 를 회귀 테스트로 고정했다.

### 2.6 회귀 테스트 (신규)

`apps/admin-dashboard/src/tests/admin-platform-only-access-and-post-refactor-closure.test.ts` — **40 tests**

- A축 진입 floor 가 `platform:super_admin` 단독인지
- §5.2 접근 계약 (it.each 약 20 케이스)
- 거부가 redirect 아닌 안내 화면인지 (login loop 금지)
- 메뉴가 "설정 없음 = 허용" 에 기대지 않는지 (백엔드 `ADMIN_ROLES` 대조 포함)
- `/partnerops/*` 프런트 잔재 0
- 활성 소스 GlycoPharm 서비스 계약 0

주의: 소스 문자열 단언 테스트라 **제거 근거 주석에 남은 식별자가 오탐**된다.
주석 제거 시 일반 블록 주석 정규식을 쓰면 라우트 선언의 `path="/*"` 를 주석 시작으로 오인해
파일 뒷부분을 통째로 삼킨다. JSX 주석 형태와 JSDoc 형태만 제거해야 한다.

---

## 3. §7.3 CI 커버리지 갭 — 판정 CLOSED

`@o4o/ai-core` 는 `@o4o/api-server` 의 workspace dependency 다.
CI (`ci-pipeline.yml`) 는 clean checkout 에서 `pnpm --filter '@o4o/api-server^...' run build` 로 의존 패키지를
위상 순서로 빌드한 뒤 `pnpm --filter @o4o/api-server run type-check` 를 돌린다.
따라서 `AIServiceId` union 불일치는 **CI 에서 반드시 실패한다** — 커버리지 갭 없음.

다만 `ai-core` 의 스크립트명은 `typecheck` (하이픈 없음) 이라 저장소 전역 `run type-check` 로는 건너뛴다.
현재 커버리지는 api-server 를 통한 **전이적(transitive)** 커버리지다. 이 사실을 기록해 둔다.

---

## 4. 로컬 검증 (§10)

| 항목 | 결과 |
|---|---|
| `pnpm run build:packages` | exit 0 |
| admin-dashboard type-check | exit 0 |
| admin-dashboard test | **14 files / 286 tests PASS** |
| admin-dashboard build | 성공 |
| api-server type-check | exit 0 |
| api-server jest (관련) | **2 suites / 25 tests PASS** |
| `@o4o/auth-context` type-check | exit 0 |
| `@o4o/ai-core` typecheck | exit 0 |
| admin-dashboard lint | **error 10건 — 전부 이번 diff 가 건드리지 않은 파일의 기존 오류** |

lint 10건은 이번 변경과 무관한 기존 결함이므로 중지 조건으로 보지 않았다 (숨기지 않고 여기 기록한다).

---

## 5. 프로덕션 브라우저 검증 (§11)

별도 브라우저 세션. 배포본 확인: 로그인 화면 배포 스탬프 `2026-09-10`.

### 5.1 플랫폼 관리자 (`renariver21@gmail.com`)

| 확인 | 결과 |
|---|---|
| 로그인 | PASS (`관리자 로그인 성공!`) |
| 관리자 사이트 진입 | PASS → `/home` |
| **사이드바 메뉴 수** | **22** (계약 일치) |
| 직접 URL (`/users`) | PASS — 실데이터 렌더 |
| 새로고침 · 딥링크 (`/admin/o4o-product-db/overview`) | PASS |
| 주요 admin API | 전부 2xx (`/admin/users` · `/navigation/admin` · `/userRole/:id/permissions` · `/auth/status` · `/apps/availability`) |
| 콘솔 에러 | **0** |
| API 4xx | **0** |

측정된 22 메뉴:
`/admin` · `/admin/platform/hub` · `/users` · `/operators` · `/operator/points` · `/settings` ·
`/admin/o4o-product-db/{overview,candidates,store-requests,masters,supplier-store-descriptions,image-quality,maintenance}` ·
`/content` · `/content/assets` · `/content/policies` · `/content/analytics` ·
`/admin/cms/contents` · `/admin/cms/slots` · `/admin/ops/metrics` ·
`/apps/store` · `/admin/digital-signage/content`

### 5.2 제거된 `/partnerops/*` 라우트

| 경로 | 결과 |
|---|---|
| `/partnerops` | `/admin` 으로 **안전 redirect** |
| `/partnerops/settlements` | `/admin` 으로 **안전 redirect** |

- 확정 방식 **1가지** (admin Overview 로 안전 redirect)
- partner 관련 API 요청 **0건**
- 죽은 컴포넌트 재렌더 **없음**
- 콘솔 에러 **0**

### 5.3 서비스 역할 전용 계정 (`renagang21@gmail.com`)

실측 보유 역할 8건 — `platform:super_admin` **없음**:
`user` · `kpa:store_owner` · `cosmetics:store_owner` · `lms:instructor` · `pharmacy` · `supplier` · `pharmacy-hub:store_owner` · `kpa-branch:member`

| 확인 | 결과 |
|---|---|
| `admin.neture.co.kr` 로그인 자체 | 성공 (인증은 통과) |
| 관리자 사이트 **진입** | **차단** — `접근 권한 없음 / 관리자 권한이 필요합니다` 안내 화면 |
| 관리자 딥링크 (`/users`) | **차단** — `접근 권한이 없습니다` 안내 화면 |
| redirect loop | **없음** (URL `/users` 고정 · history length 불변) |
| 빈 화면 | 없음 |
| 차단 상태의 admin API 요청 | **0건** (`/auth/status` 외 없음 — 권한 확대 없음) |
| 자기 서비스 로그인 (`neture.co.kr`) | PASS |
| 자기 서비스 운영 화면 (`/supplier/dashboard`) | PASS — 실데이터 정상 (등록 상품 20 · 판매 중 19 · 공급자 상태 활성) |

### 5.4 미인증 접근

`admin.neture.co.kr/users` 미인증 → `/login` 리디렉트. 계약 일치.

---

## 6. Git · CI

| 항목 | 값 |
|---|---|
| 커밋 | `6be22bb19` (rebase from `a648ff25b`) |
| push | `b111ada24..6be22bb19` → `main` |
| stage 방식 | path-specific (`git commit -- <paths>`) |
| force-push | 없음 |
| 다른 세션 변경 덮어씀 | 없음 |

### CI 실행 결과

| 워크플로 | SHA | 결과 |
|---|---|---|
| Deploy Admin Dashboard (Cloud Run) | `6be22bb19` | **success** |
| CI Pipeline | `6be22bb19` | **cancelled** — 내 코드 실패 아님 |
| CodeQL Security Analysis | `6be22bb19` | **cancelled** — 동일 사유 |
| CodeQL Security Analysis | `798952513` | **success** |
| Deploy API Server (Cloud Run) | `798952513` | **success** |
| CI Pipeline | `798952513` | **success** |

#### 6.1 cancelled 의 원인 — 은폐하지 않는다

내 push 약 3분 뒤 다른 세션이 `798952513` 을 push 했고, GitHub Actions **concurrency group** 이
진행 중이던 내 run 을 취소했다. 코드 실패가 아니다.

`6be22bb19` 는 `798952513` 의 조상이므로 `798952513` 의 run 은 내 변경을 **포함한 상태**로 빌드한다.
따라서 `798952513` 의 CI Pipeline / CodeQL 결과를 유효 근거로 사용한다.

#### 6.2 DEPLOY_API — 트리거되지 않음

`6be22bb19` 는 `apps/admin-dashboard/**` 만 변경했으므로 Deploy API Server 가 **트리거되지 않았다**.
`798952513` 의 Deploy API Server success 는 다른 세션 변경에 대한 배포다.
**이 WO 의 코드 변경에 대한 API 배포는 존재하지 않는다** — SUCCESS 로 주장하지 않는다.

---

## 7. 중지·보고 항목 (수정하지 않고 보고만 한다)

1. **`app_registry` 의 활성 `partnerops` row** — 운영 데이터. WO §6.2 에 따라 삭제 중지.
2. **`sohae2100` 의 `platform:super_admin` 은 2026-07-26 에 의도적으로 비활성화된 이력이 있다.**
   이번 WO 는 그 행을 재활성했다. 과거 비활성화 의도를 되돌린 것이므로 별도 확인이 필요하면 이 항목을 근거로 삼는다.
3. **`/dashboard/business` 도달 불가** — `requiredRoles={['partner','affiliate','seller','supplier']}` 는
   `platform:super_admin` 으로 확장되지 않는다. floor 강화 이후 이 라우트는 진입 가능한 유일 페르소나가 없다.
   메뉴 참조 0건 (라우트 전용) 이라 사용자 영향은 없다. **범위 밖이므로 수정하지 않았다.**
4. **`6be22bb19` 의 CI Pipeline / CodeQL cancelled** — 동시 push 로 인한 취소 (§6.1).

---

## 8. 최종 판정 (§13)

```
ADMIN_PLATFORM_ROLE_VERIFIED          = PASS
PRIMARY_ADMIN_LOCKOUT_RISK            = ZERO
ADMIN_ENTRY_FLOOR                     = platform:super_admin
SERVICE_ROLE_ADMIN_ENTRY              = DENIED
PLATFORM_ADMIN_MENU_COUNT             = 22
MENU_ROUTE_API_AUTH_ALIGNMENT         = PASS
PARTNEROPS_ACTIVE_MENU                = ZERO
PARTNEROPS_ACTIVE_ROUTES              = ZERO
PARTNEROPS_ACTIVE_CONSUMERS           = ZERO
PARTNEROPS_PRODUCTION_404_RESIDUAL    = ZERO
GLYCOPHARM_ACTIVE_INSIGHT_RULE        = ZERO
GLYCOPHARM_ACTIVE_TYPE_CONTRACT       = ZERO
RELATED_PACKAGE_TYPECHECK             = PASS
CI_COVERAGE_GAP                       = CLOSED_OR_JUSTIFIED
OTHER_SERVICE_REGRESSION              = PASS
CI_PIPELINE                           = SUCCESS (798952513 · 6be22bb19 포함)
CODEQL                                = SUCCESS (798952513 · 6be22bb19 포함)
DEPLOY_ADMIN                          = SUCCESS (6be22bb19)
DEPLOY_API                            = NOT_TRIGGERED (api-server 변경 없음 · SUCCESS 아님)
ADMIN_PLATFORM_ONLY_ACCESS            = CLOSED
POST_REFACTOR_RESIDUALS               = CLOSED
ADMIN_POST_REFACTOR_FINAL_CLOSURE     = CLOSED
```
