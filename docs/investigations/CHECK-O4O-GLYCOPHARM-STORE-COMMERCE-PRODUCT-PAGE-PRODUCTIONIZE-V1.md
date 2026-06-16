# CHECK-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-PAGE-PRODUCTIONIZE-V1

> WO: `WO-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-PAGE-PRODUCTIONIZE-V1`
> 선행 IR: `docs/investigations/IR-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-AUDIT-V1.md`
> 작성일: 2026-06-16

---

## 1. Summary

GlycoPharm 내 약국 `상품·거래 > 상품` 화면(`/store/management/b2b`)을 검증용 화면에서 운영용으로 1차 전환했다. 사용자-facing 검증/개발자 문구를 제거하고 운영용 제목/설명으로 정리했으며, 검색·테이블·페이지네이션·API 호출은 그대로 유지했다.

IR 판정이 **D. VALIDATION_SCREEN** 이었던 핵심 원인(운영 메뉴 진입 화면에 검증용 배너 노출)을 제거했다. 데이터 소스 공통 정렬(`SupplierProductOffer`)은 범위 외로 후속 작업이다.

---

## 2. Scope

- 대상: GlycoPharm 단독, 단일 화면 컴포넌트
- 한다: 검증용 문구 제거, 운영 제목/설명 정리, 기존 구조/API 보존, typecheck, CHECK 문서
- 하지 않는다: 신규 API/DB/migration, 데이터 소스 전환, KPA `PharmacyB2BPage` 이식, KC 상품 화면 도입, storeMenuConfig/menuCapabilityMap 변경, 주문/장바구니/checkout/OrderType 변경

---

## 3. Changed Files

| 파일 | 변경 |
|---|---|
| `services/web-glycopharm/src/pages/store-management/PharmacyB2BProducts.tsx` | 검증 배너 제거, 헤더 주석/제목/설명 운영화, 테이블 주석 정리 |
| `docs/investigations/CHECK-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-PAGE-PRODUCTIONIZE-V1.md` | 본 CHECK 문서 (신규) |

> KPA / K-Cosmetics 화면, storeMenuConfig, menuCapabilityMap, OrderType, checkout/cart, Hero/Home/Header 미접촉.

---

## 4. Removed Validation Copy

다음 사용자-facing / 개발자 문구를 제거했다.

- 파일 헤더 주석: `"B2B 상품 리스트 (WordPress 스타일 UI 검증용)"`, `"본 화면은 B2B 주문 UI 검증용입니다."`, `"실제 B2B 전용 상품 API는 백엔드 구현 대기 중입니다."`
- 화면 검증 배너 전체 (`bg-blue-50` AlertCircle 배너):
  - `"B2B UI 검증용 화면"`
  - `"본 화면은 WordPress 스타일 테이블 UI 검증을 위한 페이지입니다. 실제 B2B 전용 상품 API는 백엔드 구현 대기 중이며, 현재는 일반 상품 API를 사용하여 UI/UX를 테스트합니다."`
- 테이블 영역 주석: `{/* WordPress Style Table */}` → `{/* 상품 테이블 */}`

---

## 5. Production Copy

| 항목 | 이전 | 변경 후 |
|---|---|---|
| 제목 | `B2B 상품 관리` | `상품 관리` |
| 설명 | `총 N개의 상품` | `약국에서 취급할 상품을 확인합니다 · 총 N개` (로딩 시 `불러오는 중...`) |
| 헤더 주석 | 검증용 안내 | `약국 상품·거래 > 상품 화면 / 약국에서 취급할 상품 목록을 조회` + 후속 정렬 메모 |

- empty state(`"등록된 상품이 없습니다."`)는 운영 문구로 충분하여 유지.
- 내부 구현 상태(레거시/테스트)를 사용자에게 노출하지 않도록 정리.

---

## 6. Data Source Boundary

이번 작업은 화면 운영화 1차이며, 데이터 소스는 기존 GlycoPharm 상품 API를 유지했다.

- `pharmacyApi.getProducts()` 호출 유지
- `GET /glycopharm/pharmacy/products` 유지 (변경 없음)
- `/glycopharm/b2b/products` 전환하지 않음
- `glycopharm_products` → `SupplierProductOffer` 공통 정렬은 후속 IR/WO

KPA/K-Cosmetics 와의 `SupplierProductOffer` 기반 공통 정렬은 후속 작업이다.

---

## 7. TypeScript Result

```
cd services/web-glycopharm && npx tsc --noEmit -p tsconfig.json
EXIT: 0
```

- 결과: PASS (에러 없음)
- 공통 패키지 미수정으로 타 서비스 typecheck 불요.

---

## 8. Browser Smoke Result

- 상태: **배포 후 수행 예정 (PENDING)**
- 본 변경은 frontend 정적 문구/구조 정리로, 배포 전 코드 레벨 검증(typecheck PASS)으로 1차 확인.
- 배포 후 확인 항목:
  1. `/store/management/b2b` 진입 → 제목 "상품 관리" 표시
  2. 검증용 배너 미노출
  3. "WordPress / 백엔드 구현 대기 / 테스트" 문구 미노출
  4. 검색 입력 / 테이블 / empty state / 페이지네이션 정상
  5. 페이지 크래시·500·console critical error 없음
  6. 사이드바 `약국 상품·거래 > 상품` active 정상

---

## 9. Regression Check

- 검색 입력 핸들러(`onChange` → setSearchQuery/setCurrentPage) 코드 변경 없음
- 컬럼 정의(이미지/상품명/공급자/카테고리/가격/재고/상태/액션) 변경 없음
- `loadProducts()` / API 응답 매핑 변경 없음
- 페이지네이션(처음/이전/다음/마지막) 로직 변경 없음
- `AlertCircle` import 유지 — 에러 상태 블록에서 계속 사용됨
- 변경은 표시 문구/주석에 한정 → 동작 회귀 위험 낮음

---

## 10. Follow-ups

- `IR/WO-O4O-GLYCOPHARM-STORE-COMMERCE-PRODUCT-DATA-SOURCE-ALIGNMENT-V1` — `glycopharm_products` → 공통 `SupplierProductOffer` 정렬
- `WO-O4O-KCOSMETICS-STORE-COMMERCE-PRODUCT-PAGE-INTRODUCE-V1` — KC 상품 화면 도입
- `WO-O4O-STORE-COMMERCE-PRODUCT-PAGE-CROSSSERVICE-PARITY-V1` — KPA 기준 GP/KC 공통 정렬
- 배포 후 browser smoke 수행 및 본 문서 §8 갱신
