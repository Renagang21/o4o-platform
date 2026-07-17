# CHECK-O4O-KPA-TABLET-PREVIEW-CORNER-CONTEXT-AND-LABEL-FIX-V1

> WO: `WO-O4O-KPA-TABLET-PREVIEW-CORNER-CONTEXT-AND-LABEL-FIX-V1`
> 성격: 프론트 — 미리보기 코너 상품 문맥 + 코너 라벨 정정.
> Date: 2026-07-16

---

## 0. 결론

**PASS.** 코너에서 여는 미리보기가 **그 코너의 실제 진열 상품**을 보여주도록(공개 화면과 동일 resolve) 고쳤고, 콘텐츠 리스트 단독 미리보기는 **코너를 임의 추정하지 않고**(상품 미표시) Screen Set 원본 기준으로 렌더한다. 리스트의 코너 라벨을 **'현재 적용 코너'**로 정정. **백엔드/DB 무변경**(기존 `/tablet/products` 의 tabletId 경로 재사용).

## 1. 미리보기 코너 컨텍스트 (프론트만)

미리보기 상품은 `previewScreenSet`(sections)이 아니라 **kiosk 의 `previewApi.fetchProducts`** 가 담당한다(서버가 product_list 를 sections 에서 제외하고 `/tablet/products` 로 별도 노출).

| 진입 | 코너 문맥 | 상품 resolve |
|------|-----------|--------------|
| 코너 관리 `현재 화면 보기` | 그 코너 `tabletId` | 공개 `/tablet/products?tabletId=` → `disp.tablet_id` 필터 → 실제 코너 진열 |
| 코너 연결 행 미리보기 | 그 코너 `tabletId` | 동일 |
| 콘텐츠 리스트 단독 미리보기 | **없음**(`PREVIEW_NO_CORNER`) | `fetchProducts` 가 백엔드 호출 없이 **빈 상품** 반환(코너 임의 추정 금지) |

구현: `previewTabletIdRef` + `setPreviewContext(tabletId)` prop 을 패널/리스트에 전달 → 모달 열기 직전 문맥 지정. `previewApi.fetchProducts` 가 sentinel 이면 즉시 빈 배열 반환, 아니면 tabletId 를 붙여 **공개와 동일 엔드포인트** 호출.

> 공개 태블릿 화면과 **동일한 상품 resolve 경로**(`resolveTabletDisplaySource` → `store_tablet_displays`)를 재사용 → 실패 기준 "서로 다른 로직 사용" 회피.

## 2. 라벨 정정 (`TabletContentLibraryList`)

`usageBySet` 은 **현재 화면으로 적용된** 코너만 담는다(연결만은 미포함). 라벨을 의미에 맞게:

| 이전 | 이후 |
|------|------|
| 컬럼 `사용 중인 코너` | **`현재 적용 코너`** |
| 빈 값 `—` | **`현재 미적용`** (tooltip: "연결만 되어 있을 수 있음") |
| 코너 필터 `미사용` | **`현재 미적용`** |
| 코너 필터 `코너 전체` | **`현재 적용 코너 전체`** |

## 3. 실패 기준 대비 (배포본 실측)

| 실패 기준 | 결과 |
|-----------|:----:|
| 코너 미리보기에 실제 코너와 다른 상품 | ✅ 해소 — 피부=후시딘/비판텐/마데카솔, 구강=케어가글액 3향 |
| `사용 중인 코너`/`미사용` 문구 잔존 | ✅ 없음 (`사용 중인 코너` th 0건) |
| 리스트 단독이 코너 임의 추정 | ✅ 상품 `[]` (추정 없음) |
| 공개 화면과 미리보기 상품 로직 상이 | ✅ 동일 `/tablet/products` + `disp.tablet_id` |

## 4. 검증

| 항목 | 결과 |
|------|------|
| 피부 `현재 화면 보기` 상품 | ✅ 후시딘/비판텐/마데카솔 (피부 3) |
| 구강 상품 문맥 | ✅ 구강 `제품 진열형` 행 미리보기 → 케어가글액 박하/사과/유칼립투스 (구강 3) |
| (구강 `현재 화면 보기`) | 상품 `[]` — 현재 세트가 코너 소개형(corner_overview_qr)이라 **설계상 제품 그리드 미표시**(문맥 버그 아님) |
| 리스트 단독 미리보기 | ✅ 상품 `[]` (Screen Set 원본) |
| 컬럼 `현재 적용 코너` / 필터 `현재 미적용` | ✅ |
| 검색·필터·페이지 상태 유지 | ✅ |
| console/pageerror/API 4xx·5xx | ✅ 0 |
| tsc / vite build (web) | ✅ EXIT=0 |
| API·DB 변경 | 없음(기존 엔드포인트 재사용) |

## 5. 하지 않은 것

코너×콘텐츠 연결 모델 / 현재 적용 로직 / Screen Set 저장 구조 / QR 계약 / DB migration / 템플릿 디자인 — **무변경**.

> 참고: `현재 화면 보기`는 코너의 **현재 세트**를 렌더하므로, 그 세트가 코너 소개형이면 제품 그리드가 없다(상품 문맥과 별개 — 템플릿 설계). 제품형 세트로 전환하거나 제품형 세트를 행 미리보기하면 코너 상품이 보인다.

---

*코너 미리보기 = 그 코너 tabletId → 공개와 동일 /tablet/products resolve(실제 진열 상품). 리스트 단독 = PREVIEW_NO_CORNER → 상품 미표시(임의 추정 금지). 라벨 '사용 중인 코너'→'현재 적용 코너', '미사용'→'현재 미적용'. 백엔드/DB 무변경. 실측 피부3·구강3·단독0·라벨·오류0.*
