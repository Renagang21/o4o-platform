# IR-O4O-SUPPLIER-ONBOARDING-CURRENT-PROCESS-AUDIT-V1

## 1. 조사 요약

현재 Neture 공급자 가입/승인 흐름은 2단계로 구현되어 있다.

1. 일반 회원가입/서비스 가입 신청: `/register` 또는 `RegisterModal`에서 Neture 서비스 `service_memberships`를 `pending`으로 생성한다. supplier role 신청 시 사업자 기본 정보 일부를 `users.businessInfo`에 저장한다.
2. 운영자 가입 승인: `/operator/registrations`에서 `service_memberships.status`와 `users.status`를 active로 바꾸고, supplier role이면 `neture_suppliers` 레코드를 `PENDING`으로 생성한다.
3. 공급자 활성화: `/operator/suppliers` 또는 `/admin/suppliers`에서 `neture_suppliers.status`를 `PENDING -> ACTIVE` 또는 `REJECTED`로 변경한다. `ACTIVE`가 되어야 공급자 제품 등록/수정/승인요청 같은 쓰기 API를 사용할 수 있다.

현재 구현된 항목은 공급자 계정 연결, 사업자 기본 정보 일부, 세금계산서 이메일, 운영자 가입 승인, 운영자 공급자 활성화, 제품 등록 상태 게이트다.

현재 구현되지 않았거나 온보딩에 연결되지 않은 항목은 사업자등록증 PDF, 통장 사본 PDF, 정산 계좌 입력, 통신판매업 신고 정보, 공급 예정 품목군 선택, 품목군별 증빙 PDF, 품목군별 제품 등록 가능 상태다.

## 2. 현재 화면/route 구조

| 구분 | route | 위치 | 비고 |
| --- | --- | --- | --- |
| 공급자 랜딩 | `/supplier` | `services/web-neture/src/pages/SupplierLandingPage.tsx` | 공급자 등록 CTA는 `/register`, 로그인은 login modal로 연결 |
| 일반 가입/공급자 신청 | `/register` / `RegisterModal` | `services/web-neture/src/components/RegisterModal.tsx` | supplier role 선택 시 사업자 정보 일부 입력 |
| 공급자 대시보드 | `/supplier/dashboard` | `services/web-neture/src/App.tsx` | supplier workspace |
| 공급자 프로필 | `/mypage/business-profile` | `services/web-neture/src/pages/mypage/MyBusinessProfilePage.tsx` | 내부에서 `SupplierProfilePage` 재사용 |
| 구 공급자 프로필 route | `/supplier/profile` | `services/web-neture/src/App.tsx` | `/mypage/business-profile`로 redirect |
| 공급자 제품 목록 | `/supplier/products` | `services/web-neture/src/pages/supplier/SupplierProductsPage.tsx` | 제품 관리 |
| 공급자 제품 등록 진입 | `/supplier/products/register` | `services/web-neture/src/pages/supplier/SupplierProductRegisterEntryPage.tsx` | 제품 유형 선택 후 단일/대량 등록 |
| 단일 제품 등록 | `/supplier/products/new` | `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` | query로 `productType`, `regulatoryType` 전달 |
| 대량 등록 | `/supplier/products/bulk` | `services/web-neture/src/pages/supplier/SupplierBulkRegisterPage.tsx` | 유형별 템플릿 |
| 공급자 정산 조회 | `/account/supplier/settlements` | `services/web-neture/src/pages/account/SupplierSettlementsPage.tsx` | 정산 결과 조회 중심 |
| 운영자 가입 신청 관리 | `/operator/applications` | `services/web-neture/src/pages/operator/registrations/RegistrationRequestsPage.tsx` | `service_memberships` 기반 가입 승인/거부 |
| 운영자 공급자 활성화 | `/operator/suppliers` | `services/web-neture/src/pages/operator/OperatorSupplierApprovalPage.tsx` | `neture_suppliers` PENDING -> ACTIVE/REJECTED |
| admin 공급자 관리 | `/admin/...` API, admin 화면 | `apps/api-server/src/modules/neture/controllers/admin.controller.ts` | admin scope supplier approve/reject/deactivate |

## 3. 현재 입력 필드

| 항목 | 현재 존재 여부 | 위치 | 비고 |
| --- | ---: | --- | --- |
| 사업자명 | 있음 | `RegisterModal`, `users.businessInfo.businessName`, `organizations.name` | supplier 승인 시 org name으로 연결 |
| 대표자명 | 있음 | `RegisterModal`, `SupplierProfilePage`, `neture_suppliers.representative_name` | 가입 신청 목록에도 표시 |
| 사업자등록번호 | 있음 | `RegisterModal`, `SupplierProfilePage`, `organizations.business_number` | `neture_suppliers`에서는 제거되고 org SSOT로 읽음 |
| 사업자등록증 PDF | 없음 | 없음 | `KycDocument`는 있으나 Neture supplier onboarding에 연결되지 않음 |
| 담당자명 | 있음 | `RegisterModal`, `SupplierProfilePage` | `users.businessInfo.contactName`, `neture_suppliers.manager_name` |
| 담당자 이메일 | 부분 있음 | 계정 email, contactEmail | 별도 supplier 담당자 이메일 필드보다는 계정/공개 연락처 중심 |
| 담당자 휴대폰 | 있음 | `RegisterModal`, `SupplierProfilePage` | `managerPhone`/`contactPhone` 혼재 |
| 정산 계좌 정보 | 없음 | 없음 | 공급자 정산 엔진은 있으나 계좌 필드 없음 |
| 통장 사본 PDF | 없음 | 없음 | `KycDocument.bank_statement` 타입은 있으나 연결 API/UI 없음 |
| 세금계산서용 이메일 | 있음 | `RegisterModal`, `SupplierProfilePage`, `neture_suppliers.tax_invoice_email` | 가입 신청/공급자 목록에도 표시 |
| 통신판매업 신고 정보 | 없음 | 없음 | `service-legal`에는 통신판매업 관련 서비스 법무 필드가 있으나 supplier onboarding 필드는 아님 |
| 공급 예정 품목군 | 없음 | 없음 | 제품 등록 유형 선택은 있으나 공급자 온보딩 품목군 저장은 없음 |
| 품목군별 증빙 PDF | 없음 | 없음 | supplier category document 구조 없음 |
| 약관/정책 동의 | 부분 있음 | auth register | TOS/privacy/marketing timestamp는 있으나 supplier 운영정책/책임 고지 전자 동의는 별도 구조 없음 |

## 4. 현재 backend 구조

### 관련 entity

- `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts`
  - `status`: `PENDING | ACTIVE | INACTIVE | REJECTED`
  - `userId`: 사용자 계정 연결
  - `organizationId`: `organizations` 연결
  - `approvedBy`, `approvedAt`, `rejectedReason`: 공급자 활성화/거절 메타데이터
  - 사업자/연락처 일부: `representativeName`, `managerName`, `managerPhone`, `businessType`, `businessItem`, `taxInvoiceEmail`
  - 배송/주문 조건: `minOrderAmount`, `minOrderSurcharge`, `baseShippingFee`, `freeShippingThreshold`, `averageDispatchDays`
- `users.businessInfo`
  - 가입 시 `businessName`, `businessNumber`, `businessType`, `businessItem`, `representativeName`, `taxInvoiceEmail`, `contactName`, `managerPhone`, `businessEntityType`, `businessStartDate`, `businessAddress`, `businessAddressDetail` 저장.
- `service_memberships`
  - Neture 서비스 가입 신청 상태와 role 저장. `pending -> active/rejected`.
- `organizations`
  - supplier 사업자명, 사업자번호, 주소 일부의 canonical read/write 대상.
- `apps/api-server/src/entities/KycDocument.ts`
  - 범용 KYC 문서 엔티티. `business_registration`, `bank_statement` 타입은 정의되어 있으나 Neture supplier onboarding route/UI와 연결된 구현은 확인되지 않음.
- `SupplierProductOffer`, `ProductMaster`
  - 공급자 제품 등록/승인/분류 구조. supplier onboarding 서류 상태와 직접 연결되지는 않음.
- `NetureSettlement`
  - 정산 결과/상태/금액 엔진. 계좌 등록 구조는 아님.

### 관련 controller/service/API

- 가입/계정 생성:
  - `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts`
  - 신규 가입 시 `users`, `service_memberships(status=pending)`, `users.businessInfo` 생성.
- 운영자 가입 승인:
  - `apps/api-server/src/modules/neture/controllers/operator-registration.controller.ts`
  - `apps/api-server/src/modules/neture/services/operator-registration.service.ts`
  - supplier role 승인 시 `neture_suppliers(status=PENDING)` 자동 생성.
- 공급자 등록 API:
  - `apps/api-server/src/modules/neture/controllers/supplier-management.controller.ts`
  - `POST /api/v1/neture/supplier/register`
  - 입력은 `name`, `slug`, `contactEmail` 중심. 현재 랜딩 CTA는 `/register`로 연결되어 별도 supplier register form은 확인되지 않음.
- 공급자 프로필:
  - `GET /api/v1/neture/supplier/profile`
  - `PATCH /api/v1/neture/supplier/profile`
  - 조회는 linked supplier 허용, 수정은 active supplier만 허용.
- 공급자 활성화:
  - `POST /api/v1/neture/operator/suppliers/:id/approve`
  - `POST /api/v1/neture/operator/suppliers/:id/reject`
  - admin scope에는 approve/reject/deactivate가 있음.
- 공급자 제품:
  - `POST /api/v1/neture/supplier/products`
  - `PATCH /api/v1/neture/supplier/products/...`
  - `POST /api/v1/neture/supplier/products/submit-approval`
  - 쓰기 API는 `requireActiveSupplier`.

### 파일 업로드 구조

- 공용 media upload:
  - `services/web-neture/src/lib/api/media.ts`
  - `/platform/media-library/upload`
- legacy/general media upload:
  - `apps/api-server/src/controllers/media/mediaUploadController.ts`
  - PDF MIME/확장자는 허용.
- 제품 이미지 upload:
  - `services/web-neture/src/lib/api/product.ts`
  - `apps/api-server/src/modules/neture/controllers/admin.controller.ts`
- 공급자 문서 업로드 전용 API:
  - 확인되지 않음.
- 운영자 전용 문서 열람 권한:
  - supplier onboarding 문서 기준으로 확인되지 않음.

## 5. 현재 운영자 검토 구조

### 가입 신청 검토

`/operator/applications`는 `service_memberships`와 `users.businessInfo`를 기반으로 가입 신청을 보여준다.

확인 가능한 항목:

- 이름, 이메일, 전화번호
- role
- 회사/사업자명
- 사업자등록번호
- 대표자명
- 사업자유형
- 업태/종목
- 개업일
- 사업장 주소
- 담당자명
- 담당자 휴대폰
- 세금계산서 이메일
- 운영자 메모
- 승인/거절/일괄 처리
- supplier role인 경우 `neture_suppliers.status` 표시

확인되지 않은 항목:

- 사업자등록증 PDF 확인
- 통장 사본 PDF 확인
- 통신판매업 신고증 확인
- 품목군별 증빙 서류 확인

### 공급자 활성화 검토

`/operator/suppliers`는 `neture_suppliers` 목록을 보여주고 `PENDING -> ACTIVE/REJECTED`를 처리한다.

표시 항목:

- 공급자명
- 대표자
- 사업자번호
- 이메일/세금계산서 이메일
- 상태
- 등록일

액션:

- PENDING 공급자 활성화
- PENDING 공급자 거절

제한:

- operator scope에서는 deactivate가 없음.
- admin scope에는 deactivate가 있음.
- 상세 서류/정산/문서 검토 UI는 확인되지 않음.

## 6. 제품 등록과의 연결

공급자 승인 상태와 제품 등록은 연결되어 있다.

- `createRequireActiveSupplier`는 `neture_suppliers.status === 'ACTIVE'`가 아니면 쓰기 API를 차단한다.
- `POST /neture/supplier/products`, `PATCH /neture/supplier/products/batch`, `POST /neture/supplier/products/submit-approval` 등 주요 제품 쓰기 API가 active supplier를 요구한다.
- 읽기 API 일부는 `requireLinkedSupplier`라서 PENDING/REJECTED도 자기 프로필/일부 조회는 가능하다.

제품 유형 선택은 `services/web-neture/src/lib/supplierProductTypes.ts`와 `/supplier/products/register`에 구현되어 있다.

현재 유형:

- 비의약품: `non_drug`, `regulatoryType=GENERAL`
- 의약외품: `quasi_drug`, `regulatoryType=QUASI_DRUG`
- 비처방 의약품: `otc_drug`, `regulatoryType=DRUG`, `drugCategory=otc`
- 처방의약품: `rx_drug`, `regulatoryType=DRUG`, `drugCategory=rx`
- 미분류/운영자 검토: `unclassified`

현재 연결 한계:

- 제품 유형 선택은 제품 등록 시점의 분류 힌트다.
- 공급자 온보딩 단계의 “공급 예정 품목군” 저장 구조와 연결되지 않는다.
- 공급자별 품목군 승인 상태가 없어서 “이 supplier는 의료기기만 등록 가능” 같은 제어는 붙어 있지 않다.
- 후속 액션 gate는 제품의 `regulatoryType`/`drugCategory` 기준이며 supplier category approval 기준이 아니다.

## 7. Gap 분석

| 목표 항목 | 현재 상태 | 필요 작업 |
| --- | --- | --- |
| 사업자등록증 PDF | 미구현 | supplier document entity/API/UI 또는 KycDocument 연결 필요 |
| 통장 사본 PDF | 미구현 | 정산 계좌 entity/API/UI와 문서 업로드 연결 필요 |
| 세금계산서용 이메일 | 부분 구현 | 필수 여부/검증/수정 권한 정책 정리 필요 |
| 통신판매업 신고 정보 | 미구현 | 신고번호/신고증 PDF 필드와 필요 조건 정책 필요 |
| 품목군 선택 | 미구현 | supplier planned categories 저장 구조 필요 |
| 품목군별 증빙 PDF | 미구현 | supplier-category-document 모델 필요 |
| 운영자 검토 | 부분 구현 | 가입 승인/공급자 활성화는 있음. 서류/정산/품목군 검토는 없음 |
| 제품 등록 제어 | 부분 구현 | supplier ACTIVE gate는 있음. 품목군별 등록 가능 상태 gate는 없음 |

## 8. 위험 요소

- DB migration 필요: supplier document, settlement account, mail-order info, supplier category approval을 추가하려면 migration이 필요하다.
- 기존 supplier 구조와 충돌 가능성: `neture_suppliers` 일부 사업자 필드는 이미 `organizations`/`users.businessInfo`와 분산되어 있다. SSOT를 먼저 정해야 한다.
- Neture-only vs O4O 공통: `BusinessRegistrationFields`, `KycDocument`, media library는 공통 자산이지만 현재 Neture supplier onboarding에 직접 연결되어 있지 않다.
- 제품 등록 영향: 현재 제품 등록은 supplier ACTIVE만 본다. 품목군별 gate를 추가하면 product create/bulk/import/submit flow 전체에 영향이 생긴다.
- 파일 권한/문서 접근 제어: media library는 공용 자산 성격이 강하다. 사업자등록증/통장 사본은 운영자 전용 비공개 문서 저장 정책이 필요하다.
- 정산 정보 보안: 계좌번호/예금주/통장 사본은 개인정보·금융정보로 접근 로그, 마스킹, 권한 분리가 필요하다.
- 세금계산서 이메일 운영: 현재 필드는 있으나 필수 여부, 변경 이력, 운영자 검토 여부는 약하다.
- 이중 승인 흐름 혼동: `service_memberships` 가입 승인과 `neture_suppliers` 공급자 활성화가 분리되어 있어 화면 문구/상태 안내가 중요하다.

## 9. 다음 WO 제안

- `WO-O4O-SUPPLIER-ONBOARDING-BASIC-DOCUMENTS-V1`
  - 사업자등록증 PDF 업로드/조회/운영자 확인 구조.
- `WO-O4O-SUPPLIER-SETTLEMENT-ACCOUNT-FIELDS-V1`
  - 은행명, 계좌번호, 예금주, 통장 사본 PDF, 정산 담당자 정보.
- `WO-O4O-SUPPLIER-TAX-INVOICE-EMAIL-V1`
  - 세금계산서 이메일 필수화/검증/변경 정책 정리.
- `WO-O4O-SUPPLIER-MAIL-ORDER-REPORTING-FIELDS-V1`
  - 통신판매업 신고번호/신고증 PDF.
- `WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1`
  - 공급 예정 품목군과 품목군별 증빙 PDF.
- `WO-O4O-SUPPLIER-PRODUCT-REGISTER-BY-CATEGORY-STATUS-V1`
  - supplier category approval status를 제품 등록/대량 등록/submit approval gate에 연결.

## 10. 조사한 주요 파일

- `services/web-neture/src/App.tsx`
- `services/web-neture/src/pages/SupplierLandingPage.tsx`
- `services/web-neture/src/components/RegisterModal.tsx`
- `services/web-neture/src/pages/supplier/SupplierProfilePage.tsx`
- `services/web-neture/src/pages/supplier/SupplierProductRegisterEntryPage.tsx`
- `services/web-neture/src/lib/supplierProductTypes.ts`
- `services/web-neture/src/pages/operator/registrations/RegistrationRequestsPage.tsx`
- `services/web-neture/src/pages/operator/OperatorSupplierApprovalPage.tsx`
- `services/web-neture/src/lib/api/admin.ts`
- `services/web-neture/src/lib/api/supplier.ts`
- `services/web-neture/src/lib/api/media.ts`
- `packages/account-ui/src/components/BusinessRegistrationFields.tsx`
- `apps/api-server/src/modules/auth/controllers/auth-register.controller.ts`
- `apps/api-server/src/modules/neture/controllers/supplier-management.controller.ts`
- `apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts`
- `apps/api-server/src/modules/neture/controllers/operator-registration.controller.ts`
- `apps/api-server/src/modules/neture/controllers/operator-supplier.controller.ts`
- `apps/api-server/src/modules/neture/controllers/admin.controller.ts`
- `apps/api-server/src/modules/neture/services/operator-registration.service.ts`
- `apps/api-server/src/modules/neture/services/supplier.service.ts`
- `apps/api-server/src/modules/neture/middleware/neture-identity.middleware.ts`
- `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts`
- `apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts`
- `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts`
- `apps/api-server/src/modules/neture/entities/neture-settlement.entity.ts`
- `apps/api-server/src/entities/KycDocument.ts`
- `apps/api-server/src/controllers/media/mediaUploadController.ts`

## 11. 수정하지 않은 영역

- 코드: 수정하지 않음
- DB/migration: 수정하지 않음
- package/lockfile: 수정하지 않음
- git add/commit/push: 수행하지 않음

