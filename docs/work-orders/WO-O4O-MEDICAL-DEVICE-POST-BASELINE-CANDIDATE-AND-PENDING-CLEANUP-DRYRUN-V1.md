# WO-O4O-MEDICAL-DEVICE-POST-BASELINE-CANDIDATE-AND-PENDING-CLEANUP-DRYRUN-V1

> 상태: READY / DRY-RUN ONLY
> 작성일: 2026-07-06
> 선행 완료:
> - `docs/checks/CHECK-O4O-MEDICAL-DEVICE-CURRENT-DB-BASELINE-V1.md`
> - `docs/checks/CHECK-O4O-MEDICAL-DEVICE-MINIMAL-FIELD-DRYRUN-V1.md`
> 기준 WO:
> - `docs/work-orders/WO-O4O-MEDICAL-DEVICE-CURRENT-DB-BASELINE-AND-MINIMAL-FIELD-DRYRUN-V1.md`

---

## 0. 작업 목적

의료기기 O4O 상품 DB baseline과 최소 필드 dry-run 결과, 현 시점에서 신규 `ProductMaster`/`ProductIdentifier` apply 대상은 없다.

남은 작업은 상품 DB 신규 적용이 아니라, 과거 의료기기 적재/정리 과정에서 남은 후보·pending·review 상태를 정리할지 판단하기 위한 **cleanup dry-run**이다.

이번 WO는 DB write 없이 다음 3가지를 read-only로 실측하고 정리안을 만든다.

1. 삭제된 의료기기 `ProductMaster` 15,776건에 대응하는 `ProductCandidate` 적재 흔적 정리 여부
2. UDI-DI가 없어 승격 불가한 pending 394건 처리 여부
3. 현재 잔존 `review_required` 144건을 유지할지, 별도 큐레이션으로 넘길지 판단

---

## 1. 선행 baseline 요약

선행 CHECK 결과를 기준으로 한다.

| 항목 | 값 |
|---|---:|
| 최초 의료기기 ProductMaster 승격 | 19,602 |
| hard delete 완료 | 15,776 |
| 현재 잔존 의료기기 ProductMaster | 3,826 |
| 잔존 active | 3,682 |
| 잔존 review_required | 144 |
| GTIN identifier | 3,826 |
| UDI_DI identifier | 3,826 |
| UDI-DI 중복 | 0 |
| barcode 유효성 | 전량 check-digit valid |
| 신규 apply 대상 | 0 |
| pending/skip 원천 | 394 |

중요:

- 삭제된 15,776건은 약국에서 판매되지 않을 의료기관/치과/전문가용 대상 정리 이력으로 본다.
- 삭제된 master를 되살리지 않는다.
- pending 394건은 UDI-DI가 없어 최소 필드 매핑으로는 승격 불가하다.
- review_required 144건은 상품 DB 적용 문제가 아니라 약국 유통 대상 여부 판단 문제다.

---

## 2. 이번 작업에서 하지 않는 것

| 금지 항목 | 이유 |
|---|---|
| `ProductMaster` 생성/수정/삭제 | 현재 apply 대상 0. 사용자 승인 전 write 금지 |
| `ProductIdentifier` 생성/수정/삭제 | 현재 3,826건 모두 완비 |
| `ProductCandidate` 삭제/상태 변경 | 이번 WO는 dry-run만 |
| pending 394건 실제 archive/delete | dry-run 후 사용자 승인 필요 |
| review_required 144건 active/delete 전환 | 별도 큐레이션/승인 필요 |
| 삭제된 15,776건 복구 | 약국 비유통 대상 정리 이력으로 유지 |
| 식약처 raw row 재수집 | 이번 범위 아님 |
| 설명서/QR/POP/태블릿 연결 | 후속 트랙 |

---

## 3. 산출물

필수 산출:

`docs/checks/CHECK-O4O-MEDICAL-DEVICE-POST-BASELINE-CANDIDATE-AND-PENDING-CLEANUP-DRYRUN-V1.md`

문서에는 다음을 포함한다.

| 섹션 | 내용 |
|---|---|
| Current baseline recap | 3,826 / 15,776 / 394 / 144 검산 |
| Candidate 흔적 실측 | 삭제된 master, active master, unmatched/pending candidate 분포 |
| Pending 394 분석 | UDI-DI 없음, match 불가 사유, source/status 분포 |
| Review_required 144 분석 | 등급/품목명/업체/식별자 분포, admin 검토 필요 여부 |
| Cleanup dry-run | wouldArchive/wouldKeep/wouldReview count |
| Apply gate | 사용자 승인 전 write 금지 및 승인 항목 |

---

## 4. Step 1 - 동기화 및 작업 트리 확인

먼저 최신 `origin/main` 기준으로 동기화한다.

```bash
git fetch origin main
git status --short
git rev-list --left-right --count origin/main...HEAD
```

주의:

- 작업 트리에 다른 진행 중 변경이 있으면 건드리지 않는다.
- 이 WO와 CHECK 문서만 path-specific으로 커밋한다.
- 동기화가 불가능하면 중단하고 사용자에게 보고한다.

---

## 5. Step 2 - Candidate 적재 흔적 실측

`product_candidates`가 의료기기 원천을 얼마나 가지고 있는지 read-only로 확인한다.

```sql
SELECT
  source_type,
  source_label,
  candidate_status,
  match_status,
  COUNT(*)::int AS count
FROM product_candidates
WHERE deleted_at IS NULL
  AND (
    source_label ILIKE '%MEDICAL%'
    OR source_label ILIKE '%DEVICE%'
    OR source_label ILIKE '%UDI%'
    OR source_label ILIKE '%의료%'
    OR raw_payload::text ILIKE '%UDIDI%'
    OR raw_payload::text ILIKE '%MDEQ%'
  )
GROUP BY source_type, source_label, candidate_status, match_status
ORDER BY count DESC;
```

후보와 master 연결 상태를 분리한다.

```sql
SELECT
  CASE
    WHEN matched_product_master_id IS NULL THEN 'unmatched'
    ELSE 'matched'
  END AS candidate_master_link,
  candidate_status,
  match_status,
  COUNT(*)::int AS count
FROM product_candidates
WHERE deleted_at IS NULL
  AND (
    source_label ILIKE '%MEDICAL%'
    OR source_label ILIKE '%DEVICE%'
    OR source_label ILIKE '%UDI%'
    OR source_label ILIKE '%의료%'
    OR raw_payload::text ILIKE '%UDIDI%'
    OR raw_payload::text ILIKE '%MDEQ%'
  )
GROUP BY candidate_master_link, candidate_status, match_status
ORDER BY candidate_master_link, candidate_status, match_status;
```

---

## 6. Step 3 - 삭제된 master 대응 candidate 흔적 확인

`product_masters`에는 `deleted_at`이 없고, 과거 삭제는 hard delete 이력으로 남아 있을 수 있다. 따라서 candidate가 가리키는 master id가 현재 존재하는지 확인한다.

```sql
SELECT
  CASE
    WHEN pc.matched_product_master_id IS NULL THEN 'no_matched_master_id'
    WHEN pm.id IS NULL THEN 'matched_master_missing_now'
    ELSE 'matched_master_exists'
  END AS matched_master_presence,
  pc.candidate_status,
  pc.match_status,
  COUNT(*)::int AS count
FROM product_candidates pc
LEFT JOIN product_masters pm ON pm.id = pc.matched_product_master_id
WHERE pc.deleted_at IS NULL
  AND (
    pc.source_label ILIKE '%MEDICAL%'
    OR pc.source_label ILIKE '%DEVICE%'
    OR pc.source_label ILIKE '%UDI%'
    OR pc.source_label ILIKE '%의료%'
    OR pc.raw_payload::text ILIKE '%UDIDI%'
    OR pc.raw_payload::text ILIKE '%MDEQ%'
  )
GROUP BY matched_master_presence, pc.candidate_status, pc.match_status
ORDER BY matched_master_presence, pc.candidate_status, pc.match_status;
```

판단:

| 상태 | 권장 dry-run 판단 |
|---|---|
| `matched_master_exists` | 유지 후보 |
| `matched_master_missing_now` | 삭제된 master 대응 흔적. archive 후보 |
| `no_matched_master_id` | pending/unmatched 분석 대상으로 이동 |

---

## 7. Step 4 - pending 394건 분석

선행 dry-run에서 pending/skip 394건은 UDI-DI가 없어 승격 불가로 판단되었다. 이를 현재 DB에서 재확인한다.

```sql
SELECT
  candidate_status,
  match_status,
  COUNT(*)::int AS count
FROM product_candidates
WHERE deleted_at IS NULL
  AND (
    source_label ILIKE '%MEDICAL%'
    OR source_label ILIKE '%DEVICE%'
    OR source_label ILIKE '%UDI%'
    OR source_label ILIKE '%의료%'
    OR raw_payload::text ILIKE '%UDIDI%'
    OR raw_payload::text ILIKE '%MDEQ%'
  )
  AND matched_product_master_id IS NULL
GROUP BY candidate_status, match_status
ORDER BY candidate_status, match_status;
```

UDI-DI 존재 여부를 확인한다. 실제 raw key 이름은 기존 payload를 먼저 샘플링해 확인한 뒤 보정한다.

```sql
SELECT
  CASE
    WHEN raw_payload::text ILIKE '%UDIDI%' THEN 'has_udi_signal'
    ELSE 'no_udi_signal'
  END AS udi_signal,
  candidate_status,
  match_status,
  COUNT(*)::int AS count
FROM product_candidates
WHERE deleted_at IS NULL
  AND (
    source_label ILIKE '%MEDICAL%'
    OR source_label ILIKE '%DEVICE%'
    OR source_label ILIKE '%UDI%'
    OR source_label ILIKE '%의료%'
    OR raw_payload::text ILIKE '%MDEQ%'
  )
  AND matched_product_master_id IS NULL
GROUP BY udi_signal, candidate_status, match_status
ORDER BY udi_signal, candidate_status, match_status;
```

샘플:

```sql
SELECT
  id,
  source_type,
  source_label,
  candidate_status,
  match_status,
  candidate_name,
  candidate_manufacturer,
  identifier_type,
  identifier_value,
  normalized_identifier_value,
  raw_payload
FROM product_candidates
WHERE deleted_at IS NULL
  AND (
    source_label ILIKE '%MEDICAL%'
    OR source_label ILIKE '%DEVICE%'
    OR source_label ILIKE '%UDI%'
    OR source_label ILIKE '%의료%'
    OR raw_payload::text ILIKE '%MDEQ%'
  )
  AND matched_product_master_id IS NULL
ORDER BY updated_at DESC
LIMIT 50;
```

권장 판단:

| 조건 | dry-run 결과 |
|---|---|
| UDI-DI 없음 + matched master 없음 | `wouldArchiveNoUdi` |
| source row는 있으나 상품 grain 불명확 | `wouldKeepReviewOnly` |
| 이미 master/identifier가 존재 | `wouldLinkOrIgnore` 후보. 단, 이번 WO에서는 write 금지 |

---

## 8. Step 5 - review_required 144건 분석

현재 `ProductMaster` 144건은 최소 필드와 identifier가 완비되어 있으므로 삭제/적용 문제가 아니다. 약국 유통 대상인지 애매한 잔존 상품이다.

분포 확인:

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

review_required 샘플:

```sql
SELECT
  id,
  barcode,
  name,
  regulatory_name,
  manufacturer_name,
  specification,
  product_data_status,
  product_data_curation_reason,
  mfds_product_id
FROM product_masters
WHERE (
    regulatory_type IN ('MEDICAL_DEVICE', 'medical_device', '의료기기')
    OR mfds_product_id LIKE 'MFDS:MEDICAL_DEVICE:%'
  )
  AND product_data_status = 'review_required'
ORDER BY name, manufacturer_name
LIMIT 144;
```

권장 판단:

| 조건 | 처리 |
|---|---|
| 명백히 약국/소비자 유통 가능 | 후속 큐레이션에서 active 후보 |
| 명백히 의료기관/치과/전문가용 | 후속 큐레이션에서 delete/archive 후보 |
| 애매함 | review_required 유지 |

이번 WO에서는 144건을 실제로 변경하지 않는다.

---

## 9. Step 6 - cleanup dry-run 결과표

CHECK에는 아래 지표를 반드시 기록한다.

| 지표 | 설명 |
|---|---|
| currentMedicalDeviceMasters | 현재 의료기기 ProductMaster |
| activeMasters | active 수 |
| reviewRequiredMasters | review_required 수 |
| candidateMedicalDeviceTotal | 의료기기 candidate 흔적 전체 |
| candidatesMatchedExistingMaster | 현재 master와 연결된 candidate |
| candidatesMatchedMissingMaster | 삭제된 master를 가리키는 candidate |
| candidatesUnmatched | matched master 없는 candidate |
| pendingNoUdi | UDI-DI 없어 승격 불가 |
| wouldArchiveCandidateTrace | 삭제된 master 대응 candidate archive 후보 |
| wouldArchivePendingNoUdi | UDI-DI 없는 pending archive 후보 |
| wouldKeepCandidate | 유지 후보 |
| wouldKeepReviewRequired | review_required 유지 후보 |
| requiresUserDecision | 사용자 판단 필요한 항목 |

---

## 10. 사용자 승인 게이트

이번 WO는 dry-run만 한다. 아래 중 어느 것도 실행하지 않는다.

- `UPDATE product_candidates`
- `UPDATE product_masters`
- `DELETE FROM product_candidates`
- `DELETE FROM product_masters`
- migration 생성/실행
- product_data_status 변경
- representative link 변경

실제 cleanup을 하려면 별도 WO를 만든다.

권장 후속 WO 후보:

| 후속 WO | 목적 |
|---|---|
| `WO-O4O-MEDICAL-DEVICE-CANDIDATE-TRACE-ARCHIVE-APPLY-V1` | 삭제된 master 대응 candidate 흔적 archive |
| `WO-O4O-MEDICAL-DEVICE-PENDING-NO-UDI-ARCHIVE-APPLY-V1` | UDI-DI 없는 pending 394건 archive |
| `WO-O4O-MEDICAL-DEVICE-REVIEW-REQUIRED-144-CURATION-V1` | 144건 약국 유통 가능성 큐레이션 |

---

## 11. 완료 기준

1. 의료기기 candidate 흔적 전체 수가 확인된다.
2. 현재 master와 연결된 candidate, 삭제된 master를 가리키는 candidate, unmatched candidate가 분리된다.
3. pending 394건의 UDI-DI 결측/승격 불가 상태가 재확인된다.
4. review_required 144건은 상품 DB 적용 문제가 아니라 큐레이션 문제로 분리된다.
5. cleanup apply 여부를 판단할 수 있는 dry-run count와 샘플이 문서화된다.
6. DB write/apply/migration은 0건이다.
