# IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1

Status: DRAFT (설계 확정용 IR) — **문서 작성 전용. 코드/DB/API/UI/Migration 변경 없음.**
Date: 2026-07-08 (rev.2 — Description 중심 → Product Content Resource 중심 일반화)
Scope: O4O 전체 서비스(KPA / GlycoPharm / K-Cosmetics / Neture 및 향후 서비스) 공통

> 본 IR은 O4O `ProductMaster` 기반 **모든 콘텐츠(설명서·QR·POP·Tablet·Signage·Blog·Video·AI Voice)의 공통 구조** —
> **Product Content Resource Architecture** — 를 확정하기 위한 기준 문서다.
> 이번 작업은 **아키텍처 확정만** 수행하며, 구현(스키마·API·페이지)은 §14 후속 WO 로 분리한다.

> **최상위 원칙 (Foundational Principle)**
> **모든 Product Content Resource 는 O4O 의 공통 디지털 자산이며, 특정 서비스(KPA·GP·KCos 등)에 종속되지 않는다.**
> 콘텐츠는 `neture.co.kr` 의 공통 자산이고, 각 서비스는 그 자산을 **소비**한다.
> 이 원칙은 앞으로 어떤 서비스가 추가되더라도 흔들리지 않는 기준이 된다.

---

## 0. 상위 규칙과의 정합 (Priority Chain)

본 IR은 CLAUDE.md 및 다음 상위 문서에 종속·정합한다. 충돌 시 상위 문서가 우선한다.

| 상위 문서 | 정합 지점 |
|---|---|
| [`CLAUDE.md`](../../CLAUDE.md) §7 Boundary Policy (F6) | Broadcast 도메인(CMS/Signage) = `serviceKey` primary + HUB 소비 YES. Product Content Resource 는 broadcast 성 공용 자산 → **neture.co.kr 호스트 + serviceKey 소비** 모델과 일치 |
| [`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) §5 HUB 철학 | 공급자 원천 자료 → 운영자 가공 → 매장 실행. Resource 는 이 흐름의 산출물 |
| [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) §4 원천자료 vs 실행자산 | **원천 자료(공급자 콘텐츠) ≠ 실행 자산(매장 QR/POP)** 분리 — 본 IR 의 Resource vs 접근수단 분리와 정합 |
| [`PLATFORM-CONTENT-POLICY-V1`](../baseline/PLATFORM-CONTENT-POLICY-V1.md) (F4, HUB 3축 Producer/Visibility/ServiceScope) | Resource 의 소유·노출 축은 3축 모델을 재사용한다 (새 권한축 신설 금지) |
| [`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`](O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md) | 매장 실행 자산(store production material)의 canonical 정의 — Resource 소비 측 대응 |
| [`O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1`](../guides/O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1.md) | `DESCRIPTION` Resource 의 STORE 타입 **내용 작성 표준** — 본 IR 은 그 상위 컨테이너(Resource) 구조를 정의 |
| [`IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1`](../investigations/IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1.md) | 상품설명=공용자산 + master당 canonical 1개 정책 — 본 IR 의 As-Is 기반 |

---

## 1. 배경 및 문제

- 지금까지 상품 콘텐츠는 **설명서(Description) 중심**으로 논의되어 왔다. 그러나 동일 `ProductMaster` 를 기반으로 **QR · POP · Tablet · Signage · Blog · Video · AI Voice** 가 모두 파생·활용된다.
- 또한 O4O 공식 설명서 외에 **공급업체가 제공하는 매장용 설명서**가 실무에서 필요하다.
- 따라서 설명서를 특별 취급하는 구조가 아니라, **Product Content Resource** 를 1급 개념으로 두고 **설명서(Description)는 그 한 종류(Resource Type)로 편입**하는 구조를 확정한다.

**핵심 전환**: `설명서(Description) 중심` → `Product Content Resource 중심`.
- 설명서는 Resource 의 **한 종류**일 뿐이다 (POP·Video·Blog 와 동급).
- QR 은 "설명서 기능" 이 아니라 **Resource 접근 수단**이다.
- 이 일반화로 향후 POP·동영상·블로그·태블릿·AI 음성이 **별도 아키텍처 없이** 동일 Resource 모델 위에서 확장된다.

---

## 2. 핵심 개념 모델 (Resource 계층)

> 본 IR 의 중심 구조. **Description 은 Resource 아래로 내려간다.**

```
Product Content Resource                     ← 1급 개념 (공통 디지털 자산)
    │  (Resource ID · Resource URL · Resource QR · Resource Lifecycle 공통)
    │
    ├── Resource Type                        ← 콘텐츠의 종류 (1차 분류)
    │      ├── DESCRIPTION
    │      │       └── Description Type       ← DESCRIPTION 일 때만 존재하는 하위 속성
    │      │               ├── B2B
    │      │               ├── B2C
    │      │               ├── STORE
    │      │               └── SUPPLIER_STORE
    │      ├── POP
    │      ├── VIDEO
    │      ├── BLOG
    │      ├── TABLET
    │      ├── SIGNAGE
    │      ├── AI_VOICE
    │      └── ...  (확장 가능)
    │
    └── ProductMaster 참조 (연결만, 생명주기 독립 — §3.1)
```

**계층 규칙 (확정):**
1. **Resource Type 이 먼저**다. 모든 Resource 는 자신의 `resourceType`(DESCRIPTION / POP / VIDEO / BLOG / TABLET / SIGNAGE / AI_VOICE / …)을 가진다.
2. **Description Type(B2B/B2C/STORE/SUPPLIER_STORE)은 `resourceType = DESCRIPTION` 인 경우에만 존재**하는 **하위 속성**이다. POP·Video 등 다른 Resource Type 에는 적용되지 않는다.
3. **공통 자산 속성**(Resource ID · Resource URL · Resource QR · Resource Lifecycle)은 **모든 Resource Type 이 공유**한다. 특정 타입(Description) 전용이 아니다.

---

## 3. 현재 상태 (As-Is) — 정확한 기준선

> To-Be 를 이해하려면 현재 실상태를 정확히 알아야 한다. 아래는 코드 조사 기준(2026-07-08).

### 3.1 콘텐츠 저장 현황 = `shared_product_descriptions` (SPD) — **DESCRIPTION 전용**
[`SharedProductDescription.entity.ts`](../../apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts)

- 축: `master_id`(ProductMaster) + `source_type`(provenance) + `status`(큐레이션 상태) + `content`(HTML).
- `source_type` ∈ `supplier | operator | ai | store_contribution | drug_extension | mfds_easy_drug | mfds_drug_otc_nutrition_combo | migration | manual` — **"누가/어디서" 원천(provenance)**.
- `status` ∈ `candidate | canonical | hidden | needs_review | deprecated` — **큐레이션 상태**.
- **canonical 은 master 당 1개** (partial unique index).
- PK = **UUID**.
- **핵심**: SPD 는 오직 **설명서(Description)만** 저장한다. POP·Video·Blog 등을 담는 일반 Resource 저장소는 **아직 없다**. (QR/POP 등은 KPA `store_execution_assets` 같은 개별 트랙에 산재.)

### 3.2 As-Is 의 한계 — 본 IR 이 채우려는 gap

| 항목 | 현재 (As-Is) | 목표 (To-Be, 본 IR) |
|---|---|---|
| **Resource 추상화** | **없음.** 설명서 전용 SPD 만 존재 | `Product Content Resource` 1급 추상 도입, Description=한 종류 |
| **Resource Type 축** | **없음** | `resourceType`(DESCRIPTION/POP/VIDEO/BLOG/TABLET/SIGNAGE/AI_VOICE/…) 1급 축 |
| **Description Type(용도) 축** | **없음.** B2B/B2C/STORE 구분이 스키마에 존재하지 않음 (source_type=provenance 뿐) | `resourceType=DESCRIPTION` 하위 속성 `descriptionType`(B2B/B2C/STORE/SUPPLIER_STORE) |
| **canonical 단위** | master 당 1개 | **(master, resourceType, descriptionType) 당 1개** — 종류·용도별 대표 |
| **영구 접근 ID/URL** | UUID PK만. 공개 permalink 규칙 없음 | 모든 Resource 에 `neture.co.kr/r/{resourceId}` 영구 URL |
| **비-설명서 콘텐츠(QR/POP/…)와의 관계** | 개별 트랙(예: KPA QR = `store_execution_assets` 사본) | 동일 Resource 를 OSMU 로 공통 소비 |
| **Lifecycle** | Description 의 `status`(candidate/canonical/…) 뿐 | 모든 Resource 공통 Lifecycle(§7) |

> ⚠️ **중요 정합 노트 (직교 축)**: 현재 `source_type='supplier'` 는 **원천(provenance)** 이고, 본 IR 의 `SUPPLIER_STORE` 는 **용도(descriptionType=매장용) + 원천(공급자)** 를 함께 의미한다. 두 축은 **직교(orthogonal)** 한다. 후속 WO 는 SUPPLIER_STORE 를 (a) 독립 descriptionType 으로 둘지, (b) `descriptionType=STORE` + `origin=supplier` 조합으로 표현할지 **명시적으로 결정**해야 한다. 본 IR 은 정책상 "매장용 공급자 설명서를 O4O 공식 Resource 로 관리한다" 는 결론만 확정하고, 표현 방식은 구현 WO 로 위임한다.

---

## 4. 설계 원칙 (확정)

### 4.1 상품(ProductMaster)과 콘텐츠(Resource)의 역할 분리 — [권장 원칙 1]
- **ProductMaster 는 상품의 기준 정보만** 관리한다 (barcode SSOT, 규제정보, 규격 등). 상품과 콘텐츠를 혼합하지 않는다.
- **Resource 는 콘텐츠의 생명주기를** 관리한다. Resource 는 ProductMaster 에 **연결(참조)** 되지만 생명주기는 독립적이다.
- 상품 정보가 변경되어도 **Resource ID 는 변경되지 않는다.**
- 정합: 현재 SPD 의 "단방향 nullable ManyToOne (ProductMaster 무변경)" 원칙을 그대로 계승·강화.

### 4.2 Content Resource 는 독립 객체
- 모든 콘텐츠는 독립 Resource 이다. 설명서(Description)는 **Product Content Resource 의 한 종류(Resource Type)**일 뿐이다.

### 4.3 Permanent Resource (영구 Resource ID)
- 모든 Resource 는 **영구 Resource ID** 를 가진다. Resource ID 는 **① 변경하지 않고 ② 재사용하지 않으며 ③ 삭제 후 재발급하지 않는다.**
- 폐기 시에도 ID 는 소멸(tombstone)로 남기고 재활용하지 않는다 (QR/인쇄물 오연결 방지).
- **Resource ID 는 Description ID 가 아니다.** POP·Video·Blog 도 동일한 Resource ID 체계를 사용한다 (용어를 끝까지 "Resource ID" 로 유지).

### 4.4 URL 영속성 (Permalink) — [권장 원칙 2]
- 모든 Resource 는 영구 URL 을 가진다. 기본 규칙:
  ```
  https://neture.co.kr/r/{resourceId}
  ```
  예: `https://neture.co.kr/r/5213`, `https://neture.co.kr/r/8921`
- **경로는 `/r/`(=Resource) 를 사용한다.** `/d/`(=Description) 처럼 특정 타입으로 읽히는 경로를 쓰지 않는다. 하나의 `/r/{id}` 로 **Description·POP·Video·Blog·Tablet** 을 모두 연다.
- **URL 은 변경하지 않는다.** 콘텐츠 내용이 수정되어도 URL 과 QR 은 그대로 유지한다.
- 이를 통해 QR 을 **인쇄물·POP·진열대·태블릿** 어디에 사용하더라도 **재발급이 불필요한 구조**를 만든다.
- 설계 결정(후속 WO): 공개 `{resourceId}` 는 **불투명(opaque)·영구·비순차 추정 곤란** 해야 한다. 예시(`/r/5213`)는 짧은 정수/base62 permalink 를 시사하나, 현재 SPD PK 는 UUID 다 → 짧은 공개 alias 를 **별도 permalink 축**으로 둘지, UUID 를 그대로 노출할지는 구현 WO 에서 결정. **호스트는 소비 서비스와 무관하게 항상 `neture.co.kr`.**

### 4.5 QR = Resource 접근 수단(저장 대상 아님)
- QR 은 **Resource URL(§4.4)만 인코딩**한다. 즉 **Resource QR** 이다 (Description QR 이 아니다). POP QR·Video QR·Blog QR 도 동일 구조를 따른다.
- QR 은 **저장·관리 대상 자산이 아니다.** 필요 시 생성하거나 캐시할 수 있으나, "QR 이미지 관리 목록" 을 두지 않는다.
- **경계 명시**: 본 원칙은 **ProductMaster Resource 를 가리키는 QR**(→ `neture.co.kr/r/{id}`) 에 적용된다. 매장이 직접 저작한 콘텐츠에 대한 기존 KPA `store_execution_assets` 사본·QR 트랙(copy-on-import 불변식)은 **다른 트랙**이며 본 IR 이 즉시 대체·회수하지 않는다. 두 트랙의 통합 여부는 §12/§14 후속 판단.

### 4.6 서비스 독립성 (소유권) — 최상위 원칙의 구체화
- Resource(설명서·POP·Video·…)는 **KPA·GP·KCos 소유가 아니다.** 모두 **`neture.co.kr` 기반 O4O 공통 Resource** 이며, 각 서비스는 이를 **소비**한다.
- 정합: F4 HUB 3축(Producer/Visibility/ServiceScope) + F6 Broadcast(serviceKey 소비) 모델을 재사용한다. **새 소유·권한 축을 신설하지 않는다.**

---

## 5. Resource Type (확정)

콘텐츠의 종류를 정하는 **1차 분류**. 최소 다음을 확정하고, 확장 가능하게 둔다.

| Resource Type | 의미 | 하위 속성 |
|---|---|---|
| `DESCRIPTION` | 상품 설명 콘텐츠 | **Description Type (§6)** |
| `POP` | 매장 POP | (후속) |
| `VIDEO` | 동영상 | (후속) |
| `BLOG` | 블로그 글 | (후속) |
| `TABLET` | 태블릿 콘텐츠 | (후속) |
| `SIGNAGE` | 디지털 사이니지 | (후속) |
| `AI_VOICE` | AI 음성 | (후속) |
| … | 확장 | — |

- 모든 Resource Type 은 §4 공통 원칙(Resource ID/URL/QR/Lifecycle, 상품-콘텐츠 분리, 서비스 독립)을 따른다.
- 이번 IR 에서 **내용 규칙이 확정된 것은 `DESCRIPTION`(§6) 뿐**이며, 나머지 타입은 **동일 구조를 사용한다는 방향만** 확정한다.

---

## 6. Description Type (확정) — `resourceType = DESCRIPTION` 하위 속성

`DESCRIPTION` Resource 에만 존재하는 하위 속성. 공식 Description Type 을 다음으로 확정한다.

| Description Type | 의미 | 주 소비처 |
|---|---|---|
| `B2B` | 사업자 간 거래용 설명 | 공급/발주/오퍼 컨텍스트 |
| `B2C` | 최종 소비자 공개용 설명 | 온라인/공개 페이지 |
| `STORE` | O4O 매장 내 사용 설명 (매장 실행) | 매장 태블릿/POP/상담 |
| `SUPPLIER_STORE` | **공급업체 제공 매장용 설명** (신규 공식 타입) | 매장 실행 (공급자 원천) |

- `SUPPLIER_STORE` 를 **공식 Description Type 으로 추가**한다. 공급업체 설명서를 O4O 공식 Resource 의 한 종류로 관리한다.
- (§3.2 노트 참조) 표현 방식은 구현 WO 결정. 본 IR 은 **타입 집합과 정책**만 확정.

---

## 7. Resource Lifecycle (확정) — 모든 Resource Type 공통

Resource **자체의 생명주기**. Description Type 과 **무관**하며, 향후 Video·POP·Blog 도 동일 Lifecycle 을 사용한다.

```
Draft → Review → Approved → Published → Deprecated
                                    │
                                    └── Hidden (노출 중단, ID/URL 은 유지)
```

| 상태 | 의미 |
|---|---|
| `Draft` | 작성 중 (미검토) |
| `Review` | 검토 대기/진행 |
| `Approved` | 승인됨 (공개 전 준비 완료) |
| `Published` | 공개/활성 — Resource URL/QR 로 접근 가능 |
| `Deprecated` | 신규 사용 중단(구버전) — 기존 링크는 정책에 따라 유지/리다이렉트 |
| `Hidden` | 노출 중단 — **Resource ID/URL 은 소멸하지 않음**(§4.3 tombstone 원칙과 정합) |

- **As-Is 정합**: 현재 SPD `status`(candidate/canonical/needs_review/hidden/deprecated)는 Description 큐레이션 상태다. 위 Lifecycle 은 그 상위의 **Resource 공통 상태**로, 후속 WO 에서 매핑을 확정한다(예: canonical≈Published 대표). 본 IR 은 **공통 Lifecycle 의 존재와 상태 집합**만 확정.

---

## 8. Store 사용 정책

- 매장은 Product 등록 시 사용할 설명서를 **선택**한다.
- 선택 가능: ☐ `O4O STORE`(STORE) / ☐ `SUPPLIER_STORE`
- **둘 다 선택 가능**, **둘 중 하나만 선택도 가능**.
- 매장 선택은 **소비(선택) 행위**이며, Resource 원본을 변경하지 않는다 (매장별 override 저장소를 신설하지 않는다 — 현재 SPD 정책 계승).

---

## 9. ProductMaster 화면 (관리 측)

ProductMaster 에서 **Content Resource 현황**을 확인할 수 있어야 한다. **설명서에 국한하지 않고** Resource Type 별로:

```
Content Resource 현황
    ├── DESCRIPTION   (B2B / B2C / STORE / SUPPLIER_STORE 각각)
    ├── POP
    ├── VIDEO
    ├── BLOG
    └── ...
```

각 Resource(및 Description 은 Type 별)에 대해:
- 존재 여부 (있음/없음)
- Lifecycle 상태 (§7)
- Resource URL (`neture.co.kr/r/{id}`)
- Resource QR 접근 여부

를 한 화면에서 확인 가능하도록 **설계 방향**을 잡는다. (구현은 후속 WO — 현재 admin 상품관리 "설명 상태" 뷰의 확장 지점. 이번 IR 은 방향만 명시.)

---

## 10. Store 상품 화면 (소비 측)

- 매장 경영활용 제품(`/store/handled-products`)에서 **Resource(우선 설명서) 존재 여부를 한눈에** 확인할 수 있어야 한다.
  - 예: `O4O` / `Supplier` — **배지 또는 아이콘** 형태. (향후 POP/Video 유무도 동일 방식으로 확장 가능.)
- 상품 등록 시 **사용할 설명서를 선택**할 수 있어야 한다 (§8).
- 정합: 본 화면의 "분류 배지" 는 이미 도입됨([`CHECK-...-STANDARD-PICKER-SERVER-SEARCH-CATEGORY-UX-V1`](../checks/CHECK-O4O-KPA-HANDLED-PRODUCTS-STANDARD-PICKER-SERVER-SEARCH-CATEGORY-UX-V1.md)). Resource 유무 배지는 그 옆에 **별도 축**으로 추가 (상품 분류 ≠ Resource 유무).

---

## 11. OSMU (One Source Multi Use) 및 URL 정책 (재확인)

### 11.1 OSMU
- 동일 Resource 를 **QR · POP · Tablet · Signage · Blog · Video** 에서 공통 활용한다.
- 동일 Resource 를 **여러 서비스가 공유**한다 (저작=운영자/공급자, 사용=매장 — 원본과 출력물 분리).
- 정합: 기존 OSMU 트랙(원본 vs 출력물 분리)과 동일 철학.

### 11.2 URL 정책
- Resource URL = `https://neture.co.kr/r/{resourceId}` 를 **기본 규칙**으로 한다.
- **서비스별 도메인을 사용하지 않는다** (kpa-society.co.kr/r/... 금지). 소비 서비스와 무관하게 항상 `neture.co.kr`.
- **URL 변경을 허용하지 않는다** (§4.4 Permalink).

---

## 12. 제외 범위 (이번 IR 에서 설계하지 않음)

- DB Schema / API / Migration / QR 생성 구현 / 공개 페이지 구현 / Admin 구현 / Store 구현
- 비-DESCRIPTION Resource Type(POP/Video/Blog/…)의 **내용 규칙·저장 스키마** (방향만 확정)
- 기존 KPA `store_execution_assets` QR 트랙과의 통합/회수 (별도 판단)
- 짧은 permalink alias 의 구체 형식(정수 vs base62 vs UUID 노출)
- Resource Lifecycle ↔ SPD `status` 물리 매핑, (master, resourceType, descriptionType) canonical 유일성의 물리 인덱스 설계

> 이번 작업은 **Architecture 만** 확정한다.

---

## 13. 미해결 설계 결정 (후속 WO 가 반드시 답해야 할 항목)

1. **SUPPLIER_STORE 표현**: 독립 descriptionType vs `descriptionType=STORE + origin=supplier` (§3.2).
2. **Resource 추상화 방식**: SPD 를 Resource 로 일반화(가산적 컬럼 `resource_type` 등) vs 별도 `product_content_resources` 테이블 신설. canonical 유일성이 master → (master, resourceType, descriptionType) 로 확장됨.
3. **영구 Resource ID / permalink**: UUID 노출 vs 짧은 공개 alias 별도 발급. tombstone(재사용 금지) 보장 방법.
4. **공개 페이지 접근 정책**: `/r/{id}` 는 어떤 Resource Type/Description Type 까지 공개인가 (B2C 공개, B2B/STORE/SUPPLIER_STORE 범위)? (F4 Visibility 축 재사용)
5. **QR 트랙 정합**: ProductMaster Resource QR(`/r/{id}`) vs 매장 저작 콘텐츠 QR(store_execution_assets)의 최종 관계.
6. **Resource Lifecycle ↔ SPD status 매핑**: 공통 Lifecycle(§7)과 기존 Description 큐레이션 상태의 대응.

---

## 14. 후속 WO (IR 승인 후 순서)

| 순서 | WO | 내용 |
|---|---|---|
| 1 | `WO-O4O-DESCRIPTION-TYPE-IMPLEMENTATION-V1` | `SUPPLIER_STORE` + Description Type 축 도입, Resource 추상화 1단계(§13-1,2) |
| 2 | `WO-O4O-ADMIN-PRODUCT-DESCRIPTION-MANAGEMENT-V1` | ProductMaster Content Resource 현황 화면(§9) |
| 3 | `WO-O4O-STORE-HANDLED-PRODUCT-DESCRIPTION-SELECTION-V1` | 매장 설명서 선택 기능(§8,§10) |
| 4 | `WO-O4O-PUBLIC-CONTENT-RESOURCE-V1` | `neture.co.kr/r/{id}` 공개 Resource 페이지(§4.4,§11,§13-3,4) |
| 5 | `WO-O4O-RESOURCE-QR-INTEGRATION-V1` | Resource QR 자동 연결(§4.5,§13-5) |
| 6 | `WO-O4O-PRODUCT-CONTENT-OSMU-INTEGRATION-V1` | POP/Tablet/Signage/Video 공통 Resource 활용(§11,§5) |

---

## 15. 완료 기준 (본 IR)

- [x] **Product Content Resource 중심** 아키텍처 확정 (Description 은 Resource Type 의 하나로 편입 — §2)
- [x] **Resource Type ↔ Description Type 계층 분리** (Resource Type 우선, Description Type 은 DESCRIPTION 하위 — §2,§5,§6)
- [x] Description Type 확정 (B2B/B2C/STORE/SUPPLIER_STORE) + SUPPLIER_STORE 정책 (§6)
- [x] **Resource Lifecycle 확정** (모든 Resource 공통, Description 과 무관 — §7)
- [x] Permanent **Resource ID** 정책 (Description ID 아님 — §4.3)
- [x] Permanent URL 정책 — **`/r/{resourceId}`** (§4.4, §11.2)
- [x] **Resource QR** 정책 (Description QR 아님, 저장 대상 아님 — §4.5)
- [x] neture.co.kr 공통 Resource + **서비스 독립 최상위 원칙** (§4.6, 문서 상단)
- [x] ProductMaster / Store 활용 정책 — Content Resource 현황 (§9, §10)
- [x] OSMU 구조 (§11)
- [x] [권장 원칙 1] 상품-콘텐츠 역할 분리 (§4.1) · [권장 원칙 2] URL 영속성 (§4.4)
- [x] 현재 상태(As-Is) 대비 및 미해결 설계 결정 명시 (§3, §13)
- **코드/DB/API/UI 변경 없음.**
