# CHECK-O4O-KPA-ONLINE-SALES-ORDER-MANAGEMENT-AND-BUYER-ORDER-RELABEL-V1

> WO-O4O-KPA-ONLINE-SALES-ORDER-MANAGEMENT-AND-BUYER-ORDER-RELABEL-V1 실행 결과
> 실행일: 2026-06-25 · 대상: 프로덕션 `https://kpa-society.co.kr`
> 근거 IR: IR-O4O-KPA-ONLINE-SALES-FIRST-CLASS-MENU-DESIGN-V1 (§5 주문 관리 신규 / 명칭 충돌 해소)
> 구현 커밋: `bc13062c4` (frontend, KPA) — Web Cloud Run 배포 완료

## 1. 변경 파일

| 파일 | 변경 |
|---|---|
| `services/web-kpa-society/src/pages/pharmacy/OnlineSalesOrdersPage.tsx` | **신규** — seller 판매 주문 관리 화면 |
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | **KPA 블록만** — 온라인 판매>주문 관리 추가 + 상품·거래>주문 관리 라벨 → '발주 내역' |
| `services/web-kpa-society/src/App.tsx` | route `/store/online-sales/orders` 추가 (lazy) |
| `services/web-kpa-society/src/pages/pharmacy/StoreOrdersPage.tsx` | 제목 '구매/발주 내역' → '발주 내역', 설명 정비(기능 무변경) |

- backend/DB/migration **무변경**. checkout 생성/결제 로직 무변경. GP/KCos 무변경.

## 2. 최종 메뉴 구조 (KPA)

```
약국 상품·거래
├─ 상품
├─ 내 약국 제품
├─ 발주 내역        ← (구) 주문 관리 라벨 변경 (buyer, /commerce/orders)
└─ 신청·승인 현황
온라인 판매
├─ 판매 설정
├─ 판매 상품
└─ 주문 관리        ← 신규 (seller, /online-sales/orders)
```
→ "내가 사는 주문 = 발주", "고객에게 파는 주문 = 온라인 판매 주문"으로 분리.

## 3. '주문 관리' → '발주 내역' 라벨 변경 범위

- 메뉴 라벨(storeMenuConfig KPA 블록 `orders` 항목): `주문 관리` → `발주 내역`.
- 화면 제목(StoreOrdersPage): `구매/발주 내역` → `발주 내역`, 설명에 "온라인 판매 고객 주문은 '온라인 판매 > 주문 관리'" 안내 추가.
- route `/store/commerce/orders` 유지. API명/내부 타입(`BuyerOrder`/`getBuyerOrders`) 무변경.

## 4. 신규 route

- `/store/online-sales/orders` → `<OnlineSalesOrdersPage />` (lazy).

## 5. seller 주문 API 연결 방식

- **기존 백엔드 재사용**(신규 0): `GET /checkout/store-orders`(목록) + `GET /checkout/store-orders/kpi`(KPI). 둘 다 `kpa-checkout.controller`에 마운트, `requireAuth + requireStoreOwner`, `sellerOrganizationId` + serviceKey('kpa-society'/'kpa') 스코프, status 필터 + 서버 페이지네이션.
- 프론트 클라이언트(`api/checkout.ts`의 `getStoreOrders`/`getStoreOrderKpi`)는 이미 정의되어 있었고 **미연결 상태 → 본 WO에서 화면에 연결**.
- 온라인 스토어 활성 판별: `fetchChannelOverview()`로 B2C APPROVED 채널 유무 확인 → 빈 상태 메시지 분기.

## 6. 표시 가능 / 미표시 주문 필드

| 표시 | list 응답 필드 |
|---|---|
| 주문번호 | orderNumber |
| 주문 상품(요약) | items[0].productName + 외 N건 (itemCount) |
| 주문금액 | totalAmount |
| 결제상태 | paymentStatus (결제완료/대기/환불/실패 매핑) |
| 주문상태 | status (BuyerOrderStatusBadge 재사용) |
| 주문일시 | createdAt |
| KPI | total / pending / completed / monthlyRevenue |

**미표시(후속)**: 고객명·연락처 — list 응답에 없음(개인정보 보호). 상세 엔드포인트(`/store-orders/:id`)에 `buyerName/buyerEmail` 존재 → **주문 상세 화면(후속 WO)** 에서 마스킹 정책과 함께 노출.

## 7. 빈 상태 / 오류 처리

- 온라인 스토어 미활성(B2C 채널 없음): "온라인 스토어가 아직 시작되지 않았습니다 / …이곳에서 확인할 수 있습니다" + "판매 설정으로 이동" 링크.
- 주문 0건(스토어 활성): "아직 온라인 판매 주문이 없습니다".
- API 오류: "온라인 판매 주문을 불러오지 못했습니다. 잠시 후 다시 시도해주세요." + 다시 시도.

## 8·9. 기존 화면 보존

- `/store/commerce/orders`(발주 내역) route·기능·`getBuyerOrders` 무변경(라벨/문구만).
- `/store/online-sales/settings`·`/products`·`/store/channels` redirect 무변경.

## 10. GP/KCos 무변경

- 신규 화면은 KPA 전용 파일. 공통 `storeMenuConfig.ts`는 **KPA 블록만** 수정(GP/KCos 블록의 주문/채널 항목 그대로).

## 11. 테스트/빌드/smoke 결과

| # | 검증 | 결과 |
|---|------|:---:|
| 11 | `web-kpa-society` tsc --noEmit | ✅ exit 0 |
| 배포 | Web Cloud Run (bc13062c4) | ✅ success |
| seller API 실재/마운트 | `/checkout/store-orders`(+`/kpi`) requireStoreOwner | ✅ 정적 확인 |
| 1·4·5·6 브라우저 smoke (발주 내역 라벨 / 온라인 판매>주문 관리 진입 / 데이터·빈 상태) | ⬜ **보류** |

> **브라우저 smoke 보류 사유**: Playwright 영속 프로필(`C:\Users\home\.playwright-o4o-profile`)이 **다른 실행 중인 Chrome 세션에 점유**되어 launch 실패("이미 실행 중인 세션에서 사용 중"). 본 변경과 무관한 로컬 환경 제약. 코드(API 연결·section/빈상태 로직)+tsc+배포로 확인. 해당 Chrome 창을 닫은 뒤 재시도하면 시각 검증 가능.

## 12. 후속 후보

- 온라인 판매 **주문 상세**(`/store-orders/:id`) — 고객명/연락처 마스킹 노출, 항목/배송/결제 내역.
- 주문 상태 변경/처리(이행) — `PATCH /store-orders/:id/status`(cancel/refund) 연결.
- 환불/취소 흐름.
- 온라인 판매 매출 KPI 고도화(분석 확장).
- 온라인 주문 CS + 상담 요청 알림 통합 검토.
- 미연결 status 필터 키 ↔ checkout status enum 정합 점검(현재 BUYER_CHECKOUT_STATUS_TABS 재사용).

## 결론

온라인 판매 주문 관리(seller) 화면을 기존 백엔드 재사용으로 신설하고, 기존 구매 주문을 '발주 내역'으로 라벨 분리해 "주문" 용어의 구매/판매 혼동을 해소. backend/DB/결제/GP/KCos 무영향, tsc·배포 통과. 브라우저 시각 smoke만 로컬 프로필 점유로 보류.
