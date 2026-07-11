# WO-O4O-ADMIN-PRODUCT-DB-MAINTENANCE-CANCELLED-DRUG-PENDING-ARCHIVE-V1

> 데이터 정비 메뉴 두 번째 기능. 드럭 트랙 pending 중 **허가취소 의약품 74,680건**을 archived 로 정합화.
> 승격 아님(승격 대상 0). 고아 정합화와 동일 패턴(dry-run + confirmation + expectedCount 가드 + 청크 update).
>
> - 근거 IR: `docs/investigations/IR-O4O-DRUG-PENDING-CANDIDATE-COHORT-AUDIT-V1`
> - 재사용 기반: `CHECK-...-ORPHAN-CANDIDATE-ARCHIVE-APPLY-V1` (동형 job)
> - 작성일: 2026-07-11 · 상태: **코드 구현 → apply 는 사용자 승인 후**

---

## 1. 배경

IR 조사 결과, 드럭 pending 74,681건의 정체가 확정됐다.

| 코호트 | 수량 | 승격 |
|---|---:|:--:|
| 취소(cancelled, 취소일자 존재) | **74,680** | ❌ |
| GTIN 체크디짓 불일치(비취소) | 1 | ❌ |
| 승격 가능(eligible) | **0** | — |

이 pending 은 "미등록 후보"가 아니라 **허가취소된 의약품**이며, 승격 엔진이 `skipReason='cancelled'` 로
제외해 pending 으로 남았다. 따라서 다음은 승격이 아니라 **정합화(archived)**.

## 2. 목적

정비 카드 "취소 의약품 pending 후보 정합화" 추가. 취소 의약품 pending 74,680 을 dry-run 확인 후,
사용자 명시 승인으로 archived 전환. **ProductMaster/ProductIdentifier 미변경, hard delete 없음.**

## 3. 대상 정의

```sql
candidate_status = 'pending'
AND deleted_at IS NULL
AND source_label LIKE 'mfds-drug-master-standard-code%'
AND (raw_payload->>'isCancelled' = 'true' OR raw_payload->'source'->>'취소일자' IS NOT NULL)
```

- 예상 대상: **74,680**. 전환: `pending → archived`.
- 제외: 비취소 1건(체크디짓 불일치, pending 유지·수동 확인), archived/rejected/matched/approved_new_master,
  HFF/의약외품/의료기기/e약은요/store/operator 후보.

## 4. 구현 (기존 패턴 재사용)

기존 `product-db-maintenance.controller.ts` 의 orphan job 과 동형 job 추가. 엔진 신설 없음.

- 엔드포인트:
  - `POST /api/v1/admin/o4o-product-db/maintenance/jobs/cancelled-drug-pending-candidates/dry-run` (write 0)
  - `POST /api/v1/admin/o4o-product-db/maintenance/jobs/cancelled-drug-pending-candidates/apply`
- guard: `authenticate` + `requireRole(ADMIN_ROLES)`.
- dry-run 응답: 기존 orphan dry-run 과 동일 shape(targetCount / byStatus / bySourceLabel / proposedChange /
  samples / warnings / applyEligible / applyEnabled / confirmationPhrase).
- apply 게이트:
  1. `confirmation === 'ARCHIVE_CANCELLED_DRUG_PENDING_CANDIDATES'` 아니면 400
  2. 대상이 전부 취소·드럭·pending 인지 재검증(비취소/비드럭 감지 시 409)
  3. `expectedCount !== currentCount` → 409
- apply 실행: migration 아님 — 청크 update(2,000/txn). UPDATE where 에 대상 필터 전체 재적용,
  `candidate_status='archived'` + `reviewed_at=NOW()` + `review_note='cancelled-drug-archive:WO-...'` 만 set.
  idempotent(archived 된 행은 대상에서 제외).

## 5. 프론트

`/admin/o4o-product-db/maintenance` 에 카드 추가: "취소 의약품 pending 후보 정합화".
- Dry-run 실행 → 대상 수/상태·source_label 분포/샘플/예상변경 표시.
- 확인 문구 정확 입력 시에만 Apply 활성. (기존 orphan 카드와 동일 UX — 재사용 컴포넌트.)

## 6. 하지 말 것

```text
ProductMaster/ProductIdentifier 생성·수정 금지
ProductCandidate hard delete 금지
비취소 1건 / 체크디짓 불일치 1건 변경 금지
HFF/의약외품/의료기기/e약은요 후보 변경 금지
승격/bulk promotion 구현 금지
migration 금지 · Cloud Run Job 금지
raw_payload 임의 경로 재계산 금지(취소일자/isCancelled 만)
```

## 7. 사후 검증 SQL (apply 후, read-only)

```sql
-- A. 취소 pending 잔량 0
SELECT COUNT(*) FROM product_candidates
WHERE deleted_at IS NULL AND candidate_status='pending'
  AND source_label LIKE 'mfds-drug-master-standard-code%'
  AND (raw_payload->>'isCancelled'='true' OR raw_payload->'source'->>'취소일자' IS NOT NULL);  -- 기대 0

-- B. archived 증가 +74,680 (apply 전후 비교)
-- C. 드럭 pending 잔량 1 (비취소 체크디짓 불일치 1건 유지)
SELECT COUNT(*) FROM product_candidates
WHERE deleted_at IS NULL AND candidate_status='pending' AND source_label LIKE 'mfds-drug-master-standard-code%';  -- 기대 1

-- E. ProductMaster 총량 불변
SELECT regulatory_type, COUNT(*) FROM product_masters GROUP BY regulatory_type;
-- F. ProductIdentifier active 총량 불변
SELECT COUNT(*) FROM product_identifiers WHERE deleted_at IS NULL;   -- 기대 621,280 불변
-- G. 후보 총량 불변 (hard delete 0)
```

## 8. 완료 기준

```text
dry-run 구현 · targetCount 74,680 확인
apply confirmation(ARCHIVE_CANCELLED_DRUG_PENDING_CANDIDATES) 게이트 구현
청크 update · candidate_status 만 변경
typecheck PASS
gate smoke(Apply 미클릭) 확인
CHECK 문서 작성 · commit/push
--- 이후 사용자 승인 시 ---
apply 실행 · 사후검증 A~G · CHECK 갱신
```

## 9. 실행 순서 (승인 게이트)

```text
1) WO 문서 (본 문서)
2) dry-run/apply 코드 구현 (실행 안 함)
3) 배포 → dry-run 실환경 재확인(74,680) + gate smoke(Apply 미클릭)
4) 사용자 명시 승인 (confirmation 입력)
5) apply 실행 (청크)
6) 사후검증 A~G + CHECK 갱신
```

---

*Status: 설계+구현 대상 · apply 는 사용자 승인 후 · DB write(apply 경로 한정) · migration 0.*
