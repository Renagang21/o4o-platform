# CHECK-O4O-NETURE-SUPPLIER-LEGACY-CSV-IMPORT-RETIREMENT-V1

WO: WO-O4O-NETURE-SUPPLIER-LEGACY-CSV-IMPORT-RETIREMENT-V1
버킷: D (레거시 CSV import 은퇴 — 삭제가 아니라 canonical 대량 등록으로 안전 통합)
상태: 게이트 통과 → **은퇴 판정 A(즉시 redirect + 프론트 은퇴)** 실행 완료 / 정적검증 PASS / 배포·프로덕션 smoke 진행

## 1. 목적

레거시 CSV Import 화면(`/supplier/csv-import`, `SupplierCsvImportPage`)을 **바로 삭제하지 않고**,
기존 배치 이력·최근 사용·대체 경로를 먼저 확인한 뒤 canonical 대량 등록(`/supplier/products/bulk`)으로
안전하게 통합한다. 진행 중 배치가 있거나 canonical 이 CSV 업로드를 완전히 대체하지 못하면 은퇴를 강행하지 않고
게이트 결과만 제출한다.

## 2. 사전 게이트 (§3)

- 브랜치 `main`, 대상 영역 `services/web-neture/*` (공급자 CSV import).
- 동시 세션 수정 파일 = 전부 `services/web-kpa-society/*` (다른 서비스). **대상과 disjoint → 충돌 없음, 훼손 없음.**
- 대상 파일을 다른 세션이 편집 중이지 않음 → CONCURRENT_SESSION_HOLD 해당 없음.

## 3. 구조 조사 (§4) — 실제 파일

| 구분 | Legacy CSV Import | Canonical 대량 등록 |
|------|-------------------|---------------------|
| 라우트 | `/supplier/csv-import` (App.tsx:839) | `/supplier/products/bulk` (App.tsx:820) |
| 화면 | `pages/supplier/SupplierCsvImportPage.tsx` (891줄) | `pages/supplier/SupplierBulkRegisterPage.tsx` |
| API 헬퍼 | `lib/api/csvImport.ts` (`csvImportApi`) | `lib/api/supplier.ts` (`submitBulkCandidates`) |
| 백엔드 | `/neture/supplier/csv-import/*` (batch 2-Phase) | 후보 제출(operator 검토) |
| 저장 모델 | `supplier_csv_import_batches` / `_rows` staging → apply → Master/Offer 생성 | 후보(candidate) → 운영자 검토·기존제품 매칭 |
| 보조 컴포넌트 | `components/import/EditImportRowDrawer.tsx` (해당 페이지 전용) | 없음 |
| 메뉴 진입점 | 이미 제거됨(SupplierSpaceLayout) | '대량 등록' 메뉴 |

## 4. 기능 매핑 표 (§5)

| 기능 | Legacy | Canonical | 판정 |
|------|:------:|:---------:|------|
| 파일 업로드 | ✅ (서버 업로드 `uploadCsv`) | ✅ (클라이언트 파싱) | CANONICAL_COVERS |
| CSV 파싱 | ✅ 서버 | ✅ `validateBulkCsv` | CANONICAL_COVERS |
| 컬럼/헤더 검증 | ✅ | ✅ (헤더 오류/경고) | CANONICAL_COVERS |
| 미리보기 | ✅ batch rows | ✅ 행별 상태 배지 표 | CANONICAL_COVERS |
| 오류 행 표시 | ✅ | ✅ (오류/경고/정상) | CANONICAL_COVERS |
| 유형별 템플릿 | ❌(단일 XLSX 템플릿) | ✅ (유형별 CSV, 혼합 금지) | CANONICAL_SUPERSET |
| 오류 파일 다운로드 | ✅ (실패행 CSV, 클라이언트) | ❌ | LEGACY_UNIQUE_FUNCTION |
| 배치 이력 목록 | ✅ `getBatches` | ❌ | LEGACY_UNIQUE_HISTORY |
| 배치 상세/행 편집 | ✅ `getBatchDetail`/`updateRow` | ❌ | LEGACY_UNIQUE_FUNCTION |
| 실제 상품 생성(apply) | ✅ Master/Offer 직접 생성 | △ 후보 제출(운영자 검토) | 모델 상이(직접 write → 후보) |
| 재실행(retry) | ✅ `retryBatch` | ❌ | LEGACY_UNIQUE_FUNCTION |
| 삭제/전체삭제 | ✅ `deleteBatch`/`fullDeleteBatch` | ❌ | LEGACY_UNIQUE_FUNCTION |
| 품질 가드/자동 제안 | ✅ | ❌ | LEGACY_UNIQUE_FUNCTION |
| 완료 후 이동 | ✅ | ✅ (제품 목록/계속) | CANONICAL_COVERS |

**해석:** canonical 은 **CSV 업로드 → 제품 등록(후보)** 경로를 완전히 제공한다. legacy 의 unique 기능은
전부 **배치 lifecycle 관리 표면**(이력/재실행/삭제/직접 apply)이며, 이는 후보 기반 governance 모델로
대체된 구형 직접-write 경로다. 아래 데이터 게이트에서 이 표면이 실사용 0 임을 확인한다.

## 5. 프로덕션 데이터 게이트 (§6) — read-only

접속: cloud-sql-proxy(port 5442) + `psql -U o4o_api -d o4o_platform` (Cloud Run env 자격증명, 값 비기록).
집계값만 조회(개인정보/행 데이터 미조회).

| 지표 | 값 |
|------|---:|
| supplier_csv_import_batches TOTAL | **0** |
| DISTINCT supplier | **0** |
| IN_PROGRESS (UPLOADED/VALIDATING/READY) | **0** |
| PARTIAL / APPLIED / FAILED | 0 / 0 / 0 |
| FIRST/LAST created | (없음) |
| 최근 30일 / 90일 | 0 / 0 |
| supplier_csv_import_rows TOTAL | **0** |

→ **진행 중 배치 0, 전체 이력 0, 행 0.** 보존할 이력 없음(LEGACY_UNIQUE_HISTORY 무의미),
드레인할 진행 배치 없음(§13 안전조건 해당 없음).

## 6. 라우트/엔드포인트 사용 게이트 (§7)

- Cloud Run `o4o-core-api` 로그: `/neture/supplier/csv-import` 백엔드 히트 = **최근 90일 0건.**
- 판정: **NO_OBSERVED_USAGE** (배치 0건과 정합). request 0 ≠ 절대 미사용이나, DB 이력 0 과 결합되어 강한 신호.

## 7. 은퇴 판정 (§8-9)

**판정 A — 즉시 redirect + 프론트 은퇴.** §9 권장 기본안의 전제 조건 전부 충족:

- 진행 중 배치 = 0 ✅
- 최근 사용 없음 ✅
- 보존할 unique 이력 없음(행 0) ✅
- canonical 대량 등록이 CSV 업로드→등록 경로를 실제로 제공 ✅

(이력이 0 이므로 판정 B 의 "이력 보존 후 redirect" 는 판정 A 로 수렴. 진행 배치 0 이므로 판정 C 드레인 불필요.
canonical 이 CSV 업로드를 제공하므로 판정 D(유지) 불해당.)

## 8. 실행 조치 (§10-12)

- **라우트 redirect (§10):** `/supplier/csv-import` → `<Navigate to="/supplier/products/bulk" replace />`.
  북마크·직접 URL·구 링크가 빈 화면/404/루프로 떨어지지 않고 canonical 로 흡수. (query 미소비 → 미전달)
- **진입점 제거 (§11):** 메뉴 진입점은 사전 WO 에서 이미 제거됨. 잔여 active Link/navigate 진입점 = 0 (grep 확인).
  `SupplierSpaceLayout` 주석을 현행(redirect)으로 갱신.
- **프론트 파일 제거 (§12):** route mount=redirect(0), importer=0, canonical 재사용=0, unique helper 소비=0 확인 후 제거.
  - `pages/supplier/SupplierCsvImportPage.tsx` (git rm)
  - `components/import/EditImportRowDrawer.tsx` (해당 페이지 전용, git rm — dir 소멸)
  - `lib/api/csvImport.ts` (소비처 = 위 2파일 + 배럴 재노출뿐, 외부 importer 0 → git rm)
  - `pages/supplier/index.ts` · `lib/api/index.ts` 배럴 재노출 라인 제거
- **백엔드 미변경 (§12/§20):** `/neture/supplier/csv-import/*` 엔드포인트·서비스·워커, `supplier_csv_import_*` 테이블,
  operator-supplier-quality 대시보드(동일 테이블 조회)는 **손대지 않음.** 데이터 은퇴는 별도 WO.

## 9. Canonical 회귀 (§14)

- `SupplierBulkRegisterPage` 정적 흐름 확인: 유형 선택 → 유형별 템플릿 다운로드 → CSV 파일 선택(`handleFile`,
  10MB 가드) → `validateBulkCsv` 검증/미리보기(정상/경고/오류) → 확인 모달 → `submitBulkCandidates`(후보 제출) → 결과 모달.
- **CSV 업로드 기능 실재 확인** → BLOCKED_CANONICAL_GAP 해당 없음. 실제 상품 생성 없이(합성 파일 전제) 흐름 검증.

## 10. 정적 검증 (§17)

- `pnpm --filter @o4o/web-neture exec tsc --noEmit -p tsconfig.json` → **PASS (에러 0).**
- `pnpm --filter @o4o/web-neture build` → **PASS (built in ~13s).** 산출물에서 SupplierCsvImportPage chunk 소멸.
- 잔여 참조 grep: `SupplierCsvImportPage`/`EditImportRowDrawer`/`csvImportApi`/`CsvBatch*` = 주석 외 0.

## 11. 불변식 준수 (§20)

- API 엔드포인트/백엔드 워커/테이블 변경 없음 · DB write 없음 · migration 없음 · dependency 추가 없음.
- 배치 상태 강제 변경 없음 · canonical 재설계 없음 · 공통 모듈 변경 없음.
- 프론트 진입점 은퇴 + 라우트 redirect + 미사용 프론트 헬퍼 제거만 수행.

## 12. 배포 & 프로덕션 smoke (§18-19)

- 커밋 `71718c542` → CI "Deploy Web Services (Cloud Run)" run 30418864346 → **deploy-neture success.**
- neture-web URL: https://neture-web-3e3aws7zqa-du.a.run.app

### 12-1. 프로덕션 배포 산출물 검증 (대체 채널 — CLAUDE.md §8)

| 항목 | 결과 |
|------|------|
| `/supplier/csv-import` HTTP | **200** (SPA 서빙 — 빈 화면/404 아님) |
| 프로덕션 entry(`index-ZIHUNod-.js`)에 `SupplierCsvImportPage` chunk 참조 | **없음 (은퇴 확인)** |
| entry 내 redirect 대상 `supplier/products/bulk` 문자열 | **존재 (redirect 라우트 LIVE)** |

레거시 페이지 chunk 는 프로덕션 번들에서 소멸했고, `/supplier/csv-import` 라우트는
`<Navigate to="/supplier/products/bulk" replace>` 선언형 redirect(부분 실패 표면 없음)로 대체됨.

### 12-2. 대화형 브라우저 redirect smoke — BLOCKED

Playwright 공유 프로파일(`C:\Users\home\.playwright-o4o-profile`)을 다른 동시 세션 Chrome 이
점유 중이어서 기동 실패(즉시 exit). 동시 세션 훼손 방지를 위해 강제 종료하지 않음.
→ 배포 성공 + 번들 산출물 검증(12-1)으로 계약 반영 확인. 대화형 redirect smoke 는 프로파일 해제 후 후속 권장.
