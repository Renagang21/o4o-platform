# CHECK-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-RUNTIME-V1

> WO: `WO-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-RUNTIME-V1`
> 성격: viewer runtime 구현 + 배포 + prod smoke. (picker UI / API / migration 없음)
> 선행: `CHECK-O4O-KPA-TABLET-CONTENT-LIST-BLOCK-SCHEMA-CONTRACT-V1`(서버 resolve 계약)
> Date: 2026-07-13

---

## 0. 결론

공개 태블릿 viewer 가 `/tablet/screen` 의 `content_list` section 을 **실제 카드 섹션 + 상세 모달**로 렌더한다. 상품 record 없이도 O4O 표준 설명서·매장 제작 콘텐츠를 코너 콘텐츠 카드로 표시한다.

- content_list = "코너 콘텐츠" 카드 섹션(product_list 와 분리). 서버 resolve 카드만 소비(재조회 없음).
- 카드 상세 = 경량 모달, `detail.html` 은 **ContentRenderer(DOMPurify)** 로만 렌더.
- product_list 0건 + content 있음 → empty state 미표시(화면 실사용 가능).
- 기존 corner_description/qr_guide/idle_media/product_list/product_focus·샘플 **불변**. 운영 샘플 write 0.
- typecheck 0(패키지 + 3 소비처) · 배포 success · non-regression 200 · **fixture 주입 render smoke PASS**.

---

## 1. 변경 파일

| 파일 | 변경 |
|------|------|
| `packages/tablet-kiosk-core/src/TabletKioskPage.tsx` | content_list 카드 추출(screenSections) + 카드 섹션 렌더 + 상세 모달(ContentRenderer) + empty-state 가드 + 스타일 |
| `packages/tablet-kiosk-core/src/types.ts` | `TabletContentCard` 타입 추가(additive) |
| `packages/tablet-kiosk-core/src/index.ts` | `TabletContentCard` export |

커밋: `90de0fe67`.

---

## 2. content_list 렌더 방식

- `screenSections.find(blockType==='content_list').data.items` → `TabletContentCard[]` 추출(방어적, 없으면 []).
- **"코너 콘텐츠"** 라벨 + 카드 그리드 섹션. QR 카드 뒤, 상품 영역 앞에 배치(§5.3 권장 순서: 코너 설명 → QR → content_list → product_list).
- 섹션은 `maxHeight:48vh + overflowY:auto`(큐레이션 소량 전제, 상단 독점 방지). items 있을 때만 렌더.

## 3. 카드 UI 구조
```
[sourceBadge]  (O4O 표준 | 매장 제작)
title
summary (있으면)
relatedProductName (있으면)
자세히 보기 › (hasDetail && detail.html 있으면)
thumbnailUrl (있으면 상단 이미지; Phase 1 서버는 null)
```
- 반응형: grid `minmax(min(240px,100%),1fr)`, title/summary `wordBreak:keep-all` + clamp.

## 4. 상세 렌더 방식 (§5.2)
- `hasDetail && detail.html` 인 카드 클릭 → **경량 모달**(overlay + 카드형 패널). 배경/✕ 클릭 시 닫힘.
- 본문 = **`ContentRenderer`(@o4o/content-editor, DOMPurify)** 로 렌더. `dangerouslySetInnerHTML` 직접 사용/무검증 raw HTML **없음**.
- product 상세(reducer 흐름)와 **독립**(별도 `openContentCard` state) — 기존 상품 상세 흐름 무변경.

## 5. product_list 와 공존 (§5.3·§5.4)
- content_list(코너 콘텐츠) 섹션과 product_list(상품 그리드)를 **분리 렌더**.
- **product 0건 + content 있음** → 상품 empty-state 카드 **미표시**(`contentCards.length>0 ? null : emptyCard`). 콘텐츠 카드가 화면을 채워 실사용 가능.
- product 0건 + content 0건 → 기존 empty-state 유지.
- product 있음 → 콘텐츠 섹션 위, 상품 그리드 아래 그대로.

## 6. items=[] 처리 (§5.1)
- **채택: content_list items 가 0이면 섹션 자체를 숨김**(`contentCards.length>0` 일 때만 렌더). 빈 섹션 라벨 미표시.

## 7. 템플릿 영향 (§6)
- 주 대상 `corner_information_basic_v1` 렌더 확인.
- `product_focus`: content_list 는 browse 공통 경로에서 렌더되며 별도 분기 없음 → 있어도 깨지지 않음. **product_focus 리팩터/템플릿 whitelist/신규 templateKey 변경 없음.**

## 8. 공유 패키지 안전
- `TabletContentCard` additive. `fetchScreen` 은 **KPA 만 주입** → GP/KCos 는 `screen=null` → `contentCards=[]` → content 섹션 미표시. **동작 변경 없음.**

## 9. 테스트 / 검증

### 9.1 typecheck / build
- `@o4o/tablet-kiosk-core` `tsc --noEmit`: **0**.
- 소비처 `web-kpa-society` / `web-glycopharm` / `web-k-cosmetics` `tsc --noEmit`: **전부 0**.
- 패키지에 **React 테스트 하니스 없음**(jest/vitest·테스트 파일·testing-library 전무) → 단위 테스트 대신 **Playwright fixture 렌더 검증**(§9.2, WO §9.1 "가능하면"·§10 "로컬 fixture" 허용).

### 9.2 fixture 주입 render smoke (배포 후, 운영 데이터 무변경)
Playwright 로 `/tablet/screen` 응답을 **가로채 content_list section 주입**(운영 샘플 block write 0):
- 카드 2개(o4o `hasDetail=true` + store `hasDetail=false`) 주입.
- **결과**: `코너 콘텐츠` 섹션 렌더 ✓ / 카드 2종(O4O 표준·매장 제작 배지, 제목·요약·관련상품) ✓ / detail 카드에만 `자세히 보기 ›` ✓ / product 0건 empty-state 미표시 ✓.
- 카드 클릭 → **상세 모달**: ContentRenderer 가 `<h3>사용법</h3>` / `<p>…상완부에 부착…</p>` / `<li>…부착 위치를 바꾸세요</li>` 렌더 ✓.
- 스크린샷: `content-list-cards.png`, `content-list-detail-modal.png`(scratchpad/tablet-content-list/).

## 10. production read-only smoke (기존 샘플 불변)
- 배포: web deploy run 29220371562 **success**.
- 피부관리 viewer(실 샘플, content_list block 없음): 제목/코너 안내/QR 정상, **"코너 콘텐츠" 섹션 미표시**(hasContentSection=false) → 기존 동작 그대로.
- 콘솔 error = auth/me·auth/refresh 401(비로그인 공개 viewer 노이즈)만 — 태블릿 렌더 무관.
- `/tablet/screen`·`/idle`·`/products` 200(선행 CHECK 에서 확인, 이번 배포에서도 응답 계약 불변).
- **운영 샘플/block DB write 0.**

## 11. 완료 기준 대비
| 기준 | 상태 |
|------|------|
| viewer content_list section 렌더 | ✅ |
| 카드 목록 표시 | ✅ (배지/제목/요약/관련상품/자세히보기) |
| detail.html 안전 렌더 | ✅ (ContentRenderer/DOMPurify) |
| product 0 + content 조합 | ✅ (empty-state 미표시) |
| 기존 basic 화면 불변/자연확장 | ✅ |
| product_focus 회귀 없음 | ✅ (분기 무변경) |
| 운영 샘플 write 0 | ✅ |
| typecheck/build/test | ✅ (typecheck 4, fixture 렌더) |
| 배포 후 기존 샘플 smoke | ✅ |
| CHECK commit/push | ✅ |

## 12. 후속 WO
```
WO-O4O-KPA-TABLET-CONTENT-LIST-PICKER-UI-V1        ← 관리 편집기 picker(콘텐츠 선택)
WO-O4O-KPA-TABLET-V1-USABLE-CORNER-CONTENT-SEED-V1 ← 재개 조건 충족(viewer 렌더 완료)
```
**seed 재개 조건(content_list viewer 렌더)은 이번 WO 로 충족.** 남은 선행 = picker(또는 최소 config 주입 경로). picker 완료 후 seed 재개 권장(현재는 config 직접 주입으로도 주입 가능하나 운영 UX 상 picker 우선).

---

## 13. write 여부
```
DB write 0 · API/서버 resolve/migration 무변경 · 운영 샘플/block 무변경
프론트(shared 패키지) 렌더만 추가 · 배포는 web-kpa-society
```

---

*content_list viewer runtime · "코너 콘텐츠" 카드 섹션(product_list 분리) + 상세 모달(ContentRenderer/DOMPurify) · product 0+content 시 empty-state 미표시 · TabletContentCard additive, GP/KCos 무영향 · typecheck 0(패키지+3소비처) · 배포 success · 기존 샘플 non-regression(코너 콘텐츠 미표시) · fixture 주입 render smoke PASS(카드 2종+상세 모달 h3/p/li) · 운영 write 0 · seed 재개 조건 충족.*
