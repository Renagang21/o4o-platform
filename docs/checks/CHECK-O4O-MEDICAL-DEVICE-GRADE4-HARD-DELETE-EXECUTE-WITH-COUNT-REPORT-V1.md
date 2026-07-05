# CHECK-O4O-MEDICAL-DEVICE-GRADE4-HARD-DELETE-EXECUTE-WITH-COUNT-REPORT-V1

> WO: `WO-O4O-MEDICAL-DEVICE-GRADE4-HARD-DELETE-EXECUTE-WITH-COUNT-REPORT-V1`
> 상태: **완료 — CI/CD 배포 migration 으로 프로덕션 실삭제 완료·검증 완료 (2026-07-05)**

---

## 0. 실행 환경 / 메타

| 항목 | 값 |
|---|---|
| 실행 환경 | 프로덕션 `o4o_platform` (Cloud SQL `o4o-platform-db`, `netureyoutube:asia-northeast3`) |
| 검증 채널 | Cloud SQL Auth Proxy v2 (localhost:5433, read/verify only) |
| dry-run 일시 | 2026-07-05 (KST) |
| 실제 삭제 방식 | main 배포 → CI/CD 자동 migration (Deploy API Server, run 28735215315 success) |
| 실제 삭제 일시 | 2026-07-05 (KST) · 배포 성공 후 프록시 read-only 검증 |
| 상세설명서 생성 | **0건** (WO 범위 외 — 생성하지 않음) |

---

## 1. 중대 정정 — WO 전제(선행 구현) 부재

WO §3 은 entity 변경과 migration `20261204000000-AddProductDataCurationAndDeleteMedicalDeviceGrade4.ts`
가 **이미 존재**한다고 전제했으나, 코드베이스 확인 결과 **선행 구현이 전무**했다.

- `ProductMaster.entity.ts` 에 정제용 4개 컬럼 없음
- 해당 migration 파일 없음 (같은 타임스탬프 `20261204000000` 는 무관한
  `CreateProductCandidateDescriptionDrafts` 가 이미 점유 — 충돌)
- `product_master_cleanup_audits` 테이블/참조 없음

→ 본 작업은 "migration 실행"이 아니라 **삭제 스키마·로직 신규 구현 + CI/CD 삭제**로 수행했다.

---

## 2. 적용 커밋 / migration

| 항목 | 값 |
|---|---|
| entity | `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` (+4 컬럼) |
| migration 1/2 (DDL) | `20261206000000-AddProductCurationSchemaAndCandidateIdentifierIndex.ts` |
| migration 2/2 (DML) | `20261206010000-DeleteMedicalDeviceGrade4Masters.ts` |
| 실행 커밋 | `3d4022d5c` (Deploy API Server run 28735215315, conclusion=success) |
| 적용된 migration | `AddProductCurationSchemaAndCandidateIdentifierIndex20261206000000` + `DeleteMedicalDeviceGrade4Masters20261206010000` (typeorm_migrations 등록 확인) |

**2-migration 분리 이유 (락 안전성):** ALTER(ACCESS EXCLUSIVE)를 DDL migration 으로 분리·즉시
커밋하여 hot 테이블 `product_masters` 의 배타 락 점유를 순간(ms)으로 제한. 대량 backfill/delete
는 DML migration 에서 ROW EXCLUSIVE(동시 읽기/쓰기 무영향)로 수행.

---

## 3. 등급 원천 기준 (실측 정정)

WO §4 우선순위 중 **실제 매칭 master 는 2순위 경로**에 등급이 존재:
`raw_payload->'source'->>'CLSF_NO_GRAD_CD'`. 최상위 `CLSF_NO_GRAD_CD` 는 매칭 master 에서 없음.
migration 의 `COALESCE(...)` 가 전 우선순위를 커버하므로 정상 백필됨(missing 0).

master↔candidate join = `product_candidates.matched_product_master_id`.
의료기기 master 19,602 전건이 candidate 와 매칭(미매칭 0) → 백필 100% 커버.

---

## 4. Preflight (삭제 전 · 실측)

| 항목 | 값 |
|---|---:|
| 전체 ProductMaster | 250,445 |
| 의료기기 ProductMaster | 19,602 |
| candidate 등급 분포 (원천) | 2등급 12,731 / 1등급 4,748 / 3등급 1,742 / 4등급 775 |
| master 등급 분포 (백필 후) | 2등급 12,533 / 1등급 4,632 / 3등급 1,682 / **4등급 755** |
| master 다중등급 충돌 | 0 (깨끗한 1:1) |

> candidate 4등급 775 vs master 4등급 755: 차이 20 = 미매칭(미promote) candidate → 삭제 대상 아님.

**FK 의존성 (755개 4등급 master 연결 데이터, 실측):**
- `product_identifiers` 1,510 (CASCADE 자동)
- `product_candidates` 755 (SET NULL 자동)
- 그 외 11개 참조 테이블(offers/store_products/listings/service_products/images/… ): **전부 0행**
- RESTRICT/NO ACTION FK(supplier_product_offers / organization_product_listings / service_products) 연결 0 → FK 위반 없이 삭제 가능

---

## 5. 성능 이슈 발견·해결 (production-safety)

**초기 dry-run 에서 755 master 삭제가 25분+ 로 폭주**하고 `product_masters` 배타 락을 장시간
점유하는 문제 발견(운영 읽기 차단 위험). 원인 규명:

- 삭제 캐스케이드 2차 경로: `product_masters` 삭제 → `product_identifiers` CASCADE 삭제
  → `product_candidates.matched_identifier_id`(ON DELETE SET NULL) 갱신
- **`product_candidates.matched_identifier_id` 미인덱스** → identifier 삭제마다 398k 행 seq scan
  (× ~1,510회)

**해결:** DDL migration 에서 `idx_pc_matched_identifier_id` 생성.

| | 미인덱스 | 인덱스 후 |
|---|---:|---:|
| 755 master 삭제 | 25분+ (미완, IO 폭주) | **1.6초** |

---

## 6. 트랜잭션 Dry-run 결과 (실 프로덕션 데이터 · BEGIN…ROLLBACK, 미영속)

두 migration 의 전 SQL 을 실 프로덕션 데이터에 대해 1 트랜잭션으로 실행 후 **ROLLBACK**.
아래 "삭제 후" 값은 CI/CD 실제 실행이 산출할 값과 동일(seed 데이터 정지 상태).

| 단계 | 실측 |
|---|---:|
| CREATE INDEX (candidate) | 3.13s |
| ALTER TABLE (+4 컬럼) | 0.012s |
| backfill UPDATE | 19,602행 / 6.3s |
| snapshot INSERT | 755행 / 0.96s |
| 방어적 자식 정리 | 0 / 0 / 0 |
| **hard delete master** | **755행 / 1.63s** |
| ROLLBACK 후 의료기기 master | 19,602 (baseline 복원 확인) |

### Count Report (WO §8)

| 항목 | 값 |
|---|---:|
| 삭제 전 전체 ProductMaster | 250,445 |
| 삭제 전 의료기기 ProductMaster | 19,602 |
| 삭제한 4등급 의료기기 ProductMaster | 755 |
| 삭제 후 의료기기 ProductMaster | 18,847 |
| 삭제 후 4등급 잔존 | **0** |
| 삭제 후 전체 ProductMaster | 249,690 |
| 의료기기 중 삭제 비율 | 755 / 19,602 × 100 = **3.85%** |

> 비율 = deleted / (remaining_md + deleted) × 100 = 755 / (18,847 + 755) × 100 = 3.852%

---

## 7. CI/CD 실제 실행 후 확정 기록 (프로덕션 검증 완료)

배포(run 28735215315, success) 후 Cloud SQL Auth Proxy read-only 로 WO §8 쿼리 실측:

| 항목 | dry-run 예측 | **실제(CI/CD 후)** |
|---|---:|---:|
| 삭제 감사 로그 hard_delete 수 | 755 | **755** ✅ |
| 삭제 후 의료기기 master | 18,847 | **18,847** ✅ |
| 삭제 후 4등급 잔존 | 0 | **0** ✅ |
| 삭제 후 전체 master | 249,690 | **249,690** ✅ |
| 삭제 비율 | 3.85% | **3.85%** ✅ |
| 잔존 등급 분포(MD) | 1:4,632 / 2:12,533 / 3:1,682 | **동일** ✅ |
| `idx_pc_matched_identifier_id` | — | 존재 ✅ |
| `product_master_cleanup_audits` | — | 존재 ✅ |

예측과 실측 100% 일치. 확인 SQL: WO §8 쿼리 그대로
(`cleanup_key='medical_device_grade4_hard_delete_20261204'`).

---

## 8. Acceptance Criteria 대응

| 기준 | 상태 |
|---|---|
| migration 적용 성공 | ✅ CI/CD 배포 완료 (run 28735215315 success) |
| `product_masters.medical_device_grade` 컬럼 | ✅ 프로덕션 존재 |
| `product_masters.product_data_status` 컬럼 | ✅ 프로덕션 존재 |
| `product_master_cleanup_audits` 테이블 | ✅ 프로덕션 존재 |
| 4등급 삭제 대상 snapshot 기록 | ✅ 755행 |
| 삭제 후 4등급 잔존 = 0 | ✅ 프로덕션 실측 0 |
| 전체/삭제/비율 기록 | ✅ §6 · §7 |
| 상세설명서 생성 0건 | ✅ |

---

## 9. 실패/보류 사유

- 없음. 삭제·검증 전 항목 완료.
- WO 후속(의료기기 2/3등급, 건강기능식품/의약외품 정리, 실사용 제품 상세설명서)은 범위 외 — WO §11 순서 유지.
