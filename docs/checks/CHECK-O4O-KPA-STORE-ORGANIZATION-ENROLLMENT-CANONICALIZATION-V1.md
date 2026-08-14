# CHECK-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-CANONICALIZATION-V1

- **WO**: `WO-O4O-KPA-STORE-ORGANIZATION-ENROLLMENT-CANONICALIZATION-V1`
- **일자**: 2026-08-14
- **범위**: KPA 매장 organization 의 canonical service enrollment 생성 (신규 조직부터)
- **DB write**: production 0건 (read-only census 만 수행)

---

## 1. 누락 원인 (확정)

**KPA 의 어떤 코드 경로도 `organizationOpsService.enrollService()` 를 호출하지 않았다.**

- KPA 는 매장 조직을 만들 때 `organizations` + `organization_members` + `role_assignments`
  + `platform_store_slugs` 만 기록했다.
- `organization_service_enrollments` 는 K-Cosmetics / GlycoPharm / Pharmacy-Hub / Neture
  프로비저닝이 각자 `enrollService()` 로 채우고 있었고, KPA 만 그 단계가 통째로 빠져 있었다.
- 그 결과 "KPA 매장인가?" 를 판정할 유일한 흔적이 `platform_store_slugs.service_key='kpa'`
  하나뿐이었고, 선행 WO(store-owner service-scoped resolution)가 slug 를 보조 근거로
  넣어야 했던 이유가 이것이다.

비교표 (조직 생성 시 enrollment 기록 여부):

| 서비스 | enrollment 기록 | 기록 위치 |
|---|:---:|---|
| K-Cosmetics | O | `routes/cosmetics/services/cosmetics-store.service.ts` |
| GlycoPharm | O | provisioning + `20260222900000-GlycopharmOrgEnrollmentRepair` |
| Pharmacy-Hub | O | `services/pharmacy-hub/PharmacyHubStoreProvisioningService.ts` |
| Neture(공급자) | O | `modules/auth/controllers/auth-register.controller.ts` |
| **KPA** | **X** | — (본 WO 에서 신설) |

---

## 2. KPA organization write 경로 모집단 (전수)

`organizations` 행을 만들거나 매장 조직에 사용자를 연결하는 KPA 경로는 3개뿐이다.

| # | 경로 | 조직 생성 | 이전 상태 | 조치 |
|---|---|:---:|---|---|
| P1 | `routes/kpa/controllers/member.controller.ts` — `PATCH /kpa/members/:id/status` (약국 가입 승인) | O | org+member+role+slug, **enrollment 없음** | 공통 helper 로 수렴 |
| P2 | 동 controller — `PATCH /kpa/members/:id` (운영자 편집, `activity_type='pharmacy_owner'` 전환) | O | org+member+role, **slug·enrollment 모두 없음** | 공통 helper 로 수렴 (slug 도 함께 정상화) |
| P3 | `routes/kpa/controllers/organization.controller.ts` — `POST /kpa/organizations` | O | org+slug, **enrollment 없음** | enrollment 호출 추가 |

조직을 만들지 않는 role-only 경로 (확인 후 제외):

- `member.controller` role 변경 · `controllers/operator/MembershipConsoleController.assignMemberRole`
- `controllers/admin/AdminUserController` · `services/approval/MembershipApprovalService`
- (구 주석이 가리키던 `pharmacy-request.controller.ts` 는 현재 저장소에 존재하지 않는다)

**미조사 write 경로 0건.**

---

## 3. canonical 경로 (구현)

신설: `apps/api-server/src/routes/kpa/services/kpa-store-organization.provisioning.ts`

```
ensureKpaStoreOrganization()
  1. organizationOpsService.ensureOrganization()      ON CONFLICT (code) DO UPDATE
  2. kpa_members.organization_id 연결                  WHERE organization_id IS NULL
  3. organizationOpsService.addMember(role='owner')   ON CONFLICT (org,user) DO NOTHING
  4. roleAssignmentService.assignRole('kpa:store_owner')
  5. organizationOpsService.enrollService(            ON CONFLICT (org,service_code) DO NOTHING
       serviceCode = KPA_CANONICAL_SERVICE_CODE)      ← 본 WO 신설 단계
  6. platform_store_slugs 예약 (실패해도 비차단, slugError 반환)
```

- `KPA_CANONICAL_SERVICE_CODE = resolveCanonicalServiceKey('kpa')` → `'kpa-society'`.
  **새 로컬 매핑을 만들지 않았다** (`@o4o/security-core` SSOT 사용).
- `KPA_STORE_SLUG_SERVICE_KEY = 'kpa'` — slug 키 체계는 그대로 두었다.
- 5단계는 `enrollService()` 의 `ON CONFLICT DO NOTHING` 으로 **멱등**이다. 재승인·재편집에서
  중복 enrollment 가 생기지 않는다. status 는 항상 `'active'` 로 삽입되며 `pending` 을 만들지 않는다.
- 계약 유지: `organization_service_enrollments` = 서비스 연결 canonical /
  `platform_store_slugs` = URL·slug 식별. slug 를 authorization SSOT 로 확대하지 않았다.

---

## 4. 기존 운영 조직 census (production, read-only)

```
전체 KPA store organization: 7        (platform_store_slugs.service_key='kpa' 기준)
active enrollment 보유:      0
enrollment 없음:             7
중복 enrollment:             0
platform_store_slug 보유:    7        (전부 is_active=true)
store_owner 연결 정상:       4        (organization_members owner/admin/manager + kpa:store_owner)
```

- `organization_service_enrollments` 에 `service_code IN ('kpa','kpa-society')` 행은 **0건**.
- active `kpa:store_owner` 보유 사용자 5명, 전원 service-scoped 해석 결과 조직 정확히 1개(ambiguous 0).
- **자동 backfill 하지 않았다** (WO §4).

### backfill 판정 (후속 분리)

| 항목 | 값 |
|---|---|
| 예상 대상 | 위 7개 조직 |
| 생성될 row | `organization_service_enrollments` 7행 (`service_code='kpa-society'`, `status='active'`) |
| rollback | `DELETE FROM organization_service_enrollments WHERE service_code='kpa-society' AND organization_id IN (<7 UUID>)` |
| 판정 | **본 WO 범위 밖.** 별도 migration/data-fix WO 로 분리한다. |

이유: 기존 7개 조직은 slug 근거로 store-owner 접근이 이미 정상이며(선행 WO), backfill 은
아래 §5 의 파급(운영자 콘솔 노출·auto-listing)을 기존 운영 조직에까지 한꺼번에 적용하므로
독립 승인·독립 검증이 필요하다.

---

## 5. enrollment 추가의 파급 (신규 조직 한정)

`organization_service_enrollments` 를 읽는 런타임 소비처를 전수 확인했다. `service_code` 가
`'kpa-society'` 인 행이 새로 생겼을 때 판정이 바뀌는 곳은 아래뿐이다.

| 소비처 | 변화 | 판정 |
|---|---|---|
| `routes/kpa/services/operator-dashboard.service.ts` (매장 통계) | 신규 KPA 매장이 카운트되기 시작 | **의도된 교정** (현재는 항상 0) |
| `controllers/operator/StoreConsoleController` · `store-channel.service` | KPA 운영자 scope(`kpa-society`)에 신규 매장이 보이기 시작 | **의도된 교정.** 타 서비스 operator 의 scope 키에는 `kpa-society` 가 없어 교차 노출 없음 |
| `utils/auto-listing.utils.ts` | PUBLIC/SERVICE offer 확산 시 신규 KPA 조직에 `organization_product_listings` 행 생성 (`is_active=false`) | 노출 없음(비활성). 다만 `service_key='kpa-society'` 로 기록되고 KPA 매장 UI 는 `'kpa'` 로 조회 → **키 체계 불일치를 후속 항목으로 기록** (본 WO 에서 고치면 범위 확대) |
| `modules/neture/guards/drug-access.guard.ts` | **변화 없음** | 아래 상세 |
| `modules/neture/services/seller.service.ts` `resolveServiceKey()` | 변화 없음 (기본값이 이미 `'kpa-society'`) |
| pharmacy-hub / glycopharm / cosmetics / neture 소비처 | 변화 없음 (각자 자기 `service_code` 로만 조회) |

### drug gate 무영향 근거

- `assertDrugOfferAllowed()` (offer.service 4개 호출부)는 organization 을 아예 보지 않는다 →
  enrollment 와 무관.
- `assertDrugActionAllowed()` 의 유일한 소비처는
  `routes/o4o-store/controllers/store-product-library.controller.ts` (OPL_CREATE) 이며,
  거기서 넘기는 `serviceKey` 는 `deriveListingServiceKey()` 산출값 **`'kpa'`** 다.
  - 3단계 `service_audience_policies` 에 `'kpa'` 행이 없어 `DRUG_POLICY_UNAVAILABLE` 로
    **이미 거부**된다 (4단계 `organizationBelongsToService` 까지 도달하지 않는다).
  - 4단계에 도달하더라도 조회 키가 `'kpa'` 이므로 새로 생긴 `'kpa-society'` 행과 매칭되지 않는다.
  - 결론: deny → allow 로 뒤집히는 케이스 **없음**.
  - (부수 관찰: KPA 의약품 OPL_CREATE 가 정책행 부재로 거부되는 상태는 본 WO 이전부터
    존재하던 별개 사안이다. 본 WO 에서 건드리지 않았다.)

---

## 6. 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (api-server) | PASS |
| `npx jest src/routes/kpa` | 8 suites / 101 tests PASS |
| 신규 spec `kpa-store-organization.provisioning.test.ts` | 6/6 PASS |
| 전체 `npx jest` (api-server) | 121 suites / 1918 tests PASS |
| production census | read-only, SELECT 전용 |

신규 spec 이 고정한 계약:

1. slug 키(`'kpa'`) 와 enrollment 코드(`'kpa-society'`) 가 분리돼 있다
2. enrollment 는 정확히 1회, `{organizationId, serviceCode:'kpa-society'}` 로 호출된다
3. 반복 호출 시 인자가 동일하고(중복 방지 계약) slug 재예약을 하지 않는다 — no-op
4. `kpa_members` 갱신은 `organization_id IS NULL` 조건을 유지한다 (기존 연결 덮어쓰기 금지)
5. slug 실패는 `slugError` 로 반환되며 enrollment 는 그대로 수행된다
6. slug 예약은 `serviceKey:'kpa'` 를 쓴다

기존 5개 KPA 테스트의 `organization-ops.service` mock 에 `enrollService` 를 추가했다
(mock 누락으로 인한 실패 13건을 그렇게 해소했다 — 프로덕션 로직 변경 아님).

---

## 7. DB / migration / write

- migration 신설 **없음**, schema 변경 **없음**.
- production write **0건**. 접속은 기존 cloud-sql-proxy 경유 read-only.
- 기존 organization 재생성·이동·병합 없음, 기존 slug 제거 없음, 기존 role/password 변경 없음.

---

## 8. 잔여 부채 (후속 WO 후보)

1. 기존 KPA 조직 7건 enrollment backfill (§4 판정 — 별도 data-fix WO)
2. `organization_product_listings.service_key` 키 체계 불일치 (`'kpa'` vs `'kpa-society'`) —
   auto-listing 이 enrollment 코드를 그대로 쓰는 구조에서 발생. 서비스 키 체계 통합 판단 필요
3. `service_audience_policies` 에 KPA listing 키(`'kpa'`) 행 부재 — 의약품 OPL 경로 정책 공백
