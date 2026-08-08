# WO-O4O-DRUG-ACCESS-POLICY-DECISION-AND-LIVE-EXPOSURE-AUDIT-V1

> **유형:** 정책 확정 + 운영 DB read-only 실측 (게이트 구현·데이터 수정·schema/migration 변경 없음)
> **기준 커밋:** `442646b87` (main, `HEAD == origin/main`, divergence 0/0)
> **실측일:** 2026-08-08 · 채널: `bin/cloud-sql-proxy-v2.exe` (기존 채널, 신규 설치 0)
> **재현 SQL:** [`scripts/audits/drug-access-exposure-inventory-v2.sql`](../../scripts/audits/drug-access-exposure-inventory-v2.sql) (write 구문 0)
> **선행:** [IR 커버리지 감사](../ir/IR-O4O-SERVICE-PHARMACY-PRODUCT-ACCESS-ENFORCEMENT-COVERAGE-AUDIT-V1.md) · [IR 정책결정 v1](../ir/IR-O4O-DRUG-ACCESS-POLICY-DECISION-AND-LIVE-EXPOSURE-AUDIT-V1.md)

---

## 0. 한 줄 요약

**코드 게이트는 실효 0% 이지만, 운영 데이터 오염은 사실상 아직 없다.**
공급 트랙이 미가동(전체 offer 2건, DRUG offer 0건)이라 **지금이 게이트 도입의 최적 시점**이며,
정리해야 할 기존 데이터는 **공개 랜딩 177,413건 + 비약국 OPL 5건** 두 가지뿐이다.

---

## 1. 확정 정책

| # | 정책 |
|:---:|---|
| 1 | `ProductMaster` 는 전 서비스 공용 SSOT 로 유지한다 |
| 2 | 의약품 여부의 기본 판정은 **`product_masters.regulatory_type='DRUG'`** 이다 |
| 3 | `product_categories.is_regulated` 는 **의약품 판정 기준으로 사용하지 않는다** |
| 4 | `drug_category` 는 OTC/RX 등 **세부 분류에만** 사용한다 |
| 5 | 일반 서비스·일반 공급자·일반 매장은 의약품을 검색·조회·등록·유입하거나 콘텐츠에 연결할 수 없다 |
| 6 | 중앙 운영자는 관리 목적으로 예외 접근할 수 있다 |
| 7 | 약국 대상 서비스의 운영자·공급자·매장은 의약품을 조회하고 매장 경영활용 콘텐츠로 사용할 수 있다 |
| 8 | 의약품의 B2C listing·장바구니·주문·결제는 **모든 서비스에서 차단**한다 |
| 9 | 약국이 적법하게 게시한 의약품 QR·POP·태블릿·사이니지는 **소비자 열람을 허용**한다 |
| 10 | 공개 열람을 막는 것이 아니라 **콘텐츠 생성·게시·상품 연결 권한**을 통제한다 |
| 11 | `serviceKey`·`organizationId`·`storeId` 는 요청값만 신뢰하지 않고 **서버의 실제 소속정보**로 판정한다 |
| 12 | 서비스 문맥을 확정할 수 없으면 의약품 검색·쓰기·연결은 **fail-closed** 한다 |

---

## 2. ProductMaster 공용 원칙과 의약품 접근제한의 관계

두 원칙은 **직교(orthogonal)** 하며 함께 유지된다.

| 축 | 원칙 | 질문 |
|---|---|---|
| 데이터 소유·저장 구조 | ProductMaster = 전 서비스 공용 SSOT | *어디에 저장되고 누가 소유하는가* |
| 접근 권한 정책 | 일반 서비스는 의약품 접근 불가 | *누가 무엇을 할 수 있는가* |

- 서비스별 **복제·소유권 분리를 하지 않는다** (F12 Product Resource Baseline 불변).
- [product-access.utils.ts:9-14](../../apps/api-server/src/modules/store-ai/utils/product-access.utils.ts#L9-L14) 의 service-neutral 선언(2026-07-29 승인)은 **유지**되며, 의약품 게이트는 그 위에 얹히는 **별개 횡단 관심사**다.

> 선행 IR 초판이 이를 "양립 불가능"으로 기술한 것은 부정확했고 이미 정정되었다.

---

## 3. 역할·서비스·행위별 허용/거부 매트릭스

| 행위 | 중앙 운영자<br>`platform:super_admin` | 약국 대상 서비스<br>운영자·공급자·매장 | 일반 서비스<br>운영자·공급자·매장 | 최종 소비자 |
|---|:---:|:---:|:---:|:---:|
| 의약품 검색 | ✅ 관리 목적 | ✅ | ❌ | ❌ |
| 의약품 상세 조회 | ✅ | ✅ | ❌ | ❌ |
| 의약품 offer 등록·수정 | ✅ | ✅ 허용 범위 | ❌ | ❌ |
| 의약품 listing(OPL) 생성·활성화 | ✅ | ✅ | ❌ | ❌ |
| 의약품 StoreLocalProduct 등록 | ✅ | ✅ | ❌ | ❌ |
| 의약품 콘텐츠 **제작**(설명서·POP·QR·태블릿·사이니지) | ✅ | ✅ | ❌ | ❌ |
| 의약품 콘텐츠 **연결**(`productMasterId` 링크) | ✅ | ✅ | ❌ | ❌ |
| 의약품 랜딩 **생성·게시** | ✅ | ✅ | ❌ | ❌ |
| 약국이 적법 게시한 QR·POP·태블릿·사이니지 **열람** | ✅ | ✅ | — | **✅ 허용** |
| 의약품 B2C listing·장바구니·주문·결제 | ❌ | ❌ | ❌ | ❌ |

### 제작·게시 권한 ≠ 열람 권한

- 일반 서비스 운영자가 의약품 QR·POP·태블릿 콘텐츠를 **만드는 것**: 차단
- 일반 매장이 의약품을 가져와 콘텐츠에 **연결하는 것**: 차단
- 약국이 적법 생성한 의약품 QR 을 소비자가 **스캔·열람**: **허용**
- 약국 태블릿·POP·사이니지의 의약품 소개: **허용**
- 해당 화면에서 **구매·장바구니·결제 연결**: 차단

---

## 4. 의약품 판정 SSOT 와 보조 필드

| 순위 | 필드 | 역할 | 근거 |
|:---:|---|---|---|
| **1 (SSOT)** | `product_masters.regulatory_type='DRUG'` | 유일한 기본 판정 기준 | U2·U5 — 모수 177,413, 모순 0 |
| 2 | `product_masters.drug_category` | OTC/RX/unspecified 세부 분류 | U5 — DRUG 전량이 3값 중 하나 |
| 3 | `product_categories.is_regulated` | **판정 제외**. 보조 감사 신호 | U3·U4·U13 — 실효 0% |

**`is_regulated` 제외 근거 (실측):**
1. 범위 불일치 — 의료기기·건강기능식품 등 비의약품 규제 품목 포함
2. `category_id IS NULL` 이면 구조적 무력
3. **DRUG 177,413건 전량(100%)이 `category_id IS NULL`** → 현행 게이트 커버리지 **0건**

---

## 5. 공개 콘텐츠 소비 예외

**허용:** 약국 대상 서비스에서 **적법하게 생성·게시된** 의약품 QR·POP·태블릿·사이니지의 소비자 열람.

**강제 지점:** 소비 단계가 아니라 **① 랜딩·콘텐츠 생성 주체 ② 게시 행위 ③ 원상품(`productMasterId`) 연결** 3곳.

> **현행 랜딩 177,413건은 이 예외에 해당하지 않는다.**
> 약국이 게시한 것이 아니라 `productmaster-landing-bulk-apply.ts` 계열로 **플랫폼이 전 master 에 일괄 생성**한 것이다.
> origin guard 도입 시 소비자 열람 허용 예외로 오분류하면 **rx 119,548건이 그대로 열린 채 남는다.**

---

## 6. fail-closed 적용 조건

다음의 경우 의약품 관련 **검색·쓰기·연결을 거부**한다.

1. 서비스 문맥(`serviceKey`)이 요청에 없거나 서버에서 확정할 수 없을 때
2. `serviceKeys` 가 빈 배열일 때 — **현행 no-op([offer.service.ts:112](../../apps/api-server/src/modules/neture/services/offer.service.ts#L112))을 거부로 반전**
3. `service_audience_policies` 에 해당 서비스 행이 없을 때 (하드코딩 fallback 의존 금지)
4. actor 의 실제 소속(조직·멤버십·역할)을 서버에서 확인할 수 없을 때
5. `regulatory_type` 이 NULL·미확정이라 의약품성 판정이 불가할 때

---

## 7. U1~U14 실측 결과

### U1. `service_audience_policies` — 5행, seed 와 일치

| service_key | is_pharmacy_target_service |
|---|:---:|
| `glycopharm` · `kpa-society` · `pharmacy-hub` | **true** |
| `k-cosmetics` · `neture` | false |

정책 테이블 자체는 건전하다. 문제는 이를 **소비하는 지점이 사실상 없다**는 것.

### U2. `regulatory_type` 분포

| regulatory_type | 건수 |
|---|---:|
| **DRUG** | **177,413** |
| 건강기능식품 | 40,948 |
| QUASI_DRUG | 17,148 |
| MEDICAL_DEVICE | 3,826 |
| 일반 / GENERAL | 26 |

### U3 · U4 · U13. 🔴 현행 게이트 누락 — **177,413건 (100.00%)**

| 지표 | 값 |
|---|---:|
| DRUG 총계 | 177,413 |
| `category_id IS NULL` | **177,413 (100.00%)** |
| category row 부재 | 177,413 |
| `is_regulated=true` (게이트 적용됨) | **0** |
| **게이트가 놓치는 DRUG** | **177,413 (100.00%)** |

> `assertPharmacyOnlyServiceKeys` 는 배포 이후 **단 한 번도 의약품을 차단한 적이 없다.**
> 선행 IR 이 ENFORCED 로 분류한 3개 경로는 **전부 실질 NOT_ENFORCED**.

### U5. `regulatory_type` × `drug_category` — **모순 0**

| regulatory_type | drug_category | 건수 |
|---|---|---:|
| DRUG | **rx (전문의약품)** | **119,548** |
| DRUG | otc | 57,572 |
| DRUG | drug_unspecified | 293 |
| QUASI_DRUG | quasi_drug | 17,148 |
| 건강기능식품 / MEDICAL_DEVICE / GENERAL | (NULL) | 44,800 |

DRUG 전량이 rx/otc/unspecified 중 하나 → **`regulatory_type='DRUG'` 를 SSOT 로 쓰는 데 데이터 장애 없음** (중지 조건 미해당).

### U6 · U7. DRUG offer — **0건** (전체 offer 자체가 2건)

| 지표 | 값 |
|---|---:|
| 전체 `supplier_product_offers` | **2** |
| DRUG offer | **0** |
| QUASI_DRUG offer | 0 |
| DRUG offer 중 `serviceKeys=[]` | 0 |
| DRUG offer 중 `is_public=true` | 0 |

> **공급 트랙이 아직 가동되지 않았다.** 선행 IR 의 P0(PUBLIC 자동확산)은 **구조적 위험은 그대로이나 미발현**이다.
> → **첫 의약품 offer 등록 전에 게이트를 넣으면 정리 비용이 0이다.**

### U8 · U9. DRUG OPL — **5건, 전부 비약국(`neture`), 전부 active, 전부 offer 없음**

| service_key | is_pharmacy | listings | active | **offer_id 없음** |
|---|:---:|---:|---:|---:|
| `neture` | **false** | 5 | **5** | **5** |

> **중요:** 5건 모두 `offer_id IS NULL` 이다. offer 를 경유하지 않고 OPL 이 생성되는 경로가 실재한다는 뜻이며,
> offer 축에만 게이트를 걸면 이 경로는 계속 열린다.

### U10. DRUG StoreLocalProduct — **구조적으로 0**

| 지표 | 값 |
|---|---:|
| `store_local_products` 의 master 참조 컬럼 수 | **0 (구조적 부재)** |
| StoreLocalProduct 총계 | 47 (active 10, 3개 조직) |
| barcode 가 DRUG master 와 일치 | **0** |

`store_local_products` 는 `barcode` 만 가질 뿐 ProductMaster 를 참조하지 않는다 → **DRUG 유입 경로 아님**(현 시점).

### U11. DRUG 콘텐츠 노출

| 축 | 값 |
|---|---:|
| **공개 랜딩 (`product_landings`)** | **177,413 — 전량 `active`/`ok`** |
| ├ rx | **119,548** |
| ├ otc | 57,572 |
| └ drug_unspecified | 293 |
| **SPD (`shared_product_descriptions`, STORE)** | canonical 45,090 (22,423 masters) / deprecated 39,624 / hidden 1,013 / candidate 254 |
| 콘텐츠 연결 (`kpa_store_content_product_links`) | **0** |
| 태블릿 (`store_tablet_displays`) | **0** |
| 전역 AI 콘텐츠 / 태그 | **0 / 0** |
| `service_products` | **0** |
| `store_products` / `store_product_profiles` | **0 / 0** |
| QR·POP·사이니지 (`store_qr_codes`·`store_pops`·`signage_*`) | master 직접참조 컬럼 **0** (구조적 부재) |

> **실질 노출은 공개 랜딩 단 하나다.** 나머지 콘텐츠 축은 전부 0.
> QR·POP·사이니지는 `master_id` 를 갖지 않아 `kpa_store_content_product_links`(현재 0) 를 경유해야만 상품과 연결된다.

### U12. B2C commerce — **0건**

| 축 | 값 |
|---|---:|
| DRUG 장바구니 (master 직접참조) | **0** |
| DRUG 장바구니 (listing 경유) | **0** |
| `checkout_orders` 총계 | 4 |
| DRUG master 를 참조하는 주문 | **0** |

**B2C 오염 없음.** 차단은 순수 예방 조치이며 정리 대상 데이터가 없다.

### U14. 정책 행 부재·stale — **없음**

| 확인 | 결과 |
|---|---|
| 데이터에 등장하나 정책 행이 없는 `service_key` (OPL·service_products) | **0건** |
| 정책 행 5개 vs 실제 DRUG OPL 보유 | `neture`(비약국) 만 5건, 나머지 4개 서비스 0건 |

하드코딩 fallback(`['glycopharm','kpa-society']`)과 운영 데이터는 **불일치 없음** — 단 `pharmacy-hub` 는 DB 행에만 존재하므로 **fallback 경로로 판정되면 비약국으로 오판**된다(구조적 위험 잔존).

---

## 8. 비약국 서비스의 기존 의약품 노출 규모

| 축 | 규모 | 비고 |
|---|---:|---|
| DRUG offer | **0** | 공급 트랙 미가동 |
| DRUG OPL (비약국 `neture`) | **5 (전부 active, 전부 offer 없음)** | 유일한 listing 오염 |
| DRUG StoreLocalProduct | **0** | 구조적 부재 |
| DRUG 콘텐츠 연결·태블릿·AI·service_products | **0** | 전 축 0 |
| **DRUG 공개 랜딩** | **177,413 (전량 active/ok)** | **최대 노출** — rx 119,548 포함 |
| DRUG B2C(장바구니·주문) | **0** | 오염 없음 |

---

## 9. 현행 게이트가 놓친 데이터 규모

**177,413건 / 100.00%** — DRUG 전량.
게이트가 실제로 차단한 건수는 **0건**이며, 이는 U3 결과와 무관하게 **판정축 자체가 잘못됐기 때문**이다.

---

## 10. B2C 진입 여부

**진입 사례 없음.** 장바구니 0 · 주문 0 (전체 주문 4건 중 DRUG 참조 0).

---

## 11. 데이터 정리가 필요한 영역

> **본 WO 에서는 정리하지 않는다.** 신규 유입 차단과 기존 데이터 정리는 **분리한다.**

| 우선순위 | 대상 | 규모 | 성격 |
|:---:|---|---:|---|
| 1 | **DRUG 공개 랜딩 (플랫폼 일괄생성)** | **177,413** | 비활성/보류 판단 필요. rx 119,548 우선 |
| 2 | 비약국(`neture`) DRUG OPL | **5** | 전부 active·offer 없음. 생성 경로 규명 선행 |
| — | DRUG SPD (canonical 45,090) | — | **삭제 대상 아님.** 약국용 정규 저작물. 통제 대상은 *콘텐츠* 가 아니라 *비약국 경로 노출* |
| — | offer·장바구니·주문·태블릿·AI 콘텐츠 | 0 | 정리 불요 |

---

## 12. 후속 구현 WO 순서

| 순위 | WO | 근거 | 긴급도 |
|:---:|---|---|:---:|
| 1 | `DRUG-GATE-SSOT-CONSOLIDATION` | 판정축을 `regulatory_type='DRUG'` 로 통일. 현행 실효 0% | 🔴 |
| 2 | `OFFER-MUTATION-GATE-COVERAGE` | updateSupplierOffer·updateDistribution·빈 serviceKeys fail-closed | 🔴 |
| 3 | `PUBLIC-AUTO-EXPANSION-DRUG-GUARD` | **DRUG offer 0건인 지금 넣으면 정리 비용 0** | 🔴 |
| 4 | `PRODUCT-SEARCH-AND-DETAIL-CONTEXT-GATE` | 검색·상세에 서비스 문맥 강제 | 🟠 |
| 5 | `DRUG-COMMERCE-ABSOLUTE-BLOCK` | 기존 데이터 0 → 순수 예방, 저비용 | 🟠 |
| 6 | `DRUG-CONTENT-AUTHORING-AND-LINK-GATE` | 콘텐츠 축 현재 0 → 지금이 최적 | 🟠 |
| 7 | `DRUG-PUBLIC-CONTENT-ORIGIN-GUARD` | 랜딩 origin 강제 (+177,413 정리는 10번으로 분리) | 🟠 |
| 8 | `DRUG-POLICY-LIFECYCLE` | 신규서비스 자동 seed·fallback 제거·stale 감사 | 🟡 |
| 9 | `DRUG-GATE-REGRESSION-TESTS` | 현재 회귀 테스트 0건 | 🟡 |
| 10 | 기존 위반 데이터 정리 | 랜딩 177,413 + OPL 5 (건별 승인) | 🟡 |

### 게이트 설계 지침 — 거대 권한엔진 금지

```
isDrugProduct(productMaster)                       // regulatory_type='DRUG' 단일 판정
isPharmacyAudienceContext(actor, service, org)     // 서버 확인된 소속 기반
assertDrugActionAllowed(action, context, master)   // 위 둘의 조합 + fail-closed
```

`action` 은 `search | read | write | link | publish | commerce` 로 최소화한다.

> **OPL 축을 빠뜨리지 말 것** — U9 에서 DRUG OPL 5건이 전부 `offer_id IS NULL` 이었다.
> offer 축에만 게이트를 걸면 이 경로는 그대로 열린 채 남는다.

---

## 13. 감사 한계

1. 랜딩 177,413건의 **생성 주체를 행 단위로 확증하지 않았다** — 일괄 생성 스크립트 존재와 전량 active/ok 패턴에서 추론.
2. `neture` DRUG OPL 5건의 **생성 경로 미규명** (offer 0건이므로 offer 경유 아님).
3. QR·POP·사이니지는 **구조적 master 미참조**를 확인했을 뿐, `landing_target_id` 다형 참조를 통한 간접 연결 전수는 미수행.
4. `checkout_orders.items` JSONB 탐지는 `productMasterId`/`masterId`/`productId` 3개 키만 확인했다.

---

## 검증 · Git

- 코드·DB·schema·migration **변경 0건** / DB **write 0건** (`SET SESSION ... READ ONLY` 명시)
- 신규 접속 도구 설치 **0** — 기존 `bin/cloud-sql-proxy-v2.exe` 사용
- 병렬 세션 WIP **미접촉** (문서 파일 겹침 없음)
- 산출물: 본 문서 + `scripts/audits/drug-access-exposure-inventory-v2.sql`

---

*Policy decision + live exposure audit · read-only · 2026-08-08 · base `442646b87`*
