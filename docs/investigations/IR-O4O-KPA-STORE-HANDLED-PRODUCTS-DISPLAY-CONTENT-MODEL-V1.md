# IR-O4O-KPA-STORE-HANDLED-PRODUCTS-DISPLAY-CONTENT-MODEL-V1

> 유형: 설계 조사 (read-only) / 상태: 설계 확정, 후속 WO 분리 대기
> 작성일: 2026-06-26 / 범위: KPA. 코드/route/DB 변경 없음
> 선행: PRODUCT-MENU-IA-REORG-V1, HANDLED-PRODUCTS-UNIFIED-VIEW-DESIGN-V1 / -V1, -INTERNAL-TABS-V1

---

## 0. 한 문장 (가장 중요)

> **온라인 주문 이후의 조달·재고·배송·발송·응대는 O4O 대상이 아니다.** 온라인 판매는 O4O 풀필먼트가 아니라 매장 자체 판매 접수 채널이며, `매장 취급제품`은 거래/공급 모델이 아니라 **진열·콘텐츠·온라인 노출을 위한 제품 풀**이다.

조사 결과 이 명제는 **현재 코드와 충돌하지 않는다**(이미 풀필먼트 단계가 구현되어 있지 않음 — §3 근거). 따라서 본 IR은 정책 문서화 + UI 단순화/용어 정리 방향을 확정한다.

---

## 1. 매장 취급제품 최종 정의

```
매장 취급제품 = 매장이 경영 활동에 활용하기 위해 관리하는 전체 제품 풀
             = O4O 기반 제품(organization_product_listings) + 매장 경영활용 제품(store_local_products)
용도: 타블렛 진열 · 온라인 노출 · 상세설명/QR/POP/블로그 제작 · 고객 안내
제외: 공급업체 · 구매처 · 조달 경로 · 발주/주문 후 처리 · 배송/재고 · 정산/매입 · 행사가/채널별가 · 채널 상태판 · 기본 상세설명 지정
```

물리 통합 아님(sourceType 구분). 거래·발주·결제는 별도 도메인(§5).

---

## 2. O4O 기반 제품 / 매장 경영활용 제품 구분

| | O4O 기반 제품 | 매장 경영활용 제품 |
|---|---|---|
| 테이블 | organization_product_listings (master_id→ProductMaster) | store_local_products |
| 정의 | O4O 제품 리스트/ProductMaster 기반 취급 등록 | O4O 리스트에 없거나 매장이 직접 등록해 경영 활동에 활용 |
| 상세설명 | O4O B2C 설명서(shared_product_descriptions) 복사 가능 + 자체 작성 | 자체 작성만(기본 설명 없음) |
| 공급처 | **관리 안 함**(노출 제거 대상, §3.2) | 없음 |
| 온라인 노출 | 가능(현재 organization_product_channels listing) | **현재 불가**(Display Domain hardening) → 정책상 노출 허용 시 별도 설계 |
| 가격 | 매장 표시 가격(listing.price) | 매장 표시 가격(price_display) |

> 용어: '매장 자체 제품' → **'매장 경영활용 제품'**, '내 매장 제품' → **'취급 중인 O4O 제품'** 검토(§11). 엔티티명 `store_local_products`는 비대상.

---

## 3. 공급처 제외 / 온라인 비대상 — 코드 근거

### 3.1 온라인 주문 이후 = 풀필먼트 없음 (정책 충돌 없음)
- KPA 온라인 판매 주문 = `CheckoutOrder`(`CheckoutOrderStatus`: created → pending_payment → paid → refunded/cancelled). `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts`, `routes/kpa/controllers/kpa-checkout.controller.ts`.
- `OrderLog` 액션도 결제/취소 계열만(created/payment_*/refund_*/cancelled). **조달·재고·배송·발송 필드/상태 없음.**
- → "온라인 주문 이후 O4O 비대상"은 **이미 코드 현실**. 신규로 막을 것이 아니라 **문서로 고정**하면 됨(풀필먼트로 확장 금지 가드).
- 고객 응답·매장 경영자 알림에 **공급처 미포함** ✅.

### 3.2 공급처 노출 지점 (제외 대상)
- `GET /api/v1/store/handled-products` — supplier **미반환** ✅ (이미 제외).
- ⚠️ `store-product-library.controller.ts`(GET / = 내 매장 진열, `master/:masterId/offers`) — `supplierId`, `supplierName`(neture_suppliers→organizations) **반환/표시**. /my-products·제품 추가 흐름에서 공급처가 노출됨.
- → 후속에서 매장 화면의 supplier 표시를 숨기거나 '공급/플랫폼' 라벨로 일괄화(§18, DISPLAY-POOL-SIMPLIFY 또는 별도).

---

## 4. 가격 단일화

- `store_local_products.price_display` = 매장 표시가 ✅ 의미 일치.
- `organization_product_listings.price` = 매장 표시가로 사용 가능. handled-products는 이미 `COALESCE(opl.price, spo.price_general)` 단일 표시. event_price/offer 가격은 표시에 미사용.
- 정책: **매장 표시 가격 1개**(타블렛·기본 온라인 노출 공용). 행사가/채널별가 **제외**. 온라인 별도 가격 필요 시 후속 분리(이번 범위 아님).

---

## 5. 상세설명 1:N / 기본 미지정 / 콘텐츠 연결 — 현재 구조

| 항목 | 현재 | V1 가능? |
|---|---|---|
| 콘텐츠(kpa_store_contents)가 제품 참조 | **불가** — product_id/master_id/barcode 필드 없음(source_metadata jsonb만) | ❌ 신규 컬럼/조인테이블 필요 |
| 제품 1:N 콘텐츠 연결 | 불가(상동) | ❌ |
| O4O B2C 설명서 → 매장 콘텐츠 복사 | **경로 없음** — shared_product_descriptions(master_id, content, source_type='supplier', status='canonical') 원천은 있으나 kpa_store_contents 복사 API 없음. 출처 추적(sourceRefId)은 가능 | ❌ 신규 API |
| 타블렛 진열 설명서 선택 | **불가** — store_tablet_displays(tablet_id, product_type, product_id, is_visible)에 content_id/description_id 없음. 공개 렌더는 `COALESCE(spd.content, sp.description, spo.consumer_detail_description)` 자동 | ❌ 신규 컬럼 |
| 기본 상세설명 미지정 | 매장 콘텐츠엔 기본개념 자체가 없음(정책 부합). 단 shared_product_descriptions에는 master당 canonical=대표 1개 개념 존재 — **이는 O4O 운영자 큐레이션(공용 풀) 영역으로 매장 콘텐츠 정책과 별개** | 정책 부합(매장측), canonical은 별도 도메인 |

→ **상세설명 1:N 연결·복사·타블렛 선택은 전부 신규 데이터가 필요** → V1 구현 아님, 후속 WO(§18). 정책(1:N, 기본 미지정)은 현재 매장 콘텐츠 구조와 **충돌하지 않음**(빈 캔버스).

---

## 6. (14.1) 개념 정의표

| 개념 | 정의 | 포함 | 제외 | 비고 |
|---|---|---|---|---|
| 매장 취급제품 | 경영 활동용 전체 제품 풀 | 이름/구분/이미지/표시가/간단설명/활성 | 공급처/발주/배송/재고/정산/행사가/채널상태/기본설명 | listing+local |
| O4O 기반 제품 | ProductMaster 기반 취급 등록 | master 정보, B2C 설명서 복사 | 공급처 노출 | listing |
| 매장 경영활용 제품 | 매장 직접 등록 활용 제품 | 직접 등록 이름/이미지/가격/설명 | 공급처, 기본 설명서 | local(구 '매장 자체 제품') |
| 매장 표시 가격 | 고객·타블렛·기본 온라인 노출가 | 단일 가격 | 행사가/공급가/채널별가 | price_display·listing.price |
| 상세설명 콘텐츠 | 제품에 연결되는 설명 콘텐츠(1:N) | 매장 자료함 콘텐츠, B2C 복사본 | 기본 지정 | 현재 연결구조 없음→후속 |
| 온라인 판매 상품 | 매장 취급제품 중 온라인 노출분 | 노출/설명/가격/주문접수/알림 | 조달/재고/배송/발송/응대 | 매장 자체 처리 |

---

## 7. (14.2) 현재 구현 vs 신규 정책 차이

| 항목 | 현재 구현 | 신규 정책 | 조치 후보 |
|---|---|---|---|
| 제품 구분 | listing / local | O4O 기반 / 매장 경영활용 | 라벨 전환(§18 TERM) |
| 공급처 | handled-products 제외 ✅ / product-library·offers 노출 ⚠️ | 완전 제외 | 매장 화면 supplier 숨김 |
| 채널 상태 | 타블렛/온라인몰/상품설명 컬럼 | 제품 풀 화면에선 축소/제거 | DISPLAY-POOL-SIMPLIFY |
| 가격 | COALESCE 단일 표시 ✅ | 매장 표시 가격 1개 | 유지(행사가 미도입) |
| 상세설명 | productDescriptionStatus(있음/없음/미지원) | 연결 콘텐츠 수 / 선택 구조 | CONTENT-LINK 후 대체 |
| 온라인 주문 후 | 결제까지만(풀필먼트 없음) ✅ | O4O 비대상 | 문서 가드(확장 금지) |

---

## 8. (14.3) 상세설명 연결 구조표

| 제품 유형 | O4O B2C 설명서 복사 | 매장 자체 설명서 작성 | 여러 개 연결 | 기본 설명서 | 진열 시 선택 |
|---|---|---|---|---|---|
| O4O 기반 제품 | 가능(원천 shared_product_descriptions 존재, **복사 API 후속**) | 가능(자료함 콘텐츠, **연결구조 후속**) | 목표 1:N(**후속**) | 없음 | 후속(타블렛 content_id 필요) |
| 매장 경영활용 제품 | 해당 없음(master 없음) | 가능(**연결구조 후속**) | 목표 1:N(**후속**) | 없음 | 후속 |

---

## 9. (14.4) 채널별 사용 정책표

| 채널 | 제품 선택 | 상세설명 선택 | 가격 | 공급처 | 주문 후 처리 |
|---|---|---|---|---|---|
| 타블렛 | 매장 취급제품 | 진열 시 선택(후속) | 매장 표시가 | 없음 | 해당 없음 |
| 온라인 | 매장 취급제품(현재 listing) | 정책 확인(기본 B2C, 자동지정 없음) | 매장 표시가 기본 | 없음 | **매장 자체 처리(O4O 비대상)** |
| QR | 매장 취급제품/콘텐츠 | 제작 시 선택 | 필요 시 표시 | 없음 | 해당 없음 |
| POP | 매장 취급제품/콘텐츠 | 제작 시 선택 | 필요 시 표시 | 없음 | 해당 없음 |
| 블로그 | 매장 취급제품/콘텐츠 | 제작 시 선택 | 필요 시 표시 | 없음 | 해당 없음 |

---

## 10. (14.5) 용어 전환표

| 기존 | 신규 후보 | 적용 위치(대표) | 즉시 변경 | 위험 |
|---|---|---|---|---|
| 매장 자체 제품 | 매장 경영활용 제품 | StoreHandledProductsPage(탭/버튼/부제/빈상태), StoreLocalProductsPage(제목/도움말/빈상태), StoreTabletDisplaysPage(버튼/빈상태), handled-products originLabel(server, KPA mount) | ✅ KPA 단독 가능 | 낮음 |
| 매장 취급 상품 | 매장 경영활용 상품 | StoreLocalProductsManager(packages/store-ui-core, **GP/KCos 공유**) | ⚠️ **prop 주입 필요** | 중 |
| 매장 자체 상품입니다 | (서비스별 결정) | TabletKioskPage(packages/tablet-kiosk-core, **공개 고객 화면**) | ⚠️ 신중 | 높음(외부 노출) |
| 내 매장 제품 | 취급 중인 O4O 제품 | StoreProductsManagerPage(prop 주입, App.tsx) | ✅ KPA prop | 낮음 |
| 매장 취급제품 | 유지 | storeMenuConfig KPA, StoreHandledProductsPage | — | — |

→ KPA 단독 ~20곳은 안전. 공유 컴포넌트(StoreLocalProductsManager)·공개 화면(TabletKioskPage)은 prop/별도 협의. 엔티티명/route/필드명 비대상.

---

## 11. (15) 중점 질문 15개 답변

| # | 질문 | 답 |
|---|---|---|
| 1 | 최종 정의 | 경영 활동용 제품 풀(진열·콘텐츠·온라인 노출). 거래/공급 아님(§1) |
| 2 | 공급처 완전 제외 OK? | ✅ — handled-products 이미 제외. product-library/offers 노출만 후속 숨김 |
| 3 | 온라인 공급처 미연결, 코드 충돌? | 충돌 없음 — 온라인 주문에 공급처/풀필먼트 구조 없음 |
| 4 | 온라인 주문 후 O4O 비대상 문서화? | ✅ — CheckoutOrder 결제까지만. 문서 가드로 확장 금지 |
| 5 | 용어 전환 영향 | KPA 단독 ~20곳(안전) + 공유 StoreLocalProductsManager(prop) + 공개 TabletKioskPage(주의) |
| 6 | 표시가 1개로 타블렛·온라인 처리? | ✅ price_display/listing.price 단일. 이미 단일 표시 |
| 7 | 행사가/채널별가 제외 OK? | ✅ 현재 표시에 미사용 |
| 8 | B2C 설명서 복사 경로 있나? | ❌ 없음(원천만 존재) → 후속 API |
| 9 | 자료함 콘텐츠로 제품 설명서 작성? | ❌ 현재 콘텐츠-제품 연결 없음 → 후속 |
| 10 | 제품 1:N 콘텐츠 연결? | ❌ 신규 컬럼/조인 필요 → 후속 |
| 11 | 기본 설명 미지정, 충돌? | 매장 콘텐츠 측 충돌 없음(빈 캔버스). canonical은 O4O 큐레이션 별개 도메인 |
| 12 | 타블렛 설명서 선택 필요 데이터 | store_tablet_displays에 content_id(또는 조인) + UI/API → 후속 |
| 13 | 채널 상태 컬럼 제거/축소? | **권장: 축소/제거**(제품 풀=상태판 아님) |
| 14 | 상품설명 상태 → 연결 콘텐츠 수? | 적절(단 연결 구조 생긴 뒤). 그 전엔 컬럼 제거 |
| 15 | 후속 WO 순서 | §18: SIMPLIFY → TERM → CONTENT-LINK → TABLET-SELECT → B2C-COPY |

---

## 12. 현재 매장 취급제품 화면 단순화 권장 (§13)

- 채널 상태 컬럼(타블렛/온라인몰/상품설명)은 **제품 풀 정체성과 불일치** → 축소/제거 권장.
- '온라인몰 미지원'은 컬럼 대신 **하단 보조 안내**로 유지(매장 경영활용 제품 정책 고지).
- '상품 설명' 상태는 콘텐츠 연결 구조 도입 후 **연결 콘텐츠 수**로 대체. 그 전까지는 컬럼 제거.
- 단순화 후 컬럼(권장): 제품 / 구분 / 매장 표시 가격 / 상태 / 최근 수정일 / 관리. (가벼운 V1)

---

## 13. 후속 WO 제안 (안전 순서)

1. **`WO-...-DISPLAY-POOL-SIMPLIFY-V1`** — handled-products 화면 채널 상태 컬럼 제거/축소, 제품 풀 중심 컬럼, 온라인몰 미지원=보조 안내. (프론트 위주, 일부 API 응답 다이어트)
2. **`WO-...-TERM-CLARIFICATION-V1`** — 매장 자체 제품→매장 경영활용 제품, 내 매장 제품→취급 중인 O4O 제품. KPA 단독 우선 + 공유 컴포넌트 prop.
3. **`WO-...-CONTENT-LINK-V1`** — kpa_store_contents ↔ 제품(master_id/sourceType+id) 연결(신규 컬럼/조인), 자료함 콘텐츠에서 제품 선택, 제품별 연결 콘텐츠 조회.
4. **`WO-...-TABLET-DISPLAY-CONTENT-SELECTION-V1`** — store_tablet_displays content_id 추가, 진열 시 설명서 선택(기본 미지정).
5. **`WO-...-O4O-B2C-DESCRIPTION-COPY-TO-STORE-CONTENT-V1`** — shared_product_descriptions → kpa_store_contents 복사(가져오기=복사, 출처 보존).
6. (가드) **온라인 판매 풀필먼트 비확장 정책** — CheckoutOrder에 공급/배송 상태 추가 금지. 본 IR을 근거 문서로.

---

## 14. 이번 IR 비범위 / 완료 기준

- 비범위: 코드/DB/migration/API/메뉴/라벨/구조 변경 전부 — read-only.
- 완료: 정의 재정립(§1) · 제품 구분(§2) · 공급처 제외/온라인 비대상 근거(§3) · 가격 단일화(§4) · 상세설명 1:N·기본미지정·연결 현황(§5,§8) · 차이표(§7) · 용어 범위(§10) · 화면 단순화 방향(§12) · 후속 WO(§13) ✅

---

## 15. 참고 파일

- 온라인 주문: `entities/checkout/CheckoutOrder.entity.ts`, `entities/checkout/OrderLog.entity.ts`, `routes/kpa/controllers/kpa-checkout.controller.ts`
- 공급처 노출: `routes/o4o-store/controllers/store-product-library.controller.ts`(GET /, master/:masterId/offers), `store-handled-products.routes.ts`(제외)
- 발주(별개): `modules/neture/services/supplier-order.service.ts`(neture_orders, created→…→delivered)
- 콘텐츠/설명서: `routes/kpa/entities/kpa-store-content.entity.ts`(제품 참조 없음), `modules/neture/entities/SharedProductDescription.entity.ts`, `routes/platform/entities/store-tablet-display.entity.ts`(설명서 필드 없음), `store-public/store-public-utils.ts`(COALESCE)
- 용어: `services/web-kpa-society/src/pages/pharmacy/{StoreHandledProductsPage,StoreLocalProductsPage,StoreTabletDisplaysPage}.tsx`, `packages/store-ui-core/.../StoreLocalProductsManager.tsx`(공유), `packages/tablet-kiosk-core/.../TabletKioskPage.tsx`(공개)
