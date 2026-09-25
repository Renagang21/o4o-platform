# CHECK-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1

> 작성일: 2026-09-25 · 상태: **`CODE_DONE / AWAITING_CONTROLLED_DEPLOY`**
> WO: [`WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1`](../work-orders/WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1.md)
> **migration 0 · production DB write 0**

---

## 1. 불변식

> **서비스와의 관계가 0개가 되어도 O4O User Identity 는 존재할 수 있다.**

`users.status='deleted'` · `users.isActive=false` 는 **명시적인 플랫폼 정지/탈퇴 경로**에서만
발생해야 한다. 서비스 membership 종료의 **부수효과**로 발생해서는 안 된다.

## 2. Census — `users.status` / `users.isActive` writer 전수

대상: git-tracked **활성 runtime 3,299 파일**(`apps/api-server/src` · `packages`, dist · node_modules ·
테스트 · migrations · e2e · docs 제외, 주석 제거 후 판정). 후보 45지점을 뽑아 `users` 축만 남겼다.

### 2-1. MEMBERSHIP_SIDE_EFFECT — **정책 위반 (수정 대상)**

| # | 위치 | 내용 |
|---|---|---|
| ① | `services/approval/MembershipApprovalService.ts` **hard delete STEP H4** | 남은 `service_memberships` 가 0 이면 `UPDATE users SET status='deleted', "isActive"=false` |
| ② | 같은 파일 **soft delete · platform admin 분기** | 동일 UPDATE. **요청자가 `super_admin` 이라는 사실만으로** 서비스 콘솔의 "탈퇴 처리" 가 계정 탈퇴로 승격됐다 |
| ③ | `routes/kpa/controllers/member.controller.ts` **hard delete** | 같은 패턴(남은 membership 0 → 비활성화) |

`requireAuth` 가 매 요청 `users.isActive` 를 검사하므로 결과는 **계정 정지**이고 **Google 로그인까지 차단**됐다.
2026-09-25 에 테스트 계정(membership 1개)을 정리하려다 실제로 이 경로를 만나 smoke 가 막혔다.

### 2-2. EXPLICIT — 유지 (명시적 플랫폼 계정 관리)

`controllers/admin/AdminUserController.ts`(관리자 화면의 상태 변경 · 활성 토글) ·
`repositories/UserRepository.ts`(승인/거부) · `routes/admin/platform-accounts.routes.ts` ·
`routes/admin/platform-users.routes.ts`.

### 2-3. 역방향 결합 — **FOLLOW_UP (이번에 바꾸지 않음)**

승인·재활성 경로가 `users` 를 **`active` 로 올린다**: `MembershipApprovalService` 승인/`reactivateMembership` ·
`MembershipConsoleController` 승인/재활성 · `modules/neture/.../operator-registration.service.ts`.

Identity 를 죽이지는 않으므로 이번 정책 위반은 아니다. 다만 **서비스 승인이 전역 계정 상태를
올리는 것** 역시 같은 결합의 반대 방향이며, 플랫폼이 정지시킨 계정을 서비스 승인이 되살릴 수 있다.
Google 전용 전환 후 신규 user 는 이미 `active` 로 생성되므로 이 승격이 아직 필요한지 **판정이 필요**하다.
지금 건드리면 로그인 가능 여부가 바뀌므로 별도 판단으로 남긴다.

### 2-4. OTHER — 무관

프로필/`businessInfo` 부분 업데이트(`sets` 조립), 다른 엔티티의 `status`/`isActive`
(cosmetics store · offer · cafe24 connection · branch domain · forum · store policy 등).

## 3. 변경

| 파일 | 내용 |
|---|---|
| `MembershipApprovalService.ts` | ① hard delete STEP H4 의 users 비활성화 **제거**(잔여 membership 수는 로그로만 남긴다) · ② soft delete platform admin 분기의 users 비활성화 **제거**(membership `withdrawn` 처리는 유지) |
| `routes/kpa/controllers/member.controller.ts` | ③ 동일 부수효과 **제거**. KPA 관계 종료(`kpa:` role 삭제 · `kpa_members` 삭제 · membership 정리)는 그대로 |

**기능을 지운 것이 아니다** — membership 종료·role 정리는 모두 그대로 동작한다.
삭제한 것은 "그 결과로 계정을 죽이는" 한 줄뿐이다.

## 4. 테스트

| 대상 | 결과 |
|---|---|
| `__tests__/service-membership-termination-identity-decoupling.spec.ts` **신설** (7) | **PASS** — 세 경로의 비활성화 write **부재** · **활성 runtime 전수**에 같은 패턴이 남아 있지 않음(500+ 파일 스캔) · membership 종료 기능은 **존재** · 명시적 플랫폼 경로도 **존재**(정지 기능을 지우지 않았음을 증명) · `codeOnly` 자기검사 |
| `serviceCredentialLifecycle.test.ts` (8) | **PASS** — 구 계약이 비활성화 UPDATE 의 **존재**를 단정하고 있었다. 지우지 않고 **뒤집어** 고정: 삭제도 비활성화도 없고 membership 종료는 일어난다 |
| `MembershipApprovalService.softDeleteBoundary.test.ts` (8) | **PASS** — 구 계약 `플랫폼 관리자 = 계정 전체 탈퇴` 를 **뒤집었다**. 분기가 **의도가 아니라 요청자 권한**으로 정해지던 것이 문제였다(서비스 콘솔의 "탈퇴 처리" 도 super_admin 이면 계정을 죽였다). 새 계약: `users` write **0** · membership 은 전 서비스 `withdrawn` · 서비스 role 비활성화 · 플랫폼 role 보존 |

`tsc --noEmit` rc=0.

**전체 suite 는 CI 에서 판정한다** — 로컬 full 실행은 수정 전 코드로 시작돼 결과가 섞였다(실행 중 파일이 바뀌면
먼저 돈 suite 는 구 코드, 나중 suite 는 새 코드를 읽는다). 중단하고 PR CI 의 3샤드 전체 실행으로 대체했다.

## 5. 남은 것

- **배포** — API 1개(detector 판정에 따름). 판정은 job 실행 · revision 생성 · traffic 전환 3단계.
- **production acceptance** — WO §7 `TEST FIXTURE FINAL`. 준비된 테스트 계정으로
  ① `neture` membership 종료 → 로그인 가능 ② 마지막 `k-cosmetics` 종료 → `active memberships 0` 에서도
  **Google 로그인 가능** ③ 최종 상태 확인.
- **FOLLOW_UP** — §2-3 역방향 결합(서비스 승인이 전역 계정 상태를 올린다) 판정.
