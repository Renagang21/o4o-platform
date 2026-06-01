# IR-O4O-KCOSMETICS-STORE-BILLING-SETTLEMENT-DESIGN-V1

**작성 일자**: 2026-06-01  
**조사 환경**: HEAD (main) `82226d6e4` 시점 정적 코드 (read-only)  
**작업 성격**: read-only 조사 — 코드/UI/API/DB/menu 수정 없음  
**선행 컨텍스트**: IR-O4O-KCOSMETICS-STORE-ORDER-BILLING-PLACEHOLDER-AUDIT-V1 D5 항목

---

## 1. 전체 판정

| 영역 | 판정 | 즉시 WO 가능 |
|------|------|------------|
| **실제 정산/인보이스 구현** | **BLOCKED** | ❌ backend entity/API 없음 |
| **주문 기반 매출 요약 (읽기 전용)** | **NEEDS WORK** | ✅ frontend-only 가능 |
| **Placeholder 명확화** | **LOW** | ✅ 즉시 가능 (1줄 수준) |

**핵심 결론:**
- 실제 정산/인보이스는 backend entity · migration · API · 운영 정책이 없어 구현 불가.
- `/cosmetics/orders` 기존 API로 **주문 기반 매출 요약** 화면은 frontend-only로 가능.
- GlycoPharm `StoreBillingPage`도 `pharmacyApi.getOrders()` 기반 mock 수준 — K-Cosmetics가 참조할 수 있으나 "정산 확정" 표현은 사용 금지.
- **즉시 권장**: placeholder 문구 명확화 + 주문 기반 매출 요약(참고용) frontend WO.

---

## 2. 사전 git 상태

```
M docs/investigations/CHECK-O4O-CURRENT-WORKSTREAM-NEXT-SCOPE-AUDIT-V1.md ← 다른 세션 WIP
M services/web-glycopharm/src/pages/operator/ForumRequestsPage.tsx ← 다른 세션 WIP
?? *.png (스크린샷)
staged 없음. 소스 파일 수정 없음.
```

---

## 3. K-Cosmetics Frontend 현재 상태

### 3.1 Route 등록

| 경로 | 현황 | 컴포넌트 |
|------|------|---------|
| `/store/commerce/billing` | ✅ 등록됨 | `StorePlaceholderPage title="정산/인보이스"` |
| Legacy `/store/billing` | Navigate redirect | → `/store/commerce/billing` |

**파일:** `services/web-k-cosmetics/src/App.tsx:673`

### 3.2 StorePlaceholderPage 실제 내용

```
이 기능은 준비 중입니다
```

문구가 이미 "준비 중"임. 사용자가 오해할 가능성은 낮으나, "정산/인보이스" 제목이 기대를 높임.

### 3.3 사이드바 메뉴 노출 상태

**COSMETICS_STORE_CONFIG** (`storeMenuConfig.ts`) 현재 상태:
- 정산/billing 항목 menuSections에 **없음** — 사이드바에서 접근 불가
- App.tsx route는 있으나 메뉴 진입점 없음
- 실질적으로 deep-link로만 접근 가능

→ **현재 사용자에게는 노출되지 않음.** 긴급 조치 필요도 낮음.

---

## 4. K-Cosmetics Backend API 현황

### 4.1 정산/인보이스 backend

`apps/api-server/src/routes/cosmetics/` 전체 탐색:

- billing/settlement/invoice controller: **없음**
- payout/commission 계산 API: **없음**
- `cosmetics.routes.ts`에 billing 마운트: **없음**

### 4.2 기존 API 활용 가능성

현재 존재하는 API에서 정산 관련 데이터 추출 가능성:

| 데이터 | API | 가능성 |
|--------|-----|--------|
| 매출 합계 (paid 주문) | `GET /cosmetics/orders?status=paid` | ✅ 합산 가능 |
| 취소/환불 금액 | `GET /cosmetics/orders?status=cancelled` | ✅ 합산 가능 |
| 채널별(local/travel) 매출 구분 | `GET /cosmetics/orders?channel=local/travel` | ✅ 가능 |
| 수수료 산정 기준 | `metadata.commission.rate` (per-order) | ⚠️ 일부 주문만 존재 |
| 공급자/운영자 정산 배분 | — | ❌ API 없음 |
| 인보이스 발행 상태 | — | ❌ entity 없음 |
| 세금계산서 | — | ❌ 미구현 |

→ **주문 기반 참고용 매출 요약은 기존 API만으로 가능.** 실제 정산 확정은 불가.

---

## 5. GlycoPharm Billing-Invoice Reference 분석

### 5.1 backend entity 구조

**파일:** `apps/api-server/src/routes/glycopharm/entities/billing-invoice.entity.ts`

```
serviceKey: 'glycopharm' (고정)
supplierId, pharmacyId: 청구 주체
periodFrom, periodTo: 정산 기간
unit: 'consultation_action' | 'approved_request' (GlycoPharm 전용 단위)
unitPrice, count, amount: 금액
status: DRAFT | CONFIRMED | ARCHIVED
lineSnapshot: JSONB (상세 근거)
dispatchStatus: NONE | SENT | RECEIVED (발송 상태)
```

**특징:**
- GlycoPharm 전용 도메인 설계 (`unit: consultation_action`)
- K-Cosmetics와 무관한 도메인 단위 (상담 행위 기준)
- `sellerOrganizationId` 직접 연결 없음 (별도 설계 필요)

### 5.2 GlycoPharm StoreBillingPage 실제 수준

```typescript
// services/web-glycopharm/src/pages/store-management/StoreBillingPage.tsx
const MOCK_HISTORY = [...]; // ← Mock 데이터
// "실 정산 API 연동 전" 주석 명시

pharmacyApi.getOrders() // ← 실제 주문 API 호출
+ COMMISSION_RATE = 5% // ← 하드코딩 수수료
```

**판정: Mock 수준.** 실제 정산 API 미연동. 주문 API로 매출을 계산하는 참고용.

### 5.3 K-Cosmetics 재사용 가능성

| 항목 | 재사용 가능 | 이유 |
|------|:----------:|------|
| `billing-invoice.entity.ts` 구조 참조 | ⚠️ | unit 필드가 GlycoPharm 전용 — K-Cosmetics용으로 재설계 필요 |
| billing-preview / invoice controller 패턴 | ⚠️ | 참조 가능하나 K-Cosmetics용 service 별도 작성 필요 |
| StoreBillingPage UI 패턴 | ✅ | 주문 API 기반 매출 요약 UI 패턴 재사용 가능 |
| 5% 수수료 하드코딩 | ❌ | K-Cosmetics 수수료 정책 별도 확인 필요 |
| "약국 정산" 문구 | ❌ | K-Cosmetics는 "매장 정산" 사용 |

---

## 6. EcommerceOrder 정산 활용 가능 필드

### 6.1 정산에 충분한 필드 (현재 존재)

| 목적 | 필드 | 위치 |
|------|------|------|
| 판매자 식별 | `sellerId` | Order 직접 컬럼 |
| 매장 식별 | `metadata.storeId` | Order JSONB |
| 결제 완료 금액 | `totalAmount` + `paymentStatus=PAID` | Order 컬럼 |
| 결제 일시 | `paidAt` | Order 컬럼 |
| 환불 금액 | `EcommercePayment.refundedAmount` | Payment entity |
| 취소 상태 | `status=CANCELLED` | Order 컬럼 |
| 수수료율 | `metadata.commission.rate` | Order JSONB (일부 주문) |
| 채널 구분 | `channel: 'local' | 'travel'` | Order 컬럼 |

### 6.2 정산 확정에 필요하나 없는 것

| 목적 | 현황 |
|------|------|
| 정산 확정 금액 (수수료 차감 후) | ❌ entity 없음 |
| 인보이스 발행 상태 | ❌ entity 없음 |
| 세금계산서 | ❌ 미구현 |
| 공급자 배분 금액 | ❌ 미구현 |
| 지급 완료 상태 | ❌ 미구현 |
| 정산 기간 잠금 | ❌ 미구현 |

### 6.3 주문 기반 매출 요약 가능 범위

```
가능:
- 이번 달 결제 완료 주문 수, 합계 금액
- 취소/환불 건수, 금액
- 채널별(매장/여행) 매출 구분
- 일별 추이 (주문 createdAt 기준)

불가 (정산 확정 없으므로):
- 실제 지급 예정 금액
- 수수료 차감 후 순정산액
- 인보이스 발행
- 지급 완료 확인
```

---

## 7. KPA / Neture Reference

### KPA-Society

- 정산/billing 페이지: **없음** (메뉴 미노출, 미구현)
- 주문은 `/checkout/store-orders` 존재
- 정산은 현 단계 구현 범위 밖

### Neture

- settlement/payout/invoice entity: **없음**
- B2B 공급자-매장 주문 흐름만 구현
- 정산 체계 미구현

→ **3개 서비스(KPA/Neture/K-Cosmetics) 모두 실제 정산 미구현.** GlycoPharm만 mock 수준 구현.

---

## 8. 정책 옵션 비교

### Option A — Placeholder 유지 + 문구 명확화

| 항목 | 내용 |
|------|------|
| 범위 | storePlaceholderPage 또는 per-page 문구 변경 |
| 개발량 | 매우 낮음 (1줄~10줄) |
| 위험도 | 낮음 |
| 사용자 UX | "준비 중입니다" — 현재도 동일 |
| 권장 | ⚠️ 현재 메뉴 미노출이므로 즉시 필요도 낮음 |

### Option B — 주문 기반 매출 요약 (참고용)

| 항목 | 내용 |
|------|------|
| 범위 | `/cosmetics/orders?status=paid` 집계 → 월간 매출 요약 화면 |
| 개발량 | 낮음 — frontend-only, 기존 API 사용 |
| 위험도 | 낮음 — "참고용" 명확 표시 전제 |
| 사용자 UX | 실질적인 매출 파악 가능 |
| 제약 | "정산 확정", "인보이스", "지급 예정" 표현 사용 금지 |
| 권장 | **✅ 권장 — GlycoPharm StoreBillingPage 수준** |

### Option C — GlycoPharm billing-invoice mock 이식

| 항목 | 내용 |
|------|------|
| 범위 | billing-invoice entity + controller + 수수료 하드코딩 |
| 개발량 | 중간 — migration 필요 |
| 위험도 | 중간 — "정산 확정" 오해 유발 가능 |
| 사용자 UX | GlycoPharm 수준의 mock 화면 |
| 권장 | ❌ 불필요한 migration, GlycoPharm 전용 도메인 재사용 위험 |

### Option D — 실제 정산/인보이스 설계 후 구현

| 항목 | 내용 |
|------|------|
| 범위 | entity 설계 + migration + backend API + frontend |
| 개발량 | 큼 — 별도 설계 phase 필요 |
| 위험도 | 높음 — 수수료 정책, PG 정산, 세금 이슈 |
| 권장 | ❌ 현 단계 불필요 |

**권장안: Option B** — `주문 기반 참고용 매출 요약` frontend 구현  
- "정산/인보이스" 제목 → "매출 요약 (참고용)" 또는 "주문 매출 집계"  
- frontend-only, migration 없음  
- 명확한 면책 문구 ("실제 정산 확정 금액이 아닙니다")

---

## 9. 사용자-facing 문구 기준 (K-Cosmetics)

### 허용 문구

```
내 매장 매출 요약
매장 주문 매출 집계
이번 달 결제 완료 금액 (참고용)
주문 기반 매출 (정산 확정 금액 아님)
```

### 금지 문구

```
정산 완료          ← 정산 확정 의미
인보이스 발행      ← 실제 invoice entity 없음
지급 예정 금액     ← 지급 시스템 없음
정산 확정          ← 확정 프로세스 없음
수수료 차감 후 정산액 ← 수수료 정책 미정
```

---

## 10. 위험도 평가

### 즉시 위험

```
위험도: LOW

이유:
- 현재 메뉴에 billing 항목 없음 (사이드바 미노출)
- StorePlaceholderPage가 이미 "준비 중" 표시
- 사용자가 실제로 접근하기 어려운 상태
- 즉각적 운영 혼란 없음
```

### 구현 위험

```
위험도 (Option B): LOW~MEDIUM
이유:
- 기존 /cosmetics/orders API만 사용 — backend 변경 없음
- "참고용" 명확 표시로 신뢰 리스크 통제 가능
- 실제 정산 시스템 오해 없도록 문구 관리 필요

위험도 (Option C/D): HIGH
이유:
- 수수료/정산 정책 미정의
- PG 정산 주기, 세금계산서, 지급 시스템 연동 없음
- 운영 혼란 및 법적 책임 문제 가능
```

---

## 11. 후속 WO 후보

| 우선순위 | WO/IR | 범위 | 위험도 |
|---------|-------|------|--------|
| **1순위** | **WO-O4O-KCOSMETICS-STORE-REVENUE-SUMMARY-FRONTEND-V1** | 주문 기반 참고용 매출 요약 (frontend-only) | 낮음 |
| **2순위 (보류)** | IR-O4O-SETTLEMENT-INVOICE-DATA-MODEL-DESIGN-V1 | 실제 정산 entity/정책 설계 | — (장기) |
| **생략 가능** | WO-O4O-KCOSMETICS-STORE-BILLING-PLACEHOLDER-CLARITY-V1 | 문구만 변경 | 매우 낮음 (Option B 진행 시 불필요) |

### WO-O4O-KCOSMETICS-STORE-REVENUE-SUMMARY-FRONTEND-V1 상세 범위

```
구현 필요 항목:

1. StoreRevenueSummaryPage.tsx (pages/store/ 신규)
   - 이번 달 결제 완료 주문 수, 합계 금액
   - 취소/환불 건수, 금액
   - 채널별(매장/여행) 구분
   - "실제 정산 확정 금액이 아닙니다" 면책 배너
   - 기존 /cosmetics/orders API 사용 (신규 API 불필요)

2. App.tsx route 교체 (StorePlaceholderPage → StoreRevenueSummaryPage)

3. storeMenuConfig.ts COSMETICS_STORE_CONFIG에 billing 메뉴 추가 (선택적)
   - 추가 시 label: "매출 요약" (정산/인보이스 아님)

주의:
- "정산/인보이스" 라는 표현은 메뉴와 화면 모두에서 제거 권장
- backend/migration 없음
- GlycoPharm COMMISSION_RATE 하드코딩 패턴 금지 (수수료 정책 미정의)
```

---

## 12. Current Structure vs O4O Philosophy Conflict Check

| 원칙 | 현황 | 판정 |
|------|------|------|
| **정산은 매장 실행 capability 중요 영역** | 미구현 — 그러나 메뉴 미노출이어서 운영 차단 없음 | ⚠️ 장기적으로 구현 필요 |
| **placeholder는 사용자 오해 없이 명확해야 함** | "준비 중" 표시됨 — 메뉴 미노출로 실질적 노출 없음 | ✅ 현재는 안전 |
| **공통 capability = UI+API+데이터+정책 동시 정렬** | 데이터(주문)는 있으나 정산 정책·API 없음 → 구현 전 설계 필요 | ⚠️ Option B 범위에서 데이터만 활용 |
| **정산 오표시는 신뢰 리스크** | Option B 채택 시 "참고용" 명확 표시 전제 — 리스크 관리 가능 | ✅ Option B 조건부 안전 |
| **K-Cosmetics = 내 매장 문구** | "매출 요약", "매장 주문 매출" 사용 예정 | ✅ 문구 기준 유지 가능 |
| **1인 개발 생산성** | Option B = frontend-only, 기존 API 재사용 → 최소 비용 | ✅ 합리적 |

**결론:**
- 실제 정산/인보이스 구현은 정책 미정의로 BLOCKED — 현 단계 구현 금지.
- Option B(주문 기반 참고용 매출 요약)는 기존 API 재사용 + 면책 표시로 안전하게 진행 가능.
- 메뉴가 현재 노출되지 않으므로 즉각적 위험 없음 — 다음 우선순위 WO로 진행 가능.

---

## 부록 — 조사한 주요 파일

| 파일 | 내용 |
|------|------|
| `services/web-k-cosmetics/src/App.tsx:673` | billing placeholder route |
| `packages/store-ui-core/src/config/storeMenuConfig.ts` | COSMETICS_STORE_CONFIG billing 항목 없음 확인 |
| `packages/store-ui-core/src/components/StorePlaceholderPage.tsx` | "준비 중" 컴포넌트 |
| `apps/api-server/src/routes/cosmetics/cosmetics.routes.ts` | billing 마운트 없음 |
| `apps/api-server/src/routes/glycopharm/entities/billing-invoice.entity.ts` | GlycoPharm 정산 entity (참조) |
| `services/web-glycopharm/src/pages/store-management/StoreBillingPage.tsx` | GlycoPharm mock billing page |
| `packages/ecommerce-core/src/entities/EcommerceOrder.entity.ts` | 주문 entity 정산 가능 필드 확인 |
| `packages/ecommerce-core/src/entities/EcommercePayment.entity.ts` | 결제 entity |
| `packages/ecommerce-core/src/services/CosmeticsOrderService.ts` | metadata.commission 구조 |

---

*작성: Claude Code (2026-06-01)*  
*read-only 조사 — 코드/DB/source/migration 수정 없음*  
*다른 세션 WIP 미접촉. git add/commit/push 미실행 (사용자 지시).*
