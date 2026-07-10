# CHECK-O4O-STORE-LISTING-SERVICEKEY-AXIS-SEPARATION-DESIGN-V1

> WO: `WO-O4O-STORE-LISTING-SERVICEKEY-AXIS-SEPARATION-DESIGN-V1`
> 성격: **설계 WO — read-only 조사 + 설계 확정. 코드 변경 0 / DB write 0 / migration 작성 0.**
> 선행: `CHECK-O4O-KPA-STORE-LISTING-SERVICEKEY-CANONICALIZATION-AUDIT-V1` (결론 C)
> Date: 2026-07-10

---

## 1. 최종 결론

### 1.1 `organization_product_listings.service_key` canonical 의미 (§8.1 → **A안 채택**)

```
OPL.service_key = 매장 "소비 서비스 면" (consumption surface) 단일 축
값 도메인(canonical) = 매장 registry/consumption 키
  { kpa-society, glycopharm, cosmetics, neture(전용 매장 존재 시) }
파생 기준 = 매장 store context (organization → platform_store_slugs → registry key)
           NOT 등록 사용자 membership
```

### 1.2 origin 축 분리 (§8.2 → **기존 `source_type`/`source_id` 확장 + `origin_service_key` 추가**)

```
origin 정보(등록·공급·운영·이벤트 출처)는 service_key 에서 분리한다.
- source_type  varchar  = 유입 유형 (store_manual / supplier_offer / operator_seed /
                           event_offer / product_approval / seller_recruitment / migration)
                           ※ 이미 존재하는 컬럼. 현재 'market_trial','event-offer','seller_recruitment' 사용 중.
- source_id    uuid     = 출처 레코드 참조 (이미 존재)
- origin_service_key varchar nullable (신규) = origin 서비스/도메인 키
                           (neture, kpa-groupbuy, glycopharm-event-offer 등 — 감사·노출·분석용)
```

**핵심 원칙:** 조회·노출·채널·slug 와 결합되는 값은 `service_key`(소비 축)에만, "어디서 유래했는가"는 origin 축에. **origin 값은 절대 공개 visibility 필터의 주축이 되어선 안 된다.**

### 1.3 A/B/C 재확인 (선행 감사 결론 계승)

**C(의미 혼재) 확정.** 본 설계는 C 를 해소하기 위해 **service_key=소비 축 고정(A) + origin 별도 축**으로 재구성한다.

---

## 2. 현행 생성 경로 전수표 (§7.1)

service_key 에 넣는 값의 "축"이 경로마다 다르다 — 이것이 혼재의 근원.

| # | 경로 | 파일:라인 | service_key 출처 | offer_id | uniq(service_key 포함) |
|---|------|-----------|------------------|----------|------------------------|
| 1 | `POST /list` offer 기반 | store-product-library.controller.ts:249 | **deriveListingServiceKey** (user membership, `kpa-society→kpa` 축약) | NOT NULL | (org,sk,offer_id) |
| 2 | `POST /list` master 기반 | store-product-library.controller.ts:289 | **deriveListingServiceKey** (동일) | **NULL** | (org,sk,master_id) WHERE offer_id NULL |
| 3 | autoExpandPublicProduct | auto-listing.utils.ts:34 | **ose.service_code** (enrollment) | NOT NULL | (org,sk,offer_id) |
| 4 | autoExpandServiceProduct | auto-listing.utils.ts:81 | **ose.service_code** | NOT NULL | 동일 |
| 5 | autoListPublicProductsForOrg | auto-listing.utils.ts:125 | **호출 파라미터 serviceKey** | NOT NULL | 동일 |
| 6 | autoListServiceProductsForOrg | auto-listing.utils.ts:171 | **호출 파라미터 serviceKey** | NOT NULL | 동일 |
| 7 | EventOffer.ensureStoreProduct | event-offer.service.ts:959 | **파라미터 targetServiceKey** (kpa-groupbuy 등) | NOT NULL | 동일, source_type='event-offer' |
| 8 | EventOffer.createListing | event-offer.service.ts:1136 | **파라미터 input.serviceKey** (event key) | NOT NULL | 사전 SELECT 체크 |
| 9 | approveServiceProduct | product-approval-v2.service.ts:186/208 | **approval.service_key** | NOT NULL | (org,sk,offer_id) |
| 10 | approvePrivateProduct | product-approval-v2.service.ts:371 | **approval.service_key** | NOT NULL | 23505 catch |
| 11 | NeturePartnerContract bridge | partner-contract.service.ts:867 | **recruitment.serviceId ‖ 'neture'** | NOT NULL | 동일, source_type='seller_recruitment' |
| 12 | ProductCandidate promotion | product-candidate.service.ts:485 | **파라미터 input.serviceKey** | **NULL** | (org,sk,master_id) WHERE offer_id NULL |
| 13 | seed-store-hub (테스트) | seed-store-hub.controller.ts:182 | **하드코딩 'kpa'/'cosmetics'** | (구 스키마) | 사전체크 |
| 14 | Migration BackfillServiceOfferListings | 20260403800000 | **ose.service_code** | NOT NULL | (org,sk,offer_id) |
| 15 | Migration BackfillApprovedListings | 20260411200000 | **pa.service_key** | NOT NULL | 동일 |
| 16 | Migration **NormalizeKpaServiceKeys** | 20260411300000 | 기존 **'kpa' → 'kpa-society'** UPDATE(충돌 DELETE) | — | canonical화 |
| — | 엔티티 default | organization-product-listing.entity.ts:38 | **default 'kpa'** (축약 축) | — | — |

**축 3종:** ① 축약 listing 키(derive/default: `kpa`) ② registry/approval 키(canonical: `kpa-society`, enrollment/approval/normalize) ③ event-offer origin 키(`kpa-groupbuy` 등). **동일 컬럼에 서로 다른 의미가 유입 → C.**

---

## 3. 현행 소비처 전수표 (§7.2)

| # | 소비처 | 파일:라인 | 해석축 | 필터/uniq | alias 보정 | resp 노출 |
|---|--------|-----------|--------|-----------|-----------|-----------|
| 1 | B2C 공개 queryVisibleProducts | store-public-utils.ts:162,204 | **소비** | 필터(4중 gate) | ✅ resolveServiceKeys `ANY` | ✗ |
| 2 | Tablet 공개 queryTabletVisibleProducts | store-public-utils.ts:422,492 | **소비** | 필터(TABLET gate) | ✅ resolveServiceKeys `ANY` | ✗ |
| 3 | B2C product handler | store-public-product.handler.ts:148 | **소비** | 필터 | ✅ | ✗ |
| 4 | Tablet handler | store-public-tablet.handler.ts:62 | **소비** | 필터 | ✅ | ✗ |
| 5 | GP 공개 상품 | glycopharm/store.controller.ts:122,174,292 | **소비** | 필터(B2C gate) | ✗ `GLYCOPHARM_OPL_SERVICE_KEYS` allowlist `ANY` | ✗ |
| 6 | GP 체크아웃 채널검증 | glycopharm/checkout.controller.ts:371,406 | **소비** | 필터 | ✗ GP allowlist | ✗ |
| 7 | GP 결제 hook sales-limit | GlycopharmPaymentEventHandler.ts:216 | **소비** | 필터 | ✗ GP allowlist | ✗ |
| 8 | KPA 체크아웃 채널매핑 | kpa-checkout.controller.ts:375 | **소비** | 필터 | ✗ 하드코딩 `= 'kpa-society'` (alias 미보정) | ✗ |
| 9 | 매장 채널상품 관리뷰 | store-channel-products.controller.ts:104,142 | 소비 | **필터 아님**(org+channel scoped) | — | ✅ `serviceKey` |
| 10 | Tablet product-pool 관리뷰 | store-tablet.routes.ts:851 | 소비 | **필터 아님**(org scoped) | — | ✅ raw |
| 11 | 매장 취급/주문가능 (orderable) | pharmacy-products.controller.ts:437,459,478 | **혼합**(소비+origin 판별) | 필터+분류(`='kpa-groupbuy'→event_offer`) | ✗ 리터럴 | ✅ `serviceKey` |
| 12 | KPA 이벤트/공동구매 flows | event-offer.service.ts:201… (다수) | **origin**(groupbuy) | 필터 `= KPA_GROUPBUY` + price join(osp.sk=opl.sk) | ✗ 단일 | ✅ |
| 13 | Supplier 이벤트오퍼 목록 | supplier-offers.controller.ts:148,204 | **origin** | 필터 `= KPA_GROUPBUY` | ✗ | ✅ |
| 14 | Operator 이벤트오퍼 관리 | event-offer-operator.controller.ts:209… | **origin** | 필터 `= KPA_GROUPBUY` | ✗ | ✅ |
| 15 | Supplier 제안 통합 목록 | supplier-event-offer-proposals.controller.ts:250,270 | **origin** | 필터 `ANY([3 event keys])` | ✗ | ✅ |
| 16 | (write) auto-listing | auto-listing.utils.ts:171 | 소비 | **uniq** | ✗ | ✗ |
| 17 | (write) store-library | store-product-library.controller.ts:250,290 | 소비 | **uniq** + derive 매핑 | 역매핑 | ✗ |
| 18 | (migration) NormalizeKpaServiceKeys | 20260411300000 | 소비 | uniq dedupe | canonical화 | ✗ |

**명시적 non-consumer(의도적 org-scoped, service_key 미필터)** — cross-service mismatch 안전지대:
- store-handled-products.routes.ts:122,319,393 (취급제품 통합뷰)
- multilingual-product-content.controller.ts:80 (주석으로 명시 제거)
- store-product-library GET `/`:327 (내 매장 진열목록)
- pharmacy-products.controller.ts EXISTS(isAdded)=org+offer_id만

---

## 4. DB 실측 요약 (§7.3, read-only)

| 항목 | 결과 |
|------|------|
| OPL 총량 | **10건 (전 플랫폼 전체)** — 전량 `service_key='neture'`, `offer_id NULL`, is_active=true |
| OPL vs 소유 org slug | 10/10 **불일치** (opl='neture' vs slug='kpa') |
| 현재 kpa / kpa-society OPL | **0건** (NormalizeKpaServiceKeys는 이후 제거된 과거 데이터에 적용) |
| 현재 event-offer(kpa-groupbuy 등) OPL | **0건** (코드·상수는 존재, 데이터 미적재) |
| product_approvals | **0건** (backfill 소스 없음) |
| enrollment service_code | neture(2)·k-cosmetics(2)·glycopharm(1)·**cosmetics(1)** — k-cosmetics/cosmetics 혼용 |
| **store→service 결정성** | 전 매장(12) 각 **active slug 정확히 1개** → org→소비 서비스 **결정적** |
| slug 도메인 | {kpa, glycopharm, cosmetics} — **neture slug 없음**(neture=origin 축 확증) |
| membership 도메인 | {kpa-society, k-cosmetics, glycopharm, neture, platform} |
| 재태깅 충돌 | 이 org에 기존 'kpa' 동일 master listing **0건** → neture→소비키 재태깅 **무충돌** |
| origin 컬럼 여지 | `source_type`/`source_id`(nullable) **이미 존재**, 현 10건 전량 NULL |
| unique index | `idx_org_listing_unique_v2`(org,**sk**,offer_id) + `idx_org_listing_unique_master`(org,**sk**,master_id WHERE offer_id NULL) — **둘 다 service_key 포함** |

---

## 5. 권장 스키마 설계 (§8.2 · §8.5)

```sql
-- (신규, additive/nullable — 기존 동작 무변경)
ALTER TABLE organization_product_listings
  ADD COLUMN origin_service_key varchar(50) NULL;   -- neture, kpa-groupbuy, glycopharm-event-offer 등
-- source_type / source_id 는 이미 존재 → origin_type 역할로 정착(값 어휘 표준화)
--   store_manual | supplier_offer | operator_seed | event_offer | product_approval | seller_recruitment | migration
```

**unique 정책:**
- 기존 `(org, service_key, offer_id)` / `(org, service_key, master_id) WHERE offer_id NULL` **유지**.
- **origin 컬럼은 unique key에 넣지 않는다** (origin=서술적 메타, identity 아님).
- service_key 가 소비 축으로 canonical화되면, 과거 축약('kpa')/registry('kpa-society') 이중생성 row 는 **dedupe 후 통일** 필요(NormalizeKpaServiceKeys 패턴 재사용).

**3안 비교:**

| 안 | 구성 | 장 | 단 |
|----|------|----|----|
| 1 | origin_service_key 단독 | 단순, 조회 쉬움 | 유입 유형(store_manual vs event_offer) 구분 불가 |
| 2 | origin_type + origin_ref(jsonb) | 유형/참조 유연 | 서비스별 origin 서비스 키 질의 불편 |
| **3 (권장)** | **source_type(기존) + source_id(기존) + origin_service_key(신규)** | **기존 컬럼 재사용(additive), 유형·참조·서비스 3요소 모두 질의 가능, 마이그레이션 최소** | 컬럼 3개 |

→ **3안 채택**: 이미 `source_type`/`source_id`가 event-offer/seller_recruitment/market_trial 에 쓰이고 있어 origin_type 축이 사실상 존재. 여기에 `origin_service_key`만 additive 로 더한다.

---

## 6. 권장 코드 변경 방향 (§8.3 — 실행은 후속 WO)

### 6.1 `deriveListingServiceKey` 대체 (핵심)

```
현재: req.user.memberships → MULTI_MEMBERSHIP_PRIORITY(neture 최우선) → listing key
문제: 등록자 membership 축. multi-membership 사용자가 neture 보유 시 매장과 무관하게 'neture'.

대체(권장): organization_id → platform_store_slugs(active) → registry service_key
  · store→slug 1:1 결정적(실측)이라 모호성 0.
  · 소비 축 canonical(kpa-society 등)로 직접 산출.
  · origin_service_key 에는 등록자 origin(예: 'store_manual' + 등록 서비스) 별도 기록.
```

- offer 기반(#1)·master 기반(#2) 모두 store-context 도출로 통일.
- event-offer/approval/auto-listing 경로는 **소비 키(store slug 기반)** 를 service_key 에, **origin(kpa-groupbuy/approval/enrollment)** 을 origin 축에 분리 기록.

### 6.2 소비 쿼리 정합 (§8.6)

| 소비 유형 | 기준 축 | 변경 방향 |
|-----------|---------|-----------|
| 매장 관리뷰(#9,#10,#17 GET) | organization_id 중심 | 유지(이미 대체로 org-scoped) |
| 공개 B2C/Tablet(#1~#4) | 소비 service_key + resolveServiceKeys | canonical 정렬 후 resolveServiceKeys **단순화/은퇴** 검토(slug=OPL 정합 시) |
| GP 소비(#5~#7) | GLYCOPHARM_OPL_SERVICE_KEYS allowlist | **event-offer 키를 origin 축으로 이관** → 소비 게이트에서 origin 혼입 제거 |
| KPA 체크아웃(#8) | 하드코딩 'kpa-society' | canonical 상수화(alias 보정 일관) |
| event-offer flows(#11~#15) | 현재 service_key='kpa-groupbuy' 필터 | **origin 축(source_type='event_offer' 또는 origin_service_key) 필터로 이관** |

→ 원칙: **공개 visibility 필터는 소비 축만**, event-offer/groupbuy 판별은 **origin 축**.

---

## 7. 기존 데이터 보정 정책 (§8.4 — 이번 WO는 보정 안 함)

| 데이터 군 | 현황 | 보정 방향(후속 apply WO) |
|-----------|------|--------------------------|
| offer_id NULL master 직접등록 (현 10건, neture) | 소유 org slug=kpa | service_key → 'kpa-society'(소비), origin_service_key → 'neture', source_type → 'store_manual' |
| offer_id NOT NULL supplier offer | 현재 0건 | service_key=enrollment→소비키 정렬, origin=supplier |
| product_approval backfill | 현재 0건 | 동일 원칙 |
| event-offer(kpa-groupbuy 등) | 현재 0건 | service_key=소비키, origin_service_key=event key, source_type='event_offer' |
| service_key≠slug 불일치 건 | 10/10 | dry-run 으로 전수 식별 후 재태깅 |

- **재태깅은 unique(service_key 포함) 이동**이므로 반드시 **dry-run 충돌 검사 → apply** 2단계. 현 10건은 무충돌 실측.
- 실제 UPDATE 는 **사용자 승인 후 별도 apply WO**.

---

## 8. 위험 요소와 중단 기준

```
위험:
- service_key 가 unique key 구성요소 → 값 변경이 row identity 이동. 이중생성/충돌 가능.
- resolveServiceKeys(kpa↔kpa-society) 와 GP allowlist(glycopharm↔glycopharm-event-offer)가
  이미 소비/​origin 을 부분적으로 섞고 있어, 한쪽만 바꾸면 회귀.
- event-offer flows 가 service_key='kpa-groupbuy' 를 도메인 필터로 직접 사용 → origin 이관 시 광범위 수정.
- Shared Module(store-public-utils, auto-listing, resolveServiceKeys)이라 KPA/GP/KCos/neture 전 소비처 동시 영향.

중단(후속 분리) 기준:
- origin 이관이 event-offer/groupbuy 도메인 로직 재설계로 확대되면 별도 WO.
- resolveServiceKeys 은퇴가 slug 정규화(platform_store_slugs 값 변경)까지 요구하면 별도 WO.
- 실데이터 재태깅이 unique 충돌을 유발하면 dedupe 정책 확정까지 apply 보류.
```

---

## 9. 후속 WO 목록 (순서 · §12)

```
1) WO-O4O-OPL-SERVICEKEY-ORIGIN-COLUMN-MIGRATION-V1
   - origin_service_key 컬럼 additive 추가 + source_type 어휘 표준화. 기존 동작 무변경(nullable).
2) WO-O4O-STORE-LISTING-SERVICEKEY-DERIVATION-CONTEXT-FIX-V1
   - deriveListingServiceKey → store context(org→slug) 도출로 교체. origin 은 origin 축 기록.
   - (신규 생성분부터 올바른 축 분리 시작)
3) WO-O4O-OPL-SERVICEKEY-CANONICAL-BACKFILL-DRYRUN-V1
   - 기존 row service_key↔slug 불일치 전수 + 재태깅 충돌 dry-run(현 10건 포함). write 0.
4) WO-O4O-OPL-SERVICEKEY-CANONICAL-BACKFILL-APPLY-V1  (사용자 승인 필수)
   - dry-run 근거로 실제 재태깅 + origin backfill.
5) WO-O4O-OPL-CONSUMER-SURFACE-QUERY-ALIGNMENT-V1
   - event-offer flows origin 축 이관 + GP allowlist origin 분리 + resolveServiceKeys 단순화 검토.
```

의존: 1 → 2 → 3 → 4 → 5 (2는 1 없이도 부분 가능하나 origin 기록 위해 1 선행 권장). **apply(4)는 반드시 승인 후.**

---

## 10. write 여부

```
DB write 0 (SELECT/정보스키마 조회만)
코드 변경 0
migration 작성 0
```

---

*결론: OPL.service_key=소비 서비스 면 단일 축(A) + origin 별도 축(source_type/source_id 기존 + origin_service_key 신규, 3안). deriveListingServiceKey=store context(org→slug 결정적)로 대체. 생성 20경로/소비 18처/비소비 4처 전수. 현 데이터 OPL 10건 전량 neture·offer_id NULL·slug 불일치, 재태깅 무충돌. event-offer origin 키가 이미 동일 컬럼에 혼입(GP는 소비 게이트에 포함, KPA는 분리). 후속 5 WO(마이그레이션→derive fix→backfill dryrun→apply(승인)→consumer align). write 0.*
