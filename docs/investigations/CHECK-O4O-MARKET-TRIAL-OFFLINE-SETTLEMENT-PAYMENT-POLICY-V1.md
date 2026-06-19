# CHECK-O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1 (P3-3)

> **유형**: Documentation CHECK — settlement/payment 오프라인 운영 기록 보존 정책 고정.
> **WO**: `WO-O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1`
> **성격**: 문서 저장 전용. 코드/DB/API/UI **무변경**.
> **작성일**: 2026-06-19
> **결과**: **PASS** — 정책 문서 작성. 코드/DB 무변경.

---

## 1. 산출물
- `docs/architecture/O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1.md` (canonical)

## 2. 정책 요약
- settlement/payment = **오프라인 입금 확인 / 펀딩 참여 처리 상태** 운영 기록. **O4O 정식 결제·정산 아님.**
- **삭제 대상 아님** — 컬럼 일괄 drop / 데이터 삭제 / none 초기화 금지. 기존 1건(choice_pending/paid, 2026-06-07) 보존.
- O4O order/payment/settlement/shipment 도메인 + ProductMaster/SPO 가격 + productId 와 **비연결**(자동 계산/생성 금지).
- UI 는 "오프라인 입금 확인 / 펀딩 처리 상태" 표현(= O4O 결제/정산/배송 표현 금지). 현재 라벨 이미 정합.
- content-only 원칙과 **무충돌**(커머스 결제가 아닌 운영 기록).
- 후속은 기능 제거가 아니라 **운영 개선**(입금 확인 UI 정비/용어/감사 로그).

## 3. 유지(삭제 금지) 컬럼
```
contributionAmount · settlementChoice/Status/Amount/ProductQty/Remainder/Note
paymentStatus/Method/Provider/Reference · paidAmount/paidAt/confirmedAt/paymentNote
```

## 4. 무변경 확인
```
코드 / DB migration / 컬럼 삭제 — 없음
운영 데이터 삭제·수정 — 없음
API response / UI — 변경 없음
productId 정책 변경 — 없음
다른 세션 WIP(supplier.ts/ProductDetailDrawer pricing) — 미접촉(path-specific commit)
```

## 5. 검증 기준 (WO §13 충족)
```
삭제 대상 아님 명시 — ✅ (§0,§5)
O4O 정식 결제·정산 아님 명시 — ✅ (§0,§3)
오프라인 입금·펀딩 처리 기록 유지 명시 — ✅ (§2,§4)
삭제 금지 컬럼 목록 — ✅ (§4)
기존 1건 미삭제 — ✅ (§5)
productId 비연결 — ✅ (§8)
O4O order/payment/settlement/shipment 비연결 — ✅ (§7)
UI 표현 기준 — ✅ (§6)
코드/DB/API/UI 무변경, 문서만 — ✅
```

## 6. 후속 (운영 개선, 기능 제거 아님)
오프라인 입금 확인 UI 정비 · 펀딩 처리 상태 용어 정리 · 운영자 메모/감사 로그 정책 · 공급자 별도 안내 문구 · 참여 금액·수량 리포트.

> 이 문서로 유통참여형 펀딩 content-only 전환의 **정책·구조 정리는 종료**. 이후는 운영 개선 단계.

---

*Date: 2026-06-19 · 문서 CHECK(P3-3) · settlement/payment 오프라인 운영 기록 보존 정책 고정 · 코드/DB 무변경 · 다른 세션 WIP 미접촉.*
