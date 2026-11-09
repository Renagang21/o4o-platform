# Admin 「계정 삭제」 무응답 원인 확인

> **상태**: ACTIVE
> **작성일**: 2026-11-09 · **최종 갱신**: 2026-11-09
> **실행 위치**: LOCAL
> **인계**: claude/intelligent-cray-o2p4u3 · push 전 · 다음 실행자 LOCAL (VS Code 로컬 세션)
> **근거**: 사용자 보고(2026-11-09) — `admin.neture.co.kr/admin/platform/users` 「해지 회원」 탭에서 회원 1명을 선택하고 「계정 삭제」를 확인했더니 버튼이 모두 회색으로 바뀐 채 변화가 없음

## 1. 배경

### 1-1. 화면 동작(코드 확인)

- `apps/admin-dashboard/src/pages/operators/CentralMemberWorkspace.tsx` `eraseAccount`:
  확인 창 → `DELETE /api/v1/admin/users/:id`(timeout 90초)를 보내고, 응답이 올 때까지 모든 버튼을 잠근다(`busy`).
- 사용자 화면은 「1개 선택」이 남아 있고 버튼이 모두 비활성이었다. 응답이 오면 선택이 풀리므로, **서버 응답을 기다리던 상태**로 판단한다.
- 이전 화면에는 진행 표시가 없었다. 같은 branch 의 화면 수정으로 「삭제하는 중… N초 경과」와 결과·오류 문구를 보이게 했다. 이 지시서는 **서버가 왜 오래 걸렸는지**를 확인한다.

### 1-2. 서버 처리(코드 확인)

`apps/api-server/src/services/privacy/account-erasure.service.ts`:

- `request` → 전역 advisory lock(`o4o-account-erasure-writes`)과 대상 lock 을 잡은 transaction 안에서 작업 행을 만든다. 그다음 `resume` 을 실행한다.
- `resume` 은 같은 전역 lock 을 잡은 transaction 안에서 **GCS 개인 파일 목록 조회**(`accountErasureStorage.discover` — `account-erasure.http.ts`)를 한다. 그 뒤 transaction 밖에서 `removeFiles` 를 두 번 실행하고 `finish` 한다.
- 가능한 원인:
  - **A.** 다른 transaction 이 같은 advisory lock 을 오래 쥐고 있어 대기했다(`pg_advisory_xact_lock` 은 무기한 대기).
  - **B.** GCS 호출(목록·metadata·삭제)이 느리거나 재시도를 반복했다.
  - **C.** 서버는 끝냈지만 응답 전에 90초를 넘겼다(화면은 시간 초과, 서버는 완료 또는 진행 중).
  - **D.** 그 밖의 오류. 작업 상태에 `error_code` 로 남는다.

## 2. 사용자 확정

- 클라우드 세션은 화면 진행 표시 수정 → push → PR 까지 한다(2026-11-09 사용자 「push 까지」).
- 운영 원인 확인은 로컬 세션이 read-only 로 한다. 이 지시서로 넘긴다.

## 3. 범위 밖

- 삭제 작업의 재시도·상태 변경(운영 데이터 write). 필요하면 결과를 보고하고 통합 담당 승인을 받은 뒤 화면의 「삭제 처리 내역」 재시도 버튼으로 한다.
- 서버 코드 수정. 원인 확정 후 별도 작업으로 CLOUD 에 넘긴다.

## 4. TODO

- [ ] [LOCAL] `/db-readonly` 로 아래 SQL 을 실행하고, 결과의 상태·코드·시각·건수만 §5 에 적는다(회원 식별값은 적지 않는다)

```sql
-- Q1. 최근 3일 삭제 작업 상태 (회원 식별값 제외)
SELECT left(id::text, 8) AS op, state, error_code, review_codes,
       created_at, updated_at, completed_at,
       round(extract(epoch FROM (coalesce(completed_at, updated_at) - created_at))) AS seconds
FROM account_erasure_operations
WHERE created_at > now() - interval '3 days'
ORDER BY created_at DESC;

-- Q2. 그 작업들의 파일 처리 현황
SELECT left(o.id::text, 8) AS op, f.state, f.error_code, count(*) AS files, max(f.attempts) AS max_attempts
FROM account_erasure_file_tasks f
JOIN account_erasure_operations o ON o.id = f.operation_id
WHERE o.created_at > now() - interval '3 days'
GROUP BY 1, 2, 3 ORDER BY 1;

-- Q3. 지금 advisory lock 을 쥐거나 기다리는 세션 · 오래 열린 transaction (쿼리 원문 제외)
SELECT a.pid, a.state, a.wait_event_type, a.wait_event,
       now() - a.xact_start AS xact_age, l.locktype, l.granted
FROM pg_stat_activity a
LEFT JOIN pg_locks l ON l.pid = a.pid AND l.locktype = 'advisory'
WHERE a.datname = current_database()
  AND (l.pid IS NOT NULL OR now() - a.xact_start > interval '30 seconds')
ORDER BY xact_age DESC NULLS LAST;
```

- [ ] [LOCAL] Cloud Run `o4o-core-api` 로그(읽기만)에서 사용자가 삭제한 시각 전후의 `DELETE /api/v1/admin/users/` 요청 응답 코드·지연 시간을 확인한다. 경로의 회원 ID 는 기록하지 않는다.
- [ ] [LOCAL] 화면 수정 PR 배포 후, 테스트용 계정으로만 삭제를 다시 시도해 진행 표시와 결과 문구를 확인한다. 실제 회원 계정으로 시험하지 않는다(`AGENTS.md` §5 테스트 데이터 경계).

판정:

| 결과 | 원인 | 다음 |
|---|---|---|
| Q1 에 해당 작업이 `completed` · `seconds` > 90 | C(서버는 완료, 화면이 시간 초과) | 서버 처리 시간 단축 또는 화면의 비동기 상태 조회를 CLOUD 작업으로 제안 |
| Q1 `processing` · `pending` 에서 멈춤 · Q3 에 advisory lock 대기(`granted=false`) 또는 오래된 transaction | A | 대기 원인 세션의 종류(상태·지속시간)를 보고. 세션 종료는 통합 담당 승인 사항 |
| Q1 `retry_required` · `review_required` + `error_code` | D | 코드를 보고(화면 문구는 `deletionMessage` 대응) |
| Q2 `max_attempts` 큼 · 파일 `retry_required` · 로그에 GCS 지연 | B | GCS 권한·지연을 보고 |
| Q1 에 해당 시각 작업 없음 | 요청이 서버에 닿지 않았거나 작업 생성 전 대기 | 로그의 응답 코드로 판단(403 `GOOGLE_AUTH_REQUIRED` 등) |

## 5. 실행 기록

(LOCAL 세션이 채운다)

| 단계 | 일시 | 결과 |
|---|---|---|
| Q1 | | |
| Q2 | | |
| Q3 | | |
| 로그 | | |
| 배포 후 재시도(테스트 계정) | | |

## 문서 정합

해당 없음(작성 시점).
