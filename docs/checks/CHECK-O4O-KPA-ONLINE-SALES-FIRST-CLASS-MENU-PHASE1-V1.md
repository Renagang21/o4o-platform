# CHECK-O4O-KPA-ONLINE-SALES-FIRST-CLASS-MENU-PHASE1-V1

> WO-O4O-KPA-ONLINE-SALES-FIRST-CLASS-MENU-PHASE1-V1 (IR B안 1차) 실행 결과
> 실행일: 2026-06-25 · 대상: 프로덕션 `https://kpa-society.co.kr`
> 근거 IR: IR-O4O-KPA-ONLINE-SALES-FIRST-CLASS-MENU-DESIGN-V1
> 구현 커밋: `3d88b9e82` (frontend, KPA) — Web Cloud Run 배포 완료

## 1. 최종 메뉴 구조 (KPA)

```
온라인 판매            (신설 1급)
├─ 판매 설정          /store/online-sales/settings
└─ 판매 상품          /store/online-sales/products
고객 응대             (기존 '채널' → 개편)
├─ 태블릿            /store/commerce/tablet-displays
└─ 상담 요청          /store/requests
```
- `채널 관리`(/channels) 메뉴 항목 **제거**. KIOSK 미노출(출시 전 placeholder).

## 2. 변경 파일

| 파일 | 변경 |
|---|---|
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | **KPA 블록만** — `온라인 판매` 그룹 신설 + `채널`→`고객 응대` + `채널 관리` 제거 |
| `services/web-kpa-society/src/App.tsx` | `/online-sales/settings·products` 라우트 추가, `/channels`→설정 redirect |
| `services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx` | `section`('settings'|'products') prop 재사용 — B2C 전용(탭 바/KIOSK 숨김), settings/products 화면 분리 |

- backend/DB/migration **무변경**. `channel_type='B2C'` enum 불변. `/store/settings`·구매 주문 화면 무변경. GP/KCos 블록·페이지 무변경.

## 3. 신규 라우트

- `/store/online-sales/settings` → `<StoreChannelsPage section="settings" />`
- `/store/online-sales/products` → `<StoreChannelsPage section="products" />`

## 4. `/store/channels` 처리

- `<Navigate to="/store/online-sales/settings" replace />` redirect. (브라우저 확인: `/store/channels` 접근 → `/store/online-sales/settings`로 이동, "판매 설정" 렌더)
- `/store/channels/tablet` → `/store/requests` redirect 유지.

## 5. slug 단일 소유 위치

- slug 편집 UI(공개 URL 카드)는 **`판매 설정`(section='settings')에만** 노출(`showSettings` gate). `판매 상품`(products)에는 미노출 → 중복 제거.
- `/store/settings`(매장 홈 디자인)은 미변경(slug 없음). 공개 주소는 판매 설정 단일 위치.

## 6. 기존 B2C 기능 보존 확인

- section gating은 **렌더 위치만 분리**, B2C 로직(activation `createChannel`, `organization_channels`, `organization_product_channels` 진열, slug, 자산 채널맵, checkout 연결, sales_limit) **코드 미변경**. activeTab='B2C' 고정.

## 7. 판매 상품 진열 기능 보존 확인

- 제품 추가/노출/순서/삭제/벌크/판매한도 UI는 기존 product list [D] 그대로 `products` 섹션에서 렌더(`showProducts` gate). API(channelProducts) 동일.

## 8. 태블릿/상담 요청 유지 확인

- `고객 응대` 그룹 펼침 → 태블릿(`/store/commerce/tablet-displays`) + 상담 요청(`/store/requests`) 정상 노출(브라우저 확인). 두 라우트 동작 유지.

## 9. GP/KCos 무변경 확인

- `StoreChannelsPage`는 서비스별 개별 파일 — KPA만 수정. 공통 `storeMenuConfig.ts`는 **KPA 블록만** 변경(GP/KCos 블록의 '채널 관리'/태블릿 등 그대로). glycopharm tsc exit 0.

## 10. 테스트/빌드/smoke 결과 (배포본 3d88b9e82, store-owner)

| # | 검증 | 결과 |
|---|------|:---:|
| 1 | 사이드바 `온라인 판매` 상위 메뉴 노출 | ✅ |
| 2 | `온라인 판매 > 판매 설정` 진입 (h1 "판매 설정") | ✅ |
| 3 | 미활성 매장 "온라인 스토어 시작" 표시 | ✅ |
| 6 | `판매 상품` 진입 (h1 "판매 상품") | ✅ |
| 8 | `/store/channels` → `/online-sales/settings` redirect | ✅ |
| 9 | `채널 관리` 항목 사라짐 / `고객 응대` 그룹 노출 | ✅ |
| 10·11 | 태블릿 / 상담 요청 라우트 유지 | ✅ |
| 13 | tsc (web-kpa-society / glycopharm) exit 0 | ✅ |
| 4·7 | 활성 매장 상태/URL/상품 진열 **시각** | ⚠️ 보류 — 데모 매장 B2C_COMMERCE capability 미활성 → 채널 생성 403 → 채널 없는 상태만 노출. section gating·B2C 로직은 코드+tsc로 보존 확인(이전 WO와 동일 한계) |

## 11. 후속 작업 후보

- **온라인 판매 > 주문 관리(신규)**: seller `checkout_orders` 조회 화면(`getStoreOrders/kpi-summary` 연결).
- 기존 구매 주문(`/store/commerce/orders`) 라벨 → `발주 내역`으로 변경(명칭 충돌 해소).
- 온라인 판매 매출 KPI(분석 확장 또는 온라인 판매 대시보드).
- 온라인 주문 CS + 상담 요청 알림 보완(IR-...CONSULTATION-... Phase1)과 source 통합 검토.
- 활성 매장(B2C capability ON)에서 판매 설정/상품 시각 회귀 1회 확인.
- `ChannelPublicUrlCard` 내 도달 불가 `channelType==='TABLET'` dead branch 정리(무해).

## 결론

B안 1차(온라인 판매 1급 분리 + 판매 설정/상품 이관) 구현·배포·검증 완료. `채널 관리` 사용자 노출 제거, 태블릿/상담은 `고객 응대`로 정리. 온라인 스토어 실기능·주문 연결 보존, backend/DB/GP/KCos 무영향.
