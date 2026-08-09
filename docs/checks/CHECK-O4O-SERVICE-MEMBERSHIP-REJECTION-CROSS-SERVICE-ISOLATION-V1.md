# CHECK-O4O-SERVICE-MEMBERSHIP-REJECTION-CROSS-SERVICE-ISOLATION-V1

> WO: `WO-O4O-SERVICE-MEMBERSHIP-REJECTION-CROSS-SERVICE-ISOLATION-V1`
> 대상: 서비스 운영자의 회원 반려·중지 조치가 `users` 공통 계정을 건드리지 않도록 정비
> 근거: 감사 브랜치 `a2661ac28` 의 CROSS_SERVICE_RISK
> 브랜치: `fix/service-membership-rejection-cross-service-isolation` (`origin/main` = `b6e56e724` 기준)
> 상태: **정비 완료 · 게이트 GREEN** — 잔여 위험 3건은 별도 결정 필요(§8)

---

## 0. 결론 요약

| 항목 | 결과 |
|---|---|
| 반려의 users 전역 변경 제거 | ✅ 단건·일괄 2곳 |
| 미정의 상태값(`withdrawn`)의 전역 차단 제거 | ✅ membership 축 전이로 전환 |
| 승인 경로가 타 서비스 정지 계정을 되살리는 문제 | ✅ 화이트리스트 가드 2곳 |
| 임의 status 문자열의 users 기록 | ✅ 400 차단 |
| 회귀 테스트 | ✅ 신규 14 케이스 |
| api-server tsc / 전체 jest / lint ratchet | ✅ GREEN |
| 프런트 변경 | **0건** — 기존 UI 동작 URL·payload 불변 |
| DB write | **0건** |

**한 줄 요약**: 서비스 계층(`suspendMembership`·`rejectMembership`)은 이미 `users` 를 건드리지 않는 올바른 계약이었고,
컨트롤러가 그 위에 전역 write 를 덧붙인 것이 원인이었다. **컨트롤러의 덧붙임만 제거**했다.

---

## 1. CROSS_SERVICE_RISK 의 정확한 write-path

### 1-1. 제거 대상 (반려 방향 = 전역 차단)

| 위치 | 이전 SQL | 영향 |
|---|---|---|
| `MembershipConsoleController.updateMemberStatus` else 분기 | `UPDATE users SET status = $1, "isActive" = false WHERE id = $2` | 스코프 없음 — 타 서비스 로그인·세션 즉시 차단 |
| `MembershipConsoleController.batchUpdateStatus` rejected 분기 | `UPDATE users SET status = 'rejected', "isActive" = false WHERE id = $1` | 동일 |

**즉시성 근거**: `requireAuth` 는 매 요청 `users` 를 조회하고
`if (!user.isActive) → 401 USER_INACTIVE` (`common/middleware/auth/authentication.middleware.ts:136-142`),
이어서 `enforceAccountAccess`(`users.status`)를 검사한다. 토큰 만료를 기다리지 않고 **진행 중 세션이 끊긴다.**

### 1-2. 추가로 발견된 같은 유형 (WO 실행 5)

| 위치 | 문제 | 처리 |
|---|---|---|
| 같은 else 분기 | 운영자 UI 가 보내는 `withdrawn` 이 `users.status` 에 그대로 기록됨. **`withdrawn` 은 `UserStatus` enum 에 없다** → `resolveAccountAccess` 가 fail-closed 로 `blocked` 판정 → **미정의 값으로 계정 전역 차단** | ✅ membership 축 전이로 전환 |
| 같은 else 분기 | `pending` 도 `users.status='pending', isActive=false` 로 기록 → 전 서비스 restricted 로그인 | ✅ 동일 |
| 같은 else 분기 | status 검증 없음 — 임의 문자열이 `users.status` 에 기록 가능 | ✅ 화이트리스트 밖은 400 |
| 승인 fallback 2곳 (`:560`, `:736`) | 가드 없이 `status='active', isActive=true` → **타 서비스가 정지시킨 계정을 되살림** | ✅ `approveMembership` STEP2 와 동일 화이트리스트 적용 |

---

## 2. 재사용한 Membership 상태 전이 (신규 설계 없음)

| 조치 | 재사용한 계약 | users 접촉 |
|---|---|---|
| 반려 | `MembershipApprovalService.rejectMembership` (원자 트랜잭션 + 스코프 내 role 비활성화) | ❌ 없음 (검증 완료) |
| 이용 중지 | `MembershipApprovalService.suspendMembership` | ❌ 없음 (기존 기준선) |
| 승인 | `MembershipApprovalService.approveMembership` | STEP2 가드 有 (`suspended` 제외) |
| 탈퇴 / 가입신청 되돌림 | `service_memberships.status` 직접 전이 (스코프 한정) | ❌ 없음 (신규) |

`rejectMembership` 은 이미 `users` 를 건드리지 않고 스코프 내 role 만 비활성화하도록 검증돼 있었다
(`MembershipApprovalService.rejection.test.ts` 14 케이스 통과). 컨트롤러가 그 뒤에 전역 write 를 덧붙인 것이 결함이었다.

---

## 3. 제거한 users 전역 변경

```
- UPDATE users SET status = $1, "isActive" = false ...        (단건 반려/기타)
- UPDATE users SET status = 'rejected', "isActive" = false ... (일괄 반려)
```

**컨트롤러에 남은 `UPDATE users` 는 4개이며 전부 비활성화 방향이 아니다:**

| 행 | 내용 | 판정 |
|---|---|---|
| `:560` `:736` | 승인 fallback 활성화 (**화이트리스트 가드 추가됨**) | 정비 완료 |
| `:932` | 비밀번호 변경 | §8-1 잔여 — 이번 범위 밖 |
| `:996` | 프로필 필드(이름·전화·businessInfo) | 계정 상태 아님 — 유지 |

`"isActive" = false` 를 쓰는 지점은 **0건**이다(테스트로 고정).

---

## 4. 대상 서비스에서의 반려 동작

| 항목 | 결과 |
|---|---|
| 대상 서비스 membership | `rejectMembership` 으로 `rejected` 전이 + 스코프 내 role 비활성화 |
| 서비스 접근 차단 성립 | ✅ `membership-guard.middleware` 가 `membership.status !== 'active'` 를 403 으로 막는다 (`:107`) |
| 목록 표시 | ✅ 불변 — `getMembers` 는 이미 **membership status 를 users.status 보다 우선** 사용한다(`:223` `effectiveStatus`). 전역 write 에 의존한 적이 없다 |
| `isActive` 표시 의존 | ✅ 없음 — 회원 UI 의 `isActive` 사용처는 **역할(role) 필터 1곳**뿐(`CommonEditUserModal.tsx:212`), 사용자 계정과 무관 |
| 스코프에 대상 없음 | 404 (`suspend` 분기와 동일 계약) |
| 프런트 변경 | **0건** — URL·payload·응답 형태 불변 |

---

## 5. 다른 서비스 불변 검증

신규 테스트 `MembershipConsoleController.crossServiceIsolation.test.ts` (14/14 PASS).
판정 계약을 **"비활성화 방향에서 `UPDATE users` SQL 이 한 번도 나가지 않는다"** 로 고정했다.

| 검증 항목 | 케이스 | 결과 |
|---|---|---|
| 대상 서비스 로그인 차단 | 반려 시 `rejectMembership` 위임 확인 (membership → `rejected`) | ✅ |
| 다른 서비스 로그인 정상 | 반려·중지·탈퇴·되돌림 전 경로에서 `UPDATE users` 0건 | ✅ |
| 다른 서비스 Membership 불변 | 조회·갱신 SQL 이 `service_key = ANY($n)` + `serviceKeys` 파라미터로 한정됨을 단언 | ✅ |
| 다른 서비스 Role 불변 | `rejectMembership` 에 `serviceKeys` 전달 확인 (서비스 내부에서 스코프 내 role 만 비활성화 — 기존 테스트 14건 통과) | ✅ |
| 다른 서비스 기존 세션 정상 | `users.isActive=false` write 0건 → `requireAuth` 의 `USER_INACTIVE` 401 미발생 | ✅ (SQL 부재로 증명) |
| users 공통 상태 불변 | 반려/중지/탈퇴/되돌림/잘못된 상태 전부 `usersWrites() === []` | ✅ |
| 플랫폼 계정 전체 정지 보존 | 승인 fallback 이 `suspended` 를 화이트리스트에서 제외 — 되살리지 않음 | ✅ |

> **정직한 한계**: 5번(기존 세션)은 "차단을 유발하는 SQL 이 발생하지 않음"으로 증명했다.
> 다중 서비스 실계정으로 세션을 띄운 상태의 프로덕션 E2E 는 수행하지 않았다 (운영 데이터 write 금지 범위).

---

## 6. 플랫폼 계정 전체 통제 보존

| 경로 | 상태 |
|---|---|
| `DELETE /operator/members/:userId?mode=soft\|hard` → `approvalService.deleteMember` | **무변경**. `hard` 는 `scope.isPlatformAdmin` 필수 |
| admin users API (`PUT /api/v1/admin/users/:id`) | **무변경** (O4O-CORE-FREEZE §2.3) |
| `POST /operator/members/:userId/reactivate` | **무변경** — §8-2 잔여 |

계정 전체 정지·삭제 수단은 그대로 남아 있으며, 이번 변경은 **서비스 운영자 경로에서만** 전역 write 를 걷어냈다.

---

## 7. 테스트와 게이트

```
신규: apps/api-server/src/controllers/operator/__tests__/
      MembershipConsoleController.crossServiceIsolation.test.ts   → 14 passed

기존 회귀: npx jest src/services/approval                          → 14 passed
전체:     cd apps/api-server && npx jest --maxWorkers=1            → exit 0
타입:     npx tsc --noEmit -p tsconfig.json                        → exit 0
린트:     node scripts/lint-ratchet.mjs → ESLint 102 errors (baseline 102 유지)
```

> worktree 부트스트랩: `pnpm install` → `pnpm run build:packages` → `pnpm --filter '@o4o/api-server^...' run build` 선행.
> 이 순서를 건너뛰면 `@o4o/ui` TS2307 오진이 난다.

---

## 8. 잔여 위험 3건 — 이번 범위 밖, 결정 필요

### 8-1. 서비스 운영자가 `users.password` 를 변경할 수 있다 🔴

```
apps/api-server/src/controllers/operator/MembershipConsoleController.ts:932
  UPDATE users SET password = $1 WHERE id = $2      ← PUT /operator/members/:userId { password }
```

**라이브 UI 에서 도달 가능**:
- `services/web-glycopharm/src/pages/operator/UsersPage.tsx:107` (운영자 화면)
- `services/web-glycopharm/src/pages/admin/GlycoPharmAdminMembersPage.tsx:105`
- 공통 `packages/operator-core-ui/.../OperatorMembersConsolePage.tsx:189` (`비밀번호 변경` 행 액션)

WO 확정 원칙 **"서비스 운영자는 사용자 계정 전체나 비밀번호를 관리하지 않는다"** 에 정면 위반이다.
`users.password` 는 serviceKey 없는 로그인과 credential 없는 모든 서비스의 로그인을 좌우하므로 cross-service 영향이 있다.

**이번에 막지 않은 이유**: 반려 경로와 직접 연결돼 있지 않고, 최소 2개 서비스의 라이브 기능을 끊는다.
무엇으로 대체할지(admin 전용? platform 전용? 재설정 링크 발송?)는 정책 결정이다.

### 8-2. 서비스 운영자의 재활성화가 플랫폼 정지를 해제할 수 있다 ⚠️

```
apps/api-server/src/services/approval/MembershipApprovalService.ts:764-767
  UPDATE users SET status='active', "isActive"=true
  WHERE id = $1 AND status IN ('suspended', 'deleted')
```

`POST /operator/members/:userId/reactivate` 는 서비스 운영자도 호출할 수 있다.
가드가 `('suspended','deleted')` 로 **정확히 플랫폼 차단 상태만** 겨냥하므로, 서비스 운영자가
플랫폼 관리자의 정지를 해제하게 된다. 활성화 방향이라 타 서비스를 차단하지는 않지만 권한 경계 문제다.

**이번에 바꾸지 않은 이유**: 서비스 계층 공통 계약이라 소비처가 넓고, "재활성화"의 업무 의미
(서비스 복귀인가, 계정 복구인가)가 확정되지 않았다 — WO 중지 조건 "반려·중지·탈퇴의 현재 업무 의미가 충돌".

### 8-3. `withdrawn` 의 의미가 두 경로로 갈린다 ⚠️

| 경로 | 스코프 | 결과 |
|---|---|---|
| `PATCH /:userId/status { status:'withdrawn' }` | membership | 이번 변경으로 서비스 범위 탈퇴 |
| `DELETE /:userId?mode=soft` | 전역 | `users.status='deleted', isActive=false` |

둘 다 UI 에서 "탈퇴"로 노출된다. 이번에는 전자만 membership 축으로 정리했고 후자는 손대지 않았다.
또한 `withdrawn` 전이는 **스코프 내 role 을 비활성화하지 않는다**(반려·중지와 다름) —
서비스 접근은 membership guard 가 막지만 role 잔존은 남는다. 의미 확정 후 정비 권장.

---

## 9. 금지사항 준수

- ❌ 서비스별 비밀번호 변경 — 하지 않음 (`service_credentials` 무접촉)
- ❌ 인증 구조 전면 개편 — 하지 않음 (`auth-login` · `requireAuth` 무변경)
- ❌ JWT·refresh token·role-cache 정비 — 하지 않음 (별도 감사로 분리됨)
- ❌ Membership 테이블·상태 체계 재설계 — 하지 않음 (기존 status 값만 사용, schema 변경 0)
- ❌ 신규 공통 추상화 — 하지 않음 (상수 1개 + 기존 서비스 호출)
- ❌ 운영 DB 임의 보정 — 하지 않음 (DB write 0, migration 0)
- ❌ main 병합 — 하지 않음

---

## 10. Git

| 항목 | 값 |
|---|---|
| worktree | `C:/tmp/o4o-identity-v2` |
| 브랜치 | `fix/service-membership-rejection-cross-service-isolation` (`origin/main` `b6e56e724` 기준) |
| 변경 | `MembershipConsoleController.ts` 1개 + 신규 테스트 1개 + 본 CHECK |
| migration | **0건** |
| main 병합 | ❌ |
