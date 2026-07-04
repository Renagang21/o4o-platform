# WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-ADMIN-REVIEW-AND-NEXT-GATE-AUDIT-V1

> 작업 성격: **read-only audit (코드/API 정적 분석 + 기존 DB 검증 결과 참조).** DB write 0, apply 0, migration 0, 생성 0. 문서만 commit/push.
> 작성일: 2026-07-04
> 트랙: **건강기능식품 전용**
> 선행: [`WO-...-CANDIDATE-APPLY-RUNBOOK-V1`](WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-APPLY-RUNBOOK-V1.md) §9 (Gate A apply 44,885 완료, commit b64beb201)
> 비교 근거: `docs/investigations/IR-O4O-PUBLIC-PRODUCT-SEED-STANDARD-PROCESS-V1.md` (의약품 실제 후속 흐름)

---

## 0. 목적

건강기능식품 Gate A 후보 44,885건이 **admin.neture.co.kr O4O 상품 DB 에서 검토·정비 가능한 상태인지** 확인하고,
의약품 기본 seed 이후 실제 후속 흐름(Master 승격 → e약은요 적재 → 매칭 → SharedDescription → Representative → Image)과
비교해 **건강기능식품의 다음 Gate** 를 결정한다. **DB write 없음, 생성 없음.**

### 왜 "설명 생성" 이 다음이 아닌가
의약품은 기본 작업 후 **ProductMaster 가 존재**했기에 4~6단계(SharedProductDescription / RepresentativeProduct / ProductImage)로 갔다.
건강기능식품은 현재 **Candidate-only (ProductMaster 0)** 이고 barcode/포장/허가상태 원천도 없어 그 경로로 바로 갈 수 없다.
따라서 다음은 **admin 후보 검토 기반 확인 + Gate B 원천 재조사** 다.

---

## 1. Admin 후보 검토 가능 여부 (코드 정적 분석)

### 1.1 Admin UI 존재 = **YES (2개 경로)**
| UI | 경로 | 성격 | 게이트 |
|---|---|---|---|
| admin-dashboard (admin.neture.co.kr) | `/admin/o4o-product-db/candidates` (list) · `/candidates/:id` (detail) | **read-only** O4O 상품 DB 브라우저 | admin / super_admin |
| web-neture operator 콘솔 | `ProductCandidateReviewPage` | read + 액션(match/reject/archive/link) | operator/admin roles |

- 파일: `apps/admin-dashboard/src/pages/o4o-product-db/ProductCandidatesPage.tsx` (+ `ProductCandidateDetailPage.tsx`, `api/o4o-product-db.api.ts`, `routes/o4o-product-db.routes.tsx`)
- 백엔드: `GET /api/v1/operator/product-candidates` · `GET /:id` (`product-candidate.controller.ts`, mount `register-routes.ts:424`)

### 1.2 확인 항목별 결과 (7)

| # | 확인 | 결과 | 근거 |
|---|---|---|---|
| 1 | admin O4O 상품 DB 후보 목록 조회 | **가능** | admin-dashboard 목록 UI + `all=true` 로 플랫폼 전체 조회. HFF `service_key=NULL` → scope 필터 `(service_key=ANY OR service_key IS NULL)` 로 포함 |
| 2 | 필터/검색으로 HFF 후보 분리 | **부분 (GAP)** | 필터는 `candidateStatus/matchStatus/sourceType` 뿐. **`source_label` 필터·이름 검색 없음** → HFF(external_api 44,885) 와 e약은요(external_api 4,757) 가 `sourceType=external_api` 로 섞여 **HFF 만 분리/검색 불가** |
| 3 | 후보 상세에서 raw_payload 필드 확인 | **가능** | detail UI 에 "rawPayload 원문 펼치기" (`JSON.stringify`) → MAIN_FNCTN / INTAKE_HINT1 / BASE_STANDARD / PRDUCT / ENTRPS / STTEMNT_NO 모두 `rawPayload.source` + `rawPayload.mainFunction` 에서 확인. 백엔드 `getCandidate` 는 전체 엔티티 반환(projection 없음) |
| 4 | ProductMaster 없음 → SharedProductDescription 파생 불가 | **확인 (불가)** | Gate A 검증(runbook §9): `product_masters` 불변(230,843). HFF matched master 0 → classification `basis=inferred`. SharedProductDescription 은 master 기반(의약품 선례) → **HFF 파생 대상 0** |
| 5 | RepresentativeProduct 그룹핑 | **불가/보류** | 대표상품 그룹핑은 Master/SKU 단위. HFF Candidate-only → 그룹핑 대상 없음 |
| 6 | ProductImage 원천 | **없음** | HFF raw 에 이미지 필드 부재 → mapper `candidateImageUrl=null` 전건. GCS 사본 원천 0 |
| 7 | 다음 후보 | §3 | — |

---

## 2. 의약품 후속 흐름 vs 건강기능식품 (Gate 비교)

| 의약품 실제 후속 | 건강기능식품 적용 가능? |
|---|---|
| 1. 약가마스터 Candidate → ProductMaster/Identifier 승격 (SKU/포장 확정) | **불가** — barcode/GTIN/포장단위/허가상태 원천 없음 (Gate B 잠금) |
| 2. e약은요 raw → ProductCandidate 적재 (설명 원천) | **HFF 자체가 이 위치** (설명 텍스트는 rawPayload 에 이미 보존: MAIN_FNCTN/INTAKE_HINT1/BASE_STANDARD) |
| 3. itemSeq ↔ MFDS_CODE 매칭 시뮬 | **불가** — 매칭 대상 Master 없음 |
| 4. e약은요 설명 → shared_product_descriptions 파생 | **불가** — master 기반 파생, HFF master 0 |
| 5. representative_products 그룹핑 | **불가** — SKU/Master 없음 |
| 6. e약은요 이미지 → ProductImage GCS | **불가** — 이미지 원천 0 |
| 7. admin O4O 상품 DB read-only 화면 | **가능** — 이미 존재(§1.1), 단 HFF 분리 필터 GAP |

**결론: 건강기능식품은 의약품의 2단계(Candidate 적재)까지만 도달. 3~6단계는 ProductMaster 부재로 전부 잠김.** 의약품이 설명/대표상품/이미지로 간 것은 Master 가 있었기 때문이며, HFF 는 그 전제가 없다.

---

## 3. 다음 후보 (별도 WO, 우선순위)

1. **Candidate 정비 UI 보강 (권장 1순위)** — 후보 list API/UI 에 `source_label` 필터 + 이름/STTEMNT_NO 검색 추가. 현재 HFF 44,885 를 e약은요와 분리해 볼 수 없는 GAP 해소. (백엔드 `findCandidates` 에 `sourceLabel` 조건 + ILIKE 검색 additive, UI 필터 1개 추가. **DB 스키마 무변경, 기능 은폐 0**)
2. **건강기능식품 SKU/barcode 원천 추가 조사** — Gate B 잠금 해제 가능성 타진(식약처/유통 바코드 매칭 원천 존재 여부). read-only 조사.
3. **후보 기반 설명 제작용 seed 데이터 설계** — Master 없이도 rawPayload(MAIN_FNCTN/INTAKE_HINT1/BASE_STANDARD)로 매장 설명 seed 를 만들 수 있는지 설계(파생 테이블 대신 후보 rawPayload 소비 경로). ProductMaster 승격과 분리.
4. **Gate B 보류 유지** — barcode/포장/허가상태 원천 확보 전 ProductMaster 승격 금지.

---

## 4. read-only 준수 확인

| 항목 | 결과 |
|---|---|
| DB write / apply | 0 |
| ProductMaster / ProductIdentifier 생성 | 0 |
| SharedProductDescription / ProductImage 생성 | 0 |
| 코드 변경 | 0 (정적 분석만) |
| 방화벽 재오픈 | 0 (DB 사실은 runbook §9 검증 결과 재사용) |
| 병렬 세션 파일 수정 | 0 |

이번 변경 = audit 문서 1건.

---

## 5. 결론

**건강기능식품 Gate A 후보 44,885건은 admin.neture.co.kr O4O 상품 DB(`/admin/o4o-product-db/candidates`)에서 read-only 로 조회 가능하며, 상세에서 rawPayload(MAIN_FNCTN/INTAKE_HINT1/BASE_STANDARD 등) 전문 확인이 된다. 단 목록 필터에 `source_label`·검색이 없어 HFF 44,885 를 e약은요와 분리 조회하지 못하는 GAP 이 있다. ProductMaster 부재로 SharedProductDescription/RepresentativeProduct/ProductImage 경로는 전부 잠겨 있어, 다음은 "설명 생성"이 아니라 (1) Candidate 정비 UI 필터 보강 + (2) Gate B 원천(barcode/포장/허가상태) 재조사 다. Gate B(ProductMaster 승격)는 계속 보류한다.**

> 후속: 위 §3-1 (필터 보강)이 실제 구현 WO 후보. 라이브 UI 스모크(admin 로그인 → 목록/상세 확인)는 필요 시 별도 browser verification 으로.
