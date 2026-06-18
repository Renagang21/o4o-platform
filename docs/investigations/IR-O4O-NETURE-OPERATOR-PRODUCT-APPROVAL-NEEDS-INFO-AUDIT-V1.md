# IR-O4O-NETURE-OPERATOR-PRODUCT-APPROVAL-NEEDS-INFO-AUDIT-V1

> **유형:** Read-only Investigation Report
> **작성일:** 2026-06-18
> **선행:** `WO-O4O-NETURE-SUPPLIER-GENERAL-CATEGORY-NO-DOCUMENT-V1`, `WO-O4O-NETURE-SUPPLIER-REGULATED-CATEGORY-NUMBER-FIRST-V1`, `IR-O4O-NETURE-SUPPLIER-PRODUCT-FILE-REQUIREMENTS-AUDIT-V1`
> **결론(요약):** **새 `needs_info` status 추가는 불필요(과함).** 단, 조사 중 **반려 후 재제출이 사실상 차단되는 기능 결함**을 확인했다. 이는 문구 개선(B안) 이전에 반드시 선행되어야 하는 버그다. → **B안(반려 문구/재제출 UX 정비) + 재제출 결함 수정**을 권고한다.

---

## 1. 조사 범위

| 영역 | 대상 |
|------|------|
| Backend | `offer_service_approvals` (SSOT), `supplier_product_offers.approval_status`(파생), `product_approvals`(legacy), `submitForApproval`, `OfferServiceApprovalService.approve/reject`, supplier 제품 수정·재제출 API, 알림 |
| Operator/Admin FE | `services/web-neture` `OperatorProductApprovalPage.tsx`, `AdminProductApprovalPage.tsx` |
| Supplier FE | `services/web-neture` `SupplierProductsPage.tsx`, `ProductDetailDrawer.tsx`, `productConstants.ts` |
| 알림 | `OfferServiceApprovalService.notifySupplier()` |

조사 방식: 정적 코드 분석(read-only). 운영 데이터 변경·상태 전이 테스트 없음.

---

## 2. 현재 제품 승인 상태 구조

### 2.1 SSOT 테이블 = `offer_service_approvals`

제품 승인의 단일 진실 소스는 **`offer_service_approvals`** 이며, `(offer_id, service_key)` 단위로 승인 상태를 보유한다.

- 엔티티: `apps/api-server/src/modules/neture/entities/OfferServiceApproval.entity.ts:21`
- 마이그레이션: `apps/api-server/src/database/migrations/20260325300000-CreateOfferServiceApprovals.ts`
  - `approval_status VARCHAR(20) NOT NULL DEFAULT 'pending'`
  - **UNIQUE `(offer_id, service_key)`** ← 본 IR의 핵심 제약
  - `reason` 컬럼(text, nullable)
- 상태값(코드상 사용): `'pending'` / `'approved'` / `'rejected'` — **`needs_info` 계열 없음**

`supplier_product_offers.approval_status`(enum `PENDING/APPROVED/REJECTED`, `SupplierProductOffer.entity.ts:29-33`)는 위 SSOT에서 **파생되는 필드**다(`syncOfferFromServiceApprovals`).

### 2.2 Legacy 테이블 = `product_approvals`

`apps/api-server/src/entities/ProductApproval.ts:26-31` 의 `ProductApprovalStatus` = `pending/approved/rejected/revoked`. 현재 제품 승인 액션의 1차 경로는 `offer_service_approvals` 이고, `product_approvals` 는 cascade(반려 시 `approved → revoked`) 대상으로 동기화된다. 여기에도 `needs_info` 없음.

### 2.3 참고 — `needs_update`는 "제품"이 아니라 "공급자 품목군"에 존재

`RegulatedCategoryStatus`(`supplier.ts:1130-1167`)에는 `needs_update = '보완 필요'`가 **이미 존재**한다. 단 이는 **공급자 프로필의 규제 품목군 증빙** 레벨이며 **제품 승인 레벨이 아니다.** 즉 플랫폼은 이미 "보완 필요" 패턴의 선례를 가지고 있으나, 제품 승인에는 적용되어 있지 않다.

---

## 3. Backend 상태 전이

### 3.1 요청(pending 진입)

`offer.service.ts:411 submitForApproval()` → `OfferServiceApprovalService.createPendingApprovals()` (`offer-service-approval.service.ts:29`)

```sql
INSERT INTO offer_service_approvals (...)
VALUES (...)
ON CONFLICT (offer_id, service_key) DO NOTHING   -- ← 핵심
RETURNING service_key
```

- 신규 INSERT된 service_key가 있으면 `submitted++`
- **하나도 INSERT되지 않으면 `skipped`, reason = `'ALREADY_REQUESTED_OR_DECIDED'`** (`offer.service.ts:498-504`)

### 3.2 운영자 승인/반려

`offer-service-approval.service.ts`:
- `approve()` (438): `approval_status='approved'`, `decided_by/at`, `reason` 저장 → `syncOfferFromServiceApprovals` → 알림
- `reject()` (478): `approval_status='rejected'`, `reason` 저장 → sync → 알림
- 둘 다 **현재 `pending`이 아니면 `NOT_PENDING` 에러**(444, 484)

### 3.3 반려 cascade (`syncOfferFromServiceApprovals`, 401-421)

offer가 REJECTED로 파생되면:
1. `supplier_product_offers.approval_status = 'REJECTED'`
2. `product_approvals` 의 `approved` row → `revoked`
3. `organization_product_listings.is_active = false` (노출/판매 중단)

### 3.4 ⚠️ 핵심 결함 — 반려 후 재제출이 사실상 차단됨

확인된 전이 경로상의 결함:

```text
1. 제품 승인요청 → offer_service_approvals (offer_id, svc) = 'pending'
2. 운영자 반려       → 같은 row = 'rejected' (row는 그대로 남음)
3. 공급자 제품 수정   → PATCH /supplier/products/:id 는 approval_status를 건드리지 않음
                       (rejected row 그대로 유지)
4. 공급자 "승인 요청" 재클릭 → createPendingApprovals INSERT 시도
                       → ON CONFLICT (offer_id, service_key) DO NOTHING
                       → 0건 insert → skipped: 'ALREADY_REQUESTED_OR_DECIDED'
```

**결과: 동일 service_key에 대해 반려된 제품은 공급자가 다시 승인요청을 보낼 수 없다.** 재요청은 새 pending row를 만들지 못하고 silent skip된다. rejected → pending 으로 되돌리는 코드 경로가 supplier 플로우에 **존재하지 않는다.**

> 단, `offer.service.ts:234-257`(approve override), `:347-371`(reject override)에서 `UPDATE ... WHERE approval_status != 'approved'/'rejected'` 로 상태를 일괄 변경하는 경로가 있으나, 이는 **admin override 전용**이며 공급자 재제출 경로가 아니다.

이 결함은 새 status 도입 여부와 무관하게 **별도로 수정되어야 한다.**

---

## 4. Operator / Admin 승인 UI 구조

| 항목 | 내용 | 위치 |
|------|------|------|
| 화면 | `/operator/product-approvals`, `/admin/product-approvals` | `OperatorProductApprovalPage.tsx`, `AdminProductApprovalPage.tsx` |
| 액션 | **승인 / 반려 (2개뿐)** + 승인됨 상태일 때 삭제 | Operator `:50-87` |
| 보완 요청 액션 | **없음** | — |
| 반려 사유 입력 | textarea, **선택(optional)**, placeholder `"반려 사유를 입력하세요 (선택)"` | Operator `:500-528`, Admin `:336-365` |
| 상태 라벨 | `승인대기 / 승인됨 / 반려됨` (3종) | Operator `:36-40` |
| 보완 vs 최종 반려 구분 | **불가** (버튼/체크박스/상태 모두 없음) | — |

운영자는 "보완 후 재검토 가능한 반려"와 "최종 반려"를 **구분할 수단이 없다.** 유일한 표현 채널은 자유 입력 `reason` 텍스트뿐이다.

---

## 5. Supplier 제품 승인 상태 UI 구조

| 항목 | 내용 | 위치 |
|------|------|------|
| 화면 | `/supplier/products` 목록 + `ProductDetailDrawer` 편집 | `SupplierProductsPage.tsx`, `ProductDetailDrawer.tsx` |
| 상태 배지 | `대기 / 승인 / 반려 / 미요청` | `productConstants.ts:25-31` |
| 반려 사유 표시 | 배지에 `*` 표기 + **hover tooltip(title 속성)** 으로만 노출 | `SupplierProductsPage.tsx:461-467` |
| 반려 후 수정 | **가능** (gating 없음, 편집 버튼 무조건 노출) | `ProductDetailDrawer.tsx:638-657` |
| 반려 후 재요청 버튼 | "승인 요청" 버튼 존재 (但 §3.4 결함으로 실제 재요청은 skip됨) | `SupplierProductsPage.tsx:1388-1435` |
| "보완 후 재제출" 안내 문구 | **없음** (제품 레벨). `보완 필요`는 품목군 게이트 메시지에만 존재 | `SupplierProductsPage.tsx:538-590` |

공급자 화면에서 반려는 **`반려` 배지 + tooltip 사유**가 전부다. 무엇을 고쳐야 하는지(`*` tooltip)와 다시 제출 가능 여부가 약하게 표현되거나 누락되어 있고, **버튼은 보이지만 실제로는 동작하지 않는다(§3.4).**

---

## 6. 반려 사유 / 운영자 메모 저장 구조

- 저장 위치: `offer_service_approvals.reason` (text, nullable)
- 입력: 운영자 반려 모달의 **선택 입력 textarea** (필수 아님)
- 표시: 공급자 배지 tooltip + `*` 마커
- 별도의 "보완 항목 체크리스트"나 구조화된 메모 필드는 **없음** (자유 텍스트 단일 필드)

---

## 7. rejected 후 수정 / 재제출 가능 여부 (종합)

| 단계 | 가능? | 근거 |
|------|:----:|------|
| 반려 제품 **수정** | ✅ 가능 | 편집 gating 없음 (`ProductDetailDrawer.tsx:638`) |
| 반려 제품 **재요청 버튼 노출** | ✅ 노출 | `SupplierProductsPage.tsx:1388` |
| 반려 제품 **실제 재요청 성공** | ❌ **불가** | `ON CONFLICT DO NOTHING` → `ALREADY_REQUESTED_OR_DECIDED` (§3.4) |
| 재요청 시 approval row 처리 | 기존 rejected row **재사용도 신규 생성도 안 됨** | row가 남아 충돌, 신규 차단 |

**즉, "수정은 되는데 재제출이 안 되는" 끊긴 플로우.** 이것이 본 IR의 가장 중요한 발견이다.

---

## 8. 알림 / targetUrl 영향

- `OfferServiceApprovalService.notifySupplier()` (`:517-545`), fire-and-forget, channel `in_app`, type `custom`
- 승인: `"[상품명] 승인되었습니다"`(+사유), 반려: `"[상품명] 거절되었습니다"`(+사유)
- **재제출 가능 여부를 알림 문구가 포함하지 않음**
- 승인/반려 전용 notification type(enum) 없음 — 모두 `custom`
- 상태별 분리된 targetUrl 없음

---

## 9. 새 `needs_info` status 필요성 판단

**필요성: 낮음 (권고: 추가하지 않음).**

근거:
- 제품 승인의 본질 요구는 "이 제품 검토 가능하나 일부 정보 수정 후 재검토"인데, 이는 **`rejected` + 사유 + 정상 재제출 플로우**로 충분히 표현 가능하다.
- 새 status 추가는 enum(`offer_service_approvals` varchar는 비교적 가볍지만), `syncOfferFromServiceApprovals` 파생 로직, operator/supplier 배지·필터·탭, 알림, 운영자 액션 버튼, cascade 규칙까지 **전 계층 변경**을 유발한다.
- 공급자 품목군에 이미 `needs_update`가 있어 **상태 어휘 중복**이 생긴다(제품 `needs_info` vs 품목군 `needs_update` → 운영 혼선).
- O4O 단순 운영 원칙상 **상태 3종 유지가 적절**하다.

**예외 조건(향후 A안 재검토 트리거):** 운영자가 "최종 반려(재등록 필요)"와 "보완 요청(이 제품 그대로 재검토)"을 **데이터로 구분·집계**해야 하는 실제 운영 요구가 확인되면 그때 `needs_info` 도입을 재평가한다. 현 시점엔 그 요구가 코드/운영에서 관찰되지 않는다.

---

## 10. status 추가 없이 UX 개선 가능성 판단

**가능하며, 이 방향이 적절하다 (B안).** 단 전제로 §3.4 기능 결함 수정이 선행되어야 한다.

status 추가 없이 다음으로 목표 달성 가능:
1. **(선행/필수) 재제출 결함 수정** — 반려 제품 재요청 시 해당 service_key의 rejected row를 `pending`으로 되돌리거나(UPDATE), `ON CONFLICT ... DO UPDATE SET approval_status='pending', reason=NULL, decided_*=NULL` 로 전환. 결정은 후속 WO에서.
2. 공급자 반려 표시 강화 — tooltip-only → 사유를 본문에 노출 + **"보완 후 다시 승인요청 하실 수 있습니다"** 안내.
3. 운영자 반려 모달 문구 — 반려가 곧 최종 거절이 아니라 보완 요청으로 쓰일 수 있음을 명시(필수 사유 권장).
4. 알림 문구 — 재제출 가능 안내 + 제품 편집 targetUrl 포함.

이로써 "반려"와 "보완 요청"의 **의미 구분을 UX/문구/플로우로 달성**하고, status 체계는 단순하게 유지한다.

---

## 11. 구현 WO 후보

| 우선순위 | WO 후보 | 내용 | 비고 |
|:---:|------|------|------|
| **P0 (필수)** | `WO-O4O-NETURE-PRODUCT-APPROVAL-RESUBMIT-AFTER-REJECT-FIX-V1` | 반려 후 재요청이 silent skip되지 않도록 rejected→pending 재요청 경로 복구 | §3.4 기능 결함. status 도입 여부와 무관하게 단독 수정 가치 |
| **P1** | `WO-O4O-NETURE-PRODUCT-APPROVAL-REJECTION-COPY-AND-RESUBMIT-UX-V1` | 공급자/운영자 문구 + 반려 사유 노출 강화 + 알림 재제출 안내 | B안 본체 |
| 보류 | `WO-O4O-NETURE-OPERATOR-PRODUCT-APPROVAL-NEEDS-INFO-V1` (A안) | `needs_info` status 신설 | §9 예외 조건 충족 시에만 재검토. 현재 권고 = 미진행 |

권고 순서: **P0 → P1**, A안 보류.

---

## 12. Current Structure vs O4O Philosophy Conflict Check

| # | 점검 | 판정 |
|---|------|------|
| 1 | 현재 승인 구조가 공급자에게 불필요하게 가혹한가? | **부분 Yes** — 반려 후 수정해도 재제출이 막혀(§3.4) "사실상 1회성 거절"처럼 동작. 진입장벽 완화 방향과 충돌 |
| 2 | 보완 가능한 제품도 "반려"로만 표시되어 경험을 해치는가? | **Yes** — 배지 `반려` + tooltip 사유가 전부, 재제출 가능성 미표현 |
| 3 | 운영자가 보완 요청과 최종 반려를 구분할 수 있는가? | **No** — 자유 텍스트 사유 외 수단 없음 |
| 4 | 공급자가 무엇을 수정해야 하는지 명확히 아는가? | **약함** — tooltip-only |
| 5 | 재제출 흐름이 명확한가? | **No** — 버튼은 있으나 동작하지 않음(끊김) |
| 6 | 새 status 추가가 단순 운영 원칙에 비해 과한가? | **Yes (과함)** — 3종 유지 권고 |
| 7 | rejected+note 개선이 더 적절한가? | **Yes** — 단, 재제출 결함 수정 전제 |

**철학 정렬 결론:** "공급자 진입장벽은 낮게 / 운영자 검토는 명확하게 / 보완 가능 사항은 반려와 구분 / 상태 체계는 단순하게"라는 기준에 비추어, **상태를 늘리지 않고(단순 유지) + 반려 문구·재제출 UX 정비 + 끊긴 재제출 경로 복구**가 가장 정합적이다.

---

## 13. 하지 않은 것 (범위 준수)

코드/DB/enum/API/UI/알림 타입 변경 없음. 운영 데이터 변경 없음. 상태 전이 실제 실행 테스트 없음. 본 IR 문서 1개만 산출.

---

*Generated as read-only investigation. Implementation requires separate WO approval per CLAUDE.md.*
