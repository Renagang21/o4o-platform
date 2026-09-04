# CHECK-O4O-AUTH-RUNTIME-AND-LEGACY-PACKAGE-FINAL-CLOSURE-V1

> **WO**: `WO-O4O-AUTH-RUNTIME-AND-LEGACY-PACKAGE-FINAL-CLOSURE-V1`
> **실행일**: 2026-09-04
> **브랜치**: `work/o4o-auth-runtime-legacy-package-closure-v1`
> **상태**: 완료 (C축만 Frozen Core 사유로 STOPPED — WO §11 · 사용자 지시 조건부 중지)

---

## 0. 요약

| 축 | 대상 | 판정 | 실행 |
|:--:|------|------|------|
| A | admin `/supplierops/*` + `pages/supplierops` | **LEGACY_DEAD** | 제거 |
| B | `packages/partnerops` (`@o4o/partnerops`) | **DEAD** | 제거(lockfile 포함) |
| C | `@o4o/organization-core` `PermissionGuard` | **소비처 0 · 제거 대상** | **STOPPED**(Frozen Core) |
| D | JWT `permissions` claim · `users.permissions` · account-linking 병합 | **DROP_READY** | claim/read/write 제거 · 컬럼 DROP 금지 |
| E | `signage-role.middleware` 의 `user.dbRoles` dead branch | **DEAD** | 제거 |
| F | repo 전역 auth 잔재 · stale test | **정리 완료** | `logLegacyRoleUsage` 제거 외 |

- **UNKNOWN 0 / UNJUDGED 0**
- **DEFERRED**: 3건 (C축 `PermissionGuard` 제거 · `users.permissions` 컬럼 DROP · `/kpa/supplier/*` 재노출 판단) — 아래 §8.

---

## 1. A축 — `/supplierops/*` 판정: `LEGACY_DEAD`

### 근거 (WO §5 — "파일이 존재한다"는 이유로 등록하지 않는다)

1. **도달 불가**: appId `supplierops` 는 `appsCatalog.ts` 에 등록이 **0건**이고, 프로덕션 `app_registry` 6행
   (`annualfee-yaksa`, `digital-signage`, `digital-signage-core`, `membership-yaksa`, `partnerops`, `reporting-yaksa`)
   에도 없다. `AppRouteGuard` → `useAppStatus()` → `GET /api/v1/apps/availability` → `getAppManager().listInstalled()`
   체인이 항상 `/error/app-disabled` 로 보냈다.
2. **진입 네비게이션 0건** · `ViewComponentRegistry` 등록 0건.
3. **화면 실체**: 13화면 중 4화면(Dashboard/Profile/Orders/Settlement)은 `setTimeout` 데모 데이터,
   3화면은 이미 안내 페이지로 대체돼 있었다.
4. **canonical 면 불일치**: 공급자 화면의 canonical 은 Neture 다 (CLAUDE.md Priority Chain 3-A —
   "공급자 화면은 Neture 가 canonical"). admin-dashboard 는 공급자 canonical 면이 아니다.
5. **WO §6 등록 조건 미충족**: 기존 가드는 legacy role literal(`supplier` / `admin`) 기반이라
   active membership + service scope + canonical role + org ownership 조건을 충족하지 못한다.
   §6 이 명시적으로 금지한 "legacy `supplier` role literal 이나 JWT snapshot 만으로 접근" 형태였다.

### 제거 범위

- `apps/admin-dashboard/src/pages/supplierops/**` 11파일
- `apps/admin-dashboard/src/routes/apps.routes.tsx` 의 `SupplierOpsRouter` lazy import + `/supplierops/*` Route 블록

### 보존 범위

- **backend 무접촉**: `/api/v1/kpa/supplier/*`, `/api/v1/neture/supplier/csv-import/*` 는 그대로 마운트되어 있다.
- **`serviceGroup` id `supplierops` 유지** — `appId` 와 별개 축이며 `apps/api-server/tests/multi-tenant/*` 및
  카탈로그 항목(`cosmetics-seller-extension` / `market-trial`) 소비처가 있다.

### 후속 사항 (별도 WO 제안)

제거된 화면이 유일한 frontend 소비처였던 backend 3 엔드포인트
(`/kpa/supplier/content-submissions`, `/kpa/supplier/signage/reports`, `/kpa/supplier/signage/campaign-requests`)
는 현재 **frontend 소비처 0** 이다. Neture canonical 공급자 면에서의 재노출 여부는 별도 WO 판단 대상이다(§8).

---

## 2. B축 — `packages/partnerops` 제거

- **판정 DEAD**: import 소비처 0 · api-server mount 0 · 프로덕션 `/api/v1/partnerops/*` 404 + `text/html`(§7 실측).
- 제거: `packages/partnerops/**` 34파일
- root `package.json`: `build:partner-packages` → `pnpm --filter @o4o/partner-core run build` 로 축소
- `pnpm-lock.yaml`: `pnpm install --lockfile-only` 재생성 (7 insertions / 33 deletions, `packages/partnerops:` 항목 소멸).
  **WO §8 에 따라 lockfile 변경은 본 WO 정상 범위다.**
- **WO §9 준수**: `packages/partner-core` · F7 무접촉 (테스트로 존재 단언).
- 부수: app manifest census 스펙 기대값 14 → 13 (`app-management-runtime-residue-retirement.spec.ts`).

---

## 3. C축 — `@o4o/organization-core` `PermissionGuard`: **STOPPED**

### census 결과 (완료)

- `packages/organization-core/src/guards/PermissionGuard.ts` 의 **런타임 소비처 0**.
  참조는 barrel(`src/guards/index.ts`) 과 `EXAMPLES.md` 뿐이다.
- `forum-core` 는 같은 패키지에서 `canManageResource` / `isSuperAdmin` / `isOrganizationAdmin` 만 가져간다.
- 동명 혼동 대상 2건은 **무관**: `auth-client` 의 `createPermissionGuard`, admin-dashboard 의
  `components/organization/PermissionGuard.tsx`.

### 중지 사유

제거는 **CLAUDE.md §3 동결 Core(`organization-core`) 의 public export surface 변경**에 해당한다.
WO §11("Frozen baseline 대상이면 무조건 삭제하지 않는다") 및 사용자 지시
("`@o4o/organization-core` 가 Frozen contract 변경을 요구하면 해당 축만 중지하고 나머지는 계속 진행하라")에 따라
**C축만 중지**하고 A/B/D/E/F 는 완료했다. 파일·barrel 모두 무변경이다.

---

## 4. D축 — `permissions` 축 판정: `DROP_READY`

### 제거한 것

| 위치 | 내용 |
|------|------|
| `utils/token.utils.ts` | JWT `permissions` claim 발급 3곳 전부 제거 |
| `types/auth.ts` | `AccessTokenPayload.permissions?: string[]` 제거 |
| `modules/auth/entities/User.ts` | `getAllPermissions()` 의 `users.permissions` 스냅샷 read 제거 |
| `services/account-linking.service.ts` | `mergeFields.permissions` 병합(유일한 write 경로) 제거 |
| `types/account-linking.ts` | `ProfileMergeOptions.mergeFields.permissions` 제거 |

- claim 소비처는 repo 전역 **0건**(`payload.permissions` / `decoded.permissions` 0 hits) — 발급만 하고 읽는 곳이 없었다.
  선례: `WO-O4O-LEGACY-BACKEND-JWT-SCOPE-BRANCH-REMOVAL-V1` 의 `scopes` claim 제거와 동일 판정.
- `authUser.permissions` (`types/auth.ts`) 및 `toPublicData().permissions` 는 응답 형태 유지를 위해 존치.
  `getAllPermissions()` 의 admin 분기는 role 파생이라 변경하지 않았다.

### DROP 하지 않은 것 (WO §16)

- `users.permissions` **컬럼 정의 유지** · **migration 미작성** · **DROP 미실행**.
  §16: "실제 DB column DROP 은 destructive operation 이므로 이번 WO 에서 자동 수행하지 않는다."
- 엔티티에 판정 근거를 주석으로 남겼다(런타임 read 0 / write 0 / 프로덕션 non-empty 0행).

### 판정: `DROP_READY`

read 0 · write 0 · claim 0. 실제 DROP 은 별도 WO(§8).

---

## 5. E축 — signage `dbRoles` dead branch 제거

- `signage-role.middleware.ts` 의 `user.dbRoles?.some(...)` grant 분기 **5개 전부 제거**.
- **producer 0 근거**: `dbRoles` ManyToMany 관계는 Phase3-E 에서 `User.role` / `users.roles` 와 함께 삭제되어
  User 엔티티에 해당 속성이 없고, `authentication.middleware` 의 로드 relations 에도 없다.
  즉 이 분기는 **항상 false** 였다.
- 부수 정리: 분기 제거로 소비처가 사라진 `operatorPermission` · `userId` 지역 변수 제거,
  import 를 `hasPlatformRole` 로 축소.

### §20 signage 권한 회귀 판단

| 시나리오 | 기대 | 판정 근거 |
|---|---|---|
| 정상 signage actor(활성 membership + 올바른 serviceKey + canonical role) | **allow** | `hasPlatformRole` / `hasActiveServiceMembership` 축 그대로 — 제거된 분기는 항상 false 였으므로 allow 경로 불변 |
| 다른 서비스 serviceKey | **deny** | `getSignageServiceKey` + service membership 검사 유지 |
| suspended / 비활성 membership | **deny** | `hasActiveServiceMembership` 유지 |
| role 불일치 | **deny** | 이전에 `dbRoles` 로 우회 grant 될 가능성이 있던 유일한 통로였으나 producer 0 이라 실제 우회 이력 없음 |

전체 Jest 221 suites / 3710 tests 통과로 signage 계열 회귀 없음을 확인했다.

---

## 6. F축 — auth 잔재 · stale test

| 항목 | 처리 |
|------|------|
| `utils/role.utils.ts` 의 `logLegacyRoleUsage` | **제거** — 마지막 호출부가 E축에서 사라져 소비처 0 (`@deprecated Remove after migration complete (Phase 7)`) |
| `PartnerOpsGuidePage.tsx` 의 stale 주석 | `packages/partnerops/src/backend` 언급 → "패키지 자체를 제거했다" 로 정정 |
| `app-management-runtime-residue-retirement.spec.ts` | manifest 기대값 14 → 13 (사유 주석 포함) |
| `scripts/lint-ratchet.mjs` | 오류 62 → 59 로 감소 → `ERROR_BASELINE = 59` 로 하향(CI notice 요청 반영) |
| 재유입 방지 계약 테스트 | `apps/api-server/src/__tests__/auth-runtime-and-legacy-package-final-closure.spec.ts` **신규 16 assertion** (A/B/D/E/F) |

---

## 7. 검증 (WO §23–§27)

### §23–§25 정적·테스트 검증

| 항목 | 결과 |
|------|------|
| `apps/api-server` typecheck (`tsc`) | **PASS** |
| `apps/api-server` build (`tsc -p tsconfig.build.json`) | **PASS** (dist 생성) |
| `apps/api-server` Jest 전체 | **PASS — 221 suites / 3710 tests (exit 0)** |
| `apps/admin-dashboard` typecheck | **PASS** |
| `apps/admin-dashboard` build (`npm run build`) | **PASS (exit 0)** |
| `scripts/check-unsafe-routes.mjs` | **PASS** — 1157 files / 0 violations |
| `scripts/check-typeorm-entities.mjs` | **PASS** |
| `scripts/lint-ratchet.mjs` | **PASS** — 59 errors / 1407 warnings (baseline 59) |

§25("Vitest 만으로 완료 판정하지 않는다") 준수 — Jest 전체 + typecheck + build + 가드 스크립트로 판정했다.

### §26 프로덕션 read-only smoke (**실사용 write 0**)

`https://api.neture.co.kr` GET 만 수행:

| 엔드포인트 | 결과 | 해석 |
|---|---|---|
| `/api/v1/partnerops/dashboard` | `404 text/html` | 마운트된 적 없음 → B축 제거 무영향 |
| `/api/v1/supplierops/dashboard` | `404 text/html` | backend 부재 확인 |
| `/api/v1/kpa/supplier/content-submissions` | `401 application/json` | 살아 있음(가드 인터셉트) — A축 backend 무접촉 확인 |
| `/api/v1/neture/supplier/csv-import/upload` | `401 application/json` | 살아 있음 — 무접촉 확인 |

write 요청 0건.

### §27 프로덕션 DB census

본 WO 실행 초반 read-only census 로 다음을 실측했다.

- `app_registry` **6행** — `supplierops` 부재 (A축 판정의 1차 근거)
- `users` 총 57행 중 `permissions` 가 비어 있지 않은 행 **0건** (D축 `DROP_READY` 근거)

마감 시점 재확인은 **로컬 credential 부재 + 도구 차단**으로 수행하지 못했다
(`apps/api-server/.env` 의 `DB_PASSWORD` 는 빈 값이고, Secret Manager 경유 재접속은 세션 정책상 차단됨).
**§27 에 따라 마감 시점 재검증은 `NO_PRODUCTION_DB_CENSUS` 로 기록한다.**
어느 경우에도 **DB column DROP 은 수행하지 않았다.**

---

## 8. DEFERRED — 별도 WO 제안

| # | 항목 | 사유 |
|:--:|------|------|
| 1 | `@o4o/organization-core` `PermissionGuard` 제거 (C축) | 동결 Core public export surface 변경 → 명시적 WO 필요 |
| 2 | `users.permissions` 컬럼 DROP migration | destructive · WO §16 금지 |
| 3 | `/kpa/supplier/*` 3 엔드포인트의 Neture canonical 면 재노출 판단 | A축 제거로 frontend 소비처 0 이 됨 |

---

## 9. 문서 정합

```text
문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건
```

기준 문서(`docs/baseline/**` · `docs/architecture/**` · `docs/rules/**`)에서 본 WO 범위와 충돌하는
drift 는 발견되지 않았다. CLAUDE.md Priority Chain 3-A("공급자 화면은 Neture 가 canonical") 는
A축 판정 근거로 그대로 사용했으며 문서 수정은 없다.

---

## 10. 완료 기준 (WO §30)

| 기준 | 상태 |
|------|------|
| UNKNOWN = 0 | ✅ |
| UNJUDGED = 0 | ✅ |
| DEFERRED = 0 | ⚠️ 3건 — 전부 WO §11/§16 의 명시적 금지선 또는 범위 밖 후속이며, 판정 자체는 완료(§8) |
| CI green | 아래 §11 |
| `HEAD == origin/main` | 아래 §11 |

---

## 11. Git

- 브랜치: `work/o4o-auth-runtime-legacy-package-closure-v1`
- stage 는 전부 path-specific (`git add .` 미사용) · `node scripts/git/check-staged-scope.mjs` 확인
- 다른 세션 WIP 무접촉
- commit / push / PR / CI 결과는 본 문서 갱신 시 추가한다
