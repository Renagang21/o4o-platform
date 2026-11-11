# WO-O4O-SOCIAL-SIGNUP-DIRECT-ROLE-REGISTRATION-V1 — 소셜 가입 직후 역할별 정보 입력으로 바로 진입

> **상태**: ACTIVE
> **작성일**: 2026-11-09 · **최종 갱신**: 2026-11-11
> **실행 위치**: BOTH (구현 CLOUD · 운영 DB 조회 · migration 적용 · 배포 후 실계정 확인 LOCAL)
> **인계**: PR #1008 병합(2026-11-11) · §2 Q1~Q3 결정 완료 · 다음 실행자 LOCAL(T0) · CLOUD(T1 남은 범위 → T2~)
> **근거**: 2026-11-09 사용자(통합 담당) 확정(대화, PR #987 운영 검증 중) · [`O4O-UNIFIED-MEMBER-REGISTRATION-V1`](../baseline/O4O-UNIFIED-MEMBER-REGISTRATION-V1.md) 「가입과 승인」 · [`WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1`](WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1.md) U2 · U3 · U4 · [`WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1`](WO-O4O-PRIVACY-IDENTITY-TARGET-MODEL-DECISION-CLOSURE-V1.md) D1

## 1. 배경 (운영 확인 · 현재 코드 대조)

### 1-1. 운영에서 겪은 흐름 (2026-11-09, PR #987 검증 중)

1. Neture 로그인 모달에서 「카카오로 계속하기」를 눌러 카카오 인증을 한다.
2. **계정 정보 폼**이 나온다. 이메일 · 닉네임 · 이름(선택) · 휴대전화(선택) · 약관을 입력한다(`packages/auth-react/src/KakaoContinue.tsx`).
3. 이미 쓰는 이메일을 넣으면 `EMAIL_IN_USE` 로 거절된다. 다른 주소를 넣으면 **계정이 만들어진다.**
   다만 그 주소가 카카오 이메일과 다르면 「이메일 미확인」 상태가 된다. 그러면 서버는 세션을 열지 않고 확인 메일만 보낸다(`kakao-auth.service.ts` `sessionOrVerification`).
4. 화면에는 「확인 메일을 보냈습니다」만 나온다. 「계정이 만들어졌다」는 말이 없어서, 사용자는 가입이 실패했다고 이해했다.
5. 다시 카카오로 들어가면 이제 연결된 계정이 있으므로 로그인으로 처리된다. 이메일이 미확인이라 같은 안내가 반복된다.
   메일을 확인하기 전에는 가입 유형 선택(`/signup`)에 갈 수 없다.

### 1-2. 정본과의 차이

- **정본:** [`O4O-UNIFIED-MEMBER-REGISTRATION-V1`](../baseline/O4O-UNIFIED-MEMBER-REGISTRATION-V1.md) 은 "인증 수단을 만든 뒤 신규 회원은 약사 · 약국경영자 · 공급자 · 파트너 · 기타 중 하나를 선택한다"고 정한다.
- **현재 구현:** 정본의 첫 단계(유형 선택) 앞에 두 단계가 더 있다. 계정 정보 폼(1-1의 2)과 확인 메일 관문(1-1의 3)이다.
- **역할별 정보 입력 화면:** `services/web-neture/src/components/auth/MemberRegistrationForm.tsx` 와 `apps/api-server/src/services/admin/member-registration.service.ts:103-117`. 이름 · 닉네임 · 휴대전화를 모든 유형에서 **필수**로 받는다(`INVALID_MEMBER_PROFILE`).
- **정본 [`O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1`](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md):** 「메인 이메일 확인」을 전제한다.

### 1-3. 저장 구조

- **`users.email`:** `varchar(255) NOT NULL UNIQUE` 다(`modules/auth/entities/User.ts:21`). 카카오 가입 폼이 이메일을 꼭 받는 근본 원인이다.
  - `User` 엔티티는 동결 Core 다(`O4O-CORE-FREEZE-V1` · `CLAUDE.md` §3). 이 WO 가 명시 승인 근거가 된다.
  - `users.name` · `users.phone` 은 이미 nullable 이다.
- **카카오의 이메일 제공:** 카카오가 이메일을 주는 것은 사용자가 거부할 수 있는 선택 동의다(`kakao-identity.service.ts` 의 `kakao_account.email` · `is_email_verified`). 그래서 이메일이 없는 카카오 계정이 존재한다.
- **Google 의 이메일 제공:** Google 은 확인된 이메일을 항상 준다. 없거나 미확인이면 거절한다(`GOOGLE_EMAIL_MISSING` · `GOOGLE_EMAIL_UNVERIFIED`).
- **소비처 규모:** `apps/api-server/src` 에서 `user.email` · `users.email` 을 참조하는 비테스트 파일은 약 80개다(migration 10개 포함, 2026-11-09 grep).
  - 많은 곳: `services/kpa-branch` · `services/auth` · `modules/neture` · `services/admin` · `routes/kpa` · `modules/neture-pharmacy` 등
- **공통 인증 컴포넌트 소비처:** `KakaoContinue` · `GoogleContinue` · `EmailSignupForm` 은 `web-neture` · `web-kpa-branch` · `web-pharmacy-business` 가 쓴다.

## 2. 사용자 확정 (2026-11-09)

| # | 결정 |
|---|---|
| S1 | 가입은 **기본 인증(소셜 또는 이메일)을 지나면 곧바로 역할별 추가 정보 입력**으로 간다. 그 사이에 이메일 · 이름 같은 계정 정보 폼을 두지 않는다 |
| S2 | 이메일 · 전화번호는 O4O 필수 사항이 아니다. 이메일 활용은 **필요할 때 + 이메일을 제공한 사용자에게만** 적용한다. 소통 기본 채널이 아니다(카카오톡 대화방 이용이 현실적으로 더 많다) |
| S3 | 역할별 정보는 전체관리자가 확인한다. **이메일 확인 · 전화번호 확인은 필요 없다** |
| S4 | 역할별 정보 입력에는 그 직역에 필요한 정보와 **닉네임**을 받는다. 닉네임은 향후 익명성 필요 때문에 **모든 직역 필수**다 |
| S5 | 역할별 입력 화면의 이름 · 휴대전화는 **직역별로 판단**한다. 공통 칸에서는 선택이고, 그 직역에 꼭 필요한 경우(예: 약사 면허 확인)만 그 유형의 정보로 받는다 |
| S6 | 가입 유형으로 부여받은 공간 외의 추가 가입은 My Home 에서 한다(정본 유지) |

**결정 (2026-11-11 — 통합 담당이 #1008 처리를 위임, 권장안을 그대로 채택):**

| # | 질문 | 결정 |
|---|---|---|
| Q1 | 약관 동의를 어디서 받는가 | **기본 인증 단계에 동의 체크만 남긴다**(입력칸 0개). 계정 생성은 곧 개인정보 처리의 시작이다. 또 `recordSignupTerms` · `recordSignupPrivacy` 가 users 생성 트랜잭션에 묶여 있다. 역할 입력 화면으로 옮기면 동의 없이 계정이 생기는 구간이 생긴다 |
| Q2 | 소셜 제공자가 확인한 이메일을 저장하는가, 이미 쓰는 주소와 겹치면 어떻게 하는가 | 제공자가 **확인한** 이메일은 저장한다(Google 은 항상, 카카오는 제공 · 확인된 경우만). 겹치면 기존 `EMAIL_IN_USE` 안내를 유지한다(#987 U2 · 자동 병합 금지). 미확인 · 미제공이면 `NULL` 로 둔다 |
| Q3 | 정본은 「파트너 분류는 독립 공간의 자동 가입 · 운영권을 만들지 않는다」(통합 가입 정본 12행)고 한다. 그런데 사용자는 「파트너로 가입하면 파트너 공간을 이용한다」고 설명했다 | 이 WO 에서는 파트너 처리를 바꾸지 않는다. 별도 결정으로 둔다 |

## 3. 설계 판단

| 결정 | 근거 |
|---|---|
| **R2 단계 분리:** ① 정본 문서 PR → ② DB(`users.email` NULL 허용) migration PR → ③ 서버 PR → ④ 공통 인증 화면 PR → ⑤ 서비스별 소비 확인 | `AGENTS.md` §4-3 R2 · R4 · R6. migration lane · `core-hub` · `shared-package:auth-react` lane 이 각각 다르다 |
| `users.email` 은 **NULL 허용 + UNIQUE 유지**로 바꾼다. 중복 판정은 지금처럼 `lower(email)` 이다 | PostgreSQL UNIQUE 는 NULL 을 여러 개 허용한다. 이메일이 있는 계정끼리의 중복 차단(U2)은 그대로 유지된다 |
| 이메일 로그인 가입은 그대로 둔다(이메일 필수 · 확인 메일 유지) | 이메일 자체가 로그인 수단이고, 비밀번호 재설정 경로다. S3 은 소셜 가입에 적용한다 |
| 소셜 가입은 `isEmailVerified` 를 이유로 세션을 막지 않는다. 이메일이 없으면 확인 메일을 보내지 않는다 | S2 · S3. 이메일 확인은 그 이메일을 실제로 쓸 기능이 생길 때 그 기능에서 요구한다 |
| 카카오 · Google 가입 폼에서 이메일 · 이름 · 휴대전화 · 닉네임 칸을 없앤다 | S1. 닉네임은 역할 입력에서 받는다(S4) |
| 역할 입력 서버 검증(`INVALID_MEMBER_PROFILE`)을 「닉네임 필수 · 이름 · 휴대전화는 값이 있을 때 형식만」으로 바꾼다. 직역별 필수는 유형별 `validateRegistration` 에서 다룬다 | S4 · S5 |
| 닉네임은 소셜 프로필로 미리 채우지 않는다 | #987 U4 유지 |
| 아이디 찾기(이름+휴대전화 대조)는 이메일 로그인 계정에만 해당하므로 그대로 둔다 | 소셜 계정은 로그인 ID 를 찾을 필요가 없다 |

## 4. 범위 밖

- 파트너 공간 · 권한(Q3)
- 이메일 로그인 가입의 이메일 확인 제거
- 이메일을 쓰는 기능(알림 · 문의 등)의 재설계. 각 소비처는 「이메일 없음」을 안전하게 건너뛰게만 고친다(T3)
- 기존 계정 데이터 변경. 기존 계정의 이메일을 지우거나 바꾸지 않는다

## 5. TODO

- [ ] T0 [LOCAL] 영향 조회(read-only, 아래 SQL-1) — 확인 메일 관문에 막혀 있는 기존 계정 수를 파악한다
- [ ] T1 [CLOUD] 정본 문서 PR(문서 전용, R6)
  - 일부 완료(#1014, 2026-11-10): 통합 가입 정본 상단 · 12행에 S4 · S5(닉네임만 필수 · 이름 · 휴대전화 선택)와 2단계 가입 신청이 반영됐다. 남은 것은 S1 ~ S3 이다
  - [`O4O-UNIFIED-MEMBER-REGISTRATION-V1`](../baseline/O4O-UNIFIED-MEMBER-REGISTRATION-V1.md) 에 S1~S5 를 반영한다
  - [`O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1`](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md) 의 「메인 이메일 확인」을 소셜 가입 기준으로 고친다
  - 기준 문서의 내용 변경이므로 통합 담당 확인 후 진행한다
- [ ] T2 [CLOUD] `users.email` NULL 허용 migration(migration lane · 동결 Core 승인 = 이 WO)
  - [`PRODUCTION-MIGRATION-STANDARD`](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) 를 따른다(manifest · expected-schema-states · 격리 DB fingerprint)
  - `User.ts` 를 `email!: string | null` · `nullable: true` 로 바꾼다
- [ ] T3 [CLOUD] `users.email` 소비처 정리(core-hub)
  - `node scripts/quality/check-literal-consumers.mjs` 와 grep 으로 소비처 목록을 만든다
  - 각 소비처가 `NULL` 을 안전하게 처리하게 한다: 메일 발송 건너뜀 · 목록 「미제공」 표시 · 토큰 · 감사 로그
  - 소비처 목록은 PR 에 첨부한다
- [ ] T4 [CLOUD] 서버 가입 경로(core-hub)
  - 카카오 signup: 이메일 입력을 받지 않는다. Q2 에 따라 제공자 확인 이메일만 저장한다
  - 소셜 `sessionOrVerification`: 미확인 이메일로 세션을 막지 않는다
  - Google signup: 이름 · 휴대전화 입력을 제거한다
  - ~~역할 입력(`member-registration.service.ts`) 검증을 S4 · S5 로 바꾼다~~ — #1014 에서 완료(zod · service 검증, 빈 값은 기존 값 유지)
  - DTO · 테스트를 갱신한다
- [ ] T5 [CLOUD] 공통 인증 화면(`shared-package:auth-react`)
  - `KakaoContinue` · `GoogleContinue` 가입 단계를 「약관 동의(Q1) → 계정 생성 → 역할 입력으로 이동」으로 바꾼다
  - #987 의 오류 안내(`EMAIL_IN_USE` · 만료)는 남는 경로에서 유지한다
- [x] T6 [CLOUD] 역할 입력 화면 — #1014 에서 완료(2단계 가입 신청 · 닉네임 필수 · 이름 · 휴대전화 선택)
  - `MemberRegistrationForm.tsx`: 닉네임 필수, 이름 · 휴대전화는 직역별 처리(S5)
  - 약사 유형이 면허 확인에 이름이 필요한지 그 유형 필드에서 확인한다
- [ ] T7 [CLOUD] 소비 서비스 확인: `web-neture` · `web-kpa-branch` · `web-pharmacy-business` 의 가입 후 이동(`/signup` · `MemberRegistrationCompletion`) 동작을 확인한다
- [ ] T8 [LOCAL] migration 적용 — **통합 담당 명시 승인 필요**(`AGENTS.md` §5 · `promote.yml` LEVEL_3)
- [ ] T9 [LOCAL] 배포 후 실계정 확인. 사용자가 카카오 · Google 로 직접 로그인한다
  - 카카오(이메일 제공 거부 포함) · Google 가입 → 곧바로 역할 입력 화면 → 닉네임만으로 제출 가능(직역 필수 제외) → 관리자 승인 대기
  - 생성한 테스트 계정은 종료 후 삭제하고, 남아 있지 않은지 확인한다(`AGENTS.md` §5 테스트 데이터)

### LOCAL read-only SQL (`/db-readonly`, `o4o_readonly`)

이메일 · 이름 같은 원문은 조회하지 않는다. 건수와 날짜만 본다.

```sql
-- SQL-1: 소셜 연결이 있으나 이메일 미확인인 계정 — 확인 메일 관문에 막혀 있을 수 있는 계정 수
SELECT la.provider,
       count(DISTINCT u.id)                               AS users,
       min(u."createdAt")::date                           AS first_created,
       max(u."createdAt")::date                           AS last_created
FROM users u
JOIN linked_accounts la ON la."userId" = u.id
WHERE la.provider IN ('kakao', 'google')
  AND u."isEmailVerified" = false
GROUP BY la.provider;
```

**판정 기준**

- SQL-1 이 0건이면 기존 계정 영향이 없다. 서버 변경(T4)만으로 충분하다.
- 1건 이상이면 관문이 풀린 뒤 그 계정이 바로 로그인돼 역할 입력으로 간다. 기대 동작이며 데이터 변경은 필요 없다. 건수만 PR 에 기록한다.
- 결과에 테스트로 만든 계정이 섞여 있으면 정리 대상 여부를 통합 담당이 판단한다.

## 6. 검증 계획

- **서버:** api-server `tsc` · 관련 jest
  - 카카오 · Google signup: 이메일 없음, 제공자 이메일 중복, 만료
  - 역할 입력: 닉네임 필수 · 이름 · 전화 선택
  - `users.email NULL` 소비처
- **migration:** contract · 격리 PG fingerprint(PRODUCTION-MIGRATION-STANDARD)
- **auth-react:** vitest
  - 가입 단계에 입력칸이 없음
  - 동의 → 역할 입력 이동
  - #987 오류 안내 회귀
- **web-neture · web-kpa-branch · web-pharmacy-business:** `tsc` · vitest
- **배포 후:** T9 실계정 확인(PC · mobile). Demo 계정은 인증 수단 변경이 금지라 이 흐름을 검증할 수 없다

## 7. 문서 정합

- 발견: 정본 2건(1-2)이 S1~S3 과 다르다. T1 에서 별도 문서 PR 로 처리한다(인라인 수정 안 함)
- 발견: [`WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1`](WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1.md) 설계 판단 「가입 유형 입력이 이후 필수로 받으므로 값이 영영 비는 일은 없다」는 S5 로 대체된다. 기록물이라 수정하지 않는다
- 이 WO 작성 시점: `문서 정합: 발견 3건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(T1 정본 문서 PR)`
