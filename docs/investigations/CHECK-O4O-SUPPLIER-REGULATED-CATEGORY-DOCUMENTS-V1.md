# CHECK-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1

> **작업명:** WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1
> **유형:** 기능 추가 — Neture 공급자 온보딩에 공급 예정 품목군 선택 + 품목군별 증빙 PDF 제출/검토 구조 추가. 전용 entity 신규.
> **결과: PASS — 공급자가 품목군(의약품/의료기기/건기식/화장품 등 8종)을 선택하고 품목군별 증빙 PDF 를 제출, 운영자·admin 이 품목군별 O4O 내부 등록 가능 상태(approved/rejected/needs_update/suspended)와 검토 메모를 관리한다. 제품 등록 gate 미연결. api-server typecheck 0 · web-neture build ✓.**
> 선행: `91aa65516`(기본 서류/정산) · `5c26381bc`(통신판매업 신고) — 2026-06-15

---

## 1. 구현 요약

공급자 온보딩 위에 **공급 예정 품목군** 축을 추가했다.

- 전용 entity `NetureSupplierRegulatedCategory`(테이블 `neture_supplier_regulated_categories`) — 한 공급자 × 한 품목군 = 1 row(UNIQUE).
- 품목군 8종: 일반 상품 / 의약품 / 의약외품 / 의료기기 / 건강기능식품 / 식품 / 화장품 / 기타 법정 관리 품목.
- 상태 6종: `not_requested`(미신청) / `submitted`(서류 제출) / `approved`(등록 가능) / `rejected`(반려) / `needs_update`(보완 필요) / `suspended`(사용 제한).
- 증빙 PDF 는 `kyc_documents`(private GCS, `documentType='regulated_category_evidence'`) **재사용**. 공개 URL 미사용.
- 공급자: 품목군 선택/해제, 허가·신고 번호 입력, 증빙 업로드/열람. 증빙 업로드 시 `submitted` 전이(단 `suspended` 는 유지 — 공급자 업로드로 운영자 제한 미해제).
- 운영자/admin: 품목군별 상태 변경 + 검토 메모 + 증빙 다운로드(전용 검토 모달).
- **제품 등록 gate 미연결**(본 WO 범위 외). O4O 는 법적 허가를 인증하지 않으며 내부 등록 가능 상태만 관리.

## 2. 수정 파일 (13)

**Backend (7)**
| 파일 | 변경 |
|------|------|
| `apps/api-server/src/modules/neture/entities/NetureSupplierRegulatedCategory.entity.ts` | **신규** entity + `REGULATED_CATEGORIES`/`REGULATED_CATEGORY_STATUSES` 상수·타입 |
| `apps/api-server/src/modules/neture/entities/index.ts` | entity·상수·타입 export |
| `apps/api-server/src/database/connection.ts` | entities 배열 등록 |
| `apps/api-server/src/database/migrations/20260615150000-AddSupplierRegulatedCategories.ts` | **신규** — 테이블 생성 + FK(neture_suppliers CASCADE / kyc_documents SET NULL) + UNIQUE(supplier_id,category) + 인덱스. `IF NOT EXISTS` 가드 |
| `apps/api-server/src/modules/neture/services/supplier-regulated-category.service.ts` | **신규** service — list/select/remove/updateCategory/uploadEvidence/getEvidenceDocument/review/createReadStream. private GCS 업로드(온보딩 패턴 재사용) |
| `apps/api-server/src/modules/neture/controllers/supplier-management.controller.ts` | 공급자 라우트 6개(GET list / POST select / PATCH reg-number / DELETE remove / POST document / GET download) |
| `apps/api-server/src/modules/neture/controllers/operator-supplier.controller.ts` · `admin.controller.ts` | 운영자/admin 라우트 각 3개(GET list / PATCH review / GET download). admin 은 `neture:admin` scope |

**Frontend (6)**
| 파일 | 변경 |
|------|------|
| `services/web-neture/src/lib/api/supplier.ts` | 타입(`RegulatedCategory`/`RegulatedCategoryStatus`/`SupplierRegulatedCategory`) · 라벨/순서 상수 · `supplierRegulatedCategoryApi`(list/select/remove/updateRegistrationNumber/uploadEvidence/downloadEvidence) |
| `services/web-neture/src/lib/api/index.ts` | 신규 심볼 re-export |
| `services/web-neture/src/lib/api/admin.ts` | admin/operator supplier api 에 listRegulatedCategories/reviewRegulatedCategory/downloadRegulatedEvidence 추가 |
| `services/web-neture/src/components/supplier/SupplierRegulatedCategoriesModal.tsx` | **신규** — operator/admin 공용 검토 모달(api 주입) |
| `services/web-neture/src/pages/supplier/SupplierProfilePage.tsx` | Section A-4 "공급 예정 품목군"(선택/번호/증빙 업로드·열람/운영자 메모 표시) |
| `services/web-neture/src/pages/operator/OperatorSupplierApprovalPage.tsx` · `admin/AdminSupplierApprovalPage.tsx` | 관리 컬럼 "품목군" 버튼 → 검토 모달 |

## 3. 데이터/API

- **테이블 `neture_supplier_regulated_categories`:** id / supplier_id / category / status / evidence_document_id(FK kyc_documents) / registration_number / reviewed_by / reviewed_at / review_note / timestamps. UNIQUE(supplier_id, category).
- **공급자 API(`/neture/supplier/regulated-categories`):** GET 목록 · POST `{category}` 선택 · PATCH `:category {registrationNumber}` · DELETE `:category`(잠금 시 `CATEGORY_LOCKED`) · POST `:category/document`(PDF) · GET `:category/document/download`.
- **운영자/admin API(`/neture/operator|admin/suppliers/:id/regulated-categories`):** GET 목록 · PATCH `:category {status, reviewNote}`(status∈approved/rejected/needs_update/suspended, 그 외 `INVALID_REVIEW_STATUS`) · GET `:category/document/download`.

## 4. 화면

- **공급자(`/supplier/profile`):** 품목군 8종 체크박스. 선택 시 상태 뱃지·허가/신고 번호(onBlur 저장)·증빙 업로드(즉시)·열람·운영자 메모(rejected/needs_update/suspended) 노출. 검토중/승인/제한 품목군은 해제 비활성.
- **운영자/admin:** 공급자 행 "품목군" 버튼 → 모달(품목군별 상태·번호·증빙 다운로드·검토 메모·상태 4종 설정 버튼).
- 안내: "O4O 는 법적 허가 여부를 인증하지 않으며, 제출 서류는 운영자 검토용 참고 정보로만 사용됩니다."(금지 표현 미사용).

## 5. 접근 권한/보안

- 증빙 PDF 는 `kyc_documents` + private GCS(`gcs://`, `private, no-store`) 재사용. 공개 URL 없음.
- 다운로드는 `supplierId` 로 격리(공급자=requireLinkedSupplier, 운영자/admin=scope guard). 비로그인·타 공급자·매장·일반 회원 접근 불가.

## 6. 원칙 준수 (WO 명시)

- 공급자 법적 유형 enum 미생성(도매상/제조사/수입사 등 없음).
- O4O 법적 허가 인증 표현 미사용 — "내부 등록 가능 상태"만 관리.
- **제품 등록 gate 미연결**(차기 WO). 제품 등록 UI / 의약품·OTC·Rx 흐름 무변경.
- 외부 행정 API / OCR / 자동 판정 없음.
- 품목군별 증빙은 제품 등록 시마다 반복 확인하지 않음(공급자 단위 1회 관리).

## 7. 검증

- **api-server:** `pnpm --filter @o4o/api-server type-check` → `tsc --noEmit` **0 errors** ✅
- **web-neture:** `pnpm --filter @o4o/web-neture build` → `✓ built in ~11s` ✅
- **무변경 확인:** 기존 온보딩(서류/정산/통신판매업)·승인 차단 정책·제품/오퍼/펀딩 흐름 회귀 없음.
- **browser/DB smoke:** 미수행 — dev 서버·인증 guard. **배포 후 권장**(§9).

## 8. 제외 (본 WO 범위 외)

제품 등록 gate 연결 / 제품 등록 유형 UI / 상품 승인 흐름 변경 / B2B·판매자 모집 / 이벤트 오퍼 / 유통참여형 펀딩 / 외부 검증·OCR·자동 판정 / 공급자 법적 유형 enum.

## 9. 후속

1. **(배포 후)** 공급자 품목군 선택·번호·증빙 업로드/열람 smoke. 운영자/admin 모달 상태 변경·다운로드 smoke. (read-only) `neture_supplier_regulated_categories` 테이블·FK·UNIQUE 생성 확인(gcloud).
2. 차기: **WO-O4O-SUPPLIER-PRODUCT-REGISTER-BY-CATEGORY-STATUS-V1** — 제품 등록 시 품목군 `approved` 상태 gate 연결.
3. 이후: 제품 등록 유형(운영자 승인/B2B/판매자 모집) → 이벤트 오퍼 lifecycle → 유통참여형 펀딩 lifecycle.

---

*Date: 2026-06-15 · 기능 추가 PASS · 공급자 품목군별 증빙 구조(전용 entity + 8품목군 × 6상태 + 증빙 PDF + 운영자/admin 검토). 제품 등록 gate 미연결. private GCS+kyc_documents 재사용. api-server typecheck 0 · web-neture build ✓. 배포 후 smoke 권장.*
