# CHECK-O4O-KPA-STORE-MY-PRODUCTS-REBUILD-AS-STORE-PRODUCT-BASE-V1

> WO-O4O-KPA-STORE-MY-PRODUCTS-REBUILD-AS-STORE-PRODUCT-BASE-V1 실행 결과
> 실행일: 2026-06-25 · 대상: 프로덕션 `https://kpa-society.co.kr`
> 구현 커밋: `d59392543` (frontend, KPA + 공유 store-products-ui opt-in) — Web Cloud Run 배포 success

## 1. 조사 결론 (구현 방향 확정)

- `/store/my-products` 는 공유 컴포넌트 **`StoreProductsManagerPage`**(`packages/store-products-ui`)를 사용하며, 이 컴포넌트는 이미 **"내 매장 상품 관리"**(ProductMaster 검색→매장 등록 + 가격/설명 override + **채널 노출 토글** + 이미지 관리)다.
- "O4O 주문 가능 상품" 프레이밍은 컴포넌트 내부가 아니라 **KPA route 의 `title`/`description` prop** 에서만 왔다.
- 따라서 WO 헤드라인(O4O 의미 제거 + 내 매장 제품 재정의)은 **prop 재주입 + 메뉴 정비**로 충족된다. 등록 백엔드 신규는 불필요(이미 store-listing + 채널 토글 존재) — 자체 제품 직접 등록(path B)만 후속.

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/store-products-ui/src/StoreProductsManagerPage.tsx` | **opt-in 문구 prop 추가**: `registerButtonLabel`/`infoText`/`emptyTitle`/`emptyDescription`. 기본값=기존 문구 → GP/KCos/Neture 무영향 |
| `services/web-kpa-society/src/App.tsx` | `/my-products` route 의 props 를 '내 매장 제품' 프레이밍으로 교체(title/description + 신규 문구 props). route(`/my-products`) 유지 |
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | **KPA 블록**: '약국 상품·거래'에서 my-products 제거, '고객 응대'→'타블렛' 그룹(내 매장 제품 + 타블렛 구성) |

- backend/DB/migration/등록 기능/checkout **무변경**. GP/KCos/Neture **무변경**(공유 prop 기본값 보존).

## 3. 화면(`/store/my-products`) 문구 — 전 → 후

| 항목 | 전 | 후 |
|---|---|---|
| 제목 | O4O 주문 가능 상품 | **내 매장 제품** |
| 설명 | 공급자 또는 운영자 승인 후 약국에서 반복 주문할 수 있는 O4O 공급 상품을 관리합니다. | 타블렛, QR, 사이니지, 자체 온라인몰 등 매장 서비스에 활용할 제품을 관리합니다. |
| 안내 박스 | 상품 정보(ProductMaster)를 검색하여… | O4O 제품 또는 매장 자체 제품을 내 매장 제품으로 등록… 타블렛/QR/사이니지/온라인몰 등에 연결해 활용… |
| 등록 버튼 | 내 매장 상품 등록 / 상품 등록 | 내 매장 제품 등록 |
| 빈 상태 | 등록된 내 매장 상품이 없습니다 / 상품을 검색하여… | 등록된 내 매장 제품이 없습니다 / 제품을 등록해 타블렛과 매장 안내 서비스에 활용해 주세요. |

→ "O4O 주문 가능 상품" 문구 제거(§11.2), "내 매장 제품" + 활용 목적 노출. "매장 내 제품" 표현 미사용(§8).

## 4. 메뉴 구조 (KPA) — 후

```
약국 상품·거래
  - O4O 제품          /commerce/products
  - 발주 내역          /commerce/orders
  - 신청·승인 현황      /commerce/recruitment-applications
…
타블렛               (기존 '고객 응대' 그룹 개편)
  - 내 매장 제품       /my-products        ← 이동(상품·거래 → 타블렛 최상단)
  - 타블렛 구성        /commerce/tablet-displays  ← 기존 '태블릿'(태블릿 진열) 라벨 정렬
```

- `상담 요청`은 **선행 WO(CONSULTATION-REQUEST-MENU-HIDDEN-ROUTE-CLEANUP)에서 이미 메뉴 제거 + hidden route 유지** → 본 WO에서 추가 조치 없음(§9 알림 통합 유지와 정합).
- `타블렛 구성` = 기존 `/commerce/tablet-displays`(StoreTabletDisplaysPage) 라벨 정렬 → **데드링크 0**. 하위 통합(위치별 타블렛/전시 설정)은 후속.

## 5. 라우트 / O4O 분리

- `/store/my-products` route **유지**(404/권한오류/blank 없음, 사이드바 active 정상 — route 동일).
- `O4O 제품`(/commerce/products) 메뉴와 `내 매장 제품`(/my-products)이 **다른 그룹·다른 의미**로 분리(§11.4).

## 6. GP/KCos/Neture 무변경

- `StoreProductsManagerPage` 신규 prop은 **optional + 기본값=기존 문구**. GP/KCos/Neture는 미주입 → 화면 동일.
- 메뉴 변경은 **KPA 블록 한정**(공통 config 파일이나 서비스별 블록 분리). glycopharm tsc exit 0.

## 7. 비범위 (미수행)

- O4O 제품 주문/승인/발주, 발주 내역, 신청·승인, ProductMaster DB, 알림 시스템 변경 없음.
- 자체 제품 **직접 등록(path B)** — 현재 등록은 ProductMaster 검색 기반(= O4O 제품에서 가져오기, path A). 비-ProductMaster 자체 제품 직접 등록은 백엔드 필요 → **후속 WO**(§5.5 정책에 따라 UI/메뉴 먼저).
- `타블렛 구성` 하위 통합 화면 — 후속.

## 8. 테스트/빌드/smoke

| 검증 | 결과 |
|---|---|
| `web-kpa-society` tsc | ✅ error 0 |
| `web-glycopharm` tsc (공유 컴포넌트 소비처) | ✅ error 0 |
| 배포 (Web Cloud Run, d59392543) | ✅ success |
| 화면 문구/메뉴 라벨/라우트 정적 확인 | ✅ (prop·config) |
| 브라우저 시각 smoke (사이드바 '내 매장 제품' / 화면 문구 / O4O 제품 분리) | ⬜ **보류** — Playwright 영속 프로필이 다른 Chrome 세션에 점유되어 launch 실패(로컬 환경 제약). route 무변경이라 회귀 위험 낮음. 프로필 해제 후 사이드바·화면 문구만 확인하면 됨 |

## 9. 후속 후보

- 자체 제품 **직접 등록**(비-ProductMaster) 백엔드 + UI(path B).
- 노출 채널 확장(QR/사이니지/온라인몰/상담) — 현재 채널 토글은 B2C/KIOSK.
- `타블렛 구성` 하위 통합(위치별 타블렛/전시 설정 탭).
- 공유 컴포넌트 내부 '상품' 용어의 서비스 중립화(현재 KPA만 prop으로 '제품' 노출).

## 결론

`/store/my-products` 를 'O4O 주문 가능 상품'에서 **'내 매장 제품'(타블렛/QR/사이니지/온라인몰 활용 제품 관리)** 로 재정의하고, 메뉴를 '타블렛' 그룹으로 이동해 O4O 거래 영역과 분리. 공유 컴포넌트는 opt-in prop으로 KPA 문구만 반영(GP/KCos/Neture 무영향), route·백엔드·등록기능 무변경. tsc·배포 통과, 브라우저 시각 smoke만 로컬 프로필 점유로 보류.
