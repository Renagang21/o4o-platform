# CHECK-O4O-OPERATOR-SERVICE-CREDENTIAL-PASSWORD-CHANGE-AND-DOC-ALIGNMENT-V1

> WO: `WO-O4O-OPERATOR-SERVICE-CREDENTIAL-PASSWORD-CHANGE-AND-DOC-ALIGNMENT-V1`
> 대상: 운영자의 회원 비밀번호 변경을 Identity V2 서비스별 credential 로 연결 + V1/V2 문서 현행화
> 브랜치: `fix/operator-service-credential-password-change` (`origin/main` = `e6157fedc` 기준)
> 상태: **구현·문서 정비 완료 · 게이트 GREEN**

---

## 0. 결론 요약

| 항목 | 결과 |
|---|---|
| `users.password` 잔여 write 제거 (운영자 경로) | ✅ |
| 대상 서비스 `service_credentials` 만 갱신 | ✅ |
| 운영 계층 권한 (member < operator < admin < platform) | ✅ 상위만 하위 변경 |
| 전 서비스 일괄 변경 경로 | ✅ 없음 (모호하면 400) |
| credential row 부재 시 해당 서비스 row 생성 | ✅ upsert |
| 본인 변경(`PUT /users/password`) | ✅ **무변경** |
| 문서 정비 4건 | ✅ |
| 테스트 | 신규 14 케이스 |
| 게이트 | tsc / 전체 jest 77 suites·1289 tests / lint ratchet GREEN |
| 프런트·schema·migration·DB write | **0건** |

### 정정 기록

이 작업 직전까지 본인(Claude)은 이 경로를 **"제거 대상"** 으로 보고했다
(`CHECK-...-SERVICE-PASSWORD-COMPLEXITY-AND-MEMBERSHIP-BOUNDARY-AUDIT-V1` §4-2 #1 등).
그 판단은 Identity V2 의 **구현 완료 상태를 반영하지 못한 것**이었다.
서비스별 비밀번호는 폐기 대상이 아니라 이미 채택·구현·검증된 구조이며,
누락된 것은 **운영자의 타인 변경 경로가 V2 에 연결되지 않은 것**뿐이었다. 방향을 정정해 반영했다.

---

## 1. 기존 `users.password` 잔여 write

```
apps/api-server/src/controllers/operator/MembershipConsoleController.ts
  updateMember()  (수정 전)

    if (password) {
      const hashedPassword = await hashPassword(password);
      await AppDataSource.query(
        `UPDATE users SET password = $1, "updatedAt" = NOW() WHERE id = $2`, ...);
    }
```

**왜 사일런트 무효였나** — 로그인 판정은 `auth-login.service.ts` 의
`targetHash = credentialHash ?? user.password` 다. `serviceKey` 가 오고 해당 credential 이 있으면
`users.password` 를 **보지 않는다**. 따라서 credential 보유 회원에게는:

- 운영자는 200 성공 응답을 받는다
- 그 서비스 로그인 비밀번호는 **바뀌지 않는다**
- 다른 서비스 비밀번호가 바뀌는 것도 아니다

Phase 2 에서 **본인 변경**(`PUT /users/password`)만 서비스 범위로 전환되고
**운영자의 타인 변경**이 누락된 결과다.

---

## 2. 운영자 계층별 대상 권한

계층 판정 축은 기존 `isOperationalRole` 과 동일하다 — role 의 마지막 세그먼트(`operator`/`admin`/`super_admin`).

```
rank: member(0) < operator(1) < admin(2) < platform(3)
허용 조건: rank(caller) > rank(target)        ← 동급·상위 변경 금지
```

| 호출자 | 허용 대상 | 차단 대상 |
|---|---|---|
| operator | 자기 서비스 회원 | 다른 operator · admin · platform |
| admin | 자기 서비스 operator · 회원 | 다른 admin · platform |
| 플랫폼 관리자 | 명시한 서비스의 admin · operator · 회원 | platform 계정 |

`platform:super_admin` 대상은 **누구도** 변경할 수 없다 — 플랫폼 계정은 별도 경로의 책임이다.

---

## 3. 적용한 serviceKey 결정 방식

**전 서비스 일괄 변경 경로를 만들지 않는다.** 대상이 모호하면 변경 대신 거절한다.

```
1) body.serviceKey (또는 body.membershipServiceKey) 가 있으면 그것
   └ 서비스 운영자는 scope.serviceKeys 에 포함되어야 함 → 아니면 403 SERVICE_SCOPE_FORBIDDEN
2) 없고, 서비스 운영자이며 scope.serviceKeys 가 정확히 1개 → 그 키로 확정
3) 그 외(복수 서비스 운영자 · 플랫폼 관리자) → 400 SERVICE_KEY_REQUIRED
4) 대상이 그 서비스 회원이 아니면 → 404 SERVICE_NOT_MEMBER
```

`scope.serviceKeys` 가 배열이라는 점이 핵심이다. 기존 role 변경 코드처럼
`scope.serviceKeys[0]` 로 **첫 키를 조용히 고르지 않는다** — 비밀번호는 잘못 고르면 복구가 어렵다.

---

## 4. `service_credentials` 변경 결과

```sql
INSERT INTO service_credentials (user_id, service_key, password_hash, created_at, updated_at)
VALUES ($1, $2, $3, NOW(), NOW())
ON CONFLICT ON CONSTRAINT "uq_service_credentials_user_service"
DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW()
```

- 정확히 1 row (`user_id`, `serviceKey`) 만 대상
- row 가 없으면 생성 (실행 5) — 스키마에 `id DEFAULT gen_random_uuid()` 와
  `uq_service_credentials_user_service UNIQUE(user_id, service_key)` 가 있어 안전
- `users.password` · 다른 서비스 credential 무접촉

---

## 5. 다른 서비스·`users.password` 불변 검증

신규 `MembershipConsoleController.servicePassword.test.ts` (14/14 PASS).
판정 계약: **`UPDATE users SET password` SQL 이 한 번도 나가지 않는다** + **credential write 는 정확히 1건**.

| WO 검증 항목 | 케이스 | 결과 |
|---|---|---|
| KPA 운영자가 KPA 회원 비밀번호 변경 | operator → member 허용, credential 1건 | ✅ |
| KPA 새 비밀번호 로그인 성공 / 옛 비밀번호 실패 | credential upsert 파라미터 단언 (`[userId, serviceKey, hash]`) | ⚠️ 간접 — §5-1 |
| 같은 사용자의 다른 서비스 기존 비밀번호 로그인 성공 | credential write 가 대상 serviceKey 1건뿐임을 단언 | ✅ |
| `users.password` 불변 | `UPDATE users SET password` 0건 | ✅ |
| 다른 서비스 credential 불변 | write 1건 · serviceKey 일치 단언 | ✅ |
| 다른 서비스 회원 변경 차단 | 403 `SERVICE_SCOPE_FORBIDDEN` / 404 `SERVICE_NOT_MEMBER` | ✅ |
| operator 가 다른 operator 변경 불가 | 403 `INSUFFICIENT_OPERATOR_TIER` | ✅ |
| admin 의 자기 서비스 operator 변경 가능 | credential 1건 | ✅ |
| (추가) 플랫폼 관리자 → 서비스 admin | 허용 | ✅ |
| (추가) 플랫폼 계정 대상 | 차단 | ✅ |
| (추가) 복수 서비스·플랫폼 관리자 serviceKey 미지정 | 400 | ✅ |
| (추가) password 미포함 요청 | credential·users write 0건 | ✅ |

### 5-1. 정직한 한계

"새 비밀번호로 로그인 성공 / 옛 비밀번호로 실패"는 **실 로그인 E2E 로 검증하지 않았다.**
테스트는 "올바른 serviceKey 의 credential 에 새 해시가 upsert 된다"까지만 증명한다.
그 뒤 로그인이 그 해시를 쓴다는 것은 `auth-login.service.ts` 의 기존 계약
(`credentialHash ?? user.password`)과 Phase 2 운영 E2E 결과에 의존한다.
실 계정 E2E 는 운영 데이터 write 가 필요해 수행하지 않았다.

---

## 6. 본인 변경 회귀검증

`PUT /users/password` (`modules/user/controllers/user.controller.ts`) — **코드 변경 0건.**
`serviceKey` 를 받아 credential 만 갱신하는 Phase 2 계약 그대로다.
5개 서비스 프런트가 모두 `serviceKey` 를 동봉하는 것도 확인된 상태다(선행 조사).
본 WO 는 이 경로를 건드리지 않았고, 전체 jest 77 suites 통과로 회귀 없음을 확인했다.

---

## 7. 수정한 Canonical · Legacy · 운영 표준 문서

| 문서 | 변경 |
|---|---|
| `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V2.md` | "구현은 미진행 / V1 공통 password 가 동작 중" → **현행화**. 구현 완료·미연결 범위를 표로 분리, Phase 표에 Phase 1·2 완료 + Phase 2-A 추가, Phase 2 운영 E2E 결과 기록 |
| `docs/architecture/O4O-IDENTITY-ARCHITECTURE-V1.md` | "현재 코드 베이스의 실제 동작을 정확히 기술" → **역사적 Legacy 로 정정**. 잔여 설명 범위를 3개(무-serviceKey 로그인 / credential 없는 서비스 fallback / 미연결 관리자 경로)로 한정 |
| `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md` | **§3-3 신설** — 서비스별 비밀번호 권한 표 + 구현 규칙 5개 + 관리자 경로 예외 명시 |
| `docs/checks/CHECK-O4O-ADMIN-PASSWORD-RESET-SERVICE-CREDENTIAL-SCOPE-CLARIFY-V1.md` | 상단에 **SUPERSEDED FOR POLICY** 배너. 실측 결과·당시 코드 동작 기록은 **무변경**, 대체 범위를 운영자 경로로 한정 |

**과거 CHECK 의 실측 결과는 변조하지 않았다** — 대체되는 것은 정책(앞으로의 방침)뿐이다.

---

## 8. 남은 것 (이번 범위 밖)

| # | 항목 |
|---|---|
| 1 | **관리자 계정 재설정 경로 미연결** — `PUT /admin/users/:id`, `PATCH /admin/platform-accounts/:id/password`, 운영 스크립트 4종이 여전히 `users.password` 만 갱신. 운영자 경로와 계약이 갈린 상태다 |
| 2 | Identity V2 Phase 4 (기존 사용자 credential backfill) · Phase 5 (`users.password` deprecation) |
| 3 | 프런트 UI 안내 — 현재 "비밀번호 변경" 모달은 어느 서비스 비밀번호인지 표시하지 않는다. 복수 서비스 운영자는 `serviceKey` 미전송 시 400 을 받으므로 UI 보완 필요 |

> 3번은 본 변경으로 **새로 생긴 제약**이다. 단일 서비스 운영자(현재 라이브 UI 대부분)는 영향이 없으나,
> 복수 서비스 운영자·플랫폼 관리자가 이 모달을 쓰면 400 이 뜬다. 프런트 WO 로 분리한다.

---

## 9. 금지사항 준수

- ❌ credential 을 `users.password` 와 동기화 — 하지 않음
- ❌ 모든 서비스 credential 일괄 변경 — 경로 자체를 만들지 않음(모호하면 400)
- ❌ 서비스별 비밀번호 구조 제거 — 하지 않음 (오히려 연결)
- ❌ Identity·Membership·Role 재설계 — 하지 않음 (schema·enum 불변)
- ❌ 기존 본인 변경 제거 — 무변경
- ❌ 과거 CHECK 결과 사후 변조 — 하지 않음 (정책 대체 배너만 추가)
- ❌ 운영 DB 일괄 보정 — 하지 않음 (DB write 0)
- ❌ main 병합 — 하지 않음

---

## 10. Git · 병합

| 항목 | 값 |
|---|---|
| 브랜치 | `fix/operator-service-credential-password-change` (`origin/main` `e6157fedc` 기준) |
| 변경 | 컨트롤러 1 + 신규 테스트 1 + 문서 4 + 본 CHECK |
| migration | **0건** |
| main 병합 | ❌ |

### 10-1. 기존 미병합 브랜치와의 병합 충돌 실측

본 브랜치는 `MembershipConsoleController.ts` 를 수정한다. 같은 파일을 고치는
`fix/service-membership-rejection-cross-service-isolation`(반려 격리)와 겹칠 수 있어
`git merge-tree --write-tree` 로 확인했다 — **3쌍 전부 충돌 0**:

```
rejection            x 본 브랜치 → exit 0   (같은 파일, 다른 메서드: updateMemberStatus vs updateMember)
reactivation-boundary x 본 브랜치 → exit 0
soft-delete-boundary  x 본 브랜치 → exit 0
```

병합 순서는 무관하다. 병합 후 `npx jest src/controllers/operator src/services/approval` 로
5개 테스트 파일이 함께 통과하는지 확인하면 된다.
