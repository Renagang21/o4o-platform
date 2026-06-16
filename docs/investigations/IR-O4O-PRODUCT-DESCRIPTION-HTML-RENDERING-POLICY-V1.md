# IR-O4O-PRODUCT-DESCRIPTION-HTML-RENDERING-POLICY-V1

> **유형:** read-only 조사·정책 — 코드/DB/UI **무변경**. 상품설명 content HTML 노출 기준 확정.
> **판정: D → B (단계적 → 제한된 sanitized HTML).** 현재 상품설명 렌더는 **XSS-안전**(KPA ContentRenderer=DOMPurify, GP=태그제거+plain, tablet=plain auto-escape). 목표 = **기존 `@o4o/content-editor` sanitizer + ContentRenderer 를 공용 상품설명 표준 렌더로** (신규 dependency 0). 구현은 후속 분리.
> **🔴 범위 밖 CRITICAL 보고:** GP LMS `CourseDetailPage.tsx:88` 에 **미-sanitize `dangerouslySetInnerHTML`**(lesson content) — 상품설명 아님. 별도 긴급 WO 필요(§7).
> 선행: CANONICAL-OUTPUT-LINK · STORE-PROFILE-OVERRIDE-ALIGNMENT · KPA-TABLET-LINK — 2026-06-16

---

## 1. 현재 렌더 현황 (상품설명 surface)

| Surface | 프론트 렌더 | backend description | XSS | 표현 |
|------|------|------|:--:|------|
| **KPA storefront** | `<ContentRenderer html={product.description}>` (`StorefrontProductDetailPage:292`) | HTML 보존(strip 안 함) | ✅ **sanitize**(DOMPurify) | rich HTML |
| **GP storefront** | `{product.description}` plain JSX (`StoreProductDetail:313`) | **태그 제거**(regexp_replace, glycopharm store.controller) | ✅ React auto-escape | plain |
| **KPA tablet (kiosk)** | `{selectedProduct.description}` plain JSX (`tablet-kiosk-core/TabletKioskPage`) | HTML 보존(strip 안 함) | ✅ React auto-escape | **⚠️ HTML 태그 문자 그대로 노출** |
| **Admin 정비 모달** | `toPlainText`(태그 제거) preview | — | ✅ | plain preview |

→ **보안상 XSS 위험 없음**(상품설명 경로). 문제는 **표현 일관성**: rich(KPA) vs plain(GP) vs **tags-visible(tablet)**.

### 1.1 tablet 표현 이슈 (주의)
- tablet kiosk 는 `{description}` plain 렌더 → backend 가 HTML(canonical/supplier/sp)을 보내면 **`<p>…</p>` 등 태그가 문자로 보임**.
- 이는 supplier HTML 시절부터 존재한 **기존 미스매치**이나, canonical(에디터 HTML) 연결로 더 부각됨. → §6 후속(tablet 을 ContentRenderer 로 전환 또는 strip).

---

## 2. Sanitizer 인프라 (이미 존재 — 재사용 가능)

| 위치 | 종류 | 용도 |
|------|------|------|
| **`packages/content-editor/src/sanitize.ts`** | **DOMPurify** — `sanitizeHtml()`(기본), `sanitizeRichHtml()`(iframe/embed YouTube·Vimeo 화이트리스트) | `ContentRenderer` 가 렌더 직전 적용 |
| `ContentRenderer` (`packages/content-editor`) | `dangerouslySetInnerHTML` + **위 sanitize 선적용** | KPA storefront 등 |
| `store-local-product.routes.ts:36` `sanitizeHtml`(regex) | **regex(약함)** | local product `detail_html` write — `<script>`/`on*=`만 제거 |

→ **공용 DOMPurify sanitizer + 안전 렌더러(ContentRenderer)가 이미 존재.** B안 채택 시 **신규 dependency 불필요**. (regex sanitizer 는 약하나 local product `detail_html` 전용·소비자 미렌더 → 본 정책 범위 밖, §7 후속 권장.)

---

## 3. shared_product_descriptions 저장 sanitize 여부

- `shared-product-description.service.ts` `createCandidate`/seed(supplier/ai/drug_extension) → content **raw 저장**(sanitize 안 함). admin/operator 전용 write.
- 노출 시점: GP=strip / KPA=ContentRenderer sanitize / tablet=plain-escape → **현재는 노출 렌더에서 안전 보장**.
- 단 "저장 raw + 렌더 sanitize" 는 렌더러마다 보장에 의존 → **write-time sanitize(defense-in-depth)** 가 장기적으로 더 견고(§7 후속).

---

## 4. 정책 판정 (A/B/C/D)

- **D (단계적) → B (제한된 sanitized HTML) 채택.**
  - 현재 노출 안전하므로 즉시 개편 불요(D: 회귀 0).
  - 목표 종착지 = **B**: 공용 상품설명 canonical content 는 **제한된 sanitized HTML** 허용, 모든 소비자 surface 가 **`@o4o/content-editor` ContentRenderer(DOMPurify)** 로 렌더 → rich 표현 + 안전 + 일관.
- **A(전체 plain) 기각** — 관리자가 정비한 문단/목록 구조 손실, 이미 KPA는 rich. 표현력 후퇴.
- **C(서비스별 영구 유지) 기각** — 공용 자산인데 surface 별 표현 상이(관리자 preview ↔ 실제 노출 괴리). 장기 부적합.
- **HOLD 아님** — 상품설명 경로에 고위험 raw HTML 노출 **없음**(ContentRenderer sanitize 확인). *(범위 밖 LMS XSS 는 §7 별도.)*

### 허용/금지 태그 기준 (기존 DOMPurify 정책 채택)
- 상품설명은 **`sanitizeHtml()`(기본 DOMPurify, iframe 미허용)** 적용 권장 — §7 금지 목록(script/style/iframe/object/embed/form/img/on*/javascript:/inline style)을 DOMPurify 기본이 이미 차단.
- `sanitizeRichHtml()`(iframe 화이트리스트)는 상품설명엔 **불필요/비권장**(이미지·영상 임베드는 상품 이미지 DB 별도 관리 — §7 준수).

---

## 5. 권장 종착 정책 (확정)

```text
공용 상품설명(shared_product_descriptions.content)은 제한된 sanitized HTML 을 허용한다.
- 노출: 모든 소비자 surface 는 @o4o/content-editor ContentRenderer(DOMPurify sanitizeHtml) 로 렌더.
- 허용: p/br/strong/em/ul/ol/li/h3/h4/blockquote/table 계열 (DOMPurify 기본 허용 범위).
- 금지: script/style/iframe/object/embed/form/input/button/img/video/audio/svg/on*/javascript:/inline style.
- 이미지/영상은 상품설명 HTML 내 임의 삽입 금지(상품 이미지 DB 별도).
- (defense-in-depth) shared_product_descriptions write/seed 시 동일 sanitizeHtml 적용.
```

---

## 6. 후속 WO (구현 — 본 IR 이후)

| 순위 | WO | 목적 |
|:--:|------|------|
| **1** | `WO-O4O-PRODUCT-DESCRIPTION-TABLET-RICH-RENDER-V1` | tablet kiosk `{description}` → ContentRenderer(또는 interim strip). **표현 이슈(§1.1) 해소** — canonical HTML 태그 노출 방지 |
| **2** | `WO-O4O-GLYCOPHARM-PRODUCT-DESCRIPTION-RICH-RENDER-V1` | GP storefront 도 ContentRenderer 렌더 + backend strip 제거 → rich 일관 |
| **3** | `WO-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V1` | shared_product_descriptions create/seed 시 `sanitizeHtml` 적용(defense-in-depth) |
| 4 | `WO-O4O-PRODUCT-DESCRIPTION-HTML-CONTENT-CLEANUP-V1`(선택) | 기존 candidate/canonical content 위험 태그 정리 |

> 1·2 는 "ContentRenderer 단일 렌더러" 표준화. 우선 1(tablet 태그 노출)이 사용자 체감 가장 큼.

---

## 7. 🔴 범위 밖 CRITICAL 보고 (별도 긴급 WO 필요)

**`services/web-glycopharm/src/pages/education/CourseDetailPage.tsx:88`**
```tsx
<div ... dangerouslySetInnerHTML={{ __html: raw }} />   // raw = lesson content(string), sanitize 없음
```
- **미-sanitize raw HTML 주입** → lesson content 작성자(강사/admin) 입력이 수강생 브라우저에서 **XSS 실행 가능**.
- **상품설명 범위 밖**(LMS lesson). 본 WO 는 product-description 정책·read-only 라 **수정하지 않고 보고**(§14 "위험 발견 시 구현 확대 전 보고").
- **권장 즉시 조치:** `import { sanitizeHtml } from '@o4o/content-editor'` 후 `__html: sanitizeHtml(raw)` — 별도 `WO-O4O-LMS-COURSE-DETAIL-XSS-FIX-V1`(긴급)로 처리 요망.
- (참고) 약한 regex sanitizer(`store-local-product.routes.ts:36`)도 DOMPurify 교체 권장(§2).

---

## 8. 무변경 확인 / 검증

- 코드/DB/migration/route/UI/dependency **변경 0**. 조사 문서 1개만 생성(path-specific). 동시 세션 WIP 미접촉. `git add .` 미사용. typecheck 불요(코드 무변경).
- 상품설명 경로 XSS 안전 확인(ContentRenderer DOMPurify / GP strip / tablet escape). 공용 sanitizer 기존 존재(재사용).

---

*Date: 2026-06-16 · 상품설명 HTML 렌더 정책 · 판정 D→B(제한 sanitized HTML, ContentRenderer 표준) · 현재 상품설명 XSS-안전(KPA DOMPurify/GP strip/tablet escape), 신규 dep 불요 · tablet HTML 태그 노출(표현) 후속 1순위 · 🔴 범위 밖 GP CourseDetailPage:88 미-sanitize dangerouslySetInnerHTML(LMS) 긴급 별도 WO 보고 · 코드/DB 무변경.*
