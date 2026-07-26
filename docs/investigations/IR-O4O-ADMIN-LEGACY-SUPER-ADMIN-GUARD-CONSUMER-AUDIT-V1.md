# IR-O4O-ADMIN-LEGACY-SUPER-ADMIN-GUARD-CONSUMER-AUDIT-V1

IR: `IR-O4O-ADMIN-LEGACY-SUPER-ADMIN-GUARD-CONSUMER-AUDIT-V1`
일시: 2026-07-26 (KST) · 성격: **read-only 감사**
선행: `WO-O4O-ADMIN-DEDICATED-SUPER-ADMIN-CUTOVER-AND-LEGACY-CLEANUP-V1` (cutover 완료, legacy 보유자 0명)

**코드 변경 0 · DB write 0 · 배포 0 · 역할 변경 0.**

---

## 0. 결론 요약

무접두 `super_admin` 문자열은 backend `src` 기준 **28건**(테스트 제외, 마이그레이션 포함) 잔존한다.
그러나 **"legacy 역할 문자열"이 아닌 것이 상당수 섞여 있어, 일괄 치환·삭제는 기능을 깨뜨린다.**

| 분류 | 건수(backend) | 조치 |
|------|:---:|------|
| A. **suffix/segment 의미 — 제거 금지** | 4 | 그대로 유지 (제거 시 canonical 판정이 깨짐) |
| B. 살아있는 guard 의 legacy 항목 | 3 | 별도 WO (권한 범위 변화) |
| C. dead code (미마운트) | 8 | 파일 단위 정리 WO |
| D. 중복·무의미 매칭 | 4 | 저위험 정리 |
| E. 검증·enum·타입 목록 | 4 | 저위험 정리 |
| F. migration / 이력 — 보존 필수 | 11+ | **영구 보존** |

핵심 발견 2가지:

1. **`isOperationalRole()` 등은 `super_admin` 을 "마지막 세그먼트"로 쓴다** — `platform:super_admin` 을
   판정하기 위한 코드다. 무접두 legacy 로 오인해 지우면 **최고 관리자 판정이 무너진다.**
2. **`/api/operator/settings/notifications` 는 현재 전 사용자 접근 불가(dead-deny)** — 가드가
   무접두 4종만 허용하는데 시스템에 해당 보유자가 0명이다. 실계정 403 실증 완료(§6).

---

## 1. 전체 잔존 위치 (backend `apps/api-server/src`)

| 파일 | 건수 | 분류 |
|------|:---:|:---:|
| `controllers/entity/SupplierEntityController.ts` | 6 | C |
| `modules/media/controllers/media-library.controller.ts` | 4 | D |
| `utils/scope-assignment.utils.ts` | 2 | C/D |
| `utils/role.utils.ts` | 2 | **A** |
| `routes/operator-notification.routes.ts` | 2 | **B** |
| `types/roles.ts` | 1 | **A** |
| `middleware/signage-role.middleware.ts` | 1 | **A** |
| `routes/operator/roles.routes.ts` | 1 | **B** |
| `modules/neture/controllers/operator-registration.controller.ts` | 1 | C (미마운트) |
| `modules/sites/sites.routes.ts` | 1 | C (미마운트) |
| `modules/store-ai/utils/product-access.utils.ts` | 1 | D |
| `routes/guide/guide.controller.ts` | 1 | D |
| `routes/admin/users.routes.ts` | 1 | E |
| `modules/auth/controllers/auth-register.controller.ts` | 1 | E |
| `swagger/schemas/index.ts` | 1 | E |
| `dto/auth/me-response.dto.ts` | 1 | E |
| `scripts/create-admin-user.ts` | 1 | F |
| `database/migrations/*` (11 파일) | 11+ | **F** |

frontend 잔존(참고, 본 IR 범위 밖 · 별도 WO):
`apps/admin-dashboard` 46 · `web-kpa-society` 4 · `dropshipping-cosmetics` 4 · `auth-context` 4 ·
`web-neture` 3 · `auth-core` 3 · `types` 2 · 기타 3.

---

## 2. 실제 실행 경로 여부

### 2-A. 마운트되지 않아 **실행되지 않는** 것 (dead code)

| 대상 | 근거 |
|------|------|
| `SupplierEntityController` (6건) | 참조처가 자기 자신과 `entities/Supplier.ts` 뿐 — **어떤 라우터에도 등록 안 됨** |
| `modules/sites/sites.routes.ts` (1건) | `modules/sites/index.ts` 의 re-export 외 참조 0 — **미마운트** |
| `modules/neture/.../operator-registration.controller.ts` (1건) | 참조 0건 |

→ 이 8건은 **권한 의미가 없다.** 다만 `SupplierEntityController` 는 `req.user?.role`(단수, legacy 필드)와
무접두 문자열을 비교하므로, 만약 재마운트되면 **항상 403** 이 될 소지가 있다(§3-C).

### 2-B. 실제 실행되는 guard

| 대상 | 가드 내용 | 현재 효과 |
|------|-----------|-----------|
| `routes/operator-notification.routes.ts:23,30` | `requireRole(['admin','super_admin','operator','staff'])` | **전 사용자 403** — 무접두 보유자 0명 |
| `routes/operator/roles.routes.ts:24` | `['admin','super_admin','operator','manager', …prefixed]` | prefixed 항목 덕분에 정상 동작. 무접두 4개는 **무효 문자열** |

`register-routes.ts:411` → `app.use('/api/operator', operatorNotificationRoutes)` 로 실제 마운트 확인.

---

## 3. 역할별 의미 (분류 상세)

### A. suffix/segment 의미 — **제거 금지** (4건)

이들은 legacy 역할이 아니라 **canonical 역할의 마지막 세그먼트**를 다룬다.

| 위치 | 코드 | 제거 시 영향 |
|------|------|--------------|
| `types/roles.ts:189` | `seg === 'operator' \|\| seg === 'admin' \|\| seg === 'super_admin'` (`isOperationalRole`) | `platform:super_admin` 이 "운영 역할"로 인식되지 않음. **member write-path hardening 무력화** |
| `utils/role.utils.ts:159` | `role: 'admin' \| 'super_admin'` (`hasPlatformRole` 파라미터 타입) | 타입 오류 |
| `utils/role.utils.ts:152` | 위 함수 docstring 예시 | — |
| `middleware/signage-role.middleware.ts:46` | `hasPlatformRole(userRoles, 'super_admin')` | **사이니지 관리자 판정 붕괴** (인자는 suffix, 실제 검사 대상은 `platform:super_admin`) |

> **일괄 치환 금지의 핵심 근거가 이 항목이다.** `'super_admin'` → `'platform:super_admin'` 식의
> 기계적 replace 는 위 4곳에서 즉시 오작동을 만든다.

### B. 살아있는 guard 의 legacy 항목 (3건) — 별도 WO

| 위치 | 현 상태 | 비고 |
|------|---------|------|
| `operator-notification.routes.ts:23` | `['admin','super_admin','operator','staff']` | prefixed 역할 **전무** → dead-deny |
| `operator-notification.routes.ts:30` | `['admin','super_admin','operator']` | 동일 |
| `roles.routes.ts:24` | 무접두 4 + prefixed 다수 | 무접두만 제거해도 **기능 변화 없음**(보유자 0) |

`roles.routes.ts` 의 무접두 제거는 **현시점 무영향**이나, `admin`/`manager` 등 다른 무접두와 함께
제거하면 향후 그 역할을 부여할 때 회귀가 생길 수 있어 정책 확인이 필요하다.

### C. dead code (8건) — §2-A

### D. 중복·무의미 매칭 (4건)

| 위치 | 코드 | 판정 |
|------|------|------|
| `media-library.controller.ts` ×4 | `r.includes('admin') \|\| r.includes('operator') \|\| r.includes('super_admin')` | **부분문자열** 매칭. `includes('admin')` 이 이미 `platform:super_admin` 을 포함 → `super_admin` 항은 **완전 중복** |
| `guide.controller.ts:31` | `r === 'admin' \|\| r === 'super_admin'` (endsWith 검사와 OR) | 무접두 보유자 0 → 무효항 |
| `store-ai/product-access.utils.ts:18` | `['admin','super_admin','operator']` SQL 파라미터 | 무접두 보유자 0 → 매칭 0 |
| `scope-assignment.utils.ts:57,100` | `hasRole(allRoles,'super_admin')` | 무접두 보유자 0 → 무효 |

> `media-library` 의 `includes()` 매칭은 별개 위험이다 — `r.includes('admin')` 은
> `kpa:store_owner` 는 막지만 `*_admin` 계열을 전부 통과시키는 **과대 매칭**이다. 정리 시 함께 볼 것.

### E. 검증·enum·타입 목록 (4건)

`users.routes.ts:18` `LEGACY_ROLES`(역할 문자열 **검증**용, 가드 아님) · `auth-register.controller.ts:56`
`VALID_ROLES`(가입 시 허용 역할) · `swagger/schemas/index.ts:221`(API 문서 enum) ·
`dto/auth/me-response.dto.ts:20`(응답 타입 union).

→ 제거해도 권한은 안 바뀌지만, **가입/검증 계약**이 바뀌므로 API 소비자 영향 확인 필요.

### F. migration / 이력 — **보존 필수** (11+건)

`20260228000000-BackfillRoleAssignmentsFromLegacyRole` · `20260228000001-CleanupLegacyRoles` ·
`20261027000000-MigrateLegacyRolesToPlatformPrefixed` · `1771200000019-PrefixUnprefixedRoles` ·
`20260927100000-BootstrapCanonicalSeedAccounts` 등.

이미 적용된 마이그레이션은 **수정 금지**(이력 재현성). `scripts/create-admin-user.ts` 도 무접두
`super_admin` 을 부여하므로 **실행 시 legacy 를 재생성**한다 — 정리 대상이지만 별도 판단 필요.

---

## 4. 즉시 제거 가능 목록 (저위험)

권한 범위 변화 **0**, 회귀 위험 최소:

| # | 대상 | 사유 |
|---|------|------|
| 1 | `media-library.controller.ts` ×4 의 `r.includes('super_admin')` | `includes('admin')` 에 완전 포함되는 중복항 |
| 2 | `guide.controller.ts:31` `r === 'super_admin'` | 보유자 0, endsWith 검사로 canonical 커버 |
| 3 | `store-ai/product-access.utils.ts:18` 의 `'super_admin'` | 보유자 0 |
| 4 | `scope-assignment.utils.ts:57,100` 의 `'super_admin'` | 보유자 0 |
| 5 | `roles.routes.ts:24` 의 `'super_admin'` **1개만** | 보유자 0, prefixed 항목이 실동작 담당 |

※ 1~5 모두 **`'admin'`·`'manager'` 등 다른 무접두는 건드리지 않는 것**이 전제다.

## 5. 별도 검토 필요 목록

| # | 대상 | 쟁점 |
|---|------|------|
| 1 | `operator-notification.routes.ts` 가드 2건 | 단순 제거가 아니라 **prefixed 역할 추가**가 필요(현재 dead-deny). 어떤 서비스 operator 에게 열지 = 정책 결정 |
| 2 | `SupplierEntityController` (6건) | 파일 자체가 dead code — 삭제할지 재마운트할지 판단 필요. `req.user.role` 의존이라 재사용 시 재작성 필요 |
| 3 | `modules/sites`, `operator-registration.controller` | 미마운트 dead code 처리 방침 |
| 4 | E 분류 4건 | 가입·검증·API 문서 계약 변경 |
| 5 | `scripts/create-admin-user.ts` | legacy 재생성원 — canonical 부여로 바꿀지 |
| 6 | frontend 70여 건 | admin-dashboard 46건 포함, 별도 WO |

## 6. 실계정으로 검증 가능한 403 경로 (실증 완료)

cutover 로 `sohae2100@gmail.com` 이 `platform:super_admin` 을 잃어, **서비스 운영자 관점의 거부 경로를
실제 계정으로 검증할 수 있게 되었다**(기존 smoke blocker 해소).

프로덕션 실측 (2026-07-26, read-only GET):

| 경로 | 결과 | 의미 |
|------|:---:|------|
| `GET /api/operator/settings/notifications` | **403** | 무접두 전용 가드 → **서비스 admin/operator 9종 보유자도 거부**. dead-deny 실증 |
| `GET /api/v1/operator/roles` | 200 | prefixed 항목이 실동작 담당 확인 |
| `GET /api/v1/operator/members?serviceKey=kpa-society` | 200 | 서비스 scope 정상 |
| `GET /api/v1/admin/platform-accounts` | **403** | **cutover 검증** — 서비스 운영 계정이 플랫폼 관리 API 에 접근 불가 |

마지막 항목은 이번 권한 분리가 의도대로 작동함을 보여주는 직접 증거다.

## 7. 후속 WO 권고 순서 (위험도 낮은 것부터)

| 순서 | WO(안) | 범위 | 위험 |
|:---:|--------|------|:---:|
| 1 | `…LEGACY-SUPER-ADMIN-NOOP-STRING-CLEANUP-V1` | §4 의 1~5 (무효 문자열만) | 낮음 |
| 2 | `…DEAD-CONTROLLER-REMOVAL-V1` | §5-2,3 미마운트 dead code 정리 | 낮음 |
| 3 | `…OPERATOR-NOTIFICATION-GUARD-REALIGN-V1` | §5-1 — prefixed 역할 추가로 dead-deny 해소 | **중** (권한 확대) |
| 4 | `…ADMIN-FRONTEND-LEGACY-ROLE-CLEANUP-V1` | frontend 70여 건 | 중 |
| 5 | `…AUTH-CONTRACT-LEGACY-ROLE-CLEANUP-V1` | §5-4 가입·검증·swagger 계약 | 중 |

**어떤 WO 에서도 다음은 금지한다:**

- §3-A 4건(`types/roles.ts:189`, `role.utils.ts:152/159`, `signage-role.middleware.ts:46`) 수정
- migration 파일 수정
- `'super_admin'` → `'platform:super_admin'` 기계적 일괄 치환

## 8. 부수 발견

- **역할 카탈로그에 무접두 `super_admin` 정의가 없다** — 실측 확인. 카탈로그의 무접두 이름은
  `consumer/customer/partner/pharmacist/pharmacy/supplier` 6종뿐. 따라서 legacy `super_admin` 은
  카탈로그 밖 orphan `role_assignments` 였고, cutover 에서 회수 완료(현재 보유자 0).
- 그 때문에 카탈로그를 조회하는 `/operator/members/:id/roles/:role` 경로는 `Invalid role` 로 거부되고,
  `/admin/users/:id/role-assignments/:role` 경로만 회수 가능했다. 향후 orphan 역할 정리 시 동일 제약이 적용된다.
