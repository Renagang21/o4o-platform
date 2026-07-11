# WO-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-ORPHAN-CANDIDATE-ARCHIVE-APPLY-V1

> **문서 전용 WO (설계).** 이번 요청에서는 **apply 를 실행하지 않는다.** apply 절차·가드·검증을 설계하고,
> 실제 실행은 사용자 명시 승인(confirmation) 후 별도 단계에서 수행한다.
>
> - 선행 IR: `docs/investigations/IR-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-REGISTER-MISSING-CANDIDATES-AUDIT-V1`
> - 선행 CHECK(완료): `docs/checks/CHECK-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-ORPHAN-CANDIDATE-ARCHIVE-DRYRUN-V1` (dry-run 구현 + browser smoke PASS)
> - 작성일: 2026-07-11 · 상태: **설계 (apply 미실행)**

---

## 1. 목표

dry-run 으로 확인된 **등록 완료 고아 후보 53,428건**을, 사용자 명시 승인 후 `candidate_status = 'archived'`
로 전환하는 apply 절차를 설계한다. 이 후보들은 미등록 후보가 아니라, 승격 후 대응 ProductMaster 가
정책적으로 삭제되어 링크만 끊긴 잔재이므로, **일반 등록/검토 대상에서 분리 보관**한다.

## 2. 배경 (확정된 사실)

- 드럭 승격이 ProductMaster 230,841건 생성 → `drug_unspecified` 정리에서 53,428 master 삭제.
- `product_candidates.matched_product_master_id` 는 `ON DELETE SET NULL` → master 삭제 시 링크만 NULL,
  `candidate_status` 는 `approved_new_master` / `matched` 로 잔존.
- 교차검증: 현재 DRUG master 177,413 = 230,841 − 53,428 (정확 일치).
- **위험:** 고아가 남아 있으면 "master 없음" 기준의 모든 후속 정비/등록 기능에서 오분류(재승격 → 삭제 상품 부활) 위험이 지속된다. → 등록 기능보다 **이 정합화가 먼저**다.

## 3. 대상 정의 (dry-run 과 동일 집합)

```sql
candidate_status IN ('approved_new_master', 'matched')
AND matched_product_master_id IS NULL
AND deleted_at IS NULL
-- 추가 안전: source_label LIKE 'mfds-drug-master-standard-code%' (드럭 트랙 단일 확인됨)
```

전환: `approved_new_master` / `matched` → **`archived`** (rejected 아님 — §11 근거).

dry-run 실측(browser smoke, 2026-07-11 프로덕션):
targetCount **53,428** = approved_new_master **53,209** + matched **219**,
sourceLabel `mfds-drug-master-standard-code_2025-10-31` **단일**, nonDrug 0, warnings 없음.

## 4. apply 사전 가드 (실행 직전, 순서대로 — 하나라도 불일치 시 중단)

1. **dry-run 재실행** (기존 엔드포인트 `POST .../maintenance/jobs/orphan-registered-candidates/dry-run`).
2. `targetCount == 53,428` 확인. (드리프트 시 §9 — **자동 apply 금지**, 재조사.)
3. `byStatus` = approved_new_master 53,209 / matched 219 확인.
4. `bySourceLabel` = `mfds-drug-master-standard-code_2025-10-31` **단일** 확인.
5. `nonDrugCount == 0` 확인 (드럭 외 트랙 미포함).
6. pending / HFF / 의약외품 / 의료기기 / e약은요 **포함 0** 확인.
7. **confirmation 문구** 요구: `ARCHIVE_ORPHAN_REGISTERED_CANDIDATES` (정확 일치해야 apply 진행).
8. **apply 직전 재검증 count** 가 dry-run count 와 일치하는지 확인(경합 가드).

## 5. apply 실행 방식 (⚠️ migration 금지 — 청크 update)

> `reference_large_delete_migration_limit`: 1만건+ 대량 UPDATE 를 TypeORM 단일 트랜잭션 migration 으로
> 하면 GRACEFUL_STARTUP async 실행 + startup probe 초과로 인스턴스 재기동/라이브 테이블 락 경합.
> → **migration 아님.** admin API 트리거 + count-driven 청크 update.

설계:

- **엔드포인트(신규):** `POST /api/v1/admin/o4o-product-db/maintenance/jobs/orphan-registered-candidates/apply`
  - body: `{ confirmation: 'ARCHIVE_ORPHAN_REGISTERED_CANDIDATES', expectedCount: 53428 }`
  - guard: `authenticate` + `requireRole(ADMIN_ROLES)` (dry-run 컨트롤러와 동일 롤셋).
- **청크 update:** 2,000~3,000건/트랜잭션, count-driven 루프. 각 청크는 대상 필터를 다시 적용해
  `UPDATE product_candidates SET candidate_status='archived', reviewed_at=NOW() ... WHERE id IN (:...chunkIds)`
  형태(파라미터 바인딩, string interpolation 금지). 대상 id 는 청크마다 `SELECT ... LIMIT n` 로 재조회.
- **감사/추적:** `review_note` 또는 audit 가능한 필드에 배치 사유 기록(예: `orphan-archive:WO-...-APPLY-V1`).
  candidate 물리 컬럼 범위에서 기록 가능 여부는 구현 시 재확인(reviewNote 활용 우선).
- **응답:** `{ mode:'apply', requested, updated, chunks, elapsedMs, warnings }`.
- **부분 실패 복구:** 청크 단위 커밋이므로 중단 시 재실행하면 남은 대상만 처리(idempotent — 이미 archived 된 건은 대상 필터에서 자동 제외).

## 6. apply 후 사후 검증 SQL (read-only)

```sql
-- A. 고아 잔량 0 확인 (등록 완료인데 master 없음 = 0 이어야 함)
SELECT candidate_status, COUNT(*)
FROM product_candidates
WHERE deleted_at IS NULL
  AND candidate_status IN ('approved_new_master','matched')
  AND matched_product_master_id IS NULL
GROUP BY candidate_status;   -- 기대: 0 rows

-- B. archived 증가분 확인 (드럭 트랙)
SELECT source_label, candidate_status, COUNT(*)
FROM product_candidates
WHERE deleted_at IS NULL
  AND candidate_status = 'archived'
  AND source_label = 'mfds-drug-master-standard-code_2025-10-31'
GROUP BY source_label, candidate_status;   -- 기대: 기존 + 53,428

-- C. 역방향 오염 없음 (등록 완료인데 master 보유하는 정상 건은 불변)
SELECT COUNT(*) FROM product_candidates
WHERE deleted_at IS NULL
  AND candidate_status IN ('approved_new_master','matched')
  AND matched_product_master_id IS NOT NULL;   -- apply 전후 동일해야 함

-- D. ProductMaster / ProductIdentifier 총량 불변 확인 (변경 0)
SELECT regulatory_type, COUNT(*) FROM product_masters GROUP BY regulatory_type;
SELECT COUNT(*) FROM product_identifiers WHERE deleted_at IS NULL;
```

## 7. 검증 항목 (apply WO 구현 시)

```text
dry-run 재실행 targetCount 53,428 일치
byStatus 53,209 / 219 일치
sourceLabel 단일 확인
pending / 타 트랙 포함 0
confirmation 문구 검증 동작
청크 update 정상 (2~3천/txn)
apply 후 고아 잔량 0 (사후검증 A)
archived 증가분 = 53,428 (사후검증 B)
정상 등록완료 건 불변 (사후검증 C)
ProductMaster/ProductIdentifier 총량 불변 (사후검증 D)
프론트 Apply 버튼 활성화(정책 승인 반영) + 실행 후 결과 표시
browser smoke (apply 실행 후 dry-run 재실행 시 targetCount 0)
```

## 8. 하지 말 것

```text
migration 으로 대량 UPDATE 금지 (청크 admin API 만)
ProductMaster 생성/삭제/수정 금지
ProductIdentifier 생성/삭제/수정 금지
ProductCandidate hard delete 금지 (상태 전환만)
pending / rejected / archived / 타 트랙 후보 변경 금지
드럭 pending 74,681 승격/변경 금지 (별도 트랙)
confirmation 없이 apply 금지
expectedCount 불일치 시 자동 진행 금지
이번 요청(본 WO 작성)에서 apply 실행 금지
```

## 9. 중단/드리프트 기준

```text
targetCount 가 53,428 과 다름 → 자동 apply 금지, 원인 조사(신규 승격/삭제/병렬 세션 여부)
드럭 외 sourceLabel 감지 → 중단
pending 이 대상에 포함 → 중단 (대상 필터 버그 의심)
apply 직전 재검증 count ≠ dry-run count → 경합, 중단 후 재실행
청크 update 중 반복 실패 → 중단, 부분 진행분은 idempotent 재실행으로 수습
```

## 10. 실행 순서 (승인 게이트)

```text
1) 본 WO 문서 리뷰 (현재 단계 — 문서만)
2) apply 엔드포인트 + 청크 로직 구현 (코드, 아직 실행 안 함)
3) dry-run 재실행 → 가드 §4 전부 통과 확인
4) 사용자 명시 승인 (confirmation 문구 입력)
5) apply 실행 (청크)
6) 사후 검증 §6 A~D
7) CHECK 문서 기록 + push
```

## 11. archived 선택 근거 (rejected 아님)

이 후보들은 잘못된 공공데이터라 반려된 게 아니라, 한때 정상 승격됐다가 대응 master 가 정책적으로
삭제된 잔재다. 의미는 "이미 처리됐으나 대응 master 제거로 일반 등록/검토 대상에서 **제외 보관**".
`archived` 는 이미 후보 UI 의 확립된 종결 상태(`bulk-action` archive, grouped-status "제외" 버킷)이며
등록 전/완료 뷰에서 자연 제외된다. 부작용 없음.

## 12. 다음 (본 WO 이후)

```text
1. (본 WO) 고아 53,428 archived apply
2. 드럭 pending 74,681 코호트 분석 (취소/무효/drug_unspecified/신규)
3. 그 다음에야 드럭 한정 bulk 승격 dry-run 검토
```

---

*Status: 설계 문서 · apply 미실행 · 코드 변경 0 · DB write 0.*
