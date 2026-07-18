# CHECK-O4O-KPA-TABLET-NEW-SCREEN-INITIAL-PREVIEW-CONTEXT-FIX-V1

> WO: `WO-O4O-KPA-TABLET-NEW-SCREEN-INITIAL-PREVIEW-CONTEXT-FIX-V1`
> 대상: KPA 태블릿 `새 콘텐츠 만들기 → 1. 템플릿` 우측 `실제 화면 미리보기` 초기 문맥
> 상태: 코드 수정 + 정적 검증 완료 / 프로덕션 브라우저 검증 대기(배포 후)

---

## 1. 원인 (조사 결과)

### 신규 제작 초기화 경로
- 제작기 = [`TabletScreenSetManager.tsx`](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx) 내부 `TabletContentStepBuilder`.
- 신규(`initialDetail=null`): `blocks = ensureAutoBlocks(seedInitialBlocks(null))` → `seedInitialBlocks(null)=[]` → `ensureAutoBlocks` 가 `AUTO_BLOCK_TYPES`(idle_media / corner_description / content_list / **product_list** / qr_guide) 전부 자동 추가.
- 신규·수정 구분 기준 = `isEdit = !!initialDetail`.
- 초기 `templateKey` = `initialDetail?.templateKey ?? DEFAULT_TEMPLATE_KEY('corner_information_basic_v1')`.

### 실제 매장 데이터가 주입된 위치 (**단일 원인**)
- 우측 미리보기는 `previewScreenSet({templateKey, blocks})`(POST `/screen-sets/preview`) 결과를 `previewScreen` 으로 kiosk 렌더러 [`TabletKioskPage`](../../packages/tablet-kiosk-core/src/TabletKioskPage.tsx) 에 주입.
- **서버 draft preview 핸들러**([`store-tablet.routes.ts`](../../apps/api-server/src/routes/platform/store-tablet.routes.ts) `POST /screen-sets/preview`)는:
  - `product_list` → **sections 에서 이미 생략**(`continue`). 서버는 상품을 안 내림.
  - `content_list` → `resolveContentListItems(org, config)` 로 resolve하지만, **명시적으로 선택된 `config.items` 만** 반환 → 신규 세트 기본 config `{items: []}` → **빈 배열**(실제 콘텐츠 아님).
  - `corner_description` 기본 `{title:'', body:''}` → 빈 값.
  - `idle_media` 기본 `legacy_idle_playlist` → draft 경로에서 빈 소스.
- **따라서 신규 세트 미리보기에서 실제 매장 데이터의 유일한 출처 = kiosk 렌더러가 `previewScreen` 유무와 무관하게 항상 호출하던 `api.fetchProducts(slug, {limit:50})`** (`TabletKioskPage` 상품 로드 effect). 이 결과가:
  - 헤더 `cornerInfo?.title || '매장 상품 안내'` 로 표시(코너 제목 없음 → "매장 상품 안내" 폴백),
  - 실제 매장 상품명·가격·이미지 그리드,
  - 로컬 상품 `자체` 배지(`styles.localBadge`),
  - 로 렌더되어 "기존 매장 콘텐츠처럼" 보이던 것.

### 코너·태블릿 fallback
- **draft 미리보기에는 코너/태블릿 fallback 이 없다.** `fetchProducts(slug)` 는 매장(store) 전체 진열 상품을 반환할 뿐, "첫 코너/첫 태블릿" 을 조용히 선택하지 않는다. 즉 미리보기는 **특정 코너 상품이 아니라 매장 전체 상품**을 (라벨 없이) 보여주고 있었음 → §5.3 "임의 코너 조용히 선택 금지" 정신에 부합하지 않는 무-문맥 표시.
- (참고: 저장된 Screen Set 공개 resolve [`store-public-screen-set-resolve.ts`](../../apps/api-server/src/routes/platform/store-public/store-public-screen-set-resolve.ts) 는 `current_screen_set_id` 로 적용 코너 태블릿을 도출 — 이는 **공개 화면 경로**이며 빌더 draft 미리보기와 무관. 이 경로는 미변경.)

### 깨진 이미지 원인
- `TabletKioskPage` 상품 카드 `<img src={p.imageUrl} alt={p.name}>` 및 상세 모달 `<img>` 에 **`onError` 미처리** → 잘못된/만료 URL 이면 브라우저 기본 깨진 아이콘 + `alt`(상품명) 텍스트 노출.
- content_list 카드 이미지는 resolver 가 `thumbnailUrl: null` 고정 → 실제로 렌더되지 않음(깨진 이미지는 상품 이미지에 한정).
- 원천 데이터(잘못 저장된 URL)는 이번 WO에서 수정하지 않음(렌더 안전 대체만).

---

## 2. 수정

### 변경 파일
1. [`packages/tablet-kiosk-core/src/TabletKioskPage.tsx`](../../packages/tablet-kiosk-core/src/TabletKioskPage.tsx)
2. [`services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx`](../../services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx)

> 서버·DB·마이그레이션 변경 없음. 새 미리보기 시스템·새 템플릿 없음.

### 신규·수정 모드 구분 / layout preview 처리
- kiosk 렌더러에 **`previewLayoutOnly?: boolean`**(opt-in, 기본 false) 추가.
  - true → **`api.fetchProducts` 호출 안 함**(실제 상품 0). 상품 영역은 템플릿 배치(grid/gridFocus)를 유지한 **중립 골격**("상품 영역" 회색 점선 카드)으로 렌더.
  - 헤더 코너 제목 폴백을 "매장 상품 안내" → **중립 placeholder "코너 제목"** 으로(코너 제목 없을 때만; 사용자가 입력하면 그 값 반영).
  - "궁금한 상품을 터치해…" 힌트는 layout 모드에서 숨김.
  - 코너 제목/본문·대기 영상 등 **사용자 입력 block 은 `previewScreen` sections 로 그대로 반영**(단계별 반영 유지).
- 빌더는 **live 미리보기 4개 인스턴스(태블릿/모바일 × 인라인/모달) 모두 `previewLayoutOnly`** 전달.
  - **판단**: Screen Set 은 코너와 독립된 원본(§3.1)이고, 빌더 draft 미리보기는 신규·수정 **어느 쪽도 명시적 코너 문맥이 없다**(수정 모드도 `fetchProducts(slug)` = 매장 전체 상품이지 적용 코너 상품이 아님). 완료기준 7·8("실제 상품은 명시적 코너 문맥이 있을 때만" / "상품 기준 코너 명확 표시")은 전역 게이트이므로 **수정 모드 미리보기도 layout-only** 로 통일. 실제 코너 상품은 **공개 태블릿/QR 화면에서만** 표시(미변경).
  - §7 "수정 모드 퇴행 금지" 는 "실제 적용 코너 문맥이 **명확한 경우** 상품 표시" 를 요구 — 빌더 미리보기는 그 경우가 아니므로(원래도 적용 코너 상품을 보여준 적 없음) 퇴행이 아님.

### 실제 코너 상품 표시 조건
- 빌더 미리보기: 표시 안 함(중립 골격) — 코너 문맥 없음.
- 공개 태블릿/QR: 기존대로 적용 코너(`current_screen_set_id`) 진열 상품 표시 — 미변경.

### 이미지 실패 처리 (§8)
- 공통 `ProductImage` 컴포넌트 신설(미리보기·공개 태블릿·QR 공통): 빈/공백 URL 또는 `onError` 1회 → **'이미지 없음' 골격(📦)** 전환. 깨진 아이콘·긴 alt·무한 재시도 방지.
- 상품 카드 + 상품 상세 모달 이미지 양쪽 적용.

### 안내 문구
- 인라인 미리보기 하단 캡션을 §9 권장 문구로 교체(기술 용어 DB/resolver/payload 제거):
  > 템플릿의 화면 배치를 미리 보여드립니다. 상품은 이 콘텐츠를 적용한 코너의 진열 상품으로 표시됩니다. 저장 전 미리보기이며, 실제 태블릿에서는 화면 크기·방향에 따라 달라질 수 있습니다.

---

## 3. 데이터 계약

| 항목 | 내용 |
|------|------|
| 신규 초기 preview payload | `previewScreenSet({templateKey, blocks})` — **변경 없음**(기존 계약). 상품은 payload 에 포함 안 됨. |
| 코너 문맥 포함 payload | **없음**(빌더에서 코너 문맥 미도입 — §11 "코너 자동 선택 금지" 준수). |
| Screen Set 저장 payload | `createScreenSet`/`updateScreenSet` + `saveScreenSetBlocks(blocks)` — **변경 없음**. |
| 상품 복사 저장 여부 | **없음** — 상품은 Screen Set blocks/config 에 복사·저장되지 않음(`product_list` config = `{source:'legacy_tablet_displays'}` 참조만). |

---

## 4. 검증

| 항목 | 결과 |
|------|------|
| typecheck (web-kpa-society) | ✅ `tsc --noEmit` EXIT 0 |
| typecheck (web-k-cosmetics, 공유 소비처) | ✅ EXIT 0 (additive prop, 기존 동작 불변) |
| web production build | ✅ `npm run build` (tsc && vite build) `✓ built in 18.05s`, EXIT 0 (chunk-size 경고는 기존) |
| 템플릿 5종 | ⏳ 브라우저(배포 후) — 코드상 `templateKey` 가 previewScreen 기반이라 즉시 반영, grid/gridFocus/hideProductsBody/hero placeholder 로 배치 차이 유지 |
| 신규 첫 화면 | ⏳ 브라우저(배포 후) |
| 입력 반영 | ⏳ 브라우저(배포 후) |
| 편집기 서식 | ⏳ 브라우저(배포 후) |
| QR 모바일 | ⏳ 브라우저 — `stripIdleForMobilePreview` + 서버 idle 생략으로 대기영상 미표시(기존), layout 골격 적용 |
| 코너 상품 | ⏳ 브라우저 — 빌더=상품 0(골격), 공개 화면=적용 코너 상품(미변경) |
| 이미지 실패 | ⏳ 브라우저 — `ProductImage onError` → 📦 |
| 수정 모드 | ⏳ 브라우저 — hydrate/저장/재진입 미변경, 미리보기만 layout 골격 |
| 저장·재진입 | ⏳ 브라우저(배포 후) |
| console/pageerror/API | ⏳ 브라우저(배포 후) |

> 정적 분석·typecheck·build 완료. 브라우저 검증은 프로덕션(kpa-society.co.kr) 배포 후 수행 예정.

---

## 5. 보호 확인

| 항목 | 상태 |
|------|------|
| 구강관리 샘플(tablet `c86863d8…`, set `7280872e…`) | 변경 없음(코드만 수정, 데이터 write 0) |
| 피부관리 샘플(tablet `f8b78a16…`, set `8c6eb9fe…`) | 변경 없음 |
| current(적용 세트) | 변경 없음 |
| 공개 QR slug | 변경 없음 |
| DB migration | **없음** |
| 데이터 write 범위 | **없음**(read-only 조사 + 프론트/렌더러 코드 수정만) |

---

## 6. 결정·후속 메모

- **결정**: 빌더 draft 미리보기는 신규·수정 공통으로 layout-only(상품 골격). 근거는 §2 "신규·수정 모드 구분" 참조. 만약 수정 모드에서 매장 상품 미리보기를 유지하길 원하면 `previewLayoutOnly={!isEdit}` 로 신규-only 로 좁힐 수 있으나, 그 경우 수정 미리보기는 무-라벨 매장 전체 상품을 계속 노출(완료기준 7·8 미충족)하게 됨.
- **원천 데이터 이슈**: 잘못 저장된 상품 이미지 URL 은 렌더러에서 안전 대체만 적용, DB 수정 없음(§8). 실제 깨진 URL 이 관측되면 별도 WO(데이터 정정)로 분리.
- 대기 영상형(`idle_touch_video`)은 영상 URL 미입력 시 기존 `heroPlaceholder`(다크 영상영역 + 터치 안내 + QR chip)로 중립 표시 → §6.3 충족. URL 입력 시 hero 에 반영(기존 계약).
