# CHECK-O4O-KPA-TABLET-PUBLIC-LOCAL-PRODUCTS-FIX-V1

> WO-O4O-KPA-TABLET-PUBLIC-LOCAL-PRODUCTS-FIX-V1 실행 결과
> 실행일: 2026-06-26 · 대상: KPA 공개 타블렛 뷰어 (`/tablet/:slug`)
> 발견 경위: CHECK-O4O-KPA-STORE-LOCAL-PRODUCT-MENU-ACCESS-V1 §9-A
> 구현 커밋: `2d72854ca` (frontend 단일 파일, KPA only) — Web 배포 success

## 1. 배경 / 버그

- KPA 공개 타블렛 뷰어가 **매장 자체 제품(local products)을 화면에 표시하지 못함**("표시할 상품이 없습니다").
- 원인: kiosk-core(`packages/tablet-kiosk-core/src/TabletKioskPage.tsx:343`)는 `res.localProducts` 를 읽어 `mapLocalProduct` 로 렌더하는데, **KPA `services/web-kpa-society/src/api/tablet.ts` `fetchTabletProducts` 가 `{ data, meta }` 만 반환하고 `localProducts` 를 드롭**.
- 백엔드 공개 API(`GET /stores/:slug/tablet/products`)는 `localProducts` 를 **정상 반환**(smoke 에서 SMOKE 제품 2건 확인). 즉 프론트 api 레이어에서 유실.

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/api/tablet.ts` | `fetchTabletProducts` 반환에 `localProducts: json.localProducts` 통과 + 반환 타입에 `localProducts?: unknown[]` 추가. data/meta 무변경 |

- 백엔드/공개 API/kiosk-core **무변경**. KPA only. (kiosk `TabletProductsResponse.localProducts?` 는 이미 optional → 타입 안전.)

## 3. 데이터 경로 (수정 후)

```
GET /stores/:slug/tablet/products
  → { data:[supplier], meta, localProducts:[자체 제품] }   (백엔드, 기존 정상)
  → KPA fetchTabletProducts: { data, meta, localProducts }  (← 본 수정: localProducts 통과)
  → kiosk-core: suppliers=data.map(mapSupplierProduct) + locals=res.localProducts.map(mapLocalProduct)  (TabletKioskPage:342-343)
  → Browse 그리드에 supplier + local 함께 노출
```

## 4. 비영향

- supplier(`data`)/meta 동작 무변경. K-Cosmetics 등 타 서비스의 자체 tablet api 미변경(KPA 파일 한정).
- 백엔드/온라인 판매 무관.

## 5. 테스트 / 빌드 / smoke

| 검증 | 결과 |
|---|---|
| `web-kpa-society` tsc | ✅ error 0 |
| 배포 (Web Cloud Run, 2d72854ca) | ✅ success |
| 데이터 경로 (공개 API localProducts 반환 → KPA 통과 → kiosk 소비) | ✅ 코드 검증 (공개 API 응답에 SMOKE 제품 2건 실측 — 선행 smoke) |
| 공개 뷰어 자체 제품 시각 노출 + 자동 넘김 순환 | ⬜ **보류** — Playwright 영속 프로필 재점유로 launch 실패. 프로필 해제 후: 자체 제품 2건 진열 + autoSlide 5초 → `/tablet/<slug>` 에서 카드 노출 + 강조 순환 확인 |

> 슬러그 인코딩 주의: 데모 매장 `네뚜레-약국` 의 '뚜' = `%EB%9A%9C`(`%EB%9A%B0` 아님).

## 6. 남은 후속

- **공개 뷰어 시각 재검증**(프로필 해제 후): 자체 제품 노출 + 자동 넘김(WO-O4O-KPA-TABLET-BROWSE-AUTO-SLIDE-V1) 순환 — 본 수정으로 비로소 가능.
- (선택) `localProducts` 응답 타입을 kiosk `TabletProductsResponse` 와 동일하게 명시(현재 `unknown[]`).

## 결론

KPA `fetchTabletProducts` 가 응답의 `localProducts` 를 통과시키도록 1줄 수정 → 공개 타블렛 뷰어가 매장 자체 제품을 표시할 수 있게 됨(기존 드롭 버그 해소). data/meta·백엔드·kiosk-core·타 서비스 무영향, tsc·배포 통과. 시각 노출/자동 넘김 순환은 로컬 프로필 점유로 보류(데이터 경로는 코드+공개 API 응답으로 검증).
