# CHECK-O4O-SUPPLIER-PRODUCT-APPROVAL-GATE-UX-MESSAGE-IMPROVEMENT-V1

> **작업명:** WO-O4O-SUPPLIER-PRODUCT-APPROVAL-GATE-UX-MESSAGE-IMPROVEMENT-V1
> **유형:** frontend-only — 승인 요청 실패/부분 차단 시 reasonCode별 상태·다음행동·상품명·CTA 를 result banner 로 안내. backend/contract/route/gate 무변경.
> **결과: PASS — `SupplierProductsPage.tsx` 단일 파일. skipped[].id(offerId)→상품 매핑(상품명/품목군) + 9개 reasonCode별 상태/다음작업 문구 + 공급 예정 품목군 CTA(`/mypage/business-profile`). 전원 성공은 toast, 그 외(부분/전체 제외·오류)는 banner. web-neture tsc EXIT 0.**
> 선행: IR-O4O-SUPPLIER-PRODUCT-APPROVAL-GATE-REASON-DISCLOSURE-V1 — 2026-06-18

---

## 1. 변경 파일

| 파일 | 변경 |
|------|------|
| `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | reasonCode 표시 맵(모듈) + `approvalResult` state + 핸들러 결과 빌드 + result banner 렌더 |

> backend/API/DB/route/권한/gate/다른 파일/package·lock **무변경.** 신규 모듈 추출 없음(동일 파일 내 const/type).

## 2. reasonCode별 메시지 매핑 (APPROVAL_GATE_REASON_DISPLAY)

| reasonCode | 상태 | CTA |
|---|---|:--:|
| SUPPLIER_CATEGORY_NOT_SELECTED | 공급 예정 품목군에 아직 등록되지 않았습니다 | ✅ |
| SUPPLIER_CATEGORY_NOT_APPROVED | 해당 품목군이 운영자 확인 대기 중입니다 | ✅ |
| SUPPLIER_CATEGORY_NEEDS_UPDATE | 해당 품목군 증빙에 보완이 필요합니다 | ✅ |
| SUPPLIER_CATEGORY_REJECTED | 해당 품목군 신청이 반려되었습니다 | ✅ |
| SUPPLIER_CATEGORY_SUSPENDED | 해당 품목군이 정지 상태입니다 | ✅ |
| SUPPLIER_CATEGORY_UNRESOLVED | 해당 상품의 품목군 상태를 확인할 수 없습니다 | ✅ |
| NO_ELIGIBLE_SERVICE_KEYS | 노출 가능한 서비스 대상이 없습니다 | — |
| DRUG_SERVICE_NOT_PHARMACY_AUDIENCE | 의약품은 약국 대상 서비스에만 승인 요청 가능 | — |
| ALREADY_REQUESTED_OR_DECIDED | 이미 승인 요청 중이거나 처리된 상품 | — |
| (그 외/미상) fallback | 승인 요청 조건을 충족하지 못했습니다 | — |

- 각 항목은 `status`(현재 상태) + `nextAction`(다음 작업) 2문장. 상품명/품목군은 row 매핑으로 채움.

## 3. CTA 적용 기준

- CTA label: **"공급 예정 품목군 관리로 이동"** → `/mypage/business-profile`.
- 노출 조건: skipped 중 **하나라도 `display.cta===true`**(= SUPPLIER_CATEGORY_* 6종) 이면 푸터에 표시.
- 서비스 대상 문제(NO_ELIGIBLE_SERVICE_KEYS / DRUG_SERVICE_NOT_PHARMACY_AUDIENCE)·ALREADY 는 CTA 없음(상품 편집/상태 확인 안내 문구만).
- preselect query param 미추가(현 route 미지원 — Known Limitation).

## 4. 결과 처리 분기

- `skipped===0 && errors===0` → 간단 toast `"N건 승인 요청 완료"`.
- 그 외(부분 성공 / 전체 제외 / 오류 포함) → **banner**:
  - 요약: 승인 요청 완료 N건 / 제외 M건 / (오류 K건).
  - `submitted===0 && skipped>0` → "선택한 상품 중 승인 요청 가능한 상품이 없습니다."
  - 제외 상품 리스트(상품명 + 품목군 badge + 상태 + 다음 작업).
  - 푸터: 품목군 CTA(조건부) + 확인.
- skipped[].id(offerId) → `products.find(pr.id===id)` → 상품명(name/masterName) + 품목군(REGULATORY_TYPE_LABELS[regulatoryType] ?? categoryName). 매핑 실패 시 `상품 ID: {id}` fallback.

## 5. 제거된 기존 동작

- 기존: 모든 `SUPPLIER_CATEGORY_*` 를 "품목군 미승인" 한 버킷 카운트 toast(상품명/상태/CTA 없음). → reasonCode별 분기 + 상품명 + CTA banner 로 대체.
- gate 판단/요청 가능 상품 처리/탭 카운트 refresh(`fetchProducts`/`fetchTabCounts`)·선택 초기화 로직 **무변경**.

## 6. 검증

- **web-neture `tsc --noEmit`: EXIT 0** (SupplierProductsPage 에러 0; 무관한 import.meta.env 사전존재 artifact 제외).
- 정적: reasonCode 미상 시 fallback. 상품 매핑 실패 시 ID fallback. CTA 조건부. banner backdrop/확인/X 닫기.
- **배포 후 smoke(권장)**: 품목군 미등록(NOT_SELECTED)→상품명/품목군/상태/CTA 표시·이동 / 심사대기(NOT_APPROVED) / 보완(NEEDS_UPDATE) / 반려(REJECTED) / 부분성공(완료+제외 동시) / 전체제외 문구. 회귀: 목록 로딩·선택·요청가능 상품 정상 요청·탭 카운트·route·console error 0.

## 7. backend 변경 없음

- `submitForApproval` 응답(`{submitted, skipped:[{id,reason}], errors}`)을 **그대로 소비**. contract/엔드포인트/gate/DB 무변경. frontend 는 이미 받은 reasonCode 를 정확히 표시만.

## 8. Known Limitation

- skipped item 에 category/status 를 backend 가 직접 동봉하지 않음 → 품목군은 **상품 row 의 regulatoryType** 으로 표시(상품의 규제유형 라벨). 공급자 품목군의 정확한 상태(needs_update 등)는 reasonCode 로 간접 표현.
- `/mypage/business-profile?category=...` preselect 미지원(현 route). 정밀 유도/ row 사전 badge / pre-check modal / backend additive 는 **후속 WO** 분리.

## 9. 완료 판정

**PASS.** 승인 요청 차단 시 "어떤 상품이 / 어떤 품목군 / 어떤 상태라서 / 무엇을 해야 하는지 / 어디로" 를 banner 로 안내. frontend-only, backend 무변경, tsc 0.

**커밋:** path-specific 2파일(page + CHECK).

---

*Date: 2026-06-18 · frontend-only · submitForApproval skipped reasonCode 9종 → 상태/다음행동 + 상품명(offerId 매핑) + 공급 예정 품목군 CTA banner · 전원성공 toast / 그외 banner · backend·contract·route·gate 무변경 · web-neture tsc EXIT 0.*
