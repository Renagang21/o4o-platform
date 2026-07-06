# CHECK-O4O-MEDICAL-DEVICE-CANDIDATE-TRACE-ARCHIVE-APPLY-V1

> 상태: DONE / APPLY 완료 (사용자 승인 후 write)
> 실행일: 2026-07-06
> 실행 WO: `docs/work-orders/WO-O4O-MEDICAL-DEVICE-CANDIDATE-TRACE-ARCHIVE-APPLY-V1.md`
> 선행:
> - `docs/work-orders/WO-O4O-MEDICAL-DEVICE-POST-BASELINE-CANDIDATE-AND-PENDING-CLEANUP-DRYRUN-V1.md`
> - `docs/checks/CHECK-O4O-MEDICAL-DEVICE-POST-BASELINE-CANDIDATE-AND-PENDING-CLEANUP-DRYRUN-V1.md`
> 검증 채널: Cloud SQL Auth Proxy v2 (127.0.0.1:5433) → psql (`o4o_platform`), `gcloud auth print-access-token`

---

## 0. 결론 요약

삭제된 의료기기 `ProductMaster` 15,776건에 대응하는 `product_candidates` 흔적(`approved_new_master` + `matched_product_master_id IS NULL`)을 snapshot 후 chunk 단위로 **`candidate_status='archived'`** 처리 완료. ProductMaster/ProductIdentifier/pending 394/review_required 144는 전부 불변.

| 지표 | 값 |
|---|---:|
| archive 대상(target) | 15,776 |
| snapshot count | 15,776 |
| archived 완료 | **15,776** |
| 남은 대상 | **0** |
| 유지 candidate(master 연결) | 3,826 (불변) |
| pending 보존 | 244 + 150 = 394 (불변) |
| ProductMaster | active 3,682 / review_required 144 (불변) |
| DB write 범위 | `product_candidates` archive UPDATE only + snapshot 테이블 신규 |

---

## 1. Sync result (§3)

작업 시작 전 및 종료 시 `origin/main` 동기화 확인.

| 시점 | 명령 | 결과 |
|---|---|---|
| 시작 | `git fetch origin main` | OK |
| 시작 | `git rev-list --left-right --count origin/main...HEAD` | `0 0` (동기) |
| 종료 | `git status --short` | `M docs/guides/...GUIDE-V1.md`(병렬 drug 세션) · `M pnpm-lock.yaml` · `?? bin/` — 본 WO와 무관, 미변경 |

- 다른 세션의 미커밋 변경(가이드/pnpm-lock/bin)은 건드리지 않음.
- 본 WO 산출물(CHECK 문서)만 path-specific 커밋.

---

## 2. Preflight counts (§5)

프로덕션 read-only 재검증. 선행 dry-run CHECK와 완전 일치.

### 2.1 master baseline

| product_data_status | count |
|---|---:|
| active | 3,682 |
| review_required | 144 |
| 합계 | 3,826 |

### 2.2 candidate 전체 상태

| candidate_status | match_status | master_link | count |
|---|---|---|---:|
| approved_new_master | unmatched | has_master_link | 3,826 |
| approved_new_master | unmatched | no_master_link | **15,776** |
| pending | conflict | no_master_link | 244 |
| pending | unmatched | no_master_link | 150 |

### 2.3 archive target count

`deleted_at IS NULL AND source_type='external_api' AND source_label='MFDS_MEDICAL_DEVICE_STANDARD_CODE' AND candidate_status='approved_new_master' AND matched_product_master_id IS NULL` → **target_count = 15,776**

### 2.4 대상 샘플

| candidate_name | manufacturer | status | match |
|---|---|---|---|
| 경피 카테터 | (주)쓰리에이엠 | approved_new_master | unmatched |
| 치과용 임플란트 상부구조물 | (주)코비젼 | approved_new_master | unmatched |
| 일회용 발조절식 전기 수술기용 전극 | (주)더블에스메디칼 | approved_new_master | unmatched |
| 절삭 가공용 치과도재 | (주)바텍엠시스 | approved_new_master | unmatched |
| 카테터 삽입기 | (주)쓰리에이엠 | approved_new_master | unmatched |

→ 전량 의료기관/치과/전문가용(약국 비유통). 삭제된 master의 흔적임이 확인됨. (preflight 시점 snapshot 테이블 부재 확인 = 최초 생성)

---

## 3. Snapshot result (§6)

| 항목 | 값 |
|---|---|
| 테이블 | `product_candidate_cleanup_snapshots` (신규 생성, `CREATE TABLE IF NOT EXISTS`) |
| index | `idx_pccs_key_candidate (cleanup_key, product_candidate_id)` |
| cleanup_key | `medical_device_deleted_master_candidate_trace_archive_v1` |
| insert 결과 | `INSERT 0 15776` |
| **snapshot_count** | **15,776** |
| 보존 필드 | id, source_type/label, candidate_status, match_status, matched_product_master_id, candidate_name/manufacturer/spec, review_note, raw_payload, snapshot_payload(reason/expectedTargetCount/wo) |
| 차단 게이트 | `snapshot_count(15,776) == target_count(15,776)` → 통과 |

> snapshot insert는 `NOT EXISTS` 가드로 재실행 시 중복 방지. rollback 대비 snapshot 테이블은 미삭제.

---

## 4. Approval record (§7)

| 항목 | 값 |
|---|---|
| 승인 방식 | 세션 내 명시적 승인 (AskUserQuestion) |
| 승인일 | 2026-07-06 |
| 승인 응답 | "승인 — 계획대로 진행" |
| 승인 범위 | 의료기기 삭제-master 대응 candidate 흔적 15,776건 snapshot 후 chunk 단위 archived 처리. ProductMaster/ProductIdentifier 변경 없음, pending 394 및 review_required 144 제외 |

보고 후 승인 항목: 현재 master count(3,826) / candidate 분포 / target count(15,776) / snapshot 계획 / archive 방식(soft archive) / chunk 2,000 / rollback(snapshot revert) / post-apply 검증 SQL.

---

## 5. Apply result (§8)

archive 방식: **hard delete 아님.** `candidate_status='archived'` + `review_note` append(cleanup key/사유) + `reviewed_at=NOW()` + `updated_at=NOW()`. snapshot JOIN으로 snapshot된 row만 대상.

실행 채널: Cloud SQL Proxy 직접 psql **chunk 실행** (TypeORM 마이그레이션 아님 — startup-probe 초과/live 테이블 락 경합 회피, `reference_large_delete_migration_limit` 교훈 적용). 각 chunk = 독립 트랜잭션, `statement_timeout=300s` / `lock_timeout=20s`.

| chunk | archived |
|---|---:|
| 1 | 2,000 |
| 2 | 2,000 |
| 3 | 2,000 |
| 4 | 2,000 |
| 5 | 2,000 |
| 6 | 2,000 |
| 7 | 2,000 |
| 8 | 1,776 |
| 9 | 0 (수렴) |
| **합계** | **15,776** |

> 참고: 최초 apply 시도는 proxy 연결 순단(Connection refused)으로 0건 처리(무변경)되어, proxy 재기동 후 재실행. archive 필터가 `approved_new_master + no master link`로 수렴형이라 재실행 안전(이미 archived된 row는 자동 제외).

---

## 6. Post-apply verification (§9)

| 검증 | 쿼리 | 결과 | 예상 |
|---|---|---:|---:|
| 9.1 remaining target | approved_new_master + no master link | **0** | 0 ✅ |
| 9.2 archived count | archived + review_note ILIKE key | **15,776** | 15,776 ✅ |
| 9.3 유지 candidate | approved_new_master + has master link | **3,826** | 3,826 ✅ |
| 9.4 pending 보존 | pending conflict / unmatched | **244 / 150** | 244 / 150 ✅ |
| 9.5 ProductMaster 불변 | active / review_required | **3,682 / 144** | 3,682 / 144 ✅ |

### 9.6 최종 candidate 분포

| candidate_status | match_status | master_link | count |
|---|---|---|---:|
| approved_new_master | unmatched | has_master_link | 3,826 |
| archived | unmatched | no_master_link | **15,776** |
| pending | conflict | no_master_link | 244 |
| pending | unmatched | no_master_link | 150 |

---

## 7. DB write scope

| 대상 | 작업 |
|---|---|
| `product_candidate_cleanup_snapshots` | 신규 테이블 생성 + 15,776 snapshot insert |
| `product_candidates` | 15,776 row `candidate_status` → `archived` (soft archive UPDATE) |

그 외 write 없음.

## 8. Non-scope confirmation

| 항목 | 상태 |
|---|---|
| ProductMaster 생성/수정/삭제 | 없음 (active 3,682 / review 144 불변) |
| ProductIdentifier 생성/수정/삭제 | 없음 |
| 삭제된 15,776 master 복구 | 없음 |
| pending 394 archive | 없음 (244+150 보존) |
| review_required 144 큐레이션 | 없음 |
| 식약처 raw 재수집 / 설명서 / admin UI | 없음 |
| 단일 대형 트랜잭션 | 사용 안 함 (2,000/chunk) |
| snapshot 없는 write | 없음 |

---

## 9. Rollback 준비 (§10)

archive 직후 문제 시 snapshot 기준 revert 가능:

```sql
UPDATE product_candidates pc
SET candidate_status=s.candidate_status, match_status=s.match_status,
    matched_product_master_id=s.matched_product_master_id, review_note=s.review_note, updated_at=NOW()
FROM product_candidate_cleanup_snapshots s
WHERE s.cleanup_key='medical_device_deleted_master_candidate_trace_archive_v1'
  AND s.product_candidate_id=pc.id;
```

snapshot 테이블 미삭제. 후속 WO가 동일 row 처리 시 별도 판단 필요.

---

## 10. GitHub result (§12)

| 항목 | 값 |
|---|---|
| 저장 경로 | `docs/checks/CHECK-O4O-MEDICAL-DEVICE-CANDIDATE-TRACE-ARCHIVE-APPLY-V1.md` |
| create/update | create (신규) |
| commit SHA | (아래 커밋 로그 참조) |
| 반영 검증 | `git merge-base --is-ancestor HEAD origin/main` + `git cat-file -e origin/main:<path>` + `git log --oneline -- <path>` |

> 커밋/푸시 및 git 검증 결과는 본 문서 반영 커밋에 기록한다.

---

## 11. 완료 기준 대조 (§13)

| 완료 기준 | 결과 |
|---|---|
| 1. target 15,776 재확인 | ✅ |
| 2. snapshot count == target | ✅ 15,776 |
| 3. 사용자 승인 후 write | ✅ |
| 4. 15,776건 archived 변경 | ✅ |
| 5. 남은 대상 0건 | ✅ |
| 6. master 연결 candidate 3,826 유지 | ✅ |
| 7. pending 394 불변 | ✅ |
| 8. ProductMaster 3,826 / ProductIdentifier 불변 | ✅ |
| 9. CHECK 문서 GitHub main 반영·검증 | 본 커밋에서 수행 |
