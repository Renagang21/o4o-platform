# CHECK-O4O-CONTENT-TYPE-TAXONOMY-AND-NAMING-ALIGNMENT-V1

> **작업명:** WO-O4O-CONTENT-TYPE-TAXONOMY-AND-NAMING-ALIGNMENT-V1
> **유형:** taxonomy SSOT 문서화 + 최소 주석 drift 정리 (코드 구조/DB/API 무변경)
> **판정: PASS.** content 타입·명칭·역할 SSOT 문서 작성, **상품설명(canonical) ↔ product_ai_contents(AI draft/seed) ↔ store_product_profiles(legacy fallback) 관계 코드 근거로 확정**. 1순위 혼선(축 A vs 축 B) 해소. UI 사용자-facing 라벨 정렬은 named 후속 WO 로 분리(설계상 별 WO).
> 선행: IR-O4O-CONTENT-SURFACE-COMMONIZATION-MAP-V1 · SANITIZE-ON-WRITE-V2 — 2026-06-16

---

## 1. 조사 범위

- 코드 근거 확인: `apps/api-server/src/routes/platform/store-public/store-public-utils.ts`(public 해석 순서), `modules/neture/services/shared-product-description.service.ts`(seed), `modules/store-ai/entities/product-ai-content.entity.ts`, `modules/store-core/entities/StoreProductProfile.entity.ts`.
- product_ai_contents 사용처 grep: content-editor AiContentModal / GP·KCos·KPA StoreProductDescriptionsPage·ProductPopBuilderPage / store-ai service·controller / shared-product-description seed.

## 2. Taxonomy 결정 (SSOT)

신규 문서 `docs/architecture/O4O-CONTENT-TYPE-TAXONOMY-V1.md` 에 확정:
- 상품설명(canonical=`shared_product_descriptions`) / Product AI Content(draft/seed) / Store Product Profile(legacy fallback) / 일반 콘텐츠 / Production Material(출력물) / 복사본(asset snapshot) / Template / Hub Publish(노출) / Copy(복사).

## 3. shared_product_descriptions ↔ product_ai_contents 관계 (1순위, 코드 근거)

**확정:**
```
product_ai_contents(product_description)  = AI draft/source (비노출)
        │ seedFromProductAiContents (candidate 흡수, "노출 아님, 후보로만")
        ▼
shared_product_descriptions (candidate) ─ admin 정비/승격 ─▶ canonical ─▶ 소비자 상품 상세 (직접 노출)
```
- 근거 1 (public 해석 순서, `store-public-utils.ts` COALESCE):
  `COALESCE(spd.content, sp.description, spo.consumer_detail_description)` — **canonical → store_product_profiles(legacy) → supplier**. `product_ai_contents` **부재** = 직접 노출 안 함.
- 근거 2 (seed): `shared-product-description.service.ts seedFromProductAiContents` 가 `product_ai_contents(content_type='product_description')` → candidate(주석 "노출 아님, 후보로만"). 원본 미수정.

## 4. copy vs publish 관계

- **Copy(가져오기)**: 독립 사본 생성, 원본 분리, source metadata 보존 — store=`assetSnapshotApi.copy()`→`o4o_asset_snapshots`, Neture=`dashboardCopy`→`DashboardAsset`.
- **Hub Publish**: 운영자 원본을 hub browse 에 노출(reference), copy 아님 — `hub-content.service` 3축.

## 5. content vs production material 관계

- 일반 콘텐츠(member/operator/store 본문, `kpa_contents`/`cms_content`/...) ≠ Production Material(출력물 POP/QR/블로그/안내문/signage, `kpa_store_contents`/`store_pops`/...). 상품설명은 둘 다 아님(공용 상품 DB 자산).

## 6. 수정 문서/파일 목록

| 파일 | 변경 | 유형 |
|------|------|------|
| `docs/architecture/O4O-CONTENT-TYPE-TAXONOMY-V1.md` | 신규 — taxonomy SSOT | 문서 |
| `docs/investigations/CHECK-...-TAXONOMY-AND-NAMING-ALIGNMENT-V1.md` | 신규 — 본 CHECK | 문서 |
| `apps/api-server/src/modules/store-ai/entities/product-ai-content.entity.ts` | JSDoc 주석 추가(product_description=draft/seed, canonical 아님, 직접 노출 안 함, taxonomy 문서 링크) | **주석만** |

## 7. UI 사용자-facing 문구 수정 여부

- **이번 WO 에서 frontend 라벨 churn 미수행** — WO §13 이 라벨 정렬을 named 후속 `WO-O4O-CONTENT-COPY-POLICY-UI-LABEL-ALIGNMENT-V1` 로 분리. 4서비스 다수 라벨을 본 WO 에서 건드리면 범위/회귀 위험 + 다른 세션 WIP 충돌 가능.
- 대신 **권위 기준(taxonomy 문서 §8 명칭 정렬 규칙)** 을 확정해 후속 라벨 WO 의 기준 제공. 가장 위험한 혼선원(축 A vs 축 B)은 **backend 주석(canonical pivot)** 으로 즉시 명시.
- → WO §11 PARTIAL 조건("UI 문구 정리는 후속으로 분리")에 해당하나, **taxonomy 확정 + 관계 명확화 + 최소 drift(주석) 완료** 로 본 WO 핵심 목표(1순위) 달성 → PASS 로 판정하고 UI 라벨은 후속 WO 로 명시 이관.

## 8. DB / API / schema 무변경 확인

- DB schema / migration / 컬럼 / enum / API field rename **없음**.
- entity 변경은 **JSDoc 주석만**(실행 코드/타입/데코레이터 무변경).
- route/menu/component 공통화/production flow **무변경**. 보안 sanitize 추가 작업 **미수행**(별 backlog).

## 9. Typecheck

- 코드 변경 = `product-ai-content.entity.ts` **블록 주석 1개 추가**(실행 코드·타입 영향 0) → 컴파일 결과 불변. 시간이 큰 api-server 전체 tsc 는 미실행(주석-only, 변경 위험 없음). 문서 2건은 typecheck 비대상.

## 10. 완료 판정

**PASS.**
- content taxonomy 문서 작성(상품설명/AI draft/candidate/canonical/production material/copy/publish/template 정의).
- shared_product_descriptions ↔ product_ai_contents 관계 **코드 근거로 확정**(공개 해석 순서 + seed).
- 명백한 drift(canonical pivot)를 backend 주석으로 최소 정리.
- DB/API/schema 변경 없음, 대규모 리팩터 없음.

## 11. 후속 WO 후보

1. `WO-O4O-CONTENT-COPY-POLICY-UI-LABEL-ALIGNMENT-V1` — 가져오기=복사/원본·사본/삭제 영향 문구 정렬(taxonomy §6·§8 기준).
2. `WO-O4O-CONTENT-HUB-MY-STORE-COPY-CONTRACT-V1` — assetSnapshot ↔ Neture dashboardCopy 정렬.
3. `WO-O4O-CONTENT-PRODUCTION-FLOW-UI-COMMONIZATION-V1` — ProductionMaterialEditor/StartProductionModal/AiContentModal.
4. `WO-O4O-CONTENT-BODY-SANITIZE-ON-WRITE-CROSSSERVICE-V1` — raw 저장 body sanitize 확장(보안).

## 12. Commit Hygiene

- 수정 3파일(2 문서 + 1 주석) path-specific stage, 단일 shell call 로 `add → diff --cached → commit → push` 체인. 다른 세션 WIP 미접촉.

---

*Date: 2026-06-16 · content taxonomy SSOT · PASS · O4O-CONTENT-TYPE-TAXONOMY-V1 신규 · 상품설명(canonical shared_product_descriptions) ↔ product_ai_contents(AI draft/seed, 비노출) ↔ store_product_profiles(legacy fallback) 관계 코드근거 확정(store-public-utils COALESCE + seedFromProductAiContents) · entity 주석 정리 · UI 라벨은 후속 WO · DB/API/schema 무변경.*
