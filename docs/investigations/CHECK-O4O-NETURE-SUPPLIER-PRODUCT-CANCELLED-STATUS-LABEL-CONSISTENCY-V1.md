# CHECK-O4O-NETURE-SUPPLIER-PRODUCT-CANCELLED-STATUS-LABEL-CONSISTENCY-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-PRODUCT-CANCELLED-STATUS-LABEL-CONSISTENCY-V1 (D 후속 마감)
> **유형:** frontend-only 표시 정합 — `offer_service_approvals.approval_status='cancelled'`(공급자 철회) 라벨을 '철회됨'으로 일관 표시. **backend/API/DB/migration 0.**
> **결과: PASS(코드/타입) — drawer 레거시 "서비스" 섹션 cancelled='철회됨'+철회 사유, 목록 "승인" 컬럼은 반려(rejected) 사유만 '*'/tooltip(철회는 제외). web-neture tsc 0.**
> 선행: WO-O4O-NETURE-SUPPLIER-PRODUCT-DISTRIBUTION-MANAGEMENT-FLOW-V1 — 2026-06-19

---

## 1. 배경

D에서 SERVICE 제거 시 approval row를 `'cancelled'`(철회)로 전환하는 정책 도입. 신규 "공급 방식" 섹션은 정상이나, 레거시 표시 영역에서 cancelled가 기존 매핑(else→반려)으로 흘러 **'반려'/'승인 *'**로 오인될 수 있어 라벨만 정합한다. 기능/정책 무변경.

## 2. 변경 파일 (frontend 2 + CHECK)

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx` | 레거시 "서비스" 섹션 serviceApprovals 배지: `cancelled`→**'철회됨'**(slate) 추가 + 사유 라벨 `cancelled`→**'철회 사유'**(rejected는 '반려 사유' 유지) |
| `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | 목록 "승인" 컬럼: `*`/tooltip 사유를 **rejected 사유로 한정**(cancelled 철회 사유 제외) — 승인 badge에 철회 사유가 붙어 반려처럼 오인되는 것 방지 |

> drawer **신규 공급 방식 섹션**(D)은 이미 cancelled='철회됨' 처리됨 — 무변경(WO §5.4). offer-level `deriveSubmissionStatus`는 approved/pending/rejected 파생이라 cancelled를 반려로 분류하지 않음(`hasRejected`는 rejected만) — 무변경.

## 3. cancelled 라벨 매핑 위치 (정합 후)

| 영역 | cancelled 표시 |
|------|------|
| drawer 신규 공급 방식 섹션 (서비스별 승인) | '철회됨' (D에서 기 처리; serviceKeys 기준이라 보통 미표시) |
| drawer 레거시 "서비스" 섹션 | **'철회됨'** + '철회 사유: …' (본 WO) |
| 목록 "승인" 컬럼 | offer-level 라벨 유지(승인/대기/거부) + **철회 사유는 '*'에서 제외**(본 WO) |

## 4. 집계 재설계 안 함 (중단 기준 준수)

- WO §5.3 / §9: 목록 승인 컬럼 상태 **집계 로직 재설계 안 함**. all-cancelled + non-PUBLIC 같은 offer-level 파생 엣지는 isPublic 의존이라 본 WO 범위 외(표시 가능한 영역만 수정). 최소 목표(cancelled가 반려/승인으로 오표시 안 됨)만 충족.

## 5. 검증

- **web-neture `tsc --noEmit`: EXIT 0.**
- 정적: pending/approved/rejected 기존 라벨/스타일 불변. cancelled만 신규 분기. rejected 반려 배너(`sa.status==='rejected'` 필터)는 cancelled 미포함(무변경).

### 배포 후 실브라우저 smoke — 2026-06-19 **PASS** (renagang21 미네락 600, k-cosmetics cancelled)
1. 목록 "승인" 컬럼: 미네락 600 = **"승인"** (철회 `*` 제거됨, 이전 "승인 *"). **PASS**
2. drawer 레거시 "서비스" 섹션: k-cosmetics = **"철회됨"** + **"철회 사유: 공급자가 해당 서비스 공급을 철회했습니다."**, glycopharm/kpa-society = "승인". **PASS** (이전 '반려'/'반려 사유'에서 정정)
3. 신규 공급 방식 섹션(kpa/glyco 승인됨, B2B 전체 공급, [공급 방식 변경]) 유지, 라벨 회귀 없음. **PASS**

## 6. 비범위 / 준수

- ✅ backend/API/DB/migration/approval_status 정책/cancelled 전이/listing/catalog/모달 기능 **무변경**.
- ✅ path-specific(frontend 2 + CHECK). **다른 세션 WIP(trial.ts·MarketTrialApprovalDetailPage.tsx)·검증 png 미staging.**

---

*Date: 2026-06-19 · D 후속 frontend-only 라벨 정합 · cancelled='철회됨'(drawer 레거시 서비스 섹션) + 목록 승인 컬럼 철회 사유 '*' 제외 · 집계 재설계 안 함 · backend/DB 0 · web-neture tsc 0 · 배포 후 smoke.*
