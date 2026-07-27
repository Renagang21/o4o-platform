# 트랜잭션 전략 (Per-Master Savepoint) — 잔여 3,809 제품별 생산

**WO**: WO-O4O-OTC-EASY-DRUG-REMAINING-3809-MASTER-BY-MASTER-PRODUCTION-QUEUE-AND-EXCEPTION-HANDOFF-DESIGN-V1
**Agent**: 라 (설계 세션 — READ-ONLY, DB write 0)

> 본 문서는 후속 **생산 세션(agent-ga)**이 따를 트랜잭션 계약이다. 본 세션은 write를 수행하지 않는다.

---

## 1. 핵심 불변식

1. **basic content unit = 1 master.** 한 master의 실패가 배치를 중단시키지 않는다 (failure isolation).
2. **single write owner = agent-ga.** agent-na/agent-da는 DB write 0.
3. **제품별 원문 grounding.** 각 master는 자기 e약은요 공식 원문만 근거로 한다. 그룹 대표 대체 금지.
4. **sourceRef = `otc-v4-master-leaflet:<masterId>`** (uuid = md5). master마다 유일.
5. **DB 반영은 승인된 WO 범위에서 dry-run·이중게이트·독립검증·rollback 계약 통과 후** (CLAUDE.md 콘텐츠 불변원칙). 본 설계 세션은 이 전제만 명시하고 실행하지 않는다.

---

## 2. 배치 트랜잭션 모델 — savepoint per master

배치 하나(예: pilot 100)를 **단일 트랜잭션**으로 열되, master마다 `SAVEPOINT`를 설정한다. 한 master 실패는 그 master의 savepoint까지만 rollback하고 배치 전체는 유지한다.

```sql
BEGIN;
  -- master 1
  SAVEPOINT m_1;
    -- ko canonical upsert (source_ref_id = uuid(otc-v4-master-leaflet:<masterId>))
    -- en canonical upsert (ko canonical 선행 필수 — 없으면 HELD, savepoint 유지)
  -- 성공: RELEASE SAVEPOINT m_1  /  실패: ROLLBACK TO SAVEPOINT m_1 → 예외 큐(나) handoff, DB 무변경
  ...
  SAVEPOINT m_100;
    ...
COMMIT;   -- 배치 종료 시 1회. 부분 실패 master는 이미 savepoint rollback되어 미반영.
```

### 2.1 per-master outcome (batchExecutionLedger.perMaster)
| outcome | 의미 | DB 효과 |
|---------|------|---------|
| `CREATED` | ko(+en) canonical 생성 성공 | RELEASE SAVEPOINT |
| `SKIPPED` | 이미 canonical 존재(멱등) | 무변경 |
| `HANDED_OFF_NA` | 처리 중 EXCEPTION_* 발생 | ROLLBACK TO SAVEPOINT + 나 handoff |
| `FAILED` | 예기치 못한 오류 | ROLLBACK TO SAVEPOINT + 재시도 큐 |

> **대안(스크립트 단순화용)**: 배치를 열지 않고 master마다 독립 트랜잭션(`BEGIN;…;COMMIT`)을 사용해도 불변식은 동일하게 성립한다. savepoint 모델은 배치 원자성 리포팅이 필요할 때 선택한다. 어느 쪽이든 **한 master 실패 → 그 master만 무반영, 배치 계속**이 계약이다.

---

## 3. 멱등성 (idempotency)

- upsert 키 = `(master_id, source_type='mfds_easy_drug', description_type='STORE', COALESCE(language,'ko'), status='canonical')` — SPD canonical 유일성(언어별).
- `source_ref_id` = V4 uuid. 재실행 시 동일 sourceRef → 중복 생성 아님(SKIPPED). census `v4_sourceref_live_conflict_0`으로 사전 검증됨(현재 LIVE 충돌 0).
- 재진입(나→가) 후 재적재도 동일 키 → 멱등.

## 4. EN canonical 계약
KO canonical 선행이 필수다. KO 없이 EN을 쓰면 `HELD`(정상 — 오류 아님). EN grounding(공식 원문 번역 근거) 부재 시 EN은 HOLD하고 KO만 생산한다.

## 5. rollback 계약
- 배치 실패(COMMIT 전 치명적 오류) → 전체 `ROLLBACK`. 부분 반영 없음.
- 이미 COMMIT된 배치의 개별 master 회수 → sourceRef(V4)로 정확히 식별해 deprecate(별도 회수 스크립트, 승인 필요).

## 6. 스냅샷·결정성
생산 입력(가 큐)은 census가 `REPEATABLE READ READ ONLY` 단일 스냅샷에서 masterId 정렬로 산출 → 재현 시 byte-identical. 생산 세션은 이 고정 원장(`agent-ga-ready-queue-v1.json`)의 masterId 배열만 입력으로 받는다.

## 관련 문서
- 재진입 상태 기계: `otc-easy-drug-remaining-3809-reentry-contract-v1.md`
- 후속 agent request: `otc-easy-drug-remaining-3809-followup-agent-requests-v1.md`
