# IR-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-AUDIT-V1

> **유형:** read-only 조사 — 코드/DB/API/UI 변경 0.
> **대상:** Neture 공급자 온보딩의 서류·정산·통신판매업 항목이 **실제 어느 단계에서 필수인지** + 승인 게이트 완화(D2) 가능 여부.
> **핵심 결론: A안(완화 가능) — 단 "삭제"가 아니라 "후단계 게이트로 이동". 정산 6필드(정산은행/계좌/예금주/통장사본/사업자등록증PDF/세금계산서이메일)는 모두 `approveSupplier`(PENDING→ACTIVE) 단일 게이트에만 묶여 있고, 정산 서비스·상품·주문 어디서도 소비되지 않음(컴플라이언스/참조용). 통신판매업은 이미 비차단. 단 ACTIVE가 상품 등록을 여는 유일한 관문이라, 무작정 빼면 컴플라이언스 자료가 어디서도 안 걷힘 → 후단계(판매가능/정산 전) 게이트 신설이 전제.**
> 선행: WO D1(`...PROFILE-SYNC...V1`) seed 완성 — 2026-06-18

---

## 1. 조사 요약

- 공급자 승인은 **2단계**: ① 등록 승인(`approveRegistration`, PENDING supplier 생성, **서류 게이트 없음**) ② 공급 승인(`approveSupplier`, PENDING→ACTIVE, **여기에 서류 게이트**).
- ACTIVE 전환 게이트(`getMissingBasicOnboardingFields`)가 6개 항목을 **필수**로 막음. 통신판매업은 의도적으로 제외(비차단).
- 6개 항목은 **상품 등록/주문/정산 로직 어디서도 소비되지 않음** — 저장·운영자 참조용.
- 그러나 **모든 상품 쓰기가 supplier ACTIVE 요구** → 서류 게이트가 ACTIVE를 통해 상품 등록을 간접 차단.

## 2. 현재 승인/활성화 게이트 구조

| 단계 | 함수 | 서류/정산 게이트 |
|------|------|------|
| 등록 승인(가입) | `operator-registration.service.approveRegistration` (90-242) | **없음** — PENDING supplier 생성 + businessInfo seed |
| 공급 승인(활성화) | `supplier.service.approveSupplier` (111-164) | **있음** — `getMissingBasicOnboardingFields` 미충족 시 `ONBOARDING_INCOMPLETE` |
| 상품 등록/수정/승인요청 | `supplier-product.controller` (75/168/190/213/252…) + `createSupplierOffer` (820) | `requireActiveSupplier` + `status===ACTIVE` (간접) |
| 주문/B2B 체크아웃 | — | 서류 게이트 없음 |
| 정산/payout | `neture-settlement.service` (153-237) | 서류·계좌 필드 **미참조** |

**ACTIVE 게이트 필수 6항목** (`getMissingBasicOnboardingFields`, supplier.service.ts:1180-1193):
1. `businessRegistrationDocumentId` (사업자등록증 PDF)
2. `settlementBankName`
3. `settlementAccountNumber`
4. `settlementAccountHolder`
5. `settlementBankbookDocumentId` (통장사본 PDF)
6. `taxInvoiceEmail` (+ email 형식)

## 3. 항목별 실제 필수 시점 (실측)

| 항목 | 현재 강제 단계 | 다운스트림 소비 | frontend 필수표시 |
|------|:--:|:--:|:--:|
| 사업자등록증 PDF | 공급 승인(ACTIVE) BLOCK | 없음 | ✅ * (SupplierProfilePage:665) |
| 통장사본 PDF | 공급 승인 BLOCK | 없음(정산서비스 미참조) | ✅ * (694) |
| 정산은행 | 공급 승인 BLOCK | 없음 | ✅ * (606) |
| 정산계좌 | 공급 승인 BLOCK | 없음 | ✅ * (616) |
| 예금주 | 공급 승인 BLOCK | 없음 | ✅ * (629) |
| 세금계산서 이메일 | 공급 승인 BLOCK | 없음(등록 시 businessInfo seed) | ✅ * (580) |
| 통신판매업 상태/번호/증 | **비차단**(운영자 확인용) | 없음 | ⚠️ 조건부(status='reported' 시 번호 *) |

## 4. frontend required vs backend 실제 게이트

- **일치**: 위 6항목은 frontend `*` + backend ACTIVE 게이트 BLOCK으로 일관. 운영자 `OperatorSupplierApprovalPage`(44-54, 283-284)는 `onboardingComplete` 아니면 **활성화 버튼 disabled**.
- **통신판매업**: frontend 조건부 필수(`status='reported'`면 번호 필수)지만 backend ACTIVE 게이트엔 **미포함**(저장 검증만, 승인 비차단).
- 즉 "승인 전 필수"로 보이는 6항목은 실제로도 ACTIVE 전 필수(불일치 없음). 문제는 **그 필수가 과한가**.

## 5. DB/entity nullable 상태

- `NetureSupplier`(entity 103-138): 6항목 전부 **`nullable: true`**. status enum: PENDING/ACTIVE/INACTIVE/REJECTED.
- 통신판매업(`mail_order_sales_status/registration_number`): nullable.
- → 스키마는 이미 optional. 게이트 완화는 **스키마 변경 불필요**(애플리케이션 게이트 조정만).

## 6. 결제·정산·상품등록 영향도 (핵심 안전성)

- **정산(payout)**: `neture-settlement.service`는 정산은행/계좌/예금주/통장사본을 **읽지 않음**(grep 0). 정산 계산은 주문/배송확정/결제 메타만 사용. → 이 필드들을 ACTIVE 게이트에서 빼도 **정산 로직 무영향**.
- **상품 등록**: `requireActiveSupplier` + `createSupplierOffer status!==ACTIVE→SUPPLIER_NOT_ACTIVE`. → 게이트를 완화해 ACTIVE를 빨리 주면 **서류 없이 상품 등록 가능**. 상품은 정산 필드 미소비라 기능상 문제 없음.
- **주문/체크아웃**: 서류 게이트 없음.
- ⚠️ **컴플라이언스 공백 위험**: 6항목은 현재 "수집은 되지만 미사용"(법무/세무 대비 보관). ACTIVE 게이트에서 제거하고 **후단계 게이트를 신설하지 않으면**, 사업자등록증/정산계좌가 **어디서도 강제 수집되지 않음** → 향후 자동 정산·세금계산서 발행 도입 시 데이터 부재.

## 7. D2 구현 가능 범위 (완화 가능 항목)

| 항목 | 권장 분류(이동 목표) | 안전성 |
|------|------|:--:|
| 사업자등록번호/사업자명/대표자/담당자/연락처/주소 | **가입 승인 전 필수**(유지, D1로 seed됨) | — |
| 세금계산서 이메일 | 가입 시 seed됨 → 유지 가능(또는 판매가능 전) | 안전 |
| 사업자등록증 PDF | **판매 가능(ACTIVE) 전 → 상품 등록/판매 가능 게이트로 이동** | 안전(미소비) |
| 정산은행/계좌/예금주 | **정산 전 게이트로 이동** | 안전(미소비) |
| 통장사본 PDF | **정산 전 게이트로 이동** | 안전(미소비) |
| 통신판매업 정보 | 이미 비차단 — 판매 형태별 조건부(운영자 검토) 유지 | 안전 |

→ **승인(ACTIVE) 게이트 = 기본 사업자 정보만**으로 완화 가능. 나머지는 "판매 가능 전 / 정산 전" 게이트로 이동.

## 8. 보류해야 할 항목 (주의)

- **정산 필드를 단순 "삭제"하면 안 됨** — 현재 유일 수집 지점이라, 후단계 게이트(정산 등록/첫 payout 전) 신설이 **전제**. 신설 없이 제거 시 컴플라이언스 데이터 공백.
- **사업자등록증 PDF**: ACTIVE에서 빼면 상품 등록이 서류 없이 열림 → "상품 등록 전" 또는 "판매 가능 전" 게이트를 동시에 신설해야 정책 유지.
- 자동 정산/세금계산서 발행 로드맵이 있으면, 그 흐름이 이 필드를 **읽도록** 먼저 설계 후 게이트 이동.

## 9. 권장 구현 순서 (후속 WO)

`WO-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-RELAXATION-V1` (A안):
1. `getMissingBasicOnboardingFields`를 **기본 사업자 정보 중심**으로 축소(ACTIVE 게이트 경량화). 세금계산서 이메일은 유지 검토.
2. **판매 가능 전 게이트 신설**: 사업자등록증 PDF(필요 시) — 상품 등록 또는 첫 노출 전.
3. **정산 전 게이트 신설**: 정산은행/계좌/예금주/통장사본 — 첫 payout/정산 등록 전(현재 payout 미구현이면 "정산 등록" 화면 진입 게이트).
4. frontend `*` 필수표시를 단계별로 재배치(SupplierProfilePage: 정산/문서 섹션을 "정산 시작 전 필요" 안내로).
5. 통신판매업: 현행 유지(비차단).

## 10. 회귀 위험

- ACTIVE 게이트 완화 → 기존 "서류 다 받고 승인" 운영 가정 변경. 운영자 화면 `onboardingComplete` 표시 로직 재정의 필요.
- 후단계 게이트 미신설 시 컴플라이언스 공백(상기 §8).
- 상품 등록이 서류 없이 열리므로, 노출/판매 단계 정책(사업자등록증·통신판매업) 재확인.
- 정산 자동화 도입 시 필드 부재 가능 → 로드맵 확인.

## 11. smoke 필요 항목 (후속 WO 시)

- 신규 공급자: 기본 정보만으로 ACTIVE 승인 가능 확인.
- ACTIVE 후 상품 등록 가능 + 정산/문서 미입력 상태에서 정산 진입 시 후단계 게이트 동작.
- 기존 ACTIVE 공급자 회귀(이미 서류 보유) 무영향.
- 운영자 승인 화면 표시 정합(필수 항목 축소 반영).

---

## 결론: **A안 (승인 게이트 완화 가능)** — 조건부

승인(ACTIVE) 게이트는 **기본 사업자 정보만**으로 완화 가능하다. 정산은행/계좌/예금주/통장사본/사업자등록증 PDF는 현재 **어떤 다운스트림 로직도 소비하지 않으므로**(정산 서비스 미참조 확인) ACTIVE 게이트에서 분리해도 기능상 안전하다. 단 **삭제가 아니라 "판매 가능 전 / 정산 전" 후단계 게이트로 이동**해야 컴플라이언스 데이터 수집이 유지된다(후단계 게이트 신설이 D2의 전제). 통신판매업은 이미 비차단이라 추가 작업 불요.

→ 후속: `WO-O4O-NETURE-SUPPLIER-ACTIVATION-DOCUMENT-GATE-RELAXATION-V1` (§9 순서). 정산 자동화 로드맵 유무를 먼저 확인 권장.

## 준수 확인

```
✅ read-only — 코드/DB/API/UI/migration 변경 0
✅ 정적 분석만(운영 데이터 미조회), 산출물 = 본 문서 1개(path-specific)
```

---

*read-only · 6항목(사업자등록증PDF/정산은행·계좌·예금주/통장사본/세금계산서이메일)=approveSupplier(ACTIVE) 단일 게이트만, 정산·상품·주문 미소비(컴플라이언스 보관용) · 통신판매업=비차단 · ACTIVE가 상품등록 유일 관문 → 완화 가능하나 후단계(판매가능/정산 전) 게이트 신설 전제(A안) · 스키마 nullable라 게이트 조정만 · 후속 WO=ACTIVATION-DOCUMENT-GATE-RELAXATION-V1.*
