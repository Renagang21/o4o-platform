# WO-O4O-ADMIN-MENU-ROUTE-BACKEND-ACCESS-ALIGNMENT-V1 — CHECK

> **선행**: `WO-O4O-ADMIN-AUTHORIZATION-ROLE-ROUTE-API-CONSISTENCY-AUDIT-V1`(판정 `CRITICAL_ACCESS_RISK`) ·
> `WO-O4O-SERVICE-ADMIN-API-GUARD-EMERGENCY-V1` · `WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1` ·
> `WO-O4O-ADMIN-API-GUARD-REGRESSION-TEST-V1` · `WO-O4O-ADMIN-PROTECTED-ROUTE-ROLE-PERMISSION-SEMANTICS-V1`
> **일자**: 2026-08-04 · branch `main`
> **9단계 후속 순서 중 5번** (메뉴 권한 선언 정비)

**최종 판정: `PASS_WITH_BOUNDARY_FOLLOWUP`**

---

## 1. 이 작업의 정의

관리자 화면의 접근 조건은 세 계층에 **각각** 선언된다.

| 계층 | 질문 | 선언 위치 |
|---|---|---|
| 메뉴 | 어떤 사용자에게 항목이 **보이는가** | `config/rolePermissions.ts` |
| 프런트 route | 직접 URL 접근 시 누가 **통과하는가** | `routes/*.routes.tsx` |
| 백엔드 endpoint | 실제 요청을 누가 **실행할 수 있는가** | api-server guard 상수 |

셋이 갈라지면 두 방향으로 고장난다. **메뉴만 엄격하면** 권한이 있는 사용자가 기능을 찾지 못하고,
**메뉴만 느슨하면** 클릭 후 403 이 뜬다. 메뉴는 보안 경계가 아니라 **실제 접근권을 반영하는 탐색 장치**다.

---

## 2. 전수 대조 결과

기계적 추출로 전수 비교했다 (메뉴 **59건**(path 보유 48) · route 선언 **222건** · 백엔드 guard 상수).

### 2-1. 게이트 없는 메뉴 44건은 결함이 아니다

`App.tsx:186` 이 관리자 대시보드 **전체**를 `requiredRoles={['admin']}` 로 감싼다.
따라서 개별 게이트가 없는 메뉴도 이미 관리자급으로 좁혀져 있고, 대응 route 역시 `['admin']` 계열이다.
**메뉴 무게이트 ≠ 무제한**이므로 이 44건에는 손대지 않았다(원칙 6 — 셸 게이트 미축소).

### 2-2. 실제 불일치는 "백엔드가 셸보다 좁은" 두 영역뿐이다

| | 회원 관리 (`/admin/membership/*` 6화면) | 사용자 관리 (`/users` 5화면) |
|---|---|---|
| **변경 전 메뉴** | 분류 1건만 게이트, `admin`·`super_admin` 포함<br>나머지 3건 무게이트 | `super_admin`·`platform:super_admin` |
| **변경 전 route** | `requiredPermissions` 만 (= 사실상 관리자급 전원 통과) | `requiredPermissions` 만 (동일) |
| **백엔드** | `MEMBERSHIP_ADMIN_ROLES` = `platform:admin`·`platform:super_admin` | `ADMIN_ROLES` = 동일 |

확정된 불일치 2종:

- **원칙 3 위반 (메뉴만 느슨)** — `admin`·`super_admin` 에게 회원 관리 메뉴 4건이 보이지만 API 는 **403**.
  선행 WO 가 "backend 판정에 따름" 으로 유보하고 나머지 3건은 범위 제외했던 부분이다.
- **원칙 2 위반 (숨겨도 안 막힘)** — `core-users` 는 `platform:admin` 에게 메뉴를 **숨기는데 백엔드는 허용**하고,
  반대로 메뉴에서 숨긴 대상이 URL 직접 접근하면 route 는 **그대로 렌더**했다.
  route 가 `requiredPermissions` 만 선언했고, `user.permissions` 를 백엔드가 공급하지 않아
  permission 검사가 "관리자급이면 통과" 로 되돌아가기 때문이다(선행 WO §3).

### 2-3. 선언 카테고리 오류 6건

| 위치 | 문제 |
|---|---|
| `platform.routes.tsx` 4건 (`/monitoring`, `/monitoring/performance`, `/monitoring/security`, `/admin/dashboard/operations`) | 역할 문자열 `'admin'` 을 **`requiredPermissions` 자리**에 선언 |
| `test.routes.tsx` 1건 (`/ui-showcase`) | 동일 |
| `dashboard.routes.tsx` (`service-content-manager`) | RBAC 카탈로그 **금지 표기** `platform_admin`(underscore) — 어떤 역할과도 영구히 불일치 |

앞의 5건은 지금은 무해하지만(permission 미공급 → 역할 게이트로 fallback),
**permission 공급이 시작되는 순간 그 화면은 아무도 못 들어간다** — `admin` 이라는 이름의 permission 은 존재하지 않기 때문이다.

---

## 3. 수정 내용

### 3-1. 경계 상수 단일화

```ts
// config/rolePermissions.ts
export const PLATFORM_ADMIN_ROLES = ['platform:admin', 'platform:super_admin'] as const;
```

정책을 새로 만든 것이 아니라 **이미 배포된 백엔드 guard 상수를 복제**한 것이다.
메뉴와 route 가 이 값을 함께 참조하므로 두 계층이 서로 갈라질 수 없다.

### 3-2. 세 계층 정렬

| 화면 | 메뉴 | route |
|---|---|---|
| `core-users` → `/users` 외 4 | `PLATFORM_ADMIN_ROLES` | `requiredRoles={[...PLATFORM_ADMIN_ROLES]}` 추가 |
| `core-membership` · `-members` · `-verifications` · `-categories` → `/admin/membership/*` 6 | `PLATFORM_ADMIN_ROLES` (3건은 게이트 신규) | 동일 |

**`requiredPermissions` 선언은 지우지 않고 그대로 뒀다.** 지금은 역할 게이트가 판정을 지배하고,
나중에 permission 이 공급되면 자동으로 AND 조건으로 승격된다(원칙 8 — permission 공급은 별도 WO).

### 3-3. 공용 판정 모듈 — "platform 한정" 을 선언할 수 있게

`packages/auth-context/src/adminRouteAccess.ts` 두 곳. **이것이 없으면 3-2 가 성립하지 않는다.**

| 문제 | 수정 |
|---|---|
| `expandRequiredRoles` 가 `platform:admin` 이 들어 있기만 해도 legacy `super_admin`·`operator` 까지 되넓혔다. 방향이 거꾸로다 — **좁히려는 선언이 도로 넓어져** platform 한정을 선언할 방법 자체가 없었다 | `platform:admin` 확장 트리거 제거 (`admin` 트리거는 유지) |
| 서비스 접두 역할 수용 집합(`ADMIN_LEVEL_ROLES`)에 `platform:*` 이 포함돼, platform 한정 선언에도 `kpa:admin` 이 통과했다 (백엔드는 403) | `SERVICE_PREFIX_ACCEPTING_ROLES` (= `platform:*` 제외) 신설해 그쪽만 사용 |

**잠김 회귀가 없는 근거 (전수 확인):** `platform:admin` 을 포함하면서 `admin` 을 포함하지 않는 route 선언은
**저장소 전역 0건**이다. `admin` 을 포함하는 기존 선언은 확장·서비스 접두 수용이 모두 그대로다.
즉 기존 선언 168건의 판정 결과는 **하나도 바뀌지 않는다.**

### 3-4. 선언 카테고리 오류 6건 교정

`requiredPermissions={['admin']}` → `requiredRoles={['admin']}` (5건) · `platform_admin` → `platform:admin` (1건).
모두 오늘 동작은 동일하고, 미래의 잠김·영구 dead 선언을 제거한다.

---

## 4. 검증 — 변이(mutation) 로 실패를 실증

| 단계 | 결과 |
|---|---|
| 신규 `admin-menu-route-backend-alignment.test.ts` | **24 pass** |
| **변이 ①** `platform:admin` 확장 트리거 복원 | **5 fail** — `super_admin`·`operator`·`kpa:admin`·`neture:operator` 가 통과하게 되고 "되넓혀지지 않는다" 실패 |
| **변이 ②** `core-membership-members` 메뉴 게이트 제거 | **1 fail** — "메뉴 게이트가 없다 — 무게이트면 모든 관리자에게 보인다" |
| **변이 ③** 백엔드 `MEMBERSHIP_ADMIN_ROLES` 에 `super_admin` 추가 | **1 fail** — 계층 3 대조 실패 (프런트가 조용히 뒤처지지 않는다) |
| 변이 3건 원복 후 | 전부 pass · `git diff -- apps/api-server/` **0** |
| admin-dashboard 전체 | **12 suites / 220 tests 전부 pass** |
| `@o4o/auth-context` 타입체크·빌드 | `tsc --noEmit` **error 0** · build 성공(dist 갱신 — 앱이 alias 로 dist 참조) |
| `apps/admin-dashboard` 타입체크 | 내 변경 파일 **error 0**. `packages/operator-ux-core` 2건(`LucideIcon` namespace)은 **선행 존재**하며 이 WO 와 무관 |

### 테스트가 고정하는 것

1. **백엔드 상수를 api-server 소스에서 직접 읽어 대조** — 백엔드가 경계를 바꾸면 이 테스트가 먼저 깨진다
2. 5개 화면의 메뉴 게이트 == route 게이트 == 백엔드 경계
3. `platform:admin`·`platform:super_admin` 은 메뉴도 보이고 route 도 통과
4. `admin`·`super_admin`·`operator`·`kpa:admin`·`neture:operator`·`user` 는 **메뉴도 안 보이고 route 도 통과 못 함**
5. 기존 `['admin']` 선언은 계층 확장·서비스 접두 수용 유지 (잠김 회귀 방지)
6. 역할 문자열이 `requiredPermissions` 자리에 들어가지 않음 · 금지 표기 미사용

표기를 못 읽으면 **실패**한다(통과로 넘기지 않는다) — 선행 WO 의 정적 분석 테스트 원칙과 동일.

---

## 5. 눈에 보이는 변화 — 정직하게

이번 정렬로 `admin`·`super_admin` 역할 보유자는 **회원 관리·사용자 관리 화면 자체에 들어가지 못한다.**
기존에는 화면은 열리되 데이터가 403 이었으므로 **실제로 쓸 수 있던 기능은 없고**, 사라지는 것은
"열리지만 아무것도 못 하는 화면" 이다. 그래도 체감상 후퇴로 보일 수 있어 명시해 둔다.

이 결과는 **백엔드 경계가 옳다는 전제**에 의존한다. 그 전제 자체가 §6 의 후속 과제다.

---

## 6. 범위 밖으로 남긴 것 (수정하지 않음, 기록만)

| 항목 | 내용 | 귀속 |
|---|---|---|
| **백엔드 경계 자체의 타당성** | `ADMIN_ROLES`·`MEMBERSHIP_ADMIN_ROLES` 가 `platform:admin` 을 쓰는데, `RBAC-ROLE-CATALOG-V1` 은 **unprefixed `admin`·`super_admin` 을 canonical** 로 두고 `platform:*` 중 **`platform:super_admin` 만 활성**으로 명시한다. 즉 백엔드가 canonical 관리자 역할을 제외하고 카탈로그가 활성으로 인정하지 않는 역할을 요구하고 있을 가능성이 있다. **이 WO 는 계층 간 불일치만 제거하고 경계는 옮기지 않았다** | 6번 |
| **주석과 코드 불일치** | `routes/admin/users.routes.ts:85` 주석이 "legacy super_admin / admin + platform:super_admin / platform:admin 모두 허용" 이라고 적혀 있으나 실제 `ADMIN_ROLES` 는 platform 2종뿐 | 6번 |
| **실제 역할 보유 현황** | `platform:admin`·`platform:super_admin` 을 보유한 계정이 실재하는지 미확인. 선행 WO 들에서 확인된 대로 **사용 가능한 테스트 계정 3개는 모두 403** 이다. 운영 DB 역할 census 는 수행하지 않았다 | 8번 |
| `/enrollments` · `/admin/enrollments` · `/admin/role-applications` | `users:update` permission 만 선언. 메뉴 항목이 아니고 소비 백엔드가 달라 이번 정렬 대상에서 제외 | 6번 |
| permission 공급 | 백엔드가 `user.permissions` 를 채우는 작업. 그때 88건 선언이 자동 활성화되므로 **선언 내용 감사**가 선행돼야 한다 | 별도 WO |
| `App.tsx:186` 셸 게이트 | 축소하지 않았다 — 축소 시 `requireServiceLegalScope('operator')` 를 쓰는 KCos·GlycoPharm 서비스 운영자가 잠긴다 | 원칙 6·7 |

---

## 7. 안전성

| 항목 | 값 |
|---|---:|
| 프로덕션 요청 (읽기·쓰기) | **0** |
| 운영 DB 접근 · 직접 SQL · migration | **0** |
| 백엔드 코드 변경 | **0** (변이 ③ 후 `git diff -- apps/api-server/` 로 확인) |
| 자격증명·토큰 출력 · 테스트 계정 사용 | **0** |
| 다른 세션 파일 접촉 | **0** — 착수 전 `git status` 로 타 세션 WIP 4건 확인, commit 은 내 파일 정확 pathspec |
| `pnpm-lock.yaml` | 미변경 (타 세션 WIP, 건드리지 않음) |

---

## 8. 최종 판정 — `PASS_WITH_BOUNDARY_FOLLOWUP`

| 요구 (사용자 제시 8원칙) | 결과 |
|---|:--:|
| 1 메뉴 표시 조건과 route 접근 조건 전수 대조 | ✅ 메뉴 59 · route 222 · 백엔드 상수 |
| 2 메뉴가 숨겨져도 URL 직접 접근은 route 가 차단 | ✅ 11화면에 실제 역할 경계 선언 |
| 3 메뉴는 보이는데 거부되는 불일치 우선 제거 | ✅ 회원 관리 4메뉴 |
| 4 `seller`·`supplier` 를 관리자급으로 치환하지 않음 | ✅ 비관리자 선언 미변경 |
| 5 미공급 `user.permissions` 만으로 메뉴를 숨기지 않음 | ✅ 메뉴 게이트는 역할만 사용 |
| 6 `App.tsx` 셸 `['admin']` 미축소 | ✅ |
| 7 `requireServiceLegalScope('operator')` 주체 미잠금 | ✅ 셸·서비스 route 미변경 |
| 8 권한 데이터 공급·인증 응답 변경은 별도 WO | ✅ `requiredPermissions` 선언 보존만 |
| 회귀 테스트 + **변이 3종으로 실패 실증** | ✅ |

### `PASS` 가 아닌 이유

세 계층을 **서로 일치**시켰으나, 그 일치점이 **옳은 경계인지**는 확정하지 못했다.
백엔드가 RBAC 카탈로그의 canonical `admin`·`super_admin` 을 제외하고 있고,
그 역할을 실제로 보유한 계정이 존재하는지도 확인되지 않았다(테스트 계정 3개 모두 403).
경계를 옮기는 판단은 6번·8번 과제이며, 이 WO 는 **불일치 제거까지만** 수행했다.
