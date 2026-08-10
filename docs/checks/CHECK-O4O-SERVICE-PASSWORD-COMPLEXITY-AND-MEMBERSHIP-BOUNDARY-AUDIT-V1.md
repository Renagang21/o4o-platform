# CHECK-O4O-SERVICE-PASSWORD-COMPLEXITY-AND-MEMBERSHIP-BOUNDARY-AUDIT-V1

> WO: `WO-O4O-SERVICE-PASSWORD-COMPLEXITY-AND-MEMBERSHIP-BOUNDARY-AUDIT-V1`
> 대상: ① 서비스별 비밀번호 구조의 실제 복잡성 측정 ② 서비스별 Membership·Role 통제의 독립성 검증
> 브랜치: `audit/service-password-complexity-and-membership-boundary` (worktree `C:/tmp/o4o-identity-v2`, `origin/main` = `c67e05104` 기준)
> 상태: **조사 완료 · 코드 0 · DB write 0** — A 판정에서 중지 조건 2건 충족

---

## 0. 판정 요약

| 축 | 판정 | 한 줄 근거 |
|---|---|---|
| **A. 서비스별 사용 통제** | 🔴 **CROSS_SERVICE_RISK** | 서비스 운영자의 "반려" 1회가 `users.status`·`isActive` 를 바꿔 **다른 서비스 로그인과 진행 중 세션까지 즉시 차단**한다 |
| **B. 서비스별 비밀번호** | 🟡 **REDESIGN_REQUIRED** | 요구는 유효(2026-05-23 공식 채택된 아키텍처 원칙 4). 복잡성의 대부분은 **Identity V2 Phase 4·5 미완주로 인한 과도기 이중 운영**이며, 설정 UI 부재로 분기가 "사고성"으로 발생한다 |

**두 축은 실제로 독립적이다.** 코드상 membership 판정(`SERVICE_NOT_MEMBER`)은 credential 조회보다 **먼저** 실행되고 서로를 참조하지 않는다 → 비밀번호를 단일화해도 서비스별 사용 통제는 그대로 유지된다(§8).
즉 A 의 위험은 비밀번호 구조 때문이 아니라 **회원 상태 write 의 스코프 누락** 때문이다.

---

## 1. 현재 계정·인증·Membership·Role 구조

| 계층 | 저장소 | 스코프 | 비고 |
|---|---|---|---|
| Identity | `users` | **전역** | `password` · `status` · `isActive` |
| Credential (L2) | `service_credentials` | `(user_id, service_key)` | Identity V2 L2. `UNIQUE(userId, serviceKey)` |
| Membership | `service_memberships` | `(user_id, service_key)` | 가입 상태 SSOT |
| Role | `role_assignments` | 역할 문자열에 service prefix | RBAC SSOT (F9) |

### 1-1. Identity V2 진행 단계 (공식 로드맵 대비)

`DECISION-O4O-IDENTITY-ARCHITECTURE-V2-ADOPTION-V1` (2026-05-23, **ADOPTED**) 의 6단계 중:

| Phase | 내용 | 현 상태 |
|---|---|---|
| 0 | V2 모델 합의 | ✅ 완료 |
| 1 | `service_credentials` 신설 | ✅ 완료 |
| 2 | login/register/change/reset dual-read | ✅ 완료 |
| 3 | 신규 가입자는 credential 만 사용 | ⚠️ **부분** — credential 은 만들되 `users.password` 도 계속 씀 |
| 4 | 기존 사용자 credential backfill | ❌ 미착수 |
| 5 | `users.password` deprecation·제거 | ❌ 미착수 |

**현재 관측되는 복잡성의 대부분은 "Phase 2·3 에서 멈춘 이중 운영" 그 자체다.** 설계 결함이 아니라 미완결 마이그레이션이다.

---

## 2. 로그인과 비밀번호 선택·fallback 계약

`apps/api-server/src/services/auth/auth-login.service.ts`

```
[169-185] serviceKey 있음 → service_memberships 존재 확인       ← Membership 게이트 (credential 무관)
          (platform:super_admin / super_admin 은 우회)
[187-199] serviceKey 있음 → service_credentials 조회
[203-206] credential 도 users.password 도 없음 → SocialLoginRequiredError
[215]     targetHash = credentialHash ?? user.password           ← 단 1회 bcrypt 비교
```

| 입력 | 검증 대상 |
|---|---|
| serviceKey 없음 | `users.password` |
| serviceKey + credential 있음 | `credential.password_hash` (**users.password 로 fallback 하지 않음**) |
| serviceKey + credential 없음 | `users.password` |

- 비밀번호 비교 횟수 = **1회** (서비스 수와 무관)
- fallback 규칙 = **1개** (`?? users.password`)
- 동기화 규칙 = **0개** (설계상 동기화하지 않음)
- credential 코드에 **서비스명 조건문 0개** (serviceKey 파라미터화)

---

## 3. 서비스별 비밀번호가 추가한 실제 코드 경로 (전수)

### 3-1. 읽기 1곳 · 쓰기 4곳이 전부다

| # | 경로 | 위치 | 규모 | 동작 |
|---|---|---|---|---|
| R1 | 로그인 | `auth-login.service.ts:187-216` | ~13 L | credential 조회 + fallback |
| W1 | 신규 가입 | `auth-register.controller.ts:513` | ~8 L | `users.password` 와 **같은 해시**로 생성 |
| W2 | 기존 계정의 타 서비스 가입 | `auth-register.controller.ts:205` | ~9 L | `servicePassword ?? password` 로 upsert |
| W3 | 비밀번호 변경(serviceKey 동봉) | `user.controller.ts:190-210` | ~21 L | credential 만 갱신 |
| W4 | 재설정(토큰에 serviceKey) | `passwordResetService.ts:145-157` | ~13 L | credential 만 갱신 |

부속: 엔티티 1개(`ServiceCredential`, 50 L) + migration 1개 + DTO 필드 1개(`servicePassword`).

### 3-2. 나머지 영역은 **증분 0** (측정 결과)

| 영역 | 서비스별 비밀번호로 인한 추가 분기 |
|---|---|
| 회원가입 폼 | **0** — `servicePassword` 를 보내는 프런트가 **한 곳도 없다** (§4-1) |
| 로그인 프런트 | **0** — `serviceKey` 는 membership 검증 때문에 어차피 보낸다 |
| 변경·재설정 프런트 | **0** — 동일 이유. 5개 서비스 전부 이미 `serviceKey` 동봉 |
| 세션 | **0** — `SessionSyncService.createSession(user, sessionId, metadata)` 에 serviceKey 없음 (전역) |
| 실패·잠금 | **0** — `handleFailedLogin` 은 `users.loginAttempts` 전역 |
| 감사 | **0** — `account_activities` 에 serviceKey 없음 |
| 관리자 화면·API | **0** — credential 을 다루는 관리자 API 자체가 없다 (그래서 §5-1 결함 발생) |
| 테스트 | **0** — credential 관련 테스트 **0건** |

> **핵심 측정치**: 비밀번호는 서비스별인데 **잠금·세션·감사는 전역**이다. 축이 어긋나 있다.

---

## 4. 본질적 복잡성 vs 제거 가능한 불필요한 복잡성

### 4-1. `servicePassword` 는 UI 가 없다 — 분기가 "사고성"으로 발생

```
apps/api-server/src/modules/auth/dto/register.dto.ts:46   servicePassword?: string
apps/api-server/src/.../auth-register.controller.ts:188   data.servicePassword ?? data.password
→ services/**  전송하는 프런트: 0곳
```

사용자가 **의도적으로** 서비스별 비밀번호를 지정할 수단이 없다. 실제로는 각 가입 폼에 입력한 값이
조용히 그 서비스 전용 credential 이 된다. 그 결과가 지난 WO 에서 확인된 상태다 —
테스트 계정 1개가 **5개 서비스 모두 서로 다른 credential** 을 갖고 있었고, 아무도 그렇게 의도하지 않았다.

**원칙 4 는 유효하지만, 그것을 사용자가 행사할 UI 가 없다.** 이것이 B 판정의 핵심이다.

### 4-2. 제거 가능한 불필요한 복잡성 5건 (기능을 유지하면서)

| # | 항목 | 위치 | 성격 |
|---|---|---|---|
| 1 | **관리자 비밀번호 재설정이 credential 을 갱신하지 않아 무효** | `AdminUserController.ts:275,379` · `routes/admin/platform-accounts.routes.ts:114` · 운영 스크립트 4종 | 사일런트 실패 — 관리자는 성공 응답을 받는다 |
| 2 | `servicePassword` DTO 필드가 UI 없이 존재 | `register.dto.ts:46` | 사실상 dead — 제거하거나 UI 구현 |
| 3 | 탈퇴·삭제 시 credential 미정리 | `MembershipApprovalService` soft delete(1182·1195) 는 `users` 만 갱신 | 재가입 시 옛 credential 잔존(upsert 로 덮이긴 함) |
| 4 | credential 로직 테스트 0건 | — | dual-read/dual-write 전 경로 무보증 |
| 5 | **로그인 rate-limit 이 사문화** | `auth-login.service.ts:27` 이 `services/LoginSecurityService.ts`(전 메서드 no-op stub, "DEFERRED" 주석)를 import. 실제 구현 `modules/auth/services/login-security.service.ts` 는 **아무도 import 하지 않는다** | 보안 — `isLoginAllowed` 가 항상 `{allowed:true}`. 남은 보호는 `users.loginAttempts>=5 → 30분` 뿐 |

> 5번은 서비스별 비밀번호와 무관하지만 "로그인 실패·잠금" 조사 항목에서 발견되어 기록한다.

### 4-3. 본질적 복잡성 (원칙 4 를 유지하는 한 남는 것)

- credential 조회 1회 + fallback 1규칙 → **작다**
- 사용자가 "어느 서비스에서 어떤 비밀번호를 쓰는지" 인지해야 하는 **인지 부담** → 이것이 진짜 비용이며, UI·안내로만 줄일 수 있다

---

## 5. 서비스 1개 추가 시 인증 관련 변경량 (실측)

Pharmacy-Hub 도입 커밋 `489f497de` (`WO-PHARMACY-HUB-NEW-SERVICE-FOUNDATION-V1`, 30 files / +1349 −16) 중 인증·권한:

| 파일 | 증분 | 성격 |
|---|---:|---|
| `apps/api-server/src/config/service-catalog.ts` | +25 | 서비스 키 등록 |
| `apps/api-server/src/middleware/pharmacy-hub-scope.middleware.ts` | +59 | 신규 — `createMembershipScopeGuard` config |
| `apps/api-server/src/bootstrap/register-routes.ts` | +11 | 라우트 등록 |
| roles / `ROLE_REGISTRY` · `security-core` ServiceKey union | (소) | 타입·역할 |
| `services/web-pharmacy-hub/src/contexts/AuthContext.tsx` | +113 | 프런트 인증 |
| `.../components/MembershipGate.tsx` | +63 | 프런트 게이트 |
| `.../lib/membershipGate.ts` | +37 | serviceKey 상수 |
| `.../pages/LoginPage.tsx` | +88 | 로그인 화면 |
| **`service_credentials` / 비밀번호 코드** | **0** | **변경 없음** |

**결론: 서비스별 비밀번호 비용은 서비스 수에 비례하지 않는다(고정 비용).**
서비스 추가 비용은 전부 membership·scope·프런트 골격 쪽이며, 그중 프런트 4파일(+301)은
이번에 완료한 `@o4o/auth-react` 공통화로 이미 줄어드는 중이다.

---

## 6. 서비스별 Membership·Role 독립성

| 조치 | 구현 | users 공통 상태 접촉 | 판정 |
|---|---|---|---|
| 가입 승인 (pending 존재) | `approveMembership` (원자 트랜잭션) | ⚠️ `UPDATE users SET status='active', isActive=true` (`:323`) | 전역 활성화 |
| 가입 승인 (pending 없음) | 콘솔 직접 SQL | ⚠️ 동일 (`MembershipConsoleController:548-554`) | 전역 활성화 |
| **이용 정지** | `suspendMembership` | ✅ **접촉 없음** — membership + scope 내 role 만 | **올바른 기준선** |
| **반려·기타 상태** | 콘솔 직접 SQL | 🔴 `UPDATE users SET status=$1, isActive=false` (`:597-601`, 배치 `:719`) | **전역 차단** |
| 재활성화 | `reactivateMembership` | ⚠️ `UPDATE users SET status='active', isActive=true` (`:765`) | 전역 활성화 |
| 탈퇴(soft delete) | `MembershipApprovalService:1182·1195` | ⚠️ `status='deleted', isActive=false` | 전역 차단 |
| Role 회수 (운영자) | `MembershipConsoleController:1265` `removeRole(userId, role)` | ✅ 역할 1개 한정 | **독립** |
| Role 회수 (관리자) | `AdminUserController:366·371` `removeAllRoles` | ⚠️ 전 서비스 역할 삭제 | admin 전용 |

`suspendMembership` 만 `WO-O4O-AUTH-RBAC-FINAL-CLEANUP-V2` 로 스코프 정비가 끝났고,
**나머지 경로는 같은 정비를 받지 못했다.** 코드 주석(`:558`)이 "Does NOT change users.status" 라고
말하는 것은 suspend 분기에만 해당한다.

---

## 7. 다른 서비스에 미치는 영향과 위험 (A 판정 근거)

### 7-1. 전파 경로 — 재현 가능한 구체 시나리오

```
GlycoPharm 운영자가 회원 목록에서 [반려] 클릭
  services/web-glycopharm/src/pages/operator/UsersPage.tsx:267  { label:'반려', status:'rejected' }
  → PATCH /api/v1/operator/members/:userId/status  { status:'rejected' }
  → MembershipConsoleController.updateMemberStatus
      checkServiceBoundary(userId, ['glycopharm'])   ← 대상 선택은 올바르게 제한됨
      rejectMembership(...)                          ← glycopharm membership 만 반려 (정상)
      UPDATE users SET status='rejected', isActive=false WHERE id=$2   ← 스코프 없음 🔴
  → 결과: 그 사용자의 KPA · K-Cosmetics · Neture · Pharmacy-Hub 로그인 전부 차단
```

**즉시성**: `requireAuth` 가 매 요청 `users` 를 조회하고 `if (!user.isActive) → 401 USER_INACTIVE`
(`common/middleware/auth/authentication.middleware.ts:122-142`) 를 수행하므로,
**진행 중인 다른 서비스 세션까지 즉시 끊긴다.** 토큰 만료를 기다리지 않는다.

`resolveAccountAccess` 기준 `inactive / suspended / rejected → blocked` (로그인·refresh·API 전부 차단).

### 7-2. 반대 방향 위험

`status='active'` 승인은 `UPDATE users SET status='active', isActive=true` 를 실행한다.
→ **한 서비스 운영자의 승인이 다른 서비스가 정지시킨 계정을 되살릴 수 있다.**

### 7-3. 영향 없는 항목 (확인 완료)

| 항목 | 결과 |
|---|---|
| 다른 서비스 Membership row | ✅ 영향 없음 — 반려/정지 모두 `service_key` 로 한정 |
| 다른 서비스 Role | ✅ 영향 없음 — 운영자 경로는 `removeRole(userId, role)` 단건 |
| 대상 사용자 선택 | ✅ `checkServiceBoundary` 로 자기 서비스 회원만 |
| 비밀번호 | ✅ 서비스 운영자 API 에 비밀번호 변경 계약 **없음** (WO 원칙과 일치) |

**요약: 운영자는 "누구를" 고르는 것은 올바르게 제한되지만, "무엇을 바꾸는가"에서 전역 컬럼을 건드린다.**

---

## 8. 두 축의 분리 검증 — 비밀번호를 단일화해도 사용 통제는 유지되는가

**YES.** 코드 근거:

1. Membership 게이트(`auth-login.service.ts:169-185`)는 credential 조회(`:187`)보다 **먼저** 실행되고,
   `SERVICE_NOT_MEMBER` 판정에 credential 을 전혀 참조하지 않는다.
2. `requireAuth` 이후의 서비스 접근 통제는 `require{Service}Scope` = `createMembershipScopeGuard` 로
   `service_memberships` + `role_assignments` 만 본다. credential 무관.
3. 프런트 `MembershipGate` 도 `user.memberships` 만 본다.

→ `service_credentials` 를 단일 비밀번호로 접어도 **가입 승인·정지·재활성화·Role 통제는 한 줄도 바뀌지 않는다.**
반대로 A 의 위험은 비밀번호를 어떻게 하든 **그대로 남는다.**

---

## 9. 판정

### A. 서비스별 사용 통제 — 🔴 CROSS_SERVICE_RISK

한 서비스 운영자의 반려·탈퇴·승인 조치가 `users.status`/`isActive` 를 통해 다른 서비스 로그인과
**진행 중 세션까지 즉시** 좌우한다. 라이브 UI(GlycoPharm·K-Cosmetics 운영자·관리자 화면)에서 도달 가능하다.

### B. 서비스별 비밀번호 — 🟡 REDESIGN_REQUIRED

| 기준 | 측정값 | 평가 |
|---|---|---|
| 로그인 시 비밀번호 검증 횟수 | 1회 | 양호 |
| fallback·동기화 규칙 수 | fallback 1 / 동기화 0 | 양호 |
| 변경·재설정 경로의 서비스별 분기 | 각 1분기 (`if serviceKey`) | 양호 |
| 서비스 추가 시 인증 핵심 코드 변경 | **0** | 양호 (고정 비용) |
| 서비스별 전용 API·화면 | 0 | 양호 |
| 세션·잠금·감사 분기 | 0 — **전역이라 비밀번호 축과 어긋남** | 불일치 |
| 테스트 조합 | **0건 작성됨** | 미흡 |
| 공용 인증 모듈 재사용 | 가능 (serviceKey 파라미터화) | 양호 |
| 유지보수·고객지원 부담 | **높음** — 설정 UI 부재로 분기가 사고성 발생, 관리자 재설정이 무효, 진단 수단 없음 | **불량** |

→ 코드는 작지만 **사용자가 기능을 행사할 수단이 없고, 관리자가 복구할 수단도 없다.**
요구(원칙 4)는 공식 채택되어 유효하므로 **폐지가 아니라 완성 또는 축소 결정**이 필요하다.

---

## 10. 가장 단순한 후속 정비안

우선순위 순. 각각 별도 WO 이며 본 CHECK 에서는 제안만 한다.

### P0 — A 위험 차단 (가장 시급)

`MembershipConsoleController` 의 users 전역 write 를 **suspend 와 같은 방식으로 통일**한다.

```
현재: 반려/기타 → UPDATE users SET status=$1, isActive=false   (스코프 없음)
제안: 반려/기타 → rejectMembership(...) 만 수행. users 는 건드리지 않는다
      계정 전체 차단이 필요하면 platform admin 전용 별도 API 로 분리
승인: 다른 서비스가 정지시킨 계정을 되살리지 않도록, users 활성화는
      "다른 서비스 membership 이 모두 비활성일 때만" 또는 platform admin 한정
```
근거: `suspendMembership` 이 이미 올바른 형태로 존재하므로 **새 설계가 아니라 나머지를 같은 형태로 맞추는 일**이다.

### P1 — 관리자 재설정 무효 해소 (§4-2 #1)

정책 결정 후 택1:
- (가) 현행 유지 + 관리자 응답·UI 에 "서비스 로그인에는 적용되지 않음" 명시
- (나) 관리자 재설정 시 해당 사용자 credential **삭제** → 다음 로그인은 `users.password` fallback (데이터 write, dry-run 필요)
- (다) 관리자가 serviceKey 를 지정해 해당 서비스 credential 만 재설정

### P2 — B 축 결정: Phase 완주 vs Phase 정지

| 선택 | 내용 |
|---|---|
| 완주 | Phase 3 완결(가입 UI 에 서비스 비밀번호 선택 노출) → Phase 4 backfill → Phase 5 `users.password` 제거. 이중 운영이 사라져 복잡성이 **감소** |
| 정지 | 원칙 4 를 "가능하지만 기본은 동일 비밀번호"로 재해석. credential 은 유지하되 항상 플랫폼 비밀번호와 함께 갱신 |

> 어느 쪽이든 **현재의 중간 상태(Phase 2·3 정체)가 가장 비싸다.**

### P3 — 부수 정비

- `LoginSecurityService` stub import 교체 → 로그인 rate-limit 복구 (**보안**)
- credential dual-read/dual-write 테스트 신설
- `servicePassword` DTO 필드 제거 또는 UI 구현
- 탈퇴 시 credential 정리

---

## 11. 중지 조건 · 금지사항 준수

### 충족된 중지 조건 2건 (그래서 제안까지만 하고 멈춤)

| 조건 | 근거 |
|---|---|
| 한 서비스의 상태 변경이 실제로 다른 서비스에 전파됨 | §7-1 |
| 서비스 운영자가 users 공통 계정 상태를 변경하는 계약이 발견됨 | §6 표 · `MembershipConsoleController:597-601` |

### 금지사항 준수

- ❌ 인증·Membership·Role 코드 수정 — 하지 않음 (변경 파일 0)
- ❌ DB·credential 변경 / 운영 데이터 write — 하지 않음 (SQL 미실행, API 호출 0)
- ❌ 비밀번호 유지·폐지 전제 — 하지 않음 (측정 후 판정)
- ❌ 서비스별 사용 통제 제거 제안 — 하지 않음 (오히려 강화 제안)
- ❌ 이용 중지를 users 전체 비활성화로 대체 — 그 반대를 지적함
- ❌ 비밀번호·토큰·해시 출력 — 없음
- ❌ 추상적 "복잡하다" 결론 — 파일·라인·커밋 단위 수치로 제시
- ❌ main 병합 — 하지 않음

---

## 12. Git

| 항목 | 값 |
|---|---|
| worktree | `C:/tmp/o4o-identity-v2` (직전 Identity V2 조사와 공유) |
| 브랜치 | `audit/service-password-complexity-and-membership-boundary` (`origin/main` `c67e05104` 기준) |
| 코드 변경 | **0건** |
| DB / 운영 데이터 | **접근 0** — 본 조사는 전부 정적 코드·git 이력 근거 |
| main 병합 | ❌ |
