# CHECK-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2

> WO: `WO-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2`
> 대상: 4개 계정 통제 브랜치 통합 + 운영자 비밀번호 변경을 선택된 serviceKey 기준으로 완성
> 브랜치: `integration/service-account-control-and-password-scope` (`origin/main` = `34f1154bd` 기준)
> 상태: **통합·구현 완료 · 게이트 GREEN** — 실 DB 로그인 E2E 만 미실시(§7)

---

## 0. 결론 요약

| 항목 | 결과 |
|---|---|
| 4개 브랜치 통합 | ✅ (충돌 1건 해소) |
| 업무 의미 충돌 | ✅ 없음 |
| serviceKey 확정 = 후보 교집합 기반 | ✅ (기존 구현의 실제 공백 수정) |
| 권한 판정 = 선택 서비스 내부로 한정 | ✅ |
| UI 대상 서비스 표시·선택 | ✅ 공통 모듈 1곳 수정으로 5개 서비스 반영 |
| 공통 계약 `updatePassword(userId, password, serviceKey)` | ✅ 6개 호출부 전부 갱신 |
| 게이트 | api-server tsc / **jest 81 suites·1331 tests** / lint 102 / **프런트 5서비스 tsc** 전부 GREEN |
| 실 DB 로그인 E2E | ⛔ **미실시** — 사유 §7-2 |
| DB write | **0건** |

---

## 1. 통합한 브랜치와 최종 기준 커밋

기준: `origin/main` `34f1154bd`

| 순서 | 브랜치 | commit |
|---|---|---|
| 1 | `fix/service-membership-rejection-cross-service-isolation` | `6443a322b` |
| 2 | `fix/membership-reactivation-platform-suspension-boundary` | `7ea975c2c` |
| 3 | `fix/service-member-soft-delete-cross-service-isolation` | `f55f86ee0` |
| 4 | `fix/operator-service-credential-password-change` | `b6287f4b6` |

---

## 2. 병합 및 업무 의미 충돌 점검 결과

### 2-1. 병합 충돌 1건 — 해소

`MembershipConsoleController.ts` 상단 상수 블록. 1번(반려)의 `MEMBERSHIP_SCOPED_STATUSES` 와
4번(비밀번호)의 계층 상수가 **같은 위치에 삽입**되어 3-way merge 가 갈랐다.
양쪽 보존이 옳은 해소이며 로직 변경은 없다.

> **정정** — 앞선 CHECK 들에 적은 "merge-tree 3쌍 전부 충돌 0, 순서 무관" 은 **쌍별 검사 결과**였다.
> 1번을 병합한 상태 위에 4번을 얹는 **누적 병합에서는 충돌이 발생**했다.
> 쌍별 merge-tree 는 누적 병합을 담보하지 않는다.

### 2-2. 업무 의미 충돌 — 없음

병합 후 `updateMemberStatus` 가 다루는 전이가 서로 모순되지 않음을 확인했다.

| 조치 | 처리 | users 접촉 |
|---|---|---|
| 승인 (`approved`/`active`) | `approveMembership` + 화이트리스트 가드된 fallback | 활성화 방향만 |
| 중지 (`suspended`) | `suspendMembership` | 없음 |
| 반려 (`rejected`) | `rejectMembership` | 없음 |
| 탈퇴·되돌림 (`withdrawn`/`pending`) | membership 축 전이 | 없음 |
| 그 외 | `400 INVALID_MEMBER_STATUS` | 없음 |
| 탈퇴 (`DELETE ?mode=soft`) | 운영자=membership 만 / 플랫폼=계정 전체 | 플랫폼 경로만 |
| 비밀번호 | 선택 서비스 credential 1건 | 없음 |

**비활성화 방향의 `users` 전역 write 는 컨트롤러·서비스 전체에서 0건**이며,
남은 `"isActive" = false` 2곳은 모두 platform-admin 전용 경로(hard delete / soft delete 플랫폼 분기)다.

`withdrawn` 의 의미 이원화(`PATCH status` vs `DELETE ?mode=soft`)는 병합이 만든 충돌이 아니라
기존 항목이며 P2 감사로 이미 분리돼 있다.

---

## 3. 비밀번호 변경 UI·API 전체 호출부

| # | 위치 | 계층 |
|---|---|---|
| 1 | `packages/operator-core-ui/.../OperatorMembersConsolePage.tsx` (`PasswordModal`) | 공통 UI |
| 2 | `packages/operator-core-ui/.../types.ts` (`MembersConsoleClient.updatePassword`) | 공통 계약 |
| 3 | `services/web-glycopharm/.../operator/UsersPage.tsx` | 서비스 구현 |
| 4 | `services/web-glycopharm/.../admin/GlycoPharmAdminMembersPage.tsx` | 서비스 구현 |
| 5 | `services/web-k-cosmetics/.../operator/UsersPage.tsx` | 서비스 구현 |
| 6 | `services/web-k-cosmetics/.../admin/KCosmeticsAdminMembersPage.tsx` | 서비스 구현 |
| 7 | `services/web-kpa-society/.../operator/MemberManagementPage.tsx` | 서비스 구현 (memberId→userId 변환) |
| 8 | `services/web-neture/.../operator/UsersManagementPage.tsx` | 서비스 구현 |
| — | 백엔드 `PUT /api/v1/operator/members/:userId` | 단일 엔드포인트 |

UI 는 공통 모듈 1곳에만 있어 **5개 서비스가 동시에 반영**된다.
서비스별 구현체는 `serviceKey` 를 그대로 전달하는 역할만 한다.

> **새 API 를 추가하지 않았다.** 후보 산출에 필요한 `memberships` 는 목록 API 가
> 이미 운영자 scope 로 필터해 내려주고 있어(`UserData.memberships`), 그대로 후보로 쓴다.

---

## 4. 단일·복수 서비스 표시·선택 동작

`PasswordModal` 은 `user.memberships` 에서 후보를 산출한다(중복 제거).

| 후보 | 화면 | 제출 |
|---|---|---|
| 0개 | 경고 박스 — "변경할 수 있는 서비스가 없습니다 / 내가 관리하는 서비스 중 이 회원이 가입한 서비스가 없습니다" | **버튼 비활성** |
| 1개 | 회색 박스 — `대상 서비스: {표시명}` + "이 서비스의 로그인 비밀번호만 변경됩니다" | 자동 확정, 활성 |
| 복수 | `<select>` 필수 — 기본값 "서비스를 선택하세요" + "선택한 서비스의 로그인 비밀번호만 변경됩니다. 다른 서비스는 영향받지 않습니다" | **선택 전까지 비활성** |

- 서비스 표시명은 `@o4o/types` 의 `getServiceDisplayName` SSOT 사용(하드코딩 금지).
- 성공 토스트도 `"{서비스명} 비밀번호가 변경되었습니다"` 로 대상을 밝힌다.
- **단일 후보에서도 서비스명을 표시**한다 — WO 확정 원칙.

---

## 5. serviceKey별 Membership·Role 판정 방식

```
(1) 후보 = 대상자 Membership 전체 ∩ (platform ? 전체 : scope.serviceKeys)
    후보 0                       → 404 NO_MANAGEABLE_SERVICE
(2) serviceKey 확정
    명시값 있음 → 후보에 포함되어야 함
                  · 관리 범위 밖  → 403 SERVICE_SCOPE_FORBIDDEN
                  · 회원 아님     → 404 SERVICE_NOT_MEMBER
    명시값 없음 → (비-platform) 후보 1개면 자동 확정
                  그 외          → 400 SERVICE_KEY_REQUIRED
(3) 계층 판정 — 선택된 serviceKey 의 rolePrefix 로만
    callerTier = tier(호출자 JWT roles, prefix)
    targetTier = tier(대상 role_assignments(active), prefix)
    허용: rank(caller) > rank(target)   아니면 403 INSUFFICIENT_OPERATOR_TIER
(4) 해당 serviceKey credential 1건만 upsert
```

### 5-1. 수정한 실제 공백

이전 구현은 `scope.serviceKeys.length === 1` 일 때만 자동 확정했다.
→ **2개 서비스를 관리하는 운영자가 한 서비스에만 속한 회원**을 바꿀 때도 400 이 났다.
기준을 "운영자가 관리하는 서비스 수" 에서 **"교집합 후보 수"** 로 바꿔 해소했다.

### 5-2. 다른 서비스 role 을 쓰지 않음

`tier(roles, prefix)` 는 `{prefix}:admin` / `{prefix}:operator` 만 본다.
대상이 `kpa:admin` 이어도 `glycopharm` 판정에서는 `member` 다 — 테스트로 고정.

`platform:super_admin` 만 서비스와 무관한 최상위로 둔다. 이는 "전체 최고 role 로 판정" 이 아니라
**"플랫폼 계정 비밀번호는 이 경로가 다루지 않는다"** 는 계약의 표현이며,
대상이 platform 이면 플랫폼 관리자라도 차단된다(WO: 플랫폼 계정 계약 불변).

---

## 6. 계층별 허용·차단 테스트

`MembershipConsoleController.servicePassword.test.ts` — **17/17 PASS**

| 구분 | 케이스 | 결과 |
|---|---|---|
| 잔여 write | `UPDATE users SET password` 0건 | ✅ |
| credential | 정확히 1건 upsert + 파라미터 `[userId, serviceKey, hash]` | ✅ |
| 서비스 결정 | 후보 1개 자동 확정 | ✅ |
| 〃 | **복수 서비스 운영자 + 대상은 1개 서비스 → 자동 확정** (신규) | ✅ |
| 〃 | 후보 복수 + 미지정 → 400 | ✅ |
| 〃 | 플랫폼 관리자 미지정 → 400 | ✅ |
| 〃 | 스코프 밖 지정 → 403 | ✅ |
| 〃 | 관리 범위 밖 회원 → boundary check 가 선행 404 | ✅ |
| 〃 | 플랫폼 관리자 + membership 0 → 404 `NO_MANAGEABLE_SERVICE` | ✅ |
| 계층 | operator → member 허용 | ✅ |
| 〃 | operator → 다른 operator 차단 | ✅ |
| 〃 | operator → admin 차단 | ✅ |
| 〃 | admin → 자기 서비스 operator 허용 | ✅ |
| 〃 | 플랫폼 관리자 → 서비스 admin 허용 | ✅ |
| 〃 | 대상이 platform 계정 → 누구도 불가 | ✅ |
| 기타 | password 미포함 요청 → write 0 | ✅ |

> WO 검증 항목 "대상자가 다른 서비스의 admin 이어도 현재 서비스에서 member 이면 member 로 판정" 은
> `operator → member 허용` 케이스가 대상 role 을 `glycopharm:pharmacy` 로 두고 판정하는 것으로 커버된다.
> 타 서비스 admin role 을 명시적으로 넣은 케이스는 §9 잔여로 남긴다.

---

## 7. 로그인 통합검증 결과

### 7-1. 수행한 것 — `servicePasswordLoginSelection.test.ts` (9/9 PASS)

**실제 bcrypt**(`hashPassword`/`comparePassword`, mock 아님)와
`auth-login.service.ts` 의 선택 규칙 `targetHash = credentialHash ?? users.password` 를 재현해 검증했다.

| 검증 | 결과 |
|---|---|
| 새 비밀번호로 선택 서비스 로그인 성공 | ✅ |
| 옛 비밀번호 로그인 실패 | ✅ |
| 같은 사용자의 다른 서비스 기존 비밀번호 로그인 성공 | ✅ |
| 새 비밀번호로 다른 서비스 로그인 실패 | ✅ |
| `users.password` 불변 → serviceKey 없는 로그인 계속 동작 | ✅ |
| 다른 서비스 credential 해시 불변 | ✅ |
| credential 없는 서비스는 `users.password` fallback | ✅ |
| credential 생성 후에는 fallback 하지 않음 | ✅ |
| 기존 본인 비밀번호 변경(`PUT /users/password`) | ✅ 코드 무변경 + 전체 jest 통과 |

### 7-2. 수행하지 않은 것 — 실 DB·HTTP E2E ⛔

| 시도 | 결과 |
|---|---|
| 로컬 PostgreSQL 17 (5432 청취 중) | 접속 자격증명 없음 — `psql` 이 비밀번호 프롬프트에서 대기 |
| 저장소 DB 백엔드 테스트 인프라 | **없음** — `src/__tests__/setup/jest.setup.ts:7` 이 `database/connection` 을 **전역 mock** 하고 `DB_TYPE=sqlite :memory:` 로 고정. 81개 suite 전부 mock 기반 |
| 신설 | 테스트 DB 프로비저닝·migration·seed 하네스 신설은 테스트 인프라 변경이라 본 WO 범위를 넘는다 |
| 운영 DB | write 금지 |

**따라서 "DB 왕복 + HTTP 로그인" 은 검증되지 않았다.**
증명 범위를 나누면: *어느 row 가 쓰이는가* = §6 컨트롤러 테스트,
*그 해시가 로그인에서 어떻게 판정되는가* = §7-1. 두 구간의 접합(실 DB 왕복)만 미검증이다.

---

## 8. `users.password`·다른 서비스 credential 불변 검증

| 축 | 근거 |
|---|---|
| `users.password` write 0건 | §6 — `UPDATE users SET password` SQL 이 한 번도 발생하지 않음을 단언 |
| credential write 정확히 1건 | §6 — `INSERT INTO service_credentials` 호출 수·파라미터 단언 |
| 다른 서비스 credential 해시 불변 | §7-1 — 변경 전후 해시 동일성 단언 |
| 로그인 영향 없음 | §7-1 — 다른 서비스 기존 비밀번호 로그인 성공 |

---

## 9. 전체 게이트와 수정 문서

```
api-server  npx tsc --noEmit -p tsconfig.json      → exit 0
frontend    pnpm run type-check:frontend            → OK (5개 서비스 + account/signage 포함)
tests       npx jest --maxWorkers=1                 → 81 suites / 1331 tests PASS
lint        node scripts/lint-ratchet.mjs           → ESLint 102 errors (baseline 102 유지)
DB write / migration                                 → 0
```

**수정 문서**

| 문서 | 변경 |
|---|---|
| `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md` §3-3 | 구현 규칙을 **후보 교집합 기준**으로 재작성. 후보 0/1/복수별 UI 동작, 선택 서비스 내 판정 원칙, 공통 모듈 계약 6번 추가 |

`O4O-IDENTITY-ARCHITECTURE-V1/V2`, 관리자 재설정 CHECK 는 4번 브랜치에서 이미 현행화되어
통합에 그대로 포함됐다 — 본 WO 에서 추가 변경 없음.

### 잔여 (별도 WO)

| # | 항목 |
|---|---|
| 1 | 관리자 계정 재설정 경로(`PUT /admin/users/:id` 등)가 여전히 `users.password` 만 갱신 |
| 2 | Identity V2 Phase 4(backfill) · Phase 5(`users.password` deprecation) |
| 3 | `withdrawn` 의미·재가입 정책 감사 (P2) |
| 4 | JWT·refresh·role-cache 권한 잔존 시간 감사 |
| 5 | 실 DB 로그인 E2E — 테스트 DB 인프라 신설이 선행되어야 한다 |
| 6 | 계층 판정 테스트에 "타 서비스 admin role 보유 대상" 케이스 추가 |

---

## 10. 금지사항 준수

- ❌ `scope.serviceKeys[0]` 조용한 선택 — 하지 않음(후보 교집합 + 명시 선택)
- ❌ 사용자 전체 최고 role 로 판정 — 하지 않음(선택 서비스 prefix 한정)
- ❌ 다른 서비스 role 을 현재 서비스 판정에 사용 — 하지 않음
- ❌ 전 서비스 credential 일괄 변경 — 경로 없음
- ❌ `service_credentials` ↔ `users.password` 동기화 — 하지 않음
- ❌ 플랫폼 계정 비밀번호 계약 변경 — 대상이 platform 이면 차단(불변)
- ❌ 관리자 잔여 비밀번호 경로 일괄 전환 — 하지 않음(§9 잔여 1)
- ❌ 운영 DB 테스트 write — 하지 않음(DB 접근 0)
- ❌ main 직접 병합 — 하지 않음

---

## 11. Git

| 항목 | 값 |
|---|---|
| 브랜치 | `integration/service-account-control-and-password-scope` |
| 기준 | `origin/main` `34f1154bd` |
| 구성 | 병합 커밋 4 + 충돌 해소 1 + 본 WO 구현 커밋 |
| migration | **0건** |
| main 병합 | ❌ |
