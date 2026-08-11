# CHECK-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1

- **WO**: `WO-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1`
- **선행**: `WO-O4O-COSMETICS-SUPPLIER-PRODUCT-REGISTER-AND-EDIT-BROWSER-SMOKE-V1` (`4b3f95fa9`)
- **일자**: 2026-08-11
- **판정**: **PASS** — 기존 master 연결 시 ProductMaster UPDATE 0 계약 성립. schema 0 / migration 0 / DB write 0.

## 1. 결함의 실제 원인

`catalogService.resolveOrCreateMaster()` 가 **"기존 master 를 찾았는지 / 새로 만들었는지"를 반환하지 않았다.**
호출부인 `offer.service.ts → resolveProductMetadata()` 는 두 경우를 구분할 수 없어
master 해석 직후 **무조건** `updateProductMaster(masterId, 공급자입력)` 을 호출했다.

두 번째 누수 경로가 하나 더 있었다 — `offer.service.ts → updateSupplierOffer()`.
offer 수정 시점의 master 는 항상 기존 master 인데, 여기서도 같은 기준정보 필드를 공유 master 에 기록하고 있었다.
이 경로를 막지 않으면 WO 가 약속한 불변 보장이 성립하지 않으므로 함께 차단했다.

## 2. 기존 연결 시 실제로 변경 가능했던 필드 (전수)

`updateProductMaster` 가 허용하는 필드 중 공급자 입력으로 도달 가능한 것:

| 필드 | 기존 동작 |
|---|---|
| `name` | 공급자 판매명으로 **덮어씀** |
| `categoryId` | 덮어씀 |
| `brandId` | 덮어씀 |
| `specification` | 덮어씀 |
| `originCountry` | 덮어씀 |
| `tags` | 덮어씀 |

변경 **불가**였던 필드(이미 런타임 guard `MASTER_IMMUTABLE_FIELDS` 가 `IMMUTABLE_FIELD_VIOLATION` 으로 차단):
`barcode` · `regulatoryType` · `regulatoryName` · `manufacturerName` · `mfdsPermitNumber` · `mfdsProductId`.

즉 제조사·규제구분은 이미 안전했고, **상품명 포함 6개 기준정보 필드가 실제 훼손 가능 지점**이었다.

## 3. 수정 후 계약 (§3)

| 경로 | ProductMaster | Offer |
|---|---|---|
| **신규 제품 등록** (이 요청이 master 를 INSERT) | INSERT + 공급자 입력 확장필드 적용 | 생성 |
| **기존 master 연결** (바코드 일치 / 이름+제조사 dedup / 동시등록 경합) | **UPDATE 0** | 생성 |
| **offer 수정** (`updateSupplierOffer`) | **UPDATE 0** (항상 기존 master) | 갱신 |

판정은 `catalog.service.ts` 가 새로 반환하는 `MasterResolveResult.created` 하나로만 한다.
**제품군을 보지 않는다** — DRUG / 건강기능식품 / QUASI_DRUG / MEDICAL_DEVICE / COSMETIC / GENERAL 모두 같은 규칙이며,
화장품 전용 예외 분기는 만들지 않았다. 새 barcode 필수조건도 만들지 않았다(barcode 없는 기존 master 연결 정상).

무시된 공급자 입력은 삼키지 않고 `logger.info` 로 필드명을 남긴다.

## 4. 변경 파일

**백엔드**

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/services/catalog.service.ts` | `MasterResolveResult` 신설 — `created` 반환. `resolveOrCreateMaster` / `createMasterWithoutBarcode` 의 모든 return 경로에 `created` 표기 |
| `apps/api-server/src/modules/neture/services/master-link-policy.ts` (신규) | 순수 정책 헬퍼 `resolveMasterWriteFields(created, input)` → `{ mode, masterFieldUpdates, ignoredFields }` |
| `apps/api-server/src/modules/neture/services/offer.service.ts` | `resolveProductMetadata` 의 무조건 update 를 정책 헬퍼 경유로 교체 (+`masterCreated` 반환). `updateSupplierOffer` 의 master 쓰기 블록 제거 → 로그 전용 |
| `apps/api-server/src/modules/neture/neture.service.ts` | passthrough 반환 타입 정합 |

**프론트 (조용한 무시 방지)**

백엔드가 master 쓰기를 거부하는데 화면이 편집 가능한 입력을 보여주고 저장 성공을 알리면,
값이 되돌아가는 "조용한 무시" 가 된다. 화면을 계약과 일치시켰다.

| 파일 | 변경 |
|---|---|
| `services/web-neture/src/components/product/ProductForm.tsx` | `masterNameReadOnly` prop — 상품명 읽기 전용 + 안내문 |
| `services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx` | 저장 payload 에서 `name`/`categoryId`/`brandId`/`specification`/`originCountry` 제거. 기본 정보 4필드 읽기 전용 표시 + "O4O 기준 상품정보입니다" 안내 |

## 5. 테스트

신규 24건 (`apps/api-server/src/modules/neture/services/__tests__/`).

| 축 | 내용 | 결과 |
|---|---|---|
| 기존 master 불변 | `created=false` → 적용 필드 0. name/category/brand/spec/origin/tags 전부 불변 | PASS |
| | 서비스 경로 실측 — `updateProductMaster` **호출 0회**, `masterCreated===false` | PASS |
| 제조사·규제구분 | 애초에 공급자 쓰기 대상 아님(guard) 재확인 | PASS |
| 신규 등록 회귀 | `created=true` → `updateProductMaster` 1회, 확장필드 정상 적용 | PASS |
| barcode 없음 | 이름+제조사 dedup 로 잡힌 기존 master 도 `created=false` → UPDATE 0 | PASS |
| 제품군 회귀 | DRUG / HEALTH_FUNCTIONAL / QUASI_DRUG / MEDICAL_DEVICE / COSMETIC / GENERAL 파라미터 전수 | PASS |
| 소스 회귀 | `updateSupplierOffer` 본문에 `updateProductMaster` 문자열 부재 검사 | PASS |
| 권한 | 타 supplier offer 수정 → `PRODUCT_NOT_FOUND`, 조회 인자에 `supplierId` 포함 | PASS |
| undefined 방어 | `created` 미상이면 보수적으로 existing 취급 | PASS |

- `npx jest src/modules/neture` — **29 suites / 372 tests 전부 PASS**
- `npx tsc --noEmit` — apps/api-server PASS · services/web-neture PASS

## 6. 운영 DB read-only 감사 (§8 · 보고 전용)

`tmp/supplier-productmaster-nondestructive-link/audit.mjs` (read-only, DB write 0).
의심 판정식: offer 를 가진 master 중 `updated_at > created_at + 2초` 이면서 어떤 offer 의 created_at/updated_at 과 ±5분 이내 근접.

| 항목 | 값 |
|---|---|
| offer 총수 / 유효 | 2 / 2 |
| offer 를 가진 master | 2 |
| **과거 훼손 의심 master** | **0** |
| 제품군별 의심 분포 | 없음 |
| 의심 관련 offer | 0 |
| orphan offer | 0 |
| 화장품 32,674 중 offer 보유 | **0** |

**결론: 명확한 과거 훼손 없음. 별도 복구 WO 불필요.**
공급자 offer 가 아직 2건뿐이라 결함이 실데이터에 도달하기 전에 차단됐다.

## 7. postVerify (§11)

| # | 항목 | 결과 |
|---|---|---|
| 1 | 기존 master 연결 시 UPDATE | 0 (테스트 실측) |
| 2 | 신규 등록 시 INSERT | 정상 |
| 3 | offer 생성/갱신 | 정상 |
| 4 | 신규 master 중복 | 0 그룹 |
| 5 | orphan offer | 0 |
| 6 | 타 supplier 차단 | 유지 (`PRODUCT_NOT_FOUND`) |
| 7 | 제품군 baseline drift | COSMETIC 32,674 · DRUG 177,413 · 건강기능식품 40,948 · QUASI_DRUG 17,148 · MEDICAL_DEVICE 3,826 — **drift 0** |

schema 변경 0 · migration 0 · 새 테이블 0 · DB write 0.

## 8. 관측된 후속 과제 (중지 사유 아님)

- **공급자 판매명 저장 위치**: §3 은 공급자 판매명·공급자 SKU 를 offer 영역에 저장하라고 하지만
  `SupplierProductOffer` 엔티티에 해당 컬럼이 없고 §12 가 migration 을 금지한다.
  이번 WO 범위는 **"master UPDATE 0"** 까지로 확정했고, offer 측 판매명/SKU 컬럼 신설은 **후속 WO** 로 분리한다.
  (현재는 공급자 판매명이 master 를 덮어쓰지 않고 무시되며, 무시 사실이 화면과 로그에 모두 드러난다.)
- 운영자/관리자의 정상 master 수정 경로(`/api/v1/admin/o4o-product-db/masters`, `requireRole(ADMIN_ROLES)`)는 §5 대로 그대로 유지했다.

## 9. smoke 한계 (§9)

실로그인 공급자 계정이 여전히 없어 브라우저 smoke 는 수행하지 못했다(계정 생성·비밀번호 변경 금지).
**대체 검증**: 서비스 경로 단위 테스트(mock catalogService 로 `updateProductMaster` 호출 여부 실측) + 코드 경로 정적 추적 + 운영 DB read-only 감사.
한계: 실제 HTTP 요청→응답 왕복과 프론트 렌더 결과는 미검증이다.

## 10. Git

| 항목 | 값 |
|---|---|
| base HEAD | `d9a30c0fb` |
| commit | (아래 커밋 참조) |
