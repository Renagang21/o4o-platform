# CHECK — Pharmacy-Hub Admin 역할 계층 도입

> WO: [`WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1`](../work-orders/WO-PHARMACY-HUB-ADMIN-ROLE-HIERARCHY-V1.md)
> 작성일: 2026-08-10 · 상태: 코드·테스트·배포 완료 / smoke 6항목 PASS · 3항목 자격증명 부재로 차단(§6-2)

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
| `apps/api-server/src/routes/pharmacy-hub/pharmacy-hub.routes.ts` | `GET /admin/ping` — admin scope 관측용 최소 endpoint |
| `apps/admin-dashboard/src/pages/operators/OperatorsPage.tsx` | Pharmacy-Hub 카탈로그에 Admin · Operator 제공 |
| `services/web-pharmacy-hub/src/config/service.ts` | `ROLES.admin` · `ROLE_SCOPE_MAPPING` · `satisfiesRole()` (프런트 SSOT) |
| `services/web-pharmacy-hub/src/pages/RoleEntryPage.tsx` | `roles.includes()` → `satisfiesRole()` 계층 판정 |
| `docs/rbac/RBAC-ROLE-CATALOG-V1.md` | Pharmacy-Hub 4역할 등재 + Admin ⊃ Operator 계층 절 |
| `apps/api-server/src/__tests__/security/pharmacy-hub-scope-guard.spec.ts` | **신규** 계층 고정 테스트 |
| `apps/admin-dashboard/src/tests/operators-service-password.test.ts` | 뒤집힌 계약(“admin 없음”) 교체 |

### 새 관리 화면은 만들지 않았다

WO 실행 6번("Admin 전용으로 분리할 현재 기능이 있으면 코드 근거로 최소 범위만") 판정:
현재 Pharmacy-Hub 에 Admin 전용으로 떼어낼 기능이 **없다**. 따라서 새 화면을 만들지 않고,
계층이 실제로 작동함을 관측할 수 있는 `GET /api/v1/pharmacy-hub/admin/ping` 하나만 추가했다.

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
| 신규 scope guard 계층 테스트 | `jest src/__tests__/security/pharmacy-hub-scope-guard.spec.ts` | **PASS** (계층 · 사업자역할 비포괄 · 타서비스 거부 · config 계약) |
| 보안 테스트 전체 회귀 | `jest src/__tests__/security` | **PASS** 13 suites / 292 tests |
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

### 6-2. 미완료 — 자격증명 부재로 차단 (승인·자료 필요)

| # | 항목 | 상태 |
|---|---|---|
| 2 | Admin 등록 (role assignment + membership + credential 원자 생성) | **BLOCKED** |
| 3 | Admin 로그인 | 2번 선행 필요 |
| 4 | Admin → operator 보호 route 접근 성공 | 2번 선행 필요 |

**차단 사유**: `/operators` 목록·등록 API 는 `platform:super_admin` 을 요구한다.
`docs/local/TEST-ACCOUNTS.local.md` 의 모든 계정에는 이 권한이 없다
(실측: `sohae2100@gmail.com` 로 `/operators` 진입 시 목록 API **403 `Active platform:super_admin role required`**).
프로덕션 `role_assignments` 조회 결과 `platform:super_admin` 보유 계정은 2건이며 **비밀번호가 테스트 계정 문서에 없다.**

DB 에 직접 role assignment 를 넣는 것은 **프로덕션 write** 이므로 승인 없이 수행하지 않았다.

해소 방법은 둘 중 하나다.
1. `platform:super_admin` 계정 자격증명을 테스트 계정 문서에 등록 → 화면으로 정상 등록 (권장 · 등록 경로까지 함께 검증됨)
2. 프로덕션 DB 직접 부여를 승인 (등록 화면 경로는 검증되지 않음)

### 6-3. 현재 프로덕션 상태 (read-only 조회)

| 축 | 값 |
|---|---|
| `role_assignments` (active, `pharmacy-hub:%`) | operator 1 · store_owner 2 · **admin 0** |
| `service_memberships` (`pharmacy-hub`) | 3 |
| `service_credentials` (`pharmacy-hub`) | 10 |
| `roles` 카탈로그 | operator · store_owner · supplier 3행 (**admin 없음** — §2 승인 요청 항목) |

> 테스트 계정 문서 정정 2건을 반영했다(gitignored, 커밋 대상 아님):
> `renagang21@gmail.com` 의 Pharmacy-Hub 비밀번호 실제 값 · admin 행 "미부여" 표기.

---

## 7. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건

- `docs/rbac/RBAC-ROLE-CATALOG-V1.md` 에 Pharmacy-Hub 접두어가 누락돼 있었다 → 본 WO 범위 내에서 등재했다.
- **별도 WO 제안**: GlycoPharm 은 `scopeRoleMapping` 이 없어 admin/operator 가 fallback(allowedRoles 전체 허용)
  으로 평가된다. 본 WO 에 섞지 않고 별도 정비 대상으로 남긴다.
