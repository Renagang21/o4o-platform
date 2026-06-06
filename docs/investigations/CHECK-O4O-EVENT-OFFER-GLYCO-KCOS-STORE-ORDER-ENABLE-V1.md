# CHECK-O4O-EVENT-OFFER-GLYCO-KCOS-STORE-ORDER-ENABLE-V1

> **WO**: `WO-O4O-EVENT-OFFER-GLYCO-KCOS-STORE-ORDER-ENABLE-V1`
> **선행 조사**: `docs/investigations/IR-O4O-EVENT-OFFER-CURRENT-STATE-AUDIT-V1.md`
> **성격**: Fix Phase — GlycoPharm·K-Cosmetics 매장 허브 이벤트 오퍼 화면의 비활성 주문 버튼을 기존 participate API에 연결하여 바로 주문 활성화. **백엔드 무변경**.
> **작성일**: 2026-06-06
> **결과**: PASS (정적 + TypeScript). 라이브 주문 스모크는 보류(사유 §6).

---

## 1. 작업 요약

매장 경영자가 `/store-hub/event-offers`에서 승인·진행 중인 이벤트 오퍼를 **관심/참여 신청 없이 바로 주문**할 수 있도록, GlycoPharm·K-Cosmetics의 `disabled` "추가 (준비 중)" 버튼을 활성 "바로 주문" 버튼으로 교체하고 기존 백엔드 `participate` 엔드포인트에 연결했다.

- 백엔드 route·로직 변경 없음 (이미 존재: `POST /api/v1/{glycopharm|cosmetics}/event-offers/:id/participate`).
- `participate()`는 관심/수요조사가 아니라 `checkoutService.createOrder()`로 즉시 실주문 생성 (IR §1 확인).
- KPA `KpaEventOfferPage.handleDirectOrder` 패턴 답습(성공 toast + 목록 refresh, navigation 없음).

---

## 2. 수정 파일 목록 (4)

| 파일 | 변경 |
|---|---|
| `services/web-glycopharm/src/api/eventOffer.ts` | `participate(id, quantity=1)` 메서드 + `EventOfferOrderResult/Response` 타입 추가. `listActive` 불변. |
| `services/web-glycopharm/src/pages/hub/HubEventOffersPage.tsx` | `toast` import · `orderingId` state · `handleOrder` 핸들러 · disabled 버튼 → 활성 "바로 주문"(teal, 로딩 스피너, 중복클릭 방지). |
| `services/web-k-cosmetics/src/api/eventOffer.ts` | 동일 `participate` + 타입 추가. |
| `services/web-k-cosmetics/src/pages/hub/HubEventOffersPage.tsx` | 동일 wiring (pink accent). |

신규 CHECK 문서 1건 포함.

---

## 3. 변경 상세

### 3.1 API client (양 서비스 동형)
```ts
participate: (id: string, quantity = 1) =>
  api.post<EventOfferOrderResponse>(`/{svc}/event-offers/${id}/participate`, { quantity }),
```
- `{svc}` = `glycopharm` | `cosmetics`.
- 응답: `{ success, data: { orderId, orderNumber, status, totalAmount } }` (HTTP 201) — 백엔드 controller와 일치 확인.

### 3.2 페이지 핸들러 (양 서비스 동형)
```ts
const handleOrder = useCallback(async (offer) => {
  if (orderingId) return;            // 중복 클릭 방지
  setOrderingId(offer.id);
  try {
    await {svc}EventOfferApi.participate(offer.id, 1);
    toast.success(`"${offer.productName}" 주문이 완료되었습니다.`);
    await loadOffers();              // 잔여 수량 반영
  } catch (err) {
    toast.error(err?.response?.data?.error?.message || err?.message || '주문에 실패했습니다.');
  } finally {
    setOrderingId(null);
  }
}, [orderingId, loadOffers]);
```

### 3.3 버튼
- before: `disabled` + `title="주문 제품 추가는 준비 중입니다."` + 라벨 `추가 (준비 중)`.
- after: `onClick={() => handleOrder(offer)}` + `disabled={orderingId === offer.id}` + 라벨 `바로 주문`(처리 중 `주문 중...` + 스피너) + `title="이벤트 오퍼를 바로 주문합니다."`.

---

## 4. 백엔드 / API client 변경 여부
- **백엔드 변경: 없음.** 기존 participate route·서비스 로직 재사용.
- **API client 변경: 있음(프론트 전용).** 각 서비스 `eventOffer.ts`에 participate 메서드/타입 신규 export (기존 `listActive` 계약 불변).

---

## 5. TypeScript 검증

| 서비스 | 명령 | 결과 |
|---|---|---|
| web-glycopharm | `tsc --noEmit -p tsconfig.app.json` | **PASS** (exit 0) |
| web-k-cosmetics | `tsc --noEmit` | **PASS** (exit 0) |

- route import/export 오류 없음. unused import 없음(`ShoppingCart`/`Loader2` 모두 사용).

---

## 6. 동작 검증 (라이브 스모크) — 보류

**미실시 사유 (의도적)**: "바로 주문" 버튼 클릭은 프로덕션 DB에 **실주문을 생성**한다 — `checkoutService.createOrder()` + `total_quantity` 원자적 차감 + 매장 상품 자동 등록(best-effort). 되돌리기 어려운 outward 부작용이므로, 사용자 명시 승인 없이 운영 환경에서 실주문 스모크를 수행하지 않는다.

대체 검증:
- 정적 분석: participate 경로/요청 body(`{quantity}`)/응답 envelope가 백엔드 controller([glycopharm event-offer.controller.ts:91-114](apps/api-server/src/routes/glycopharm/controllers/event-offer.controller.ts#L91-L114))와 일치 확인.
- KPA(`eventOfferApi.participate` → `/groupbuy/:id/participate`)와 동일 계약·동일 코어 `EventOfferService.participate()` 사용 → KPA 기존 동작과 동형.
- TypeScript PASS.

> 운영자가 승인한 실제 이벤트 오퍼 + store_owner 계정으로 라이브 주문 확인을 원하면 별도 승인 하에 수행한다. (참고: K-Cos store_owner 테스트 계정 부재 — IR/메모리 기록.)

---

## 7. 정책 검증 (WO §9.3)

| 항목 | 결과 |
|---|---|
| 관심/참여 신청 UI 신규 추가? | ❌ 없음 (즉시 주문만) |
| 이벤트 오퍼 전용 홍보 페이지 신규? | ❌ 없음 |
| `/store-hub/event-offers` 독립 페이지 유지? | ✅ 유지 (탭 이전 안 함) |
| Neture 대상 이벤트 오퍼 추가? | ❌ 없음 |
| Neture 운영자 승인 흐름 추가? | ❌ 없음 |
| 원본 상품 가격 변경 로직 추가? | ❌ 없음 (event_price 백엔드 불변) |
| 공급자별 물류비 grouping 혼입? | ❌ 없음 (별도 후속 트랙 유지) |
| 사용자-facing 문구 주문 중심? | ✅ "바로 주문" / "주문이 완료되었습니다" — "참여 신청"·"준비 중" 제거 |

---

## 8. 범위 밖 (이번 WO 미포함)
- KPA Society 화면 개편(기존 주문 흐름 보유 → 대상 외).
- 공급자별 물류비/무료배송 grouping (IR §9-D / WO §11 제외 — 별도 후속 WO).
- 노출 위치 탭 vs 독립 페이지 정책 충돌 → **결정됨(2026-06-06): 독립 페이지 유지** (IR §9-A, baseline `EVENT-OFFER-STORE-INTEGRATION-V1 §13.4` 반영). 본 WO는 그 결정대로 독립 페이지 유지.
- GlycoPharm·K-Cos 공급자 생성 화면(Neture 경유 설계 — 부재가 정합).

---

## 9. 완료 판정 (WO §12)

| 조건 | 충족 |
|---|---|
| Glyco `/store-hub/event-offers` 주문 버튼 활성화 | ✅ |
| K-Cos `/store-hub/event-offers` 주문 버튼 활성화 | ✅ |
| 버튼 클릭 시 기존 participate API 호출 | ✅ |
| 사용자-facing 문구 주문 중심 | ✅ |
| 관심/참여 신청 단계 없음 | ✅ |
| Neture 대상 이벤트 오퍼 미추가 | ✅ |
| 이벤트 오퍼 독립 페이지 구조 유지 | ✅ |
| TypeScript 검증 통과 | ✅ (glyco·kcos PASS) |
| CHECK 문서 작성 | ✅ (본 문서) |

→ **WO 완료 조건 충족** (라이브 주문 스모크만 안전상 보류, §6).
