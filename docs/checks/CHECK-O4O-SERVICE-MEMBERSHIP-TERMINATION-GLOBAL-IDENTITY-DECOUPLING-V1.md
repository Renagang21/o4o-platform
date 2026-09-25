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

### 2-2a. 변경 범위가 요청자 권한으로 넓어짐 — **같은 결함의 두 번째 축 (이번에 수정)**

> **Authorization capability ≠ Mutation target scope**
>
> `platform:super_admin` 은 "어느 서비스든 처리할 수 있다" 는 뜻이지
> "한 서비스 탈퇴 요청이 모든 서비스를 종료한다" 는 뜻이 아니다.

`users` 비활성화만 떼어내도 **한 서비스 콘솔의 "탈퇴 처리" 가 다른 서비스 관계를 끊는** 문제는
그대로 남아 있었다. 범위가 요청의 대상이 아니라 **요청자의 권한**에서 파생됐다.

| # | 위치 | 확대 경로 |
|---|---|---|
| ④ | `MembershipApprovalService.deleteMember` hard STEP H1 | `isPlatformAdmin` 이면 `DELETE FROM service_memberships WHERE user_id = $1` — 범위 조건 없음 |
| ⑤ | 같은 함수 hard STEP H2 | `isPlatformAdmin` 이면 role prefix 를 **전 서비스**로 |
| ⑥ | 같은 함수 hard STEP H3 | `serviceKeys.includes('kpa-society') \|\| isPlatformAdmin` — 대상이 neture 여도 KPA profile/organization 정리 |
| ⑦ | 같은 함수 soft 분기 | `isPlatformAdmin` 이면 `UPDATE service_memberships ... WHERE user_id = $1` + `prefixesToClean` 전 서비스 |
| ⑧ | `MembershipConsoleController.deleteMember` | 대상을 `scope.serviceKeys`(요청자가 **보유한 전체**)로 넘겼다. platform admin 의 `serviceKeys` 는 `[]` 이므로 서비스 계층의 전 서비스 분기로 직행했고, 두 서비스를 운영하는 사람이 누르면 양쪽이 함께 끊겼다 |

**수정**

| 파일 | 내용 |
|---|---|
| `MembershipApprovalService.ts` | 진입부 **fail-closed** — `serviceKeys` 가 비면 전 서비스 fallback 대신 `false` 반환(쿼리 0). H1 · H2 · soft 분기의 `isPlatformAdmin` 확대 제거 → 항상 `service_key = ANY($2)`. H3 의 KPA 정리는 **대상 serviceKey 가 `kpa-society` 일 때만** |
| `MembershipConsoleController.ts` | 대상은 **명시 `serviceKey` 1개**만. 없거나 `'all'` 이면 `400 SERVICE_KEY_REQUIRED`, 보유하지 않은 서비스면 `403 SERVICE_SCOPE_FORBIDDEN`. `scope.serviceKeys` fallback 없음 |
| 호출부 7곳 | k-cosmetics 3 · neture 3 · 공통 `@o4o/ui` `UserDetailPage` 1. 모두 대상 `serviceKey` 전송. 공통 컴포넌트는 `config.serviceKey` 를 쓰며(같은 파일의 status · reactivate 와 동일 규칙) 소비처 4개(k-cosmetics · kpa-society · neture · pharmacy-hub) 전부 이 값을 주입하는 것을 확인했다 |

**"전 서비스 관계 종료" 기능은 지운 것이 아니라 설계에서 빠졌다** — 필요하면 별도의 명시적
platform action 으로 만든다(현재 UI 에 그런 버튼은 없다).

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
| `serviceCredentialLifecycle.test.ts` (9) | **PASS** — 구 계약이 비활성화 UPDATE 와 `serviceKeys: []` 전 서비스 폐기의 **존재**를 단정하고 있었다. 지우지 않고 **뒤집어** 고정: 범위 없는 요청은 거부(membership delete 0) · 명시한 서비스만 폐기 · users 는 삭제도 비활성화도 없다 |
| `MembershipApprovalService.softDeleteBoundary.test.ts` (14) | **PASS** — 구 계약 `플랫폼 관리자 = 계정 전체 탈퇴 + 전 서비스 종료` 를 **뒤집었다**. 하네스에 hard delete(`DELETE`) 를 더해 범위 밖 row 가 남는지 직접 본다. 새 계약: 범위 비면 **쿼리 0 으로 거부**(soft · hard) · 명시한 서비스만 종료 · 다른 서비스 membership·role 불변 · 플랫폼 role 보존 · KPA 정리는 대상이 KPA 일 때만 · `users` write **0** |
| 같은 파일 — **다중 membership 2단계** (2) | **PASS** — WO §7 production acceptance 와 같은 순서. `serviceKey=neture` → neture 만 사라지고 k-cosmetics membership·role 불변 → 이어서 `serviceKey=k-cosmetics` → **memberships 0 인데 `users` 는 active** |
| `MembershipConsoleController.deleteScope.test.ts` **신설** (8) | **PASS** — `serviceKey` 없음/`'all'` → `400` 이고 `deleteMember` **미호출** · platform admin 요청도 명시 1개만 전달 · 두 서비스 보유 운영자도 명시 1개만 · 미보유 서비스 → `403` · hard 도 동일 · 서비스 계층 거부는 `404` 로 전달 |
| 호출부 정적 가드 (`...identity-decoupling.spec.ts` 에 2건 추가) | **PASS** — `services/**` · `packages/**` 1,000+ 파일에서 `DELETE /operator/members/:id` 호출 중 `serviceKey` 없는 곳 **0**. 가드 자체를 검증했다: 호출부 1곳의 `serviceKey` 를 일부러 지우면 해당 파일·URL 을 지목하며 실패한다(**미탐 0 실측**) |

`tsc --noEmit` rc=0 (`apps/api-server` · `packages/ui`) · 변경 11파일 `eslint` 0.
`src/services/approval/__tests__` 8 suite 154 PASS · `src/controllers/operator/__tests__` 4 suite 52 PASS.

**전체 suite 는 CI 에서 판정한다** — 로컬 full 실행은 수정 전 코드로 시작돼 결과가 섞였다(실행 중 파일이 바뀌면
먼저 돈 suite 는 구 코드, 나중 suite 는 새 코드를 읽는다). 중단하고 PR CI 의 3샤드 전체 실행으로 대체했다.

## 5. 남은 것

- **배포** — API + 프런트(공통 `@o4o/ui` 를 건드려 소비 4서비스가 affected 후보다). **범위는 merge 후 `detect-affected.mjs` 실측으로 정한다.** 판정은 job 실행 · revision 생성 · traffic 전환 3단계.
  `serviceKey` 를 요구하는 서버가 먼저 올라가면 구 프런트의 "탈퇴 처리" 는 400 이 된다 —
  **되돌릴 수 없는 손상은 없고**(아무것도 종료되지 않는다) 프런트 배포로 해소된다.
- **production acceptance** — WO §7 `TEST FIXTURE FINAL`. 준비된 테스트 계정으로
  ① `neture` membership 종료 → 로그인 가능 ② 마지막 `k-cosmetics` 종료 → `active memberships 0` 에서도
  **Google 로그인 가능** ③ 최종 상태 확인.
- **FOLLOW_UP** — §2-3 역방향 결합(서비스 승인이 전역 계정 상태를 올린다) 판정.
