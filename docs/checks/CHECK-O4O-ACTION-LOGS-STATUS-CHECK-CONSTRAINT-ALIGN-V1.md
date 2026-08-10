# CHECK-O4O-ACTION-LOGS-STATUS-CHECK-CONSTRAINT-ALIGN-V1

> **결과: 완료 — migration 적용 및 프로덕션 실측 검증 통과.**
> **작성일:** 2026-08-09
> **근거:** `CHECK-O4O-AUTH-FAILURE-RATE-DASHBOARD-SUCCESS-COLUMN-AUDIT-V1` §9-1 (후속 P2)
> **commit:** `7f9d8bd4b`
> **데이터 수정 0 · backfill 0 · action-log-core(F1 Frozen) 미접촉**

---

## 1. 목적

`action_logs.status` 에 허용 값 CHECK 제약을 추가해 **잘못된 status 리터럴을 DB 단에서 차단**한다.

선행 결함:

```text
정본 값 : success / failed   (@o4o/action-log-core — ActionStatus)
오타 값 : failure            (operator analytics 라우트)
DB 제약 : 없음
결과    : 쿼리 오타가 조용히 0건으로 통과 → 실패 집계가 구조적으로 항상 0
```

조회 측은 선행 WO 에서 고쳤고, 본 WO 는 **재발 방지**를 담당한다.

---

## 2. 사전 조사 (read-only)

### 2-1. 코드상 정본 값

```ts
// packages/action-log-core/src/types.ts:13
export type ActionStatus = 'success' | 'failed';
```

`success` / `failed` **외의 정상 값은 없다.**

### 2-2. write 경로 전수 — 단일 지점

| 경로 | 결과 |
|------|------|
| `ActionLogService.logAction()` | **유일한 INSERT 지점** (`action-log.service.ts:25`) |
| `logAction()` 호출부 | `logSuccess`(`status:'success'`) · `logFailure`(`status:'failed'`) **둘뿐**, 전부 서비스 내부 |
| `ActionLog` 엔티티 직접 사용 | `admin-forum.routes.ts:452` — **읽기 전용**(QueryBuilder + `getMany`) |
| raw `INSERT INTO action_logs` | **0건** |

→ 타입(`ActionStatus`)이 컴파일 단에서 두 값으로 고정되어 있어, **제약 추가로 거부될 런타임 write 경로가 없다.**

### 2-3. 프로덕션 데이터 실측

| 항목 | 값 |
|------|----|
| `status` 분포 | `success` **4,136** / `failed` **1,716** |
| **허용값 외 데이터** | **0건** ✅ |
| NULL / 앞뒤 공백 / 대문자 변형 | **0 / 0 / 0** ✅ |
| 기존 제약 | PK 뿐 — **CHECK 없음** |
| 컬럼 정의 | `character varying(20) NOT NULL` |
| 총 행 수 | 5,852 (제약 검증 비용 무시 가능) |

→ **HOLD 조건 미충족** — additive migration 안전.

### 2-4. 병행 작업 간섭 확인

통합 브랜치(`integration/service-account-control-and-password-scope`)가
`action_logs` status 나 migration 을 건드리는지 확인 → **해당 없음**(timestamp 충돌 0).

---

## 3. 허용 값 결정 근거

```text
허용: 'success', 'failed'
```

`@o4o/action-log-core` 의 `ActionStatus` 를 그대로 따른다. **범위를 임의로 넓히지 않았다** —
`'failure'` 를 허용값에 넣지 않는 것이 본 WO 의 핵심이다(오타를 정본으로 승격시키지 않는다).

---

## 4. migration

`apps/api-server/src/database/migrations/20270225000000-AddActionLogsStatusCheckConstraint.ts`

```sql
ALTER TABLE action_logs DROP CONSTRAINT IF EXISTS chk_action_logs_status;   -- 재실행 안전
ALTER TABLE action_logs
  ADD CONSTRAINT chk_action_logs_status
  CHECK (status IN ('success', 'failed'));
```

| 항목 | 내용 |
|------|------|
| 제약명 | `chk_action_logs_status` — 기존 관례(`chk_signage_media_status` 등) 준수 |
| 클래스명 | `AddActionLogsStatusCheckConstraint20270225000000` — timestamp suffix 관례 준수 |
| 위치 | `database/migrations/` — 러너가 스캔하는 **정규 경로** (`src/migrations/` orphan 함정 회피) |
| 데이터 수정 | **0** — 기존 행이 전부 허용값이라 값 매핑·backfill 단계가 없다 |
| `down` | 제약 제거만. 되돌릴 데이터가 없다 |
| 실패 시 | 허용값 외 데이터가 있으면 `ALTER` 가 실패하고 migration 이 롤백된다. **값을 임의로 고쳐 통과시키지 않는다** |

---

## 5. 적용 결과

배포: run `31313132066` **success** (headSha `7f9d8bd4b`) — CI/CD 가 migration 자동 실행.

```
conname                | def
-----------------------+------------------------------------------------------------
chk_action_logs_status | CHECK (status = ANY (ARRAY['success','failed']))
```

---

## 6. 검증 (프로덕션 실측)

| # | 검증 | 결과 |
|:-:|------|:----:|
| 1 | 제약 적용 | ✅ `chk_action_logs_status` 존재 |
| 2 | `success` insert | ✅ 가능 |
| 3 | `failed` insert | ✅ 가능 |
| 4 | **`failure` insert** | ✅ **거부** — `new row ... violates check constraint "chk_action_logs_status"` |
| 5 | 기존 데이터 무변경 | ✅ `success` 4,136 / `failed` 1,716 (적용 전과 동일) |
| 6 | smoke 행 잔존 | ✅ **0건** |

**검증 방식 — DB write 0**
2~4번은 `BEGIN … ROLLBACK` 트랜잭션 안에서만 수행하고, 실패 케이스는 `SAVEPOINT` 로 감싸 전체를
롤백했다. `action_key='smoke.constraint.check'` 잔존 행 **0건**으로 확인했다.

> 출력 해석 주의: psql 이 `ON_ERROR_STOP` 미설정이라 4번 ERROR **이후에도** 다음 `\echo` 가 실행돼
> "통과함" 문구가 함께 찍혔다. 실제 결과는 그 위의 `ERROR: ... violates check constraint` 다(거부 성공).

### 6-1. 인증 대시보드 회귀

| 검증 | 결과 |
|------|------|
| `GET /operator/analytics/summary?days=30&all=true` | `{ total: 1126, success_count: 1072, failure_count: 54 }` ✅ (`1072+54=1126` 정합) |
| `GET .../auth/logs?status=failure` | **54행**, `status=["failed"]` ✅ |
| `GET .../auth/logs?status=success` | 50행, `status=["success"]` ✅ |

→ **외부 쿼리 계약(`status=failure`) → 내부 저장값(`failed`) 변환이 그대로 유지**됨을 확인했다
(선행 WO 의 수정과 본 제약이 함께 정상 동작).

---

## 7. 무변경 확인

```
action-log-core (F1 Frozen) 무변경 — DB 제약만 추가해 정본 타입과 스키마를 일치시켰다
기존 action_logs 데이터 backfill 0 · 값 수정 0
인증/로그인 흐름 무변경 · API 응답 필드명 무변경
status 값을 'failure' 로 바꾸는 작업 0 · enum 범위 확장 0
write 경로 코드 무변경 (제약만으로 충분 — §2-2)
```

api-server `tsc --noEmit` **PASS** (통합 병합 반영된 최신 main `6c9ee8388` 기준 재실행) ·
Deploy API Server **success**.

---

## 8. 작업 순서 관련 기록

착수 시점에 통합 브랜치 병합이 미완료라, main push 가 ① 프로덕션 migration 실행과
② 소유 세션의 중지 조건(`push 직전 origin/main 추가 전진`)을 동시에 유발할 상황이었다.
→ 격리 worktree 를 준비하던 중 **통합 병합이 완료·push 된 것을 확인**(`6c9ee8388`,
CI·배포 5종 전부 success)하여, 격리를 해제하고 **병합된 최신 main 위에서** 재검증 후 진행했다.

즉 본 migration 은 통합 코드가 반영된 main 기준으로 typecheck·배포·검증됐다.

---

## 9. 변경 파일

```
A apps/api-server/src/database/migrations/20270225000000-AddActionLogsStatusCheckConstraint.ts
```

---

## 10. 후속

| # | 내용 | 등급 |
|:-:|------|:---:|
| 1 | `WO-O4O-AUTH-ACCOUNT-ACTIVITIES-HISTORICAL-BACKFILL-DECISION-V1` — 과거 `success` 1,710건 / `email` 5,712건 backfill 여부 결정 (읽는 곳이 없어 급하지 않음) | P3 |
| 2 | `AccountActivity.action` 길이 선언(50) vs DB `varchar(100)` 정합 | P3 |
| 3 | `account_activities` ↔ `action_logs` 역할 중복 — 로그인 1회에 두 테이블 기록. 정리 여부 정책 검토 | P3 |
| 4 | 같은 유형 점검: 다른 status/enum 컬럼에도 CHECK 제약이 없는 곳이 있는지 감사 | P3 |

---

*범위: DB 제약 추가만 · 데이터 수정 0 · 오타 리터럴 거부 실증 · 인증 대시보드 회귀 통과*
