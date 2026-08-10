# CHECK — Pharmacy-Hub Admin 역할 계층 도입

> WO: [`WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1`](../work-orders/WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1.md)
> 작성일: 2026-08-10 · 상태: **완료** — Admin 계정 프로덕션 smoke 10항목 실측(§6-2) 후 관측용 `/admin/ping` 제거

---

## 1. 결론

`pharmacy-hub:admin` 을 KPA · Neture · K-Cosmetics 와 **같은 표준 계층**(Admin ⊃ Operator)으로 도입했다.
새 권한 체계를 설계하지 않았고, **DB migration 없이** 완결됐다.

- `pharmacy-hub:admin` 은 Operator 운영 권한을 포함한다.
- `store_owner` · `supplier` 는 **사업자 신분** 역할이므로 admin 이 대신하지 않는다.
- 단순 UI 선택지 추가가 아니라 보안 가드 · 등록 · Membership · Identity V2 · 프런트 접근까지 같은 표로 연결했다.

---

## 2. Migration 불필요 근거 (중지 조건 판정)

WO §5 는 "DB migration 이 필요하면 중지" 를 조건으로 뒀다. 아래 근거로 **필요 없음**을 확정했다.

| 축 | 실측 | 판정 |
|---|---|---|
| `role_assignments.role` | `varchar(50)` — enum · CHECK 제약 없음 | 새 role 문자열 저장에 스키마 변경 불필요 |
| `isValidRole` (`users.routes.ts`) | `service:role` 형태 허용 정규식 | `pharmacy-hub:admin` 이미 통과 |
| `roleAssignmentService.assignRole` | role 값 화이트리스트 검증 없음 | 등록 경로 변경 불필요 |
| scope guard 2계층 | `user.roles` + JWT membership 만 조회 | `roles` 카탈로그 테이블을 **읽지 않는다** |

### 남은 1건 — 승인 요청 (미실행)

`roles` 카탈로그 테이블에는 Pharmacy-Hub 3역할(operator / store_owner / supplier)만 seed 돼 있다
(`20270216000000-SeedPharmacyHubServiceAndRoles.ts`). 여기에 `pharmacy-hub:admin` 행을 넣으려면
**데이터 seed migration** 이 필요하므로 WO §5 중지 조건에 해당한다 → **작성하지 않았다.**

- 영향 범위: `RoleController` 의 할당 가능 역할 목록 · `MembershipConsoleController` 표시용 카탈로그.
- 인증/인가에는 영향 없음 — 위 표대로 어떤 guard 도 이 테이블을 참조하지 않는다.
- 본 WO 의 검증 항목 중 이 행에 의존하는 것은 없다.
- 별도 승인 후 처리 대상으로 남긴다.

---

## 3. 변경 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/middleware/pharmacy-hub-scope.middleware.ts` | `allowedRoles` 에 admin 추가 + `scopeRoleMapping` 4 scope **전부 명시** |
| `apps/api-server/src/types/roles.ts` | `PharmacyHubRole` union 에 admin · `ROLE_REGISTRY` 항목 추가 |
| `apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts` | `GET /admin/ping` 을 smoke 용으로 추가했다가 **smoke 완료 후 제거** (주석만 잔류) |
| `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` | Pharmacy-Hub 카탈로그에 Admin · Operator 제공 |
| `services/web-pharmacy-hub/src/config/service.ts` | `ROLES.admin` · `ROLE_SCOPE_MAPPING` · `satisfiesRole()` (프런트 SSOT) |
| `services/web-pharmacy-hub/src/pages/RoleEntryPage.tsx` | `roles.includes()` → `satisfiesRole()` 계층 판정 |
| `docs/rbac/RBAC-ROLE-CATALOG-V1.md` | Pharmacy-Hub 4역할 등재 + Admin ⊃ Operator 계층 절 |
| `apps/api-server/src/__tests__/security/pharmacy-hub-scope-guard.spec.ts` | **신규** 계층 고정 테스트 |
| `apps/admin-dashboard/src/tests/operators-service-password.test.ts` | 뒤집힌 계약(“admin 없음”) 교체 |

### 새 관리 화면은 만들지 않았다

WO 실행 6번("Admin 전용으로 분리할 현재 기능이 있으면 코드 근거로 최소 범위만") 판정:
현재 Pharmacy-Hub 에 Admin 전용으로 떼어낼 기능이 **없다**. 따라서 새 화면을 만들지 않고,
계층이 실제로 작동함을 관측할 수 있는 `GET /api/v1/pharmacy-hub/admin/ping` 하나만 임시로 두었다.
프로덕션 실측(§6-2)이 끝난 뒤 **이 route 는 제거했다** — 계층 보존은 자동 테스트가 담당한다(§5).
결과적으로 본 WO 가 프로덕션에 추가한 endpoint 는 **0건**이다.

### 관측 사항 (변경하지 않음)

`packages/store-ui-core/src/auth/StoreOwnerGuard.tsx:79` 는 역할 도입 **이전부터** `admin: 'pharmacy-hub:admin'`
을 참조하고 있었다(존재하지 않는 역할을 가리키던 상태). 이번에 역할이 생기며 모순이 해소됐다.
해당 파일은 4서비스 공유 + F3 Freeze 대상이라 손대지 않았다. 이 컴포넌트는 **매장 shell UI 노출**만 열며,
backend 는 여전히 `store_owner` scope 를 요구하므로 admin 이 매장 API 를 얻지는 않는다.

---

## 4. 권한 표 (확정)

| 요구 scope | 통과 역할 |
|---|---|
| `pharmacy-hub:admin` | admin |
| `pharmacy-hub:operator` | operator, admin |
| `pharmacy-hub:store_owner` | store_owner |
| `pharmacy-hub:supplier` | supplier |

`platformBypass: true` 는 기존 설정 그대로 — `platform:super_admin` 은 모든 scope 통과.

---

## 5. 자동 검증 결과

| 항목 | 명령 | 결과 |
|---|---|---|
| 신규 scope guard 계층 테스트 | `jest src/__tests__/security/pharmacy-hub-scope-guard.spec.ts` | **PASS** 24 tests (계층 · 사업자역할 비포괄 · **타서비스 양방향 거부** · config 계약) |
| 보안 테스트 전체 회귀 | `jest src/__tests__/security` | **PASS** 13 suites / 296 tests (`/admin/ping` 제거 후 재실행) |
| Pharmacy-Hub 기타 테스트 | `jest .../pharmacy-hub-cart-checkout .../pharmacy-hub` | **PASS** 2 suites / 41 tests |
| 등록 화면 계약 | `vitest run src/tests/operators-service-password.test.ts` | **PASS** 24 tests |
| typecheck | api-server `tsc --noEmit` · admin-dashboard `tsc --noEmit` | **PASS** |
| build | api-server · admin-dashboard · web-pharmacy-hub (`tsc -b && vite build`) | **PASS** |

> web-pharmacy-hub 최초 실행 시 `@o4o/auth-react` 등 workspace 링크가 로컬 `node_modules` 에 없어 실패했다.
> `git stash` 로 HEAD 에서도 동일 실패함을 확인해 **본 변경과 무관한 로컬 환경 문제**로 판정,
> `pnpm install --frozen-lockfile` 로 복구했다. **lockfile · package.json 변경 0건.**

---

## 6. 브라우저 smoke

> 자격증명은 `docs/local/TEST-ACCOUNTS.local.md` (gitignored) 가 SSOT 다.
> **본 문서에 아이디·비밀번호를 기록하지 않는다.**

배포: `Deploy API Server` · `Deploy Admin Dashboard` · `Deploy Web Services` 3종 모두 **success** (commit `c0de0d814`).

### 6-1. 실측 결과

| # | 항목 | 방식 | 결과 |
|---|---|---|---|
| 1 | `/operators` 등록 모달 — Pharmacy-Hub 선택 시 Admin · Operator 두 역할 노출 | 실브라우저 | **PASS** — `Admin / Pharmacy-Hub 관리자 (운영 권한 포함) / pharmacy-hub:admin` + `Operator / pharmacy-hub:operator`, 하단 `service key: pharmacy-hub` |
| 5 | Operator 계정 → `GET /pharmacy-hub/admin/ping` | 프로덕션 API | **PASS 403** `Required scope: pharmacy-hub:admin` |
| 5-b | Operator 계정 → `GET /pharmacy-hub/operator/ping` | 프로덕션 API | **PASS 200** `{scope:"pharmacy-hub:operator"}` (회귀 없음) |
| 6 | `pharmacy-hub:store_owner` 계정 → operator · admin route | 프로덕션 API | **PASS 403 / 403** |
| 7 | 타 서비스 역할만 보유(`kpa:store_owner`·`glycopharm:store_owner`·`cosmetics:store_owner`) → pharmacy-hub scope | 프로덕션 API | **PASS 403** |
| 9 | Operator 계정 → `pharmacyhub.co.kr/operator` 진입 (`satisfiesRole` 교체 후 회귀) | 실브라우저 | **PASS** — "이 역할 진입 권한이 확인되었습니다", console error **0건** |
| 9-b | `/admin` 프런트 route | 실브라우저 | **없음 → 홈 리다이렉트** (의도대로 — 새 관리 화면을 만들지 않았다) |
| 8 | 타 서비스 membership · credential 불변 | — | **PASS (자명)** — 이번 smoke 에서 프로덕션 write 를 한 건도 수행하지 않았다 |

### 6-2. Admin 계정 실측 (2026-08-10, 사용자가 등록 완료 후)

`pharmacy-hub:admin` 이 실제 계정에 부여됐다(`role_assignments` active, 2026-08-10 06:12 UTC).
아래는 그 계정으로 수행한 프로덕션 실측 10항목이다. **모두 PASS.**

| # | 검증 | 방식 | 결과 |
|---|---|---|---|
| 1 | `serviceKey='pharmacy-hub'` 로 Admin 로그인 | 프로덕션 API | **PASS 200** |
| 2 | 응답 `roles` 에 `pharmacy-hub:admin` 포함 | 프로덕션 API | **PASS** — `pharmacy-hub:admin` · `pharmacy-hub:operator` 동시 보유 |
| 3 | Pharmacy-Hub Membership active | DB read-only + 화면 | **PASS** — `service_memberships.status='active'`, 홈에 "서비스 가입 상태: active" |
| 4 | service credential(L2) 기반 인증 | DB read-only | **PASS** — `service_credentials(user, 'pharmacy-hub')` 행 존재, `password_hash ≠ users.password` (별도 credential). `serviceKey='kpa'` 로는 `SERVICE_NOT_MEMBER` 로 분리 확인 |
| 5 | Operator 기본 화면 + **실제** Operator 보호 route | 실브라우저 + API | **PASS** — `/operator` 진입, `/operator/memberships` 승인 콘솔 정상 렌더, `GET /pharmacy-hub/operator/memberships` **200** |
| 6 | Admin scope 접근 | 프로덕션 API | **PASS 200** `GET /pharmacy-hub/admin/ping` → `{scope:"pharmacy-hub:admin"}` (같은 계정 operator 만 있을 때는 403 이었다 — §6-1 #5) |
| 7 | Store Owner · Supplier 권한 자동 획득 없음 | 프로덕션 API + 실브라우저 | **PASS 403 / 403** — `/store-owner/ping` · `/store-owner/info` · `/supplier/ping` 전부 `Required scope: …`. `/store` 프런트 진입점도 홈 리다이렉트 |
| 8 | 타 서비스 Admin · Operator route 거부 | **자동 테스트** | **PASS** — 아래 주 참조 |
| 9 | 로그아웃 후 보호 route 재차단 | 실브라우저 | **PASS** — 로그인 전·로그아웃 후 모두 `/operator` 가 "로그인이 필요합니다" |
| 10 | 콘솔 오류 · 실패 API | 실브라우저 | **PASS** — console error **0건**, 4xx/5xx API **0건** |

> **8번을 자동 테스트로 판정한 이유**: `pharmacy-hub:admin` 을 부여받은 계정은
> `kpa:admin` · `neture:admin` · `glycopharm:admin` · `cosmetics:admin` 을 **원래부터** 보유한다.
> 따라서 "pharmacy-hub:admin 이 타 서비스를 열지 않는다" 는 이 계정으로 격리 관측이 **불가능**하다
> (타 서비스 route 200 은 pharmacy-hub 역할이 아니라 자기 서비스 역할로 통과한 것이다).
> 이 방향은 `pharmacy-hub-scope-guard.spec.ts` 가 KPA · Neture · GlycoPharm · K-Cosmetics 4개 config 를
> 직접 불러 `pharmacy-hub:admin` 단독 보유 시 admin · operator scope 8건이 모두 403 임을 고정한다.
> 역방향(타 서비스 admin → pharmacy-hub scope 403)은 §6-1 #7 로 실측했다.

**마감 조치**: 10항목 PASS 확인 후 관측용 `GET /pharmacy-hub/admin/ping` 을 **제거**했다.

### 6-3. 프로덕션 상태 (read-only 조회)

| 축 | smoke 이전 | 현재 |
|---|---|---|
| `role_assignments` (active, `pharmacy-hub:%`) | operator 1 · store_owner 2 · admin 0 | operator 1 · store_owner 2 · **admin 1** |
| `service_memberships` (`pharmacy-hub`) | 3 | 3 |
| `roles` 카탈로그 | operator · store_owner · supplier | 동일 (**admin 없음** — §2 별도 WO) |

> `pharmacy-hub:admin` 부여는 **사용자가 직접 수행**했다. 본 세션은 프로덕션 write 를 한 건도 하지 않았다.
> 계정 아이디·비밀번호는 본 문서에 기록하지 않는다 — SSOT 는 `docs/local/TEST-ACCOUNTS.local.md` (gitignored).

### 6-4. `/admin/ping` 제거 후 재배포 · 재smoke

`Deploy API Server (Cloud Run)` **success** (commit `c5e8bbf98`).

| 항목 | 결과 |
|---|---|
| `GET /pharmacy-hub/admin/ping` | **404** (제거 확인) |
| `GET /pharmacy-hub/operator/ping` | **200** (회귀 없음) |
| `GET /pharmacy-hub/operator/memberships` (실 Operator 기능) | **200** |
| `GET /pharmacy-hub/store-owner/ping` | **403** (사업자 신분 비포괄 유지) |
| 실브라우저 `/operator` · `/operator/memberships` | 정상 렌더 · console error 0 · 실패 API 0 |
| 로그아웃 후 `/operator` | 재차단 |

---

## 7. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건

- `docs/rbac/RBAC-ROLE-CATALOG-V1.md` 에 Pharmacy-Hub 접두어가 누락돼 있었다 → 본 WO 범위 내에서 등재했다.
- **별도 WO 제안**: GlycoPharm 은 `scopeRoleMapping` 이 없어 admin/operator 가 fallback(allowedRoles 전체 허용)
  으로 평가된다. 본 WO 에 섞지 않고 별도 정비 대상으로 남긴다.
