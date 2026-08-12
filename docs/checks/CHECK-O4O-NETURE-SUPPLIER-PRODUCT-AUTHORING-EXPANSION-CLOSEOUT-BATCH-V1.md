# CHECK — WO-O4O-NETURE-SUPPLIER-PRODUCT-AUTHORING-EXPANSION-CLOSEOUT-BATCH-V1

Neture 공급자 상품 등록·수정 확장 closeout

- 작성일: 2026-08-12
- 대상 서비스: `services/web-neture`, `apps/api-server` (neture 공급자 상품/이미지)
- 판정: **PASS (수정 7건 적용 — A~G)**

---

## 1. 기준 commit

| 항목 | 값 |
|---|---|
| 작업 시작 HEAD | `155272e61` (직전 WO closeout) |
| 수정 commit | `e0cc3ac68` |
| 배포 headSha | `e0cc3ac68` |

작업 전 `git fetch` / `git status --short` 확인. 다른 세션의 미추적 문서 2건
(`docs/checks/CHECK-O4O-FRONTEND-MENU-AND-ROUTE-CONTRACT-COMMONIZATION-FULL-CLOSE-V1.md`,
`docs/ir/IR-O4O-PHARMACIST-BRANCH-SERVICE-RECOVERY-AND-REUSE-AUDIT-V1.md`) 이 있었으나
본 WO 범위 경로와 겹치지 않아 접촉하지 않고 진행했다 (path-specific stage).

---

## 2. 상품 등록·수정 route 조사표

| route | 화면 | 백엔드 | 판정 |
|---|---|---|---|
| `/supplier/products` | SupplierProductsPage (목록·인라인 편집·상세 Drawer) | `GET/PATCH /neture/supplier/products*` | OK (결함 2건 수정) |
| `/supplier/products/register` | 유형 선택(의약품/비의약품 → otc/rx) | — (라우팅만) | OK |
| `/supplier/products/new` | SupplierProductCreatePage | `POST /neture/supplier/products` | OK (결함 2건 수정) |
| `/supplier/products/bulk` | 대량 등록 | `POST /neture/supplier/products/bulk-candidates` | OK |
| `/supplier/products/import-assistant` | Firstmall 가져오기 | import 계열 | OK |
| `/supplier/store-descriptions` | 매장용 설명서 저작 | store-description 계열 | OK |
| `/supplier/store-materials-status` | 매장 제공 자료 현황 | store-materials 계열 | OK |

---

## 3. 화장품·일반상품 등록 판정

- 화장품(`regulatoryType=COSMETIC`)은 **정책상 막혀 있지 않다.** 비의약품 진입 → 규제 구분에서
  `화장품` 선택 → 등록 가능. 별도 규제 게이트(`assertDrugOfferAllowed`)는 DRUG 계열에만 걸린다.
- 일반상품(`GENERAL`)도 기존 경로 그대로 동작한다.
- **결함 B (수정)**: 상단 규제 구분 select 의 옵션 집합에 `DRUG` 가 없었다. 의약품 진입은
  `?regulatoryType=DRUG` 로 prefill 되므로 화면에는 첫 옵션(건강기능식품)이 보이고 저장에는 DRUG 가
  들어가는 표시-저장 불일치가 있었다. → 진입 유형이 DRUG 일 때만 `의약품` 옵션을 렌더한다
  (비의약품 진입에서는 선택 불가 — 등록 정책 불변). 규제 정보 블록의 `MEDICAL_DEVICE` 누락도 보완.

---

## 4. 이미지·상세 HTML 확인

- 이미지: 파일 업로드 / 미디어 라이브러리 URL 등록 두 경로 모두 동작.
- 상세 HTML: RichTextEditor 로 입력 → `consumerDetailDescription` / `businessDetailDescription` 저장 → 재조회 시 표시.
- **결함 C (수정)**: 등록 화면 `handleSubmit` 이 `uploadProductImage` / `registerImageFromUrl` 결과를
  확인하지 않았다. 이 API 들은 실패해도 예외를 던지지 않고 `{success:false}` 를 반환하므로,
  이미지가 하나도 올라가지 않아도 "제품 등록 완료" 패널이 떴다. → 실패 건수를 집계해 toast 로 알린다.
- **결함 E (수정)**: `ImageUploadModal` 이 `try/await/catch` 구조라 catch 가 절대 실행되지 않았다
  (API 가 예외를 삼킴). → `res.success` 확인 + 실패 사유 표시로 교체.
- **결함 F (수정)**: `ProductDetailDrawer` 의 이미지 업로드·URL 등록·삭제가 `if (res.success)` 만 있고
  else 분기가 없어 실패가 무음이었다. → 실패 시 toast. B2B 설명 저장 실패의 `console.warn` 도 toast 로 승격.
  디버그 `console.log` 2건 제거.

---

## 5. ProductMaster 연결 확인

- 공급자 등록은 `createSupplierOffer` 가 barcode/이름 기준으로 master 를 조회·생성하고 offer 를 연결한다.
  `masterId` 직접 주입은 `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` 로 차단된다 (기존 계약, 변경 없음).
- offer 수정은 공급 조건 수정이며 master 필드(category/brand/specification/originCountry)는
  `resolveMasterWriteFields(false, …)` 로 의도적으로 무시된다 (기존 계약, 변경 없음).
- **결함 A (P0, 수정)**: 공급자 이미지 write 4경로가 `requireActiveSupplier` 만 통과하면
  `masterId` / `imageId` 를 클라이언트가 지정할 수 있었다. 즉 **ACTIVE 공급자면 남의 상품 이미지를
  추가·대표 교체·삭제할 수 있었다.** → master 소유 확인(`supplier_product_offers` 에 삭제되지 않은
  자기 offer 보유) 추가, imageId 경로는 이미지의 실제 master 와 `body.masterId` 일치까지 확인
  (경로 스푸핑 방지). 실패 시 403 `MASTER_NOT_OWNED`.
  - admin 업로드 엔드포인트(`/admin/products/:masterId/images`)에는 적용하지 않는다 — 소유 개념이 없고
    `requireNetureScope('neture:admin')` 로 이미 보호된다.

---

## 6. 매장용 설명서 이동 확인

- 등록 완료 패널에 `매장용 상품 설명서 작성` CTA 가 있고 `/supplier/store-descriptions?masterId=` 로 이동한다.
- 목록/상세에서도 동일 진입선 유지. 신규 CTA 추가 없음.
- QR·태블릿 직접 적용 UI 는 공급자 화면에 없음 (확인 완료, 변경 없음).

---

## 7. 삭제 정책 회귀 결과

- 직전 WO 계약(soft delete + `deletedBy` + `delete_reason='SUPPLIER_DELETE'` + 활성 listing/service_products 가드) 유지.
- 회귀 테스트 `supplier-bulk-delete-soft-delete-contract.test.ts` **6/6 PASS**.
- 삭제 불가 사유는 `bulkDeleteFailureSummary()` 로 화면에 한국어 요약 표시 (기존 구현, 변경 없음).
- **실브라우저 회귀 (PASS)**: 위 테스트 offer 를 공급자 화면에서 선택 → `일괄 삭제` →
  확인 모달이 "삭제하면 목록에서 사라지고 판매가 중지됩니다. 기록은 남으므로 복구가 필요하면 운영자에게 요청하세요." /
  "매장에 진열 중이거나 서비스에 연결된 상품은 삭제되지 않습니다." 를 정확히 안내.
  삭제 실행 → `DELETE /api/v1/neture/supplier/products/bulk => 200`, "1건 삭제 완료" toast,
  목록 0건 · 승인 카운트 전체 0 으로 갱신. hard delete UI 없음 (rollback 은 §9-4 대로 소진 완료).
- **결함 D (수정)**: 인라인 저장은 `batchUpdateProducts` 의 `failed[]` 를 버려 저장 실패가 성공처럼 보였다.
  → `saveFailureSummary()` 추가, 실패 시 toast.

---

## 8. HOLD 항목

| 항목 | 사유 |
|---|---|
| ProductMaster 생성 정책 변경 | §7 HOLD — 이번 범위에서 필요 없었고 건드리지 않음 |
| DB schema / migration | §3 금지 — 신규 컬럼·인덱스 없음 |
| 권한·role 변경 | §3 금지 — 소유권 가드는 기존 데이터(offer 보유) 기반 판정이며 role/scope 변경 아님 |
| 화장품 전량 apply | §3 금지 — 미실행 |
| DB 직접 보정 | §3 금지 — write 0건 |

HOLD 로 중단한 항목 없음. 모든 확정 결함을 허용 범위(§6) 안에서 처리했다.

---

## 9. smoke 결과

프로덕션 `neture.co.kr` 실브라우저(Playwright), 공급자 계정 `renagang21`.

### 9-1. 실브라우저 smoke

| route | blank | console error | API 404 | 판정 |
|---|---|---|---|---|
| `/supplier/products` | 없음 | 이미지 업로드 400 1건(결함 G, 아래) + 스팟 정책 403 1건(권한 없음 문구로 정상 표시) | 0 | PASS |
| `/supplier/products/new` | 없음 | 0 | 0 | PASS |
| `/supplier/products/bulk` | 없음 (h1 `대량 등록`) | 0 | 0 | PASS |
| `/supplier/products/import-assistant` | 없음 (h1 `내 쇼핑몰 관리자 상품 가져오기`) | 0 | 0 | PASS |
| `/supplier/store-descriptions` | 없음 (h1 `매장용 상품 설명서`) | 0 | 0 | PASS |
| `/supplier/store-materials-status` | 없음 (h1 `검수·게시 현황`) | 0 | 0 | PASS |

### 9-2. 등록·수정 흐름 실행 결과

| 확인 | 결과 |
|---|---|
| 의약품 진입 규제 구분 표시 | `?productType=otc_drug&regulatoryType=DRUG` → `의약품` 선택 상태로 표시 — 결함 B 수정 확인 |
| 비의약품 진입 DRUG 누출 없음 | 옵션 `[HEALTH_FUNCTIONAL, MEDICAL_DEVICE, QUASI_DRUG, COSMETIC, GENERAL]`, 기본 `GENERAL` |
| 화장품 등록 | `POST /neture/supplier/products => 201`. 목록에 즉시 반영 |
| 이미지 실패 알림 | 등록 시 이미지 400 발생 → 새 toast `상품은 등록됐지만 이미지 1건이 등록되지 않았습니다…` 출력 — 결함 C 수정 확인 (이전에는 무음 성공) |
| 이미지 업로드 모달 실패 알림 | `이미지 업로드에 실패했습니다. (NETWORK_ERROR)` alert — 결함 E 수정 확인 |
| 소유 master 이미지 업로드 성공 | 동일 master 에 raw multipart POST → **201** (403 아님). 새 소유권 가드가 소유자를 막지 않음을 확인 |
| 상세 HTML 입력·저장 | HTML 탭에 `<h2>/<ul>/<strong>` 입력 → 편집 탭 반영 → 저장 → 재조회 시 동일 구조 표시. 완성도 50% → 70% |
| ProductMaster 연결 | 상세 Drawer 에 브랜드·카테고리·규제 유형·MFDS 번호가 master 기준으로 표시 |
| 매장용 설명서 이동 | `이 상품의 매장용 설명서 작성` → `/supplier/store-descriptions` 로 이동, 해당 상품 편집기 자동 오픈(언어탭 KO/EN/ZH/JA) |
| QR·태블릿 직접 적용 UI | 없음. 화면 문구 `QR 생성·태블릿 코너 적용은 매장이 수행합니다` 로 명시 |

### 9-3. smoke 중 추가 발견·수정 (결함 G)

- 증상: 이미지 업로드가 UI 경로에서만 **400**. 같은 master 에 raw multipart POST 는 201.
- 원인: `AuthClient` 의 axios 인스턴스 기본 헤더가 `Content-Type: application/json` 이라
  axios `transformRequest` 가 FormData 를 `formDataToJSON` 으로 직렬화해 버렸다.
  서버 multer 가 파일을 받지 못해 `NO_FILE` 400.
- 조치: 공통 패키지(`@o4o/auth-client`)는 §3 금지 범위이므로 **호출부**에서 교정.
  `productApi.uploadProductImage` 에 `headers: { 'Content-Type': undefined }` 를 지정해
  브라우저가 boundary 포함 multipart 헤더를 만들게 했다.
- 영향 없음 확인: `supplier.ts`(서류/규제 증빙 업로드 2곳)·`media.ts` 는 명시적으로
  `multipart/form-data` 를 지정하고 있어 axios `resolveConfig` 가 헤더를 제거 → 정상. 수정하지 않았다.
- **배포 후 UI 경로 재검증 (PASS)**: `7e821765c` 배포 완료 후 `ProductDetailDrawer → B2C 편집 → 상세 이미지 추가`
  로 실제 파일을 업로드해 `POST /api/v1/neture/products/26400967…/images => 201`,
  실패 alert 없음, 이어서 이미지 목록 재조회 200. 잔여 console error 는 아래 spot-policy 403 1건뿐이다.

### 9-4. 운영 write 대상 · rollback

| 항목 | 값 |
|---|---|
| 생성한 master | `26400967-1567-46b5-9746-bd529632bce9` |
| 생성한 offer | `[TEST] 공급자 화장품 등록 smoke V1` (화장품 / 공급가 12,000 / 소비자가 19,000) |
| 노출 상태 | **비활성 · 유통 비공개 · 승인 미요청** — 매장·운영자 화면 노출 0 |
| 업로드 이미지 | 썸네일 1건 (GCS `products/26400967…/thumbnail/c2ebd995….webp`) |
| rollback | 공급자 화면에서 해당 offer 삭제(soft delete) → 필요 시 운영자 `/admin/product-cleanup` 에서 완전 삭제 |

DB 직접 write·보정은 0건이다. **rollback 은 §7 삭제 회귀에서 그대로 실행되어 소진되었다** — 테스트 offer 는 soft delete 상태이며 공급자·운영자·매장 화면 어디에도 남아 있지 않다.

---

## 10. build · deploy 결과

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | PASS (exit 0) |
| api-server jest (이미지 소유권 계약) | **5/5 PASS** |
| api-server jest (삭제 계약 회귀) | **6/6 PASS** |
| web-neture `npm run build` | PASS (`✓ built in 13.09s`) — web-neture 에는 `typecheck` script 가 없고 `build`(`tsc && vite build`) 가 실제 타입 검사다 |
| Deploy API Server (Cloud Run) — `e0cc3ac68` | **success** |
| Deploy Web Services (Cloud Run) — `e0cc3ac68` | **success** |
| CodeQL — `e0cc3ac68` | success |
| web-neture `pnpm build` (결함 G 수정 후) | PASS (`✓ built in 13.78s`) |
| Deploy Web Services (Cloud Run) — `7e821765c` | **success** (신규 번들 `index-CVgGz3Rn.js` 로딩 확인) |

---

## 11. commit SHA

- `e0cc3ac68` — fix(neture): 공급자 상품 이미지 소유권 가드 + 등록·저장 실패 무음 제거
- `7e821765c` — fix(neture): 공급자 상품 이미지 업로드 FormData 가 JSON 으로 변환되던 결함 수정 (결함 G)

## 12. push 결과

- `638ca7293..e0cc3ac68  main -> main` — push 완료.
- `e0cc3ac68..7e821765c  main -> main` — push 완료.
