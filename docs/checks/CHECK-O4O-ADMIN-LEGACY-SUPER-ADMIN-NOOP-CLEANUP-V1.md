# CHECK-O4O-ADMIN-LEGACY-SUPER-ADMIN-NOOP-CLEANUP-V1

WO: `WO-O4O-ADMIN-LEGACY-SUPER-ADMIN-NOOP-CLEANUP-V1`
기준 IR: `IR-O4O-ADMIN-LEGACY-SUPER-ADMIN-GUARD-CONSUMER-AUDIT-V1` (commit `1f774005c`)
일시: 2026-07-26 (KST)

## 0. 결론 — 완료. 단, **IR 의 5건 중 1건은 오분류였고 제외했다**

무효·중복 문자열 **4건**만 제거했다. **권한 판정 결과 변화 0 · DB/migration 0 · frontend 0.**

## 1. IR 오분류 정정 — `scope-assignment.utils.ts` 는 **제거 금지**

IR §4 는 `scope-assignment.utils.ts:57,100` 의 `hasRole(allRoles, 'super_admin')` 을
"보유자 0 → 무효항"(D 분류)으로 판정했다. **이는 틀렸다.**

같은 파일의 `hasRole()` (line 40-43) 이 **suffix 매칭**을 한다:

```ts
function hasRole(allRoles: Set<string>, target: string): boolean {
  if (allRoles.has(target)) return true;
  return Array.from(allRoles).some(r => r.endsWith(`:${target}`));   // ← platform:super_admin 매칭
}
```

따라서 `hasRole(allRoles, 'super_admin')` 은 **`platform:super_admin` 을 실제로 매칭한다.**
제거했다면 최고 관리자에 대해:

- `rolesToScopeLevel()` → `'admin'` 스코프 판정 실패
- `detectServiceFromRole()` → 전 서비스 접근 판정 실패

두 가지가 동시에 깨졌을 것이다. **A 분류(suffix 의미, 제거 금지)로 재분류**하고 본 WO 에서 제외했다.
IR 문서에도 정정 블록을 추가했다.

→ 즉시 제거 가능 목록: **5건 → 4건**.

## 2. 변경 내역 (4파일)

각 항목마다 **매칭 방식을 먼저 확인**한 뒤 "제거해도 판정이 불변"임을 근거로 적용했다.

| # | 파일 | 변경 | 매칭 방식 | 불변 근거 |
|---|------|------|-----------|-----------|
| 1 | `modules/media/controllers/media-library.controller.ts` (×4) | `r.includes('super_admin')` 제거 | **부분문자열** | `'platform:super_admin'.includes('admin')` = **true** → 남은 `includes('admin')` 이 그대로 커버 |
| 2 | `routes/guide/guide.controller.ts` | `r === 'super_admin'` 제거 | **완전일치** | 무접두 `super_admin` 보유자 **0명** |
| 3 | `modules/store-ai/utils/product-access.utils.ts` | `PLATFORM_ADMIN_ROLES` 에서 `'super_admin'` 제거 | SQL `role = ANY(...)` **완전일치** | 동일 — 매칭되는 `role_assignments` 행 0 |
| 4 | `routes/operator/roles.routes.ts` | `requireRole` 목록에서 `'super_admin'` 제거 | `hasAnyRole` → TypeORM `In()` **완전일치** | 동일 — 보유자 0 |

`'admin'` / `'operator'` / `'manager'` 등 다른 무접두 역할은 **전부 유지**했다(범위 밖).

## 3. 금지 항목 무변경 확인

WO 가 금지한 대상을 `git diff` 로 검증했다 — **전부 무변경**.

| 대상 | 결과 |
|------|:---:|
| `types/roles.ts` (`seg === 'super_admin'`) | 무변경 ✅ |
| `utils/role.utils.ts` (`'admin' \| 'super_admin'` 타입) | 무변경 ✅ |
| `middleware/signage-role.middleware.ts` (`hasPlatformRole(…, 'super_admin')`) | 무변경 ✅ |
| `utils/scope-assignment.utils.ts` (§1 정정으로 제외) | 무변경 ✅ |
| `database/migrations/*`, `src/migrations/*` | **0 파일** 변경 ✅ |
| frontend (`apps/admin-dashboard`, `services/*`, `packages/*`) | **0 파일** 변경 ✅ |
| swagger / dto 타입 계약 | 무변경 ✅ |
| 살아있는 `operator-notification.routes.ts` 가드 | 무변경 ✅ |

`git diff` 상 `super_admin` 관련 실제 코드 변경 라인은 **7줄(삭제측)** 뿐이며 전부 위 4건에 해당한다.

## 4. 검증

| 항목 | 결과 |
|------|:---:|
| typecheck (`@o4o/api-server`) | 변경 전 13건 = 변경 후 13건 — **신규 0** |
| 변경 파일 오류 | **0** |
| 기준선 13건 출처 | `src/scripts/*` (병행 세션 WIP, 본 WO 무관) |
| build (`tsc -p tsconfig.build.json`) | **PASS** |
| 권한 판정 결과 변화 | **0** (§2 근거) |
| DB / migration / role assignment | **0** |

## 5. 부수 발견 (본 WO 미수정)

`guide.controller.ts` 의 `isOperatorOrAbove()` 는 `':operator'` / `':admin'` **suffix** 로 판정하는데,
`platform:super_admin` 의 suffix 는 `':super_admin'` 이라 **매칭되지 않는다.**

즉 **canonical 최고 관리자는 guide operator 엔드포인트에 접근하지 못한다.**
이는 본 WO 이전부터의 기존 동작이며, 고치면 **권한 확대**에 해당하므로 범위 밖으로 두고 코드 주석과
본 CHECK 에 기록했다. → 후속 WO 대상(IR §7 의 3번과 성격이 같다).

## 6. 배포

본 변경은 api-server 실행 코드에 포함되므로 배포가 필요하다.

| 항목 | 값 |
|------|-----|
| commit | `a0b0c89d8` |
| workflow | `Deploy API Server (Cloud Run)` run `30190696677` — conclusion **success** |
| 배포 image | `…/api-server:a0b0c89d898a2a5ea553a0500501ca5aa61bc173` |
| commit 일치 | **PASS** |

### 6-1. 배포 후 무회귀 smoke (read-only GET)

정리한 4건 중 실경로가 있는 2건(`media-library`, `roles.routes`)을 두 역할 유형으로 교차 검증했다.

| 경로 | `renariver21` (platform:super_admin 단독) | `sohae2100` (서비스 admin/operator 9종) |
|------|:---:|:---:|
| `/api/v1/platform/media-library` | **200** | **200** |
| `/api/v1/operator/roles` | **200** | **200** |
| `/api/v1/admin/platform-accounts` | **200** | **403** |

**해석:**

- `media-library` — `includes('super_admin')` 제거 후에도 **`platform:super_admin` 단독 계정이 200**.
  남은 `includes('admin')` 이 `'platform:super_admin'` 을 부분문자열로 커버함을 실증(§2-1 근거 확인).
- `roles.routes` — 무접두 `'super_admin'` 제거 후에도 양쪽 200. prefixed 항목이 실동작을 담당함을 확인.
- `platform-accounts` — 200/403 대비로 **권한 경계가 그대로 유지**됨을 확인(cutover 결과 무손상).

`guide.controller` / `product-access.utils` 는 완전일치 매칭 + 보유자 0명이라 판정이 구조적으로
불변이므로 별도 라이브 probe 를 수행하지 않았다.

## 7. 커밋

| 항목 | 값 |
|------|-----|
| 변경 파일 | `media-library.controller.ts` · `guide.controller.ts` · `product-access.utils.ts` · `roles.routes.ts` (+ IR 정정) |
| 변경량 | +28 / -8 (주석 포함) |
