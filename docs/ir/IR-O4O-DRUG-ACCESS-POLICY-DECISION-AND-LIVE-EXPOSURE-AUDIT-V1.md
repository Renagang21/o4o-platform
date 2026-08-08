# IR-O4O-DRUG-ACCESS-POLICY-DECISION-AND-LIVE-EXPOSURE-AUDIT-V1

> **유형:** 정책 확정 + 운영 DB read-only 실측 (코드·DB·schema·migration 변경 0)
> **기준 커밋:** `166816b1c` 기준 main (`HEAD == origin/main`)
> **실측일:** 2026-08-08 · 채널: `bin/cloud-sql-proxy-v2.exe` (기존 채널, 신규 설치 없음)
> **선행:** [IR-O4O-SERVICE-PHARMACY-PRODUCT-ACCESS-ENFORCEMENT-COVERAGE-AUDIT-V1](IR-O4O-SERVICE-PHARMACY-PRODUCT-ACCESS-ENFORCEMENT-COVERAGE-AUDIT-V1.md)
> **재현 SQL:** [`scripts/audits/drug-access-exposure-inventory.sql`](../../scripts/audits/drug-access-exposure-inventory.sql) (write 구문 0)

---

## 1. ProductMaster 공용 원칙과 의약품 접근정책의 관계

**두 원칙은 충돌하지 않는다. 축이 다르다.**

| 축 | 원칙 | 성격 |
|---|---|---|
| **데이터 소유·저장 구조** | `ProductMaster` 는 전 서비스 공용 SSOT | 어디에 저장되고 누가 소유하는가 |
| **접근 권한 정책** | 일반 서비스는 의약품을 조회·활용할 수 없다 | 누가 무엇을 할 수 있는가 |

선행 IR 초판은 이를 *"양립 불가능"* 으로 기술했으나 **부정확한 판단이었다.**
소유 구조를 바꾸지 않고도 접근 계층에서 통제할 수 있으므로, 두 원칙은 **함께 유지된다.**

### 확정 결론

- `ProductMaster` 는 계속 **전 서비스 공용 SSOT**로 유지한다.
- 서비스별 **복제·소유권 분리를 하지 않는다** (F12 Product Resource Baseline 불변).
- 의약품은 공용 ProductMaster 에 적용되는 **별도 횡단(cross-cutting) 접근정책**으로 통제한다.
- [product-access.utils.ts:9-14](../../apps/api-server/src/modules/store-ai/utils/product-access.utils.ts#L9-L14) 의 service-neutral 선언(2026-07-29 승인)은 **유지된다.** 의약품 게이트는 그 위에 얹히는 별개 관심사다.

---

## 2. 의약품 판정 SSOT

| 순위 | 필드 | 역할 |
|:---:|---|---|
| **1 (SSOT)** | `product_masters.regulatory_type = 'DRUG'` | **의약품 여부의 유일한 기본 판정 기준** |
| 2 | `product_masters.drug_category` | OTC / RX / drug_unspecified 세부 분류. 기본 판정 SSOT 아님 |
| 3 | `product_categories.is_regulated` | **판정 기준에서 제외.** 보조 감사 신호로만 사용 |

**`is_regulated` 를 판정축에서 제외하는 이유 (실측 근거):**

1. 범위 불일치 — 의료기기·건강기능식품 등 비의약품 규제 품목도 포함한다.
2. `category_id IS NULL` 이면 구조적으로 무력하다.
3. **실측상 DRUG 177,413건 전량(100%)이 `category_id IS NULL`** → 현행 gate 실효 **0%** (§3).

---

## 3. 실측 결과 U1~U12

> 채널: Cloud SQL Auth Proxy v2 (기존 `bin/` 바이너리) → psql read-only 세션.
> `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY` 선언. write 구문 0.

### U1. `service_audience_policies` 실제 행 — **5행, seed 와 일치**

| service_key | is_pharmacy_target_service |
|---|:---:|
| `glycopharm` | **true** |
| `kpa-society` | **true** |
| `pharmacy-hub` | **true** |
| `k-cosmetics` | false |
| `neture` | false |

정책 테이블 자체는 건전하다. 문제는 이 정책을 **소비하는 지점이 사실상 없다**는 것이다.

### U2. `regulatory_type` 분포

| regulatory_type | 건수 |
|---|---:|
| **DRUG** | **177,413** |
| 건강기능식품 | 40,948 |
| QUASI_DRUG | 17,148 |
| MEDICAL_DEVICE | 3,826 |
| 일반 / GENERAL | 26 |

### U3 · U4 · U12. 🔴 현행 gate 실효성 — **0%**

| 지표 | 값 |
|---|---:|
| DRUG 총계 | 177,413 |
| `category_id IS NULL` | **177,413 (100.00%)** |
| category 가 `is_regulated=true` (= gate 적용됨) | **0** |
| **gate 가 놓치는 DRUG** | **177,413 (100.00%)** |

> **`assertPharmacyOnlyServiceKeys` 는 배포 이후 단 한 번도 의약품을 차단한 적이 없다.**
> 선행 IR 이 ENFORCED 로 분류한 3개 경로는 **전부 실질 NOT_ENFORCED** 로 정정된다.
> 이는 U3 결과와 무관하게 판정축이 잘못됐다는 사용자 판단을 **실측으로 확증**한다.

### U5. `regulatory_type` × `drug_category`

| regulatory_type | drug_category | 건수 |
|---|---|---:|
| DRUG | **rx (전문의약품)** | **119,548** |
| DRUG | otc | 57,572 |
| DRUG | drug_unspecified | 293 |
| QUASI_DRUG | quasi_drug | 17,148 |
| 건강기능식품 | (NULL) | 40,948 |
| MEDICAL_DEVICE | (NULL) | 3,826 |

DRUG↔drug_category 는 **모순 없음**(DRUG 전량이 rx/otc/unspecified 중 하나). 판정축으로 신뢰 가능.

### U6 · U7. DRUG OrganizationProductListing — **5건, 전부 비약국 서비스**

| service_key | is_pharmacy_service | listings | active |
|---|:---:|---:|---:|
| `neture` | **false** | 5 | **5** |

소규모지만 **정책 위반 데이터가 실재**한다. 5건 모두 `active`. 이 5건은 offer 없이 존재한다(U8 참조) → OPL 이 offer 경유 없이 생성되는 경로가 있다.

### U8 · U9. DRUG offer — **0건**

| distribution_type | drug_offers |
|---|---:|
| SERVICE | 0 |
| PRIVATE | 0 |
| (PUBLIC 행 없음) | 0 |

비약국 service_key 에 연결된 DRUG offer 도 **0건**.

> **의미:** 선행 IR 의 P0-1(PUBLIC 자동확산)은 **아직 발현되지 않았다.** 구조적 위험은 그대로이나 현재 피해는 없다.
> 의약품 공급 트랙이 아직 offer 를 만들지 않았기 때문이며, **첫 의약품 offer 가 등록되는 순간 위험이 실현된다.**

### U10. 🔴 DRUG 공개 랜딩 — **177,413건 전량 `active` / `ok`**

| drug_category | status | exposure_state | landings |
|---|---|---|---:|
| **rx (전문의약품)** | active | ok | **119,548** |
| otc | active | ok | 57,572 |
| drug_unspecified | active | ok | 293 |

**모든 의약품 ProductMaster 에 활성 공개 랜딩이 존재한다.** `public_key` 는 전량 길이 12 (총 랜딩 198,394건).

실제 본문(canonical STORE 설명서) 보유 master:

| drug_category | canonical STORE 보유 |
|---|---:|
| otc | **22,391** |
| rx | 28 |
| drug_unspecified | 4 |

DRUG SPD 총계: canonical 45,090 / deprecated 39,624 / hidden 1,013 / candidate 254.

> **실질 노출:** OTC 22,391건은 **설명서 전문**이, 나머지는 **제품 메타데이터**(명칭·제조사·바코드·규제유형·규격)가
> `optionalAuth` 경로로 노출된다. 비로그인은 명칭만, **로그인만 하면 서비스·소속 무관하게 본문 열람**이 가능하다.

### U11. DRUG commerce — **0건**

| 경로 | 건수 |
|---|---:|
| 장바구니 (master 직접참조) | **0** |
| 장바구니 (listing 경유) | **0** |

**B2C 오염은 아직 없다.** 차단 구현 전에 정리할 기존 데이터가 없다는 뜻이므로, commerce 차단은 순수 예방 조치로 저비용이다.

---

## 4. 역할별 허용·거부 매트릭스 (확정)

| 행위 | 중앙 운영자<br>(`platform:super_admin`) | 약국 서비스<br>운영자·공급자·매장 | 일반 서비스<br>운영자·공급자·매장 | 최종 소비자 |
|---|:---:|:---:|:---:|:---:|
| 의약품 **검색** | ✅ 관리 목적 | ✅ | ❌ | ❌ |
| 의약품 **상세 조회** | ✅ | ✅ | ❌ | ❌ |
| 의약품 **등록·유입**(offer/master/listing) | ✅ | ✅ 허용 범위 | ❌ | ❌ |
| 의약품 **콘텐츠 제작**(설명서·POP·QR·태블릿) | ✅ | ✅ | ❌ | ❌ |
| 의약품 **콘텐츠 연결**(productMasterId 링크) | ✅ | ✅ | ❌ | ❌ |
| 의약품 **소개·경영활용** | ✅ | ✅ | ❌ | — |
| **약국이 적법 게시한 QR·POP·태블릿·사이니지 열람** | ✅ | ✅ | — | **✅ 허용** |
| 의약품 **B2C listing·장바구니·주문·결제** | ❌ | ❌ | ❌ | ❌ |

**핵심 구분 — 제작/게시 권한 ≠ 열람 권한**

- 일반 서비스 운영자가 의약품 QR·POP·태블릿 콘텐츠를 **만드는 것**: 차단
- 일반 매장이 의약품을 가져와 콘텐츠에 **연결하는 것**: 차단
- 약국이 적법 생성한 의약품 QR 을 소비자가 **스캔·열람**: **허용**
- 약국 태블릿·POP·사이니지의 의약품 소개: **허용**
- 해당 화면에서 **구매·장바구니·결제 연결**: 차단

> **따라서 공개 QR 랜딩 자체를 "비약국 소비자이므로 차단" 해서는 안 된다.**
> 대신 **랜딩을 생성·게시한 주체와 연결 원상품이 허용된 약국 서비스에서 만들어졌는지**를 강제한다.

### 현행 랜딩 177,413건의 성격 (중요)

이 랜딩들은 **약국이 게시한 것이 아니다.** `productmaster-landing-bulk-apply.ts` 계열로
**플랫폼이 전 master 에 일괄 생성**한 것이다. 즉 위 예외("약국이 적법하게 게시한 QR")에 **해당하지 않는다.**
→ origin guard 도입 시 **정리(비활성/보류) 대상**이며, 소비자 열람 허용 예외로 오분류해서는 안 된다.

---

## 5. fail-closed 조건 (확정)

다음 경우 의약품 관련 **쓰기·검색·연결을 거부**한다.

1. 서비스 문맥(`serviceKey`)이 요청에 없거나 서버에서 확정할 수 없을 때
2. `serviceKeys` 가 빈 배열일 때 — **현행 no-op 을 거부로 반전**
3. `service_audience_policies` 에 해당 서비스 행이 없을 때 (fallback 상수 의존 금지)
4. actor 의 실제 소속(조직·멤버십·역할)을 서버에서 확인할 수 없을 때
5. `regulatory_type` 이 NULL 이거나 미확정인 master 에 대한 의약품성 판정이 불가할 때

**`serviceKey` · `organizationId` · `storeId` 는 요청값을 신뢰하지 않는다.** 서버에서 실제 소속을 재확인한다.

---

## 6. 기존 위반 데이터 규모 · 정리 필요 영역

| 영역 | 규모 | 정리 필요 | 비고 |
|---|---:|:---:|---|
| 비약국 서비스 DRUG OPL | **5 (전부 active)** | ✅ | `neture` service_key |
| DRUG 공개 랜딩 (플랫폼 일괄생성) | **177,413 (전량 active/ok)** | ✅ **최대 규모** | rx 119,548 포함 |
| ├ 그중 설명서 본문 노출 | 22,423 (otc 22,391 + rx 28 + 기타 4) | ✅ 우선 | 실질 콘텐츠 노출 |
| └ 나머지 메타데이터 노출 | 154,990 | ✅ | 명칭·제조사·바코드 등 |
| DRUG offer | 0 | ❌ 불요 | 미발생 |
| DRUG 장바구니·주문 | 0 | ❌ 불요 | 미발생 |
| DRUG SPD (STORE) | canonical 45,090 | ⚠️ 조건부 | 콘텐츠 자체는 적법. **노출 경로만** 통제 |

> **정리의 성격 주의:** DRUG SPD 45,090건은 약국용 정규 저작물로 **삭제 대상이 아니다.**
> 통제 대상은 *콘텐츠* 가 아니라 *비약국 경로에서의 노출* 이다.

---

## 7. 후속 WO 최종 실행 순서

| 순위 | WO | 근거 | 긴급도 |
|:---:|---|---|:---:|
| 1 | `DRUG-GATE-SSOT-CONSOLIDATION` | 판정축을 `regulatory_type='DRUG'` 로 통일. 현행 gate 실효 0% | 🔴 |
| 2 | `OFFER-MUTATION-GATE-COVERAGE` | updateSupplierOffer·updateDistribution·빈 serviceKeys fail-closed | 🔴 |
| 3 | `PUBLIC-AUTO-EXPANSION-DRUG-GUARD` | offer 0건인 **지금** 넣어야 무피해 | 🔴 |
| 4 | `PRODUCT-SEARCH-AND-DETAIL-CONTEXT-GATE` | 검색·상세에 서비스 문맥 강제 | 🟠 |
| 5 | `DRUG-COMMERCE-ABSOLUTE-BLOCK` | 기존 데이터 0 → 순수 예방, 저비용 | 🟠 |
| 6 | `DRUG-CONTENT-AUTHORING-AND-LINK-GATE` | 제작·연결 단계 약국 권한 강제 | 🟠 |
| 7 | `DRUG-PUBLIC-CONTENT-ORIGIN-GUARD` | 랜딩 origin 강제 + 177,413건 정리 | 🟠 |
| 8 | `DRUG-POLICY-LIFECYCLE` | 신규서비스 자동 seed·soft delete·stale 감사 | 🟡 |
| 9 | `DRUG-GATE-REGRESSION-TESTS` | 현재 회귀 테스트 0건 | 🟡 |
| 10 | 기존 위반 데이터 정리 | OPL 5 + 랜딩 177,413 (건별 승인 필요) | 🟡 |

### 공통 게이트 설계 지침 — 거대 권한엔진 금지

단일 대형 엔진 대신 **판정 함수 3개**를 중심에 둔다.

```
isDrugProduct(productMaster)                       // regulatory_type='DRUG' 단일 판정
isPharmacyAudienceContext(actor, service, org)     // 서버 확인된 소속 기반
assertDrugActionAllowed(action, context, master)   // 위 둘의 조합 + fail-closed
```

`action` 은 `search | read | write | link | publish | commerce` 수준으로 최소화한다.

---

## 8. 감사 한계

1. **U10 랜딩의 생성 주체를 행 단위로 확증하지 않았다.** 일괄 생성 스크립트 존재와 전량 active/ok 패턴에서 추론했다.
2. 주문·결제 테이블은 장바구니 축(U11)으로만 확인했다. 과거 완료주문 이력은 별도 조회가 필요하다.
3. 태블릿·사이니지·POP 의 DRUG 참조는 SPD·랜딩 축으로 간접 확인했으며 각 도메인 테이블 전수는 미수행.
4. 5건의 `neture` DRUG OPL 이 **어떤 경로로 생성됐는지** 미규명 (offer 0건이므로 offer 경유 아님).

---

## 검증 · Git

- 코드·설정·schema·migration **변경 0건** / DB **write 0건** (read-only 세션 명시)
- 신규 접속 도구 설치 **0** — 기존 `bin/cloud-sql-proxy-v2.exe` 사용
- 병렬 세션 WIP 파일 **미접촉**
- 산출물: 본 문서 + `scripts/audits/drug-access-exposure-inventory.sql` + 선행 IR §10.1 정정

---

*Decision + live audit · read-only · 2026-08-08*
