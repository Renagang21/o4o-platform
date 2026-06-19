# CHECK-O4O-MARKET-TRIAL-PRODUCTID-LEGACY-POLICY-V1 (P3-2c)

> **유형**: Documentation CHECK — `market_trials.productId` legacy 정책 고정.
> **WO**: `WO-O4O-MARKET-TRIAL-PRODUCTID-LEGACY-POLICY-V1`
> **성격**: 문서 저장 전용. 코드/DB/API/UI **무변경**.
> **작성일**: 2026-06-19
> **결과**: **PASS** — 정책 문서 작성. 코드/DB 무변경.

---

## 1. 산출물
- `docs/architecture/O4O-MARKET-TRIAL-PRODUCTID-LEGACY-POLICY-V1.md` (canonical 정책)

## 2. 정책 요약
- **productId = optional·nullable legacy 소재 참조.** 제품 전환·주문·OPL·정산·배송 연결 키가 **아니다.**
- 신규 펀딩 생성 시 **optional**(필수 validation 금지). 부재로 생성/검수/모집/콘텐츠 차단 불가.
- "productId 있음 ≠ 제품 기반 펀딩 / 전환 / SPO 연결 / 주문 가능 상품 / 매장 진열".
- 화면: 공급자/운영자 "참고 제품" read-only 표시 허용("전환/연결/주문/공급/진열 상품" 표현 금지), 참여자 기본 미노출.
- DB: nullable 유지, NOT NULL/필수화/자동 join 확대 금지. 제거는 §7 4조건 충족 후.
- settlement/payment 와 무관(productId 기반 정산 금지).
- content-only 원칙과 **무충돌**(소재 표시일 뿐).

## 3. productId 유지 이유
P3-2b에서 전환 7컬럼은 drop했으나 productId는 전환 컬럼이 아니라 **콘텐츠 소재 참조**(IR 분류 B). 현재 `toTrialDTO`/`toOperatorTrialDTO` 가 productId+product(TrialProductRef) 를 표시 전용으로 반환 → 제거 시 frontend 표시 cascade. 데이터는 0(null)이나 표시 기능 보존 위해 유지.

## 4. 금지 사용 패턴 (문서화됨)
```
제품 선택 없이 펀딩 생성 불가 / 상품 drawer·목록에서 펀딩 생성 진입 / ProductMaster 본문 자동 주입 /
SPO 가격 자동 사용 / productId 기준 OPL·주문·정산·배송 생성 / 필수 validation·approval·participation gate
```

## 5. 무변경 확인
```
코드 — 변경 없음
DB migration — 없음
productId drop/validation 변경 — 없음
API response / UI — 변경 없음
운영 데이터 — 변경 없음
다른 세션 WIP(pricing 문서 등) — 미접촉(path-specific commit)
```

## 6. 검증 기준 (WO §13 충족)
```
productId 제품 전환 컬럼 아님 명시 — ✅ (§0,§3)
optional legacy reference 명시 — ✅ (§2)
productId 없이 생성 가능 명시 — ✅ (§4)
필수 validation 금지 명시 — ✅ (§4,§6)
ProductMaster/SPO 연결 금지 — ✅ (§3)
OPL/order/payment/shipping 연결 금지 — ✅ (§3,§6,§8)
참여자 화면 기본 미노출 — ✅ (§5)
content-only 무충돌 — ✅ (§9)
후속 제거 검토 조건 — ✅ (§7)
코드/DB/API/UI 무변경, 문서만 — ✅
```

## 7. 후속
- **P3-3** `WO-O4O-MARKET-TRIAL-OFFLINE-SETTLEMENT-PAYMENT-POLICY-V1` — 마지막 문서성 작업(offline settlement/payment 운영 정책).

---

*Date: 2026-06-19 · 문서 CHECK(P3-2c) · productId legacy 정책 고정 · 코드/DB 무변경 · 다른 세션 WIP 미접촉.*
