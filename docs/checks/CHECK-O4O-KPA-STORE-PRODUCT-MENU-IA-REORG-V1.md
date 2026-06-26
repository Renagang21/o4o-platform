# CHECK-O4O-KPA-STORE-PRODUCT-MENU-IA-REORG-V1

> WO: `WO-O4O-KPA-STORE-PRODUCT-MENU-IA-REORG-V1`
> 선행 IR: `IR-O4O-KPA-STORE-PRODUCT-MENU-AND-LOCAL-PRODUCT-IA-AUDIT-V1`
> 대상: KPA 사이드바 메뉴 IA (storeMenuConfig KPA 블록)
> 작업일: 2026-06-26 / 범위: KPA only

---

## 1. 변경 배경 / 선행 IR 요약

선행 IR 결론:
- `내 매장 제품`(/my-products → `organization_product_listings`)·`매장 자체 제품`(/commerce/local-products → `store_local_products`)은 **제품 기준 관리**(서로 다른 데이터, 중복 아님).
- `타블렛 구성`(/commerce/tablet-displays)은 제품 등록이 아니라 기존 제품을 타블렛 화면에 **노출·구성하는 활용 채널**.
- 원칙: **제품 기준 관리 → 약국 상품·거래 / 제품 활용 채널 → 약국 경영지원**.

A안(중복 제거) 제외 → **B안: 메뉴 IA 재배치(라벨/위치만)**.

---

## 2. 변경 전 → 변경 후 (KPA 사이드바)

**변경 전**
```
약국 상품·거래 : O4O 제품 · 발주 내역 · 신청·승인 현황
약국 경영지원   : 상품 설명 · 블로그 · POP · QR-code
타블렛         : 내 매장 제품 · 매장 자체 제품 · 타블렛 구성
```

**변경 후**
```
약국 상품·거래 : O4O 제품 · 내 매장 제품 · 매장 자체 제품 · 발주 내역 · 신청·승인 현황
약국 경영지원   : 상품 설명 · 블로그 · POP · QR-code · 타블렛 구성
(타블렛 그룹 제거 — 빈 그룹 잔존 없음)
```

- 제품 기준 관리(내 매장 제품 / 매장 자체 제품) → '약국 상품·거래'(O4O 제품 다음).
- 타블렛 구성 → '약국 경영지원'(QR-code 다음).
- 기존 '타블렛' 독립 그룹 제거.

---

## 3. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | **KPA 블록만** — 약국 상품·거래에 `my-products`/`local-products` 추가, 약국 경영지원에 `tablet-displays` 추가, '타블렛' 그룹 제거 |

**route/page/API/DB/권한 무변경.** 메뉴 `key`/`subPath` 동일 — 클릭 시 이동 화면 불변.

---

## 4. 무변경 확인

| 항목 | 결과 |
|---|---|
| route 변경 | ❌ 없음 (`/store/my-products`, `/store/commerce/local-products`, `/store/commerce/tablet-displays` 그대로) |
| page component 변경 | ❌ 없음 (StoreProductsManagerPage / StoreLocalProductsPage / StoreTabletDisplaysPage 미수정) |
| API / DB / migration | ❌ 없음 |
| redirect / alias | ❌ 불필요(route 유지) |
| capability / filter | ❌ 변경 없음(메뉴 항목 key 동일) |
| **GP/KCos 메뉴 블록** | ❌ 무변경 (KPA 블록만 수정 — GP/KCos 블록 별도 객체) |
| 공유 컴포넌트 | ❌ 수정 없음 |

> 참고: `storeMenuConfig.ts` 는 packages → web 배포 시 전 web 재빌드되나, **KPA 메뉴 블록만** 바뀌어 GP/KCos 사이드바는 동일.

---

## 5. 검증 결과

| 항목 | 결과 |
|---|---|
| `packages/store-ui-core` `tsc --noEmit` | ✅ PASS |
| `web-kpa-society` `tsc --noEmit` | ✅ PASS |
| 메뉴 key 타입(MenuKey) 유효 | ✅ (my-products/local-products/tablet-displays 기존 union) |
| 약국 상품·거래에 내 매장 제품·매장 자체 제품 노출 | ✅ (배포본 18eb42c93) O4O 제품 · **내 매장 제품(/my-products)** · **매장 자체 제품(/commerce/local-products)** · 발주 내역 · 신청·승인 현황 |
| 약국 경영지원에 타블렛 구성 노출 | ✅ 상품 설명 · 블로그 · POP · QR-code · **타블렛 구성(/commerce/tablet-displays)** |
| '타블렛' 독립 그룹 제거(빈 그룹 없음) | ✅ 사이드바 최상위에서 '타블렛' 그룹 사라짐 |
| route href 불변(화면 동일) | ✅ /store/my-products, /store/commerce/local-products, /store/commerce/tablet-displays href 그대로 |

브라우저 smoke: 2026-06-26, KPA `테스트 약국 매장`, 배포본 `18eb42c93` deploy success.

---

## 6. 후속 후보

- `WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1` — `organization_product_listings` + `store_local_products` 합산 "매장 취급제품" 단일 목록 조회(물리 통합 아님, 조회/표시 레이어 + 채널 노출 상태 표시). 별도 설계 IR 선행 권장.
- 라벨 구체화(예: '내 매장 제품' → '취급 중인 O4O 제품') 는 이번 1차에서 보류(위치 정리 우선, 혼란 최소화).
