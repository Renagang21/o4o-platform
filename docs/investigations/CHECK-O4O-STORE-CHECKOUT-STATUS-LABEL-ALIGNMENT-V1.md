# CHECK-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1

> **WO**: WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1
> **선행**: KPA/GP/KCos buyer 정합(checkout_orders) 완료(`...KPA-ORDERS-PAGE-BUYER-LEDGER-ALIGNMENT-V1` 등).
> **성격**: 3서비스 buyer 주문 화면의 checkout 상태 **표시 라벨·badge tone 공통 정렬**. 상태 전이·결제 로직·backend enum·DB·migration 무변경.
> **결과: PASS — 공통 매핑(@o4o/store-ui-core) 추출 + 3서비스 적용. 3 web typecheck 0. seller 문구 UI 잔존 0.**
> **작성일**: 2026-06-12

---

## 1. 목적
KPA/GP/KCos buyer 주문 목록에서 동일 raw checkout status 가 **동일 문구·동일 의미**로 보이도록 정렬. 후속 공통 컴포넌트 추출 전, 라벨/표시 기준을 먼저 통일.

## 2. 3서비스 기존 상태 표시 (변경 전)
| 서비스 | 페이지 | 방식 | 라벨(예) |
|--------|--------|------|---------|
| KPA | `pages/pharmacy/StoreOrdersPage.tsx` | raw status 직접(STATUS_BADGE) | 접수/결제대기/결제완료/취소/환불 |
| KCos | `pages/store/StoreOrdersPage.tsx` | raw status 직접(STATUS_LABEL) + paymentStatus raw 노출 | 접수/결제대기/결제완료/취소/환불, paymentStatus='paid'(raw) |
| GP | `pages/store-management/PharmacyOrders.tsx` | `deriveState`(status+paymentStatus → paid/pending/cancelled) | 결제완료/결제대기/취소/환불 |
> KPA·KCos 라벨은 동일했으나 GP 는 별도 스킴 + 띄어쓰기/문구 차이. KCos 는 paymentStatus 를 영문 raw 로 노출.

## 3. 확정한 buyer status label mapping (canonical, WO §5.1)
| raw status | label | tone |
|-----------|-------|:---:|
| created | 주문 생성 | neutral |
| pending_payment | 결제 대기 | warning |
| paid | 결제 완료 | success |
| cancelled / canceled | 주문 취소 | muted |
| failed | 주문 실패 | danger |
| refunded | 환불 완료 | muted |
| partially_refunded | 부분 환불 | warning |
| (미정의/빈값) | 상태 확인 필요 | neutral |

paymentStatus(보조 표시): pending/ready→결제 대기, paid/done/completed→결제 완료, failed→결제 실패, cancelled→결제 취소, refunded→환불 완료, partial(ly)_refunded→부분 환불, 빈값→'-', 미정의→상태 확인 필요.

## 4. 공통 매핑 추출 (Phase 2 — 적용)
- 위치: **`packages/store-ui-core/src/utils/buyerCheckoutStatus.ts`**(신규). 3서비스 모두 `@o4o/store-ui-core` 의존(package.json `workspace:*`) + main/types/exports=`./src/index.ts`(빌드 불요, 소스 직접 resolve).
- export(`store-ui-core/src/index.ts`): `getBuyerCheckoutStatusDisplay`(key/label/tone) · `getBuyerCheckoutStatusLabel` · `getBuyerPaymentStatusLabel` · `BUYER_CHECKOUT_TONE_HEX`(tone→hex) · `BUYER_CHECKOUT_STATUS_TABS` · type `BuyerCheckoutTone`/`BuyerCheckoutStatusDisplay`.
- presentation-only 순수 모듈(React/타입 의존 없음) → 순환 의존 위험 없음. 후속 공통 컴포넌트 추출에서 재사용.

## 5. 서비스별 변경
| 파일 | 변경 |
|------|------|
| `packages/store-ui-core/src/utils/buyerCheckoutStatus.ts` | **신규** 공통 매핑 |
| `packages/store-ui-core/src/index.ts` | 공통 매핑 export 추가 |
| KPA `StoreOrdersPage.tsx` | 로컬 `STATUS_TABS`/`STATUS_BADGE` 제거 → `BUYER_CHECKOUT_STATUS_TABS` + `getBuyerCheckoutStatusDisplay`+`BUYER_CHECKOUT_TONE_HEX`(badge 렌더) |
| KCos `StoreOrdersPage.tsx` | 로컬 `STATUS_TABS`/`STATUS_LABEL` 제거 → 공통 매핑. 목록·상세 status badge + paymentStatus 컬럼/상세를 `getBuyerPaymentStatusLabel` 로(영문 raw 제거) |
| GP `PharmacyOrders.tsx` | `deriveState` 파생 로직(payment-aware) **유지**, 라벨만 canonical 정렬(결제 완료/결제 대기/주문 취소/환불 완료). 탭 라벨 동일 정렬 |

## 6. 공통 mapping 추출 여부/근거 (Phase 2 판단)
- **추출 적용**: 3서비스 동일 import 가능(store-ui-core 의존 확인) + 문자열/tone 매핑만이라 checkout 타입 의존 없음 + 순환 의존 없음 → §2 판단 기준 충족 → 공통 패키지에 둠(서비스별 중복 회피).
- badge 색은 서비스별 시스템 상이(KPA/KCos inline hex, GP color-name+icon)라 **tone(의미)**만 공통화하고 색 적용은 각 서비스 로컬(KPA/KCos는 `BUYER_CHECKOUT_TONE_HEX`, GP는 기존 color-name 유지) — 라벨/의미 통일이 목표(색 강제 통일은 본 WO 범위 밖).

## 7. 검증
- **TypeScript**: `@o4o/web-kpa-society` `tsc --noEmit` → 0 · `@o4o/web-k-cosmetics` → 0 · `glycopharm-web` → 0.
- **정적**: buyer 주문 목록 3페이지 **UI 표시 텍스트**에 seller 문구(판매자 관점/매출/판매 이행/출고/배송 준비) **0**(매칭은 파일 헤더 주석의 이력 설명뿐 — UI 아님). 동일 raw status → 동일 canonical 라벨(KPA/KCos 공통 util 경유, GP 인라인 정렬) 확인.
- **무변경**: backend(kpa-checkout/glycopharm/cosmetics controller)·DB·migration·response shape·주문/결제 상태 전이 로직 — 무변경. seller client 함수·`StoreOrderDetailDrawer`(보존분) 무변경.

## 8. 제외 (무변경)
```
backend enum / DB / migration / 상태 전이·결제 로직 / 주문 취소·환불·결제 API
seller 받은 주문/판매 이행 화면(미생성) / buyer 주문 화면 전체 공통 컴포넌트 추출(후속)
pagination/responsive 전수 수정 / badge 색 강제 통일
GP deriveState 의 payment-aware 파생 로직(라벨만 정렬, 로직 보존)
```

## 9. 완료 기준 체크 (WO §11)
1(3서비스 라벨 동일 기준 정렬) ✅. 2(created/pending_payment/paid/cancelled 문구 통일) ✅. 3(seller 문구 UI 잔존 0) ✅. 4(backend/DB/migration 무변경) ✅. 5(상태 전이 로직 무변경) ✅. 6(3 web typecheck PASS) ✅. 7(CHECK) ✅. 8(path-specific commit) ✅(예정).

## 10. 후속
1. `WO-O4O-STORE-BUYER-ORDERS-COMMON-COMPONENT-EXTRACTION-V1` — buyer 구매내역 공통 컴포넌트 추출(이제 라벨/매핑 정합 → 공통 util 재사용 가능).
2. `IR-O4O-STANDARD-TABLE-PAGINATION-RESPONSIVE-COVERAGE-V1`.
3. `IR-O4O-STORE-SELLER-ORDER-FULFILLMENT-NEED-V1` — seller 수요/별도 IA.
4. (선택) badge 색 tone 기반 공통화(공통 컴포넌트 추출 시).

---

*Date: 2026-06-12 · WO-O4O-STORE-CHECKOUT-STATUS-LABEL-ALIGNMENT-V1 · 3서비스 buyer checkout 상태 라벨 공통 정렬(@o4o/store-ui-core buyerCheckoutStatus). web typecheck 0. backend/DB/상태로직 무변경. GP deriveState 로직 보존(라벨만 정렬).*
