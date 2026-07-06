# WO-O4O-MEDICAL-DEVICE-CANDIDATE-TRACE-ARCHIVE-APPLY-V1

> 상태: READY / APPLY REQUIRES APPROVAL
> 작성일: 2026-07-06
> 대상 저장소: `Renagang21/o4o-platform`
> 선행 완료:
> - `docs/work-orders/WO-O4O-MEDICAL-DEVICE-POST-BASELINE-CANDIDATE-AND-PENDING-CLEANUP-DRYRUN-V1.md`
> - `docs/checks/CHECK-O4O-MEDICAL-DEVICE-POST-BASELINE-CANDIDATE-AND-PENDING-CLEANUP-DRYRUN-V1.md`

---

## 0. 작업 목적

의료기기 O4O 상품 DB 정리 과정에서 이미 약국 유통 대상이 아니라고 판단되어 삭제된 `ProductMaster` 15,776건에 대응하는 `product_candidates` 흔적을 archive 처리한다.

이번 WO는 새 의료기기 상품을 만들거나 식약처 데이터를 다시 적용하는 작업이 아니다.

기준은 아래와 같다.

1. O4O 유통 상품 데이터가 기준이다.
2. 삭제된 master 15,776건은 되살리지 않는다.
3. candidate 흔적은 `approved_new_master`였으나 현재 `matched_product_master_id IS NULL`인 상태로 남아 있다.
4. 이 흔적은 dangling FK가 아니라 과거 hard delete 후 남은 candidate queue residue다.
5. 실제 write는 사용자 승인 후에만 수행한다.

---

## 1. 선행 dry-run 확정값

`CHECK-O4O-MEDICAL-DEVICE-POST-BASELINE-CANDIDATE-AND-PENDING-CLEANUP-DRYRUN-V1.md` 기준.

| 항목 | 값 |
|---|---:|
| 현재 의료기기 ProductMaster | 3,826 |
| active | 3,682 |
| review_required | 144 |
| 의료기기 candidate 전체 | 19,996 |
| approved_new_master candidate | 19,602 |
| 현 master 연결 candidate | 3,826 |
| 삭제된 master 대응 candidate 흔적 | 15,776 |
| pending no identifier | 394 |
| 이번 WO 대상 | 15,776 |

검산:

```text
최초 승격 19,602
- 현재 잔존 master 연결 3,826
= 삭제된 master 대응 candidate 흔적 15,776
```

---

## 2. 이번 작업 범위

### 2.1 한다

- 최신 `origin/main` 동기화
- 선행 CHECK 문서 확인
- 현재 프로덕션 DB에서 대상 count 재검증
- archive 대상 15,776건 snapshot 생성
- snapshot count와 대상 count 일치 검증
- 사용자 승인 후 chunk 단위 archive apply
- apply 후 count 검증
- CHECK 문서 작성
- CHECK 문서를 GitHub `main`에 반영하고 fetch/read 및 git 기준으로 검증

### 2.2 하지 않는다

- `ProductMaster` 생성/수정/삭제
- `ProductIdentifier` 생성/수정/삭제
- 삭제된 15,776 master 복구
- pending 394건 archive
- review_required 144건 큐레이션
- 식약처 raw row 재수집
- 의료기기 설명서 생성
- admin UI 변경
- 단일 대형 트랜잭션으로 15,776건 일괄 update
- snapshot 없는 write

---

## 3. 동기화 및 작업 트리 원칙

실행자는 먼저 동기화한다.

```bash
git fetch origin main
git status --short
git rev-list --left-right --count origin/main...HEAD
```

주의:

- 동기화 실패 시 DB write를 하지 않는다.
- 다른 세션의 미커밋 변경은 건드리지 않는다.
- 이 WO 산출물은 path-specific으로만 커밋한다.
- `git add -A` 금지. 필요한 문서/마이그레이션 파일만 명시적으로 stage한다.
- 문서/WO/CHECK는 GitHub `main`에 반영하고, 반영 후 다시 검증한다.

---

## 4. 대상 정의

대상은 아래 조건을 모두 만족하는 `product_candidates`다.

| 조건 | 값 |
|---|---|
| `deleted_at` | `IS NULL` |
| `source_type` | `external_api` |
| `source_label` | `MFDS_MEDICAL_DEVICE_STANDARD_CODE` |
| `candidate_status` | `approved_new_master` |
| `matched_product_master_id` | `IS NULL` |

의미:

- 과거에는 ProductMaster로 승격되었음
- 이후 약국 비유통 대상 정리로 master가 삭제됨
- hard delete 과정에서 FK는 dangling으로 남지 않고 NULL 처리됨
- 따라서 현재 O4O 상품 DB에는 필요 없는 candidate residue임

---

## 5. Preflight SQL

프로덕션 DB에서 read-only로 먼저 실행한다.

### 5.1 현재 master baseline

```sql
SELECT
  COALESCE(product_data_status, '(null)') AS product_data_status,
  COUNT(*)::int AS count
FROM product_masters
WHERE regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기')
   OR mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
GROUP BY COALESCE(product_data_status, '(null)')
ORDER BY count DESC;
```

예상:

| 상태 | 값 |
|---|---:|
| active | 3,682 |
| review_required | 144 |
| 합계 | 3,826 |

### 5.2 candidate 전체 상태

```sql
SELECT
  candidate_status,
  match_status,
  CASE WHEN matched_product_master_id IS NULL THEN 'no_master_link' ELSE 'has_master_link' END AS master_link,
  COUNT(*)::int AS count
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_type = 'external_api'
  AND source_label = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE'
GROUP BY candidate_status, match_status, master_link
ORDER BY candidate_status, match_status, master_link;
```

예상 핵심:

| candidate_status | match_status | master_link | count |
|---|---|---|---:|
| approved_new_master | unmatched | has_master_link | 3,826 |
| approved_new_master | unmatched | no_master_link | 15,776 |
| pending | conflict | no_master_link | 244 |
| pending | unmatched | no_master_link | 150 |

### 5.3 이번 WO archive 대상 count

```sql
SELECT COUNT(*)::int AS target_count
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_type = 'external_api'
  AND source_label = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE'
  AND candidate_status = 'approved_new_master'
  AND matched_product_master_id IS NULL;
```

예상: `15,776`

### 5.4 대상 샘플

```sql
SELECT
  id,
  candidate_name,
  candidate_manufacturer,
  candidate_spec,
  candidate_status,
  match_status,
  matched_product_master_id,
  review_note,
  created_at,
  updated_at
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_type = 'external_api'
  AND source_label = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE'
  AND candidate_status = 'approved_new_master'
  AND matched_product_master_id IS NULL
ORDER BY updated_at DESC
LIMIT 100;
```

---

## 6. Snapshot

write 전에 반드시 snapshot을 만든다.

snapshot은 대상 row id와 핵심 판단 필드를 보존해야 한다. 기존 cleanup snapshot 테이블이 있으면 기존 패턴을 따른다. 없으면 이 WO 전용 snapshot 테이블을 migration으로 만든다.

권장 snapshot 테이블:

```sql
CREATE TABLE IF NOT EXISTS product_candidate_cleanup_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_key varchar(120) NOT NULL,
  product_candidate_id uuid NOT NULL,
  source_type varchar(32),
  source_label varchar(128),
  candidate_status varchar(32),
  match_status varchar(32),
  matched_product_master_id uuid,
  candidate_name varchar(255),
  candidate_manufacturer varchar(255),
  candidate_spec varchar(255),
  review_note text,
  raw_payload jsonb,
  snapshot_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

cleanup key:

```text
medical_device_deleted_master_candidate_trace_archive_v1
```

snapshot insert 예:

```sql
INSERT INTO product_candidate_cleanup_snapshots (
  cleanup_key,
  product_candidate_id,
  source_type,
  source_label,
  candidate_status,
  match_status,
  matched_product_master_id,
  candidate_name,
  candidate_manufacturer,
  candidate_spec,
  review_note,
  raw_payload,
  snapshot_payload
)
SELECT
  'medical_device_deleted_master_candidate_trace_archive_v1',
  id,
  source_type,
  source_label,
  candidate_status,
  match_status,
  matched_product_master_id,
  candidate_name,
  candidate_manufacturer,
  candidate_spec,
  review_note,
  raw_payload,
  jsonb_build_object(
    'reason', 'medical_device_deleted_master_candidate_trace',
    'expectedTargetCount', 15776,
    'wo', 'WO-O4O-MEDICAL-DEVICE-CANDIDATE-TRACE-ARCHIVE-APPLY-V1'
  )
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_type = 'external_api'
  AND source_label = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE'
  AND candidate_status = 'approved_new_master'
  AND matched_product_master_id IS NULL;
```

검증:

```sql
SELECT COUNT(*)::int AS snapshot_count
FROM product_candidate_cleanup_snapshots
WHERE cleanup_key = 'medical_device_deleted_master_candidate_trace_archive_v1';
```

차단 조건:

- snapshot count가 target count와 다르면 apply 금지
- target count가 15,776에서 크게 다르면 원인 조사 후 사용자 재승인
- snapshot 없이 archive 금지

---

## 7. 사용자 승인 게이트

snapshot과 dry-run count를 보고한 뒤 사용자 승인을 받아야 한다.

보고 항목:

| 항목 |
|---|
| 현재 의료기기 ProductMaster count |
| 현재 의료기기 candidate status 분포 |
| 이번 WO target count |
| snapshot count |
| archive 방식 |
| chunk 크기 |
| rollback/revert 방법 |
| apply 후 검증 SQL |

승인 문구 예:

```text
의료기기 삭제된 master 대응 candidate 흔적 15,776건을 snapshot 후 chunk 단위로 archived 처리하는 apply를 승인한다.
ProductMaster/ProductIdentifier 변경이 없고, pending 394 및 review_required 144는 이번 범위에서 제외한다.
```

---

## 8. Apply 방식

### 8.1 archive 방식

`product_candidates` row를 hard delete하지 않는다. 먼저 `candidate_status='archived'`로 변경하고 `review_note`에 근거를 남긴다.

권장 update 내용:

| 컬럼 | 값 |
|---|---|
| `candidate_status` | `archived` |
| `review_note` | 기존 note + cleanup key/reason |
| `reviewed_at` | `NOW()` |
| `updated_at` | `NOW()` |

`reviewed_by`는 실행 주체를 넣을 수 있으면 넣고, 자동 migration/job이면 NULL 또는 시스템 user 정책을 따른다.

### 8.2 chunk 처리

15,776건을 단일 트랜잭션으로 처리하지 않는다.

권장:

- chunk size: 2,000 또는 3,000
- 각 chunk 별 count 출력
- chunk 별 transaction
- lock timeout / statement timeout 설정
- 실패 시 마지막 성공 chunk 이후 재시작 가능해야 함

예시 SQL 패턴:

```sql
WITH target AS (
  SELECT pc.id
  FROM product_candidates pc
  JOIN product_candidate_cleanup_snapshots s
    ON s.product_candidate_id = pc.id
   AND s.cleanup_key = 'medical_device_deleted_master_candidate_trace_archive_v1'
  WHERE pc.deleted_at IS NULL
    AND pc.source_type = 'external_api'
    AND pc.source_label = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE'
    AND pc.candidate_status = 'approved_new_master'
    AND pc.matched_product_master_id IS NULL
  ORDER BY pc.id
  LIMIT 2000
)
UPDATE product_candidates pc
SET
  candidate_status = 'archived',
  review_note = CONCAT(
    COALESCE(pc.review_note, ''),
    CASE WHEN pc.review_note IS NULL OR pc.review_note = '' THEN '' ELSE E'\n' END,
    'medical_device_deleted_master_candidate_trace_archive_v1: archived because corresponding ProductMaster was already hard-deleted as non-pharmacy-distribution medical device'
  ),
  reviewed_at = NOW(),
  updated_at = NOW()
FROM target
WHERE pc.id = target.id
RETURNING pc.id;
```

반복 실행하며 남은 대상이 0이 될 때 종료한다.

---

## 9. Post-apply 검증

### 9.1 남은 archive 대상

```sql
SELECT COUNT(*)::int AS remaining_target_count
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_type = 'external_api'
  AND source_label = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE'
  AND candidate_status = 'approved_new_master'
  AND matched_product_master_id IS NULL;
```

예상: `0`

### 9.2 archived count

```sql
SELECT COUNT(*)::int AS archived_count
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_type = 'external_api'
  AND source_label = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE'
  AND candidate_status = 'archived'
  AND review_note ILIKE '%medical_device_deleted_master_candidate_trace_archive_v1%';
```

예상: `15,776`

### 9.3 유지 candidate 보존

```sql
SELECT COUNT(*)::int AS kept_existing_master_candidates
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_type = 'external_api'
  AND source_label = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE'
  AND candidate_status = 'approved_new_master'
  AND matched_product_master_id IS NOT NULL;
```

예상: `3,826`

### 9.4 pending 394 보존

```sql
SELECT
  match_status,
  COUNT(*)::int AS count
FROM product_candidates
WHERE deleted_at IS NULL
  AND source_type = 'external_api'
  AND source_label = 'MFDS_MEDICAL_DEVICE_STANDARD_CODE'
  AND candidate_status = 'pending'
GROUP BY match_status
ORDER BY match_status;
```

예상:

| match_status | count |
|---|---:|
| conflict | 244 |
| unmatched | 150 |

### 9.5 ProductMaster 불변

```sql
SELECT
  COALESCE(product_data_status, '(null)') AS product_data_status,
  COUNT(*)::int AS count
FROM product_masters
WHERE regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기')
   OR mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
GROUP BY COALESCE(product_data_status, '(null)')
ORDER BY count DESC;
```

예상: active 3,682 / review_required 144 유지.

---

## 10. Rollback / revert

archive 직후 문제가 확인되면 snapshot 기준으로 되돌린다.

```sql
UPDATE product_candidates pc
SET
  candidate_status = s.candidate_status,
  match_status = s.match_status,
  matched_product_master_id = s.matched_product_master_id,
  review_note = s.review_note,
  updated_at = NOW()
FROM product_candidate_cleanup_snapshots s
WHERE s.cleanup_key = 'medical_device_deleted_master_candidate_trace_archive_v1'
  AND s.product_candidate_id = pc.id;
```

주의:

- rollback은 archive 직후 제한적으로만 사용한다.
- 후속 WO가 같은 row를 처리한 뒤에는 별도 판단이 필요하다.
- snapshot 테이블은 삭제하지 않는다.

---

## 11. 산출물

필수:

1. `docs/checks/CHECK-O4O-MEDICAL-DEVICE-CANDIDATE-TRACE-ARCHIVE-APPLY-V1.md`

CHECK 포함 항목:

| 섹션 | 내용 |
|---|---|
| Sync result | `git fetch`, status, diverge count |
| Preflight counts | master/candidate/target count |
| Snapshot result | snapshot table/key/count |
| Approval record | 사용자 승인 문구와 시각 |
| Apply result | chunk size, chunk count, total archived |
| Post-apply verification | remaining 0, archived 15,776, pending 394 보존 |
| DB write scope | product_candidates archive only |
| Non-scope confirmation | ProductMaster/ProductIdentifier/pending/review_required 불변 |
| GitHub result | path, commit SHA, create/update, verification |

---

## 12. GitHub 반영 검증

문서 산출물은 로컬에만 두지 않는다.

필수:

```bash
git add docs/checks/CHECK-O4O-MEDICAL-DEVICE-CANDIDATE-TRACE-ARCHIVE-APPLY-V1.md
git commit -m "docs(o4o): add medical device candidate trace archive apply check"
git push origin main
git fetch origin main
git merge-base --is-ancestor HEAD origin/main
git cat-file -e origin/main:docs/checks/CHECK-O4O-MEDICAL-DEVICE-CANDIDATE-TRACE-ARCHIVE-APPLY-V1.md
git log --oneline -- docs/checks/CHECK-O4O-MEDICAL-DEVICE-CANDIDATE-TRACE-ARCHIVE-APPLY-V1.md
```

push가 권한 문제로 실패하면 GitHub API 또는 앱 경로로 create/update하고, GitHub fetch/read로 확인한다.

최종 보고에는 아래를 반드시 포함한다.

| 항목 |
|---|
| 저장 경로 |
| GitHub 반영 완료 여부 |
| commit SHA |
| create/update 여부 |
| git 검증 또는 GitHub fetch/read 검증 결과 |

---

## 13. 완료 기준

1. 대상 count가 15,776으로 재확인된다.
2. snapshot count가 대상 count와 일치한다.
3. 사용자 승인 후에만 write가 실행된다.
4. `product_candidates` 대상 row 15,776건이 `archived`로 변경된다.
5. 남은 `approved_new_master + matched_product_master_id IS NULL` 대상이 0건이다.
6. 현 master 연결 candidate 3,826건은 유지된다.
7. pending 394건은 이번 WO에서 변경되지 않는다.
8. ProductMaster 3,826건과 ProductIdentifier는 변경되지 않는다.
9. CHECK 문서가 GitHub `main`에 반영되고 검증된다.
