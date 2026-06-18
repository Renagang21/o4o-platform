# CHECK-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-RELAXATION-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-RELAXATION-V1
> **유형:** backend 2 + frontend 4파일 — 게이트 재배치(삭제 아님). DB/migration 무변경(전 항목 nullable).
> **결과: PASS(코드/타입) — ACTIVE 승인 게이트를 기본 사업자 정보만으로 완화. 사업자등록증=판매 전(상품 승인요청) 게이트, 정산정보/통장사본/세금계산서이메일=정산 전(분리·표시). api-server tsc 0 / web-neture tsc 0. 라이브 smoke는 배포 후.**
> 선행: IR-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-AUDIT-V1 (A안) — 2026-06-18

---

## 1. 변경 요약 / IR 반영

IR(A안) 결론대로 6개 서류·정산 항목을 **ACTIVE 승인 게이트에서 제거하고 후단계로 재배치**(삭제 아님). 정산 서비스 미소비 확인 근거.

| 항목 | 변경 전(필수 단계) | 변경 후(필수 단계) |
|------|------|------|
| 대표자명/담당자명/담당자연락처 | (암묵) | **ACTIVE 승인 전 필수** |
| 사업자등록증 PDF | ACTIVE 승인 전 | **판매 전(상품 승인요청)** |
| 정산은행/계좌/예금주 | ACTIVE 승인 전 | **정산 전** |
| 통장사본 PDF | ACTIVE 승인 전 | **정산 전** |
| 세금계산서 이메일 | ACTIVE 승인 전 | **정산 전** |
| 통신판매업 | 비차단 | 비차단(유지) |

## 2. Backend 변경 (2파일)

### `supplier.service.ts`
- `getMissingBasicOnboardingFields`(단일 6항목) → **3분리**:
  - `getMissingActivationFields(supplier)` — representativeName/managerName/managerPhone (ACTIVE 게이트).
  - `getMissingSaleFields(supplier)` — businessRegistrationDocument (판매 전).
  - `getMissingSettlementFields(supplier)` — settlementBank/Account/Holder/Bankbook + taxInvoiceEmail (정산 전).
- `approveSupplier`: `getMissingActivationFields`만 사용 → 서류·정산 미제출이어도 ACTIVE 가능(기본 정보만 차단).

### `offer.service.ts` — 판매 전 게이트
- `submitForApproval`: 공급자 `business_registration_document_id` 1회 조회 → 미제출 시 각 offer를 **`SUPPLIER_BUSINESS_REGISTRATION_REQUIRED`** 로 skip(판매 진입 차단). 기존 품목군/서비스키/약국 게이트와 동일 skip 구조.

## 3. Frontend 변경 (4파일)

- **OperatorSupplierApprovalPage / AdminSupplierApprovalPage**: `getMissingOnboardingItems`(6항목 차단) → `getDeferredItems`(판매 전/정산 전 분류, **비차단**) + `describeDeferred`. 활성화 버튼 `disabled`는 **기본 정보(`representativeName`)만** 기준(`activationReady`). 미완료 항목은 "판매 전 필요: … · 정산 전 필요: …" 안내로 표시(승인 차단 오해 제거).
- **SupplierProductsPage**: 결과 banner reason 맵에 `SUPPLIER_BUSINESS_REGISTRATION_REQUIRED`(상태/다음작업 + 공급자 프로필 CTA) 추가.
- **SupplierProfilePage**: Section A-2 안내문을 단계별로 재작성 — "승인은 기본 정보만으로 가능 / 판매 전: 사업자등록증 / 정산 전: 정산정보·통장사본·세금계산서 이메일".

## 4. 게이트 위치 요약

- **ACTIVE 승인**: `approveSupplier` → `getMissingActivationFields`(기본 정보).
- **판매 전**: `offer.service.submitForApproval`(사업자등록증). 상품 draft/생성은 미차단(ACTIVE만 요구).
- **정산 전**: `getMissingSettlementFields` helper 제공(표시/후속 정산 진입점용). 현재 payout 미구현이라 **신규 차단 로직·payout 미생성**(WO 금지 준수) — helper + frontend 안내까지.

## 5. 준수 / 비범위

- ✅ DB migration 추가 0(6항목 모두 nullable). nullable 강제 변경 0. payout 신규 구현 0. 통신판매업 게이트 강화 0. 품목군 증빙 구조 변경 0(D3 별도).
- ✅ path-specific. 다른 세션 WIP 무접촉.

## 6. 검증

- **api-server `tsc --noEmit`: EXIT 0** (supplier.service/offer.service).
- **web-neture `tsc --noEmit`: EXIT 0** (4파일).
- 정적: 판매 전 게이트는 기존 skip 구조 재사용(품목군 banner와 동일 reason 처리). 승인 화면 버튼은 representativeName 기준으로만 차단(D1 seed로 보장).

### 배포 후 smoke (권장)
1. 신규 공급자 가입 → 기본 정보만 입력 → 운영자 등록 승인.
2. 사업자등록증/정산정보/통장사본 **없이** 공급 승인(ACTIVE) 가능 확인(승인 화면 버튼 활성, "판매 전/정산 전 필요" 안내 표시).
3. 상품 draft 작성 가능 확인.
4. 상품 승인요청 시 사업자등록증 미제출 → banner "사업자등록증 미제출" + 프로필 CTA.
5. 사업자등록증 제출 후 승인요청 정상.
6. 기존 ACTIVE 공급자(서류 보유) 회귀 없음.

## 7. 회귀 위험 / 보류

- ACTIVE 게이트가 representativeName/managerName/managerPhone 요구 → **legacy pending 공급자**가 이 값 부재 시 새로 차단될 수 있음(기본 정보라 보완 합당; D1 seed 이후 가입자는 충족). 운영 시 legacy pending 점검 권장.
- 정산 전 게이트는 **표시·helper 수준**(실제 차단 지점=향후 정산 진입/payout). 자동 정산 도입 시 `getMissingSettlementFields`를 그 흐름에 연결 필요.
- 사업자등록증: 상품 draft는 허용, 승인요청에서 차단 → "draft까지 했는데 판매 못함" UX는 banner 안내로 커버.

---

*Date: 2026-06-18 · ACTIVE 게이트 완화(기본 정보만) · 사업자등록증=판매 전(submitForApproval skip) · 정산정보/통장사본/세금계산서이메일=정산 전(분리·표시, payout 미생성) · 통신판매업 비차단 유지 · backend 2 + frontend 4 · migration 0 · tsc 0 · 라이브 smoke 배포 후 · D3(품목군) 별도.*
