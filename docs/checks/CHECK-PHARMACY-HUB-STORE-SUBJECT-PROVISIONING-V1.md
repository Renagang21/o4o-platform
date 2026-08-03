# CHECK-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1

> WO: `WO-PHARMACY-HUB-STORE-SUBJECT-PROVISIONING-V1`
> 선행 IR: [IR-O4O-PHARMACY-HUB-STORE-MANAGEMENT-BASELINE-AND-GAP-V1](../investigations/IR-O4O-PHARMACY-HUB-STORE-MANAGEMENT-BASELINE-AND-GAP-V1.md) §6-1
> 작성일: 2026-08-03 · 기준 브랜치: `main`

---

## 0. 결과 요약

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

*read-only 검증 + 코드 구현 · apply 는 §6 사유로 미실행*
