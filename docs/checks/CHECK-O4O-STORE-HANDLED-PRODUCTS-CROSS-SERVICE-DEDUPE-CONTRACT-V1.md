# CHECK-O4O-STORE-HANDLED-PRODUCTS-CROSS-SERVICE-DEDUPE-CONTRACT-V1

- **WO**: WO-O4O-STORE-HANDLED-PRODUCTS-CROSS-SERVICE-DEDUPE-CONTRACT-V1
- **일자**: 2026-08-19
- **판정**: §5 = **TRUE_DUPLICATE** · §6 표시 계약 = **HYBRID**
- **결과**: PASS (backend 계약 수정 · 응답 shape·pagination 계약 무변경 · schema/migration 없음)

---

## 1. 경로 census (§3) — 미조사 0

`store-handled-products` 를 제공하는 경로는 2개이며, 둘 다 동일 서비스 계층
`apps/api-server/src/services/store/store-handled-products.service.ts` 를 SSOT 로 사용한다.

| # | route | service context | organization context | listing filter | service_key filter | master grouping | 응답 identifier | frontend key |
|---|-------|-----------------|----------------------|----------------|--------------------|-----------------|-----------------|--------------|
| 1 | `GET /api/v1/store/handled-products` (`routes/platform/store-handled-products.routes.ts`) | KPA (`resolveStoreAccess(..., 'kpa')`) | organizationId | `opl.organization_id = $1` (+ active/search) | **없음** | 수정 전 없음 → 수정 후 identity partition | `{sourceType, sourceId}` | `handledProductKey = ` `` `${sourceType}:${sourceId}` `` |
| 2 | `GET /api/v1/pharmacy-hub/store-owner/handled-products` (`controllers/pharmacy-hub/PharmacyHubHandledProductController.ts`) | Pharmacy-Hub (`resolvePharmacyHubStoreOrganization`) | organizationId | 동일 (서비스 계층 위임) | **없음** | 동일 | 동일 | 동일 |

부수 경로(같은 서비스 계층 소비): remove(POST), active(PATCH), qr / qr-export.

- 목록·remove·active 모두 `(sourceType, sourceId)` 단일 행 식별자를 사용한다.
- frontend 는 행마다 `sourceType:sourceId` 를 key 로 쓰므로 **중복 행은 서로 다른 행으로 정상 렌더**된다 → 화면 3회 반복은 backend 산출물 그대로다(§7 판단 근거).

## 2. Production read-only census (§4)

`organization_product_listings` (OPL) 전수 (2026-08-19, read-only):

| 항목 | 값 |
|------|----|
| 총 listing | 28 |
| distinct master_id | 21 |
| master_id NULL 행 | 0 |
| (org, master) 그룹 | 26 |
| listing 1건 그룹 | 25 |
| listing 2건 이상 그룹 | **1** (3건) |
| 2 서비스 중복 master | 0 |
| 3 서비스 중복 master | **1** |
| 4 서비스 중복 master | 0 |
| identity `(org, master, offer)` 기준 중복 그룹 | 1 (붕괴되는 행 2) |

### 중복 1건 상세 — "3회 노출" 실 사례

- organization: `9c87f46b-57a1-4afe-80bd-60782c49ce96` (테스트 약국)
- master: `7469448d-d5e1-4a13-8b73-cdd35bc99726` (`[E2E_TEST] 매장 허브 검증 상품`)
- offer_id: `61db213b-…` — **3행 모두 동일 offer**

| listing id | service_key | source_type | price | is_active | status | 하위 참조 |
|-----------|-------------|-------------|-------|-----------|--------|-----------|
| `64ae4184-…` | kpa-society | NULL (의도 등록) | NULL | true | pending | 0 |
| `ce99ef20-…` | glycopharm | event-offer | NULL | true | pending | 0 |
| `09a400e6-…` | k-cosmetics | event-offer | NULL | true | pending | 0 |

공급처(offer)·가격·승인상태·주문가능성·visibility 가 **모두 동일**하고, 다른 축은
`service_key` 뿐이다. `service_key` 는 Boundary Policy §7 상 Store Ops 의 경계가 아니며
(경계는 `organizationId`), 이 값은 `EventOfferService.ensureStoreProduct()` 가 이벤트의 대상
서비스로 기록해 생긴 축이다.

→ **§5 판정: A. TRUE_DUPLICATE** (사용자에게도 사업적으로도 같은 진열 1건).

## 3. 왜 service_key 필터(§8)로 닫지 않았는가

같은 org 의 service_key 분포:

| service_key | listing |
|-------------|---------|
| neture | 20 |
| glycopharm | 1 |
| k-cosmetics | 1 |
| kpa-society | 1 |

KPA 약국이 실제 취급 중인 20건이 `service_key='neture'` 로 기록돼 있다. 원인은
`store-product-library.controller.ts` 의 `deriveListingServiceKey` 가 사용자 membership 에서
값을 도출하며 `MULTI_MEMBERSHIP_PRIORITY` 의 선두가 `neture` 이기 때문이다
(`utils/listing-service-key.ts`).

따라서 "현재 서비스 canonical key 만 필터"하면 23건 중 20건이 화면에서 사라진다(기능 은폐).
**§8 의 단순 필터는 채택하지 않고 §9 service-neutral 경로로 처리**한다.

## 4. 확정 표시 계약 (§6) — HYBRID

- **identity(같은 항목의 정의)** = `(organization_id, COALESCE(master_id, id), offer_id)`
  - 같은 master 라도 **offer 가 다르면 다른 진열**로 보존한다 → SERVICE_DISTINCT 보호.
  - `offer_id IS NULL` 은 같은 값으로 묶인다(부분 UNIQUE 인덱스와 같은 축).
  - master 없는 행은 자기 `id` 로 폴백 → 절대 다른 행과 합쳐지지 않는다.
- 제품 기준 **1행**만 노출하되, 진열 식별자(`sourceId`)는 **대표 행의 것을 그대로 유지**한다
  → 응답 shape·필드·detail/order/content 이동 계약 무변경.

### 대표 행 선정 규칙 (§10) — 기존 계약 근거만 사용

```
ORDER BY opl.is_active DESC,
         (opl.source_type IS NULL) DESC,
         opl.created_at ASC,
         opl.id ASC
```

1. `is_active DESC` — 활성 진열이 매장 화면의 정본.
2. `(source_type IS NULL) DESC` — 의도적 등록 행 > 파생 행(`'event-offer'`).
   근거: `pharmacy-products.controller.ts` 가 파생 행을 주문가능 집합에서 제외한다(기존 계약).
3. `created_at ASC`, `id ASC` — 결정적 tie-break.

**가격은 대표 선정에 쓰지 않는다**(최저가 자동 대표 금지 — 회귀 테스트로 고정).

## 5. 수정 내용 (최소 수정)

파일 1개: `apps/api-server/src/services/store/store-handled-products.service.ts`

1. **읽기** — listing subquery 를 `ROW_NUMBER() OVER (PARTITION BY <identity> ORDER BY <대표 규칙>)`
   로 감싸고 `WHERE identity_rank = 1`. 목록과 `total` 이 **같은 CTE** 를 쓰므로
   pagination 이후 frontend dedupe 로 count 가 틀어지는 구조가 생기지 않는다(§9).
   `local` 경로는 무접촉.
2. **쓰기 정합** — 읽기만 합치면 "지웠는데 다시 나타난다"가 되므로,
   `removeHandledProducts` / `setHandledProductActive` 를 identity 그룹 단위로 동작시킨다
   (`resolveListingIdentityGroup`, org 경계 안에서만). 콘텐츠 링크
   (`kpa_store_content_product_links`) 정리도 그룹 전체로 확장.
3. schema/migration/데이터 변경 **없음**. OPL 대량 삭제·service key 재정규화·가격/승인 정책·
   SupplierProductOffer 구조·frontend 재설계 **없음**(§13 준수).

## 6. 검증 (§11 · §16)

| 항목 | 결과 |
|------|------|
| 신규 회귀 테스트 `apps/api-server/src/__tests__/store-handled-products-dedupe.spec.ts` | **9/9 PASS** |
| api-server 전체 Jest | **154 suites / 2427 tests PASS** |
| typecheck (`tsc --noEmit`) | 변경/신규 파일 **0 error** (기존 workspace 미빌드 모듈 오류 248건은 사전 존재) |
| pagination/count 계약 | `total` 이 동일 dedupe CTE 기준 — 검증 테스트로 고정 |
| 대표 선정에 price 미사용 | `expect(sql).not.toMatch(/ORDER BY[^)]*price/i)` |
| service_key 필터 미도입 | 모든 쿼리에 `opl.service_key =/IN` 없음 |
| local 경로 무영향 | `source: 'local'` SQL 에 `identity_rank` 없음 · local setActive 는 그룹 조회 없음 |

### pre/post census (동일 SQL, production read-only dry check)

| 대상 org `9c87f46b…` | 수정 전 | 수정 후(dry) |
|---|---|---|
| listing 행 | 23 | **21** |
| handled-products 통합 항목(active) | 31 | **29** |

붕괴된 2행은 정확히 위 중복 그룹의 파생 행 2건이며, 생존 대표는
`64ae4184-…`(kpa-society, 의도 등록)로 확인했다.

## 7. Production smoke (§12)

배포 전(현행 프로덕션) 상태를 실측해 결함을 재현했다.

| 항목 | 결과 |
|------|------|
| 로그인 (`serviceKey='kpa-society'`, store_owner 계정) | 200 (자격증명은 어떤 산출물에도 기록하지 않음) |
| `GET /api/v1/store/handled-products?limit=100` | 200 · items 31 (listing 23 / local 8) |
| 동일 master 중복 | **3회 반복 재현** (`09a400e6` / `ce99ef20` / `64ae4184`, 이름·originLabel 동일) |
| `GET /api/v1/pharmacy-hub/store-owner/handled-products` | 200 · items 0 (PH 조직 해석 결과로 대상 org 아님 — 계약대로) |
| `GET /api/v1/store/local-products` | 200 · items 0 — handled-products 의 local 8건과 혼동 없음(아래 관찰 참조) |
| KCos(테스트 뷰티샵) · GP([E2E_TEST] 글라이코팜 검증 약국) org | 각 listing 1건 → 중복 대상 없음 |

배포 후 재smoke 시 동일 계정에서 items 31 → **29**, 3회 반복 → **1행**이 되어야 한다.

## 8. 범위 밖 관찰 (수정하지 않음 · 후속 WO 후보)

1. `GET /api/v1/store/local-products` 는 `resolveStoreAccess(dataSource, userId, roles)` 를
   **서비스 힌트 없이** 호출해 handled-products(`'kpa'` 지정)와 다른 조직으로 해석될 수 있다.
   같은 계정에서 handled-products 는 테스트 약국(local 8건), local-products 는 0건이 나온다.
   본 WO 범위 밖(조직 해석 축)이며 dedupe 와 무관하다.
2. OPL `service_key` 쓰기 축이 3개 경로에서 서로 다르다(membership 우선순위 / 이벤트 대상 서비스 /
   enrollment 복사). 재정규화는 §13 금지 대상이므로 손대지 않았다.

## 9. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건(위 §8)
