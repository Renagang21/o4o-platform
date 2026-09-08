# O4O-STORE-CONTENT-AND-EXECUTION-MODEL-V1

> **Status**: Active · **성격**: Canonical Architecture & Product Baseline
> **작성일**: 2026-09-08 · **근거 WO**: `WO-O4O-STORE-CONTENT-TABLET-QR-CANONICAL-BASELINE-AND-LEGACY-CENSUS-V1`
> **현재 코드 census(자매 문서)**: [`IR-O4O-STORE-CONTENT-TABLET-QR-CURRENT-STATE-AND-LEGACY-CENSUS-V1`](../investigations/IR-O4O-STORE-CONTENT-TABLET-QR-CURRENT-STATE-AND-LEGACY-CENSUS-V1.md)

## 0. 이 문서의 위치

O4O 의 매장 Content · Tablet · QR 구현은 여러 시기에 걸쳐 누적됐다(`store_tablet_displays` → Screen Set → 코너×콘텐츠 → `content_list`, `store_qr_codes` ↔ `product_landings`). 본 문서는 그 누적을 **하나의 canonical 개념 모델**로 고정한다.

**상위 문서 (충돌 시 우선):**

| 순위 | 문서 |
|:---:|---|
| 1 | `CLAUDE.md` |
| 2 | [`O4O-BUSINESS-PHILOSOPHY-V1`](O4O-BUSINESS-PHILOSOPHY-V1.md) |
| 3 | [`O4O-STORE-COMMERCE-BOUNDARY-V1`](O4O-STORE-COMMERCE-BOUNDARY-V1.md) — **본 문서는 이 경계를 전제로 한다** |
| 4 | **본 문서** — Product / Content / Execution 3계층 |

**하위·자매 문서 (본 문서와 정합해야 함):**

- [`O4O-CONTENT-TYPE-TAXONOMY-V1`](../architecture/O4O-CONTENT-TYPE-TAXONOMY-V1.md) — 용어·저장소 대응표. 본 문서 §1 의 **Content 계층 세부 분류**.
- [`O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1`](../architecture/O4O-CONTENT-PRODUCTION-FLOW-CANONICAL-V1.md) — Content 를 **만드는** 6단계 흐름.
- [`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md) — 매장 실행자산 테이블 경계.
- [`ADR-O4O-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1`](../architecture/ADR-O4O-SCREEN-CONTENT-CORE-AND-ROLE-EXTENSION-ARCHITECTURE-V1.md) — Screen Set Core/Extension 경계.
- [`O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1`](O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1.md) — QR 2계층 과금 정책.
- [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md) (F12) — Product Resource 2계층.
- [`O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1`](O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) — PH 서비스 모델.

기존 문서를 대체하지 않는다. 본 문서는 그 문서들 **위에서 3계층 어휘와 소비 계약**을 고정한다.

---

## 1. Product / Content / Execution 3계층

### 1-1. 정의

| 계층 | 정의 | 이 계층이 아닌 것 |
|---|---|---|
| **Product** | 상품의 **정체성과 사실 데이터**. 무엇인가, 어떤 성분·규격·허가·식별자를 갖는가. SSOT = `ProductMaster`. | 표현·문구·디자인·대상별 편집 |
| **Content** | 상품·건강·매장 정보를 **특정 목적과 대상에게 보여주기 위한 표현물**. 제목·구성·문장·이미지·언어. | 상품 자체의 사실 정의 |
| **Execution** | Content 를 **실제 매장에서 전달·사용하는 수단**. | 콘텐츠 본문의 소유·저작 |

### 1-2. 구조도

```text
                      ┌──────────────────────────────┐
                      │  Product  (SSOT)             │
                      │  ProductMaster               │
                      └───────────┬──────────────────┘
                                  │ (참조 — 역방향 FK 없음, F12 불변식 6)
        ┌────────────────┬────────┴────────┬──────────────────┬──────────────────┐
        ▼                ▼                 ▼                  ▼                  ▼
  B2B description   B2C description   STORE canonical    store-owned         general store
  (공급자→매장)      (소비자 대상)      description        product content     content
                                      (매장용 정본)       (내 매장 전용)      (건강정보/캠페인/
                                                                              매장안내/이벤트)
        └────────────────┴─────────────────┴──────────────────┴──────────────────┘
                                  │
                                  ▼
                      ┌──────────────────────────────┐
                      │  Content                     │
                      │  (표현물 — 목적 x 대상)       │
                      └───────────┬──────────────────┘
                                  │
        ┌────────────┬────────────┼────────────┬────────────┐
        ▼            ▼            ▼            ▼            ▼
     Tablet         QR           POP        Signage        ESL
                              --- Execution ---
```

### 1-3. 계층 불변식

1. **Content 는 Product 를 수정하지 않는다.** 매장이 어떤 설명을 고르든 `ProductMaster` 는 불변이다.
2. **Execution 은 Content 를 복제할 이유가 없다.** 매체별 사본 원장을 새로 만들지 않는다(§2-3).
3. **"Content 로 본다"가 저장 테이블 통합을 뜻하지 않는다.** 기존 원장(`shared_product_descriptions` · `kpa_store_contents` · `cms_contents` · `store_execution_assets` 등)은 유지하고, **공통 소비 계약(resolve 계약)** 을 정의해 Execution 이 원장을 몰라도 되게 한다.
4. **Execution 은 판매가 아니다.** [`O4O-STORE-COMMERCE-BOUNDARY-V1`](O4O-STORE-COMMERCE-BOUNDARY-V1.md) 에 따라 Tablet/QR/POP/Signage/ESL 은 **정보·콘텐츠 전달 및 매장 실행 수단**이며, 소비자 결제·장바구니·주문 진입점을 갖지 않는다.

---

## 2. 상품 콘텐츠 계약 (Product Content Contract)

Tablet 등 Execution 매체에서 **개별 상품을 표시**할 때의 해석 순서는 전 매체에서 동일하다.

```text
1순위  매장이 해당 상품에 명시적으로 연결한 "내 매장 콘텐츠"
2순위  STORE canonical 설명서 (shared_product_descriptions, description_type='STORE', status='canonical')
3순위  콘텐츠 없음 상태 (빈 화면이 아니라 "콘텐츠 없음"으로 명시)
```

### 2-1. 언어

각 순위 안에서 viewer 언어 → `ko` fallback. 언어 fallback 이 순위 fallback 보다 **먼저** 적용된다.

### 2-2. 금지 — B2B / B2C 설명서를 태블릿 기본 설명으로 쓰지 않는다

`description_type` 이 `B2B` 또는 `B2C` 인 설명서는 각각 공급자→매장 거래 화면과 소비자 판매채널을 위한 표현물이다. **매장 Execution 의 기본 설명으로 자동 승격하지 않는다.** 매장이 명시적으로 선택한 경우에만(=1순위 경로로 등록된 경우에만) 사용한다.

### 2-3. 금지 — 별도 "tablet product description" 사본 원장을 만들지 않는다

매체별(태블릿용 / QR용 / POP용) 상품 설명 사본 테이블을 신설하지 않는다. 매체는 위 2순위 계약으로 **읽기만** 한다.

### 2-4. 금지 — 매장 선택이 ProductMaster 를 바꾸지 않는다

선택은 매장 x 상품의 **연결(link)** 이지 상품 속성이 아니다.

---

## 3. 일반 매장 콘텐츠 계약 (General Store Content Contract)

상품에 종속되지 않는 콘텐츠도 Execution 의 1급 대상이다.

- 건강정보 / 질환·복약 정보
- 캠페인 · 이벤트 · 프로모션 안내
- 교육형 정보
- 매장 안내(영업시간·위치·서비스·상담 안내)
- 기타 매장 콘텐츠

**계약:** Tablet · QR · POP · Signage 어디에서든 **상품 콘텐츠와 동일한 선택 UX·동일한 resolve 계약**으로 고를 수 있어야 한다. "상품 QR"·"상품 블록"만 존재하고 일반 콘텐츠는 못 붙이는 매체는 canonical 이 아니다.

---

## 4. Tablet 정의 — 3단계

| 단계 | 이름 | 정의 |
|:---:|---|---|
| **A** | **Content authoring** | 화면 구성(Screen Set)을 만들고 편집한다. 어떤 블록을, 어떤 콘텐츠로, 어떤 순서로. |
| **B** | **Tablet operation** | 어느 코너·어느 태블릿에 어느 Screen Set 을 **적용·교체**한다. 저작과 분리된 운영 행위. |
| **C** | **Runtime** | 실제 매장 태블릿이 재생한다. 공개 resolve 계약으로만 동작한다. |

### 4-1. 계약

- **A ≠ B.** 편집이 곧 적용이 아니다. 적용은 명시적 운영 행위다.
- **KPA-Society 와 PharmacyHub 는 A·B·C 모두 동일 계약**이다.
- **현재의 메뉴명·페이지 구조·화면 분할은 canonical 정의가 아니라 구현 세부사항**이다. 본 문서는 3단계의 존재와 분리만 고정한다.

---

## 5. QR 정의

**QR 은 "상품 설명서 QR" 이 아니다.**

> QR = **Content 또는 정보 대상을 소비자의 스마트폰으로 전달하는 매장 Execution / Delivery channel.**

지원 가능한 target 상위 개념:

| target | 의미 |
|---|---|
| **Product information** | 상품 자체의 식별·정보 (대표 랜딩 — §6-A) |
| **Product content** | 특정 상품에 연결된 설명 콘텐츠 |
| **General content** | 상품에 종속되지 않는 매장 콘텐츠 (§3) |
| **Screen Set** | 태블릿 화면 구성을 모바일로 전달 |
| **External link** | 외부 URL |
| **기타 명시적 공개 대상** | 향후 확장 — 단, **연결 대상이 없는 QR 타입은 만들지 않는다**(스캔 시 빈 화면 0) |

---

## 6. ProductMaster 대표 QR vs Store QR — 합치지 않는다

| | **A. ProductMaster representative landing/QR** | **B. Store QR** |
|---|---|---|
| 경로 | `ProductMaster → product_landings → /p/{public_key}` | `organization → store_qr_codes → /qr/{slug}` |
| 성격 | 제품 **자체**를 식별·설명하는 **공통 대표 진입점** | 특정 매장이 특정 목적·콘텐츠를 전달하는 **실행 자산** |
| 소유 | 플랫폼 공통(공공재) | 매장(organization) |
| 수 | 상품당 1개 | 매장이 목적별로 다수 |
| 과금 | 무료·영구 ([`QR-ENTITLEMENT-TWO-TIER`](O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1.md) 1-A) | entitlement 대상 (1-B) |

**계약:** 두 축을 **통합하지 않는다.** UI·코드·문구에서 서로를 대체하지 않으며, 한쪽 삭제가 다른 쪽에 영향을 주지 않는다. 매장이 대표 랜딩을 자기 QR 로 쓰고 싶으면 Store QR 이 대표 랜딩을 **target 으로 가리킨다**(복제 아님).

---

## 7. QR Placement 개념

QR 이 **무엇을 가리키는가(target)** 와 **어디서 사용되는가(placement)** 를 분리한다.

```text
QR = target(무엇을 전달)  x  placement(어디서 전달)
```

placement 예시(상위 개념):

`TABLET` · `SHELF` · `ESL` · `POP` · `POSTER` · `COUNSELING_TABLE` · `ENTRANCE` · `PRINT` · `OTHER`

### 7-1. 이번 회차 범위

**신규 schema 를 확정·구현하지 않는다.** 개념과 요구 계약만 canonical 로 고정한다.

### 7-2. 요구 계약 (구현 시 지켜야 할 것)

1. placement 는 **target 과 독립**한 축이다. target 타입별로 placement 를 하드코딩하지 않는다.
2. 같은 target 을 서로 다른 placement 로 **여러 번** 배치할 수 있어야 한다.
3. placement 추가·변경이 **QR 주소(slug)·인쇄물 재발급을 유발하지 않아야** 한다 ([`QR-ENTITLEMENT-TWO-TIER`](O4O-QR-ENTITLEMENT-TWO-TIER-POLICY-V1.md) §0 과 동일한 이유).
4. 기존 유사 개념(`store_execution_assets.usage_type` 등)을 **먼저 조사**하고, 중복 신설이 아닌 확장을 우선한다.

---

## 8. Analytics 원칙

장기적으로 다음 축의 분석이 가능해야 한다.

```text
Content  x  Placement  x  Store/Corner  x  Period
```

**단, 개인 소비자 식별을 전제로 하지 않는다.** 스캔 이벤트는 익명 집계 자산이며, 개인 식별자·추적 ID 를 도입하지 않는다. 현재 device_type 수준의 비식별 속성만 유지한다.

---

## 9. KPA / PharmacyHub parity

> **KPA-Society와 PharmacyHub의 My Store 사용자 경험과 Content / Tablet / QR 실행 모델은 동일하다. 서비스 차이는 operator capability 및 service adapter/config 범위에 둔다.**

따라서:

- store_owner UX 에서 **서비스별 별도 업무모델을 유지하지 않는다.**
- PH 에 없는 store_owner 기능은 **INTENTIONAL_DIFFERENCE 가 아니라 MISSING_ADOPTION** 으로 판정한다.
- 차이를 둘 수 있는 곳은 operator capability(공급 승인·매장 지원 등)와 service adapter/config(serviceKey·organization resolver·메뉴 노출)뿐이다.

---

## 10. 개발 우선순위 (고정)

| Phase | 내용 |
|:---:|---|
| **1** | **현재 코드 census + legacy/drift 판정** — 자매 IR 문서. 삭제 없이 전량 분류. |
| **2** | **KPA reference implementation 정비** — 가장 두꺼운 구현을 canonical 로 정렬. |
| **3** | **공통 Core 추출** — 정렬된 KPA 구현에서 공통 계약·패키지 추출. |
| **4** | **PharmacyHub 동일 adoption** — §9 parity 실현. |
| **5** | **K-Cosmetics · GlycoPharm 등 확장.** |

**순서를 건너뛰지 않는다.** 특히 Phase 2 이전에 Phase 3(공통화)을 하면 **오래된 세대를 공통 자산으로 고정**하는 실패가 발생한다(자매 IR §4-4 실측 참조).

---

*Version: 1.0 · Status: Active Canonical Baseline*
