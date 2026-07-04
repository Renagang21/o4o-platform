# CHECK-O4O-ADMIN-PUBLIC-PRODUCT-CANDIDATE-SOURCE-FILTER-AND-SEARCH-V1

> WO: **WO-O4O-ADMIN-PUBLIC-PRODUCT-CANDIDATE-SOURCE-FILTER-AND-SEARCH-V1**
> 작성일: 2026-07-04 · 성격: additive 기능 추가 (source_label 필터 + 검색). DB schema 무변경 / migration 0 / write endpoint 무변경.
> 선행: [`WO-...-CANDIDATE-ADMIN-REVIEW-AND-NEXT-GATE-AUDIT-V1`](../work-orders/WO-O4O-HEALTH-FUNCTIONAL-FOOD-PUBLIC-CANDIDATE-ADMIN-REVIEW-AND-NEXT-GATE-AUDIT-V1.md) §2 (필터 GAP 지목)

---

## 0. 목적

admin O4O 상품 DB 후보 화면(`/admin/o4o-product-db/candidates`)에서 `sourceType=external_api` 로 섞이는
건강기능식품(44,885) / e약은요(4,757) / 의약외품(22,953) 후보를 **`source_label` 정확일치 필터** 로 분리하고,
**후보명/제조사/식별자(STTEMNT_NO 등) 부분검색** 을 추가한다. 기존 필터·동작·리뷰 화면은 무회귀.

---

## 1. 변경 파일 (5)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/services/product-candidate.service.ts` | `FindCandidatesFilter` 에 `sourceLabel?`/`search?` 추가. `findCandidates` 에 `source_label` 정확일치 + ILIKE 검색(candidate_name/manufacturer/identifier_value/normalized) additive |
| `apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts` | `GET /` 에서 `sourceLabel` / `search`(=`q` alias) query param 파싱·전달 |
| `apps/admin-dashboard/src/api/o4o-product-db.api.ts` | `ProductCandidateListParams` 에 `sourceLabel`/`search`, query 전송 |
| `apps/admin-dashboard/src/pages/o4o-product-db/ProductCandidatesPage.tsx` | source_label 입력(datalist 프리셋 3종) + 검색창(폼 제출 시 commit) + 초기화 + URL query sync |

**무변경 보장:** DB schema/migration 0, write endpoint 0, `product_candidates` 컬럼 0. 새 param 은 전부 optional → 미전송 시 기존과 동일. 같은 API 를 쓰는 web-neture operator 리뷰 콘솔은 HTTP 호출이라 컴파일 결합 없고 응답 shape 불변 → 무영향.

### 1.1 검색 안전
ILIKE 파라미터는 `%` `_` `\` 를 리터럴 이스케이프 후 `%term%` 바인딩(파라미터 바인딩, string interpolation 없음).

---

## 2. 검증

### 2.1 typecheck
| 대상 | 결과 |
|---|---|
| api-server (service/controller) | **PASS** (`tsc --noEmit`, 변경 파일 오류 0) |
| admin-dashboard (page/api) | **PASS** (`tsc --noEmit`, 변경 파일 오류 0) |

### 2.2 Backend read-only smoke (프로덕션, findCandidates 동일 WHERE 의 psql count)
> 방화벽 임시 오픈(실행 IP) → 단일 연결 조회 → **원복 확인**(`124.194.156.36/32` only). DB write 0.

| 쿼리 | 기대 | 실측 |
|---|---:|---:|
| `sourceLabel=MFDS_HEALTH_FUNCTIONAL_FOOD` | 44,885 | **44,885** ✅ |
| `sourceLabel=MFDS_EASY_DRUG_INFO` | 4,757 | **4,757** ✅ |
| `sourceLabel=MFDS_QUASI_DRUG_PERMIT` | 22,953 | **22,953** ✅ |
| HFF + search `홍삼` (상품명) | > 0 | 3,382 ✅ |
| HFF + search `20140017002183` (STTEMNT_NO 정확) | 1 | **1** ✅ |
| HFF + search `일화` (업체명) | > 0 | 211 ✅ |

→ `source_label` 필터가 external_api 후보를 정확히 분리하고, 검색이 상품명/업체명/식별번호 3축에서 동작함을 실데이터로 확인.

### 2.3 Browser smoke (admin.neture.co.kr) — **후속(배포 대기)**
admin-dashboard 변경은 배포 후 라이브 확인 대상. 배포 완료 후:
1. `/admin/o4o-product-db/candidates` 진입
2. source_label = `MFDS_HEALTH_FUNCTIONAL_FOOD` 필터 → 총 44,885 표시
3. STTEMNT_NO 검색 → 단건, 상세 rawPayload 확인
(본 CHECK 시점 미실행 — 별도 browser verification 으로 기록 예정.)

---

## 3. 준수 확인

| 항목 | 결과 |
|---|---|
| DB write / apply | 0 (read-only smoke 만) |
| DB schema / migration | 0 |
| write endpoint 변경 | 0 |
| ProductMaster/Identifier/SharedDescription/Image 생성 | 0 |
| raw 파일 커밋 | 0 |
| Gate B 승격 판단 변경 | 0 (보류 유지) |
| 타 트랙(의약품/의약외품/의료기기) 데이터 변경 | 0 |
| 기존 필터/리뷰 화면 회귀 | 0 (additive optional) |

---

## 4. 결론

**admin O4O 상품 DB 후보 화면에 `source_label` 정확일치 필터 + 상품명/업체명/식별번호 검색을 additive 로 추가했다. 백엔드 read-only smoke 로 3개 seed 라벨 분리(44,885 / 4,757 / 22,953)와 STTEMNT_NO 정확검색(1건)을 실데이터로 확인했고, 양쪽 typecheck PASS. 이제 admin 에서 건강기능식품 후보 44,885건을 다른 external_api 후보와 분리·검색할 수 있다.** 라이브 browser smoke 는 admin-dashboard 배포 후 후속으로 기록한다.

> 다음(별도 WO): (a) 배포 후 browser smoke, (b) HFF SKU/barcode 원천 재조사(Gate B), (c) rawPayload 기반 설명 seed 설계.
