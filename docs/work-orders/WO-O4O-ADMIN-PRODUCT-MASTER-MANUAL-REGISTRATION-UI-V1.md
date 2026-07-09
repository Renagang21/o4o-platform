# WO-O4O-ADMIN-PRODUCT-MASTER-MANUAL-REGISTRATION-UI-V1

> **한 줄 요약**: 관리자 대시보드 "O4O 상품 DB"에 **신규 공식 상품(ProductMaster) 수동 등록 화면**을 추가한다. 현재 이 영역은 read-only 스켈레톤이라 등록 UI가 없어, 이미지→설명서 워크플로우 등에서 확인한 상품을 사람이 직접 등록할 수 없다. 방금 완료된 [barcodeless 등록 수정](WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1.md)으로 백엔드는 바코드 없이 등록이 가능해졌으므로, 그 위에 등록 폼을 올린다.

- **상태**: ✅ **구현 완료** (2026-07-09) · api-server + admin-dashboard 타입체크 EXIT 0
- **작성일**: 2026-07-09
- **성격**: admin-dashboard 프런트 신규 화면 + 얇은 backend create 엔드포인트 1개. 스키마 변경 없음.
- **선행**: [WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1](WO-O4O-PRODUCT-MASTER-BARCODELESS-REGISTRATION-INTERNAL-CODE-V1.md) (완료 — `resolveOrCreateMaster` barcode-optional화)
- **거버넌스**: Design Core v1.0 필수(`docs/rules/DESIGN-CORE-GOVERNANCE.md`) · O4O Form Standard 참조(`docs/baseline/O4O-FORM-STANDARD-BASELINE-V1.md`)

---

## 0. 배경

"O4O 상품 DB" 관리자 메뉴 하위 화면은 전부 read-only 스켈레톤(`WO-O4O-ADMIN-PUBLIC-PRODUCT-DB-READONLY-SKELETON-V1`)으로 만들어졌다 — 초기엔 등록 UI가 불필요하다고 판단했기 때문. 그러나 제품 사진→매장 설명서 워크플로우가 실제로 돌면서 **사람이 확인한 상품을 공식 ProductMaster로 등록하는 화면**이 필요해졌다(2026-07-09 사용자 판단).

현재 등록 가능한 백엔드 경로는 `POST /api/v1/neture/admin/masters/resolve`(barcode-optional화 완료) 뿐이고, admin UI에는 이를 호출하는 폼이 없다. 본 WO가 그 폼을 추가한다.

---

## 1. 조사 (근거 — 코드 기준)

### 1-A. 프런트 라우트/페이지 구조 (등록 라우트만 없음)

[apps/admin-dashboard/src/routes/o4o-product-db.routes.tsx](../../apps/admin-dashboard/src/routes/o4o-product-db.routes.tsx):
- 외곽 `AdminProtectedRoute requiredRoles={['admin','super_admin']}` 게이트 + `ProductDbLayout` 아래 자식 라우트들.
- `masters`(목록·read-only) / `masters/:id`(상세) 존재. **`masters/new`(등록) 부재.**

메뉴: [admin-menu.static.tsx:146-151](../../apps/admin-dashboard/src/admin/menu/admin-menu.static.tsx#L146-L151) — "기본 상품" → `/admin/o4o-product-db/masters`.

### 1-B. 프런트 API 클라이언트 (write 함수 패턴 이미 존재)

[apps/admin-dashboard/src/api/o4o-product-db.api.ts](../../apps/admin-dashboard/src/api/o4o-product-db.api.ts):
- `authClient.api.get/post/delete` 사용, 경로는 `/admin/o4o-product-db/...` (base가 `/api/v1` 포함).
- 이미 write 함수 있음: `addProductMasterNote`(POST notes), `uploadProductMasterImage` 등. → **create 함수 추가 위치 확보.** ProductMaster 생성 함수만 없음.

### 1-C. 백엔드 write 컨트롤러 패턴 (동일 네임스페이스에 얹으면 됨)

[apps/api-server/src/bootstrap/register-routes.ts:495-545](../../apps/api-server/src/bootstrap/register-routes.ts#L495-L545): notes/audit-log/usage-links/qr-summary 컨트롤러가 모두 `/api/v1/admin/o4o-product-db/masters`에 마운트.

[apps/api-server/src/modules/neture/controllers/product-master-note.controller.ts:22-46](../../apps/api-server/src/modules/neture/controllers/product-master-note.controller.ts#L22-L46): `createXController(dataSource): Router` + `authenticate` + `requireRole(ADMIN_ROLES)` 패턴. `ADMIN_ROLES` = platform/neture/glycopharm/cosmetics/kpa admin·operator 셋. → **동일 패턴으로 create 컨트롤러 추가.**

### 1-D. 등록 서비스 (준비됨)

- `netureService.resolveOrCreateMaster(barcode|null, manualData)` — barcode-optional(선행 WO). name+manufacturer dedup·내부코드 생성 내장.
- `netureService.updateProductMaster(id, extFields)` — categoryId/brandId/specification/originCountry/tags/name/brandName 갱신([admin.controller PATCH /masters/:id](../../apps/api-server/src/modules/neture/controllers/admin.controller.ts#L651)). immutable 필드는 차단.

---

## 2. 작업 범위

### 2-A. 백엔드 (얇은 create 엔드포인트 1개)

신규 `product-master-create.controller.ts`:
- mount: `POST /api/v1/admin/o4o-product-db/masters`
- 가드: 기존 컨트롤러와 동일 `authenticate` + `requireRole(ADMIN_ROLES)`
- body: `{ name(필수), manufacturerName?, barcode?, regulatoryType?, regulatoryName?, mfdsPermitNumber?, drugCategory?, specification?, originCountry?, tags?, categoryId?, brandId? }`
- 처리:
  1. `resolveOrCreateMaster(barcode?.trim() || null, { name, manufacturerName, regulatoryType, regulatoryName, mfdsPermitNumber, drugCategory })`
  2. 성공 & 확장 필드(specification/originCountry/tags/categoryId/brandId) 있으면 `updateProductMaster(id, ext)`
  3. `{ success:true, data: master }` 반환. name 누락 등은 400(서비스 에러코드 그대로 surface).
- register-routes.ts에 등록.

### 2-B. 프런트 (등록 화면)

1. `ProductMasterCreatePage.tsx` (route `masters/new`) — Design Core 준수 폼:
   - **상품명**(필수), 제조사, **바코드(선택 — 헬퍼: "비우면 O4O 자체 코드 자동 생성")**, 규격, 원산지, 규제 유형(선택, 기본 '일반'), 허가번호(선택), 태그(선택).
   - 저장 → `createProductMaster` → 성공 시 `/admin/o4o-product-db/masters/:id`(상세)로 이동. 카테고리/브랜드/이미지는 상세 화면에서 이어서 편집(기존 기능).
   - 성공/실패 toast + API success/error 표면화(스모크 기준).
2. `createProductMaster(input)` — o4o-product-db.api.ts에 `authClient.api.post('/admin/o4o-product-db/masters', input)`.
3. `o4o-product-db.routes.tsx`에 `masters/new` 라우트 추가(정적 경로라 `:id`와 무충돌).
4. `ProductMastersPage.tsx` 툴바에 **"새 상품 등록"** 버튼 → `navigate('new')`.

### 2-C. 범위 밖 (후속)

- 이미지 업로드는 상세 화면 기존 기능 재사용(등록 폼에 포함 안 함).
- 카테고리/브랜드 셀렉트를 등록 폼에 직접 넣는 것 — MVP는 상세에서 편집. (카테고리 list API 연동은 별도 소polish)
- 이미지→OCR 자동 채움(IR §6 WO-1) — 별개.
- 내부코드↔실바코드 사후 정합 — 선행 WO의 follow-up.

---

## 3. 검증 (Acceptance Criteria)

- [x] admin "O4O 상품 DB > 기본 상품" 툴바에 "새 상품 등록" 버튼 → `masters/new` 폼 진입 구현.
- [x] **바코드 없이** 상품명만으로 등록 → `resolveOrCreateMaster(null)` 내부코드 경로 → 상세로 이동 구현.
- [x] 바코드 입력 시 유효 GTIN이면 그 값으로 등록(서비스 기존 경로).
- [x] 같은 이름+제조사 재등록 → 백엔드 dedup으로 기존 master 반환 → 상세로 이동.
- [x] 상품명 누락 → 프런트 `canSubmit` 가드 + 백엔드 `NAME_REQUIRED` 400 → toast 표면화.
- [x] admin-dashboard `tsc --noEmit` EXIT 0 (배포 vite는 tsc 미실행 → 수동 확인 완료).
- [x] api-server 배포 빌드 타입체크 EXIT 0.
- [x] 기존 상품 DB 페이지(admin-blue/tailwind)와 톤 일치.
- [ ] **런타임 E2E(브라우저)** — 배포 후 실제 등록 스모크(toast/API success 확인)는 배포 후 수행.

> 구현 커밋: backend `47a370fdd`(엔드포인트+WO). 프런트(등록 페이지·클라이언트·라우트·버튼)는 동시 진행된 product-db UI 리팩터 커밋 `7649626e6`에 함께 병합되어 main 반영됨(같은 워킹트리 공유로 흡수 — 결과 정합, 타입체크 통과 확인).

---

## 4. 구현 진입점

| 역할 | 파일 |
|------|------|
| 신규 backend 컨트롤러 | `apps/api-server/src/modules/neture/controllers/product-master-create.controller.ts` (신규) |
| 라우트 등록 | [register-routes.ts:514](../../apps/api-server/src/bootstrap/register-routes.ts#L514) 인근 |
| 등록 서비스 | `neture.service.resolveOrCreateMaster` / `updateProductMaster` |
| 프런트 클라이언트 | [o4o-product-db.api.ts](../../apps/admin-dashboard/src/api/o4o-product-db.api.ts) |
| 신규 페이지 | `apps/admin-dashboard/src/pages/o4o-product-db/ProductMasterCreatePage.tsx` (신규) |
| 라우트 | [o4o-product-db.routes.tsx:53](../../apps/admin-dashboard/src/routes/o4o-product-db.routes.tsx#L53) |
| 진입 버튼 | [ProductMastersPage.tsx:297](../../apps/admin-dashboard/src/pages/o4o-product-db/ProductMastersPage.tsx#L297) 툴바 |

---

*스키마 변경 0 · migration 0. 프로덕션 상품 등록(실 write)은 배포 후 화면에서 사용자가 수행.*
