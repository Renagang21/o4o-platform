# IR-O4O-SUPPLIER-PRODUCT-APPROVAL-GATE-REASON-DISCLOSURE-V1

> **유형:** read-only 조사 — 코드/DB/route/contract/UI 변경 0.
> **대상:** Neture 공급자 `내 제품 관리` 승인 요청 차단 사유 안내 UX 구조.
> **판정: 가설 B(+D) — backend 응답에 이미 세분화된 reasonCode 가 있고, 차단 상품은 offerId 로 프론트 목록과 매핑 가능. 따라서 개선은 frontend-only 로 충분(권장 WO 후보 A/= 후보2 result banner). backend additive(category/status/name 동봉)는 선택(불필요).**
> 작성일: 2026-06-18

---

## 0. 결론 요약 (TL;DR)

- 승인 요청 API(`submitForApproval`)는 이미 **`{ submitted, skipped: [{ id, reason }], errors }`** 를 반환하고, **`reason` 은 상태별로 세분화된 코드**(NOT_SELECTED / NOT_APPROVED(=심사대기) / NEEDS_UPDATE / REJECTED / SUSPENDED / UNRESOLVED / NO_ELIGIBLE_SERVICE_KEYS / DRUG_SERVICE_NOT_PHARMACY_AUDIENCE / ALREADY_REQUESTED_OR_DECIDED) 이다.
- **그러나 프론트가 모든 `SUPPLIER_CATEGORY_*` 를 "품목군 미승인" 하나로 합쳐** 카운트만 toast 로 노출(상품명·품목군·상태별 행동 안내 없음). = **가설 B(상세를 버림) + 가설 D(상태→행동 매핑 부재).**
- `skipped[].id` = offerId. 프론트 상품 목록 row(`SupplierProduct`)는 **id(offerId)/name/regulatoryType/categoryName** 을 보유 → **차단 상품의 이름·품목군을 클라이언트에서 매핑 가능**.
- ∴ **backend 변경 없이** ① 차단 상품명 표시 ② reasonCode 별 상태/행동 분기 ③ 공급 예정 품목군 CTA 까지 frontend-only 로 구현 가능.
- backend additive(skipped 에 category/status/productName 동봉)는 프론트 재유도 제거용 nicety — **필수 아님**.

---

## 1. 조사 frontend 파일

- `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` — 승인 요청 handler(`supplierApi.submitForApproval`), 결과 메시지 생성(1248~1308), toast state.
- `services/web-neture/src/lib/api*` — `supplierApi.submitForApproval` / `getProductsPaginated`, `SupplierProduct` 타입.
- `services/web-neture/src/lib/supplierProductTypes.ts` — offer action/gate label helper.
- `services/web-neture/src/pages/supplier/SupplierProfilePage.tsx` — 공급 예정 품목군(Section A-4). route `/supplier/profile` → **`/mypage/business-profile` redirect**(`MyBusinessProfilePage`). preselect query param **없음**(useSearchParams 미사용).
- `services/web-neture/src/components/supplier/SupplierRegulatedCategoriesModal.tsx` — 품목군 증빙 제출.

## 2. 조사 backend 파일

- `apps/api-server/src/modules/neture/services/offer.service.ts` — `submitForApproval(offerIds)`(411~510).
- `apps/api-server/src/modules/neture/services/supplier-regulated-category.service.ts` — `evaluateGate()`(146~166), 품목군 코드(88~96), reasonCode union(56~61).
- `apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts` — 승인 요청 endpoint.
- `apps/api-server/src/modules/neture/entities/NetureSupplierRegulatedCategory.entity.ts` — 품목군 증빙 상태.

## 3. 현재 승인 요청 흐름

1. `/supplier/products` → 상품 선택 → [승인 요청] → confirm → `supplierApi.submitForApproval(offerIds)`.
2. backend `NetureOfferService.submitForApproval` 가 offerId 별로 순차 gate:
   - 소유권(NOT_OWNED → errors)
   - **품목군 gate** `evaluateGate(resolvedCategory, categoryStatusMap)` → `allowed=false` 면 `skipped.push({id, reason: gate.reasonCode})`
   - 서비스 키 정책 `filterApprovalEligibleServiceKeys` → 0개면 `NO_ELIGIBLE_SERVICE_KEYS`
   - 규제 상품 약국 audience → `DRUG_SERVICE_NOT_PHARMACY_AUDIENCE`
   - `createPendingApprovals` → 신규 INSERT 있으면 `submitted++`, 없으면 `ALREADY_REQUESTED_OR_DECIDED`
3. 프론트가 `{submitted, skipped, errors}` 수신 → reason별 **카운트 집계** → toast.

## 4. 현재 gate 조건 / reasonCode (세분화 이미 존재)

`evaluateGate(category, statusMap)` → `{ allowed, category, status, reasonCode }`:
| 공급자 품목군 status | reasonCode | 의미 |
|---|---|---|
| (품목군 미해소) | `SUPPLIER_CATEGORY_UNRESOLVED` | 상품 품목군 매핑 불가 |
| not_requested/없음 | `SUPPLIER_CATEGORY_NOT_SELECTED` | **공급 예정 품목군 미등록** |
| submitted | `SUPPLIER_CATEGORY_NOT_APPROVED` | **운영자 확인 대기** |
| needs_update | `SUPPLIER_CATEGORY_NEEDS_UPDATE` | **보완 서류 필요** |
| rejected | `SUPPLIER_CATEGORY_REJECTED` | **반려 — 재제출** |
| suspended | `SUPPLIER_CATEGORY_SUSPENDED` | **운영자 문의** |
| approved | (null, allowed) | 통과 |
- 품목군 코드(`evaluateGate`/resolveRegulatedCategory): `DRUG / QUASI_DRUG / HEALTH_FUNCTIONAL / COSMETIC / GENERAL`.
- ⚠️ **gate 는 `category`+`status`+세분화 `reasonCode` 를 계산하나, submitForApproval 은 `gate.reasonCode` 만 skipped 에 담고 category/status 는 버린다**(offer.service.ts:469).

## 5. 현재 오류 메시지 생성 위치 (프론트가 합침)

`SupplierProductsPage.tsx` 1259~1290:
- `categoryBlocked = skipped.filter(s => s.reason.startsWith('SUPPLIER_CATEGORY_')).length` — **NOT_SELECTED/NEEDS_UPDATE/REJECTED/SUSPENDED/NOT_APPROVED 를 한 버킷으로 합침**.
- 전원 skipped 시: `"승인 요청된 상품이 없습니다. ${categoryBlocked}건은 해당 품목군이 O4O 내부 등록 가능 상태가 아닙니다. 공급자 프로필 > 공급 예정 품목군에서 증빙을 제출하고 운영자 확인을 받아 주세요."` (productName/품목군/상태 구분 없음, CTA 링크 없음).
- 부분 성공 시: `"${submitted}/${total}건 승인 요청 완료 (${categoryBlocked}건 품목군 미승인 …)"`.

## 6. 현재 API 응답 shape

```ts
// NetureOfferService.submitForApproval
{ submitted: number;
  skipped: Array<{ id: string /* offerId */; reason: string /* 세분화 코드 */ }>;
  errors: Array<{ id: string; error: 'NOT_OWNED' | 'INTERNAL_ERROR' }>; }
```
- **부분 성공/실패 구분 O**(submitted vs skipped vs errors). reasonCode 세분화 O. **category/status/productName 미포함**.

## 7. 품목군/증빙 상태 모델

- `NetureSupplierRegulatedCategory`(supplier × 품목군) status: `not_requested / submitted / approved / needs_update / rejected / suspended` + verificationStatus(PENDING…). 증빙은 kyc_documents(PDF).
- 상품 → 품목군 매핑: `resolveRegulatedCategoryFromProduct({regulatoryType, categoryName, categorySlug})` → DRUG/QUASI_DRUG/HEALTH_FUNCTIONAL/COSMETIC/GENERAL.
- 프론트 `SupplierProduct` row 보유: **id(offerId), name/masterName, regulatoryType, categoryName, drugCategory, approvalStatus** → skipped[].id 로 name/품목군 매핑 가능.

## 8. 현재 UX 문제점

- **어떤 상품**이 제외됐는지 안 보임(카운트만).
- 모든 품목군 상태를 **한 문구**로 안내(미등록/심사대기/반려/보완/정지 구분 없음) → 사용자가 무엇을 해야 할지 모름(가설 D).
- 공급 예정 품목군으로 **이동 CTA(클릭) 없음**(텍스트 안내만).
- backend 가 reasonCode 세분화를 주는데 프론트가 **합쳐서 정보 손실**(가설 B).

## 9. backend 변경 없이 가능한 개선 범위 (frontend-only)

**전부 가능** (응답 충분 + row 매핑):
1. skipped[].id(offerId) → 로드된 상품 목록에서 **상품명/품목군 매핑** 표시.
2. reasonCode 별 **상태·행동 분기**:
   - NOT_SELECTED → "공급 예정 품목군 등록 필요" + CTA
   - NOT_APPROVED → "운영자 확인 대기 중"
   - NEEDS_UPDATE → "보완 서류 제출 필요" + CTA
   - REJECTED → "반려 — 재제출 필요" + CTA
   - SUSPENDED → "운영자 문의 필요"
   - UNRESOLVED → "품목군 미확정"
   - NO_ELIGIBLE_SERVICE_KEYS → "서비스 등록 신청 필요"(상품 편집)
   - DRUG_SERVICE_NOT_PHARMACY_AUDIENCE → "의약품은 약국 대상 서비스만 가능"
   - ALREADY_REQUESTED_OR_DECIDED → "이미 승인 요청 진행/완료"
3. **CTA 링크** → `/mypage/business-profile`(공급 예정 품목군 Section A-4).
4. result banner(후보2) 또는 row 사유 표시(후보3).

## 10. backend additive 가 필요한 개선 범위 (선택, 불필요)

- skipped item 에 `productName / regulatoryCategory(=gate.category) / supplierCategoryStatus(=gate.status) / nextAction` 동봉 → 프론트 재유도 제거. **단 프론트가 이미 row 로 매핑 가능하므로 필수 아님.** 최소 additive(원할 경우):
  ```ts
  skipped: Array<{ id; reason; category?: string; status?: string }>
  ```
  (offer.service.ts:469 에서 gate.category/gate.status 동봉 — 1줄 additive, 후방호환).
- `/mypage/business-profile` 에 품목군 preselect query param(`?category=COSMETIC`) — 현재 없음. 정밀 유도 시 frontend 소규모 추가(별도).

## 11. 조사 질문 답변 (§5 Q1~Q11)

1. API = `supplierApi.submitForApproval(offerIds)` → `NetureOfferService.submitForApproval`.
2. gate = **backend** 판단(offer.service + evaluateGate). 프론트 선판단 없음(선택만).
3. "O4O 내부 등록 가능 상태 아님" 문구 = **프론트 생성**(SupplierProductsPage:1270), 단 원천 reasonCode 는 backend evaluateGate.
4. 차단 상품별 정보: productId/offerId ✅(skipped.id) · productName ✅(프론트 매핑) · regulatoryCategory ✅(프론트 row.regulatoryType / backend gate.category 미반환) · supplierCategoryStatus △(reasonCode 로 추론 / backend gate.status 미반환) · missingEvidenceType ❌ · operatorVerificationStatus △(별도 품목군 API) · nextAction ❌(프론트 reasonCode 로 도출).
5. 부분 성공/실패 표현 = **가능**(submitted/skipped/errors 분리).
6. 공급 예정 품목군 route = `/mypage/business-profile`(Section A-4). `/supplier/profile` → redirect.
7. preselect query param = **없음**(SupplierProfilePage useSearchParams 미사용).
8. row 단위 표시 = 가능(프론트 row + skipped 매핑).
9. UI = **bulk result banner(후보2)** 권장(승인 요청은 복수 선택 bulk action).
10. frontend-only 범위 = §9 전부(상품명·상태분기·CTA·banner).
11. 최소 backend additive = skipped 에 `category`/`status` 동봉(1줄, 선택).

## 12. 개선안 비교 (§6 후보)

| 후보 | 내용 | backend | 판정 |
|---|---|---|---|
| 1 toast 개선 | 문구만 상세화 | 불요 | 부분(복수 한계) |
| **2 bulk result banner** | 성공 N/제외 M + 사유별(상태) + 상품명 + CTA | **불요** | **권장**(bulk 적합) |
| 3 row 사유 badge | 목록 row 에 사유 표시 | 목록 API 에 품목군 상태 필요 가능 | 후속(예방형) |
| 4 pre-check modal | 요청 전 가능/불가 분리 | 불요(요청 후 재구성) | 범위 큼, 후속 |

## 13. 권장 WO 방향

**`WO-O4O-SUPPLIER-PRODUCT-APPROVAL-GATE-UX-MESSAGE-IMPROVEMENT-V1` (후보 A, frontend-only)** — 후보2 banner:
- submitForApproval 결과를 reasonCode 별로 분기, skipped[].id → 상품명/품목군 매핑, 상태별 안내 + 공급 예정 품목군 CTA(`/mypage/business-profile`).
- backend 무변경(응답 이미 충분). DataTable/route/권한/gate 로직 무변경.
- (선택 후속) `WO-...-GATE-REASON-CONTRACT-V1` — skipped 에 category/status additive(1줄) + preselect query param. **불요 우선**.

## 14. 예상 변경 파일 (후속 WO 기준)

- `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx`(결과 처리/banner) (+ 소규모 helper). backend·다른 파일 무변경 예상.

## 15. 검증 계획 (후속 WO)

- web-neture typecheck. 정적: reason 매핑 누락 시 fallback 문구. 배포 후 smoke: 전원 차단/부분 성공/상태별(미등록·반려·심사대기) 메시지 + CTA 이동 확인.

## 16. 완료 기준 확인 (§11)

```
✅ 승인 요청 실패 사유 결정 위치 확인 — backend evaluateGate(reasonCode), 프론트가 합쳐 노출
✅ 품목군 증빙 상태 ↔ 상품 승인 gate 연결 확인 — resolveRegulatedCategory + evaluateGate(status→reasonCode)
✅ 현재 메시지 한계를 코드/contract 로 설명 — 세분화 reasonCode 를 카운트로 합침, productName/category/status 미표시
✅ 최소 개선 방향 확정 — frontend-only banner(후보2), backend 무변경
✅ 후속 WO 범위 = frontend-only (backend additive 는 선택/불필요)
```

## 17. 준수 확인

```
✅ read-only — 코드/DB/route/contract/UI 변경 0
✅ 산출물 = 본 문서 1개(path-specific)
```

---

*read-only · submitForApproval 은 이미 `{submitted, skipped:[{id,reason}], errors}` + 세분화 reasonCode 반환(evaluateGate 가 category/status/reasonCode 계산하나 reasonCode 만 동봉) · 프론트가 SUPPLIER_CATEGORY_* 를 한 버킷 카운트로 합쳐 정보 손실(가설 B+D) · skipped.id(offerId) 로 프론트 상품 row(name/regulatoryType) 매핑 가능 → 개선 frontend-only 충분(후보2 banner, CTA=/mypage/business-profile) · backend additive(category/status 동봉)는 선택/불필요.*
