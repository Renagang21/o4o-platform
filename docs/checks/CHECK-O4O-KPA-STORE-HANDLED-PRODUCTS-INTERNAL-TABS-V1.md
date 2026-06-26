# CHECK-O4O-KPA-STORE-HANDLED-PRODUCTS-INTERNAL-TABS-V1

> WO: WO-O4O-KPA-STORE-HANDLED-PRODUCTS-INTERNAL-TABS-V1
> 선행: WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1 / IR-...-UNIFIED-VIEW-DESIGN-V1
> 범위: KPA 한정. 프론트(메뉴 config + 화면) 전용. route/page/API/DB 무변경.

## 1. 변경 배경

매장 취급제품 통합 조회 뷰(V1) 도입 후, '내 매장 제품'·'매장 자체 제품' 사이드바 독립 메뉴는 중복 노출이 된다. 제품 관리 중심을 '매장 취급제품'으로 고정하고, 두 메뉴는 화면 내부 동선(출처 탭 + 관리 버튼)으로 흡수한다. **기능 삭제 아님 — 메뉴 노출만 정리**.

## 2. 선행 V1 요약

`/store/handled-products` = listings(O4O 취급) + local(매장 자체) 통합 조회(read-only). 출처 탭(전체/O4O 취급/매장 자체) 이미 존재. local 온라인몰=미지원 불변식.

## 3. 변경 전 메뉴 구조

```
약국 상품·거래: O4O 제품 · 매장 취급제품 · 내 매장 제품 · 매장 자체 제품 · 발주 내역 · 신청·승인 현황
```

## 4. 변경 후 메뉴 구조

```
약국 상품·거래: O4O 제품 · 매장 취급제품 · 발주 내역 · 신청·승인 현황
```

## 5. 제거된 사이드바 메뉴

- `내 매장 제품`(/my-products) — 사이드바 항목 제거
- `매장 자체 제품`(/commerce/local-products) — 사이드바 항목 제거
- storeMenuConfig KPA 블록만. GP/KCos 무변경. MenuKey=free string → 타입 무변경.

## 6. 유지되는 route (데드링크 0)

- `/store/my-products` ✅ 유지 (App.tsx route 무변경)
- `/store/commerce/local-products` ✅ 유지
- `/store/handled-products` ✅ 유지
- 직접 URL 접근 + 매장 취급제품 화면의 관리 버튼/상단 버튼으로 접근.

## 7. 매장 취급제품 내부 탭 구조 (보강)

- 출처 탭: 전체 / O4O 취급 제품(source=listing) / 매장 자체 제품(source=local) — 탭 전환 시 page=1 reset.
- **URL query sync**: `?source=listing|local`(전체는 param 제거), replace. 딥링크/뒤로가기 지원.
- **상단 관리 버튼 신규**: `O4O 제품 신청`→/store/commerce/products, `매장 자체 제품 등록`→/store/commerce/local-products (사이드바 메뉴 제거 보완 진입점).
- **행 관리 버튼**: managePath(/my-products?highlight= · /commerce/local-products?highlight=) 유지.
- **탭별 빈 상태 문구** 구분(전체/listing/local).

## 8. 온라인몰 미지원 불변식 확인

- 백엔드 무변경. `sourceType=local` → onlineSalesExposure=`not_supported` → "미지원" 배지 유지. 이번 변경은 메뉴/탭/버튼 UI만 → 불변식 영향 없음.

## 9. GP/KCos 무영향 확인

- storeMenuConfig KPA 블록만 수정(GP/KCos 별도 객체 무변경). 화면/route는 web-kpa-society 한정.

## 10. DB/migration 없음 확인

- DB/migration/백엔드 데이터 모델 변경 없음. handledProducts API 무변경(기존 source filter 재사용).

## 11. typecheck 결과

| 패키지 | 결과 |
|---|---|
| `packages/store-ui-core` tsc | ✅ PASS |
| `services/web-kpa-society` tsc | ✅ PASS |

## 12. browser smoke 결과

✅ PASS (2026-06-26, KPA `테스트 약국 매장`, 배포본 3324d3d2f web deploy success).

| 항목 | 결과 |
|---|---|
| 약국 상품·거래 = O4O 제품 · 매장 취급제품 · 발주 내역 · 신청·승인 현황 | ✅ |
| 사이드바에 '내 매장 제품' 미노출 | ✅ |
| 사이드바에 '매장 자체 제품' 미노출 | ✅ |
| /store/handled-products 접근(헤더/탭/표) | ✅ |
| URL `?source=local` 진입 → local 탭 + 전용 빈 상태 문구 | ✅ (URL sync) |
| 상단 관리 버튼 'O4O 제품 신청' · '매장 자체 제품 등록' · '새로고침' | ✅ |
| 출처 탭 3종(전체/O4O 취급 제품/매장 자체 제품) | ✅ |
| 매장 자체 제품 온라인몰 '미지원' 고지 유지 | ✅ |
| 직접 URL /store/my-products 접근(heading '내 매장 제품') | ✅ route 유지 |
| 직접 URL /store/commerce/local-products 접근 | ✅ (선행 V1 smoke + route 무변경) |
| 콘솔 페이지 오류 없음(로그인 시점 401만) | ✅ |

## 13. 후속 후보

- `WO-O4O-KPA-STORE-PRODUCT-LABEL-CLARIFICATION-V1`
- `WO-O4O-KPA-STORE-HANDLED-PRODUCTS-MANAGE-INTEGRATION-V1` (화면 내부 직접 등록/수정 동선)
- `WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CHANNEL-EXPOSURE-V1` (QR/POP/블로그)
