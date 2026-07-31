# CHECK-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1

- WO: [WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1](../work-orders/WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1.md)
- 일자: 2026-07-31
- 범위: 공유 Core `MembershipApprovalService` (Neture / KPA Society / GlycoPharm / K-Cosmetics / Pharmacy-Hub 공용)
- 판정: **PASS** (단위 테스트 14/14, api-server build 통과, migration 0 / 신규 테이블 0)

---

## 1. 반환값 오류의 정확한 원인 (D2)

`rejectMembership` 는 아래와 같이 `AppDataSource.query(UPDATE ... RETURNING ...)` 의 반환값을 **행 배열**로 간주했다.

```ts
const result = await AppDataSource.query(`UPDATE service_memberships SET ... RETURNING *`, params);
if (result.length === 0) return null;   // ← 절대 참이 되지 않음
return result[0];                        // ← 행이 아니라 "행 배열"
```

TypeORM pg driver 는 `UPDATE` / `DELETE` 명령에 한해 `raw` 를 `[rows, rowCount]` 튜플로 감싼다.

`node_modules/typeorm/driver/postgres/PostgresQueryRunner.js` (설치 버전 **TypeORM 0.3.27**):

```js
switch (raw.command) {
  case "DELETE":
  case "UPDATE":
    result.raw = [raw.rows, raw.rowCount];
    break;
  default:
    result.raw = raw.rows;
}
```

결과적으로

| 기대 | 실제 |
|------|------|
| `result.length === 0` (대상 없음) | 항상 `2` → **404 분기 도달 불가** |
| `result[0]` = membership row | `rows` **배열** |
| `result[0].service_key === 'kpa-society'` | `undefined` → **KPA `kpa_members` 동기화가 한 번도 실행되지 않음** |
| 응답 `id/userId/status/role` | 전부 `undefined` |

영향 서비스: `rejectMembership` 를 호출하는 **5개 서비스 전부** (공통 `/api/v1/operator/members` 라우터 + Pharmacy-Hub 전용 콘솔).

## 2. TypeORM 실제 반환 형태 (실측)

| 구문 | `query()` 반환 |
|------|----------------|
| `SELECT ... RETURNING 없음` | `rows` (행 배열) |
| `INSERT ... RETURNING` | `rows` |
| `UPDATE ... RETURNING` | `[rows, rowCount]` |
| `DELETE ... RETURNING` | `[rows, rowCount]` |

추측이 아니라 설치된 driver 소스와 단위 테스트 fake(`driverShape()`)로 동일 semantics 를 재현해 확인했다.

## 3. 수정 방식과 선택 이유

WO §5.A 의 3개 후보 중 **①`SELECT ... FOR UPDATE` → `UPDATE`** 를 주 방식으로, **③`raw` 정규화 helper** 를 보조로 채택했다.

- `rejectMembership` 은 `approveMembership` 과 동일하게 트랜잭션 + `SELECT ... FOR UPDATE` 로 대상 행을 먼저 확정한다. → 대상 유무 판단이 driver 반환 형태에 전혀 의존하지 않는다. 승인/반려 경로가 같은 구조라 공유 Core 로서 가장 예측 가능하다.
- `QueryBuilder.update().returning()` 은 이 파일이 전부 raw SQL 로 작성돼 있어 스타일 혼재만 늘어난다 → 미채택.
- 나머지 `RETURNING` 호출부(suspend / reactivate / withdraw)는 구조 변경 없이 공통 helper 로 감쌌다.

```ts
function normalizeReturningRows<T = any>(result: unknown): T[] {
  if (!result) return [];
  if (Array.isArray(result)) {
    if (result.length === 2 && Array.isArray(result[0]) && typeof result[1] === 'number') {
      return result[0] as T[];      // [rows, rowCount]
    }
    return result as T[];           // rows
  }
  const records = (result as any).records;   // QueryResult
  if (Array.isArray(records)) return records as T[];
  const raw = (result as any).raw;
  if (Array.isArray(raw)) return normalizeReturningRows<T>(raw);
  return [];
}
```

→ `rows` / `[rows, rowCount]` / `QueryResult` 3형태를 모두 안전하게 처리한다 (WO §7-① 미해당).

## 4. reject 상태 전이

```text
STEP0  SELECT id,user_id,service_key,role,status FROM service_memberships
       WHERE id=$1 AND status IN ('pending','active') [AND service_key = ANY($2)] FOR UPDATE
       → 0건이면 rollback + null 반환 (컨트롤러 404 MEMBERSHIP_NOT_REJECTABLE 복원)
STEP1  UPDATE service_memberships SET status='rejected', rejection_reason=$1, updated_at=NOW()
STEP2  role 비활성화 (§5)
STEP3  service_key='kpa-society' 인 경우에만 kpa_members 동기화
COMMIT
```

| 전이 | 결과 |
|------|------|
| `pending → rejected` | 정상, 행 반환 |
| `active → rejected` | 정상, 행 반환 |
| `rejected → rejected` (재반려) | `null` (404) |
| scope 밖 `service_key` | `null` (404) — 요청 값이 아닌 컨트롤러 고정 scope 기준 |

## 5. role 비활성화 정책 (D3)

- 비활성화 대상 = `user_id` 일치 **AND** `role` 일치 **AND** `is_active = true`. prefix LIKE 매칭이 아니라 **membership.role 정확 일치**이므로 다른 서비스 역할은 구조적으로 불변이다.
- `is_active = false` 로 내리고 **row 는 삭제하지 않는다** (§4.2).
- `membership.role` 이 null 이면 **반려는 수행하고 role 변경만 skip** 하며 `[REJECTION][STEP2] membership.role is empty — role deactivation skipped` 경고를 남긴다.
- 승인 시 부여한 role 계산과 동일한 `resolveGrantedRole()` 을 사용한다 (k-cosmetics legacy `seller` → `cosmetics:store_owner` 매핑 포함). 승인이 부여한 것과 반려가 회수하는 것이 항상 같은 role 이 되도록 보장.

### 5-1. 예외 기록 — 중복 inactive row 정리

`deactivateRoleAssignment()` 는 `(u, r, true)` 와 `(u, r, false)` 가 **동시에 존재하는 legacy row 쌍**이 있을 때에 한해 중복 inactive row 를 `DELETE` 한 뒤 active row 를 내린다 (경고 로그 동반).

- 이유: `unique_active_role_per_user` 가 `UNIQUE (user_id, role, is_active)` **3컬럼** 제약이라(부분 인덱스 아님), 이 쌍이 있으면 단순 `UPDATE ... is_active=false` 가 23505 로 실패한다.
- §4.2/§6 의 "role 삭제 금지"와의 관계: **역할 자체는 삭제되지 않는다.** 정리 후에도 `(u, r, false)` row 는 그대로 남고 총 row 수가 1로 합쳐질 뿐이다. 정상 데이터(쌍 없음)에서는 `DELETE` 가 실행되지 않는다.
- 이 방식으로 **migration 없이** 해결했으므로 WO §7-③ 중지 조건에 해당하지 않는다.

## 6. 재승인 role 재활성화 (§4.3 / §5.C)

기존 approve 경로는 `INSERT ... ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO UPDATE SET is_active = true` 단일 upsert 였다. 3컬럼 제약이므로 **inactive row `(u,r,false)` 는 conflict 대상이 아니어서** 중복 active row 를 새로 만들고, 이후 반려 시 23505 로 실패하는 구조였다.

`activateRoleAssignment()` 로 UPDATE-우선 / INSERT-최후 순서로 교체했다.

```text
1) UPDATE ... WHERE is_active = true          → 'already_active'
2) UPDATE ... WHERE id = (SELECT ... is_active = false ORDER BY updated_at DESC LIMIT 1)
                                              → 'reactivated'   ← 기존 row 재활성화
3) INSERT ... ON CONFLICT DO UPDATE           → 'created'
```

- inactive 있으면 **재활성화**(row id 보존), 없으면 **생성**, 중복 active row **0**.
- `approveMembership` / `reactivateMembership` 두 경로 모두 이 helper 를 사용한다.
- 다른 서비스 역할은 role 정확 일치 조건 때문에 불변.

## 7. KPA 동기화 결과 (§5.D)

`membership.service_key === 'kpa-society'` 분기가 **실제 SELECT 행 기준**으로 판정되도록 복원했다. 동기화는 트랜잭션 내부에서 실행한다 (§4.4).

```sql
UPDATE kpa_members SET status = 'rejected', updated_at = NOW()
 WHERE user_id = $1 AND status IN ('pending','active')
```

- 대상 없음 / 중복 시 기존 정책 유지(예외 없이 통과, 영향 행 수만 로그).
- KPA 전용 분기를 Pharmacy-Hub 등 다른 서비스로 확장하지 않았다 — 단위 테스트 「다른 서비스 반려는 kpa_members 를 건드리지 않는다」로 확인.

## 8. 응답 payload (§5.E)

`rejectMembership` 은 commit 후 `status='rejected'`, `rejection_reason` 이 반영된 membership 행을 반환한다.

Pharmacy-Hub 콘솔 응답:

```json
{ "success": true, "data": {
  "id": "...", "userId": "...", "serviceKey": "pharmacy-hub",
  "status": "rejected", "role": "pharmacy-hub:store_owner",
  "roleType": "store_owner", "rejectionReason": "..." } }
```

공통 operator 콘솔(`PATCH /api/v1/operator/members/:membershipId/reject`)은 membership 행을 그대로 실어 보내므로 `id / user_id / service_key / status / role / rejection_reason` 이 정상 포함된다.

## 9. ActionLog 정합성

`MembershipConsoleController.rejectMembership` 의 `const serviceKey = membership.service_key || scope.serviceKeys[0]` 가 이제 실제 값으로 해석된다(이전에는 항상 `undefined` → fallback). actor(`req.user.id`) · targetId(membershipId) · serviceKey · reason 이 모두 채워진다. ActionLog 호출 자체는 기존대로 트랜잭션 밖 fire-and-forget 패턴 유지 (§4.4 단서).

## 10. 서비스별 회귀 (§8.2)

`rejectMembership` / `approveMembership` 소비처 전수:

| 소비처 | 경로 | 확인 |
|--------|------|------|
| 공통 operator 콘솔 (Neture / KPA / GlycoPharm / K-Cosmetics) | `MembershipConsoleController.approveMembership` L415 · `rejectMembership` L461 | 반환값 소비 정상화, 404 분기 복원 |
| 공통 operator — 사용자 상태 변경 | `updateMemberStatus` L537(approve) / L588(reject) | 반환값 미사용(루프 호출). role 비활성화가 이제 실제 동작 |
| 공통 operator — 일괄 변경 | `batchUpdateStatus` L668 / L709 | 동일 |
| Pharmacy-Hub 전용 콘솔 | `PharmacyHubMembershipConsoleController` approve L217 / reject L275 | 응답 payload 보강 |
| debug | `routes/debug/approval-test.controller.ts` L290 | 변경 없음 |

- **타 서비스 membership 변경 불가**: 컨트롤러가 `serviceKeys` 를 요청 값이 아닌 상수/`serviceScope` 에서 고정하고, `rejectMembership` 의 STEP0 SELECT 가 `service_key = ANY($2)` 로 잠금 대상 자체를 제한한다.
- **권한 없는 운영자 차단**: 기존 guard (`requireAuth` + service scope) 미변경.

## 11. 정적 검증 (§8.3)

| 항목 | 결과 |
|------|------|
| serviceKey 하드 경계 | PASS — `isPlatformAdmin=false` 시 `service_key = ANY($2)` 필수 |
| raw SQL parameter binding | PASS — 신규/변경 쿼리 전부 `$n` 바인딩, 문자열 보간 0 |
| 다른 서비스 role 보존 | PASS — role 정확 일치 조건 (LIKE prefix 미사용) |
| migration | **0** — `src/database/migrations` 변경 없음 |
| 신규 테이블 | **0** |
| role schema 변경 | 없음 |

## 12. 빌드·테스트 (§8.4)

```text
pnpm --filter @o4o/api-server build      → PASS (tsc -p tsconfig.build.json, 에러 0)
npx jest src/services/approval           → PASS (14/14)
```

단위 테스트 `src/services/approval/__tests__/MembershipApprovalService.rejection.test.ts` — in-memory fake QueryRunner 가 pg driver 반환 형태(`UPDATE/DELETE → [rows, rowCount]`)와 `unique_active_role_per_user` 3컬럼 제약을 그대로 재현한다.

| §8.1 최소 시나리오 | 테스트 |
|---|---|
| pending → rejected | ✅ |
| active → rejected | ✅ |
| 없는 membership → 404(null) | ✅ (+ 이미 rejected / scope 밖 2건 추가) |
| 대상 서비스 role 만 비활성화 | ✅ |
| 다른 서비스 role 불변 | ✅ |
| rejected → approved role 재활성화 | ✅ (row id 보존 확인) |
| 기존 role 없을 때 생성 | ✅ |
| 중복 active role 0 | ✅ (반려→승인→반려 반복 시 unique 위반 없음) |
| KPA 반려 동기화 실행 | ✅ (+ 타 서비스 미영향) |
| ActionLog 식별자 정상 | ✅ (반환 payload 의 serviceKey/userId 검증으로 대체) |

## 13. 미실행 항목과 사유

| 항목 | 사유 |
|------|------|
| 배포 후 E2E (반려→재로그인→role 제거, 재승인→role 복원) | 미실행. 프로덕션 배포와 DB write 가 필요하고, `[E2E_TEST]` 계정 비밀번호가 저장소·문서에 없다. WO §7 단서에 따라 단위 테스트로 대체 검증했고 중지 사유로 삼지 않았다. 배포 후 별도 smoke 로 확인 필요 |
| web operator 화면 typecheck | 프론트 변경 0. 응답이 결손 → 정상으로 **추가**되는 방향이라 기존 소비 타입과 호환 |
| 기존 legacy 중복 role row 실데이터 스캔 | 프로덕션 write 없이 SELECT 로 조사 가능하나 이번 범위 밖. 런타임 경고 로그(`duplicate active/inactive assignment pair consolidated`)로 발생 시 관측 가능 |

## 14. D1 제외 확인 (§4.5)

다음은 **일절 변경하지 않았다.**

```text
신규 users.status='pending' 정책
신규 가입자 로그인 허용 정책
ACCOUNT_NOT_ACTIVE 처리
반려 사유 화면(/join/status) 접근 정책
반려 후 재신청 정책 · 서비스별 membership UI · Pharmacy-Hub 상품·주문
```

→ 후속 `IR-O4O-NEW-USER-SERVICE-REJECTION-LOGIN-POLICY-V1` 로 이관.

## 15. 변경 파일

```text
apps/api-server/src/services/approval/MembershipApprovalService.ts
apps/api-server/src/controllers/pharmacy-hub/PharmacyHubMembershipConsoleController.ts
apps/api-server/src/services/approval/__tests__/MembershipApprovalService.rejection.test.ts   (신규)
docs/work-orders/WO-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1.md                          (신규)
docs/checks/CHECK-O4O-MEMBERSHIP-REJECTION-CORE-CORRECTNESS-V1.md                            (신규)
```

부수 정비(같은 파일 내 동일 결함 계열): `suspendMembership` / `reactivateMembership` / `withdrawMembership` 의 `RETURNING` 해석을 `normalizeReturningRows` 로 통일하고, suspend/reactivate 의 role 처리를 공통 helper 로 교체했다. `withdrawMembership` 의 LIKE prefix 기반 role 정리는 범위 밖으로 두어 그대로 유지했다.
