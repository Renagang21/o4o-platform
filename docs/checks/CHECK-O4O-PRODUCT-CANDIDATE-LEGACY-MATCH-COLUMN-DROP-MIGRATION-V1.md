# CHECK-O4O-PRODUCT-CANDIDATE-LEGACY-MATCH-COLUMN-DROP-MIGRATION-V1

> WO: `WO-O4O-PRODUCT-CANDIDATE-LEGACY-MATCH-COLUMN-DROP-MIGRATION-V1`
> 선행: `WO-O4O-PUBLIC-DATA-CANDIDATE-LEGACY-MASTER-MATCHING-REMOVAL-V1`(코드/엔티티/API 사전매칭 제거·배포 완료)
> migration 커밋: `87ded110f` · 작업일: 2026-07-10 · **적용 완료(프로덕션)**

---

## 0. 결론
`product_candidates`의 사전 매칭 잔재 물리 컬럼 **`matched_identifier_id`, `confidence_score`(+ FK + index)를 migration으로 제거**했다. 두 컬럼 모두 값 보유 0건·코드 참조 0건이었고, 엔티티는 이미 이 필드들을 매핑하지 않은 채 배포된 상태였다. main 반영 → CI/CD 자동 migration 적용 → 프로덕션 DB에서 컬럼/FK/index 삭제 확인 → API·Admin 회귀 PASS. `match_status`, `matched_product_master_id`, 후보 상태·데이터는 무변경.

---

## 1. 사전 확인 (요청 항목 전부 검증)
| 확인 | 결과 |
|---|---|
| `matched_identifier_id` 값 보유 행 | **0건** (전체 394,491) |
| `confidence_score` 값 보유 행 | **0건** |
| 코드·엔티티·API·프론트 참조 | **0** (엔티티엔 주석만; `confidenceScore` grep 잔여는 diabetes-core/glycopharm/supplier 등 **무관 도메인**) |
| 관련 FK | `product_candidates_matched_identifier_id_fkey` → product_identifiers ON DELETE SET NULL (존재) |
| 관련 index | `idx_pc_matched_identifier_id` on (matched_identifier_id) (존재). `confidence_score`는 FK/index 없음 |
| 프로덕션 리비전 = 사전매칭 제거 반영 | 마지막 성공 API 배포 = `46841a1cc`(제거 커밋 `f1bce3172`를 조상으로 포함, 엔티티에 두 필드 없음) |

---

## 2. Migration (`20261229000000-DropLegacyMatchColumnsFromProductCandidates`)
- **가드**: up 진입 시 컬럼 없으면 조용히 종료(멱등). 값 보유 행이 하나라도 있으면 **중단(throw)** — 데이터 손실 방지(무리한 삭제 금지, 사전 0/0).
- **up**: `DROP CONSTRAINT IF EXISTS product_candidates_matched_identifier_id_fkey` → `DROP INDEX IF EXISTS idx_pc_matched_identifier_id` → `DROP COLUMN IF EXISTS matched_identifier_id` → `DROP COLUMN IF EXISTS confidence_score`.
- **down**: nullable 컬럼 2개 재생성 + FK + index 복원(값은 원래 0건이라 복원 불가). 멱등(IF NOT EXISTS).
- 타임스탬프 = 직전(`20261228000000`)+1 순차 카운터 규칙.

---

## 3. 적용·검증
- 커밋 `87ded110f` → main push → **Deploy API Server SUCCESS**(run 29073407624) → CI/CD `runMigrations()` 자동 실행.
- typeorm_migrations 기록: **`DropLegacyMatchColumnsFromProductCandidates20261229000000`** ✅
- 프로덕션 DB(cloud-sql-proxy 재확인):
  - `matched_identifier_id`, `confidence_score` 컬럼 **GONE** (잔존 = `match_status`, `matched_product_master_id`만) ✅
  - FK `product_candidates_matched_identifier_id_fkey` **없음** ✅
  - index `idx_pc_matched_identifier_id` **없음** ✅

### 3.1 회귀 검증 (API + Admin) — PASS
admin.neture.co.kr 로그인 → `/admin/o4o-product-db/candidates`:
- ✅ 후보 목록 정상(`findCandidates` 엔티티 SELECT) — **총 126,897건**, 표/페이지네이션(1/6345) 정상, 500 없음.
- ✅ 후보 상세 드로어(`getConflictInfo`/`getCandidate`) 정상 — 후보 기본정보/원천 식별자/신규 등록 게이트/rawPayload/처리 액션 렌더.
- 콘솔의 401은 진입 전 세션 만료(auth/refresh)로 인한 것이며, 로그인 후 목록·상세는 정상 로드.

---

## 4. 금지 준수
- `match_status` **미변경**(물리 컬럼 유지 — 의료기기 등 import raw SQL write 신호).
- `matched_product_master_id` **미변경**(등록 결과 링크 유지).
- 후보 상태·ProductMaster·ProductIdentifier 데이터 무변경. 후보 대량 승격 0. e약은요 제외 처리 0.

## 5. 안전 확인
- migration 1건(컬럼 2 + FK 1 + index 1 제거). 데이터 write/삭제 없음(대상 컬럼 값 0건).
- migration 실패 시 우회 없음 — 실패 시 throw로 중단하고 원인 보고하도록 설계. (실제 실행 = 성공)
- 후속(별도 WO): `match_status` import write 사용처 조사 → 물리 컬럼 정리 판단 / 원천별 미등록 후보 처리.

## 6. 완료 기준 대비
- [x] `matched_identifier_id` 제거 · [x] `confidence_score` 제거 · [x] FK·index 함께 제거
- [x] migration 파일 작성 · [x] main 반영 · [x] CI/CD 자동 migration 적용 확인
- [x] API·Admin 회귀 검증 · [x] 운영 DB 컬럼 제거 재확인 · [x] CHECK 문서 작성/커밋
- [x] `match_status` 미변경
