# IR-O4O-STORE-LOCAL-PRODUCT-POP-ASSET-CONTRACT-AUDIT-V1

> 매장 자체 상품(`store_local_products`) 기반 POP 제작 결과를 **기존 POP·자료함 저장 계약**으로
> 저장할 수 있는지에 대한 read-only 감사.
>
> 근거 WO: `WO-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1` §7.2 (구현 전 계약 확인 게이트)
> 판정: **범위 B (ProductPopBuilderPage) STOP** — 기존 계약만으로는 안전하게 저장할 수 없다.
> 코드 변경 0 / DB write 0 / API 변경 0 / 배포 0.

작성일: 2026-07-29
상태: CLOSED (설계 보고서 — 후속 WO 입력)

---

## 1. 배경

`ProductPopBuilderPage` (KPA / GlycoPharm / K-Cosmetics 3종) 는 URL 의 `:productId` 를
**`store_local_products.id`** 로 받는다. 진입 경로:

- `StoreLocalProductsPage.tsx` → `navigate('/store/commerce/products/{product.id}/pop')`
- `ProductMarketingPage.handleCreatePop()`

그런데 화면 내부는 그 로컬 상품 UUID 를 **전역 ProductMaster 자원 API** 에 그대로 넘긴다.

| 호출 | 실제 자원 |
|---|---|
| `getProductAiContents(productId)` | `product_ai_contents` (ProductMaster 기준 전역) |
| `saveProductAiContent(productId, 'pop_short' \| 'pop_long', …)` | 〃 (전역 write) |
| `GET /api/v1/products/{productId}/pop/{layout}` | ProductMaster POP PDF 렌더 |

즉 **매장 소유 자산을 전역 자원에 쓰려는 구조**이며, 선행 WO
(`WO-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1`) 의 접근 계약상
매장 사용자에게는 이 경로가 403 이다. 화면은 현재 사실상 동작하지 않는다.

---

## 2. 감사 대상 (읽기 전용)

| 계약 | 파일 |
|---|---|
| 매장 POP 정본 화면 | [StorePopPage.tsx](../../services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx) (`/store/marketing/pop`) |
| POP 생성 API | [store-pop.controller.ts](../../apps/api-server/src/routes/o4o-store/controllers/store-pop.controller.ts) (`POST /pharmacy/pop/generate`) |
| 실행 자산 저장소 | [store-execution-asset.entity.ts](../../apps/api-server/src/routes/platform/entities/store-execution-asset.entity.ts) |
| 재편집 POP 텍스트 | [store-pop.entity.ts](../../apps/api-server/src/routes/o4o-store/entities/store-pop.entity.ts) (`store_pops`) |
| 출처 기록 | [store-asset-derivation.entity.ts](../../apps/api-server/src/routes/platform/entities/store-asset-derivation.entity.ts) · [store-asset-derivation.service.ts](../../apps/api-server/src/routes/o4o-store/services/store-asset-derivation.service.ts) |
| 로컬 상품 | [store-local-product.entity.ts](../../apps/api-server/src/routes/platform/entities/store-local-product.entity.ts) |

---

## 3. 정본 매장 POP 흐름 (현재 동작하는 것)

```
StorePopPage (/store/marketing/pop)
  └─ POST /pharmacy/pop/generate  { libraryItemIds | directContentItemIds | snapshotItemIds,
                                    qrId, layout, templateId, aiContent, save:true, title }
       ├─ PDF 렌더 → MediaLibraryService 업로드
       ├─ store_execution_assets  (category 'pop', assetType 'file',
       │                           usageType 'pop', sourceType 'generated', organization_id)
       └─ recordDerivations({ derivedKind: 'pop_pdf', sources: [...] })   ← best-effort
  └─ (재편집 텍스트) createStaffPopPost(slug, { title, content, excerpt }) → store_pops
```

`POST /pharmacy/pop/generate` 가 수용하는 소스는
`libraryItemIds / supplierItemIds / directContentItemIds / snapshotItemIds` 뿐이며,
**`localProductIds` 분기는 존재하지 않는다.**

---

## 4. §7.2 계약 게이트 판정표

WO 가 요구한 "POP 결과 저장에 필요한 값" 을 기존 계약이 담을 수 있는지:

| 필요 값 | 기존 계약에 저장 가능? | 근거 |
|---|:---:|---|
| organization 소유권 | ✅ | `store_execution_assets.organization_id` / `store_pops.store_id` |
| 생성 결과(PDF) | ✅ | `store_execution_assets` (file / generated / pop) |
| 상품명 | ✅ | asset `title` 또는 derivation `source_title` |
| 재편집용 텍스트 | △ | `store_pops` 의 title/excerpt/content 만. 상품·레이아웃 연결 없음 |
| **layout** | ❌ | `store_execution_assets` · `store_pops` 어디에도 저장 필드 없음 |
| **localProductId + sourceType='local'** | ❌ | `store_execution_assets` 에 `source_id` 컬럼 없음 |
| 〃 (출처 테이블 경유) | ❌ | `STORE_ASSET_SOURCE_KINDS` 화이트리스트에 `store_local_product` 없음 |
| 〃 (생성 API 경유) | ❌ | `/pharmacy/pop/generate` 에 `localProductIds` 분기 없음 |
| popShort / popLong 분리 재편집 | ❌ | `store_pops` 는 content + excerpt 2필드뿐 |

`STORE_ASSET_SOURCE_KINDS` 실측:
`content_snapshot, content_direct, library_resource, production_material, store_execution_asset,
content_hub, operator_screen_set, supplier_screen_set` — 로컬 상품 없음.

`STORE_ASSET_DERIVED_KINDS`:
`pop_pdf, qr_code, blog_post, signage_item, signage_playlist, store_execution_asset, screen_set`.

---

## 5. 판정

**STOP.** 범위 B 를 지금 구현하려면 최소한 다음이 필요하다.

1. `/pharmacy/pop/generate` 에 `localProductIds` 소스 분기 신설 (백엔드 계약 확장)
2. `STORE_ASSET_SOURCE_KINDS` 에 `store_local_product` 추가 (출처 화이트리스트 확장)
3. layout / 소스 식별자를 담을 필드 신설 (`store_execution_assets.source_id` 또는 metadata 규약)
4. popShort / popLong 재편집을 위한 구조 (현 `store_pops` 로는 표현 불가)

이는 WO 가 명시한 제약
— "기존 POP/자료함 저장 계약을 재사용한다", "신규 테이블·임의 JSON 구조를 만들지 않는다" —
를 넘어선다. 따라서 §18 의 중지 조건
("POP 산출물 저장 계약이 local 소스 식별을 보존할 수 없다") 에 해당하며,
WO §18 이 명시적으로 허용한 **범위 A PASS / 범위 B STOP** 을 택한다.

이번 WO 에서 `ProductPopBuilderPage` 3종은 **수정하지 않는다** (현 상태 유지).

---

## 6. 후속 WO 를 위한 선택지

| 선택지 | 내용 | 비용 | 비고 |
|---|---|---|---|
| **B-1** | `store_execution_assets` 에 `source_kind` + `source_id` 추가(additive nullable) 후 POP 생성 API 에 `localProductIds` 분기 | 중 | 기존 자산에 영향 없음. `store_asset_derivations` 화이트리스트도 함께 확장 |
| **B-2** | `store_asset_derivations` 만 확장(`store_local_product` source kind) 하고 asset 은 그대로 | 소 | 출처 추적은 되지만 layout·재편집 정보는 여전히 못 담음 → 부분 해결 |
| **B-3** | `ProductPopBuilderPage` 은퇴하고 정본 `StorePopPage` 로 수렴. 로컬 상품은 자료함 콘텐츠로 만든 뒤 기존 POP 흐름 사용 | 소 | 화면 1개 감소. 상품→POP 직접 동선은 사라짐 |
| **B-4** | 현 상태 유지(403 화면 방치) | 0 | 권장하지 않음 — 데드 화면 |

권장: **B-3 우선 검토 → 상품 직결 동선이 업무상 필요하다고 확인되면 B-1.**
`StorePopPage` 가 이미 정본이고 3서비스 공통이므로, 화면 2개가 같은 산출물을
다른 계약으로 만드는 상태 자체가 §18 의 "기존 자료함 POP 흐름과 역할이 충돌한다" 에 해당한다.

---

## 7. 확인된 사실 요약

- `ProductPopBuilderPage` 의 `:productId` 는 확정적으로 `store_local_products.id` 이다.
- 이 화면은 전역 `product_ai_contents` 에 쓰기를 시도하며, 매장 사용자에게 403 이다.
- 기존 매장 POP 저장 계약은 **콘텐츠(자료함) 기반**이며 상품 기반 소스를 모른다.
- 따라서 "기존 계약 재사용" 만으로 범위 B 를 완성할 수 없다.

---

## 관련 문서

- [WO/CHECK — 매장 상품 설명 소유권 정렬](../checks/CHECK-O4O-STORE-PRODUCT-DESCRIPTION-OWNERSHIP-ALIGNMENT-V1.md)
- [CHECK — 전역 접근 계약 정정](../checks/CHECK-O4O-PRODUCT-AI-CONTENT-GLOBAL-CONTRACT-AND-ACCESS-FIX-V1.md)
- [CHECK — render_read 다중 관계 fallthrough](../checks/CHECK-O4O-PRODUCT-AI-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1.md)
- [O4O Shared Module Change Protocol V1](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)
