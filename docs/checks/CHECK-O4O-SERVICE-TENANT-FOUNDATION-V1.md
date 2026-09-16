# CHECK-O4O-SERVICE-TENANT-FOUNDATION-V1

> **WO**: `WO-O4O-SERVICE-TENANT-FOUNDATION-V1`
> **일자**: 2026-09-16 · **기준 main**: `3de6adf6f` (Partner 트랙 CLOSED 직후)
> **성격**: Foundation + 최소 읽기 계약. UI 없음 · 새 테이블 없음 · migration 없음 · 프로덕션 write 없음.
> **상위 기준**: [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md) §3 · §4 · §4-1(이번 WO 로 추가) · §9-1

---

## 0. 한 줄 결론

`platform_services` 의 모든 서비스가 자동으로 `My Services` 에 노출되는 구조를 **막았다**. Service Identity(무엇이 서비스인가)와 Service Workspace(어디에 노출되는가)를 분리해, Identity 는 기존 catalog 하나를 정본으로 재사용하고, Workspace 는 catalog 에 붙인 **별도 metadata**(`workspaceMode` · `storeWorkspaceEnabled` · `operatorWorkspaceEnabled`) 로 두었다. Store↔Service · Operator↔Service 관계는 기존 3개 테이블을 **그대로** 읽는 resolver 와 read-only endpoint 2개로 고정했다.

---

## 1. Fresh Census (§3)

### 1-1. 코드 (origin/main `3de6adf6f`)

| 축 | 위치 | 판정 |
|---|---|---|
| Service Identity | `apps/api-server/src/config/service-catalog.ts` `O4O_SERVICES` (neture · kpa-society · k-cosmetics · pharmacy-hub · kpa-branch · cafe24-b2b) | canonical 집합 = `platform_services.code` canonical 행과 일치. **재사용** |
| Identity 정규화 | `@o4o/security-core` `ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY` (`kpa→kpa-society` · `cosmetics→k-cosmetics`) + `resolveCanonicalServiceKey` / `resolveRolePrefixFromCanonicalServiceKey` | 정의 1곳. **재사용** (신규 매핑 0) |
| `PlatformService.service_type` | `community \| tool \| extension` | Workspace 와 **다른 축**. 변경 없음 |
| Store ↔ Service | `organization_service_enrollments` (UNIQUE(organization_id, service_code), status varchar) | 1:N 이미 표현. **재사용** |
| Store 소유 해석 | `utils/store-organization.resolver.ts` `findAnyServiceStoreOrganizationCandidates` · `STORE_MEMBER_ROLES` · WorkScope `resolved\|none\|ambiguous` | **재사용** (신규 자동선택 규칙 0) |
| Operator ↔ Service | `role_assignments`(`{prefix}:admin` · `{prefix}:operator`) + `service_memberships.status='active'` (`membership-guard.middleware.ts` 정책) | **재사용** (`getServiceMembershipStatusFromDb`) |
| 기존 서비스 노출 API | `/api/v1/platform-services` (`listVisibleServicesForUser`) | 사용자 개인 membership 기준. Store 기준 목록은 없었음 → 이번 WO 가 `/work-scope` 에 추가 |
| 기존 서비스별 분기 | `neture-home-entry.controller.ts` `STORE_CAPABLE_SERVICES` · `store-owner.utils.ts` `STORE_OWNER_ROLES_BY_SERVICE` | 기존 것. 이번 WO 미변경(범위 외 · 후속 정렬 후보로 §6 에 기록) |

### 1-2. 프로덕션 read-only (2026-09-16 · cloud-sql-proxy · SELECT 만)

| 대상 | 결과 |
|---|---|
| `platform_services` | 9행 전부 active: cafe24-b2b(tool) · cosmetics(tool) · k-cosmetics(extension) · kpa(tool) · kpa-branch(community) · kpa-groupbuy(tool) · kpa-society(community) · neture(community) · pharmacy-hub(community) |
| `organization_service_enrollments` (active) | k-cosmetics 2 · kpa-society 7 · neture 3 · pharmacy-hub 8 — alias 코드 행 0 · inactive 행 0 |
| 2개 이상 active enrollment 를 가진 org | **0** (§15: 실 사례 부재는 실패가 아님) |
| `service_memberships` (active) | k-cosmetics 5 · kpa-branch 3 · kpa-society 6 · neture 7 · pharmacy-hub 10(+rejected 1) · platform 7 |
| `role_assignments` active admin/operator | cosmetics 1+1 · kpa 1+2 · kpa-branch 0+1 · neture 1+1 · pharmacy-hub 2+2 · platform:super_admin 3 |
| 2개 이상 서비스의 admin/operator 를 가진 사용자 | **1** (1 Operator : N Services 실 사례 존재) |
| `platform_store_slugs` (active) | cosmetics 2 · kpa 7 · pharmacy-hub 8 |

관찰: `platform_services` 의 `kpa` · `cosmetics` 행은 canonical 행과 **별도 identity 가 아니라 alias** 이며 enrollment 에는 쓰이지 않는다. `kpa-groupbuy` 는 제품 도메인 키이지 서비스 identity 가 아니다. `neture` 는 enrollment 3건이 있지만 매장 workspace 대상이 아니다(§2).

---

## 2. Service 분류표 (§6 · §17)

| Service | Identity | Store enrollment | Operator scope | Workspace 판정 | 근거 |
|---|---|---|---|---|---|
| `neture` | canonical (community) | 3 active (공급자 org 성격) | neture:admin 1 · operator 1 | **SPECIAL** — `special / store=false / operator=true` | 대표 진입 서비스(`REPRESENTATIVE_ENTRY_SERVICE_KEY`) · 공급자 workspace 축. 매장 My Services 항목 아님 |
| `kpa-society` | canonical (community) · alias `kpa` | 7 active | kpa:admin 1 · operator 2 | **STANDARD_CANDIDATE** — `standard / true / true` | store slug 7 · `STORE_CAPABLE_SERVICES` 포함 · store_owner role 존재 |
| `k-cosmetics` | canonical (extension) · alias `cosmetics` | 2 active | cosmetics:admin 1 · operator 1 | **STANDARD_CANDIDATE** — `standard / true / true` | store slug 2 · `STORE_CAPABLE_SERVICES` 포함 |
| `pharmacy-hub` | canonical (community) | 8 active | pharmacy-hub:admin 2 · operator 2 | **STANDARD_CANDIDATE** — `standard / true / true` | store slug 8 · `PHARMACY_HUB_SCOPE_CONFIG` store_owner 존재 |
| `kpa-branch` | canonical (community) | 0 | kpa-branch:operator 1 | **NO_STORE_WORKSPACE** — `none / false / true` | 분회(조직) 서비스. 매장 개념 없음 · store slug 0 · 운영자 화면만 존재 |
| `cafe24-b2b` | canonical (tool) | 0 | 0 | **UNDECIDED** — `undecided / false / false` | provisioning 코드는 있으나 실 enrollment · role 0 · `STORE_CAPABLE_SERVICES` 제외. 사업 결정 전 노출 금지 |
| `kpa` · `cosmetics` | **alias** (독립 identity 아님) | — | (role prefix 로만 사용) | 판정 대상 아님 | `ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY` |
| `kpa-groupbuy` · `*-event-offer` | **identity 아님** (제품 도메인 키) | — | — | 판정 대상 아님 | `SERVICE_KEYS` 제품 레벨 · catalog 부재 |

STANDARD_CANDIDATE 는 "표준 Workspace 후보" 라는 기술 판정이며, Store Workspace 화면 구현 · 활성화는 후속 단계 WO 가 정한다. 코드가 사업 정책을 대신 결정하지 않는다.

---

## 3. 변경 내용 (§5 · §7 · §9 · §11 · §12 · §13)

### 3-1. 변경 파일 (WO 범위 6개)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/config/service-catalog.ts` | **additive**: `ServiceWorkspaceMode` · `ServiceWorkspaceCapability` · `UNDECIDED_SERVICE_WORKSPACE` · `O4OService.workspace?` · `getServiceWorkspaceCapability(key)`. 6개 서비스에 §2 값 부여. 기존 필드 · 순서 · `REPRESENTATIVE_ENTRY_SERVICE_KEY` 무변경 |
| `apps/api-server/src/utils/service-tenant.resolver.ts` | **신규**: `resolveServiceIdentity` · `foldEnrollmentsToStoreServices` · `resolveStoreServices` · `listEnrolledStoreOrganizationIds` · `resolveOperatorServices` |
| `apps/api-server/src/routes/work-scope.routes.ts` | 기존 `/api/v1/work-scope` namespace 에 `GET /store-services` · `GET /operator-services` 추가 (`requireAuth`, read-only, 200 shape) |
| `apps/api-server/src/__tests__/service-tenant-foundation.spec.ts` | **신규** 21 tests (§14) |
| `docs/baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md` | §4-1 Service Identity ≠ Service Workspace 추가 · §7 물리 정리 완료/CLOSED · §9-1 단계 순서 갱신 · 헤더 최종 갱신 |
| `docs/checks/CHECK-O4O-SERVICE-TENANT-FOUNDATION-V1.md` | 이 문서 |

### 3-2. 읽기 계약

```text
GET /api/v1/work-scope/store-services[?organizationId=<uuid>]
  → { success, data: { status: 'resolved'|'none'|'ambiguous', organizationId, services: StoreServiceMembership[], reason } }
  StoreServiceMembership = { organizationId, serviceKey, serviceName, enrollmentStatus, workspaceMode, workspaceAvailable }
  workspaceAvailable = enrollmentStatus==='active' && storeWorkspaceEnabled

GET /api/v1/work-scope/operator-services
  → { success, data: { services: OperatorServiceMembership[] } }
  OperatorServiceMembership = { serviceKey, serviceName, scope: 'admin'|'operator', workspaceMode, workspaceAvailable }
```

- `organizationId` 는 요청자가 `organization_members`(`owner|admin|manager`) 로 소유한 조직일 때만 해석한다. 아니면 `NOT_STORE_MEMBER` 로 끝나며 enrollment 를 조회하지 않는다.
- 조직 미지정 + 소유 매장 2개 이상 → `ambiguous / MULTIPLE_ACCESSIBLE_STORES` (기존 WorkScope 계약 재사용, 첫 번째 자동 선택 없음).
- Operator 는 `role_assignments`(active admin/operator) **AND** `service_memberships.status='active'` — membership guard 와 동일. `platform:super_admin` bypass 없음(노출 목록은 권한이 아니다).
- alias enrollment 코드는 canonical 로 접히고, canonical 집합 밖 코드는 목록에서 제외된다. active 가 inactive 를 이긴다.

### 3-3. 하지 않은 것 (§2 · §10)

- UI · My Services 화면 · 운영자 메뉴 · handoff payload 변경 없음 (`handoff.controller.ts` 는 명시 필드만 매핑 → `workspace` 누출 없음).
- 세 관계(enrollments · role_assignments+service_memberships · organization_members)를 합치지 않았다. 새 junction · membership 테이블 없음.
- `PlatformService.service_type` enum 무변경. `platform_services` schema 무변경.
- 프로덕션 enrollment · role · membership 생성 없음.
- 기존 `STORE_CAPABLE_SERVICES` · `STORE_OWNER_ROLES_BY_SERVICE` 는 건드리지 않았다 (§6 후속).

---

## 4. 검증 (§14)

| 항목 | 결과 |
|---|---|
| `service-tenant-foundation.spec.ts` (21) | **PASS** — Identity canonical/alias/unknown · catalog 전 서비스 workspace 명시 & mode 단일 아님 · `none`/`undecided` 노출 차단 · Store A(active 2 · inactive 1) 결정적 순서 · alias 접힘 · unknown 제외 · 타 매장 org → `NOT_STORE_MEMBER`(enrollment 질의 0) · 소유 org 지정 해석 · 다중 매장 `ambiguous` · 0 매장 `NO_ACCESSIBLE_STORE` · Service A ↔ Store A/B(alias 포함) · includeInactive · Operator X = A+B · membership 비active 제외 · super_admin/store_owner/미등록 prefix 제외 |
| `work-scope-store-resolution.spec.ts` (기존 12) | **PASS** (회귀 없음) |
| `tsc --noEmit` (api-server) | **PASS** (exit 0) |
| 프로덕션 endpoint smoke | **미실시** — 배포 전이며 이번 WO 는 UI 소비자가 없다. 배포 후 Content Boundary / Store Workspace 단계에서 실 계정으로 확인 |

---

## 5. Re-census (§18)

| 항목 | 값 | 확인 방법 |
|---|---|---|
| Service Identity source 중복 | **0** | canonical 집합 정의 = `O4O_SERVICES` 1곳 · 별칭 매핑 = `ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY` 1곳(grep 정의 1건) |
| Store↔Service junction 중복 | **0** | `organization_service_enrollments` entity 1개 · 신규 entity 0 |
| Workspace eligibility source 중복 | **0** | `workspaceMode` 정의 = `service-catalog.ts` 1곳(소비 = resolver · spec 만) |
| serviceKey 하드코딩 신규 분기 | **0** | WO 3개 코드 파일에 `=== '<serviceKey>'` 0건 |
| 새 membership/tenant table | **0** | migrations dir 신규 0 · manifest 무변경 |
| duplicate catalog | **0** | `O4O_SERVICES` 외 신규 서비스 목록 0 |

---

## 6. 후속 · 보고 (수정 안 함)

- `neture-home-entry.controller.ts` `STORE_CAPABLE_SERVICES` 와 `store-owner.utils.ts` `STORE_OWNER_ROLES_BY_SERVICE` 는 이번 metadata(`storeWorkspaceEnabled`)와 **의미가 겹친다**. 현재 값은 일치하지만(kpa-society · k-cosmetics · pharmacy-hub) 정본은 하나여야 한다 → Store Workspace 단계에서 catalog metadata 로 수렴하는 별도 WO 후보.
- `platform_services` 의 `kpa` · `cosmetics` · `kpa-groupbuy` 행 처분(비활성/정리)은 사업 판단 → 미결. 코드는 alias 로 흡수하므로 현 상태에서 오동작 없음.
- `cafe24-b2b` Workspace 판정 = UNDECIDED. 사업 결정 후 catalog metadata 1곳만 바꾸면 된다.
- 중지 조건(§19) 해당 없음.

---

## 7. Git

- 커밋: (본문 commit 해시는 push 후 보고에 기록) · path-specific stage · `check-staged-scope.mjs` 통과
- 완료 조건: WO 범위 미커밋 0 · `HEAD == origin/main`

---

```text
SERVICE_IDENTITY=PASS
STORE_SERVICE_RELATION=PASS
OPERATOR_SERVICE_RELATION=PASS
WORKSPACE_METADATA=PASS
NEW_CORE_TABLE=0
DB_WRITE=0
MIGRATION=0
SERVICE_CLASSIFICATION=neture:SPECIAL, kpa-society:STANDARD_CANDIDATE, k-cosmetics:STANDARD_CANDIDATE, pharmacy-hub:STANDARD_CANDIDATE, kpa-branch:NO_STORE_WORKSPACE, cafe24-b2b:UNDECIDED
NEXT=GO_CONTENT_BOUNDARY_ALIGNMENT
```
