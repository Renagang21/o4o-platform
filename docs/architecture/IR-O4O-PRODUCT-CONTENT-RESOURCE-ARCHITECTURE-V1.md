# IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1

Status: DRAFT (설계 확정용 IR) — **문서 작성 전용. 코드/DB/API/UI/Migration 변경 없음.**
Date: 2026-07-08
Scope: O4O 전체 서비스(KPA / GlycoPharm / K-Cosmetics / Neture 및 향후 서비스) 공통

> 본 IR은 O4O `ProductMaster` 기반 **모든 콘텐츠(설명서·QR·POP·Tablet·Signage·Blog·Video)의 공통 구조** —
> **Product Content Resource Architecture** — 를 확정하기 위한 기준 문서다.
> 이번 작업은 **아키텍처 확정만** 수행하며, 구현(스키마·API·페이지)은 §13 후속 WO 로 분리한다.

---

## 0. 상위 규칙과의 정합 (Priority Chain)

본 IR은 CLAUDE.md 및 다음 상위 문서에 종속·정합한다. 충돌 시 상위 문서가 우선한다.

| 상위 문서 | 정합 지점 |
|---|---|
| [`CLAUDE.md`](../../CLAUDE.md) §7 Boundary Policy (F6) | Broadcast 도메인(CMS/Signage) = `serviceKey` primary + HUB 소비 YES. Product Content Resource 는 broadcast 성 공용 자산 → **neture.co.kr 호스트 + serviceKey 소비** 모델과 일치 |
| [`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) §5 HUB 철학 | 공급자 원천 자료 → 운영자 가공 → 매장 실행. Resource 는 이 흐름의 산출물 |
| [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) §4 원천자료 vs 실행자산 | **원천 자료(공급자 설명서) ≠ 실행 자산(매장 QR/POP)** 분리 — 본 IR 의 Resource vs 접근수단 분리와 정합 |
| [`PLATFORM-CONTENT-POLICY-V1`](../baseline/PLATFORM-CONTENT-POLICY-V1.md) (F4, HUB 3축 Producer/Visibility/ServiceScope) | Resource 의 소유·노출 축은 3축 모델을 재사용한다 (새 권한축 신설 금지) |
| [`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`](O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md) | 매장 실행 자산(store production material)의 canonical 정의 — Resource 소비 측 대응 |
| [`O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1`](../guides/O4O-DRUG-STORE-DESCRIPTION-CANONICAL-STANDARD-V1.md) | STORE 타입 설명서의 **내용 작성 표준** — 본 IR 은 그 상위 컨테이너(Resource) 구조를 정의 |
| [`IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1`](../investigations/IR-O4O-PRODUCT-DESCRIPTION-SHARED-ASSET-AND-CANONICAL-DESCRIPTION-POLICY-V1.md) | 상품설명=공용자산 + master당 canonical 1개 정책 — 본 IR 의 As-Is 기반 |

---

## 1. 배경 및 문제

- 현재 상품 콘텐츠는 **설명서 중심**으로 논의되어 왔다. 그러나 동일 `ProductMaster` 를 기반으로 **QR · POP · Tablet · Signage · Blog · Video** 가 모두 파생·활용된다.
- 또한 O4O 공식 설명서 외에 **공급업체가 제공하는 매장용 설명서**가 실무에서 필요하다.
- 따라서 "설명서" 를 특별 취급하는 구조가 아니라, **Product Content Resource** 를 1급 개념으로 두고 설명서는 그 한 종류로 편입하는 구조를 확정한다.

**핵심 전환**: `설명서 중심` → `Product Content Resource 중심`. QR 은 "설명서 기능" 이 아니라 **Resource 접근 수단**이다.

---

## 2. 현재 상태 (As-Is) — 정확한 기준선

> IR 이 제안하는 목표 구조를 이해하려면 현재 실상태를 정확히 알아야 한다. 아래는 코드 조사 기준(2026-07-08).

### 2.1 상품설명 저장 = `shared_product_descriptions` (SPD)
[`SharedProductDescription.entity.ts`](../../apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts)

- 축: `master_id`(ProductMaster) + `source_type`(provenance) + `status`(큐레이션 상태) + `content`(HTML).
- `source_type` ∈ `supplier | operator | ai | store_contribution | drug_extension | mfds_easy_drug | mfds_drug_otc_nutrition_combo | migration | manual` — **"누가/어디서" 원천(provenance)**.
- `status` ∈ `candidate | canonical | hidden | needs_review | deprecated` — **큐레이션 상태**.
- **canonical 은 master 당 1개** (partial unique index).
- PK = **UUID**.

### 2.2 As-Is 의 한계 — 본 IR 이 채우려는 gap

| 항목 | 현재 (As-Is) | 목표 (To-Be, 본 IR) |
|---|---|---|
| **콘텐츠 유형(용도) 축** | **없음.** B2B/B2C/STORE 구분이 스키마에 존재하지 않음 (source_type=provenance 뿐) | `resourceType`/`descriptionType` 를 1급 축으로 도입 (B2B/B2C/STORE/SUPPLIER_STORE) |
| **canonical 단위** | master 당 1개 | **(master, type) 당 1개** — 타입별 대표 |
| **영구 접근 ID/URL** | UUID PK만. 공개 permalink 규칙 없음 | `neture.co.kr/d/{resourceId}` 영구 URL |
| **비-설명서 콘텐츠(QR/POP/…)와의 관계** | 개별 트랙(예: KPA QR = `store_execution_assets` 사본) | 동일 Resource 를 OSMU 로 공통 소비 |

> ⚠️ **중요 정합 노트**: 현재 `source_type='supplier'` 는 **원천(provenance)** 이고, 본 IR 의 `SUPPLIER_STORE` 는 **용도(type=매장용) + 원천(공급자)** 를 함께 의미한다. 두 축은 **직교(orthogonal)** 한다. 후속 WO 는 SUPPLIER_STORE 를 (a) 독립 type 으로 둘지, (b) `type=STORE` + `origin=supplier` 조합으로 표현할지 **명시적으로 결정**해야 한다. 본 IR 은 정책상 "매장용 공급자 설명서를 O4O 공식 Resource 로 관리한다" 는 결론만 확정하고, 표현 방식은 구현 WO 로 위임한다.

---

## 3. 설계 원칙 (확정)

### 3.1 상품(ProductMaster)과 콘텐츠(Resource)의 역할 분리 — [권장 원칙 1]
- **ProductMaster 는 상품의 기준 정보만** 관리한다 (barcode SSOT, 규제정보, 규격 등). 상품과 콘텐츠를 혼합하지 않는다.
- **Resource 는 콘텐츠의 생명주기를** 관리한다. Resource 는 ProductMaster 에 **연결(참조)** 되지만 생명주기는 독립적이다.
- 상품 정보가 변경되어도 **Resource ID 는 변경되지 않는다.**
- 정합: 현재 SPD 의 "단방향 nullable ManyToOne (ProductMaster 무변경)" 원칙을 그대로 계승·강화.

### 3.2 Content Resource 는 독립 객체
- 모든 설명서는 독립 Resource 이다. 설명서는 **Product Content Resource 의 한 종류**일 뿐이다.

### 3.3 Permanent Resource (영구 ID)
- 모든 Resource 는 **영구 ID** 를 가진다. Resource ID 는 **① 변경하지 않고 ② 재사용하지 않으며 ③ 삭제 후 재발급하지 않는다.**
- 폐기 시에도 ID 는 소멸(tombstone)로 남기고 재활용하지 않는다 (QR/인쇄물 오연결 방지).

### 3.4 URL 영속성 (Permalink) — [권장 원칙 2]
- 모든 Resource 는 영구 URL 을 가진다. 기본 규칙:
  ```
  https://neture.co.kr/d/{resourceId}
  ```
  예: `https://neture.co.kr/d/153`, `https://neture.co.kr/d/8921`
- **URL 은 변경하지 않는다.** 설명서 내용이 수정되어도 URL 과 QR 은 그대로 유지한다.
- 이를 통해 QR 을 **인쇄물·POP·진열대·태블릿** 어디에 사용하더라도 **재발급이 불필요한 구조**를 만든다.
- 설계 결정(후속 WO): 공개 `{resourceId}` 는 **불투명(opaque)·영구·비순차 추정 곤란** 해야 한다. 예시(`/d/153`)는 짧은 정수형 permalink 를 시사하나, 현재 SPD PK 는 UUID 다 → 짧은 공개 alias(정수/base62)를 **별도 permalink 축**으로 둘지, UUID 를 그대로 노출할지는 구현 WO 에서 결정. **호스트는 소비 서비스와 무관하게 항상 `neture.co.kr`.**

### 3.5 QR = 접근 수단(저장 대상 아님)
- QR 은 **Resource URL(§3.4)만 인코딩**한다.
- QR 은 **저장·관리 대상 자산이 아니다.** 필요 시 생성하거나 캐시할 수 있으나, "QR 이미지 관리 목록" 을 두지 않는다.
- **경계 명시**: 본 원칙은 **ProductMaster Resource 를 가리키는 QR**(→ `neture.co.kr/d/{id}`) 에 적용된다. 매장이 직접 저작한 콘텐츠에 대한 기존 KPA `store_execution_assets` 사본·QR 트랙(copy-on-import 불변식)은 **다른 트랙**이며 본 IR 이 즉시 대체·회수하지 않는다. 두 트랙의 통합 여부는 §11/§13 후속 판단.

### 3.6 서비스 독립성 (소유권)
- 설명서/Resource 는 **KPA·GP·KCos 소유가 아니다.** 모두 **`neture.co.kr` 기반 O4O 공통 Resource** 이며, 각 서비스는 이를 **소비**한다.
- 정합: F4 HUB 3축(Producer/Visibility/ServiceScope) + F6 Broadcast(serviceKey 소비) 모델을 재사용한다. **새 소유·권한 축을 신설하지 않는다.**

---

## 4. Description Type (확정)

공식 Description Type 을 다음으로 확정한다.

| Type | 의미 | 주 소비처 |
|---|---|---|
| `B2B` | 사업자 간 거래용 설명 | 공급/발주/오퍼 컨텍스트 |
| `B2C` | 최종 소비자 공개용 설명 | 온라인/공개 페이지 |
| `STORE` | O4O 매장 내 사용 설명 (매장 실행) | 매장 태블릿/POP/상담 |
| `SUPPLIER_STORE` | **공급업체 제공 매장용 설명** (신규 공식 타입) | 매장 실행 (공급자 원천) |

- `SUPPLIER_STORE` 를 **공식 타입으로 추가**한다. 공급업체 설명서를 O4O 공식 Resource 의 한 종류로 관리한다.
- (§2.2 노트 참조) 표현 방식은 구현 WO 결정. 본 IR 은 **타입 집합과 정책**만 확정.

---

## 5. Store 사용 정책

- 매장은 Product 등록 시 사용할 설명서를 **선택**한다.
- 선택 가능: ☐ `O4O STORE` / ☐ `SUPPLIER_STORE`
- **둘 다 선택 가능**, **둘 중 하나만 선택도 가능**.
- 매장 선택은 **소비(선택) 행위**이며, Resource 원본을 변경하지 않는다 (매장별 override 저장소를 신설하지 않는다 — 현재 SPD 정책 계승).

---

## 6. ProductMaster 화면 (관리 측)

ProductMaster 에서 **설명서 현황**을 확인할 수 있어야 한다. 4개 공식 타입 각각에 대해:

- 존재 여부 (있음/없음)
- 상태 (candidate/canonical/needs_review 등)
- URL (`neture.co.kr/d/{id}`)
- QR 접근 여부

를 한 화면에서 확인 가능하도록 **설계**한다. (구현은 후속 WO — 현재 admin 상품관리 "설명 상태" 뷰의 확장 지점.)

---

## 7. Store 상품 화면 (소비 측)

- 매장 경영활용 제품(`/store/handled-products`)에서 **설명서 존재 여부를 한눈에** 확인할 수 있어야 한다.
  - 예: `O4O` / `Supplier` — **배지 또는 아이콘** 형태.
- 상품 등록 시 **사용할 설명서를 선택**할 수 있어야 한다 (§5).
- 정합: 본 화면의 "분류 배지" 는 이미 도입됨([`CHECK-...-STANDARD-PICKER-SERVER-SEARCH-CATEGORY-UX-V1`](../checks/CHECK-O4O-KPA-HANDLED-PRODUCTS-STANDARD-PICKER-SERVER-SEARCH-CATEGORY-UX-V1.md)). 설명서 유무 배지는 그 옆에 **별도 축**으로 추가 (분류 ≠ 설명서 유무).

---

## 8. OSMU (One Source Multi Use)

- 동일 Resource 를 **QR · POP · Tablet · Signage · Blog · Video** 에서 공통 활용한다.
- 동일 Resource 를 **여러 서비스가 공유**한다 (저작=운영자/공급자, 사용=매장 — 원본과 출력물 분리).
- 정합: 기존 OSMU 트랙(원본 vs 출력물 분리)과 동일 철학.

---

## 9. URL 정책 (재확인)

- Resource URL = `https://neture.co.kr/d/{resourceId}` 를 **기본 규칙**으로 한다.
- **서비스별 도메인을 사용하지 않는다** (kpa-society.co.kr/d/... 금지). 소비 서비스와 무관하게 항상 `neture.co.kr`.
- **URL 변경을 허용하지 않는다** (§3.4 Permalink).

---

## 10. 향후 확장 (동일 구조 적용 대상)

향후 다음 Resource 도 동일 구조(영구 ID + 영구 URL + OSMU)를 사용한다.

- POP · QR Landing · Video · Blog · Tablet Content · AI Voice · Signage

각 Resource 는 자신의 `resourceType` 을 갖되, §3 원칙(영구 ID/URL, 상품-콘텐츠 분리, 서비스 독립)을 공통으로 따른다.

---

## 11. 제외 범위 (이번 IR 에서 설계하지 않음)

- DB Schema / API / Migration / QR 생성 구현 / 공개 페이지 구현 / Admin 구현 / Store 구현
- 기존 KPA `store_execution_assets` QR 트랙과의 통합/회수 (별도 판단)
- 짧은 permalink alias 의 구체 형식(정수 vs base62 vs UUID 노출)
- (master, type) canonical 유일성의 물리 인덱스 설계

> 이번 작업은 **Architecture 만** 확정한다.

---

## 12. 미해결 설계 결정 (후속 WO 가 반드시 답해야 할 항목)

1. **SUPPLIER_STORE 표현**: 독립 type vs `type=STORE + origin=supplier` (§2.2).
2. **type 축 도입 방식**: SPD 에 `resource_type` 컬럼 추가(가산적) vs 별도 Resource 테이블 신설. canonical 유일성이 master → (master, type) 로 확장됨.
3. **영구 permalink id**: UUID 노출 vs 짧은 공개 alias 별도 발급. tombstone(재사용 금지) 보장 방법.
4. **공개 페이지 접근 정책**: `/d/{id}` 는 B2C 만 공개인가, 타입별 공개 범위(B2B/STORE/SUPPLIER_STORE)는? (F4 Visibility 축 재사용)
5. **QR 트랙 정합**: ProductMaster Resource QR(`/d/{id}`) vs 매장 저작 콘텐츠 QR(store_execution_assets)의 최종 관계.

---

## 13. 후속 WO (IR 승인 후 순서)

| 순서 | WO | 내용 |
|---|---|---|
| 1 | `WO-O4O-DESCRIPTION-TYPE-IMPLEMENTATION-V1` | `SUPPLIER_STORE` 타입 추가 + type 축 도입(§12-1,2 결정 반영) |
| 2 | `WO-O4O-ADMIN-PRODUCT-DESCRIPTION-MANAGEMENT-V1` | ProductMaster 설명서 현황 관리 화면(§6) |
| 3 | `WO-O4O-STORE-HANDLED-PRODUCT-DESCRIPTION-SELECTION-V1` | 매장 설명서 선택 기능(§5,§7) |
| 4 | `WO-O4O-PUBLIC-DESCRIPTION-RESOURCE-V1` | `neture.co.kr/d/{id}` 공개 Resource 페이지(§3.4,§9,§12-3,4) |
| 5 | `WO-O4O-DESCRIPTION-QR-INTEGRATION-V1` | QR 자동 연결(§3.5,§12-5) |
| 6 | `WO-O4O-PRODUCT-CONTENT-OSMU-INTEGRATION-V1` | POP/Tablet/Signage/Video 공통 Resource 활용(§8,§10) |

---

## 14. 완료 기준 (본 IR)

- [x] Product Content Resource Architecture 문서 작성
- [x] Description Type 확정 (B2B/B2C/STORE/SUPPLIER_STORE)
- [x] SUPPLIER_STORE 정책 포함
- [x] Permanent Resource 정책 포함 (§3.3)
- [x] Permanent URL 정책 포함 (§3.4, §9)
- [x] neture.co.kr 공통 Resource 정책 포함 (§3.6, §9)
- [x] ProductMaster / Store 활용 정책 포함 (§6, §7)
- [x] OSMU 구조 포함 (§8)
- [x] [권장 원칙 1] 상품-콘텐츠 역할 분리 (§3.1)
- [x] [권장 원칙 2] URL 영속성(Permalink) (§3.4)
- [x] 현재 상태(As-Is) 대비 및 미해결 설계 결정 명시 (§2, §12)
- **코드/DB/API/UI 변경 없음.**
