# CHECK-O4O-GLYCOPHARM-PRODUCT-DESCRIPTION-RICH-RENDER-V1

> **작업명:** WO-O4O-GLYCOPHARM-PRODUCT-DESCRIPTION-RICH-RENDER-V1
> **유형:** GP storefront 상품설명 정렬 — backend HTML strip 제거 + frontend `ContentRenderer`(DOMPurify) 렌더. DB/schema **무변경**.
> **결과: PASS — GP store.controller `queryVisibleProducts` description/short 의 `regexp_replace` 태그제거 제거(HTML 보존) + `StoreProductDetail` 상품설명 탭을 `ContentRenderer` 로 렌더(sanitized rich). product_ai_contents 미노출, 신규 dependency 0. api-server + web-glycopharm typecheck 0.**
> 선행: CANONICAL-OUTPUT-LINK(GP) · HTML-RENDERING-POLICY · KPA-TABLET-RICH-RENDER — 2026-06-16

---

## 1. 수정 파일 (3)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/routes/glycopharm/controllers/store.controller.ts` | `queryVisibleProducts` description/short 의 `regexp_replace('<[^>]+>','')` **제거** → `COALESCE(spd.content, consumer_detail, consumer_short, '')` HTML 보존 |
| `services/web-glycopharm/src/pages/store/StoreProductDetail.tsx` | `ContentRenderer` import + description 탭 `{product.description}`(plain) → `<ContentRenderer html=.../>` (description + shortDescription) |
| `docs/investigations/CHECK-O4O-GLYCOPHARM-PRODUCT-DESCRIPTION-RICH-RENDER-V1.md` | 본 CHECK |

> DB/migration/schema/route/상품설명 관리 UI/store override/KPA·tablet 코드 변경 **0**. GP tsconfig path 불요(GP 는 이미 `@o4o/content-editor` 자체 src 소비 — LmsLessonPage, node_modules 해석).

## 2. backend strip 제거

```sql
-- before (CANONICAL-OUTPUT-LINK: GP plain 렌더 위해 태그 제거)
regexp_replace(COALESCE(spd.content, spo.consumer_detail_description, spo.consumer_short_description, ''), '<[^>]+>', '', 'g') AS description,
-- after (HTML 보존 → frontend ContentRenderer 가 sanitize)
COALESCE(spd.content, spo.consumer_detail_description, spo.consumer_short_description, '') AS description,
```
- short_description 동일(`spd.summary → consumer_short → ''`, strip 제거).
- **fallback 순서 유지**(canonical 우선). `shared_product_descriptions` LEFT JOIN·count·DISTINCT ON 무변경 → row/pagination 영향 0.
- `product_ai_contents` 미포함(정책 준수).

## 3. frontend ContentRenderer 적용

`StoreProductDetail.tsx` 상품설명 탭(`activeTab==='description'`):
```tsx
// before — plain JSX (whitespace-pre-wrap, HTML 태그 문자 노출)
<div className="whitespace-pre-wrap ...">{product.description}</div>
{product.shortDescription && <p ...>{product.shortDescription}</p>}
// after — sanitized rich HTML
{product.description && <ContentRenderer html={product.description} className="text-slate-700" />}
{product.shortDescription && <ContentRenderer html={product.shortDescription} className="text-slate-500 mt-4" />}
```
- 빈 값 가드(`&&`) — description 없으면 미표시(탭 빈 상태, 기존 시각 동등).
- `prose max-w-none` 래퍼 유지(서식 타이포 보존).

## 4. 보안 / sanitize

- `ContentRenderer`(`@o4o/content-editor`) 렌더 직전 **`sanitizeHtml`(DOMPurify)** → script/on*/javascript:/위험 태그 제거.
- **`dangerouslySetInnerHTML` 직접 추가 0**(ContentRenderer 캡슐화). GP 파일에 미-sanitize raw HTML 주입 없음.
- backend 가 HTML 보존해도 노출은 frontend sanitize 통과 → XSS 안전(태그제거→sanitize 로 안전 모델 전환).

## 5. list/featured 영향 확인 (strip 제거 부작용 점검)

- `queryVisibleProducts` 는 GP storefront list/detail/featured 공유 → strip 제거로 셋 다 description 이 HTML.
- **GP store 목록/featured 카드는 product description/short_description 을 렌더하지 않음**(grep 확인 — `.description` 사용처는 blog/store-info/QR 등 별개 데이터뿐). → **태그 노출 부작용 없음**. 상품설명 HTML 은 상세 탭(ContentRenderer)에서만 노출.

## 6. 검증

- **typecheck PASS:** api-server 0 · web-glycopharm 0.
- 정적: backend strip 제거(HTML 보존)·fallback/JOIN/count 동일, frontend plain→ContentRenderer, `dangerouslySetInnerHTML` 신규 0, DB/schema 무변경, 신규 dep 0.
- **브라우저 smoke 미수행** — 배포 후 권장: GP 상품 상세 '상품 설명' 탭 → canonical `<p>/<strong>/<ul>` **서식 렌더**(태그 문자 X) + 위험 HTML 미실행 + 목록/featured 정상 + console error 0.

## 7. 완료 판정

**PASS.** GP storefront backend HTML strip 제거(canonical 우선 fallback 유지), 상품설명 탭 ContentRenderer rich render, product_ai_contents 미노출, XSS 안전, 신규 dependency 0, DB/schema 무변경, api-server·web-glycopharm typecheck 통과. list/featured 부작용 없음(미렌더).

## 8. 상품설명 공용 자산 노출 — 정렬 현황

| Surface | 렌더 |
|------|------|
| KPA storefront | ✅ ContentRenderer |
| KPA/KCos/GP tablet | ✅ ContentRenderer |
| **GP storefront** | ✅ **ContentRenderer (본 WO)** |

→ 주요 소비자-facing 상품설명 노출이 **canonical + sanitized rich HTML** 로 정렬 완료.

## 9. 후속 WO

1. `WO-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V1` — shared_product_descriptions 저장/seed 시 sanitize(defense-in-depth).
2. `IR-O4O-FRONTEND-DANGEROUS-HTML-RENDERING-AUDIT-V1` — 전체 frontend dangerouslySetInnerHTML 전수조사(약한 regex sanitizer 포함).
3. `WO-O4O-PRODUCT-DESCRIPTION-STORE-PROFILE-OVERRIDE-DEPRECATION-V1` — store override DB 사용량 확인 후 편집 UI 축소/폐지.

---

*Date: 2026-06-16 · GP 상품설명 rich render 정렬 · PASS · backend regexp_replace 태그제거 제거(HTML 보존) + StoreProductDetail ContentRenderer(DOMPurify) · canonical 우선 fallback 유지, product_ai_contents 미노출 · 신규 dep 0, DB/schema 무변경, list/featured 미렌더라 부작용 0 · api-server·web-glycopharm typecheck 0 · 주요 surface 상품설명 노출 canonical+sanitized rich 정렬 완료.*
