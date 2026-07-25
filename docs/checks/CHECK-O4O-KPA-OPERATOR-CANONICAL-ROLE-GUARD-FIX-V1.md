# CHECK-O4O-KPA-OPERATOR-CANONICAL-ROLE-GUARD-FIX-V1

WO: `WO-O4O-KPA-OPERATOR-CANONICAL-ROLE-GUARD-FIX-V1`
선행: `CHECK-O4O-KPA-SERVICE-OPERATOR-MANAGEMENT-INFORMATION-AUDIT-V1 §6-A` (미수정으로 남긴 항목)
일시: 2026-07-25 (KST) · 대상: `apps/api-server` Operator Console 공용 라우터

---

## 1. 잘못된 역할 키가 만들어진 원인

**canonical service_key 를 role prefix 자리에 사용한 표기 혼용**이다.

O4O 는 두 축의 식별자를 쓴다.

| 축 | KPA 값 | 사용처 |
|----|--------|--------|
| role prefix | `kpa` | `role_assignments.role` = `kpa:admin`, `kpa:operator` |
| canonical service_key | `kpa-society` | `service_memberships.service_key`, SQL 필터 |

두 값의 변환은 `@o4o/security-core` 의 `ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY` (`kpa: 'kpa-society'`) 가 SSOT 다.
Operator Console guard 목록은 **role 문자열**을 요구하는데, KPA 항목만 service_key 쪽 값(`kpa-society:*`)으로 적혀 있었다.

- `requireRole` → `roleAssignmentService.hasAnyRole` 는 **정확 문자열 매칭**이며 prefix 정규화가 없다 (`common/middleware/auth/authorization.middleware.ts:99`).
- 역할 카탈로그에 `kpa-society:*` 는 **0건** (프로덕션 실측 39개 역할 중 KPA 는 `kpa:` 8종).
- 결과: 문자열이 어떤 사용자와도 매칭되지 않아 **순수 `kpa:admin` / `kpa:operator` 는 Operator Console API 전면 403**.

동일 결함이 K-Cosmetics 에도 있었고(`k-cosmetics:*`), commit `6b586fb06`
(`WO-O4O-KCOS-ROLE-PREFIX-CANONICALIZATION-V1`) 에서 `cosmetics:*` 로 선행 정정되었다.
그 커밋이 cosmetics 줄만 고치면서 **바로 아래 줄의 KPA 쌍이 남은 것**이 직접 원인이다.

## 2. 수정한 가드와 canonical 역할

`'kpa-society:admin', 'kpa-society:operator'` → `'kpa:admin', 'kpa:operator'` (5개 파일, 각 1줄)

| 파일 | 라인 | 라우터 |
|------|------|--------|
| `apps/api-server/src/routes/operator/analytics.routes.ts` | 29 | `/api/v1/operator/analytics/*` |
| `apps/api-server/src/routes/operator/membership.routes.ts` | 26 | `/api/v1/operator/members/*` |
| `apps/api-server/src/routes/operator/products.routes.ts` | 24 | `/api/v1/operator/products/*` |
| `apps/api-server/src/routes/operator/roles.routes.ts` | 24 | `/api/v1/operator/roles/*` |
| `apps/api-server/src/routes/operator/stores.routes.ts` | 28 | `/api/v1/operator/stores/*` |

- 선행 CHECK §6-A 는 `membership` / `roles` 2개만 지목했으나, 실제로는 **동일 패턴이 5개 전부**에 있었다.
  2개만 고치면 같은 잠복 결함이 3개 남으므로 5개를 함께 정합화했다.
- canonical 근거: `packages/security-core/src/service-configs.ts` — KPA 서비스 역할은 `kpa:admin` / `kpa:operator` 만 존재.

### 함께 정리한 stale 주석

`roles.routes.ts` 헤더에 조회/CUD 경계를 명시했다. 기존 공통 컴포넌트 주석의
"Admin만 CUD 가능, operator는 조회만" 은 실제 계약(**platform admin 전용 CUD**)과 어긋나 오해 소지가 있었다.

## 3. operator / admin 별 허용·차단 결과

`requireRole` 통과 후에도 controller 계층 가드가 그대로 남으므로, 실 허용 범위는 다음과 같다.

| 대상 | 수정 전 | 수정 후 |
|------|---------|---------|
| `kpa:operator` | 전 endpoint **403** | kpa-society scope 내 조회 + 회원 운영(승인/반려/상태/복구) |
| `kpa:admin` | 전 endpoint **403** | 위와 동일 + `isAdminRole` 부여 가능 범위는 여전히 제한(§4) |
| `kpa:admin` 의 역할 카탈로그 CUD | 403 | **여전히 403** (`scope.isPlatformAdmin` 전용) |
| `platform:admin` / `platform:super_admin` | 전 범위 | **무변경** |
| 타 서비스 사용자 | — | **무변경** |

**cross-service 격리 유지 확인** — `MembershipConsoleController` 는 non-platform-admin 의 모든
변경 경로에서 `checkServiceBoundary(userId, scope.serviceKeys)` 로 대상 사용자의 소속을 먼저 확인한다
(라인 269 / 509 / 642 / 757 / 829 / 1117). `kpa:operator` 의 `scope.serviceKeys` 는
`extractServiceScope(['kpa:operator'])` → `['kpa-society']` 이므로 **타 서비스 회원은 조회·변경 불가**다.
hard delete 는 `scope.isPlatformAdmin` 전용(라인 1025)으로 유지된다.

## 4. 자기 권한 상승 및 플랫폼 전용 CUD 차단 유지

두 가드 모두 **본 WO 에서 건드리지 않았고**, 코드 경로로 유지를 확인했다.

| 통제 | 위치 | 상태 |
|------|------|:---:|
| 운영자·관리자 tier 부여 차단 | `MembershipConsoleController:1135` — `!isPlatformAdmin && (roleEntity.isAdminRole \|\| roleEntity.roleKey === 'operator')` → 403 `ROLE_ASSIGNMENT_PLATFORM_ADMIN_ONLY` | 유지 |
| 역할 카탈로그 CUD | `RoleController.createRole/updateRole/deleteRole` — `!scope.isPlatformAdmin` → 403 | 유지 |
| 타 서비스 역할 부여 차단 | `MembershipConsoleController:1127` scope 검사 | 유지 |

카탈로그 실측상 `kpa:admin` 은 `isAdminRole=true`, `kpa:operator` 는 `roleKey='operator'` 이므로
**KPA 관리자·운영자는 서로를(그리고 자신을) 운영자·관리자로 임명할 수 없다.** 자기 권한 상승 경로 0.

## 5. 타 서비스 무회귀

- diff 의 역할 문자열 변경은 `-kpa-society:* / +kpa:*` **5쌍이 전부**다
  (`git diff | grep -E "^[-+]\s+'kpa"` → 10줄, 그 외 role 문자열 증감 0).
- `neture:*`, `glycopharm:*`, `cosmetics:*`, `platform:*` 항목 무변경.
- `roles.routes.ts` 의 legacy unprefixed `'admin','super_admin','operator','manager'` 는
  타 서비스 접근에 영향을 주므로 **본 WO 범위 밖으로 두고 건드리지 않았다**(§8 관찰 1).
- frontend / DB / migration 변경 0.

## 6. typecheck · build · 배포 · 인증 smoke

| 항목 | 결과 |
|------|:---:|
| `tsc --noEmit` (@o4o/api-server) | 변경 전 13건 = 변경 후 13건 — **신규 오류 0** |
| 위 13건의 출처 | 전부 `src/scripts/*` (병행 세션 WIP, 본 WO 무관). `routes/operator` 오류 0 |
| `pnpm --filter @o4o/api-server run build` (`tsconfig.build.json`) | **PASS** |
| 배포 workflow | (아래 §6-1) |

typecheck 기준선 비교는 변경분을 `git stash` 후 재측정해 동일 13건임을 확인하는 방식으로 수행했다.

### 6-1. 배포

| 항목 | 값 |
|------|-----|
| workflow | `Deploy API Server (Cloud Run)` run `30150687622` — conclusion **success** |
| job | `build-and-deploy` success |
| Cloud Run revision | `o4o-core-api-02887-7bm` (traffic 100%) |
| 배포 image | `…/o4o-api/api-server:e84e8cd2db1c60699e1d28b63fc2ef4e9f81f148` |
| commit 일치 | **PASS** — image tag = commit `e84e8cd2d` |

### 6-2. 인증 브라우저 smoke

배포 후 프로덕션(`https://kpa-society.co.kr`) 인증 세션에서 수행. **전부 read-only — write 0건.**

수정한 5개 라우터 전수 (serviceKey=kpa-society scope):

| 라우터 | 요청 | 결과 |
|--------|------|:---:|
| membership | `GET /api/v1/operator/members?serviceKey=kpa-society` | **200** |
| roles | `GET /api/v1/operator/roles?service=kpa` | **200** |
| stores | `GET /api/v1/operator/stores?serviceKey=kpa-society` | **200** |
| products | `GET /api/v1/operator/products?serviceKey=kpa-society` | **200** |
| analytics | `GET /api/v1/operator/analytics/summary?serviceKey=kpa-society` | **200** |

화면 렌더:

| 화면 | 결과 |
|------|:---:|
| `/operator/roles` | 39행 · 헤더 6개(Actions 포함) · `새 역할 추가` 노출 · 오류 배너 없음 |
| `/operator/members` | 5행 · 컬럼 8개(`추가 권한` 포함) · 오류 배너 없음 |
| `/operator/stores` | `매장 관리` 렌더 · 통계 4종 · 오류 배너 없음 |
| 콘솔 error (세션 전체) | **0건** |

→ 기존 `platform:super_admin` 경로 **무회귀 확인**. 다만 §8 대로 이번 수정의 핵심 효과인
`kpa:*` 전용 계정의 403→200 전환은 계정 부재로 실증하지 못했다.

## 7. 변경 파일과 커밋

| 항목 | 값 |
|------|-----|
| commit | `e84e8cd2d` |
| 변경 파일 | `routes/operator/{analytics,membership,products,roles,stores}.routes.ts` (5) |
| 변경량 | +17 / -5 (역할 문자열 5줄 + 주석) |
| frontend / DB / migration / 신규 역할·계정·테이블 | **0** |

병행 세션의 dirty 파일(`AGENTS.md`, Neture/Codex CHECK, `src/scripts/*` 등)은 stage 하지 않았다.

## 8. 순수 KPA 테스트 계정 필요 여부 — **필요 (검증 한계)**

- 프로덕션에 순수 `kpa:operator` / `kpa:admin` 계정이 **0건**이다. 유일 보유자(`sohae2100`)가
  `platform:super_admin` 겸임이라 `requireRole` 을 platform 항목으로 통과한다.
- 따라서 **이번 수정의 실질 효과(순수 KPA 역할의 403 → 200 전환)는 브라우저 smoke 로 실증할 수 없다.**
  WO 가 계정 생성을 금지하므로 생성하지 않았고, 검증은 아래로 대체했다.
  1. 역할 카탈로그 실측 — `kpa-society:*` 0건 / `kpa:admin`·`kpa:operator` 존재 확인
  2. `requireRole` → `hasAnyRole` 정확 문자열 매칭 코드 경로 확인
  3. controller 계층 scope·tier 가드 유지 확인 (§3 · §4)
  4. 배포 후 기존 계정 기준 무회귀 smoke (§6-2)
- 후속 권고: `kpa:operator` **전용** 검증 계정 발급 후 거부/허용 양방향 스모크.
  (선행 CHECK §5 의 권고와 동일 — 본 수정으로 필요성이 더 커졌다. 수정 효과를 확인할 유일한 수단이다.)

### 관찰 (본 WO 미수정)

| # | 항목 | 사유 |
|---|------|------|
| 1 | `roles.routes.ts` 의 legacy unprefixed `admin/super_admin/operator/manager` 잔존 | 제거 시 타 서비스 접근 축소 — 별도 승인 필요 |
| 2 | `analytics.routes.ts` 에만 `cosmetics:*` 항목 부재 | K-Cos 범위. WO 원칙 "GP·KCos·Neture 가드 그대로 유지" 준수 |
| 3 | 공통 `RoleModal` 의 operator tier 미필터 (선행 CHECK §6-D) | 4개 서비스 공통 컴포넌트 — 범위 밖 |
| 4 | `kpa-society:*` 잔존 **16파일** (Neture product 모듈 15 + o4o-store 1) | 아래 참조 |

**관찰 4 상세.** Operator Console 5개 라우터 외에, Neture product 모듈 컨트롤러 15개와
`routes/o4o-store/controllers/store-product-request-admin.controller.ts` 1개가 같은 dead key
(`kpa-society:admin` / `kpa-society:operator`)를 allowlist 에 갖고 있다. 즉 **KPA 운영자가
Neture 상품 라이브러리 계열 endpoint 에 접근하도록 의도되었으나 동일하게 무효**인 상태다.

본 WO 에서 **수정하지 않았다** — 중지 조건 해당:

- 이 수정은 KPA 역할에 **Neture 상품 도메인 접근권을 신규 부여**하는 것이라, WO 원칙
  "공용 라우터의 타 서비스 동작을 바꾸지 않음" / "GP·KCos·Neture 역할 가드는 그대로 유지" 와
  "타 서비스 역할 계약을 변경하는 경우" 중지 조건에 걸린다.
- Operator Console(§2)은 KPA 자신의 회원·매장·역할 운영 화면이라 성격이 다르다. 반면 Neture
  product 모듈은 도메인 소유자가 Neture 이므로, 접근 범위 판단이 선행되어야 한다.

후속 권고: `WO-O4O-NETURE-PRODUCT-MODULE-KPA-ROLE-PREFIX-DECISION-V1`
— KPA 운영자에게 Neture 상품 endpoint 접근을 실제로 허용할지 **정책 결정 먼저**, 그 다음 prefix 정합화.
