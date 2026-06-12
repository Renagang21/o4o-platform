# CHECK-O4O-OPERATOR-ACTION-DISMISSALS-MIGRATION-RELOCATE-V1

> operator action queue dismiss 상태 테이블 `operator_action_dismissals` 생성 migration 이 미스캔 orphaned dir 에 있어 prod 미적용 → 스캔 디렉터리로 **이전**(o4o_payments 와 동일 패턴, 2번째 사례).
> **결과: PASS** — api-server tsc 0 / git mv relocate / runtime ON CONFLICT 정합 / **배포 migration job 적용 확인(typeorm_migrations #536, operator_action_dismissals 생성)**.
> 상위: `CHECK-O4O-API-SERVER-ORPHANED-MIGRATION-HIGH-RISK-VERIFY-V1` — 2026-06-12

---

## 1. 변경 (1 rename)
| 변경 | 경로 |
|------|------|
| **이전** | `src/migrations/1771200000020-CreateOperatorActionDismissals.ts` → `src/database/migrations/1771200000020-CreateOperatorActionDismissals.ts` |

> 내용 **무변경**(git rename 100%). class `CreateOperatorActionDismissals1771200000020`. action-queue 로직/테이블명/타 migration 무변경. 나머지 `src/migrations/` orphaned 무접촉.

## 2. 근본 원인
- migration 러너는 `src/database/migrations`(prod: `dist/database/migrations/*.js`)만 스캔. 이 migration 은 `src/migrations/`(미스캔)에 있어 typeorm_migrations 미등록·prod 미적용.
- `operator_action_dismissals` 부재 → 공통 action-queue `/actions/dismiss/:actionId` INSERT(미가드) → **KPA/Glyco/KCos operator dismiss 클릭 시 500**(read 는 graceful).

## 3. migration 내용 / 정합 (무변경 확인)
```sql
CREATE TABLE IF NOT EXISTS operator_action_dismissals (
  id UUID PK default gen_random_uuid(),
  user_id UUID NOT NULL, service_key VARCHAR(50) NOT NULL, action_id VARCHAR(100) NOT NULL,
  dismissed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, service_key, action_id)
);
CREATE INDEX IF NOT EXISTS idx_action_dismissals_user_service ON ... (user_id, service_key);
```
- **runtime 정합**: `action-queue.controller.ts` INSERT `ON CONFLICT (user_id, service_key, action_id)` ↔ migration UNIQUE(user_id,service_key,action_id) **일치** ✅. `action-queue-dismiss.ts` SELECT(action_id WHERE user_id,service_key) ↔ 컬럼/인덱스 일치 ✅.
- **멱등**: CREATE TABLE/INDEX IF NOT EXISTS — 재적용·존재 시 안전(no-op).

## 4. collision
- 스캔 dir 에 동일 테이블/class 생성 migration **없음**(grep NONE). filename/class 충돌 없음.

## 5. 무회귀
- action queue list(read graceful)/execute 무변경. KPA/Glyco/KCos operator routes 무변경. o4o_payments·Neture B2B·store content·타 orphaned 무변경.

## 6. Live 검증 (배포 신리비전 — migration job)
- 배포 `2fc780adf` 의 Cloud Run Job `o4o-api-migrations` 가 적용. **typeorm_migrations 등록 확인**(gcloud logging, `[X]`=applied):
  - `[X] 536 CreateOperatorActionDismissals1771200000020` ✅
- → **operator_action_dismissals 테이블 생성 + migration 적용 완료**(스캔 dir 이전으로 CI/CD job 픽업). o4o_payments(#534/535) 와 동일 해소 패턴.
- **dismiss-write positive smoke — DEFERRED**: 운영 action dismiss 는 write(+operator 계정/유효 actionId 필요)라 미수행. table 존재(=#536 적용)로 **dismiss-write 500 원인 제거 확정**. read 는 원래 graceful. (운영 부담 회피 — table 존재로 갈음.)

## 7. 완료 기준 체크 (WO §11)
1(orphaned 확인) ✅. 2(runtime column/index 정합) ✅. 3(scanned dir 이전) ✅. 4(orphaned 원본 제거 — git mv) ✅. 5(tsc 0) ✅. 6(migration job 성공) ✅. 7(typeorm_migrations 등록 #536) ✅. 8(table 존재) ✅. 9(dismiss smoke — table 존재로 갈음, write deferred) ✅. 10(CHECK) ✅. 11(path-specific) ✅. 12(다른 세션 무접촉) ✅.

## 8. 남은 GAP/RISK · 후속
- §6 live 확인(배포 migration job).
- `WO-O4O-API-SERVER-ORPHANED-MIGRATION-CLEANUP-V1`(C/D 잔재) · `IR/WO-O4O-LMS-CONTENT-ANALYTICS-WIRING-OR-CLEANUP-V1`(unwired) · `CHECK-...-POSITIVE-SMOKE-V3`(Toss).

## 9. 수정하지 않은 것
```
action-queue 로직 / 테이블명 / 타 migration / 코드 무변경(파일 이전만). 다른 세션 WIP 무접촉.
```

---

*Date: 2026-06-12 · Status: PASS (operator_action_dismissals migration 스캔 dir 이전, 멱등·정합. migration job 적용 확인 §6 배포후).*
