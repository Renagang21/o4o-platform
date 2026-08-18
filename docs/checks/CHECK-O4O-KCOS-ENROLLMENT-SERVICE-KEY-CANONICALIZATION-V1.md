# CHECK-O4O-KCOS-ENROLLMENT-SERVICE-KEY-CANONICALIZATION-V1

- **WO**: `WO-O4O-KCOS-ENROLLMENT-SERVICE-KEY-CANONICALIZATION-V1`
- **일자**: 2026-08-18
- **기준 commit**: `40e3b3ac4`
- **대상 축**: `organization_service_enrollments.service_code` 의 K-Cosmetics service key
- **production write**: **0건** (§6 판정 = MERGE_REQUIRED → WO §8 자동 merge 금지 조항 적용)

---

## 1. 결론

K-Cos enrollment 의 canonical key 는 **`k-cosmetics`** 다. `cosmetics` 는 role/product-level 별칭이며
production 에는 **단 1행**만 남은 legacy 잔재다.

런타임 **write** 경로는 이미 전부 canonical(`k-cosmetics`)을 쓰고 있었다 — 신규 legacy write 는 0건이다.
문제는 **read** 쪽이었다. Event Offer 조직 해석기가 "KCos enrollment 는 `cosmetics` 로 적재된다"는
과거 관측을 계약으로 고정해 **legacy 행 1개에만 의존**하고 있었고(신규 K-Cos 조직은 해석 실패),
enrollment.service_code 를 OPL 로 그대로 복사하는 auto-listing 은 legacy 행에서
**비-canonical `service_key='cosmetics'` listing 을 새로 만들 수 있는 상태**였다.

→ read 3곳을 canonical 기준으로 정리했다. 데이터는 §6 판정에 따라 이번 WO 에서 변경하지 않았다.

---

## 2. Canonical key 판정 (근거)

| 근거 | 관측 | 판정 방향 |
|---|---|---|
| `resolveCanonicalServiceKey()` (security-core SSOT) | `cosmetics` → `k-cosmetics` | ENROLLMENT = `k-cosmetics` |
| **`platform_services`** (enrollment 의 FK 대상) | `cosmetics` = "Cosmetics Product Domain" `type='tool'` / `k-cosmetics` = "K-Cosmetics" `type='extension'` | `cosmetics` 는 서비스가 아니라 제품 도메인 |
| `service_memberships` (Identity V2) | `k-cosmetics` 5 active · `cosmetics` 0 | MEMBERSHIP = `k-cosmetics` |
| login `serviceKey` / membership guard | membership 축(`k-cosmetics`) 사용, enrollment 미참조 | 영향 없음 |
| `service_audience_policies` | `k-cosmetics` 존재 · `cosmetics` 0 | POLICY = `k-cosmetics` |
| KCos provisioning (`cosmetics-store.service.ts`) | `enrollService({ serviceCode: 'k-cosmetics' })` ×2 | WRITE = canonical |
| store-owner resolver (`STORE_SERVICE_ORG_LINKAGE`) | `enrollmentCodes: ['k-cosmetics','cosmetics']` (canonical 우선) | 별칭 호환은 read 한정 |
| 선례 | migration `20260411300000-NormalizeKpaServiceKeys`(`kpa`→`kpa-society` 표준화), backfill migration 2건이 `k-cosmetics` 적재 | 동일 축 정렬 |

### 축 표 (확정)

| 축 | key | 근거 |
|---|---|---|
| ROLE_SCOPE_KEY | **`cosmetics`** | `role_assignments.role` prefix (`cosmetics:*` 7건) |
| MEMBERSHIP_KEY | **`k-cosmetics`** | `service_memberships.service_key` |
| ENROLLMENT_KEY | **`k-cosmetics`** | `organization_service_enrollments.service_code` |
| SLUG_KEY | **`cosmetics`** | `platform_store_slugs.service_key` 실측 (별도 축 — 이번 범위 밖) |
| LISTING·POLICY_KEY | **`k-cosmetics`** | `organization_product_listings.service_key` · `service_audience_policies` |

---

## 3. production census (미조사 0)

`organization_service_enrollments` 전체 **21행 · 전부 `status='active'`**.

| service_code | 행 수 |
|---|---:|
| `kpa-society` | 7 |
| `pharmacy-hub` | 6 |
| `neture` | 3 |
| `glycopharm` | 2 |
| `k-cosmetics` | 2 |
| **`cosmetics`** | **1** |

**KCos 합계 3 / `cosmetics` 1 / `k-cosmetics` 2 / dual-key 조직 1 / duplicate 0 / orphan 0 / 미조사 0.**

별칭 후보 전수 확인: `service_code` 는 `platform_services(code)` 로의 FK 라 임의 alias 가 존재할 수 없다.
등록된 K-Cos 계열 코드는 `cosmetics` · `k-cosmetics` 둘뿐이며, `kpa` / `kpa-groupbuy` 별칭 행은 0건이다.

### 3-1. KCos 조직별 축 비교

| 조직 | enrollment | membership | role_assignments | platform_store_slugs | cosmetics_stores |
|---|---|---|---|---|---|
| `83ff96c7…` (테스트 뷰티샵) | `k-cosmetics` (2026-06-03) | `k-cosmetics` active | `cosmetics:store_owner` | `cosmetics` | — |
| `31e926a0…` (테스트 K-Cosmetics 매장) | **`cosmetics` (2026-05-17) + `k-cosmetics` (2026-05-26)** | 소유자 membership 없음 | 소유자 role 없음 | `cosmetics` (`test-kcos-store-owner`) | `62011f36…` approved |

legacy 행 `e874076f-1703-42e2-9e07-a97e4e8c168c` 의 생성 시각(12:09:27.544)은
같은 조직 `cosmetics_stores` 행의 생성 시각(12:09:27.566)과 사실상 동일하다 —
organization-service centralization 이전의 매장 생성 경로가 남긴 행이다. 현재 코드에는 해당 write 가 없다.

---

## 4. READ 경로 전수 census (미조사 0)

| # | 경로 | 사용 key | 분류 |
|---|---|---|---|
| 1 | `utils/store-organization.resolver.ts` (store-owner 조직 해석 SSOT) | `['k-cosmetics','cosmetics']` | ALIAS_COMPAT |
| 2 | `utils/store-owner.utils.ts` (`isStoreOwner` / `createRequireStoreOwner` / `resolveStoreAccess`) | 1번 위임 | ALIAS_COMPAT |
| 3 | `routes/platform/store-policy.ownership.ts` (My Store · 정책 · slug) | 1번 위임 | ALIAS_COMPAT |
| 4 | `controllers/operator/StoreConsoleController.ts` | `scope.serviceKeys`(=`resolveCanonicalServiceKey()` 산출) | CANONICAL |
| 5 | `controllers/operator/ProductConsoleController.ts` | 〃 | CANONICAL |
| 6 | `modules/store-core/services/store-channel.service.ts` | 〃 | CANONICAL |
| 7 | `modules/neture/guards/drug-access.guard.ts` (`organizationBelongsToService`) | 호출자 canonical serviceKey | CANONICAL |
| 8 | `utils/auto-listing.utils.ts` (PUBLIC 자동확산) | enrollment.service_code 를 **그대로 복사** | **LEGACY_WRONG → 수정** |
| 9 | `routes/kpa/helpers/event-offer-organization.helper.ts` | `SERVICE_KEYS.COSMETICS` 단일 | **LEGACY_WRONG → 수정** |
| 10 | `modules/neture/services/seller.service.ts#resolveServiceKey` | `LIMIT 1` (ORDER BY 없음) | **LEGACY_WRONG(비결정) → 수정** |
| 11 | `routes/glycopharm/**` (pharmacy-context · repository · report · operator-dashboard) | `'glycopharm'` 고정 | SERVICE_SPECIFIC |
| 12 | `routes/pharmacy-hub/**` · `services/pharmacy-hub/PharmacyHubStoreProvisioningService` | `'pharmacy-hub'` 고정 | SERVICE_SPECIFIC |
| 13 | `routes/kpa/services/operator-dashboard.service.ts` | `'kpa-society'` 고정 | SERVICE_SPECIFIC |
| 14 | `modules/platform/platform-hub.controller.ts` · `routes/platform/physical-store.service.ts` · `store-network.service.ts` | `'glycopharm'` 고정 | SERVICE_SPECIFIC |
| 15 | `modules/neture/controllers/operator-dashboard.controller.ts` | `'neture'` 고정 | SERVICE_SPECIFIC |
| 16 | login / service membership guard | enrollment 미참조 (`service_memberships` 축) | 해당 없음 |

---

## 5. WRITE 경로 전수 census (미조사 0)

런타임 write 는 **전부** `organizationOpsService.enrollService()`
(멱등 `ON CONFLICT (organization_id, service_code) DO NOTHING`)를 경유한다.

| 경로 | serviceCode | 판정 |
|---|---|---|
| `routes/cosmetics/services/cosmetics-store.service.ts` `createStoreWithOrg` | `'k-cosmetics'` | CANONICAL |
| 〃 `linkOwnerToStore` | `'k-cosmetics'` | CANONICAL |
| `routes/kpa/services/kpa-store-organization.provisioning.ts` · `routes/kpa/controllers/organization.controller.ts` | `KPA_CANONICAL_SERVICE_CODE` | CANONICAL |
| `routes/glycopharm/**` (admin 승인 · store-applications ×2 · member.service) | `'glycopharm'` | CANONICAL |
| `services/pharmacy-hub/PharmacyHubStoreProvisioningService` | `SERVICE_KEY` 상수 | CANONICAL |
| `modules/neture/services/supplier.service.ts` | `'neture'` | CANONICAL |
| migration `20260930000000-BackfillCosmeticsServiceEnrollments` | `'k-cosmetics'` | CANONICAL |
| migration `20261031000001-BackfillKCosmeticsSellerStoreContext` | `'k-cosmetics'` | CANONICAL |

**enrollment 에 `'cosmetics'` 를 쓰는 코드는 0건이다.**

---

## 6. production 데이터 판정 — **MERGE_REQUIRED (이번 WO 정리 없음)**

대상: `e874076f-1703-42e2-9e07-a97e4e8c168c` (org `31e926a0…`, `cosmetics`, active, config `{}`)

| 사전 확인 | 결과 |
|---|---|
| 대상 행 수 고정 | 1행 |
| organization 존재 | 존재 (`테스트 K-Cosmetics 매장`) |
| 동일 org 의 canonical 행 | **이미 존재** (`7387f53a…`, `k-cosmetics`, active, config `{}`) |
| status 충돌 | 없음 (양쪽 active) |
| config/metadata 충돌 | 없음 (양쪽 `{}`) |
| enrolled_at | legacy 2026-05-17 · canonical 2026-05-26 |
| 이 행을 참조하는 FK | **없음** (`organization_service_enrollments` 를 참조하는 제약 0건) |

`UPDATE cosmetics → k-cosmetics` 는 `UNIQUE (organization_id, service_code)` 위반이라 **불가능**하다.
따라서 SAFE_TO_NORMALIZE 가 아니라 **MERGE_REQUIRED** 이며,
WO §8 의 "동일 org 에 두 row 가 이미 있으면 자동 DELETE/merge 금지" 조항에 따라
**production write 0** 으로 종료한다.

**후속 승인용 정리안 (별도 WO):**

1. `UPDATE organization_service_enrollments SET enrolled_at = <legacy enrolled_at> WHERE id = '7387f53a…'` — 최초 가입 시점 보존
2. `DELETE FROM organization_service_enrollments WHERE id = 'e874076f…'`
   → 정보 손실 0 · 조직당 canonical active 1행

§7 코드 정리 이후 legacy 행은 **무해 상태**다: canonical 경로가 읽지 않고, auto-listing 복사에서 제외되며,
Event Offer 해석은 canonical 행으로도 동일 조직을 얻는다. 즉 이 정리는 correctness 가 아니라 위생 작업이다.

---

## 7. 수정 내역 (4파일 + 신규 spec)

| 파일 | 내용 |
|---|---|
| `apps/api-server/src/utils/listing-service-key.ts` | `NON_CANONICAL_ENROLLMENT_CODES` 추가 — security-core `ROLE_PREFIX_TO_CANONICAL_SERVICE_KEY` 의 **키를 그대로 파생**(새 로컬 맵 없음) |
| `apps/api-server/src/utils/auto-listing.utils.ts` | `autoExpandPublicProduct` 가 role/product-level 별칭 enrollment 행을 제외 → OPL 에 비-canonical `service_key` 신규 생성 차단. `autoExpandServiceProduct` 는 승인 키(canonical) 필터가 이미 있어 무변경 |
| `apps/api-server/src/routes/kpa/helpers/event-offer-organization.helper.ts` | K-Cos 조직 해석 키를 `SERVICE_KEYS.COSMETICS` 단일 → 공통 SSOT `STORE_SERVICE_ORG_LINKAGE.cosmetics.enrollmentCodes`(canonical 우선 + legacy 호환)로 교체. supplier 분기에 결정적 tiebreak 추가. 낡은 주석(“반드시 COSMETICS 로 질의”) 정정 |
| `apps/api-server/src/modules/neture/services/seller.service.ts` | `resolveServiceKey` 를 canonical 우선 + 결정적 `ORDER BY` 로 교정 (dual-key 조직 비결정 반환 제거) |
| `apps/api-server/src/__tests__/kcos-enrollment-service-key.spec.ts` (신규) | 회귀 10건 |

원칙 준수: 신규 write 는 canonical 전용 / alias fallback 은 read 최소 범위 /
**새 매핑 테이블·상수 맵 신설 0** (전부 기존 SSOT 파생) /
role key·membership·RBAC·schema·API contract·frontend 무변경.

---

## 8. 데이터 무결성

| 항목 | 결과 |
|---|---|
| 조직당 canonical active enrollment | 최대 1 (UNIQUE 제약으로 구조 보장) |
| legacy `cosmetics` 잔여 | 1행 — §6 근거로 보존 |
| duplicate | 0 |
| orphan | 0 (FK `ON DELETE CASCADE` 로 구조 보장) |
| enrollment 를 참조하는 FK | 0건 |
| `service_memberships` / role 데이터 변경 | 0 (WO 금지 준수) |

---

## 9. 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (apps/api-server) | PASS |
| 신규 회귀 spec | **10/10 PASS** |
| api-server 전체 Jest | **147 suites / 2331 tests 전부 PASS** (200.8s) |
| pre/post census | 동일 (production write 0) |

회귀 케이스: canonical 판정 / 별칭 집합 SSOT 파생 / resolver enrollmentCodes 계약 /
KCos provisioning write = canonical / 런타임 legacy write 0 /
Event Offer operator·supplier 해석이 canonical 포함 집합 질의 / GlycoPharm 오인 금지 /
dual-key 조직에서 canonical 결정적 선택 / PUBLIC 자동확산의 legacy key 확산 차단.

---

## 10. 잔존 위험 · 별도 WO 제안

1. **legacy enrollment 1행 잔존** — §6 정리안 승인 필요 (별도 WO).
2. `organization_product_listings` 에 `service_key='kpa'` 1행(2026-08-14, org `9c87f46b…`)이 있다.
   같은 계열의 **다른 축 drift** 이며 auto-listing 산출물이 아니다(해당 org 에 `kpa` enrollment 없음).
   이번 범위 밖 — 출처 추적용 별도 WO 제안.
3. `platform_store_slugs.service_key='cosmetics'` 는 slug 축의 값이며 WO §12 에 따라 변경하지 않았다.
4. 조직 `31e926a0…` 소유자는 role_assignments·service_memberships 가 없어 store-owner 경로 진입이 불가하다.
   데이터 상태 문제이며 이번 WO 범위(enrollment key) 밖이다.
5. `@o4o/financial-core` 패키지 빌드 실패(tsup "No input files")는 **기존 결함**이며 본 WO 와 무관하다.

---

## 11. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§10-1 · §10-2).
