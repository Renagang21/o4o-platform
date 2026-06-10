# CHECK-O4O-EVENT-OFFER-PARTICIPATE-LEGACY-DEMOTION-V1

> `WO-O4O-EVENT-OFFER-PARTICIPATE-LEGACY-DEMOTION-V1` 결과.
> 이벤트오퍼 `participate()` 를 buyer 주문 canonical entry 에서 **legacy/internal 호환 경로로 격하**
> (삭제 아님, 동작·에러코드 보존). 신규 buyer 주문 entry = Store Cart checkout-confirm.
> **판정: PASS** — buyer UI 직접 호출 0건 확인 + legacy 주석 표시 + tsc 4영역 0. — 2026-06-09

---

## 1. 작업 성격
저위험 정리. 주문 생성/검증/차감/정산/배송/route **로직 무변경**, **주석(@deprecated/legacy)만 추가**.
participate route·response·에러코드 미변경. 삭제는 후속 RETIREMENT-V2 조건 충족 후.

## 2. 검색 키워드 / 호출처 결과

검색: `.participate(`, `participate:`, `/event-offer(s)`, `checkout-confirm`, `reserveEventOfferListing`.

| 영역 | 결과 |
|------|------|
| **buyer UI 직접 `.participate(` 호출** (web-kpa-society / web-glycopharm / web-k-cosmetics / web-neture, api client 정의 제외) | **0건** ✅ |
| frontend api client `participate:` 정의 | 3곳 (kpa `eventOffer.ts:65`, glyco `:69`, kcos `:76`) — legacy 표시 대상 |
| backend `service.participate(` 호출 | 컨트롤러 route 핸들러뿐 (KPA `event-offer.controller:136`, Glyco `:100`, Cosmetics `:376`) |
| backend `async participate(` 정의 | `routes/kpa/services/event-offer.service.ts:604` (Glyco/KCos 가 service_key 만 바꿔 공유 재사용) |
| checkout-confirm 의존 helper | `loadEventOfferContext` / `reserveEventOfferListing` / `incrementListingQuantity` (participate 와 공유) ✅ |

→ **buyer 주문은 이미 cart 흐름. participate 직접 호출은 frontend/backend 모두 buyer 경로에 없음.**

## 3. 변경 파일 (7, 주석만)

| 파일 | 표시 |
|------|------|
| `apps/api-server/src/routes/kpa/services/event-offer.service.ts` | `participate()` jsdoc 에 @deprecated + canonical=checkout-confirm 명시 |
| `apps/api-server/src/routes/kpa/controllers/event-offer.controller.ts` | `/:id/participate` route @deprecated legacy 주석 |
| `apps/api-server/src/routes/glycopharm/controllers/event-offer.controller.ts` | 동일 |
| `apps/api-server/src/routes/cosmetics/controllers/event-offer.controller.ts` | 동일 |
| `services/web-kpa-society/src/api/eventOffer.ts` | `participate` method @deprecated |
| `services/web-glycopharm/src/api/eventOffer.ts` | 동일 |
| `services/web-k-cosmetics/src/api/eventOffer.ts` | 동일 |

> runtime response header/log 변경은 하지 않음(기존 client 영향 회피 — WO §6.4 권장대로 주석+CHECK 중심).

## 4. 검증
- **buyer UI participate 직접 호출 0건** (grep, §2) ✅
- **tsc**: api-server 0 · web-kpa-society 0 · web-glycopharm 0 · web-k-cosmetics 0 ✅
- **회귀**: participate route/service/에러코드 무변경(주석만), checkout-confirm·StoreCartPage·cart add 무변경 ✅

## 5. 잔존 legacy/internal 호출처 (격하 표시됨, 미삭제)
- KPA/Glyco/Cosmetics `POST /:id/participate` route — 운영/테스트/외부 호환용으로 유지.
- **Neture event-offer 컨트롤러**(`routes/neture/controllers/event-offer.controller.ts`)에도 participate route 존재 — 본 WO 3서비스 범위(KPA/Glyco/KCos) 밖이라 주석 미적용. Neture event-offer 는 STORE_SERVICE_KEY_MAP 미적용(지원 허브)으로 별도 취급. 후속 정리 시 함께 검토.

## 6. 후속 삭제 조건 (RETIREMENT-V2)
route 실제 삭제는 다음 충족 후: 외부 client 호출 0건 일정기간 확인 · operator/admin/test 경로도 checkout-confirm/내부 helper 전환 · API consumer 공지 · 로그 모니터링 0건. → `WO-O4O-EVENT-OFFER-PARTICIPATE-ROUTE-RETIREMENT-V2`. 현재 V1 미삭제.

## 7. 완료 기준 체크 (WO §10)
1. 호출처 전수 검색 완료 ✅
2. KPA/Glyco/KCos buyer UI 직접 호출 0건 확인 ✅
3. 남은 직접 호출 cart 전환 — 해당 없음(이미 0건) ✅
4. backend service/controller legacy 주석 ✅
5. frontend client @deprecated 주석 ✅
6. participate 동작/에러코드 무변경 ✅
7. checkout-confirm 무변경 ✅
8. tsc 통과 ✅
9. CHECK 기록 ✅
10. path-specific commit ✅
11. 다른 세션 WIP 무접촉 ✅

---

*Date: 2026-06-09 · Status: PASS (participate = legacy/internal 호환 경로로 격하, 삭제는 RETIREMENT-V2)*
