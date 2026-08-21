# CHECK — O4O Service Credential Orphan Lifecycle Integrity Audit V1

- **WO**: `WO-O4O-SERVICE-CREDENTIAL-ORPHAN-LIFECYCLE-INTEGRITY-AUDIT-V1`
- **작성일**: 2026-08-21
- **선행 WO**: `WO-O4O-KPA-OPERATOR-SERVICE-CREDENTIAL-INTEGRITY-AUDIT-AND-RECOVERY-V1` (부채 #1 = 본 WO)
- **판정**: **B — membership hard delete 시 해당 서비스 credential 폐기가 canonical** (live 결함 1건 수정)
- **로그인 우회**: **0건** (실측)
- **production 데이터 변경**: **0건** (기존 orphan 28행은 `SAFE_DELETE` 로 분류하되 삭제 미실행 — §11)

> 보안 규칙(§14) 준수: 평문 비밀번호 · 전체 password hash · reset token · session/token 을 본 문서에 남기지 않는다.
> credential 은 **존재 여부 · 알고리즘 prefix · timestamp** 수준으로만 기록한다.

---

## 1. 조사 방법

| 채널 | 내용 |
|---|---|
| Production DB (read-only) | Cloud SQL Auth Proxy 경유 `o4o_platform` — SELECT 만 수행 |
| 코드 정적 분석 | `service_credentials` / `service_memberships` write-path 전수 grep |
| Jest | 계약 테스트 2 파일 신규 (16 tests) + 기존 회귀 |

---

## 2. §4 Production Census (2026-08-21 실측 — 과거 수치 재사용 없음)

`service_credentials` 총 **58행**, 알고리즘 prefix 전량 `$2a$` (bcrypt), `(user_id, service_key)` 중복 **0건**.

### 2-1. 분류

| 분류 | 행 수 | 설명 |
|---|---:|---|
| `NO_MEMBERSHIP` | **28** | 해당 user 에게 membership row 가 **하나도** 없다 |
| `USER_INACTIVE` | 16 | membership 은 있으나 `users.status` 가 active/approved 가 아님 |
| `ACTIVE_MEMBERSHIP` | 14 | 정상 (user active + 같은 서비스 membership active) |
| `INACTIVE_MEMBERSHIP` | 0 | (USER_INACTIVE 에 흡수 — 아래 2-2 참조) |
| `UNKNOWN_SERVICE_KEY` | 0 | service_key 는 5개 canonical 키뿐 |
| `DUPLICATE / CONFLICT` | 0 | UNIQUE 제약 유지 |

### 2-2. membership 보유 30행의 상태 조합

| users.status | 같은 서비스 membership.status | 행 수 |
|---|---|---:|
| suspended | active | 15 |
| active | active | 14 |
| pending | rejected | 1 |

`credential 은 있는데 그 서비스의 membership 만 없는` 교차 케이스는 **0건**이다.

### 2-3. 서비스별 분포

| service_key | credential | 그중 orphan |
|---|---:|---:|
| pharmacy-hub | 16 | 7 |
| neture | 13 | 6 |
| kpa-society | 12 | 7 |
| glycopharm | 10 | 6 |
| k-cosmetics | 7 | 2 |

orphan 은 특정 서비스에 편중되지 않는다 → **서비스별 write-path 문제가 아니라 공통 lifecycle 문제**(§8 판정).

---

## 3. §5 Orphan Provenance (28행 · UNKNOWN 0)

### 3-1. 공통 관측 사실

- 28행 전부 `users.status='deleted'` · `isActive=false` 계정 소유.
- 해당 user 들의 `service_memberships` 행 수 = **0** (전 서비스).
- production 의 `users.status='deleted'` 계정 32명 중 **membership 보유 0명**, credential 보유 23명.
- credential `created_at` 은 26행이 `users."createdAt"` 과 **동일 초(±3s)** — 가입 트랜잭션 산물.
  나머지 2행(1 user)은 이후 시점 — 기존 계정의 **서비스 추가 가입** 산물.

### 3-2. 결정적 근거 (코드)

1. 가입 경로(`auth-register.controller.ts` 신규/기존 사용자 두 분기)는 **같은 트랜잭션**에서
   `service_memberships` + `service_credentials` 를 함께 생성한다 →
   credential 이 있었다면 **membership 도 반드시 있었다**.
2. `users.status='deleted'` 를 쓰는 경로는 `MembershipApprovalService.deleteMember` 뿐이다.
   - soft 분기: membership 을 `withdrawn` 으로 **남긴다** → 관측된 "membership 0행" 과 불일치.
   - hard 분기: `DELETE FROM service_memberships` 후 잔여 0이면 `users.status='deleted'` → **일치**.
3. `AdminUserController.deleteUser` 의 `userRepo.remove()` 는 FK `ON DELETE CASCADE` 로
   credential 까지 함께 지운다 → orphan 생성 경로가 아니다.
4. hard 분기는 종전 구현에서 `service_credentials` 를 **한 번도 읽거나 쓰지 않았다**.

### 3-3. 판정

| provenance | 행 수 |
|---|---:|
| `LIFECYCLE_DELETE_GAP` (hard delete 가 credential 을 남김) | **28** |
| `EXPECTED_RETAINED` / `LEGACY_RESIDUE` / `LIFECYCLE_DISABLE_GAP` / `SERVICE_KEY_DRIFT` | 0 |
| `UNKNOWN` | **0** |

> 감사 로그로는 교차확인 불가하다. `account_activities` 에는 `login_email` 만, `audit_logs` 에는
> 이미지 관련 4종만 있어 **회원 삭제·credential 변경 이력이 남지 않는다** (부채 §9-2).

---

## 4. §6 Lifecycle Write-Path Census (미조사 0)

| # | 업무 동작 | 코드 경로 | service_memberships | service_credentials | role_assignments |
|---|---|---|---|---|---|
| 1 | 신규 가입 | `auth-register.controller.ts` (신규 user 분기) | INSERT `pending` | **INSERT**(users.password 와 동일 hash) | 없음(승인 시 부여) |
| 2 | 기존 계정의 서비스 추가 가입 | 같은 파일 (기존 user 분기) | INSERT `pending` | **UPSERT**(새 서비스 비밀번호) | 없음 |
| 3 | pharmacy-hub 가입 | `PharmacyHubJoinController` → 공통 register 경로 | (1)(2) 위임 | 위임 | 위임 |
| 4 | kpa-branch 가입 | `BranchJoinController` → 공통 register 경로 | (1)(2) 위임 | 위임 | 위임 |
| 5 | 가입 승인 | `MembershipApprovalService.approveMembership` | UPDATE `active` | **없음** | ACTIVATE(upsert) |
| 6 | 가입 반려 | `rejectMembership` | UPDATE `rejected` | **없음** | DEACTIVATE |
| 7 | 정지 | `suspendMembership` | UPDATE `suspended` | **없음**(의도 — 재활성 복구) | DEACTIVATE |
| 8 | 탈퇴 / 서비스 해제 | `withdrawMembership` | UPDATE `withdrawn` (users.status 무변경) | **없음**(의도) | DEACTIVATE(prefix 한정) |
| 9 | 재활성 | `reactivateMembership` | `suspended`·`withdrawn` → `active` | **없음**(의도 — 같은 비밀번호 복구) | ACTIVATE |
| 10 | 회원 삭제 (soft) | `deleteMember(mode='soft')` | UPDATE `withdrawn` | **없음**(의도) | DEACTIVATE |
| 11 | 회원 삭제 (hard) | `deleteMember(mode='hard')` | **DELETE**(서비스 범위) | **종전 없음 → 본 WO 에서 DELETE 추가** | DELETE(prefix 한정) |
| 12 | 운영자/회원 삭제 API | `MembershipConsoleController.deleteMember` | (10)(11) 위임 (hard 는 admin 전용) | 위임 | 위임 |
| 13 | admin 계정 생성 (신규 user) | `AdminUserController.createUser` | role prefix 기준 INSERT `active` | `targetServiceKey` 있으면 INSERT | assignRole |
| 14 | admin 계정에 서비스 부여 (기존 user) | 같은 파일 | 없으면만 INSERT (status 보존) | 있으면 `KEEP_EXISTING_CREDENTIAL`, 없으면 INSERT(비밀번호 필수) | assignRole |
| 15 | admin 사용자 삭제 | `AdminUserController.deleteUser` | FK CASCADE 로 삭제 | FK CASCADE 로 **함께 삭제** | CASCADE |
| 16 | 서비스 비밀번호 변경 | `user.controller.ts` (serviceKey 제공) | 없음 | UPDATE 해당 서비스만 | 없음 |
| 17 | 비밀번호 재설정 (V2) | `passwordResetService` (token.serviceKey) | 없음 | UPSERT 해당 서비스만 | 없음 |
| 18 | 운영자 콘솔 비밀번호 재설정 | `MembershipConsoleController` | 없음 | UPSERT 단일 serviceKey | 없음 |
| 19 | admin 플랫폼 비밀번호 재설정 | `platform-accounts.routes.ts` | 없음 | **없음**(users.password L1 만) | 없음 |

---

## 5. §7 재가입 · 부활(resurrection) 계약

| 시나리오 | 결과 | 판정 |
|---|---|---|
| active membership + credential | 로그인 성공 | 정상 |
| membership row 없음 + credential 잔존 | `SERVICE_NOT_MEMBER` — **credential 조회조차 하지 않는다** | 정상(우회 없음) |
| membership 비활성(`withdrawn`/`suspended`) + credential | **로그인 토큰은 발급된다.** 서비스 접근은 `membership-guard.middleware` 가 403 `MEMBERSHIP_NOT_ACTIVE` 로 차단 | **의도된 설계** — withdraw 는 `users.status` 를 바꾸지 않는다(다른 서비스 로그인 보존) |
| `users.status='deleted'` + credential | 비밀번호가 맞아도 `ACCOUNT_NOT_ACTIVE` (`resolveAccountAccess` fail-closed) | 정상 |
| 탈퇴(soft) → 재활성 | 과거 credential 로 다시 로그인 가능 | **의도된 정책** — 정지/탈퇴는 되돌리는 동작이며 비밀번호는 본인 것 그대로다 |
| **hard delete → 이후 membership 재생성** | 종전: `AdminUserController` 가 `KEEP_EXISTING_CREDENTIAL` 로 과거 credential 을 재사용하고, `approveMembership` STEP2 가 `users.status='deleted'` 를 `active` 로 올린다 → **아무도 새 비밀번호를 정하지 않은 채 과거 비밀번호가 부활** | **결함 (credential resurrection)** — 본 WO 에서 차단 |
| 본인 재가입(같은 이메일 재등록) | register 기존 user 분기가 credential 을 새 비밀번호로 UPSERT | 부활 아님(정상) |

---

## 6. §9 정책 판정 — **B**

- **A(보존이 의도)** 를 뒷받침하는 근거가 코드·문서 어디에도 없다. hard delete 는 membership row 자체를
  없애므로 되돌릴 canonical 경로가 존재하지 않는다(`reactivateMembership` 은 `suspended`/`withdrawn`
  **membership row 가 남아 있을 때만** 동작).
- **C(모델 자체가 잘못)** 도 아니다. soft/withdraw/suspend 축은 credential 을 유지하는 것이 정확하며,
  재활성으로 같은 비밀번호를 복구하는 동작이 설계와 일치한다.
- 따라서 **hard delete 범위에 한해 credential 폐기가 canonical** 이다.

---

## 7. §10 수정 내용 (live 결함 1건)

`apps/api-server/src/services/approval/MembershipApprovalService.ts` — `deleteMember(mode='hard')` 에
**STEP H1b** 추가:

- platform admin: `DELETE FROM service_credentials WHERE user_id = $1`
- 서비스 운영자: `DELETE FROM service_credentials WHERE user_id = $1 AND service_key = ANY($2)`
  → **membership 삭제 범위와 정확히 동일**(교차 서비스 영향 0)

금지 항목 준수: `users.password` 무변경 · 다른 서비스 credential 무변경 · orphan 일괄 삭제 선행 없음 ·
서비스별 비밀번호 정책 유지 · DB cascade 신설 없음 · soft/withdraw/suspend 분기 무변경.

---

## 8. §11 기존 orphan 28행 처리

| 판정 | 행 수 | 근거 |
|---|---:|---|
| `SAFE_DELETE` | 28 | 전부 `users.status='deleted'` + membership 0. 로그인 경로 도달 불가. 재가입 시 register 가 새 credential 을 만들고, admin 이 membership 을 다시 부여할 때는 `SERVICE_PASSWORD_REQUIRED` 로 새 비밀번호를 강제하게 되어 **더 안전해진다** |
| `KEEP` / `REVIEW` | 0 | — |

**삭제는 실행하지 않았다.** `CLAUDE.md §0` 이 production 데이터 변경(DELETE 포함)에 사용자 승인을
요구하며, 본 정리는 되돌릴 수 없다. 승인 시 실행할 단일 문장(코드 수정과 동일 계약):

```sql
-- 승인 후 1회 실행 (예상 28행)
DELETE FROM service_credentials sc
WHERE NOT EXISTS (SELECT 1 FROM service_memberships sm WHERE sm.user_id = sc.user_id)
  AND EXISTS (SELECT 1 FROM users u WHERE u.id = sc.user_id AND u.status = 'deleted');
```

미실행 상태에서도 **로그인 우회 0** 이며(§9), 코드 수정으로 **신규 orphan 은 더 생기지 않는다**.

---

## 9. 검증

### 9-1. Jest (신규 16 · 회귀 포함 전량 PASS)

| 파일 | tests |
|---|---:|
| `src/services/approval/__tests__/serviceCredentialLifecycle.test.ts` (신규) | 8 |
| `src/services/auth/__tests__/orphanCredentialLoginContract.test.ts` (신규) | 8 |
| `src/services/auth/__tests__` + `src/services/approval/__tests__` 전체 | **95 PASS / 10 suites** |
| `src/__tests__/supplier-bulk-delete-soft-delete-contract.test.ts` (delete 경로 회귀) | 6 PASS |

고정한 계약: hard delete 는 같은 서비스 credential 만 폐기 / platform admin hard delete 는 전량 폐기 /
users row 는 삭제하지 않음 / soft·withdraw·suspend 는 credential 유지 / orphan 은 `SERVICE_NOT_MEMBER` /
`deleted` 계정은 `ACCOUNT_NOT_ACTIVE` / withdrawn 은 guard 403 / 서비스 A 폐기가 B 에 영향 0 /
credential 이 폐기된 서비스에 membership 만 재생성해도 과거 비밀번호는 부활하지 않음.

### 9-2. Production

- orphan census 재산출: 28행 (변경 없음 — write 0)
- **로그인 우회 0**: orphan 소유 계정 중 `active/approved/pending` 인 계정 **0명**
- 중복 credential 0 / unknown service_key 0

---

## 10. 남은 부채 (별도 WO 대상 · 본 WO 범위 밖)

1. **기존 orphan 28행 삭제 승인 대기** (§8 SQL).
2. **credential·membership 변경 감사 로그 없음** — `account_activities` 는 `login_email` 만 기록해
   삭제·재가입 이력 추적이 코드 추론에 의존한다.
3. **`AdminUserController.createUser` 의 orphan 생성 가능성** — `targetServiceKey` 로 credential 을
   만들지만 membership 은 **prefixed role 에서만** 파생되므로, role 이 없으면 membership 없는 credential 이
   생길 수 있다. 현재 production 28행은 이 경로가 아니지만(전부 hard delete 흔적) 구조적 갭은 남아 있다.
4. **`users.status='deleted'` 는 TS enum 에 없는 legacy 값** — `resolveAccountAccess` 가 fail-closed 로
   막고 있으나 상태 축 정리는 미완(선행 WO 부채와 동일).
5. **로그인 serviceKey canonicalization 없음** (선행 WO 부채 유지).

---

## 11. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건(위 §10-1·2·3)
