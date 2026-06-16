# CHECK-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V1

> **작업명:** WO-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V1
> **유형:** backend write-path sanitize (defense-in-depth) — 조사 후 **HOLD**.
> **판정: HOLD — backend-safe HTML sanitizer 부재.** `@o4o/content-editor` sanitizeHtml 은 **브라우저 DOM 의존(`dompurify`)** 라 Node 런타임 안전하지 않고 api-server 미의존. api-server 에 `jsdom`은 있으나 **`dompurify` 미보유** → backend DOMPurify 구성하려면 **신규 dependency 필요**(§14 금지). regex sanitizer 도 금지(§9/§14). → **임의 구현하지 않고 보고**(§11 HOLD).
> **현재 노출 안전:** 모든 소비자 surface 가 `ContentRenderer`(DOMPurify) sanitize 렌더 → **활성 XSS 노출 없음**. sanitize-on-write 는 추가 방어선(미달성).
> 선행: HTML-RENDERING-POLICY · GLYCOPHARM-RICH-RENDER — 2026-06-16

---

## 1. 코드 변경

**없음.** HOLD — 신규 dependency 없이 안전한 backend sanitize 불가, regex 대체 금지. 조사 문서만 생성.

## 2. write path 조사 (shared_product_descriptions 생성 경로)

`apps/api-server/src/modules/neture/services/shared-product-description.service.ts`

| 경로 | content/summary write | sanitize 대상? |
|------|------|:--:|
| `createCandidate` (admin manual / 공통) | `content`, `summary` raw 저장 | ✅ 대상 |
| `seedFromSupplierOffers` | consumer_detail/short → content/summary | ✅ |
| `seedFromProductAiContents` | ai content → content | ✅ |
| `seedFromDrugExtension` | 구조화 텍스트 조합(HTML) → content | ✅ |
| `setCanonical` | **status/curatedBy 만 변경**(content 미변경) | ✗ 불요 |
| `setStatus` / `softDelete` | 상태/삭제만 | ✗ 불요 |

→ sanitize 적용 지점은 `createCandidate` + 3 seed 메서드(모두 `createCandidate` 경유 가능). 단 **적용할 안전 sanitizer 가 없음**(§3).

## 3. HOLD 근거 — backend-safe sanitizer 부재

| 후보 | 결과 |
|------|------|
| `@o4o/content-editor` `sanitizeHtml` | `import DOMPurify from 'dompurify'; DOMPurify.sanitize(...)` — **순수 dompurify, 브라우저 `window`/DOM 의존**. Node 런타임에서 no-op/오류 위험. + api-server **미의존** |
| api-server `jsdom`(26.1.0) | **보유**하나 미사용. jsdom 은 DOM 구현일 뿐 sanitizer 아님 — 단독으로 sanitize 불가 |
| api-server `dompurify` | **미보유**(package.json·node_modules 해석 불가). 추가 시 **신규 dependency**(§14 금지) |
| `sanitize-html` / `isomorphic-dompurify` | 워크스페이스 전체 **부재**. 추가 시 신규 dependency |
| regex sanitizer | **금지**(§9 "단순 regex 로 sanitize 대체 금지", §14, §11 HOLD 주의) |
| 기존 backend sanitizer | `store-local-product.routes.ts:36` regex(약함, IR 에서 부적합 판정) — 재사용 금지 대상 |

→ **신규 dependency 없이 안전한 HTML sanitize 구현 불가**, regex 대체 금지 → §11 HOLD 정확히 충족.

## 4. 현재 안전성 평가 (긴급도 낮음)

- 모든 소비자-facing 노출(KPA storefront / KPA·KCos·GP tablet / GP storefront)이 **`ContentRenderer`(DOMPurify) 렌더 sanitize** → **활성 XSS 노출 없음**(HTML-RENDERING-POLICY IR 확인).
- admin 정비 모달 preview 는 `toPlainText`(태그 제거).
- 따라서 sanitize-on-write 는 **2겹 방어선(defense-in-depth)의 추가 레이어**이며, 부재가 즉시 위험을 만들지 않음 → HOLD 안전.

## 5. 해소 방안 (사용자 승인 필요)

HOLD 를 풀려면 아래 중 택일(모두 §14 "신규 dependency 금지" 완화 또는 구조 결정 필요):

1. **(권장) api-server 에 `dompurify` 추가 + 기존 `jsdom` 결합** — backend-safe DOMPurify util:
   ```ts
   import { JSDOM } from 'jsdom';
   import createDOMPurify from 'dompurify';
   const purify = createDOMPurify(new JSDOM('').window);
   export const sanitizeDescriptionHtml = (v?: string|null) => purify.sanitize(v || '').trim();
   ```
   - `jsdom` 이미 보유 → 추가 dep 은 `dompurify` 1개. content-editor 와 **동일 DOMPurify 기본 정책** 재사용 → whitelist 신규 정의 불요.
   - 신규 dep 1개 추가에 대한 **사용자 승인** 필요.
2. **공용 backend-safe sanitize 패키지 추출**(`@o4o/html-sanitize-server` 등) — content-editor 정책을 jsdom+dompurify 로 백엔드용 분리. 구조 작업(별 WO).
3. **렌더 sanitize 만 유지(현 상태)** — sanitize-on-write 보류. 현재 활성 위험 없음(§4) → 수용 가능.

## 6. 불변 / 미수행 확인

- 코드/DB/schema/migration/frontend/ContentRenderer/source 원본/product_ai_contents **변경 0**.
- regex sanitizer **미작성**(금지 준수). 신규 dependency **미추가**.
- 조사 문서 1개만 생성(path-specific). 동시 세션 WIP 미접촉. `git add .` 미사용. typecheck 불요(코드 무변경).

## 7. 완료 판정

**HOLD.** write path 조사 완료(createCandidate + 3 seed), sanitize 적용 지점 확정. 그러나 **backend-safe sanitizer 부재**(content-editor=browser DOMPurify·미의존 / dompurify 미보유 / sanitize-html 부재 / regex 금지) → 신규 dependency 없이 구현 불가. 현재 렌더 단계 sanitize 로 **활성 XSS 없음**이므로 HOLD 안전. §5 해소안(권장: dompurify 추가) 승인 시 후속 구현.

## 8. 후속 WO

1. (HOLD 해소) `WO-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V2` — §5-1(jsdom+dompurify backend util) 사용자 승인 후 createCandidate/seed 에 적용.
2. `WO-O4O-PRODUCT-DESCRIPTION-HTML-CONTENT-CLEANUP-V1` — 기존 candidate/canonical content 일괄 점검(write sanitize 도입 후).
3. `IR-O4O-FRONTEND-DANGEROUS-HTML-RENDERING-AUDIT-V1` · `WO-O4O-PRODUCT-DESCRIPTION-STORE-PROFILE-OVERRIDE-DEPRECATION-V1`(독립).

---

*Date: 2026-06-16 · 상품설명 저장 sanitize · HOLD · backend-safe sanitizer 부재(content-editor=browser dompurify·api-server 미의존 / jsdom 보유·dompurify 미보유 / sanitize-html 부재 / regex 금지) → 신규 dep 없이 불가 · 현재 렌더(ContentRenderer DOMPurify) sanitize 로 활성 XSS 없음 → HOLD 안전 · 해소=jsdom+dompurify backend util(dep 1개 승인 필요) · 코드/DB 무변경.*
