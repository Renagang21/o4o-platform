# O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1

Status: **BASELINE (Frozen)** — O4O Product Resource 아키텍처 기준 문서.
Date: 2026-07-08
승격 근거(WO-0.5): `WO-O4O-PRODUCT-CONTENT-RESOURCE-FREEZE-CONFIRMATION-V1`
출처(상세): [`IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1`](../architecture/IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1.md) · [`WO-O4O-PRODUCT-CONTENT-RESOURCE-PERSISTENCE-DESIGN-V1`](../architecture/WO-O4O-PRODUCT-CONTENT-RESOURCE-PERSISTENCE-DESIGN-V1.md)

> **역할**: IR(아키텍처) + Persistence(저장 구조 Freeze)를 **O4O 기준 아키텍처(Baseline)**로 승격한 SSOT.
> 아래 6개 불변식은 향후 모든 Product Resource 관련 WO(Description Type · Admin 설명관리 · 매장 설명선택 · `/r/{id}` 공개 Resource · QR · OSMU)의 **상위 전제**다.
> **구조 변경은 본 Baseline 을 개정하는 별도 WO 없이는 금지.** (버그수정·문서·구현은 허용.)

---

## 0. 용어 (Terminology)

- **Product Resource** (= 축약형; 정식 `Product Content Resource`). 이후 O4O 문서/코드에서 **Product Resource** 로 통칭한다.
  - 파생: `Resource Type` · `Resource ID` · `Resource URL` · `Resource QR`.
- ProductMaster 밑의 콘텐츠 자산이라는 맥락이 이미 전제되므로 축약해도 의미가 충분하다.

---

## 1. 구조 (2계층 — 흔들리지 않는 기준)

```
ProductMaster                         ← 상품 기준 정보만 (barcode SSOT, 규제, 규격)
      │  (Resource 가 ProductMaster 를 참조 — 역방향 아님. Freeze #6)
      ▼
계층 1 : Product Resource             ← master 기준·서비스 중립·O4O 공용 canonical 자산
      │       └ Resource Type: DESCRIPTION / (향후) POP / VIDEO / BLOG / TABLET / SIGNAGE / AI_VOICE
      │            └ (DESCRIPTION 일 때만) Description Type: B2B / B2C / STORE / SUPPLIER_STORE
      │       공통: Resource ID(UUID) · Resource URL(/r/{id}) · Resource QR · Lifecycle
      ▼
계층 2 : Store Production Material     ← 매장별 실행 자산 (organization/store/service_key 경계)
              └ POP · QR · Tablet · Signage · Blog · Video
              계층 2 는 계층 1 Resource 를 **소비**한다 (OSMU). 흡수/회수하지 않는다.
```

- **계층 1 = Product Resource** (본 Baseline 대상). 물리 저장: DESCRIPTION → `shared_product_descriptions`.
- **계층 2 = Store Production Material** (기존 유지). `store_pops`·`store_execution_assets`·`store_videos`·`store_qr_codes`·`kpa_store_contents`·`signage_forced_content`·`kpa_contents`·`store_blog_posts`.
- 두 계층은 **역할이 다르다.** 서로에게 저장하지 않는다(§Freeze #5).

---

## 2. Architecture Freeze — 6개 불변식

| # | 불변식 | 요지 |
|:-:|---|---|
| **1** | **DESCRIPTION Resource = `shared_product_descriptions`** | 유일한 master 기준 canonical 자산을 그대로 재사용. 20만+ ProductMaster·기존 설명 체계 유지. 신규 테이블 이관 없음 |
| **2** | **canonical = (master, resourceType, descriptionType) 당 1개** | SPD 내에서는 `(master_id, description_type)` partial unique 로 구현(현 `(master_id)` 에서 확장) |
| **3** | **Resource ID = UUID(내부) + 공개 permalink `/r/{resourceId}`** | 내부 식별자는 UUID 유지. 공개 노출은 `/r/{id}` (짧은 opaque alias 는 공개 WO 에서 발급). 영구·재사용/재발급 금지(tombstone=soft delete) |
| **4** | **QR = `/r/{id}` 인코딩, 비저장·동적생성** | QR 이미지를 자산으로 저장/관리하지 않는다. 영구 URL 덕에 인쇄물·POP·태블릿 재발급 불필요 |
| **5** | **계층 1(Product Resource) ↔ 계층 2(Store Production Material) 분리** | `store_pops` 등을 Product Resource 로 넣지 않는다. Resource 를 Store POP 처럼 저장하지 않는다. 역할이 다르다 |
| **6** | **ProductMaster 는 Resource 를 모른다** | ProductMaster 에 `description_id`/`resource_id`/`video_id` 같은 FK 를 **만들지 않는다**. 항상 **Resource → ProductMaster** 단방향 참조(`Resource.product_master_id`). Resource Type 이 아무리 늘어도 ProductMaster 는 수정되지 않는다 — **영원히 상품만 관리** |

### Freeze #6 상세 (신규 명문화)
```
❌ ProductMaster → Description → POP        (ProductMaster 가 콘텐츠를 소유/참조)
✅ ProductMaster ← Resource(product_master_id) ← (계층 2 가 Resource 소비)
```
- 방향: **Resource 가 ProductMaster 를 참조**한다. ProductMaster 는 콘텐츠 존재를 몰라도 된다.
- 근거: 현재 `shared_product_descriptions` 도 `master_id` + **ManyToOne 단방향 nullable**(ProductMaster 무변경)로 이미 이 방향이다. Freeze #6 은 이 원칙을 **모든 Resource Type 으로 항구화**한다.
- 효과: Description·Video·POP·AI Voice 등이 계속 늘어나도 **ProductMaster 스키마는 불변**. 상품 코어와 콘텐츠 코어가 영구 분리된다.

---

## 3. 상위 규칙 정합

- [`CLAUDE.md`](../../CLAUDE.md) §7 Boundary Policy(F6) — 계층 1 Resource = broadcast 성 공용 자산(neture.co.kr 호스트 + serviceKey 소비).
- [`PLATFORM-CONTENT-POLICY-V1`](PLATFORM-CONTENT-POLICY-V1.md)(F4) — 소유·노출은 HUB 3축(Producer/Visibility/ServiceScope) 재사용, 새 권한축 신설 금지.
- [`O4O-CONTENT-TYPE-TAXONOMY-V1`](../architecture/O4O-CONTENT-TYPE-TAXONOMY-V1.md) — 계층 1(상품설명 canonical) vs 계층 2(Production Material) 용어 SSOT 와 정합.
- [`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md) — 계층 2 정의.
- 소비자 해석 순서(SSOT): `COALESCE(spd.content[canonical] → store_product_profiles.description[legacy] → supplier_product_offers[offer])`.

---

## 4. 변경 정책 (Freeze governance)

- 위 6 불변식과 2계층 구조는 **후속 WO 의 재설계 대상이 아니다.** 후속 WO 는 이 구조 위에서 **구현만** 수행한다.
- 버그 수정·성능 개선·문서·테스트·구현은 허용. **구조 변경은 본 Baseline 을 개정하는 명시적 WO 필수.**
- 후속 WO 순서: (1) DESCRIPTION-TYPE-IMPLEMENTATION → (2) ADMIN-PRODUCT-DESCRIPTION-MANAGEMENT → (3) STORE-HANDLED-PRODUCT-DESCRIPTION-SELECTION → (4) PUBLIC-CONTENT-RESOURCE(`/r/{id}`) → (5) RESOURCE-QR-INTEGRATION → (6) PRODUCT-CONTENT-OSMU-INTEGRATION.

---

*본 문서는 WO-0.5(Freeze Confirmation)로 IR + Persistence 를 Baseline 으로 승격한 결과물이다. 설계 신규 없음 — 기존 확정 내용의 기준 승격 + Freeze #6 명문화 + 용어(Product Resource) 확정.*
