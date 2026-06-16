# CHECK-O4O-KPA-TABLET-PRODUCT-DESCRIPTION-RICH-RENDER-V1

> **작업명:** WO-O4O-KPA-TABLET-PRODUCT-DESCRIPTION-RICH-RENDER-V1
> **유형:** tablet frontend 상품설명 렌더 보정 — plain `{description}` → `ContentRenderer`(DOMPurify sanitize). backend/API/DB **무변경**.
> **결과: PASS — 공유 `tablet-kiosk-core` TabletKioskPage 상품 상세 description/summary 를 `ContentRenderer` 로 렌더(태그 문자 노출 해소, XSS 안전). 신규 외부 dependency 0(기존 내부 `@o4o/content-editor` 재사용). KPA/KCos/GP typecheck 0.**
> 선행: KPA-TABLET-DESCRIPTION-CANONICAL-LINK-V1 · HTML-RENDERING-POLICY-V1(§6-1순위) — 2026-06-16

---

## 1. 수정 파일 (4 + CHECK)

| 파일 | 변경 |
|------|------|
| `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | `ContentRenderer` import + 상세 description/summary `<p>{...}</p>` → `<ContentRenderer html={...} style={...}/>` |
| `packages/tablet-kiosk-core/package.json` | peerDependencies 에 `@o4o/content-editor: workspace:*` 추가(내부 패키지 선언) |
| `services/web-kpa-society/tsconfig.json` | paths 에 `@o4o/content-editor → packages/content-editor/dist`(공유 패키지 경로에서 모듈 해석용) |
| `services/web-k-cosmetics/tsconfig.json` | 동 |
| `docs/investigations/CHECK-...-RICH-RENDER-V1.md` | 본 CHECK |

> backend/API/DB/migration/route/상품설명 관리 UI/tablet 조회 로직/local-product 경로 변경 **0**. GP tsconfig 불요(이미 해석됨).

## 2. 렌더 위치 / 변경

`tablet-kiosk-core/src/TabletKioskPage.tsx` 상품 상세(`mode==='detail'`):
```tsx
// before (plain JSX auto-escape → HTML 태그가 문자로 노출될 수 있음)
{selectedProduct.description && (<p style={...}>{selectedProduct.description}</p>)}
// after (sanitized rich HTML)
{selectedProduct.description && (<ContentRenderer html={selectedProduct.description} style={...} />)}
```
- description + summary 둘 다 ContentRenderer 로(둘 다 canonical/공급자 HTML 가능 필드). 기존 inline style 은 ContentRenderer `style` prop 으로 보존(레이아웃 유지).
- 빈 값 가드(`&&`) 유지 → description 없으면 미표시(기존 UI 정책 동일).

## 3. 보안 / sanitize

- `ContentRenderer`(`@o4o/content-editor`)는 렌더 직전 **`sanitizeHtml`(DOMPurify)** 적용(IR-HTML-RENDERING-POLICY §2 확인) → script/on*/javascript:/위험 태그 제거.
- **`dangerouslySetInnerHTML` 직접 추가 0** — ContentRenderer 가 캡슐화(sanitize 내장). 태블릿 파일에 미-sanitize raw HTML 주입 **없음**.

## 4. 의존성 / 모듈 해석 (신규 외부 dep 0)

- `tablet-kiosk-core` 는 source-direct 공유 패키지(main=src). `@o4o/content-editor`(내부 workspace, dist 빌드)를 **3 소비처(KPA/KCos/GP) 모두 이미 의존** → 신규 외부 패키지 추가 아님. peerDependency 로 선언(소비처 제공).
- **해석 이슈:** `moduleResolution: bundler`에서 KPA/KCos 가 packages/tablet-kiosk-core 경로의 `@o4o/content-editor` 를 해석 못 함(GP 는 해석됨). → KPA/KCos tsconfig paths 에 `@o4o/content-editor → content-editor/dist` 매핑 추가로 해소. **기존 KPA/KCos 자체 파일이 쓰던 dist 와 동일 경로** → 타입/동작 변화 0(해석 범위만 program-global 로 명시).

## 5. 공유 모듈 영향 (Shared Module Protocol)

- `@o4o/tablet-kiosk-core` 소비처: **KPA / K-Cosmetics / GlycoPharm** 모두 동일 TabletKioskPage 사용 → 3 서비스 tablet 상세 description 이 **일괄 sanitized rich render** 로 수렴(일관 개선, 서비스별 분기 없음).
- backend tablet 응답: KPA tablet 은 canonical 연결됨(선행 WO). GP/KCos tablet 도 동일 `queryTabletVisibleProducts` 사용 → description 이 HTML 이면 ContentRenderer 가 안전 렌더, plain 이면 그대로 → **회귀 없음**.

## 6. 검증

- **typecheck PASS (3 소비처):** web-kpa-society / web-k-cosmetics / web-glycopharm — 각 error 0.
- 정적: plain `<p>{description}>` 제거 → ContentRenderer, import 정상, `dangerouslySetInnerHTML` 신규 0, backend/API/DB 무변경.
- **브라우저 smoke 미수행** — 키오스크/배포 환경 의존. 배포 후 권장: KPA tablet 상품 상세 → canonical 설명의 `<p>/<strong>/<ul>` 이 **태그 문자로 안 보이고 서식 렌더** + 위험 HTML 미실행 + 레이아웃 유지 + console error 0.

## 7. 완료 판정

**PASS.** tablet 상품설명 plain 렌더 → ContentRenderer(sanitized rich), HTML 태그 문자 노출 해소, XSS 안전 유지, 신규 외부 dependency 0, backend/API/DB 무변경, 3 소비처 typecheck 0. (tsconfig path 매핑 2건은 내부 패키지 해석용 — 동작 변화 없음.)

## 8. 후속 WO

1. `WO-O4O-GLYCOPHARM-PRODUCT-DESCRIPTION-RICH-RENDER-V1` — GP storefront 도 ContentRenderer + backend strip 제거(rich 일관).
2. `WO-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V1` — shared_product_descriptions 저장/seed 시 sanitize(defense-in-depth).
3. `IR-O4O-FRONTEND-DANGEROUS-HTML-RENDERING-AUDIT-V1` — 전체 frontend dangerouslySetInnerHTML 전수조사.

---

*Date: 2026-06-16 · KPA tablet 상품설명 rich render · PASS · tablet-kiosk-core TabletKioskPage description/summary → ContentRenderer(DOMPurify sanitize) · 태그 문자 노출 해소, XSS 안전 · 신규 외부 dep 0(내부 @o4o/content-editor 재사용, KPA/KCos tsconfig dist path 매핑) · 공유 패키지라 KPA/KCos/GP tablet 일괄 개선 · backend/API/DB 무변경 · 3 소비처 typecheck 0.*
