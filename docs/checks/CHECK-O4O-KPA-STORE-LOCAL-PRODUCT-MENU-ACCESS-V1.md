# CHECK-O4O-KPA-STORE-LOCAL-PRODUCT-MENU-ACCESS-V1

> WO-O4O-KPA-STORE-LOCAL-PRODUCT-MENU-ACCESS-V1 실행 결과
> 실행일: 2026-06-26 · 대상: 프로덕션 `https://kpa-society.co.kr`
> 선행 IR: IR-O4O-KPA-STORE-LOCAL-PRODUCT-CREATE-VALIDATION-AUDIT-V1
> 구현 커밋: `797eb3937` (frontend, KPA — 메뉴/링크/문구) — Web Cloud Run 배포 success

## 1. 작업 배경 / 선행 IR 요약

- 선행 IR: KPA 자체 제품 **생성 API·화면은 이미 정상**(`/store/commerce/local-products`, `StoreLocalProductsPage`)이나, **KPA 사이드바에 접근 메뉴가 없어** 사용자가 도달 불가(GP/KCos 는 '자체 상품' 메뉴 보유). 타블렛 picker/내 매장 제품 링크는 listings 로만 연결.
- 본 작업: **기존 화면을 KPA 메뉴·타블렛 흐름에서 접근 가능하게** 동선만 추가. 신규 API/DB 없음.

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | **KPA 블록 '타블렛' 그룹**에 `매장 자체 제품`(/commerce/local-products) 추가 |
| `services/web-kpa-society/.../StoreTabletDisplaysPage.tsx` | '매장 자체 제품' 탭 빈 상태에 **'매장 자체 제품 등록'** 버튼(→/commerce/local-products) |
| `services/web-kpa-society/.../StoreLocalProductsPage.tsx` | 제목 '매장 취급 상품' → **'매장 자체 제품'**(메뉴 정합) + 타블렛 활용 안내 문구 |

- DB/API/store_local_products/online sales **무변경**.

## 3. KPA 메뉴 변경 (후)

```
타블렛
  - 내 매장 제품      /my-products              (O4O 제품 기반 listing)
  - 매장 자체 제품     /commerce/local-products  ← 추가(기존 route 재사용)
  - 타블렛 구성        /commerce/tablet-displays
```

- 순서: 내 매장 제품 → 매장 자체 제품 → 타블렛 구성(§8.2).
- '매장 자체 제품' = O4O 무관 약국 직접 등록 제품(전시·안내용). '내 매장 제품'(O4O 기반)과 의미 구분(§8.5).

## 4. 기존 route 재사용 확인

- `/store/commerce/local-products` 라우트는 `App.tsx:1003` 에 이미 마운트(`StoreLocalProductsPage`). 신규 라우트/페이지 없음 → **데드링크 0**.

## 5. 타블렛 구성 연결

- `타블렛 구성`의 '매장 자체 제품' 탭이 비어 있을 때 안내 + **'매장 자체 제품 등록'** 버튼 → `/store/commerce/local-products` 이동. (공급 상품 탭의 '내 매장 제품 등록' 과 동일 패턴)
- 생성한 자체 제품은 `is_active=true` 기본 → 타블렛 product-pool('매장 자체 제품')에 노출 → 진열 추가 가능(선행 IR §8).

## 6. GP/KCos 비영향

- 메뉴 변경은 **KPA 블록 한정**. GP/KCos 의 '자체 상품'(`/commerce/local-products`) 메뉴·route 무변경(`storeMenuConfig.ts` 별도 블록).
- 문구 변경은 **KPA 전용 `StoreLocalProductsPage`**(services/web-kpa-society) — 공유 `StoreLocalProductsManager` 미변경 → GP/KCos 화면 동일. KCos tsc exit 0.

## 7. 온라인 판매 비영향

- 변경 파일에 온라인 판매(판매 설정/상품/주문 관리/주문 알림) 없음. 주문/결제/장바구니 문구 미사용.

## 8. 테스트 / 빌드 / smoke

| 검증 | 결과 |
|---|---|
| `web-kpa-society` tsc (본 변경 파일) | ✅ error 0 (잔여 1건은 동시 세션 `ContentPdfExportModal.tsx`, 본 WO 무관) |
| `web-k-cosmetics` tsc | ✅ error 0 |
| 배포 (Web Cloud Run, 797eb3937) | ✅ success |
| 9.6 GP/KCos 비영향 | ✅ (KPA 블록/KPA 파일 한정) |
| 9.7 온라인 판매 비영향 | ✅ (git diff) |
| 9.1 메뉴 노출/이동 · 9.2 화면 진입 · 9.3 생성 smoke · 9.4 타블렛 연결 · 9.5 회귀 | ⬜ **보류** — Playwright 영속 프로필이 다른 Chrome 세션에 재점유되어 launch 실패. route 재사용·문구 변경이라 회귀 위험 낮음. 프로필 해제 후 재검증 |

## 9. 남은 후속 작업

- **브라우저 재검증**(프로필 해제 후): 메뉴 '매장 자체 제품' 노출/이동, 화면 진입, 숫자 가격으로 생성 smoke(SMOKE_ 마커 후 삭제), 타블렛 product-pool 노출 + 진열 추가.
- **자동 넘김 시각 재검증**(WO-O4O-KPA-TABLET-BROWSE-AUTO-SLIDE-V1): 자체 제품 2개+ 진열 후 공개 Browse 자동 순환 확인 — **본 WO 로 동선 확보됨**.
- WO-O4O-KPA-TABLET-PREVIEW-V1 (기기별 미리보기).
- WO-O4O-KPA-STORE-LOCAL-PRODUCT-PRICE-INPUT-HARDENING-V1 (priceDisplay 비숫자 → 400/정제).

## 결론

기존 `/store/commerce/local-products` 화면을 KPA '타블렛' 그룹 메뉴 + 타블렛 구성 빈 상태 링크로 노출하고, KPA 전용 페이지 제목을 '매장 자체 제품'으로 정합. 신규 API/DB 없음, GP/KCos·온라인 판매 무영향, tsc·배포 통과. 브라우저 시각 smoke 만 로컬 프로필 점유로 보류 — 이 동선 확보로 타블렛 테스트 데이터/자동 넘김 시각 재검증이 가능해짐.
