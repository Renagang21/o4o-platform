# CHECK-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1

> WO: `WO-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1`
> 선행 IR: [IR-O4O-PHARMACY-HUB-STORE-MANAGEMENT-BASELINE-AND-GAP-V1](../investigations/IR-O4O-PHARMACY-HUB-STORE-MANAGEMENT-BASELINE-AND-GAP-V1.md) §6-1
> 작성일: 2026-08-03 · 기준 브랜치: `main`

---

## 0. 결과 요약

> **2026-08-04 갱신** — `WO-PHARMACY-HUB-STORE-SLUG-SERVICE-KEY-TYPE-COMPLETION-AND-W1-RESUME-V1`
> 로 §6 중지 조건이 해소되어 **apply·post-verify·멱등성 재실행을 완료**했다.
> §1~§7 은 2026-08-03 시점 기록이며 **§8 이 현재 상태**다.
> **W1 은 아직 완료로 닫지 않았다** — `resolveStoreAccess()` 실증이 실패했다 (§8-5).

아래 표는 2026-08-03 시점 기록이다.

| 항목 | 결과 |
|---|---|
| 신규 승인 프로비저닝 구현 | **완료** (승인 컨트롤러 연결) |
| backfill dry-run | **완료** (프로덕션 read-only) |
| backfill **apply** | **미실행 — 중지 조건 발동** (§6) |
| DB 변경량 | **0** (INSERT/UPDATE/DELETE 0) |
| 모집단 (active + store_owner) | **2명** — 실사용자 **0**, 전부 테스트 계정 |
| 자동 처리 가능 | 1명 (E2E 픽스처) |
| 보류(HOLD) | 1명 (`AMBIGUOUS_ORGANIZATION`) |
| typecheck / build | **PASS** (api-server `tsc -p tsconfig.build.json`) |
| 공용 모듈 변경 | 2건 (§4) — 소비처 전수 확인 완료 |

---

## 1. 구현 내용

### 1-1. 신규 서비스

`apps/api-server/src/services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts`

멱등 5단계 (+ enrollment):

| 단계 | 대상 | 멱등 근거 |
|---|---|---|
| 1 | `organizations` | `ensureOrganization` `ON CONFLICT (code)` |
| 2 | `organization_members` (owner) | `ON CONFLICT (organization_id, user_id) DO NOTHING` |
| 3 | `organization_service_enrollments` (`pharmacy-hub`) | `ON CONFLICT (organization_id, service_code) DO NOTHING` |
| 4 | `role_assignments` (`pharmacy-hub:store_owner`) | 활성 확인 → 비활성 재활성화 → INSERT 3단계 |
| 5 | `platform_store_slugs` | `findByStoreId` 선조회 후 미존재 시에만 생성 |

> **3번(enrollment)은 WO 명시 5항목 밖의 추가**다. 조직을 재사용하는 경우
> "이 조직이 pharmacy-hub 에 참여한다"는 기록이 어디에도 남지 않아 운영자 매장 콘솔
> (`StoreConsoleController` 이 `organization_service_enrollments` 로 조직을 필터)에서
> 조회되지 않는다. GlycoPharm 선례(`ensureOrganizationWithOwnerAndService`)와 동일하며
> 멱등·additive 이므로 포함했다.

### 1-2. 조직 식별 전략 (재사용 우선)

```
1) organization_members(owner/admin/manager, left_at IS NULL) 가 정확히 1개  → 재사용
2) 0개 + businessInfo.businessNumber 일치 조직이 정확히 1개               → 재사용
3) 그 외                                                                  → 신규 생성
     code = ph-pharm-{userId 앞 12 hex}
```

**`kpa-pharm-{businessNumber}` 규칙을 쓸 수 없는 이유:** Pharmacy-Hub 가입 폼
([JoinPage.tsx](../../services/web-pharmacy-hub/src/pages/JoinPage.tsx))은 이메일·비밀번호·이름·
연락처·약국명만 받고 **사업자번호를 수집하지 않는다**. 사업자번호 없는 서비스의 선례는
GlycoPharm 이며 `gp-pharm-{userId 12 hex}` 라는 **사용자 스코프 결정적 코드**를 쓴다
([glycopharm-member.service.ts:154](../../apps/api-server/src/routes/glycopharm/services/glycopharm-member.service.ts#L154)).
동일 규칙을 채택했다 — 결정적이므로 재실행 시 `ON CONFLICT (code)` 가 같은 row 를 반환한다.

### 1-3. 보류(HOLD) 정책 — 추측으로 매장을 만들지 않는다

| 사유 | 조건 |
|---|---|
| `AMBIGUOUS_ORGANIZATION` | 소속 매장 조직 후보 2개 이상 |
| `DUPLICATE_BUSINESS_NUMBER` | 동일 사업자번호 조직 2개 이상 |
| `MISSING_STORE_NAME` | 약국명 없음 → 조직명 결정 불가 |
| `SLUG_UNRESOLVABLE` | slug 생성 실패 (조직·소유 관계는 유지, 재실행으로 복구) |

### 1-4. 승인 흐름 연결

[PharmacyHubMembershipConsoleController.approve](../../apps/api-server/src/controllers/pharmacy-hub/PharmacyHubMembershipConsoleController.ts)
— 승인 커밋 **후** 호출. 응답에 `data.storeSubject` 로 결과를 보고한다.

**실패 격리:** 프로비저닝 예외는 삼키고 승인은 성공 처리한다. 매장 주체 생성 실패가 회원 승인을
롤백해서는 안 된다 — KPA `member.controller.ts` pharmacy_owner auto-activation 과 동일 정책.

**공통 `MembershipApprovalService` 는 수정하지 않았다.** 이 서비스는 공통 운영자 콘솔
(`operator/MembershipConsoleController`)과 공유되므로, 여기에 pharmacy-hub 분기를 넣으면
KPA·K-Cosmetics 승인 경로에 회귀 위험이 생긴다. KPA 가 자기 컨트롤러에서 프로비저닝하는
구조와 동일하게 Pharmacy-Hub 컨트롤러에 두었다. → **기존 3서비스 승인 경로 코드 변경 0.**

### 1-5. backfill 스크립트

`apps/api-server/src/scripts/pharmacy-hub-store-subject-provisioning.ts`
— `--mode=dry-run | apply | post-verify`

같은 서비스 클래스를 재사용한다(로직 이중화 0). 서비스가 `DataSource` 를 주입받으므로
스크립트는 slug entity 2종만 등록한 **경량 DataSource** 를 쓴다.

---

## 2. dry-run 결과 (프로덕션, read-only)

채널: Cloud SQL Auth Proxy v2 → `o4o-platform-db` / `o4o_platform` (SELECT 전용)

### 2-1. 모집단

| service_key | role | status | 수 |
|---|---|---|---:|
| pharmacy-hub | operator | active | 1 |
| pharmacy-hub | **store_owner** | **active** | **2** |
| pharmacy-hub | store_owner | rejected | 1 |
| pharmacy-hub | supplier | active | 1 |

**backfill 대상 = 2명.**

### 2-2. 대상별 판정

| # | user_id | 계정 | 약국명 | 사업자번호 | 후보 조직 | 판정 |
|---|---|---|---|---|---:|---|
| 1 | `5ee37566…e014` | `e2e.test.pharmacyhub.owner.active@example.com` (E2E 픽스처) | `[E2E_TEST] Pharmacy-Hub 검증약국 A` | 없음 | **0** | **created** — `ph-pharm-5ee375662a51` 신규 생성 예정 |
| 2 | `6967ebe0…3cef` | `renagang21@gmail.com` (다역할 테스트 계정) | 테스트약국 | 1088699992 | **3** | **held** — `AMBIGUOUS_ORGANIZATION` |

**#2 의 후보 조직 3개:**

| organization_id | code | name | type | member role |
|---|---|---|---|---|
| `9c87f46b…ce96` | `kpa-pharm-1088602873` | 테스트 약국 | pharmacy | owner |
| `83ff96c7…be86` | `KCOSA3DDC841B946` | 테스트 뷰티샵 | store | owner |
| `95aad740…61d2` | `neture-supplier-6967ebe0` | (주)네뚜레 공급자 테스트 | supplier | owner |

> **주의 — 기존 결함 발견:** `resolveStoreAccess()` 는
> `... role IN ('owner','admin','manager') AND left_at IS NULL **LIMIT 1**` 을 `ORDER BY` 없이
> 실행한다. 후보가 3개인 이 사용자는 **이미 오늘도 어느 조직이 잡힐지 비결정적**이다.
> 본 트랙은 4번째 조직을 추가하지 않고 보류한다. 이 비결정성 자체는 공통 유틸의 별도 결함으로
> 후속 판단이 필요하다(본 WO 범위 밖 — 공용 모듈 `store-owner.utils.ts`).
>
> 또한 이 사용자의 `businessInfo.businessNumber`(1088699992)와 KPA 조직 code 의
> 사업자번호(1088602873)가 **불일치**한다. 테스트 계정 데이터 편차로 보이며, 보류 판정에는
> 영향이 없다(규칙 1 에서 이미 멈춘다).

### 2-3. 현재 상태 (변경 전)

| 지표 | 값 |
|---|---:|
| `platform_store_slugs` (pharmacy-hub) | 0 |
| `organization_service_enrollments` (pharmacy-hub) | 0 |
| `organizations` (`ph-pharm-%`) | 0 |
| `role_assignments` (`pharmacy-hub:store_owner`, active) | 2 (2명 모두 보유) |

→ role 은 이미 정합. **누락은 조직 축 전부.**

---

## 3. 발견·수정한 결함 (본 트랙 범위 내)

### 3-1. slug 생성 실패 — `generateSlugFromName` 이 밑줄을 통과시킨다

공통 [`generateSlugFromName`](../../packages/platform-core/src/store-identity/utils/slug-validation.ts#L99)
은 `[^\w…]` 로 필터해 **`_` 를 보존**하지만, `validateSlug` 의 `PATTERN`
(`[a-z0-9가-힯-]`)은 밑줄을 거부한다. 따라서 이름에 `_` 가 있으면 base 도 `-1`…`-100`
접미사도 전부 `INVALID_CHARACTERS` 가 되어 `generateUniqueSlug` 가 100회 시도 후 throw 한다.

대상 #1 의 약국명 `[E2E_TEST] …` 이 정확히 이 경우다. 실측:

```
name="[E2E_TEST] Pharmacy-Hub 검증약국 A"
  현재 공통유틸 : "e2e_test-pharmacy-hub-검증약국-a"  valid=false   ← throw
  slugBase 적용 : "e2e-test-pharmacy-hub-검증약국-a"  valid=true
name="테스트약국"        → "테스트약국"                 valid=true
name="__" (극단)         → "ph-pharm-aaaabbbbcccc"      valid=true  (fallback)
```

**조치:** 공통 유틸의 동작은 **바꾸지 않았다** — KPA/GP/K-Cos 의 기존 slug 생성 결과가
달라지기 때문이다. 대신 본 서비스에서 입력 base 만 미리 정규화(`slugBase`)해 넘기고,
정규화 결과가 3자 미만이면 조직 code 를 fallback 으로 쓴다.

> 공통 유틸 자체의 `_` 처리 불일치는 남아 있다 → 별도 WO 후보.

### 3-2. `role_assignments` 유니크 제약 함정 회피

`RoleAssignmentService.assignRole()` 은 `findOne({userId, role})` 후 `isActive=true` 로
저장한다. 그러나 실제 제약은 `unique_active_role_per_user UNIQUE (user_id, role, is_active)`
이라, 비활성 row 가 있는 상태에서 이 경로는 23505 를 유발할 수 있다
(`MembershipApprovalService` 가 §4.3 주석으로 명시한 함정).

본 서비스는 `MembershipApprovalService.activateRoleAssignment` 와 **동일한 3단계 순서**
(활성 확인 → 비활성 재활성화 → INSERT)를 raw SQL 로 따른다.

---

## 4. 공용 모듈 변경 (Shared Module Change Protocol)

| 파일 | 변경 | 성격 |
|---|---|---|
| `packages/platform-core/src/store-identity/entities/platform-store-slug.entity.ts` | `StoreSlugServiceKey` 에 `'pharmacy-hub'` 추가 | additive union 확장 |
| `packages/platform-core/src/store-policy/entities/platform-store-policy.entity.ts` | `StorePolicyServiceKey` 에 `'pharmacy-hub'` 추가 | 동일 |

**두 번째 변경은 첫 번째가 유발했다.** 첫 변경만 넣고 빌드했을 때:

```
src/routes/platform/store-policy.routes.ts(147,78): error TS2345:
  Argument of type 'StoreSlugServiceKey' is not assignable to parameter of type 'StorePolicyServiceKey'.
```

`store-policy.routes.ts:147` 이 `slugRecord.serviceKey` 를 그대로 `getActivePolicy()` 에
넘긴다. 두 union 은 entity 주석("Service keys for policy ownership — **same as slug**")대로
**동일 집합을 유지해야 하는 계약**이며, 한쪽만 넓히면 그 지점이 깨진다.

**소비처 전수 확인 (`services` + `packages` + `apps`, dist 제외):**

| 소비처 | 사용 형태 |
|---|---|
| `apps/api-server/.../foreign-visitor-partner-qr-code.routes.ts:296` | `as StoreSlugServiceKey` pass-through |
| `apps/api-server/.../store-hub.controller.ts:423,486` | `as StoreSlugServiceKey` pass-through |
| `apps/api-server/.../store-policy.routes.ts:147` | slug→policy 전달 (위 계약) |

- 프론트엔드(`services/*`) 소비처 **0**.
- exhaustive `switch` **0** → 분기 누락 회귀 없음.
- DB 컬럼은 양쪽 다 `varchar(50)` → **스키마 변경·migration 불필요**.
- `apps/api-server` 전체 빌드 **PASS**.

---

## 5. 검증 결과

| WO 필수 검증 | 결과 |
|---|---|
| 신규 승인 1건 → org/member/membership/role/slug/resolveStoreAccess | **미검증 — apply 미실행** (§6) |
| 동일 승인 재실행 시 추가 생성 0 | **설계 보장** (5단계 전부 멱등, §1-1) · 실행 검증 미완 |
| backfill 재실행 시 추가 변경 0 | 동일 |
| 조직·owner membership·slug 중복 0 | dry-run 시점 기준 **0** (§2-3) |
| 다른 서비스 조직을 잘못 재사용하지 않음 | **보장** — 후보 2개 이상이면 HOLD (실제 #2 에서 발동) |
| 기존 ACTIVE 대상 누락 0 | 모집단 2/2 판정 완료 |
| Pharmacy-Hub 상품·장바구니·주문·결제 회귀 0 | **코드 변경 0** — 해당 컨트롤러·라우트 무수정 |
| KPA·K-Cosmetics 회귀 0 | **코드 변경 0** — 공통 `MembershipApprovalService` 무수정 (§1-4), 공용 union 은 additive (§4) |
| 신규 전용 테이블 0 | **0** — migration 0, 신규 entity 0 |
| typecheck | api-server `tsc -p tsconfig.build.json` **PASS** |

**기존 결함(본 트랙 무관, 미수정):**

- `src/scripts/audit-roles.ts:66,80` — `Record<ServiceKey|'none', number>` 에 `'pharmacy-hub'`
  누락. `ServiceKey` 는 Foundation 커밋(`489f497de`)에서 이미 확장됐고 이 스크립트만
  미갱신. 본 트랙 이전부터 존재.
- 로컬 vitest 는 entity 그래프 로드 단계에서 실패 (`emitDecoratorMetadata` 미지원).
  본 트랙과 무관한 파일(`store-settings-template.test.ts`)도 동일하게 실패함을 확인.

---

## 6. 중지 조건 발동 — apply 미실행

WO 중지 조건: *"다음이면 apply하지 말고 보고한다."*

### 6-1. 발동 사유 ①: 대상 #2 는 규칙상 보류

`AMBIGUOUS_ORGANIZATION` — "한 사용자에게 Pharmacy-Hub 매장 후보가 둘 이상 존재"에 정확히
해당한다 (§2-2). 이 건은 **설계된 보류**이며 코드가 자동으로 건너뛴다.

### 6-2. 발동 사유 ②: 대상 #1 을 **구현한 코드 경로로** 실행할 수 없다

`apps/api-server` 의 entity 그래프가 **로컬에서 로드 자체가 불가능**하다:

```
$ node -e "await import('./dist/database/entities.js')"
ReferenceError: Cannot access 'MediaList' before initialization
  at packages/digital-signage-core/dist/backend/entities/MediaListItem.entity.js:73
```

원인은 `@o4o-apps/digital-signage-core` 의 **상호 순환 value import** 이며,
CLAUDE.md §2 (FROZEN, "위반 시 API 서버 기동 실패")가 금지한 패턴 그대로다:

```ts
// MediaList.entity.ts:10,51
import { MediaListItem } from './MediaListItem.entity.js';
@OneToMany(() => MediaListItem, (item) => item.mediaList)

// MediaListItem.entity.ts:11,51
import { MediaList } from './MediaList.entity.js';
@ManyToOne(() => MediaList, (list) => list.items)
```

- 본 트랙 **이전부터 존재**하는 결함이다 (`dist/database/entities.js` 단독 import 도 실패).
- 서비스가 쓰는 `organizationOpsService` 는 `AppDataSource` → `entities.ts` 를 module scope
  에서 import 하므로, 경량 DataSource 로도 우회되지 않는다.
- 수정 대상은 **signage 도메인의 다른 패키지**이며 §2 FROZEN 영역이다 → 별도 WO 필요.

### 6-3. 왜 SQL 을 직접 쓰지 않았는가

동등한 SQL 을 손으로 실행하면 apply 는 되지만, **검증 대상인 코드가 실행되지 않는다**.
그렇게 만든 DB 상태는 "구현이 동작한다"는 증거가 되지 못하고, 오히려 미검증 코드가
검증된 것처럼 보이게 만든다. WO 의 목적(구현 + 검증)에 반하므로 하지 않았다.

`organizationOpsService` 의 SQL 을 서비스 안에 인라인 복제하면 실행은 가능하지만,
`ensureOrganization` 의 camelCase quoted 컬럼·`$8` path 파라미터 같은 문서화된 함정까지
복제되어 조직 프로비저닝 SSOT 가 둘로 갈라진다. 로컬 툴체인 결함을 이유로 공용 SSOT 를
쪼개는 것은 잘못된 트레이드오프라 판단했다.

### 6-4. 실무 영향

**Pharmacy-Hub 실사용 약국 경영자는 0명이다.** 모집단 2명은 모두 테스트 계정
(E2E 픽스처 1 + 다역할 테스트 계정 1). backfill 지연의 운영 영향은 없다.

**신규 승인 경로는 이미 연결돼 있으므로**, 배포 후 새로 승인되는 약국 경영자는
자동으로 매장 주체를 갖는다. 프로덕션 서버는 정상 기동하므로(현재 LIVE) 승인 경로에는
6-2 의 로컬 제약이 적용되지 않는다.

### 6-5. 남은 작업

```
1. (선행) digital-signage-core ESM 순환 참조 §2 정합 WO
      MediaList ↔ MediaListItem 를 import type + 문자열 참조로 교체
2. backfill apply + post-verify 재개 (대상 #1)
3. 대상 #2 는 운영자가 매장 조직을 지정한 뒤 수동 재실행
4. (별도) resolveStoreAccess() LIMIT 1 비결정성 정책 판단
5. (별도) generateSlugFromName 의 '_' 처리 불일치
```

---

## 7. 변경 파일

```
packages/platform-core/src/store-identity/entities/platform-store-slug.entity.ts   (union +1)
packages/platform-core/src/store-policy/entities/platform-store-policy.entity.ts   (union +1)
apps/api-server/src/services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts   (신규)
apps/api-server/src/scripts/pharmacy-hub-store-subject-provisioning.ts             (신규)
apps/api-server/src/controllers/pharmacy-hub/PharmacyHubMembershipConsoleController.ts (승인 후 훅)
docs/checks/CHECK-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1.md                    (본 문서)
```

migration 0 · 신규 테이블 0 · DB write 0 · 배포 0

---

## 8. W1 재개 (2026-08-04)

> WO: `WO-PHARMACY-HUB-STORE-SLUG-SERVICE-KEY-TYPE-COMPLETION-AND-W1-RESUME-V1`
> 선행 해소: `CHECK-O4O-DIGITAL-SIGNAGE-ENTITY-CIRCULAR-IMPORT-REMOVAL-V1` (commit `4c5f08aee`)
> → §6-2 의 `ReferenceError: Cannot access 'MediaList' before initialization` 해소, §6-5 의 1번 완료.

### 8-0. 재개 결과 요약

| 항목 | 결과 |
|---|---|
| 범위 A — 타입 계약 정합 | **이미 정합 · 소스 변경 0** (§8-1) |
| backfill dry-run 재실행 | **PASS** — 2026-08-03 판정과 동일 (§8-2) |
| backfill **apply** (E2E 계정 1건) | **완료** (§8-3) |
| post-verify | **PASS** (§8-4) |
| 멱등성 (동일 apply 재실행) | **PASS — 추가 생성 0** (§8-4) |
| `resolveStoreAccess()` organizationId 실증 | **FAIL — 차단 결함** (§8-5) |
| 신규 승인 프로비저닝 E2E | **미실행** (§8-6) |
| renagang21 | **무변경** — `AMBIGUOUS_ORGANIZATION` HOLD 유지 |
| schema / migration / 신규 테이블 | **0 / 0 / 0** |
| **W1 완료 여부** | **미완료** — WO 완료 기준 5 불충족 (§8-5) |

### 8-1. 범위 A — 타입 계약 (소스 변경 0)

WO 가 전제한 `StoreSlugServiceKey` 의 `pharmacy-hub` 누락은 **소스에는 존재하지 않았다.**
두 union 은 Foundation 커밋 시점(§4)부터 이미 `'pharmacy-hub'` 를 포함한다.

| union | 위치 | 현재 값 |
|---|---|---|
| `StoreSlugServiceKey` | `platform-store-slug.entity.ts:31-36` | `glycopharm \| cosmetics \| kpa \| neture \| pharmacy-hub` |
| `StorePolicyServiceKey` | `platform-store-policy.entity.ts:31-36` | 동일 집합 |

- 보고된 TS2322 은 **`packages/platform-core/dist` 의 stale 산출물**이 원인이었다.
  재빌드 후 `npx tsc --noEmit -p tsconfig.build.json` **EXIT 0**.
- DB 컬럼은 양쪽 모두 `varchar(50)` — **enum 아님 → migration 불필요**.
- exhaustive switch 소비처 없음 (union 은 값 비교·전달에만 사용).
- KPA·GlycoPharm·K-Cosmetics 는 additive union 이므로 **동작 불변**.

> **미정합 잔존 1건 (본 WO 범위 밖, 미수정):** `src/scripts/audit-roles.ts:66,80` 의
> `Record<ServiceKey|'none', number>` 에 `'pharmacy-hub'` 누락 (§5 에 기록된 기존 결함).
> 운영 경로가 아닌 감사 스크립트이며 W1 판정에 영향 없다.

### 8-2. dry-run 재실행 (프로덕션)

실행 경로: `PharmacyHubStoreProvisioningService.provisionStoreSubject(userId, …, dryRun=true)`
— dry-run·apply·post-verify가 **동일 판정 로직**을 사용한다 (SQL 직접 실행 0).

```
모집단: active + pharmacy-hub:store_owner = 2명
  5ee37566…  → created   (E2E 테스트 계정, 후보 조직 0 → 신규 생성 대상)
  6967ebe0…  → held      HOLD:AMBIGUOUS_ORGANIZATION
                          후보 3: KCOSA3DDC841B946 / neture-supplier-6967ebe0 / kpa-pharm-1088602873
```

2026-08-03 dry-run 판정(§2-2)과 **완전히 일치**한다.

### 8-3. apply — E2E 계정 1건 (사용자 승인 후 실행)

```
5ee37566…  created
  org  = c5e3a37a-4aac-4b89-ab51-1a88b960ed50   code = ph-pharm-5ee375662a51
  slug = e2e-test-pharmacy-hub-검증약국-a
```

| 테이블 | 생성 | 검증 |
|---|:--:|---|
| `organizations` | 1 | `type=pharmacy`, `isActive=true` |
| `organization_members` | 1 | `role=owner`, `is_primary=true`, `left_at IS NULL` |
| `organization_service_enrollments` | 1 | `service_code=pharmacy-hub`, `status=active` |
| `role_assignments` | 0 | 기존 활성 행 재사용 (멱등 3단계, §1-1) |
| `platform_store_slugs` | 1 | `is_active=true` |

당일 전체 write 총량 = **1 / 1 / 1 / 1 / 0** (위 5테이블 외 write 0).
renagang21 의 organization_members 3건은 `joined_at` 2026-05·06 그대로 **무변경**.

### 8-4. post-verify · 멱등성

| 검사 | 결과 |
|---|---|
| 모집단 정합 | 1 / 2 — 불일치 1은 renagang21 (설계된 HOLD) |
| 조직 중복 | 0 |
| owner membership 중복 | 0 |
| enrollment 중복 | 0 |
| slug 중복 | 0 |
| `ph-pharm-*` 조직 / enrollment / slug | 1 / 1 / 1 |
| **동일 apply 재실행** | **`noop` — 생성 카운터 전부 0** |

### 8-5. **차단 결함 — `resolveStoreAccess()` 가 organizationId 를 반환하지 못한다**

apply 로 DB 상태는 정상인데도 프로덕션 실행 결과가 `null` 이다.

```
role_assignments      : [{"role":"pharmacy-hub:store_owner","is_active":true}]
organization_members  : [{"organization_id":"c5e3a37a-…","role":"owner","left_at":null}]

isStoreOwner(serviceKey 없음)       = {"isOwner":false,"organizationId":null,"memberRole":""}
resolveStoreAccess(serviceKey 없음) = null
resolveStoreAccess('kpa')           = null
resolveStoreAccess('glycopharm')    = null
resolveStoreAccess('cosmetics')     = null
```

**원인** — `apps/api-server/src/utils/store-owner.utils.ts:36-40`:

```ts
const STORE_OWNER_ROLES_BY_SERVICE = {
  kpa:        ['kpa:store_owner'],
  glycopharm: ['glycopharm:store_owner'],
  cosmetics:  ['cosmetics:store_owner'],
} as const;                       // ← 'pharmacy-hub' 항목이 없다
```

`isStoreOwner()` 는 **먼저** `role_assignments` 가 `allowedRoles` 에 속하는지 확인하고,
통과한 뒤에야 `organization_members` 를 조회한다. `pharmacy-hub:store_owner` 가
`ALL_STORE_OWNER_ROLES` 에 없으므로 **조직 조회 이전에 false 로 종료**된다.
`STORE_OWNER_SCOPE_TO_MEMBERSHIP_KEY` 도 동일하게 `pharmacy-hub` 가 없다.

→ WO 완료 기준 5 (`resolveStoreAccess()` organizationId 실증) **불충족**.
→ WO 중요 판정 *"단일 organization_members 대상에서도 잘못된 organizationId 반환 … 이면
   W1 완료로 닫지 않는다"* 에 해당 → **W1 미완료로 유지**한다.

**이번 WO 에서 고치지 않은 이유:** 이 registry 는 공통 권한 맵이며,
back-compat(serviceKey 미지정) 경로를 통해 아래 공통 매장 라우트의 접근 범위를 동시에 넓힌다.
CLAUDE.md *Shared Module / Core+Extension Change Rule* 상 단독 판단으로 확장할 수 없다.

```
routes/platform/store-local-product.routes.ts:125,219,278
routes/platform/store-handled-products.routes.ts
routes/platform/store-tablet.routes.ts:215
modules/store/store-library.routes.ts:32
modules/store-ai/controllers/*
modules/store-entitlement/store-entitlement.routes.ts:147,184
middleware/auth/auth-context.middleware.ts:38,77
```

> **Pharmacy-Hub B2B 기능에는 영향이 없다.** `routes/pharmacy-hub/pharmacy-hub.routes.ts`
> 의 상품·장바구니·주문·결제(`/store-owner/*`)는 `requirePharmacyHubScope('pharmacy-hub:store_owner')`
> 로 보호되며 `resolveStoreAccess()` 를 쓰지 않는다. 이번 갭은 **공통 매장 기능
> (자료함·태블릿·로컬상품·AI) 진입 시점**에 드러난다.

**후속 판단 필요 (별도 WO):** `STORE_OWNER_ROLES_BY_SERVICE` /
`STORE_OWNER_SCOPE_TO_MEMBERSHIP_KEY` 에 `pharmacy-hub` 를 추가할지, 소비처 전수 영향
검토와 함께 결정한다.

### 8-6. 미실행 항목

| 항목 | 사유 |
|---|---|
| 신규 승인 프로비저닝 E2E | 프로덕션에 신규 테스트 사용자 생성이 필요하다. WO 는 *"운영 데이터에 영향을 줄 수 있으면 픽스처·트랜잭션 롤백"* 을 요구하나, `provisionStoreSubject` 가 **자체 queryRunner 를 열어** 외부 트랜잭션 롤백 픽스처로는 커밋 전 행을 관측할 수 없다. 별도 안전 설계 필요. |
| 공통 매장 기능 회귀 | §8-5 미해결 상태에서는 Pharmacy-Hub 매장주가 애초에 진입 불가 — 회귀 대상이 아직 없다. |
| B2B 회귀 (상품·장바구니·주문·결제) | **코드 변경 0** — 해당 라우트·컨트롤러 무수정, 가드 경로 분리 확인(§8-5 인용). |
| KPA·GlycoPharm·K-Cosmetics slug 회귀 | **코드 변경 0** — union·guard·SSOT 무수정. |

### 8-7. 남은 작업 (§6-5 갱신)

```
1. [완료] digital-signage-core ESM 순환 참조 정합            → 4c5f08aee
2. [완료] backfill apply + post-verify (대상 #1)             → §8-3, §8-4
3. [대기] 대상 #2(renagang21) 는 운영자가 매장 조직 지정 후 재실행
4. [신규·차단] store-owner.utils.ts 권한 맵에 pharmacy-hub 반영 판단  → §8-5
5. [대기] 신규 승인 E2E 안전 실행 설계                        → §8-6
6. [별도] resolveStoreAccess() LIMIT 1 비결정성 정책 판단 (renagang21 같은 다중 조직 사용자)
7. [별도] generateSlugFromName 의 '_' 처리 불일치
```

### 8-8. 변경 파일 (본 재개분)

```
docs/checks/CHECK-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1.md   (§0 노트 + §8 추가)
```

소스 변경 0 · migration 0 · 신규 테이블 0 · 배포 0 · DB write = §8-3 의 4행뿐

---

*§1~§7: 2026-08-03 read-only 검증 + 코드 구현 · §8: 2026-08-04 apply·검증 재개*
