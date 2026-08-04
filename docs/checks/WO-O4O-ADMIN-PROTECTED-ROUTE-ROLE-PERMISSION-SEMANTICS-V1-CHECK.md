# WO-O4O-ADMIN-PROTECTED-ROUTE-ROLE-PERMISSION-SEMANTICS-V1 — CHECK

> **선행**: `WO-O4O-ADMIN-AUTHORIZATION-ROLE-ROUTE-API-CONSISTENCY-AUDIT-V1`(판정 `CRITICAL_ACCESS_RISK`) §3-2 ·
> `WO-O4O-SERVICE-ADMIN-API-GUARD-EMERGENCY-V1` · `WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1` ·
> `WO-O4O-ADMIN-API-GUARD-REGRESSION-TEST-V1`
> **일자**: 2026-08-04 · branch `main`
> **9단계 후속 순서 중 4번** (AdminProtectedRoute 역할·permission 의미 수정)

**최종 판정: `PASS_WITH_SCOPE_FOLLOWUP`**

---

## 1. 대상 결함 (감사 §3-2)

`packages/auth-context/src/AdminProtectedRoute.tsx` 의 접근 판정 두 곳.

### P2-1 — `requiredRoles` 선언이 무력화된다

```ts
const matchesRole = (role: string): boolean => {
  if (expandedRequiredRoles.includes(role)) return true;
  if (role.includes(':') && (role.endsWith(':admin') || role.endsWith(':operator'))) return true;  // ← 요구 역할과 무관
  return false;
};
```

두 번째 줄이 **요구 역할이 무엇이든** 서비스 접두 관리자 역할을 통과시킨다.
그래서 `requiredRoles={['seller']}` 로 선언된 화면에 `kpa:admin` 이 들어간다. 선언이 사실상 주석이 된다.

### P2-2 — `requiredPermissions` 가 무효 선언

permission 분기는 결국 같은 `*:admin` 역할 검사로 환원된다. 선언된 permission 문자열은 **한 번도 읽히지 않는다.**
저장소 전역 88건의 `requiredPermissions` 선언이 판정에 아무 영향이 없다.

---

## 2. 소비처 전수 (Shared Module Change Rule)

`AdminProtectedRoute` 는 공용 패키지이므로 CLAUDE.md 의 공통 모듈 규칙에 따라 소비처를 먼저 전수했다.

| 항목 | 실측 |
|---|---|
| 소비 앱 | **`apps/admin-dashboard` 단독** (`services/web-*` 소비 없음) |
| 사용 횟수 | `<AdminProtectedRoute` **168건** (15개 route 파일) |
| `requiredPermissions` 선언 | 88건 |

`requiredRoles` 선언 분포(주요):

| 선언 | 건수 | 이번 변경 영향 |
|---|---:|---|
| `['admin']` | 43 | **없음** |
| `['admin','super_admin']` | 12 | **없음** |
| `['admin','super_admin','operator']` | 4 | **없음** |
| `['admin','operator']` · `['supplier','admin']` · `['seller','admin']` · `['partner','admin']` 등 admin 포함 | 다수 | **없음** |
| `['seller']` | 4 | 서비스 접두 관리자 역할이 더는 통과하지 않음 |
| `['supplier']` | 2 | 동일 |
| `['partner','affiliate','seller','supplier']` | 1 | 동일 |

**즉 관리자급 요구 화면의 통과 대상은 전부 그대로다.** 좁아지는 것은 비관리자 전용 선언 7건뿐이며,
그것이 이 WO 가 고치려는 바로 그 지점이다. 기존 관리자 사용자가 잠기는 경로는 없다.

---

## 3. `user.permissions` 실측 — 왜 그대로 강제하면 안 되는가

| 확인 | 결과 |
|---|---|
| 타입 선언 | `packages/auth-context/src/AuthContext.tsx:53` 에 `permissions?: string[]` 존재 |
| 소비 | `CookieAuthProvider.tsx:216` 이 `user.permissions?.includes(...)` 사용 |
| **공급** | `apps/api-server/src/modules/auth/` 전 경로 확인 — **어떤 인증 응답도 `permissions` 를 채우지 않는다** |

따라서 선언된 permission 을 지금 그대로 강제하면 **모든 사용자가 잠긴다.**
permission 공급 체계를 새로 만드는 것은 이 WO 범위 밖이므로 **데이터가 있을 때만 실검사**하는 방식을 택했다.

---

## 4. 산출물

| 파일 | 성격 |
|---|---|
| `packages/auth-context/src/adminRouteAccess.ts` | **신규** — 접근 판정 순수 함수 모듈 |
| `packages/auth-context/src/AdminProtectedRoute.tsx` | 판정 로직을 위 모듈로 이전, 컴포넌트는 호출만 |
| `packages/auth-context/src/index.ts` | 신규 모듈 re-export |
| `apps/admin-dashboard/src/tests/admin-protected-route-access.test.ts` | **신규** — 판정 계약 테스트 14건 |

판정 로직을 별도 모듈로 분리한 이유: **접근 판정은 보안 경계이므로 컴포넌트를 렌더링하지 않고 단위 테스트로 고정**할 수 있어야 한다.
`@o4o/auth-context` 에는 테스트 인프라가 없고 소비처가 admin-dashboard 단독이므로, 테스트는 admin-dashboard(vitest) 에 두고
React·router 의존이 없는 순수 모듈을 소스 경로로 직접 import 한다.

### 변경 ① 서비스 접두 역할 수용 범위 축소

```ts
const allowsServicePrefixed = expanded.some((required) => ADMIN_LEVEL_ROLES.includes(required));
return allowsServicePrefixed && isServicePrefixedAdminRole(role);
```

`kpa:admin` 같은 역할은 **요구 집합이 관리자급 접근을 요구할 때만** 받아준다.
기존 계층 규칙(`admin` → `super_admin`·`operator`·`platform:*`)은 그대로 유지한다.

### 변경 ② permission 판정을 정직하게

```ts
if (Array.isArray(granted) && granted.length > 0) {
  return requiredPermissions.every((p) => granted.includes(p));   // 데이터가 있으면 실검사
}
return /* 관리자 역할 게이트 */;                                    // 없으면 종전 동작
```

- **지금**: 백엔드가 permission 을 안 주므로 종전과 **동일하게** 관리자 역할 게이트로 동작 → 동작 변화 0, 잠김 0
- **나중**: 백엔드가 `user.permissions` 를 채우는 순간 88건의 선언이 **자동으로** 실검사로 승격

의미를 숨기지 않기 위해 prop 주석과 함수 주석에 "이것은 아직 permission 검사가 아니다" 를 명시했다.
이 fallback 이 영구 정책이 아니라는 것도 코드에 남겼다.

---

## 5. 검증 — 변이(mutation) 로 실패를 실증

"테스트가 회귀를 잡는다"는 주장을 실측으로 확인했다.

| 단계 | 결과 |
|---|---|
| 신규 테스트 | **14 pass / 0 fail** |
| **변이**: `allowsServicePrefixed &&` 제거(= 결함 복원) | **1 fail** — "비관리자 전용 화면에는 서비스 접두 관리자 역할이 들어오지 못한다" 가 실패 |
| 변이 원복 후 | **14 pass** |
| admin-dashboard 전체 | **11 suites / 196 tests 전부 pass** |
| `@o4o/auth-context` 타입체크 | `npx tsc --noEmit` **error 0** |
| `apps/admin-dashboard` 타입체크 | `npx tsc --noEmit` **error 0** |
| `@o4o/auth-context` 빌드 | 성공 (dist 갱신 — admin-dashboard 는 alias 로 dist 를 참조) |

### 테스트가 고정하는 것

1. 관리자 화면(`['admin']` 계열)에서 `kpa:admin`·`neture:operator` 는 **계속 통과** (잠김 회귀 방지)
2. 비관리자 전용 선언(`['seller']`·`['supplier']` 등)은 서비스 접두 관리자 역할을 **거부**
3. 관리자급이 아닌 접두 역할(`kpa:member`)은 관리자 화면에서도 거부
4. `admin`→`super_admin`·`operator`·`platform:*` 계층 확장 유지 / `super_admin` 이 `operator` 를 새로 열지 않음
5. 역할 수집 3출처(`role`·`activeRole.name`·`roles[]` 문자열·객체 혼재) 하위 호환
6. 형태가 깨진 user 객체에서 예외 없이 거부
7. permission: 데이터 없으면 역할 게이트 / 있으면 실검사 / 빈 배열은 "없음" 취급

---

## 6. 안전성

| 항목 | 값 |
|---|---:|
| 프로덕션 요청 (읽기·쓰기) | **0** |
| 운영 DB write · 직접 SQL · migration | **0** |
| 백엔드 코드 변경 | **0** |
| 자격증명·토큰 출력 | **0** |
| 테스트 계정 사용 | **0** |
| 다른 세션 파일 접촉 | **0** — commit 은 내 파일 정확 pathspec |
| `pnpm-lock.yaml` | 미변경 |

---

## 7. 범위 밖으로 남긴 것 (수정하지 않음, 기록만)

| 항목 | 내용 |
|---|---|
| **관리자 셸 전체 게이트** | `apps/admin-dashboard/src/App.tsx:186` 이 대시보드 전체를 `requiredRoles={['admin']}` 로 감싼다. 여기를 좁히면 **KCos·GlycoPharm 서비스 운영자가 잠긴다** — 이들은 `requireServiceLegalScope('operator')` 로 `/api/v1/admin/services` 를 정당하게 사용한다(`WO-O4O-KCOS-OPERATOR-CONTACT-MANAGEMENT-MIGRATION-V1`). **정책 결정 사안이라 임의로 바꾸지 않았다.** |
| **permission 공급** | 백엔드 인증 응답이 `user.permissions` 를 채우도록 하는 작업. 별도 WO. 그때 88건 선언이 자동 활성화되므로 **선언 내용 자체의 감사**가 선행돼야 한다 |
| 메뉴 권한 선언 정비 | 9단계 순서 5번 |
| 개별 API 경로 오류 정비 | 9단계 순서 6번 |
| 역할 순서 결정성 | 9단계 순서 7번 |

---

## 8. 최종 판정 — `PASS_WITH_SCOPE_FOLLOWUP`

| 요구 | 결과 |
|---|:--:|
| `requiredRoles` 선언이 실제 판정에 반영되도록 수정 | ✅ |
| 기존 관리자 사용자 잠김 없음 (소비처 168건 전수 확인) | ✅ |
| `requiredPermissions` 의 의미를 정직하게 (숨은 무효 선언 제거) | ✅ |
| permission 공급 시 자동 승격되는 구조 | ✅ |
| 회귀 테스트 + **변이로 실패 실증** | ✅ |
| 백엔드·DB·프로덕션 무접촉 | ✅ |

### `PASS` 가 아닌 이유

두 결함의 **판정 로직**은 고쳤으나, 파생된 두 구조 문제가 남는다.
① `user.permissions` 를 공급하는 주체가 없어 permission 검사는 여전히 역할 게이트로 동작한다.
② 관리자 대시보드 셸 전체가 단일 `['admin']` 게이트라, 서비스 운영자와 플랫폼 관리자의 화면 경계가 프런트에서 구분되지 않는다.
둘 다 정책 결정이 필요해 이번 범위에 넣지 않았다.
