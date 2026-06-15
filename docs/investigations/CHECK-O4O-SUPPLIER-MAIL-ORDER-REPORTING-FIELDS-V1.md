# CHECK-O4O-SUPPLIER-MAIL-ORDER-REPORTING-FIELDS-V1

> **작업명:** WO-O4O-SUPPLIER-MAIL-ORDER-REPORTING-FIELDS-V1
> **유형:** 기능 추가 — Neture 공급자 온보딩에 통신판매업 신고 정보(상태 / 신고번호 / 신고증 PDF) 추가. 운영자/admin 확인 항목으로 노출.
> **결과: PASS — 공급자가 통신판매업 신고 상태·신고번호·신고증 PDF 를 입력/제출하고, 운영자·admin 검토 화면에서 확인할 수 있다. `reported` 선택 시에만 신고번호 필수. ACTIVE 전환 차단 조건에는 추가하지 않음(운영자 확인 항목). api-server typecheck 0 · web-neture build ✓.**
> 선행: `91aa65516 feat(neture): add supplier onboarding documents and settlement fields` — 2026-06-15

---

## 1. 구현 요약

기준 커밋(91aa65516, 사업자등록증/정산/통장 사본/세금계산서)의 온보딩 구조 위에 통신판매업 신고 정보를 동일 패턴으로 추가했다.

- 데이터: `neture_suppliers` 에 3개 컬럼 추가 — `mail_order_sales_status` / `mail_order_sales_registration_number` / `mail_order_sales_document_id`(→ `kyc_documents` FK).
- 문서: 통신판매업 신고증 PDF 는 기존 `SupplierOnboardingService` + private GCS + `kyc_documents` 구조를 **재사용**(신규 문서 타입 `mail_order_report`). 공개 media library URL 미사용.
- 상태값: `not_applicable`(해당 없음) / `reported`(신고 완료) / `pending`(신고 예정·확인 필요). 미선택 허용(null).
- 검증: `reported` 선택 시에만 신고번호 필수. `pending`/`not_applicable`/미선택은 신고번호 없이 저장 가능. 신고증 PDF 는 모든 상태에서 선택 사항.
- **ACTIVE 전환 차단 정책 무변경** — 통신판매업 정보는 `getMissingBasicOnboardingFields()` 에 추가하지 않음. 운영자 확인 항목으로만 노출(주석으로 의도 명시).

## 2. 수정 파일 (9)

| 파일 | 변경 |
|------|------|
| `apps/api-server/src/database/migrations/20260615140000-AddSupplierMailOrderReporting.ts` | **신규** — 3컬럼 + FK(`kyc_documents`, ON DELETE SET NULL) + 인덱스. `IF NOT EXISTS` 가드. up/down 대칭 |
| `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts` | `mailOrderSalesStatus` / `mailOrderSalesRegistrationNumber` / `mailOrderSalesDocumentId` 컬럼 3개 |
| `apps/api-server/src/modules/neture/services/supplier-onboarding.service.ts` | 문서 타입 union 에 `mail_order_report` 추가 · `MAIL_ORDER_SALES_STATUSES` 상수 · `updateOnboarding` 검증(상태 enum / reported→신고번호 필수) · `uploadDocument`/`getDocumentForSupplier` 분기 · `mapSupplierOnboarding` 응답 확장 · `isAllowedDocumentType` 확장 |
| `apps/api-server/src/modules/neture/services/supplier.service.ts` | `getAllSuppliers` 반환 타입·매핑에 mail order 3필드 추가(운영자/admin 목록 표시용) |
| `services/web-neture/src/lib/api/supplier.ts` | `SupplierOnboardingDocumentType`/`MailOrderSalesStatus` 타입 · `SupplierOnboarding`·`SupplierOnboardingDocument` 확장 · `updateOnboarding`/`uploadDocument`/`downloadDocument` 시그니처 확장 |
| `services/web-neture/src/lib/api/admin.ts` | `AdminSupplier` 에 mail order 3필드 · `downloadDocument` union(admin/operator) 확장 |
| `services/web-neture/src/pages/supplier/SupplierProfilePage.tsx` | Section A-3 "통신판매업 신고 정보" 신규(상태 select / 신고번호 input / 신고증 PDF 업로드·열람). state·handler 확장 |
| `services/web-neture/src/pages/operator/OperatorSupplierApprovalPage.tsx` | 서류/정산 컬럼에 통신판매업 상태·신고번호·신고증 다운로드 표시. `getMissingOnboardingItems` 미변경(차단 조건 아님) |
| `services/web-neture/src/pages/admin/AdminSupplierApprovalPage.tsx` | 동일(operator 대칭) |

> 컨트롤러(`supplier-management`/`operator-supplier`/`admin`)는 **무변경** — 문서 upload/download 라우트가 `:documentType` 를 그대로 service 로 전달하고 service 가 검증하므로, 신규 타입은 service 확장만으로 동작.

## 3. 데이터/API 변경

- **컬럼(neture_suppliers):** `mail_order_sales_status varchar(20)` / `mail_order_sales_registration_number varchar(100)` / `mail_order_sales_document_id uuid` + FK·인덱스.
- **API 무신규 엔드포인트** — 기존 온보딩 계약 확장:
  - `PATCH /neture/supplier/onboarding` — body 에 `mailOrderSalesStatus`, `mailOrderSalesRegistrationNumber` 수용. 검증: `INVALID_MAIL_ORDER_SALES_STATUS`, `MAIL_ORDER_REGISTRATION_NUMBER_REQUIRED`.
  - `POST /neture/supplier/documents/mail_order_report` — 신고증 PDF 업로드(기존 라우트, 타입만 확장).
  - `GET /neture/supplier|operator|admin/.../documents/mail_order_report/download` — 신고증 열람.
  - `GET /neture/supplier/onboarding`, `GET /admin|operator/suppliers` 응답에 mail order 필드 포함.

## 4. 공급자 화면 변경

- `SupplierProfilePage` 에 "통신판매업 신고 정보" 섹션 추가.
  - 신고 상태 select(해당 없음/신고 완료/신고 예정·확인 필요/선택 안 함).
  - 신고번호 input — `신고 완료` 선택 시 `*` 필수 표기 + 안내.
  - 신고증 PDF 업로드(`application/pdf` 검증) + 제출 파일 열람.
  - 저장 버튼은 기존 온보딩 저장 핸들러 재사용(정산+통신판매업 동시 저장).
  - 안내 문구: "O4O 는 신고 대상 여부나 유효성을 보증하지 않으며, 운영자 확인을 위한 참고 정보로만 사용됩니다." (금지 표현 미사용).

## 5. 운영자/admin 화면 변경

- `OperatorSupplierApprovalPage` / `AdminSupplierApprovalPage` 서류/정산 컬럼에:
  - `통신판매업: {상태 라벨} ({신고번호})` 또는 `통신판매업: 미입력` 표시.
  - 신고증 제출 시 다운로드 버튼("통신판매업 신고증").
- 활성화/승인 버튼 disable 조건은 **무변경**(통신판매업 미입력이어도 활성화 가능).

## 6. 접근 권한/보안 처리

- 신고증 PDF 는 `kyc_documents` + private GCS(`gcs://`, `cacheControl: private, no-store`) 재사용. 공개 URL 없음.
- 열람: 공급자 본인 / Neture operator / Neture admin 라우트 가드(`requireLinkedSupplier` / `requireNetureScope('neture:operator'|'neture:admin')`). 비로그인·타 공급자·매장·일반 회원·공개 페이지 접근 불가.
- 계좌번호 마스킹 등 기존 처리 무변경(통신판매업 신고번호는 비밀정보 아님 — 평문 노출 의도).

## 7. ACTIVE 전환 차단 정책

- **차단 조건 미추가.** 통신판매업 정보 부재로 ACTIVE 전환을 막지 않는다(모든 공급자가 신고 대상이라 단정 불가).
- `supplier.service.ts getMissingBasicOnboardingFields()` 및 프론트 `getMissingOnboardingItems()` 에 통신판매업 항목을 **의도적으로 미포함**(주석 명시).
- 단, `reported` 상태에서는 신고번호를 필수 검증(저장 단계 게이트, 활성화 게이트 아님).

## 8. 검증 결과

- **api-server:** `pnpm --filter @o4o/api-server type-check` → `tsc --noEmit` **0 errors** ✅
- **web-neture:** `pnpm --filter @o4o/web-neture build` → `✓ built in ~11s` ✅
- **무변경 확인:** 기존 사업자등록증/통장/정산/세금계산서 필드·검증·차단 정책 회귀 없음(동일 핸들러·동일 차단 함수).
- **browser/DB smoke:** 미수행 — dev 서버·인증 guard. **배포 후 권장**(§10).

## 9. 제외한 항목

- **품목군별 증빙:** 미포함(차기 WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1).
- **제품 등록 gate:** 무변경.
- **외부 검증/OCR / 신고 대상 자동 판정 / 행정 API:** 미수행. O4O 는 신고 유효성 비보증.
- **통신판매업 신고증 필수 차단:** 미적용(선택 사항).

## 10. 후속

1. **(배포 후)** 공급자 `/supplier/profile` 에서 통신판매업 상태 저장·신고번호·신고증 업로드/열람 smoke. 운영자/admin 검토 화면 표시·다운로드 smoke.
2. (read-only) `neture_suppliers.mail_order_sales_*` 컬럼·FK·인덱스 생성 확인(gcloud).
3. 차기: **WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1**(품목군별 증빙) → **WO-O4O-SUPPLIER-PRODUCT-REGISTER-BY-CATEGORY-STATUS-V1**(품목군 승인 ↔ 제품 등록 gate).

---

*Date: 2026-06-15 · 기능 추가 PASS · 통신판매업 신고 정보(상태/신고번호/신고증 PDF) 추가. reported 시에만 신고번호 필수. ACTIVE 전환 차단 미적용(운영자 확인 항목). 신고증 PDF 는 private GCS+kyc_documents 재사용. api-server typecheck 0 · web-neture build ✓. 컨트롤러 무변경. 배포 후 smoke 권장.*
