# CHECK-O4O-TABLET-CONTENT-RENDERER-VARIANT-FIX-V1 — 태블릿 설명서 variant 적용

WO: `WO-O4O-TABLET-CONTENT-RENDERER-VARIANT-FIX-V1` · 일자: 2026-07-16 · 상태: 완료
근거: [8B-RENDER-PATH-AUDIT](CHECK-O4O-OTC-DESIGN-8B-RENDER-PATH-AUDIT-V1.md) (조사) · 계약: [CR-020 V1.2](../guides/content-authoring/STORE-DESCRIPTION-CLASS-CONTRACT.md)

> **DB write 0** · OTC listing 생성 **0** · content_list 데이터 변경 **0** · 다국어 랜딩(D) 코드 변경 **0**.

---

## 1. 결론

> **태블릿 설명서 슬롯 2곳에 공통 variant 적용 완료.** 인라인 15px 충돌 제거.
> **e약은요 회귀 0 — 48/48 측정 PASS** (실물 프로덕션 콘텐츠).
> §8-B **해결**: C 는 코드 수정, **D 는 오분류라 코드 미변경 + 문서 정정**.

---

## 2. 핵심 문제 — 슬롯이 섞인다

조사(§8-B AUDIT)는 "variant 를 주면 된다"로 끝났지만, 구현하며 **CSS 를 실측하니 그대로는 e약은요가 회귀**한다.

`.store-desc-content` 의 규칙 중 **`.sd-*` 스코프가 아닌 것**은 딱 2개다:

```css
.store-desc-content{ background:var(--sd-bg);       /* #eaf0f7 — 청회색 */
                     padding:24px 14px 50px;
                     font-family:Pretendard...; container-type:inline-size; }
.store-desc-content *{box-sizing:border-box}
```

→ **`sd-*` 없는 콘텐츠에 variant 를 주면** 흰 모달 안에 **청회색 배경 블록 + 하단 50px 여백**이 생긴다.
그런데 태블릿 슬롯에는 **설명서와 평문이 같은 자리로 들어온다**:

| 슬롯 | 들어오는 것 |
|---|---|
| 상품 상세 `description` | O4O 상품 → **SPD**(OTC = `sd-*` / e약은요 = 평문) · local 상품 → 매장 입력 평문 |
| content_list 카드 상세 | `o4o_product_description` → **SPD**(동상) · `store_content` → 매장 제작 평문 |

> **`sourceType` 으로는 못 가른다.** 조사에서 실측했듯 현재 태블릿에 걸린 `o4o_product_description` item 2건은 **e약은요(평문)** 다. 즉 "o4o 상품 설명 = 설명서"가 아니다.

**해결**: 판별축을 **마크업**으로 잡는다.

```ts
// packages/content-editor/src/components/ContentRenderer.tsx
export function hasStoreDescriptionMarkup(html?: string | null): boolean {
  return typeof html === 'string' && html.includes('class="sd-card"');
}
```

- `sd-card` = CR-020 §2 의 **콘텐츠 루트** — "이 CSS 를 태울 대상인가"와 정확히 같은 질문이다.
- `source_type` 이 아니라 마크업을 보므로 **sd-\* 를 쓰는 새 source_type 이 생겨도 서버 계약 변경 없이 따라온다**.
- 계약을 소유한 `content-editor` 에 둔다(추가만 — 기존 동작 무변경).

---

## 3. 변경

| 파일 | 변경 |
|---|---|
| `packages/content-editor/.../ContentRenderer.tsx` | **`hasStoreDescriptionMarkup()` 신설**(순수 추가) |
| `packages/content-editor/src/components/index.ts` · `src/index.ts` | export |
| `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | 설명서 슬롯 **2곳** 조건부 variant + 인라인 typography 제거 |

### 3-1. 렌더 위치 전수 확인 — 5곳 중 2곳이 대상

| 행 | 렌더 대상 | 소스 | 조치 |
|---|---|---|---|
| `:699` | `activeTranslation.html` | `kpa_store_contents.content_json->'translations'` (**매장 제작**) | 대상 아님 |
| `:711` | `selectedContentHtml` | `kpa_store_contents.content_json->>'html'` (**매장 제작**) | 대상 아님 |
| **`:719`** | **`selectedProduct.description`** | **SPD** STORE canonical / local 설명 | ✅ **조건부 variant + 15px 제거** |
| `:725` | `selectedProduct.summary` | SPD `summary` — **평문 한 줄** | 대상 아님 (설명서 본문 아님) |
| **`:976`** | **`openContentCard.detail.html`** | **SPD** / 매장 제작 | ✅ **조건부 variant + 15px 제거** |

> `:699`/`:711` 은 조사 때 미확정으로 남겼던 항목 — 이번에 `store-public-tablet.handler.ts:105-110` 에서 **`kpa_store_contents` 로 확정**했다. SPD 가 아니므로 대상이 아니다.

### 3-2. 적용 형태

설명서일 때만 variant 를 주고, **그 경우에만** 인라인 typography 를 뺀다. 그 외는 **수정 전과 완전히 동일한 props**.

```tsx
<ContentRenderer
  html={selectedProduct.description}
  variant={hasStoreDescriptionMarkup(selectedProduct.description) ? 'store-description' : undefined}
  style={hasStoreDescriptionMarkup(selectedProduct.description)
    ? { margin: '0 0 8px' }
    : { fontSize: '15px', color: '#475569', lineHeight: 1.6, margin: '0 0 8px' }}
/>
```

---

## 4. 검증

### 4-1. 렌더 — **48/48 PASS**

**프로덕션 DB 실물 콘텐츠 6종** × **슬롯 2**(모달 640 / 상세 패널) × **4폭**(375·768·1024·1280).
sd CSS 는 `ContentRenderer.tsx` **소스에서 추출**(하드코딩 아님), 컨테이너는 `TabletKioskPage` 실제 style 값(`contentModal` 640 / body 20 / `detailInfo` 24).

**① 설명서(`sd-*`) — 적용됨**

| 슬롯 | 폭 | 래퍼 | h1 | 본문 | 카드 | 단 | 잘림 |
|---|---:|:---:|---:|---:|---:|:---:|:---:|
| 상세 패널 | 375 | ✅ | 32px | 15.5px | 299 | **1열** | 0 |
| 상세 패널 | 768 | ✅ | **44px** | **17px** | 692 | **2열** | 0 |
| 상세 패널 | 1024 | ✅ | 44px | 17px | **860** | **3열** | 0 |
| 상세 패널 | 1280 | ✅ | 44px | 17px | **860** | **3열** | 0 |
| 모달(640) | 전 폭 | ✅ | 32px | 15.5px | 572 | **1열** | 0 |

→ **GUIDE §4.3 실측표와 완전 일치.** 모달 1열은 §4.3 "슬롯 폭이 분기를 결정"(572 < 640) 대로 — 결함 아님.
→ 스크린샷 확인: `sd-warn` 경고 박스(삼각 마커 + 좌측 선 + 배경) 정상, 제목 44px/본문 17px 정상.

**② 비 `sd-*`(e약은요 2 + 일반 HTML 2) — 회귀 0**

| 항목 | 결과 |
|---|---|
| `.store-desc-content` 래퍼 | **전 32측정 미부착** |
| 청회색 배경(`--sd-bg`) 침범 | **0** |
| 본문 크기 | **15px / 18px — 변경 없음** |
| 잘림 · 가로 스크롤 | **0** |

> **회귀 0 이 구조적으로 보장된다** — 비-sd 는 분기를 타지 않아 **수정 전과 동일한 props** 로 렌더된다. 측정은 그 사실의 확인이다.

**③ 전체**: 가로 스크롤 **0** · 잘림 **0** · 기존 태블릿 동선 불변(렌더 슬롯 외 미변경).

### 4-2. 판별 정확도 — 실물 6종

| 콘텐츠 | `sd-card` | 판별 |
|---|:---:|:---:|
| OTC ko (듀얼치싹정600밀리그램) | ✅ | **설명서** |
| OTC en (Diosmin 600 mg Tablet) | ✅ | **설명서** |
| e약은요 성광알파헥시딘가글액 | ❌ | 평문 |
| e약은요 그린헥시딘가글액 | ❌ | 평문 |
| 매장 제작 "해양 심층수 효능" | ❌ | 평문 |
| 매장 제작 "관절·연골·뼈 골든 세트" | ❌ | 평문 |

### 4-3. typecheck / build — **Shared Module 3 소비처 전수**

`tablet-kiosk-core` 는 빌드 산출물 없이 **소스로 소비**된다 → 소비처 전부 확인.

| 대상 | typecheck | build |
|---|:---:|:---:|
| `content-editor` | ✅ exit 0 | ✅ Build success (ESM + DTS) |
| `tablet-kiosk-core` | ✅ exit 0 | — (소스 소비 패키지) |
| **`web-kpa-society`** | ✅ **0 오류** | ✅ **exit 0** |
| **`web-glycopharm`** | ✅ **0 오류** | — |
| **`web-k-cosmetics`** | ✅ **0 오류** | — |

> `content-editor` 변경은 **순수 추가**(새 export 1개)라 기존 소비처 동작에 영향이 없다.
> Tailwind config 영향 없음 — 새 유틸 클래스를 쓰지 않는다(sd CSS 는 JS 주입, 태블릿은 인라인 style).

---

## 5. 문서 반영

| 문서 | 변경 |
|---|---|
| [OTC 디자인 GUIDE](../guides/OTC-DESCRIPTION-DESIGN-GUIDE.md) **V0.7 → V0.8** | **§3 표 구조 정정** — SPD 렌더 화면(A·B·C·E) / 비렌더 화면(D) 분리 · **D 대상 제외**(오분류) · **E 추가**(누락) · **C 적용**(섞이는 슬롯 주석) · 화면별 현재 노출 병기 · **§8-B 해결** |
| [디자인 TEST-LOG](../guides/OTC-DESCRIPTION-DESIGN-TEST-LOG.md) **V0.6 → V0.7** | **D-10** 기록 |

버전·이력은 **같은 커밋에서 갱신**(OR-005). **디자인 기준 자체는 변경 없음** — 바뀐 것은 "어느 화면이 이 기준을 태우는가"다.

---

## 6. 완료 기준 대조

| 기준 | 결과 |
|---|---|
| 태블릿 설명서 렌더에 공통 variant 적용 | ✅ §3-1 (SPD 슬롯 2곳 / 전수 확인 5곳) |
| 인라인 글자 크기 충돌 제거 | ✅ 설명서 분기에서 `fontSize`·`color`·`lineHeight` 제거 |
| **e약은요 콘텐츠 회귀 없음** | ✅ **32측정 래퍼 미부착 · 크기 불변** |
| 문서 구조 정정 | ✅ §5 |
| typecheck · build · 화면 검증 | ✅ 3 소비처 0오류 · KPA build exit 0 · **48/48** |
| commit · push | ✅ |
| 제외 준수 (DB · listing · content_list · D · §8-C) | ✅ 전부 미변경 |

---

## 7. 남은 것

| 항목 | 비고 |
|---|---|
| **§8-C 언어 전환 UI 정리** | `LOCALE_LABELS` 가 `MultilingualProductPublicLandingPage.tsx:23-25` 에 로컬 정의 — **같은 값이 `multilingualProductContentStore.ts:31-39` 에 이미 export**(같은 파일에서 타입만 import) · D 모바일 pill `px-3 py-1.5` = **44px 미달** |
| `hasStoreDescriptionMarkup` 단위 테스트 | `content-editor` 에 **테스트 러너가 없다**(jest/vitest 미설정). 러너 도입은 이 WO 범위 밖 → 실물 6종 × 48측정으로 대체 검증 |
| §8-E 표 가로 스크롤 | 설명서는 `<table>` 미사용이라 우회 중 |
| B군 608 약사 검토 | 생약 2그룹(은행엽 203 · 포도엽 96 = 299) 우선 |
| build 선행 결함 | 타 세션 `e41c78157`(content-guard) — api-server, 본 WO 무관 |
