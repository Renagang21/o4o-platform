# CHECK-O4O-MEMBERSHIP-REACTIVATION-PLATFORM-SUSPENSION-BOUNDARY-V1

> WO: `WO-O4O-MEMBERSHIP-REACTIVATION-PLATFORM-SUSPENSION-BOUNDARY-V1`
> 대상: 서비스 운영자의 Membership 재활성화가 `users` 공통 계정의 **플랫폼 정지를 해제하지 못하도록** 정비
> 브랜치: `fix/membership-reactivation-platform-suspension-boundary` (`origin/main` = `25fe24ae1` 기준)
> 상태: **정비 완료 · 게이트 GREEN**

> **선행 브랜치 주의**: 대칭 결함을 닫은 `fix/service-membership-rejection-cross-service-isolation`(`6443a322b`)은
> 아직 main 에 없다. 본 브랜치는 지시대로 최신 `main` 에서 분기했으므로 그 변경을 포함하지 않는다.
> 두 브랜치는 **파일이 겹치지 않는다** (P0=컨트롤러 / 본 건=서비스 계층) — 병합 순서 무관, 충돌 없음.

---

## 0. 결론 요약

| 항목 | 결과 |
|---|---|
| 서비스 운영자의 플랫폼 정지 해제 | ✅ 차단 |
| 플랫폼 관리자의 정지·해제 통제권 | ✅ 보존 |
| 서비스 운영자의 soft-delete 복구 | ✅ 보존 (Neture 공급자 복구 계약) |
| Membership 재활성화 자체 | ✅ 불변 |
| 변경 규모 | **1개 SQL 의 WHERE 조건 1줄** (`MembershipApprovalService` STEP2) |
| 기존 데이터 고립 위험 | ✅ **없음** — 프로덕션 `users.status='suspended'` **0건** (§3-3) |
| 테스트 | 신규 8 케이스 + 기존 14 케이스 |
| 게이트 | api-server tsc / 전체 jest 77 suites·1283 tests / lint ratchet 전부 GREEN |
| DB write / migration | **0건** |

**한 줄 요약**: `users.status='suspended'` 는 admin API 만 기록하는 **플랫폼 조치**이고,
`'deleted'` 는 서비스 운영자도 호출하는 `deleteMember(mode='soft')` 의 결과다.
**기록 주체가 다르므로 해제 권한도 갈라야 한다** — 재활성화의 해제 후보를 호출자 권한에 따라 나눴다.

---

## 1. 플랫폼 정지 해제 write-path

```
apps/api-server/src/services/approval/MembershipApprovalService.ts
  reactivateMembership() STEP2  (수정 전)

    UPDATE users SET status = 'active', "isActive" = true
    WHERE id = $1 AND status IN ('suspended', 'deleted')
                                  ^^^^^^^^^^^
                                  호출자 권한과 무관하게 무조건 해제
```

`ReactivateParams` 는 이미 `isPlatformAdmin` 을 받고 있었으나 STEP2 가 이를 쓰지 않았다.
STEP0(멤버십 선택)만 `isPlatformAdmin` 으로 스코프를 갈랐다.

---

## 2. 호출 가능한 운영자와 API

| 호출부 | 라우트 | 권한 | `isPlatformAdmin` |
|---|---|---|---|
| `MembershipConsoleController.reactivateMember:770` | `POST /api/v1/operator/members/:userId/reactivate` | operator router (`requireRole` + `injectServiceScope`) | 호출자에 따라 true/false |
| `kpa/controllers/member.controller.ts:614` | KPA 회원 상태 전이(`suspended → active`) | KPA 운영자 | **하드코딩 `false`** |

즉 **서비스 운영자 2경로 모두** 플랫폼 정지를 해제할 수 있었다.

---

## 3. 신규 가입 활성화 vs 플랫폼 정지 해제의 구분

### 3-1. `users.status` 값별 기록 주체 (전수 확인)

| users.status | 기록하는 코드 | 성격 |
|---|---|---|
| `'suspended'` | `AdminUserController:376·425`, `UserManagementController:205` — **admin API 뿐** | **플랫폼 조치** |
| `'deleted'` | `MembershipApprovalService.deleteMember` (`:1182·1195`) ← `DELETE /operator/members/:userId?mode=soft` (**서비스 운영자 호출 가능**, `hard` 만 platform admin 필수) | 운영자 조치의 역동작 대상 |
| `'pending'` | 회원가입 | 신규 가입 |
| `'active'`/`'approved'` | 승인 경로 | 정상 |

> 참고: 정비 전 `MembershipConsoleController` 반려 분기도 임의 status 를 `users` 에 기록할 수 있었으나,
> 그 경로는 선행 브랜치 `6443a322b` 에서 제거됐다.

### 3-2. 승인(approve) 경로는 이미 정합

`approveMembership` STEP2 의 화이트리스트
`status IN ('PENDING','pending','ACTIVE','active','inactive','deleted','rejected')` 는
**`'suspended'` 를 이미 제외**한다 → 승인은 플랫폼 정지를 해제하지 않는다. **무변경.**

`'deleted'` 를 포함하는 부분은 soft-delete/withdrawn 의미 축에 속하므로 본 WO 금지사항
("withdrawn 경로 변경")에 따라 손대지 않았다 — §7-2 후속.

### 3-3. 프로덕션 실측 (read-only, write 0)

```
users.status 분포:   deleted 32 (isActive=true 0) / active 11 / approved 2
                     → suspended 0건
재활성화 대상 membership(suspended|withdrawn): 0건
```

**결론: 이 변경으로 고립되는 기존 사용자는 없다.**
플랫폼 정지 상태의 계정이 현재 0건이므로 "운영자가 못 푸는 계정"이 새로 생기지 않는다.
`deleted` 32건은 운영자 복구 대상으로 그대로 남는다.

---

## 4. 제거·제한한 전역 users write

```diff
-      // STEP2: Activate user account (idempotent — only if currently suspended)
-      await queryRunner.query(
-        `UPDATE users SET status = 'active', "isActive" = true, "updatedAt" = NOW()
-         WHERE id = $1 AND status IN ('suspended', 'deleted')`,
-        [userId]
-      );
+      const liftableUserStatuses = isPlatformAdmin ? ['suspended', 'deleted'] : ['deleted'];
+      await queryRunner.query(
+        `UPDATE users SET status = 'active', "isActive" = true, "updatedAt" = NOW()
+         WHERE id = $1 AND status = ANY($2)`,
+        [userId, liftableUserStatuses]
+      );
```

| 호출자 | 해제 가능 | 해제 불가 |
|---|---|---|
| 서비스 운영자 | `deleted` (자신이 수행 가능한 soft-delete 의 역동작) | **`suspended` (플랫폼 조치)** |
| 플랫폼 관리자 | `suspended`, `deleted` | — |

**변경은 이 한 곳뿐이다.** 컨트롤러·라우트·프런트·schema·migration 변경 0건.

---

## 5. Membership 재활성화 보존 결과

| 항목 | 결과 |
|---|---|
| STEP0 멤버십 선택 | 불변 — `status IN ('suspended','withdrawn')`, 비-platform 은 `service_key = ANY($2)` |
| STEP1 멤버십 활성화 | 불변 |
| STEP3 role 재활성화 | 불변 |
| Neture 공급자 복구 (`WO-O4O-NETURE-SUPPLIER-WITHDRAWN-RESTORE-ACTION-V1`) | ✅ 보존 — soft-delete(`users.status='deleted'`) 복구 경로 그대로 |
| KPA `suspended → active` 전이 (`member.controller:614`) | ✅ 정상 — 선행 브랜치 적용 후 `suspendMembership` 이 users 를 건드리지 않으므로 users 해제가 애초에 불필요 |

---

## 6. 플랫폼 통제권 회귀검증

신규 `MembershipApprovalService.reactivationBoundary.test.ts` (8 케이스).
FakeQueryRunner 가 `UPDATE users` 의 **WHERE 조건을 실제로 평가**해 "정말 갱신됐는지" 를 본다
(SQL 발생 여부가 아니라 행 상태 변화로 판정).

| WO 요구 검증 항목 | 케이스 | 결과 |
|---|---|---|
| 정상 사용자의 Membership 승인 | 승인 경로 무변경 + 기존 14 케이스 통과 | ✅ |
| 해당 서비스 Membership 재활성화 | 운영자: `m-glyco` → `active` | ✅ |
| 다른 서비스 Membership·Role 불변 | 운영자: `m-kpa`(kpa-society) → `suspended` 유지 | ✅ |
| 플랫폼 정지 계정은 계속 정지 | 운영자 재활성화 후 `users.status='suspended'` 유지, `isActive=false` | ✅ |
| 서비스 운영자가 플랫폼 정지를 해제하지 못함 | 해제 후보 파라미터 `['deleted']` 단언 | ✅ |
| 플랫폼 관리자는 정지·해제 가능 | admin 재활성화 후 `active`/`isActive=true`, 후보 `['suspended','deleted']` | ✅ |
| users 공통 상태의 불필요한 변경 없음 | `users.status='active'` 계정에 변화 0 | ✅ |
| (추가) soft-delete 복구 보존 | 운영자가 `deleted` → `active` 복구 성공 | ✅ |

```
npx jest src/services/approval              → 22 passed (신규 8 + 기존 14)
cd apps/api-server && npx jest --maxWorkers=1 → 77 suites / 1283 tests PASS
npx tsc --noEmit -p tsconfig.json            → exit 0
node scripts/lint-ratchet.mjs                → ESLint 102 errors (baseline 102 유지)
```

> **정직한 한계**: 프로덕션 실계정으로 "운영자가 정지 해제를 시도해 실패하는" E2E 는 수행하지 않았다.
> 현재 `users.status='suspended'` 가 0건이라 재현 대상 자체가 없고, 만들려면 운영 데이터 write 가 필요하다(금지).

---

## 7. 후속 (이번 범위 밖)

### 7-1. 서비스 운영자의 `users.password` 변경 🔴 다음 우선순위

`MembershipConsoleController:932` — `PUT /operator/members/:userId { password }`.
라이브 UI 3곳(`web-glycopharm` operator/admin, 공통 `OperatorMembersConsolePage`)에서 도달.
방향은 확정됨(제거 후 본인 재설정 안내로 대체) — 대체 경로 확인 후 일괄 제거 필요.

### 7-2. `deleteMember(mode='soft')` 자체가 서비스 운영자의 users 전역 write

`users.status='deleted', isActive=false` 를 스코프 없이 기록한다. 이번에는 그 **역동작(복구)** 만
운영자에게 남겼고 원동작은 손대지 않았다 — `withdrawn` 의미 감사에서 함께 다뤄야 한다.
승인 경로가 `'deleted'` 를 되살리는 부분(`approveMembership` STEP2)도 같은 축이다.

### 7-3. JWT·refresh token·role-cache 잔존 시간

`user.memberships`/`roles` 는 JWT payload 에서 오므로 membership 변경이 토큰 갱신 전까지 반영되지 않는다.
별도 감사로 분리됨.

---

## 8. 금지사항 준수

- ❌ 비밀번호 구조 변경 — 하지 않음
- ❌ withdrawn 경로 변경 — 하지 않음 (`withdrawMembership`·`deleteMember` 무접촉)
- ❌ 인증 구조 전면 개편 — 하지 않음
- ❌ JWT·refresh·role-cache 정비 — 하지 않음
- ❌ 운영 DB 보정 — 하지 않음 (**SELECT 2회만**, write 0)
- ❌ Membership 상태 체계 재설계 — 하지 않음 (schema·enum·상태값 불변)
- ❌ main 병합 — 하지 않음

---

## 9. Git

| 항목 | 값 |
|---|---|
| worktree | `C:/tmp/o4o-identity-v2` |
| 브랜치 | `fix/membership-reactivation-platform-suspension-boundary` (`origin/main` `25fe24ae1` 기준) |
| 변경 | `MembershipApprovalService.ts` 1개 + 신규 테스트 1개 + 본 CHECK |
| migration | **0건** |
| main 병합 | ❌ |
