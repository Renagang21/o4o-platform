# WO-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1

> 접수일: 2026-09-25 · 상태: **접수 (미착수)**
> 발견: [`CHECK-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1`](../checks/CHECK-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1.md) §7-4a
> 선행 완료: `WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1`(COMPLETE) · 위 Operator WO(COMPLETE)

## 0. 한 줄

**서비스 관계 종료가 전역 Identity 를 죽인다.** 마지막 `service_membership` 이 사라지면
`users.status='deleted'` · `isActive=false` 가 되어 **Google 로그인까지 차단**된다.

## 1. 실측 (2026-09-25 · Smoke A 준비 중 발견)

`MembershipApprovalService.deleteMember`:

```text
hard  STEP H1  DELETE FROM service_memberships …
      STEP H4  남은 membership 이 0 이면
               UPDATE users SET status='deleted', "isActive"=false      ← 문제
soft  platform admin 분기  UPDATE users SET status='deleted', "isActive"=false  ← 문제
      service operator 분기 자기 서비스 membership 만 종료 · users 무접촉      ← 올바른 동작
```

`requireAuth` 가 매 요청 `users.isActive` 를 검사하므로 결과는 **계정 정지**다.
게다가 요청자가 `platform:super_admin` 이면 **service operator 분기에 도달할 수 없다**
(`isPlatformAdmin` 이 요청자 scope 에서 나온다) — 즉 **플랫폼 관리자는 안전한 경로를 고를 수 없다.**

실제로 테스트 계정(membership 1개)을 정리하려다 이 경로를 밟으면 계정이 죽어 후속 smoke 가 불가능해졌고,
그래서 회수 범위를 role 로 좁혀야 했다.

## 2. 왜 지금 고치는가

Google 단일 Identity 전환이 끝나 **`users` 는 전역 Identity, `service_memberships` 는 서비스 관계**로
역할이 분명해졌다(`USER-DOMAIN-SSOT-V1` §0 · `O4O-IDENTITY-ARCHITECTURE-V3`).
그 모델에서 "서비스를 하나도 쓰지 않는 사용자" 는 **정상 상태**여야 한다.

## 3. 확정 정책

```text
O4O User Identity  ≠  Service Membership

마지막 membership 종료  ≠  O4O 사용자 삭제/비활성화
```

### 완료 계약

```text
service_membership 종료
  → 해당 서비스 관계만 종료
  → 해당 서비스 role 필요 시 비활성화
  → users.status        불변
  → users.isActive      불변
  → linked_accounts.google 불변
  → Google 로그인 계속 가능
```

## 4. 범위

전수로 볼 것:

- `deleteMember` 의 **soft / hard** 두 경로
- **platform super_admin / service operator** 분기 (요청자 scope 로 분기가 결정되는 구조 포함)
- `reactivateMembership` — 되살리기 경로가 새 계약과 정합한지
- **`users.status` · `users.isActive` writer 전수** — 서비스 관계 종료를 이유로 전역 상태를 바꾸는 코드가 더 있는지
- role 비활성화 범위 — 서비스 종료 시 그 서비스 role 만 내리는지(다른 서비스 role 보존)
- 화면 문구 — "탈퇴 처리" 가 실제로 무엇을 하는지 사용자에게 정확히 말하는지

## 5. 하지 않을 것

- `users` 물리 삭제 정책 변경 (현행 "절대 삭제 금지" 유지)
- Identity/인증 구조 변경 · role SSOT 변경
- 이번 발견과 무관한 membership 도메인 리팩터링

## 6. 완료 기준

```text
[ ] soft/hard · 두 분기 모두 users.status/isActive 불변
[ ] 마지막 membership 종료 후에도 Google 로그인 가능
[ ] 서비스 role 만 비활성화 · 다른 서비스 role 보존
[ ] reactivate 경로 정합
[ ] users.status writer 전수 census + 판정표
[ ] 회귀 테스트 (마지막 membership 종료 시나리오 포함)
[ ] production 검증 — 아래 fixture 로 실증
[ ] CHECK 작성 · HEAD == origin/main · 미커밋 0
```

## 7. Acceptance fixture (이미 준비됨)

Operator WO §7-7 에서 보존한 테스트 계정을 그대로 쓴다.

```text
시작 상태  users row 1 · linked_accounts.google 1 · status active · isActive true
           active roles 0
           memberships  k-cosmetics active · neture active

검증 순서  ① neture membership 종료   → user active 유지 · Google 로그인 가능
           ② 마지막 k-cosmetics 종료  → memberships 0 · user active 유지 · Google 로그인 가능
           ③ 최종                     roles 0 · linked_accounts.google 1 · users row 1
```

③ 까지 성공하면 **"서비스 0개인 사용자도 O4O Identity 로 존재할 수 있다"** 를 production 에서 직접 증명한다.

## 8. 산출물

- 본 WO
- `docs/checks/CHECK-O4O-SERVICE-MEMBERSHIP-TERMINATION-GLOBAL-IDENTITY-DECOUPLING-V1.md`
