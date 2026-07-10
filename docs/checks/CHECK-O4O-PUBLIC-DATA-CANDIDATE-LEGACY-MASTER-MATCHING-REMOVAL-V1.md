# CHECK-O4O-PUBLIC-DATA-CANDIDATE-LEGACY-MASTER-MATCHING-REMOVAL-V1

> WO: `WO-O4O-PUBLIC-DATA-CANDIDATE-LEGACY-MASTER-MATCHING-REMOVAL-V1`
> 선행 조사: `CHECK-O4O-PUBLIC-DATA-CANDIDATE-LEGACY-MASTER-MATCHING-CODE-REMOVAL-AUDIT-V1`
> 코드 커밋: `f1bce3172` (path-specific, 12 files, +75/−687)
> 작업일: 2026-07-10

---

## 0. 요약

공공데이터 후보의 **기존 ProductMaster 사전 매칭 서브시스템을 3개 소비처(admin / web-neture 오퍼레이터 / mobile draft) + API + 서비스에서 제거**했다. 중복 방지는 상품 등록(승격) 트랜잭션 내부 dedup(`promoteOne`)만으로 수행한다.

- **type-check + build PASS** (api-server / admin-dashboard / web-neture 전부).
- **web-neture 배포 SUCCESS** ✅ (내 변경 반영).
- **api-server + admin-dashboard 배포 BLOCKED** — 병행 세션(WO-...-PRODUCT-MASTER-STATUS)이 **커밋한 파일이 미커밋 파일을 import** 하여 main 이 이미 깨진 상태(내 회귀 아님, §5 증거).
- **컬럼 DROP 은 후속 migration WO** 로 분리(롤링 배포 안전 순서 — §6).

---

## 1. 제거한 것

### 백엔드 (api-server)
| 파일 | 제거/변경 |
|---|---|
| `services/product-candidate.service.ts` | `matchCandidate`·`computeMatch`·`outcomeFromIdentifierHits`·`manuallyMatchCandidate`·`createCandidateFromIdentifier`·`MatchOutcome` 인터페이스·`ProductIdentifierService` 의존 제거. `getConflictInfo` 슬림(`possibleMasters`/`conflictingCandidates` 제거 → `candidate`+`promotable`+`conflictKey`+`rawPayloadSummary` 만). `evaluatePromotable` = `matchStatus` 게이트 → `matched_product_master_id IS NULL` 기반. `createCandidate` 에서 `matchStatus` 미설정 |
| `controllers/product-candidate.controller.ts` | 라우트 `POST /:id/match`·`POST /:id/manual-match` 제거. 목록 `matchStatus` 필터 파라미터 제거. `POST /`(create) = 항상 `createCandidate`(auto-match 분기 제거) |
| `entities/ProductCandidate.entity.ts` | `matchStatus`·`matchedIdentifierId`·`confidenceScore` 필드 + `matchedIdentifier` 관계 + `idx_product_candidates_match_status` 인덱스 + `ProductCandidateMatchStatus`/`PRODUCT_CANDIDATE_MATCH_STATUSES` 타입 제거 |
| `entities/index.ts` | `ProductCandidateMatchStatus`/`PRODUCT_CANDIDATE_MATCH_STATUSES` 재export 제거 |
| `drug-import/drug-master-promotion-apply.db.ts` | 승격 시 `match_status` 설정 제거 (등록 링크 = `matched_product_master_id`+`candidate_status` 로만 표현) |
| `services/mobile-product-draft.service.ts` | 드래프트→후보 전환 시 `matchCandidate` 호출 제거 |

### 프론트엔드 admin (admin-dashboard)
- `ProductCandidatesPage.tsx`: "기본상품 매칭" 컬럼 제거, 행 액션 라벨 = `상세`(조건부 충돌 라벨 제거), `candidate-status.util` 의존 제거.
- `CandidateConflictDrawer.tsx`: 수동 매칭 검색·"동일 식별자 다른 후보"·"식별자 일치 기본상품"·매칭 상태 필드 제거. 제목 = `후보 상세`. 유지 = 원천정보/원천식별자/rawPayload/신규 등록(승격)/archive·ignore·manual_review.
- `ProductCandidateDetailPage.tsx`: 매칭 상태·신뢰도 필드 제거, "등록 결과"(등록된 O4O 상품 ID) 로 정리.
- `candidate-status.util.ts`: **삭제**(소비처 0).

### 프론트엔드 web-neture 오퍼레이터
- `lib/api/operatorProductCandidates.ts`: `ProductCandidateMatchStatus` 타입, `ProductCandidate.matchStatus/matchedIdentifierId/confidenceScore`, 목록 `matchStatus` 필터, `match()`·`manualMatch()` 메서드 제거.
- `pages/operator/ProductCandidateReviewPage.tsx`: `MATCH_BADGE`, 매칭·신뢰도 컬럼, 매칭 필터 select, 충돌 stat, 재매칭·수동매칭 핸들러+UI, 상세 매칭 뱃지·신뢰도·매칭식별자 필드 제거. stat = 전체/대기/등록완료. GuideBlock 문구 갱신.

---

## 2. 유지한 것 (제거 대상 아님)
- `ProductMaster` / `ProductIdentifier` 엔티티·테이블.
- **`matched_product_master_id`** (198,387건 = 등록 결과 링크). 의미 재정의: *사전 매칭 결과가 아니라 후보 처리 결과로 연결된 O4O 상품 ID*.
- 상품 등록 시 dedup(`promoteMasterFromCandidate`→`approveAsNewProductMaster`→`promoteOne`): 동일 공식 식별자 존재 시 신규 생성 안 함 + 기존 Master 연결 + 후보 등록완료. **운영자 사전 매칭 없이 내부 트랜잭션에서 자동 처리**.
- 후보 상태 3그룹(등록 전 / 등록 완료 / 제외), reject/archive/refine/link-to-listing.
- `match_status` **DB 물리 컬럼** — 의료기기 등 import 서비스가 원천 grain 신호(`UDI_DI_DUP_CONFLICT`)로 raw SQL write 중이므로 컬럼은 유지(엔티티/ API/UI 에서만 제거). 물리 컬럼 정리는 import write 제거 후 후속.

---

## 3. dedup-on-create (사전 매칭 대체) 흐름
```
후보 생성(pending, 사전 매칭 없음)
→ [등록 대상] promoteMasterFromCandidate → promoteOne(TX)
     ├─ 동일 KOREA_DRUG_CODE/barcode Master 존재 → link  → candidate_status='matched'            + matched_product_master_id
     ├─ 없음                                   → create→ candidate_status='approved_new_master' + matched_product_master_id + ProductIdentifier
     └─ 식별자 충돌                            → conflict(생성 거부)
→ [비대상] reject/archive
```

---

## 4. 검증 (type-check / build)
| 대상 | 결과 |
|---|---|
| api-server `type-check` | 내 변경 관련 **신규 에러 0** (잔존 에러는 무관 스크립트 `drug-otc-nutrition-combo-*`·`drug-otc-description-promotion-dryrun` 의 pre-existing 중복 선언 — 내 diff 아님) |
| api-server `build:api` (esbuild 배포 빌드) | **PASS** (dist/main.js 8.43MB) |
| admin-dashboard `type-check` | **PASS** (에러 0) |
| admin-dashboard `build:prod` | **PASS** (✓ 34.88s) |
| web-neture `build` | **PASS** (✓ 11.83s) |
| 잔존 매칭 심볼(admin/web-neture 컴포넌트) | grep 0 (주석 제외) |

---

## 5. 배포 결과

| 서비스 | 결과 | 비고 |
|---|---|---|
| **Deploy Web Services** (web-neture) | ✅ **SUCCESS** (run 29065280223) | 내 오퍼레이터 페이지 변경 반영 |
| **Deploy API Server** | ❌ FAILURE (run 29065280165) | **병행 세션 원인** |
| **Deploy Admin Dashboard** | ❌ FAILURE (run 29065280189) | **병행 세션 원인** |

### 5.1 api/admin 실패는 내 회귀가 아님 (증거)
직전 커밋 `d1b297d8b`("admin-direct STORE description authoring", 병행 세션 WO-...-PRODUCT-MASTER-STATUS 계열)에서 이미 두 배포가 실패했고, 원인은 **커밋된 파일이 아직 커밋 안 된 파일을 import**:
- api-server: `src/bootstrap/register-routes.ts:512` → `Cannot find module '../modules/neture/controllers/product-master-status.controller.js'`
- admin-dashboard: `src/pages/o4o-product-db/ProductMasterDetailPage.tsx` → `Could not resolve "./ProductMasterStatusControls"`

두 파일(`product-master-status.controller.ts`, `ProductMasterStatusControls`)은 **병행 세션의 미커밋 로컬 WIP** 로만 존재(내 워킹트리엔 있어 로컬 빌드는 통과, CI 는 커밋 트리만 빌드해 실패). 내 커밋 `f1bce3172` 는 이 깨진 main 위에 얹혀 동일 이유로 실패한다. **내 코드/파일은 무관** — 병행 세션이 해당 컨트롤러/컴포넌트를 커밋하면 main 이 복구되고 재배포 시 내 변경도 함께 반영된다.

> 조치 권장: 병행 세션이 `product-master-status.controller.ts` + `ProductMasterStatusControls` 를 커밋 → main green → api/admin 재배포(워크플로 재실행) → 그때 admin/api smoke 수행.

### 5.2 실브라우저 smoke — 현재 보류 (사유 명확)
- api/admin: 배포 실패로 구 리비전 서빙 → 내 변경 미반영 → smoke 불가(main 복구 후).
- web-neture: 배포됐으나 `/operator/product-candidates` 는 OperatorRoute 가드 — 테스트 계정(sohae2100=neture supplier 롤)으로 접근 시 `/` 리다이렉트 → 브라우저 렌더 미도달. (오퍼레이터 롤 계정 필요.) 프론트 제거는 build 통과로 확인됨.

---

## 6. DB 컬럼 정리 (후속 migration WO)

조사 근거: `matched_identifier_id` **0건**, `confidence_score` **0건**(전체 394,491), `matched_product_master_id` 198,387건 유지.

**롤링 배포 안전 순서**(WO §6 준수 — 코드 제거 → 배포 → 확인 → DROP):
1. (이번 WO) 엔티티/코드에서 `matched_identifier_id`·`confidence_score` 참조 제거 → 배포. 물리 컬럼은 남겨둔다(구 리비전이 SELECT 해도 무해).
2. (후속 `WO-...-MATCH-COLUMN-DROP-MIGRATION-V1`) 이번 코드-제거가 프로덕션에 안정 반영된 뒤:
   - `ALTER TABLE product_candidates DROP COLUMN matched_identifier_id;`
   - `ALTER TABLE product_candidates DROP COLUMN confidence_score;`
   - (선택) `DROP INDEX idx_product_candidates_match_status;`
3. `match_status` 물리 컬럼은 import 서비스(medical-device 등)의 raw SQL write 를 먼저 제거해야 안전하게 DROP 가능 → 별도 판단.

> 같은 배포에 DROP 을 포함하지 않은 이유: Cloud Run 롤링 중 구 리비전(엔티티에 해당 컬럼 존재)이 잠시 서빙되며 `SELECT matched_identifier_id/confidence_score` 를 수행 → 컬럼이 이미 DROP 되면 500. 2-phase 가 안전.

---

## 7. 완료 기준 대비
- [x] admin/web-neture/mobile 사전 매칭 UI·분기 제거
- [x] 자동·수동·재매칭 API 제거 (`/match`·`/manual-match`)
- [x] 후보 생성 시 자동 매칭 호출 제거 (controller create + mobile draft)
- [x] 이름 유사 ProductMaster 검색 제거 (`computeMatch`)
- [x] `matched_identifier_id`·`confidence_score` **코드 의존성 0**
- [x] 상품 등록 트랜잭션 dedup 유지
- [x] 후보 업무 상태 = 등록 전/등록 완료/제외 중심
- [x] type-check·build 통과
- [~] 관련 서비스 배포 — **web-neture SUCCESS / api·admin BLOCKED(병행 세션 원인, §5)**
- [~] 운영 smoke — **보류(배포 blockage + 오퍼레이터 롤 접근, §5.2)**
- [x] 제거 후 잔존 검색 결과 문서화
- [x] DB 컬럼 DROP 여부·결과 명확 보고 (§6, 후속 migration WO)

---

## 8. 안전/범위 확인
- 병행 세션 파일(`o4o-product-db.api.ts`, `register-routes.ts`, `product-library.controller.ts`, `neture.service.ts`, `catalog.service.ts`, `product-master-status.controller.ts`, `ProductMasterStatusControls`) **미접촉·미커밋** (path-specific 커밋). `pnpm-lock.yaml` 제외.
- 후보 대량 승격 0 · 데이터 보정 0 · ProductMaster/Identifier 생성·수정 0 · hard delete 0 · `matched_product_master_id` 삭제 0 · migration 0(이번 커밋).
- admin `o4o-product-db.api.ts` 의 `ProductCandidateRow.matchStatus/confidenceScore` 잔존 타입 필드 + `manualMatchCandidate` 함수(미사용) 정리는 병행 세션이 같은 파일을 편집 중이라 **미접촉** — 해당 파일 소유권이 정리되면 후속.
