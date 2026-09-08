# CHECK-O4O-WORK-SCOPE-CONTRACT-V0

- **WO**: WO-O4O-WORK-SCOPE-CONTRACT-V0
- **일자**: 2026-09-08
- **선행**: WO-O4O-COMMON-HOME-PHASE1-V1 (CLOSED)
- **작업 브랜치**: `work/work-scope-contract-v0` (독립 worktree `C:/tmp/o4o-work-scope`)
- **범위**: Work Scope 계약 + 최소 구현. Local Work Agent · AI 호출 미구현.

---

## 1. 기존 service / org / store / role 구조 조사

### 1-1. service 식별

`serviceKey` (TS) / `service_key` (DB) 가 canonical 이다. 나머지는 축이 아니다.

| 식별자 | 판정 | 근거 |
|---|---|---|
| `serviceKey` / `service_key` | **canonical** | `service_memberships.service_key`, 전 guard·전 프런트 |
| `platform_services.code` | 카탈로그 테이블 한정 (값은 `serviceKey` 와 동일) | `apps/api-server/src/entities/PlatformService.ts` |
| `serviceCode` | forum 도메인 DTO alias | `packages/types/src/forum.ts` |
| `serviceSlug` | 단일 파일 국소 사용 | `services/web-neture/src/pages/admin/ai/aiAssetPackageStandards.ts` |
| `serviceId` | 서비스 식별자가 **아님** (AI/recruitment row 의 UUID FK) | `packages/ai-core/src/policies/ai.policy.ts` |

**같은 이름의 값 공간이 둘이다.**

```text
role prefix 공간         : kpa, cosmetics, neture, glycopharm, platform, pharmacy-hub, kpa-branch
canonical membership 공간 : kpa-society, k-cosmetics, neture, glycopharm, platform, pharmacy-hub, kpa-branch
```

변환 SSOT = `packages/security-core/src/service-configs.ts`
(`resolveCanonicalServiceKey` / `resolveRolePrefixFromCanonicalServiceKey`).
차이가 나는 것은 `kpa→kpa-society`, `cosmetics→k-cosmetics` 둘뿐이고 나머지는 self-map.

프런트엔드는 **ServiceContext 도 `VITE_SERVICE_KEY` 도 없다.** 앱별 컴파일 타임 상수다:
`services/web-neture/src/lib/membershipGate.ts:22` → `export const SERVICE_KEY = 'neture' as const`.
(pharmacy-hub / kpa-branch 만 `src/config/service.ts` 로 파일 위치가 다르다.)

### 1-2. organization / store

**canonical 축에서 `storeId` 는 `organizations.id` 와 같은 값이다.**

- `apps/api-server/src/modules/store-core/entities/organization-store.entity.ts:26` — `@Entity('organizations') class OrganizationStore` (organizations 확장 뷰). 별도 stores 테이블 없음.
- 매장 하위 테이블은 `organization_id` 로 키를 건다 (`store-capability.entity.ts`, `store-product.entity.ts`).
- commerce 는 org id 를 alias 한다 — `CheckoutOrder.entity.ts:90` 의 실제 컬럼은 `sellerOrganizationId` 이고 `storeId` 컬럼은 존재하지 않는다.
- 서비스별 로컬 테이블 PK(`cosmetics_stores.id`, `kpa_organizations.id`, `physical_stores.id`)는 이 축이 **아니다**.

WO §5-B 의 "임의로 동일시하지 않는다" 지시에 대한 답: **식별자 값은 동일하나 경계 의미는 도메인별로 다르다.** Boundary Policy(F6)가 Store Ops=`organizationId` / Commerce=`storeId` 로 이름을 나눠 쓰므로 계약에서도 필드를 분리해 두었다.

**클라이언트가 보낸 매장 식별자는 어디서도 신뢰되지 않는다.**
canonical resolver = `apps/api-server/src/utils/store-organization.resolver.ts`
→ `organization_members`(owner/admin/manager, `left_at IS NULL`) ∩ 서비스 등록(`organization_service_enrollments` ∪ `platform_store_slugs`)
→ `resolved` / `none` / `ambiguous`. 그 파일의 핵심 원칙이 **"role 판정 ≠ organization 판정"** 이다.
`StoreOwnerServiceKey` 에 `neture` 는 없다.

### 1-3. role

- SSOT = `role_assignments` (F9/F10 freeze). `service_memberships` 는 서비스 이용 자격.
- 프런트 취득 경로: `GET /api/v1/auth/me` → `roles: string[]` (role_assignments 에서 60초 캐시로 재조회) + `memberships[]`.
- 프런트 타입: `packages/auth-utils/src/buildPlatformUser.ts` `PlatformUser` — `roles: string[]`, `memberships: MembershipLike[]`.
  API 는 membership `role` 을 주지만 `MembershipLike` 는 `{ serviceKey, status }` 만 담아 **버린다**.
- **프런트 user 객체에 `organizationId` / `storeId` 가 없다.**

### 1-4. workspace (route 실측)

Neture 의 실제 업무 축 게이트:

| 축 | route | route guard | layout guard |
|---|---|---|---|
| admin | `/admin/*`, `/admin-vault` | `AdminRoute` (ADMIN_ROLES + membership) | AdminLayoutWrapper |
| admin(platform) | `/admin/platform/*` | `PlatformRoute` (PLATFORM_ROLES, membership 미요구) | PlatformSectionLayout |
| operator | `/operator/*` | `OperatorRoute` (OPERATOR_OR_ABOVE_ROLES + membership) | OperatorLayoutWrapper |
| supplier | `/supplier/*`, `/account/supplier/*` | `SupplierRoute` (SUPPLIER_ROLES + membership) | SupplierSpaceLayout (SUPPLIER_ACCESS_ROLES) |
| partner | `/partner/*`, `/account/partner/*` | **없음** | PartnerSpaceLayout / PartnerAccountLayout (PARTNER_ACCESS_ROLES) |
| store | `/store/*`, `/seller/*` | **없음** | MainLayout |
| community | `/community` | 없음 | NetureLayout |

`/workspace/*` 는 `SupplierOpsLayout` 아래 있으나 **role guard 가 없다**(무게이트).

### 1-5. capability

프런트에 **사용자 단위 `can(...)` 추상화는 존재하지 않는다.** 이름이 같은 다른 것 셋:

- `@o4o/capabilities` — 매장 *기능* 등재부(`B2C_COMMERCE`/`TABLET`/`SIGNAGE` 등). 백엔드만 import. `ServiceKey` 가 `'kpa'|'cosmetics'|'glycopharm'` 뿐이라 neture·pharmacy-hub 부재. 축이 다르다.
- `packages/types/src/operator-capability.ts` — 서비스별 정적 메뉴 목록. 사용자 입력 없음.
- `packages/auth-client/src/rbac.ts` + `hooks.ts` — `usePermission`/`useRBAC` 등 존재하나 **어디서도 import 되지 않는 dead layer**. `getActiveRoles()` 가 `user.assignments` 를 읽는데 `/auth/me` 는 그 필드를 주지 않아 되살리면 전부 `false` 를 낸다.

실제 인가는 guard 안의 `roles.includes('service:role')` 로 이뤄진다.

---

## 2. canonical identifier 판정

```text
service       serviceKey  = service_memberships.service_key  (canonical 공간)
                            Neture = 'neture' (self-map, 변환 불필요)
organization  organizations.id
store         organizations.id 와 동일 값 — 단 경계 이름은 도메인별로 분리 (F6)
role          role_assignments.role  (prefixed: 'neture:operator' 등, 일부 legacy 무접두사)
membership    service_memberships(user_id, service_key).status
```

---

## 3. WorkScope 최종 타입

`services/web-neture/src/lib/work-scope/types.ts`

```ts
type Workspace = 'home' | 'community' | 'store' | 'supplier' | 'partner' | 'operator' | 'admin';
type ExecutionMode = 'cloud' | 'local' | 'hybrid';           // V0 는 항상 'cloud'
type WorkScopeStatus = 'resolved' | 'none' | 'ambiguous';    // 백엔드 resolver 계약 재사용
type WorkScopeReason =
  | 'UNAUTHENTICATED' | 'ROLE_NOT_GRANTED' | 'MEMBERSHIP_NOT_ACTIVE'
  | 'STORE_IDENTITY_SERVER_ONLY';
type WorkScopeCapability = 'navigate' | 'read' | 'draft'
  | 'local_read' | 'local_write' | 'browser';                // 뒤 3개는 V0 미부여

interface WorkScope {
  serviceKey: string;
  workspace: Workspace;
  organizationId?: string;   // V0 항상 undefined
  storeId?: string;          // V0 항상 undefined
  role?: string;
  capabilities: WorkScopeCapability[];
  executionMode: ExecutionMode;
  status: WorkScopeStatus;
  reason?: WorkScopeReason;
}
```

WO §4 권장 구조 대비 차이와 근거:

| 변경 | 근거 |
|---|---|
| `serviceCode` → `serviceKey` | canonical 이 `serviceKey` (§1-1) |
| `status` / `reason` 추가 | 권한 없는 scope 를 "필드 누락"이 아니라 **명시적 비활성**으로 표현해야 §11 을 지킬 수 있다. 값 3개는 신규 발명이 아니라 `store-organization.resolver.ts` 계약 재사용 |
| `capabilities` 필수화(빈 배열 아님) | 서술 필드이므로 항상 존재. 단 **인가 입력 아님** |
| `organizationId`/`storeId` 유지하되 미충전 | 필드를 지우면 Local Agent 계약(§12)이 깨진다. 값은 서버만 확정 |

**capability 는 권한이 아니라 서술이다.** 기존 guard 가 허용한 범위보다 넓어질 수 없고,
`draft` 는 역할 게이트를 실제로 통과한 축에서만 붙는다. 로컬·브라우저 계열은 V0 에서 부여하지 않는다.

`WORKSPACE_ACCESS` 는 **기존 상수만 조합**한다. supplier 는 route guard(`SUPPLIER_ROLES`)와
layout guard(`SUPPLIER_ACCESS_ROLES`)를 둘 다 통과해야 하므로 **교집합을 계산**해서 쓴다
(상수를 베끼지 않아 원본이 바뀌어도 drift 가 없다).

---

## 4. route → workspace mapping

`services/web-neture/src/lib/work-scope/routeWorkspaceMap.ts` — 세그먼트 경계 일치, 구체적인 규칙 우선.

```text
/account/supplier/*  → supplier
/account/partner/*   → partner
/admin-vault         → admin
/admin/*             → admin      (/admin/platform 포함)
/operator/*          → operator
/supplier/*          → supplier
/partner/*           → partner
/store/*             → store
/seller/*            → store
/community           → community
그 외                 → home       (기본값)
```

WO §10 예상 대비 확정 사항:

- `/seller/*` 를 store 축에 넣었다 — `NETURE_DASHBOARD_MAP` 이 `store_owner → /seller/overview` 로 보낸다.
- `/admin-vault` 는 `/admin` 에 걸리면 안 되므로 세그먼트 단위로만 일치시킨다.
- `/guide` `/forum` `/market-trial` 등 공개 페이지는 **업무 축이 아니므로** workspace 를 만들지 않고 home 으로 떨어뜨린다.
- **`/workspace/*` 는 의도적으로 매핑하지 않았다** — `SupplierOpsLayout` 에 role guard 가 없어 operator/admin 축으로 올리면 실제 강제보다 넓게 주장하게 된다.

---

## 5. validation 방식

기존 판정 함수·상수를 그대로 호출한다. 신규 권한 판정 0.

| 검사 | 재사용 대상 |
|---|---|
| 역할 | `hasAnyRole` (@o4o/auth-utils) + `lib/role-constants` 의 기존 배열 |
| 멤버십 | `isServiceAccessAllowed` (@o4o/auth-utils) — MembershipGate 와 **동일 함수**. `platform:super_admin` bypass 포함 |
| 대표 role | `NETURE_ROLE_PRIORITY` (config/dashboard) |

판정 순서: route → 인증 → 역할 → 멤버십 → 매장 식별자.

**Work Scope 는 화면 이동을 결정하지 않는다.** 권한이 없으면 workspace 는 그대로 두고
`status='none'` + `reason` 으로 비활성만 표시한다. redirect/403 은 기존 guard 소관 그대로다.

---

## 6. active scope 저장 방식

- **파생이 원칙.** `(route + 인증 상태) → scope` 를 매 렌더 계산한다. 저장된 scope 를 신뢰하면 권한 변경 후 낡은 값이 남는다.
- `WorkScopeProvider` (React context) = §7 우선순위 1번. **DB 저장 0 / migration 0.**
- `sessionStorage['o4o.workScope.lastWorkspace']` 는 "마지막으로 확정된 업무 축"을 **표시 목적**으로만 보관한다. 인가 입력이 아니며 없거나 오염돼도 판정에 영향이 없다(try/catch).
- 개발 환경에서만 `window.__O4O_WORK_SCOPE__` + `console.info` 노출 (`import.meta.env.DEV`). 프로덕션 번들 미포함.

---

## 7. auth / membership 재사용 여부

```text
신규 권한 체계         0
신규 permission 테이블  0
신규 role 문자열        0
DB migration           0
공통 package 수정       0
package.json 변경       0
```

`@o4o/security-core` 의 prefix↔canonical 변환은 **백엔드 전용 패키지**라 web-neture 에서 import 하지 않았다
(프런트 어느 서비스도 의존하지 않으며, 추가하면 dependency 변경 = CLAUDE.md 중지 조건).
Neture 는 self-map 이라 V0 에 변환이 불필요하다. cross-service resolver 를 만들 때 재검토 대상이다.

---

## 8. 변경 파일

신규 (5):

```text
services/web-neture/src/lib/work-scope/types.ts
services/web-neture/src/lib/work-scope/routeWorkspaceMap.ts
services/web-neture/src/lib/work-scope/resolveWorkScope.ts
services/web-neture/src/lib/work-scope/index.ts
services/web-neture/src/contexts/WorkScopeContext.tsx
```

수정 (2):

```text
services/web-neture/src/contexts/index.ts   — WorkScopeProvider / useWorkScope export 1줄
services/web-neture/src/App.tsx             — import 1줄 + BrowserRouter 안에 Provider 래핑
```

**화면·route·guard 동작 변경 0.** Provider 는 렌더 트리에만 들어가고 UI 를 그리지 않는다.

---

## 9. test / type-check / build

**resolver 시나리오 하네스 23건 전부 PASS** (§17 전 항목 + 경계 케이스). 검증 후 하네스 파일은 삭제(커밋하지 않음).

| 시나리오 | 결과 |
|---|---|
| 비로그인 `/` → home / `/community` → community | resolved |
| 비로그인 `/supplier/dashboard` | none · `UNAUTHENTICATED` |
| 로그인 `/` → home 유지 | resolved |
| supplier/partner/operator/admin 각 축 | resolved (+`draft`) |
| 일반 유저 → supplier/operator/admin | none · `ROLE_NOT_GRANTED` |
| supplier → `/admin` | none · `ROLE_NOT_GRANTED` |
| operator membership `pending` | none · `MEMBERSHIP_NOT_ACTIVE` |
| `platform:super_admin` membership 없음 → `/admin` | resolved (bypass 정상) |
| `/store/cart` · `/seller/overview` | none · `STORE_IDENTITY_SERVER_ONLY` |
| `/admin-vault` 가 `/admin` 에 오염되지 않음 | admin 축 정상 |
| `/guide` `/forum` `/workspace/hub` | home (기본값) |
| trailing slash `/operator/` | operator |

불변식: `organizationId`/`storeId` 항상 undefined · `executionMode==='cloud'` · local/browser capability 미부여.

```text
web-neture  npx tsc --noEmit                          PASS (exit 0)
web-neture  pnpm --filter @o4o/web-neture run build   PASS (built in 22.73s, exit 0)
```

주의(환경): `services/web-neture` 디렉터리에서 직접 `pnpm run build` 를 실행하면
`Volta error: pnpm is not available` 로 **exit 126** 이 난다. 저장소 루트에서
`VOLTA_FEATURE_PNPM=1 pnpm --filter @o4o/web-neture run build` 로 실행해야 한다.

---

## 10. production smoke

**미수행 — 조건 미충족.** WO §19 는 "이번 V0 가 UI/route 동작을 변경한다면" 프로덕션 smoke 를 요구한다.
이번 변경은 화면·route·guard 동작을 바꾸지 않는다(Provider 는 UI 를 그리지 않고, 기존 guard 판정에 개입하지 않는다).
따라서 §19 의 대안 경로인 **resolver 결과 검증**(위 9번 23건 + DEV 로그 노출)으로 대체했다.
deep link 복귀 계약(`state.from` → LoginModal `returnUrl`)은 기존 구현을 그대로 두었고 Work Scope 는 route 파생이므로 복귀 route 기준으로 자동 재계산된다.

배포 후 육안 확인이 필요하다면 Home(`/`) · `/community` · `/supplier` · `/partner` · `/operator` · `/admin` 진입만 확인하면 된다(기대: 이전과 동일).

---

## 11. 후속 작업

1. **중앙 AI 입력 연결 (Phase 3)** — `useWorkScope()` 가 연결점. 입력 → scope 확인 → AI 요청 주입.
2. **매장 scope 서버 해석 API** — `store-organization.resolver.ts` 를 프런트가 조회할 수 있는 read-only 엔드포인트. `resolved`/`none`/`ambiguous` 를 그대로 노출해야 `ambiguous` 에서 매장 선택 UI 를 띄울 수 있다. 이게 있어야 `storeId`/`organizationId` 가 채워진다.
3. **Work Scope 공통화** — 현재 web-neture thin 구현. KPA/GlycoPharm/K-Cosmetics/PharmacyHub 로 넓힐 때 `@o4o/auth-react` 승격 후보. 이때 `@o4o/security-core` 의 prefix↔canonical 변환이 필요해진다(Shared Module Change Protocol 대상).
4. **Neture organization 미연결 해소** — `O4O-ORGANIZATION-ROLE-STANDARD-V1 §4.4` 가 이미 지적한 유일한 미준수. Work Scope 의 store 축이 Neture 에서 확정되지 않는 근본 원인.
5. **`MembershipLike` 가 membership `role` 을 버리는 문제** — API 는 주는데 프런트 타입이 누락. scope 에 조직 역할을 담으려면 필요.
6. **`@o4o/auth-client` RBAC dead layer** — `user.assignments` 를 읽는데 `/auth/me` 는 주지 않는다. 되살리면 전부 `false`. 제거 또는 계약 정합 필요(별도 WO).
7. **`@o4o/capabilities` 의 `ServiceKey` 누락** — neture / pharmacy-hub / kpa-branch 부재.

---

## 12. 문서 정합

```text
문서 정합: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
```

- `docs/architecture/O4O-ORGANIZATION-ROLE-STANDARD-V1.md §4.4` — Neture organization 미연결을 이미 정확히 기록 중. 현행 유지(수정 불필요). 위 후속 4번으로 연결.
- `packages/capabilities/src/service-policy.ts` — `ServiceKey` 가 3개 서비스뿐. 문서가 아니라 코드 gap 이라 §16 인라인 대상 아님. 위 후속 7번으로 분리.

두 건 모두 판정·내용 변경이 필요해 **인라인 수정하지 않고 보고만** 한다 (§16-2 / §16-4).

---

## 13. 완료 기준 대조 (WO §22)

| 기준 | 결과 |
|---|---|
| Work Scope V0 계약 확정 | 충족 |
| 기존 Auth/Membership 재사용 | 충족 — 동일 함수·동일 상수 |
| 신규 권한체계 0 | 충족 |
| route → workspace mapping 존재 | 충족 — 10 규칙 + 기본값 |
| active Work Scope 표현 가능 | 충족 — `useWorkScope()` |
| 권한 없는 scope 차단 | 충족 — `status='none'` + reason |
| deep link 복귀 후 scope 정상 | 충족 — route 파생이라 복귀 route 기준 재계산 |
| Local execution mode 계약 포함 | 충족 — `ExecutionMode` (V0 는 'cloud' 고정) |
| AI / Local Agent 실제 실행 0 | 충족 |
| DB migration 0 | 충족 |
| type-check / build PASS | 충족 |
