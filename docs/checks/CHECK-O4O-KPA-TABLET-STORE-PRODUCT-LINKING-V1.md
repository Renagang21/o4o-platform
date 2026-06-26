# CHECK-O4O-KPA-TABLET-STORE-PRODUCT-LINKING-V1

> WO-O4O-KPA-TABLET-STORE-PRODUCT-LINKING-V1 실행 결과
> 실행일: 2026-06-26 · 대상: 프로덕션 `https://kpa-society.co.kr`
> 선행 IR: IR-O4O-KPA-TABLET-CONFIGURATION-CURRENT-STATE-AUDIT-V1
> 구현 커밋: `453880358` (frontend, KPA 단일 파일) — Web Cloud Run 배포

## 1. 작업 배경 / 선행 IR 요약

- 선행 조사: `타블렛 구성`(`/store/commerce/tablet-displays`)은 실기능이며, 진열 "공급 상품" 풀과 `/store/my-products`(내 매장 제품)이 **데이터상 동일 `organization_product_listings`를 공유**하나 **UI 연결이 없어** 사용자가 흐름을 이해하기 어려움.
- 본 작업: 데이터 구조 변경 없이 **문구/내비게이션으로 "내 매장 제품 → 타블렛 진열" 연결을 명시**.

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` | 문구·내비만 (35+/10-). 데이터 로직·API·DB **무변경** |

## 3. 변경 전 → 후 (문구)

| 위치 | 전 | 후 |
|---|---|---|
| 헤더 설명 | "태블릿에 표시할 상품을 구성합니다. 공급 상품과 자체 상품을 혼합할 수 있습니다." | "내 매장 제품에 등록된 제품을 타블렛별로 선택해 진열합니다. 타블렛은 주문 채널이 아니라 매장 내 제품 안내·상담 유도 화면입니다." |
| 상품 풀 제목 | "상품 풀" | "진열할 제품 선택" + **'내 매장 제품 관리 →'** 버튼(/store/my-products) + 안내("내 매장 제품에 등록된 제품을 선택해 이 타블렛에 진열합니다.") |
| 풀 탭 | 공급 상품 / 자체 상품 | **내 매장 제품** / **매장 자체 제품** |
| 풀 항목 배지 | 공급 / 자체 | 내 매장 / 자체 |
| 풀 빈 상태(내 매장 제품) | "추가 가능한 공급 상품이 없습니다." | "타블렛에 진열할 내 매장 제품이 없습니다. 내 매장 제품을 먼저 등록한 뒤 타블렛에 배치해 주세요." + **'내 매장 제품 등록'** 버튼(/store/my-products) |
| 진열 섹션 빈 상태 | "진열할 상품이 없습니다. 왼쪽 상품 풀에서 추가하세요." | "이 타블렛에 진열된 제품이 없습니다. 왼쪽에서 제품을 선택해 추가하세요." |

## 4. 내 매장 제품 연결 방식

- **내비**: 상품 풀 헤더 '내 매장 제품 관리 →' + 풀 빈 상태 '내 매장 제품 등록' → 둘 다 `navigate('/store/my-products')` 내부 이동.
- **문구**: "내 매장 제품에 등록된 제품을 선택해 타블렛에 진열" 개념을 헤더·풀 안내·탭 라벨로 일관 노출.
- **데이터 의미 보존**: 내부적으로 supplier(=organization_product_listings, 내 매장 제품) / local(=store_local_products, 매장 자체 제품) 구분은 유지(라벨만 사용자 친화적으로 매핑).

## 5. 데이터 구조 변경 없음 확인

- `poolTab('supplier'|'local')`, `fetchProductPool`, `saveTabletDisplays`, `store_tablet_displays`(product_type/product_id/sort_order/is_visible), `organization_product_listings`, `store_local_products` **모두 불변**. label mapping만 프론트에서 조정.

## 6. 온라인 판매 비영향 확인

- 변경은 `StoreTabletDisplaysPage.tsx` 1개 파일. 온라인 판매(판매 설정/상품/주문 관리/주문 알림) 파일·route·타입 **무변경**. "주문/구매/결제/장바구니/온라인 판매/주문 가능 상품" 사용자 노출 문구 없음.

## 7. 테스트/빌드/smoke

| 검증 | 결과 |
|---|---|
| `web-kpa-society` tsc | ✅ error 0 |
| 배포 (Web Cloud Run, 453880358) | ✅ success |
| 10.1 `/store/commerce/tablet-displays` 진입·기존 기능 유지 | ✅ PASS — 태블릿 목록(1건 "화장품 코너/A-1 섹터")·태블릿 추가·Idle 재생목록 정상 렌더 |
| 10.2 내 매장 제품 연결(안내+버튼→/store/my-products) | ✅ PASS — 헤더/풀 안내 + '내 매장 제품 관리 →' 버튼 클릭 시 `/store/my-products` 이동 시작(콘솔 `GET /store/products?page=1&limit=20` = my-products 데이터 호출 실측) |
| 10.3 picker 문구 내 매장 제품 기준 / 주문·판매 오해 없음 | ✅ PASS — 탭 "내 매장 제품 (0) / 매장 자체 제품 (0)", 헤더 "타블렛은 주문 채널이 아니라…". 주문/판매 문구 없음 |
| 10.4 빈 상태 안내 + /store/my-products 이동 | ✅ PASS — "타블렛에 진열할 내 매장 제품이 없습니다…" + '내 매장 제품 등록' 버튼 노출 |
| 10.5 기존 기능 회귀 | ✅ PASS — 등록/삭제/목록/Idle UI 유지(데이터 로직 불변) |
| 10.6 온라인 판매 무변경 | ✅ (git diff 단일 파일, 문구/내비만) |

> 브라우저 smoke 실측(배포본 453880358, 2026-06-26): 위 항목 모두 PASS. '내 매장 제품 관리 →' 클릭 시 `/store/my-products` 데이터 API가 호출됨(라우팅 동작 확인). 검증 도중 인증 세션 토큰 만료로 /login 바운스가 1회 있었으나 **라우팅 결함 아닌 환경적 토큰 만료**.

## 8. 남은 후속 작업

- **WO-O4O-KPA-TABLET-DISPLAY-SETTINGS-V1**: 전시 설정(가격/QR/상담버튼/자동넘김) 내부 탭 신규.
- **WO-O4O-KPA-TABLET-PREVIEW-V1**: 기기별 고객 화면 미리보기.
- (장기) device-scoped 공개 뷰(위치별 진열 분리).
- 선택 시 타블렛 진열 상품을 내 매장 제품 상세와 동기화(현재는 풀 picker 선택만).

## 결론

데이터/API/DB 변경 없이 `타블렛 구성` 화면에서 **내 매장 제품 → 타블렛 진열** 연결을 문구·내비로 명시. 탭/배지/빈상태를 내 매장 제품 기준으로 정리하고 `/store/my-products` 바로가기 추가. 타블렛이 주문/온라인 판매 채널로 오해되지 않도록 헤더 명시. 온라인 판매 무영향, tsc 통과.
