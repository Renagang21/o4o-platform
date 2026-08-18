# CHECK-O4O-STORE-OWNER-BACKCOMPAT-SERVICEKEY-MIGRATION-V1

> **WO**: `WO-O4O-STORE-OWNER-BACKCOMPAT-SERVICEKEY-MIGRATION-V1`
> **기준 commit**: `0e6902dc4`
> **작업일**: 2026-08-18
> **판정**: **PASS_WITH_DOCUMENTED_NEUTRAL_RESIDUAL**

---

## §0. 한 줄 요약

`store-owner.utils.ts` 의 serviceKey 없는 back-compat 경로 소비처 **9곳(13 호출)** 을 전수조사해,
서비스가 명확한 **3곳(6 호출)** 을 명시 serviceKey 로 전환했다.
남은 **6곳** 은 실제 소비처가 2개 이상 서비스이거나 0이며, 요청 문맥에서 serviceKey 를 얻는
**기존 계약이 없어** WO §4 에 따라 `SERVICE_NEUTRAL_BACKCOMPAT` 으로 남기고 근거를 기록했다.

```
전체 back-compat 소비처 : 9
명시 serviceKey 전환    : 3
SERVICE_NEUTRAL_BACKCOMPAT : 6
미조사                  : 0
```

---

## §1. 기준 — 무엇이 문제였나

`createRequireStoreOwner(dataSource)` / `resolveStoreAccess(ds, userId, roles)` 처럼
serviceKey 를 넘기지 않으면 두 가지가 느슨해진다.

| 축 | serviceKey 있음 | serviceKey 없음 (back-compat) |
|---|---|---|
| role 판정 | `{service}:store_owner` 하나만 | 4개 서비스 store_owner **전부** |
| membership 판정 | canonical key 의 `active` 필수 | **아무 서비스나 active 1개**면 통과 |
| organization 후보 | 그 서비스 enrollment·slug 로 링크된 조직만 | **모든** 조직 (`is_primary → joined_at → id` 결정적 선택) |

즉 다중 서비스 계정이 A 서비스 라우트에서 B 서비스 조직을 잡을 수 있었다.
`role 판정 ≠ organization 판정` 원칙( `utils/store-organization.resolver.ts` )의 미완 구간이다.

---

## §2. 전수 census (미조사 0)

스캔 대상: `apps/api-server/src/**/*.ts` 전체.
`createRequireStoreOwner(dataSource)` (인자 1개) 와 `resolveStoreAccess(...)` (인자 3개 이하)를
**주석 줄 제외** 후 수집했다.

| # | 파일 | mount / route | 실제 소비처(프론트) | 조직 해석 | membership guard | 판정 |
|---|---|---|---|---|---|---|
| 1 | `modules/store-ai/controllers/store-ai.controller.ts:29` | `/api/v1/store-hub/ai/*` | **web-glycopharm 단독** (`src/api/pharmacy.ts`) | 가드 주입 `organizationId` | 가드 | **→ `'glycopharm'`** |
| 2 | `routes/o4o-store/controllers/store-product-request.controller.ts:190` | `/api/v1/store/product-requests` | **web-kpa-society 단독** (admin 은 `/api/v1/operator/store-product-requests` 별도) | 가드 주입 | 가드 | **→ `'kpa'`** |
| 3 | `routes/platform/store-handled-products.routes.ts:77,125,168,240` | `/api/v1/store/handled-products*` | **web-kpa-society 단독** (Pharmacy-Hub 는 `/api/v1/pharmacy-hub/store-owner/handled-products` 전용 컨트롤러) | `resolveStoreAccess` | 없음(원래 없음) | **→ `'kpa'`** |
| 4 | `modules/store/store-library.routes.ts:32` | `/api/v1/store/library` | **0건** | 가드 주입 | 가드 | `SERVICE_NEUTRAL_BACKCOMPAT` |
| 5 | `modules/store-ai/controllers/product-ai-recommendation.controller.ts:17` | `/api/v1/products/recommend*` | **0건** | 가드 주입 | 가드 | `SERVICE_NEUTRAL_BACKCOMPAT` |
| 6 | `routes/o4o-store/controllers/store-product-library.controller.ts:81` | `/api/v1/store/products` | KPA + Neture | 가드 주입 | 가드 | `SERVICE_NEUTRAL_BACKCOMPAT` |
| 7 | `routes/platform/store-tablet.routes.ts:247` | `/api/v1/store/*` (기본) + Pharmacy-Hub 주입 mount | KPA + GlycoPharm + K-Cosmetics | 가드 주입 또는 주입 seam | 가드 | `SERVICE_NEUTRAL_BACKCOMPAT` |
| 8 | `routes/platform/store-local-product.routes.ts:97` | `/api/v1/store/local-products` | KPA + GlycoPharm + K-Cosmetics (3서비스 모두 API 호출 확인) | `resolveStoreAccess` | 없음 | `SERVICE_NEUTRAL_BACKCOMPAT` |
| 9 | `modules/neture/controllers/seller.controller.ts:135,189` | Neture seller | Neture | `resolveStoreAccess` 후 enrollment 에서 serviceKey 사후 도출 | 별도 | `SERVICE_NEUTRAL_BACKCOMPAT` |

### 오탐으로 판정해 제외한 것

| 위치 | 이유 |
|---|---|
| `routes/platform/store-policy.routes.ts:37` | 같은 이름의 **로컬** `isStoreOwner(ds, storeId, serviceKey, userId)`. `organizations.created_by_user_id` / `cosmetics_stores` 조회로 store-owner.utils 와 무관 |
| `routes/cosmetics/controllers/cosmetics-mypage.controller.ts:89` | 이미 `'cosmetics'` 전달 |
| `routes/o4o-store/controllers/store-qr-landing.controller.ts:144` | 이미 `createRequireStoreOwner(dataSource, serviceKey)` |
| `routes/o4o-store/controllers/store-playlist.controller.ts` (11) | 전부 `storeOwnerServiceKey` 전달 |
| `routes/kpa/services/event-offer.service.ts:890` | `'kpa'` 전달 |
| `controllers/pharmacy-hub/PharmacyHubHandledProductController.ts:14`, `controllers/pharmacy-hub/pharmacy-hub-store-org.seam.ts:10`, `services/store/store-handled-products.service.ts:10` | **주석(설계 근거) 안의 함수명 언급**. 실제 호출 아님 |

---

## §3. 전환 결과

serviceKey 값은 기존 `StoreOwnerServiceKey` 계약을 그대로 쓴다. **새 로컬 mapping 을 만들지 않았다.**
role-prefix 축 → membership canonical 축 변환은 기존 SSOT `resolveCanonicalServiceKey()`(`@o4o/security-core`)가 담당한다.

| route serviceKey | membership canonical key | 변환 주체 |
|---|---|---|
| `kpa` | `kpa-society` | `resolveCanonicalServiceKey()` |
| `cosmetics` | `k-cosmetics` | 〃 |
| `glycopharm` | `glycopharm` | 〃 |
| `pharmacy-hub` | `pharmacy-hub` | 〃 |

### 3-1. `/api/v1/store-hub/ai/*` → `'glycopharm'`

- mount 는 `register-routes.ts:688` 단 한 곳.
- 저장소 전역에서 이 경로를 호출하는 프론트는 `services/web-glycopharm/src/api/pharmacy.ts` 뿐이다.
- 전환 전에는 KPA·K-Cosmetics·Pharmacy-Hub store_owner 도 GlycoPharm 매장 AI 스냅샷·인사이트에 도달할 수 있었다.

### 3-2. `/api/v1/store/product-requests` → `'kpa'`

- 소비처 `services/web-kpa-society/src/api/storeProductRequests.ts` 단독.
- admin-dashboard 는 별도 라우터 `/api/v1/operator/store-product-requests` 를 쓰므로 영향 없다.

### 3-3. `/api/v1/store/handled-products*` → `'kpa'` (4 호출)

- 소비처 `services/web-kpa-society/src/api/handledProducts.ts` 단독.
- Pharmacy-Hub 는 이미 이 문제를 알고 전용 컨트롤러(`PharmacyHubHandledProductController`)로 분기해 둔 상태였다.
- GlycoPharm·K-Cosmetics 프론트에는 이 엔드포인트 호출이 **0건**이다
  (두 서비스는 `routes/glycopharm/controllers/store.controller.ts` 등 자기 서비스 라우트로 listing 을 노출한다).
- 파일 상단 기존 주석의 "KPA·GlycoPharm·K-Cosmetics = resolveStoreAccess" 표현은 **설계 의도 서술이며 실측 소비처와 다르다.**
  실측을 근거로 `'kpa'` 로 고정하고, 그 근거를 파일 주석에 남겼다.

---

## §4. SERVICE_NEUTRAL_BACKCOMPAT 잔여 6곳 — 근거

WO §4 는 "기존 계약이 없으면 이번 WO 에서 새 API contract 를 만들지 않는다" 이다.
아래 6곳은 **요청 문맥에서 serviceKey 를 안전하게 얻는 기존 계약이 없다.**

| # | 위치 | 남긴 이유 |
|---|---|---|
| 4 | `store-library.routes.ts` (`/api/v1/store/library`) | 프론트 소비처 0건. 실제 서비스별 자료함은 serviceKey 를 받는 `createStoreLibraryController`(`/cosmetics/pharmacy/library`, `/glycopharm/pharmacy/library`)가 담당하고 KPA 는 `/store/assets` 로 이동했다. 소비처가 없으므로 귀속할 서비스를 실측으로 정할 수 없다 |
| 5 | `product-ai-recommendation.controller.ts` (`/api/v1/products/recommend*`) | 프론트 소비처 0건. 위와 같은 이유 |
| 6 | `store-product-library.controller.ts` (`/api/v1/store/products`) | KPA + Neture 양쪽이 소비한다. 같은 파일의 `deriveListingServiceKey(req)` 는 **요청 문맥이 아니라 JWT membership 우선순위**로 값을 정하므로 가드 축으로 쓰면 다중 서비스 계정에서 오귀속이 난다 → 가드 근거로 쓰지 않았다 |
| 7 | `store-tablet.routes.ts` (`/api/v1/store/*` 기본 mount) | KPA·GlycoPharm·K-Cosmetics 3서비스 공용. Pharmacy-Hub 만 이미 `resolveOrganizationId` 주입 seam 으로 분리돼 있다. 진짜 공용 경로 |
| 8 | `store-local-product.routes.ts` (`/api/v1/store/local-products`) | 3서비스 프론트가 모두 이 경로를 직접 호출한다(`web-kpa-society/src/api/localProducts.ts`, `web-glycopharm/src/api/localProducts.ts`, `web-k-cosmetics/src/services/localProductApi.ts`). 진짜 공용 경로 |
| 9 | `seller.controller.ts` | Neture seller 축. serviceKey 를 조직 enrollment 에서 **사후** 도출하는 별도 구조이므로 가드 축 변경은 Neture 계약 변경이 된다(WO §8 변경 금지) |

> 7·8 을 서비스별로 쪼개려면 mount 분리 또는 새 요청 계약이 필요하다. 둘 다 WO §8 변경 금지 항목이므로 별도 WO 로 분리한다.

---

## §5. Production read-only 회귀 확인 (§6·§7)

DB 는 **read-only SELECT 만** 수행했다. 변경 0건.

### 5-1. store_owner 계정 전수 (9명)

`uid8 | store_owner roles | back-compat 조직 후보 | kpa | gp | cos | ph`

```
972ede50 | cosmetics                            | 1 | 0 | 0 | 1 | 0
3f5582bc | cosmetics,glycopharm,kpa,pharmacy-hub | 1 | 1 | 0 | 0 | 0
6967ebe0 | cosmetics,glycopharm,kpa,pharmacy-hub | 4 | 1 | 1 | 1 | 0
44fa7733 | cosmetics,glycopharm,kpa,pharmacy-hub | 0 | 0 | 0 | 0 | 0
cfd2a5e7 | kpa                                  | 1 | 1 | 0 | 0 | 0
5853b6c4 | kpa                                  | 1 | 1 | 0 | 0 | 0
028854c2 | kpa                                  | 1 | 1 | 0 | 0 | 0
9f8391b2 | pharmacy-hub                         | 1 | 0 | 0 | 0 | 1
4f42110a | pharmacy-hub                         | 1 | 0 | 0 | 0 | 1
```

### 5-2. ambiguity 계약

| service | 대상자 | 후보 1(resolved) | 후보 0(none) | 후보 2+(ambiguous) |
|---|---:|---:|---:|---:|
| kpa | 6 | 5 | 1 | **0** |
| glycopharm | 3 | 1 | 2 | **0** |
| cosmetics | 4 | 2 | 2 | **0** |
| pharmacy-hub | 5 | 2 | 3 | **0** |

**ambiguous = 0 (전 서비스).** 409 `AMBIGUOUS_STORE_CONNECTION` 계약은 유지했고, production 에서 현재 발동하는 계정은 없다.

### 5-3. 전환 3곳의 실제 영향

| 전환 | 현재 통과 → 전환 후 통과 | 회귀 여부 |
|---|---|---|
| `/store-hub/ai` → glycopharm | GlycoPharm 조직 보유자 `6967ebe0` 만 통과. 나머지는 **GlycoPharm 프론트를 쓰지 않는 계정**이다 | 의도된 축소. 실사용 회귀 0 |
| `/store/product-requests` → kpa | KPA store_owner 6명 중 KPA 조직 보유 5명 전원 통과. `44fa7733` 은 back-compat 후보도 0이라 **전환 전에도 이미 차단** | 회귀 0 |
| `/store/handled-products` → kpa | 위와 동일 cohort. 비-KPA store_owner(`972ede50`, `9f8391b2`, `4f42110a`)는 이 엔드포인트의 프론트 소비처가 없다 | 회귀 0 |

### 5-4. §7 backfill 조직 유지

```
kpa linkage — platform_store_slugs(service_key='kpa', active)        : 9 조직
kpa linkage — organization_service_enrollments('kpa-society','kpa')  : 7 조직   ← backfill 7건 정상
organization_product_listings 총 29건 중 kpa linkage 조직 소유        : 26건
```

나머지 3건은 K-Cosmetics(2) / GlycoPharm(1) 조직 소유이며, 해당 서비스는 자기 서비스 라우트로 노출한다.
`/api/v1/store/handled-products` 를 호출하는 프론트가 없으므로 UI 회귀는 없다.
(향후 GP·KCos 가 이 공용 경로에 handled-products UI 를 붙이려 하면 mount 분리가 선행되어야 한다 — §7 후속.)

---

## §6. 수정 파일

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/store-ai/controllers/store-ai.controller.ts` | 가드에 `'glycopharm'` 전달 + 근거 주석 |
| `apps/api-server/src/routes/o4o-store/controllers/store-product-request.controller.ts` | 가드에 `'kpa'` 전달 + 근거 주석 |
| `apps/api-server/src/routes/platform/store-handled-products.routes.ts` | `resolveStoreAccess` 4호출에 `'kpa'` 전달 + 근거 주석 |
| `apps/api-server/src/__tests__/store-owner-backcompat-servicekey.spec.ts` | **신규** — §6 계약 + §9 census 잠금 |
| `docs/checks/CHECK-O4O-STORE-OWNER-BACKCOMPAT-SERVICEKEY-MIGRATION-V1.md` | 본 문서 |

`store-owner.utils.ts` · `store-organization.resolver.ts` 는 **무변경**이다.
API contract · schema · migration · role/membership 정책 · organization 데이터 변경 **0건**.

---

## §7. 검증

| 항목 | 결과 |
|---|---|
| `npx tsc --noEmit -p apps/api-server/tsconfig.json` | **PASS** (0 error) |
| `store-owner-backcompat-servicekey.spec.ts` (신규) | **PASS** |
| `store-owner-service-scoped-org.spec.ts` | **PASS** |
| `membership-read-guard.contract.test.ts` | **PASS** |
| api-server 전체 Jest | **PASS** — 134 suites / 2133 tests |
| Production DB | read-only SELECT 만. write 0건 |

신규 spec 이 고정하는 것

1. 4개 서비스 각각 — 같은 서비스 active membership → PASS / 타 서비스 membership 만 → 403 `MEMBERSHIP_NOT_FOUND`
2. multi-service 계정 — 현재 route 의 serviceKey linkage 만 조직 후보 조회에 들어간다
3. inactive membership → 403 `MEMBERSHIP_NOT_ACTIVE`
4. 전환한 3곳이 back-compat 로 되돌아가면 실패
5. `SERVICE_NEUTRAL_BACKCOMPAT` 잔여 집합이 6곳에서 늘거나 줄면 실패

---

## §8. 후속 (별도 WO)

1. `/api/v1/store/*` 공용 mount(store-tablet · local-products · products)의 **서비스별 mount 분리**.
   분리되면 잔여 6곳 중 3곳이 자동으로 명시 serviceKey 로 전환 가능하다.
2. 소비처 0건인 `/api/v1/store/library`, `/api/v1/products/recommend*` 의 **은퇴 여부 판정**.
3. `store-handled-products.routes.ts` 상단 주석의 "KPA·GlycoPharm·K-Cosmetics 공용" 서술은 이번에 실측 근거로 정정했으나,
   `store-handled-products.service.ts` · `pharmacy-hub-store-org.seam.ts` 의 유사 서술도 같은 정정이 필요하다(기록 문서 아닌 소스 주석).

---

## §9. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건

- 발견: `store-handled-products.service.ts` · `pharmacy-hub-store-org.seam.ts` 의 설계 근거 주석이
  `/api/v1/store/handled-products` 를 "KPA·GlycoPharm·K-Cosmetics 공용" 으로 서술하나 실측 소비처는 KPA 단독이다.
  소스 주석이므로 §16 인라인 허용(SUPERSEDED 표기·링크 교정) 대상이 아니고, WO 범위 밖 파일이라 수정하지 않고 §8-3 으로 보고한다.
