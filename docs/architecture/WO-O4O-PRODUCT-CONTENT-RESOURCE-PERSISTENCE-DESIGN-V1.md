# WO-O4O-PRODUCT-CONTENT-RESOURCE-PERSISTENCE-DESIGN-V1

Status: DESIGN (설계 문서 작성 전용) — **코드/DB/Migration/API/UI 변경 없음.**
Date: 2026-07-08
상위 IR: [`IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1`](IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1.md)
정합: [`O4O-CONTENT-TYPE-TAXONOMY-V1`](O4O-CONTENT-TYPE-TAXONOMY-V1.md) · [`PLATFORM-CONTENT-POLICY-V1`](../baseline/PLATFORM-CONTENT-POLICY-V1.md)(F4) · [`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`](O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md)

> **목적**: IR 이 정의한 Product Content Resource 를 **현재 O4O DB 에 어떻게 구현할지**(저장 구조)를 확정한다.
> WO-1(Description Type 구현)에 앞서 **저장 위치를 먼저 확정**해, 나중에 POP/Video/Blog 를 붙일 때 구조를 다시 뜯는 일을 막는다.

---

## 0. 결론 요약 (TL;DR)

- **권고 = B안** (Logical Resource / Physical = 기존 테이블 재사용, 점진적 확장).
- **핵심 발견 — 콘텐츠는 이미 2계층으로 존재한다.** 이 구분이 설계의 축이다.

| 계층 | 성격 | 키 경계 | canonical | 대표 테이블 | IR Resource 대응 |
|---|---|---|:---:|---|:---:|
| **계층 1 — 상품 기준 공용 콘텐츠** | ProductMaster 기준·서비스 중립·O4O 공용 자산 | `master_id` | **있음** | `shared_product_descriptions` (+ `product_ai_contents`=draft) | **✅ = Product Content Resource** |
| **계층 2 — 매장 실행 자산(Production Material)** | 매장별 출력물·채널 게시물 | `organization_id`/`store_id`/`service_key` | 없음 | `store_pops`·`store_execution_assets`·`store_videos`·`store_qr_codes`·`kpa_store_contents`·`signage_forced_content`·`kpa_contents`·`store_blog_posts` | ❌ (Resource 를 **소비**) |

- **IR 의 `neture.co.kr/r/{resourceId}` 영구 Resource = 계층 1**(master 기준 canonical 콘텐츠)이다. 계층 2(매장 실행 자산)는 Resource 를 **소비**하는 별개 계층이며 본 설계로 흡수·회수하지 않는다.
- **DESCRIPTION Resource 의 물리 저장소 = `shared_product_descriptions`**. 이미 유일하게 master 기준 canonical 을 갖춘 테이블이다. 20만+ ProductMaster·기존 설명서 체계를 그대로 활용한다.
- POP/Video/Blog 등을 **계층 1 Resource** 로 둘 필요가 생기면, **그때** master 기준 sibling 저장소를 하나씩 추가한다(대규모 Migration 없음).

---

## 1. 목적 (완전판)

IR-O4O-PRODUCT-CONTENT-RESOURCE-ARCHITECTURE-V1 의 Product Content Resource 를 **가장 적은 변경**으로 현재 플랫폼에 적용하는 저장 구조를 확정한다. 세 가지를 동시에 만족한다.

1. 기존 `shared_product_descriptions` 최대한 재사용
2. 향후 POP/Video/Tablet/Blog/AI Voice 까지 자연스럽게 확장
3. 대규모 Migration 없이 점진적 전환

---

## 2. 현재 구조 조사 (As-Is) — 코드 근거

> 조사 기준 2026-07-08. 모든 테이블 PK = **UUID**.

### 2.1 Description (계층 1)
[`SharedProductDescription.entity.ts:77`](../../apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts)
- PK: UUID. FK: `master_id` → ProductMaster (**ManyToOne 단방향 nullable, onDelete CASCADE** — ProductMaster 무변경).
- `source_type` ∈ supplier/operator/ai/store_contribution/drug_extension/mfds_easy_drug/mfds_drug_otc_nutrition_combo/migration/manual (**provenance**).
- `status` ∈ candidate/**canonical**/hidden/needs_review/deprecated (**큐레이션**).
- **canonical 정책**: master 당 1개 — partial unique index `uniq_shared_product_descriptions_canonical_per_master ON (master_id) WHERE status='canonical' AND deleted_at IS NULL` ([migration 20261114000000:62](../../apps/api-server/src/database/migrations/20261114000000-CreateSharedProductDescriptions.ts)).
- `content`(HTML) + `summary` + `curated_by/at` 큐레이션 흔적 + `deleted_at`(soft delete).
- **소비자 해석 순서 (SSOT, [store-public-utils.ts:192](../../apps/api-server/src/routes/platform/store-public/store-public-utils.ts))**: `COALESCE(spd.content[canonical], store_product_profiles.description[legacy], supplier_product_offers.consumer_detail_description[offer])`.

### 2.2 ProductMaster ↔ Description 연결
- 연결축 = `shared_product_descriptions.master_id`. **ProductMaster 는 콘텐츠를 몰라도 된다**(단방향). Tablet 도 이미 canonical 을 재사용(WO-O4O-KPA-TABLET-DESCRIPTION-CANONICAL-LINK-V1, store-public-utils.ts:465).
- 관련 draft 저장소 `product_ai_contents`([entity:35](../../apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts)): `product_id`(uuid, **FK 없음 soft ref**), `content_type` ∈ **product_description/pop_short/pop_long/qr_description/signage_text**. **canonical/status 없음** — AI 초안/seed. `seedFromProductAiContents` 로 SPD candidate 에 흡수. **→ "master 기준 다중 content_type" 의 기존 선례(단, draft 전용)**.

### 2.3~2.7 POP / Tablet / Signage / Blog / Video — **전부 계층 2** (master 미연결)

| 대상 | 테이블 / 파일 | 경계축 | master 연결 | 상태 개념 |
|---|---|---|:---:|---|
| **POP** | `store_pops` / [store-pop.entity.ts:47](../../apps/api-server/src/routes/o4o-store/entities/store-pop.entity.ts) | store_id+service_key+author_role | ❌ | status(draft/published/archived) |
| **POP PDF 산출물** | `store_execution_assets` (usage_type='pop') / [store-execution-asset.entity.ts:24](../../apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts) | **organization_id** | ❌ (Neture FK 금지 명시) | source_type+is_active. usage_type ∈ pop/qr/signage/banner/notice |
| **Tablet 본문** | `kpa_store_contents` / [kpa-store-content.entity.ts:39](../../apps/api-server/src/routes/kpa/entities/kpa-store-content.entity.ts) | organization_id | 링크로 부가보존만 | workspace_status+share_status |
| **Tablet 진열/링크** | `store_tablet_displays` / `kpa_store_content_product_links`(**master_id nullable 부가보존**) | tablet/org | 부가 | is_visible |
| **Signage** | `signage_forced_content` (**엔티티 없음, raw SQL** [migration 20260418100000:14](../../apps/api-server/src/database/migrations/20260418100000-CreateSignageForcedContent.ts)) · 확장 `pharmacy_contents` | **service_key** / organizationId | ❌ | is_active+기간 |
| **Blog 게시** | `store_blog_posts` / [store-blog-post.entity.ts](../../apps/api-server/src/routes/glycopharm/entities/store-blog-post.entity.ts) | store_id+service_key | ❌ | status |
| **Blog/콘텐츠 허브** | `kpa_contents` / [kpa-content.entity.ts:39](../../apps/api-server/src/routes/kpa/entities/kpa-content.entity.ts) | created_by+reusable_policy | ❌ | status(draft/ready)+reusable_policy |
| **Video** | `store_videos` / [store-video.entity.ts:46](../../apps/api-server/src/routes/o4o-store/entities/store-video.entity.ts) | store_id+service_key | ❌ | status. `video_url`=외부(YouTube/Vimeo), O4O 자체저장 없음 |
| **QR 매장** | `store_qr_codes` / [store-qr-code.entity.ts:23](../../apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts) | **organization_id** | ❌ (landing_target_id 참조) | is_active, slug global unique |
| **QR 운영자** | `operator_qr_templates` / [operator-qr-template.entity.ts:79](../../apps/api-server/src/routes/o4o-store/entities/operator-qr-template.entity.ts) | service_key | ❌ | status |
| **파생 추적** | `store_asset_derivations`(polymorphic source→derived, FK 미사용) | org+service_key | ❌ | — |

> **조사 결론**: **master 기준 canonical 자산은 `shared_product_descriptions` 하나뿐**이다. 나머지 콘텐츠(POP/QR/Tablet/Signage/Blog/Video)는 전부 **매장/서비스 경계의 실행 자산(계층 2)** 이며 canonical 개념이 없다. `product_ai_contents` 만 master 기준 다중 content_type 을 갖되 draft 전용이다.

---

## 3. 저장 구조 비교 (A안 vs B안)

### A안 — `product_content_resources` 공통 테이블 신설
```
product_content_resources (공통)
   ├── description_resources
   ├── video_resources
   └── blog_resources ...
```
| 항목 | 내용 |
|---|---|
| 장점 | 모든 Resource Type 이 물리적으로 한 뿌리. 이론상 대칭적 |
| 단점 | **기존 20만+ SPD 행을 새 테이블로 이관** 필요. 설명 read/write 경로(store-public-utils COALESCE·admin 설명상태 뷰·tablet canonical link·seedFromProductAiContents·draft-to-shared) **전면 재작성**. canonical partial unique·인덱스·FK 재구성. 회귀 위험 큼 |
| **Migration 규모** | **대(大)** — 데이터 이관 + 다수 경로 재작성 + 재검증 |

### B안 — 기존 구조 유지 + 필요 시 Resource 추가 (Logical Resource / Physical 재사용)
```
Logical:  Product Content Resource
              │
Physical:  DESCRIPTION → shared_product_descriptions (그대로)
           POP/VIDEO/... → 필요할 때 master 기준 sibling 저장소를 하나씩 추가
```
| 항목 | 내용 |
|---|---|
| 장점 | **SPD·20만 master·기존 설명 체계 그대로 활용.** 소비 경로(COALESCE/tablet/admin) 무변경. 점진 확장. 회귀 위험 최소 |
| 단점 | Resource 가 물리적으로 한 테이블은 아님(논리 추상으로 통일). Resource Type 별 저장소가 분산될 수 있음 → **공통 규약(§6~§9)으로 일관성 확보** 필요 |
| **Migration 규모** | **소(小)** — DESCRIPTION 은 컬럼 1개(description_type)+인덱스 조정. 데이터 이관 없음 |

---

## 4. 권고안 — **B안** (확정)

**선택 이유:**
1. **유일한 master 기준 canonical 자산이 이미 `shared_product_descriptions` 로 존재**하고, 소비자/태블릿/admin 이 이미 이를 SSOT 로 읽는다. DESCRIPTION Resource 의 물리 저장소로 그대로 승격하는 것이 자연스럽다.
2. **A안의 데이터 이관(20만+)과 다경로 재작성은 얻는 것 대비 위험이 크다.** IR 의 목표("가장 적은 변경·점진 전환")에 정면으로 어긋난다.
3. **`product_ai_contents.content_type`(pop/qr/signage 축)** 라는 선례가 이미 있어, 향후 계층 1 POP/Video Resource 도 동일 패턴(master 기준 + type 컬럼)으로 **필요할 때** 추가하면 된다.
4. **Logical(Product Content Resource) ↔ Physical(shared_product_descriptions) 매핑**으로 IR 의 개념 통일성은 유지하면서, 물리 변경은 최소화한다.

> **Logical = Product Content Resource / Physical(DESCRIPTION) = `shared_product_descriptions`.**

---

## 5. Migration 영향도 (권고 B안 기준)

| 영역 | WO-1(DESCRIPTION Type) 시점 | 나머지 Resource Type 추가 시점 |
|---|---|---|
| **DB** | SPD 에 `description_type`(varchar) 컬럼 **가산** + canonical partial unique 를 `(master_id)` → `(master_id, description_type)` 로 교체(§6). 기존 canonical 백필(default type 지정). **테이블 rename/데이터 이관 없음** | 해당 type 저장소(예: master 기준 canonical POP) **신설만**. 기존 무영향 |
| **API** | 설명 조회/작성 엔드포인트에 `descriptionType` 파라미터 **가산**(미전달 시 기존 동작). COALESCE 해석 순서 무변경(type 필터만 추가) | 신규 type 엔드포인트 추가 |
| **Admin** | "설명 상태" 뷰가 type 별 현황 표시로 확장(뷰 추가, 기존 write 경로 유지) | Content Resource 현황에 type row 추가 |
| **Store** | handled-products 설명 선택(STORE/SUPPLIER_STORE) 소비 UI 추가 | 필요 시 소비 UI 추가 |

> A안은 위 모든 칸이 "전면 재작성 + 데이터 이관"으로 커진다. B안은 **가산(additive) 위주**.

---

## 6. Canonical 정책 확장안

- 현재: `master 당 canonical 1개` — `uniq_...canonical_per_master ON (master_id) WHERE status='canonical' AND deleted_at IS NULL`.
- IR 기준: `(master, resourceType, descriptionType) 당 canonical 1개`.
- **B안 구현(DESCRIPTION 한정)**: SPD 는 물리적으로 `resourceType=DESCRIPTION` 이므로, SPD 내부에서는 **`(master_id, description_type)` 당 canonical 1개**로 축소된다.
  - 조치: partial unique index 를 `(master_id, description_type) WHERE status='canonical' AND deleted_at IS NULL` 로 교체.
  - 백필: 기존 canonical 행에 default `description_type` 부여(예: 현행 STORE 성격 → `STORE`; 정확한 기본값은 WO-1 이 데이터 근거로 확정).
- **다른 Resource Type**: 각 type 저장소가 자체적으로 `(master_id, [subtype]) 당 canonical 1개`를 보장(추가 시점에 동일 규약 적용).

---

## 7. Resource ID 정책

- **내부 Resource ID = UUID 유지**. SPD PK 가 이미 UUID 이고 전 테이블이 UUID 다. 변경 불필요.
- **영속성**: soft delete(`deleted_at`)만 사용, **hard delete·ID 재사용 금지**(IR §4.3 tombstone). 폐기해도 UUID 는 소멸시키지 않는다.
- **공개 permalink alias**: IR 예시 `/r/5213`(짧은 정수/base62)은 UUID 노출을 원치 않음을 시사.
  - 권고: **공개용 짧은 opaque alias 를 별도 축으로 발급**(예: `resource_public_id` 컬럼 또는 permalink 매핑 테이블). alias ↔ UUID 는 1:1 불변. 발급은 WO-4(공개 페이지) 시점.
  - 대안(UUID 직접 노출)은 URL 이 길고 순차성은 없으나 미관/추정 관점에서 alias 권장. **최종 형식은 WO-4 결정**.

---

## 8. URL 정책 검증

- 확정: `https://neture.co.kr/r/{resourceId}` (IR §4.4·§11.2).
- **충돌 조사 결과**: 현재 `web-neture` 및 백엔드 `routes/` 에 `/r/` 또는 `/d/` 공개 라우트 **없음**(grep 확인). 신규 도입에 경로 충돌 없음.
- 필요 작업(WO-4): `neture.co.kr` 에 `/r/{resourceId}` **단일 resolver**(resourceId → Resource 조회 → type별 렌더/공개정책 적용). 호스트는 소비 서비스와 무관하게 항상 `neture.co.kr`(서비스별 도메인 금지).
- 접근 정책(공개 범위: B2C 공개 / B2B·STORE·SUPPLIER_STORE 범위)은 F4 Visibility 축 재사용 — WO-4 확정(IR §13-4).

---

## 9. QR 저장 정책

- **QR 이미지는 저장하지 않는다**(IR §4.5). QR 은 `neture.co.kr/r/{resourceId}` 만 인코딩한다.
- 생성: **동적 생성 + (선택) 캐시**. "QR 이미지 관리 목록"을 두지 않는다.
- 영구 `/r/{id}` 덕분에 **인쇄물·POP·태블릿 어디에 써도 재발급 불필요**.
- **경계(계층 구분 재확인)**: 본 정책은 **계층 1 Resource QR**(→ `/r/{id}`)에 적용된다. 기존 계층 2 매장 QR(`store_qr_codes`·`operator_qr_templates`·copy-on-import 사본)은 **매장 실행 자산으로 유지**하며 본 설계가 회수·대체하지 않는다. 두 QR 트랙의 최종 통합은 후속 판단(IR §13-5).

---

## 10. Architecture Freeze

```
[권고 구조 — FROZEN]

Logical:   Product Content Resource   (IR 개념 단위)
               │  Resource ID = UUID(내부) · 공개 permalink = /r/{resourceId}
               │  QR = /r/{id} 인코딩(비저장) · 영구 URL/ID(tombstone)
               │
Physical:  DESCRIPTION  →  shared_product_descriptions   (그대로 재사용)
               │   canonical = (master_id, description_type) 당 1개
               │
           POP / VIDEO / BLOG / TABLET / SIGNAGE / AI_VOICE (계층 1 Resource)
               →  필요 시 master 기준 sibling 저장소를 하나씩 추가
                  (product_ai_contents content_type 선례 패턴)

계층 2(매장 실행 자산: store_pops·store_execution_assets·store_videos·
store_qr_codes·kpa_store_contents·signage_forced_content·kpa_contents·
store_blog_posts)는 Resource 를 "소비"하는 별개 계층으로 유지 — 본 설계로 흡수/회수하지 않는다.
```

**Freeze 선언:**
- 후속 WO 는 **본 Persistence 구조를 변경하지 않고 구현만 수행**한다.
- 즉 (a) DESCRIPTION Resource = `shared_product_descriptions`, (b) canonical = (master, resourceType, descriptionType), (c) Resource ID = UUID + 공개 permalink `/r/{id}`, (d) QR 비저장, (e) 계층 1/계층 2 분리, (f) **ProductMaster 는 Resource 를 모른다 — ProductMaster 에 Resource FK 신설 금지, 항상 `Resource.product_master_id` 단방향 참조** — 이 6가지는 후속 WO 에서 **재설계 대상이 아니다**.
- 구조 변경이 필요하면 별도 WO 로 본 문서를 개정한다.
- **Baseline 승격**: 본 Freeze 는 WO-0.5(`FREEZE-CONFIRMATION-V1`)로 [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md)(CLAUDE.md F12)로 승격됨.

---

## 11. 완료 기준 (본 WO)

- [x] 현재 DB 구조 조사 완료 (§2, 코드 근거 포함)
- [x] Resource 저장 방식 비교 (§3)
- [x] A안/B안 비교 완료 (§3)
- [x] 권고안 확정 — **B안** (§4)
- [x] Canonical 확장안 작성 — (master, description_type) partial unique (§6)
- [x] Resource ID 정책 작성 — UUID 유지 + 공개 alias(WO-4) (§7)
- [x] Permalink 정책 검증 — `/r/{id}` 충돌 없음 (§8)
- [x] QR 저장 정책 작성 — 비저장·동적생성 (§9)
- [x] Architecture Freeze 작성 (§10)
- [x] **핵심 추가**: 계층 1(Resource) vs 계층 2(매장 실행 자산) 분리 명시 (§0, §2, §9, §10)
- **코드/DB/API/UI 변경 없음.**

---

## 12. 후속 WO (Freeze 위에서 구현만)

IR §14 의 WO 순서를 본 Persistence Freeze 위에서 수행한다.
1. `WO-O4O-DESCRIPTION-TYPE-IMPLEMENTATION-V1` — SPD 에 `description_type` 가산 + canonical index (master_id, description_type) 교체 + 백필 (§5,§6)
2. `WO-O4O-ADMIN-PRODUCT-DESCRIPTION-MANAGEMENT-V1` — 설명 현황 뷰 type 확장 (§5)
3. `WO-O4O-STORE-HANDLED-PRODUCT-DESCRIPTION-SELECTION-V1` — 매장 설명 선택 (§5)
4. `WO-O4O-PUBLIC-CONTENT-RESOURCE-V1` — `neture.co.kr/r/{id}` resolver + public alias + 접근정책 (§7,§8)
5. `WO-O4O-RESOURCE-QR-INTEGRATION-V1` — Resource QR 동적생성 (§9)
6. `WO-O4O-PRODUCT-CONTENT-OSMU-INTEGRATION-V1` — 계층 2 실행자산이 계층 1 Resource 를 소비 (OSMU)
