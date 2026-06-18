# CHECK-O4O-NETURE-SUPPLIER-REGULATED-CATEGORY-NUMBER-FIRST-V1

> **작업명:** WO-O4O-NETURE-SUPPLIER-REGULATED-CATEGORY-NUMBER-FIRST-V1
> **유형:** backend + frontend — 규제 품목군 검토 요청을 **파일 업로드 단독 트리거 → 번호 우선**으로. migration 없음.
> **결과: PASS(코드·typecheck backend+frontend) / 브라우저 smoke = 배포 후 권장.**
> 선행: IR 2건 + WO-O4O-NETURE-SUPPLIER-GENERAL-CATEGORY-NO-DOCUMENT-V1 — 2026-06-17

## 1. 기존 구조 요약

- `submitted` 상태는 **`uploadEvidence`에서만** 생성(`row.status = 'submitted'`, suspended 제외). → 파일 업로드가 검토 요청의 사실상 유일 트리거.
- `updateCategory`(번호 저장)는 **상태 변경 없음**.
- `registrationNumber`·`evidenceDocumentId` 모두 **nullable, 기존 존재** → **migration 불필요**(WO §10/§11 우선 조건 충족).

## 2. 변경 파일

| 파일 | 변경 |
|------|------|
| `apps/api-server/.../services/supplier-regulated-category.service.ts` | `submitForReview(supplierId, category)` 추가 — 번호 또는 증빙 중 최소 하나 있으면 `submitted`. approved/suspended 잠금, 둘 다 없으면 `REVIEW_REQUIRES_NUMBER_OR_FILE` |
| `apps/api-server/.../controllers/supplier-management.controller.ts` | `POST /regulated-categories/:category/submit` 라우트 추가(requireAuth+requireLinkedSupplier) |
| `services/web-neture/src/lib/api/supplier.ts` | `supplierRegulatedCategoryApi.submitForReview(category)` |
| `services/web-neture/.../supplier/SupplierProfilePage.tsx` | `handleSubmitCategoryReview` + "검토 요청/재검토 요청" 버튼, 번호 우선 안내, 파일 라벨 "(선택)", 섹션 intro 문구 |
| `docs/investigations/CHECK-...-NUMBER-FIRST-V1.md` | 본 CHECK |

> **migration/entity/DB schema 변경 0.** 제품 등록 flow·제품 승인 gate·일반 상품 분기 무변경.

## 3. 번호 우선 제출 방식

- 신규 service `submitForReview`:
  - approved → `ALREADY_APPROVED`(잠금), suspended → `CATEGORY_SUSPENDED`(잠금).
  - **번호(`registrationNumber`) 또는 증빙(`evidenceDocumentId`) 중 최소 하나 없으면 `REVIEW_REQUIRES_NUMBER_OR_FILE`**(번호 없는 빈 제출 차단 — WO §7.3).
  - 그 외(not_requested/needs_update/rejected) → `submitted`. submitted는 idempotent.
- 즉 **파일 없이 번호만으로 submitted 진입 가능**, 번호·파일 둘 다 없으면 차단.

## 4. 파일 선택화 방식

- `uploadEvidence`는 그대로 유지(파일 업로드 시에도 submitted — 파일도 유효한 제출 근거). 단 **더 이상 유일 트리거 아님**.
- FE: 파일 입력 라벨 "증빙 PDF 첨부 (선택)", 안내 "허가/신고 번호를 입력하면 운영자 검토를 요청할 수 있습니다. 증빙 PDF는 선택…". 섹션 intro도 번호 우선으로 문구 변경.

## 5. 상태 전이 변경 내용

| 출발 status | 트리거 | 도착 |
|------|------|------|
| not_requested | 검토 요청(번호 or 파일 보유) | submitted |
| needs_update | 재검토 요청(번호 수정/파일 보완) | submitted |
| rejected | 재검토 요청 | submitted |
| (기존) any → submitted | 파일 업로드 | submitted (유지) |
| approved / suspended | 검토 요청 | **잠금(전이 없음)** |

- enum 재설계 없음(기존 6 status 유지). `review()`(운영자) 경로·`evaluateGate` 무변경.

## 6. general 품목군 미변경 확인

- "검토 요청" 버튼·번호/파일 입력은 **`!isGeneral` 블록 안에만** 존재. general은 직전 WO의 "서류 불필요" 안내 분기 그대로 → **영향 0**.

## 7. 제품 등록/제품 승인 gate 미변경 확인

- `evaluateGate`(제품 등록 gate)·`offer.service.submitForApproval`(제품 판매 승인 gate) **미수정** — 규제 품목군 `approved` 전 제품 submit-approval 차단 정책 그대로(WO §7.2).
- 번호만으로는 submitted 까지만 — **approved/제품 판매는 운영자 승인 필요**(WO §7.3 충족).

## 8. backend/API/DB 변경 여부

- backend: service 메서드 1 + 라우트 1 추가(기존 패턴). **DB/migration/entity 변경 없음**(기존 nullable 컬럼 사용).
- API: 신규 엔드포인트 `POST /neture/supplier/regulated-categories/:category/submit`.

## 9. 검증 결과

- **typecheck**: web-neture `tsc --noEmit` EXIT 0 / api-server `tsc --noEmit` EXIT 0.
- 정적: submitForReview 잠금/필수 분기, FE 버튼 노출 조건(not_requested/needs_update/rejected), general 미노출 확인.
- **브라우저 smoke = 배포 후 권장**(backend 포함 → api-server + web-neture 배포 필요). 배포 후 `/mypage/business-profile`(공급자):
  1. 규제 품목군 선택 → 번호 입력란 + "증빙 PDF 첨부 (선택)" + "검토 요청" 버튼 노출.
  2. 번호만 입력 → 검토 요청 → status `submitted` 배지.
  3. 번호·파일 모두 없이 검토 요청 → 안내(REVIEW_REQUIRES_NUMBER_OR_FILE) 노출.
  4. 일반 상품 → "서류 불필요" 유지(회귀 없음).
  5. 운영자 화면 → 파일 없는 submitted row 검토(approve/reject/needs_update) 가능.

## 10. 회귀(정적)

- 기존 파일 업로드 → submitted 경로 유지. 운영자 review/제품 gate 무변경. general 분기 유지. enum 무변경.

---

*backend+frontend · 규제 품목군 검토 요청 트리거를 파일 단독 → 번호 우선(번호 또는 파일 최소 하나)으로 · submitForReview service+route+API+FE "검토 요청" 버튼 · migration 없음 · general/제품 gate/제품 승인 무변경 · typecheck backend+frontend EXIT 0 · 브라우저 smoke 배포 후 권장.*
