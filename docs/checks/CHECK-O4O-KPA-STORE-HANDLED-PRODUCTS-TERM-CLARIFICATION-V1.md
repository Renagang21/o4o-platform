# CHECK-O4O-KPA-STORE-HANDLED-PRODUCTS-TERM-CLARIFICATION-V1

> WO: WO-O4O-KPA-STORE-HANDLED-PRODUCTS-TERM-CLARIFICATION-V1
> 선행: IR-...-DISPLAY-CONTENT-MODEL-V1 / WO-...-DISPLAY-POOL-SIMPLIFY-V1
> 범위: KPA 프론트 라벨 전용. route/API/DB/엔티티명 무변경.

## 1. 선행 IR 요약

매장 취급제품 = 진열·콘텐츠·온라인 노출용 제품 풀. 용어 정리로 혼동 제거: '매장 자체 제품'(직접 제조 오해)·'내 매장 제품'(취급제품과 중복 인상) 전환.

## 2. 변경 대상 용어

```
매장 자체 제품 → 매장 경영활용 제품
내 매장 제품   → 취급 중인 O4O 제품
O4O 취급 제품  → O4O 기반 제품 (handled-products 화면 구분/탭)
```

## 3. 변경 전/후 용어표

| 위치 | 전 | 후 |
|---|---|---|
| handled-products 출처 탭 | 전체 / O4O 취급 제품 / 매장 자체 제품 | 전체 / O4O 기반 제품 / 매장 경영활용 제품 |
| handled-products 부제 | O4O 취급 제품 + 매장 자체 제품 | O4O 기반 제품 + 매장 경영활용 제품 |
| handled-products 행 '구분' 배지 | originLabel(서버) | sourceType 도출(O4O 기반 제품/매장 경영활용 제품) |
| handled-products 상단 버튼 | 매장 자체 제품 등록 | 매장 경영활용 제품 등록 |
| handled-products 빈 상태/하단 안내 | 매장 자체 제품 | 매장 경영활용 제품 |
| local-products 화면 제목/빈상태/도움말 | 매장 자체 제품 / 매장 취급 상품 | 매장 경영활용 제품 |
| tablet-displays 풀 탭/빈상태/버튼 | 내 매장 제품 / 매장 자체 제품 | 취급 중인 O4O 제품 / 매장 경영활용 제품 |
| my-products(StoreProductsManagerPage props) | 내 매장 제품 | 취급 중인 O4O 제품 |

## 4. 변경 파일 목록 (KPA 단독)

- `services/web-kpa-society/src/pages/pharmacy/StoreHandledProductsPage.tsx` (탭/부제/버튼/빈상태/구분 배지/하단안내/docstring)
- `services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx` (제목/도움말/빈상태)
- `services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx` (풀 탭/설명/빈상태/버튼 — 내 매장 제품·매장 자체 제품 일괄)
- `services/web-kpa-society/src/App.tsx` (my-products StoreProductsManagerPage 라벨 prop)

## 5. KPA 단독 변경 여부

- 모두 KPA 화면/라우트 래퍼의 라벨. handled-products 행 '구분'은 **백엔드 originLabel 대신 프론트 sourceType 도출**로 KPA 단독화(백엔드 응답 문자열 무변경).

## 6. 공유 컴포넌트 영향 여부

- 공유 `StoreLocalProductsManager`(packages/store-ui-core, GP/KCos) **직접 변경 안 함** — StoreLocalProductsPage(KPA 자체 JSX)만 수정.
- 공유 `StoreProductsManagerPage`는 **라벨 prop 주입**(App.tsx)으로만 KPA 표시 변경 → GP/KCos 무영향.
- 공개 `TabletKioskPage`(고객 화면) **미변경**(별도 협의 대상).

## 7. route/API/DB 무변경 확인

- route/API/DB/migration/엔티티명/store_local_products/sourceType 값 무변경. 라벨 문자열만.

## 8. typecheck 결과

| 패키지 | 결과 |
|---|---|
| `services/web-kpa-society` tsc | ✅ PASS |

## 9. browser smoke 결과

✅ PASS (2026-06-26, KPA `테스트 약국 매장`, 배포본 c1aa16c99 web deploy success).

| 화면 | 확인 |
|---|---|
| /store/handled-products 부제 | O4O 기반 제품 + 매장 경영활용 제품 ✅ |
| handled-products 출처 탭 | 전체 / O4O 기반 제품 / 매장 경영활용 제품 ✅ |
| handled-products 상단 버튼 | 매장 경영활용 제품 등록 ✅ |
| handled-products 빈 상태/하단 안내 | 매장 경영활용 제품 ✅ |
| /store/commerce/local-products 제목/도움말/빈상태 | 매장 경영활용 제품 ✅ |
| /store/my-products 제목/설명/버튼/빈상태 | 취급 중인 O4O 제품 / O4O 제품 취급 등록 ✅ |
| 원본 관리 화면 직접 접근 | 정상(2화면) ✅ |
| 콘솔 페이지 오류 없음 | ✅ |

> StoreTabletDisplaysPage 풀 탭(취급 중인 O4O 제품/매장 경영활용 제품)은 타블렛 보유 시 노출 — 라벨 결정적·typecheck PASS로 확인.

## 10. 후속 후보

- `WO-...-CONTENT-LINK-V1` (콘텐츠↔제품 연결)
- `WO-...-TABLET-DISPLAY-CONTENT-SELECTION-V1`
- `WO-...-O4O-B2C-DESCRIPTION-COPY-TO-STORE-CONTENT-V1`
- (선택) 공유 StoreLocalProductsManager·공개 TabletKioskPage 용어 별도 검토
