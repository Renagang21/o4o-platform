# WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1

> 작성일: 2026-09-23 · 상태: **IN PROGRESS**
> 선행: `WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1`(COMPLETE) ·
> `WO-O4O-ADMIN-OPERATOR-GOOGLE-INVITATION-AND-ASSIGNMENT-CUTOVER-V1`(구현·배포 완료 · Smoke A/B PENDING_USER_ACTION)
> 검증 기록: [`CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1`](../checks/CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1.md)

## 1. 목적

**O4O 인증에서 password 라는 개념을 제거하고, Google `sub` → `users.id` 만을 유일한 인증 정본으로 만든다.**

```text
외부 Identity Key = Google sub
내부 Identity Key = users.id
email               = profile/contact 값 (인증 키 아님)
password            = 없음
service_credentials = 없음
```

## 2. 범위

**하나의 WO 로 진행한다** — 조사 → 전수 판정 → 런타임 전환 → UI/API 제거 → 데이터·스키마 정리 →
CI/E2E 재정의 → 배포 → production 검증 → CHECK. 작은 후속 WO 로 쪼개지 않는다.

### 포함

| 축 | 내용 |
|---|---|
| Frontend | 모든 active login surface 를 `GoogleContinue` 1개로 · email/password login · password signup · forgot/reset · find-id · password 변경 UI 전수 제거 |
| Backend | `/auth/login` · `/auth/register` · `/auth/signup` · `/auth/forgot-password` · `/auth/reset-password` · `/auth/find-id` · service password update · admin password update 은퇴 |
| Identity | Google explicit-link 의 `currentPassword` 재인증 제거 · 유일 Google identity unlink lockout 경로 0 |
| Data | `service_credentials` 5행 처분 · `password_reset_tokens` · `users.password` · `loginAttempts` · `lockedUntil` |
| Util | bcrypt · hashPassword/comparePassword · password-policy dead code |
| CI | E2E Auth Runtime 을 Google Identity 기준으로 재정의 · workflow password secret 소비 0 · 정적 가드 추가 |

### 제외

- `users.email` 의 optional 화 · 프로필 개인정보 최소화 → **Phase 5 별도**. 이번에는 *인증 키로 쓰지 않는다* 만 유지.
- 법률 판단 · 정책 version bump/재동의 필요 판정 → 필요하면 STOP 후 보고.
- 새 Google 테스트 계정 생성 → 만들지 않는다.

## 3. 불변식

1. 사용자 판정은 `linked_accounts(provider='google', providerId=verified sub)` 만. **email 자동 병합 금지.**
2. Google token 검증은 기존 `verifyGoogleIdToken` 정본 재사용 — 새 구현 금지.
3. Identity / Role / Membership / Relationship / Professional Credential 은 분리 유지.
   `service_credentials` 삭제가 role·membership 을 바꾸지 않는다.
4. **관리자 행 불변** — users.id · Google linked identity · `platform:super_admin` · roles 11 · memberships 5.
5. 감사 로그(`account_activities` · `action_logs`)의 과거 password 이벤트는 **지우지 않는다**. 새 이벤트만 끊는다.
6. 서비스 가입(membership onboarding)이 password UI 제거로 불가능해지면 실패다 — Google 인증 후 가입 flow 로 이어져야 한다.

## 4. 실행 순서 (contract-last)

```text
Phase A — Runtime Cutover   : reader/writer/UI 0 코드 먼저 배포 (schema 유지)
        ↓ old revision traffic 0 확인
DESTRUCTIVE GATE            : row count · DROP 대상 · rollback 한계 보고 → 사용자 승인
        ↓
Phase B — Schema Contract   : migration 으로 물리 제거 → entity 제거 → manifest/expected schema 정렬
```

schema 를 먼저 drop 하면 구 revision 이 legacy table 을 읽다가 장애가 난다. 순서를 지킨다.

## 5. 중지 조건

- production DROP/DELETE 직전 (§43 형식으로 1회 보고 후 중지)
- census 결과가 예상(users 1 · google linked 1 · password non-null 0 · service_credentials 5)과 다를 때
- 개인정보 정책의 법적 재동의 필요가 의심될 때
- 다른 세션 dirty 파일 접촉이 필요할 때

## 6. 완료 기준

§41 체크리스트 전부. 요약하면 **login surface Google-only · password reader/writer 0 ·
removable schema 물리 제거 · service join 회귀 0 · CI PASS · deploy PASS ·
현재 관리자 Google production smoke PASS · postVerify PASS · CHECK 작성 · HEAD == origin/main**.

신규 Google 계정 부재를 이유로 본 WO 를 무기한 막지 않는다. 반대로 operator invitation WO 의
Smoke A/B 를 검증했다고 거짓 COMPLETE 처리하지 않는다.

## 7. 산출물

- `docs/work-orders/WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1.md` (이 문서)
- `docs/checks/CHECK-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1.md` — BEFORE census · 판정표 ·
  서비스별 auth surface matrix · API 계약 변화 · schema before/after · migration · CI · deploy ·
  production smoke · postVerify · 남은 Smoke A/B 인계
