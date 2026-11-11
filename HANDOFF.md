# HANDOFF

> 저장소: `Renagang21/o4o-platform` · 작업 branch: `claude/intelligent-cray-o2p4u3` · 코드 기준: `main` `c5da56311f`(merge 반영) · 작성: 2026-11-11 (클라우드 작업 세션)
> 다음 실행자: **통합 세션(PR 생성 · 병합) → 통합 담당 승인 → LOCAL(migration promote · 배포 · 배포 후 실계정 확인)**
> 이전 인계 전문(계정 삭제 작업 · 통합 진행표): `git show 6879253966:HANDOFF.md`

## 한 일 — 소셜 가입 직후 바로 가입 신청 (WO-O4O-SOCIAL-SIGNUP-DIRECT-ROLE-REGISTRATION-V1)

통합 담당 지시: 2026-11-11 「진행하자」. 앞서 계정 삭제 작업(이 branch 의 이전 commit)은 #1022 · #1023 으로 병합됐다.
이 branch 에 `origin/main` 을 merge 해서 main 과 내용이 같은 상태로 맞춘 뒤 아래 4 commit 을 쌓았다.
이 branch 의 PR 은 **미생성**이다. 플랫폼이 자동으로 만든 드래프트 PR 도 없다(2026-11-11 조회).

| # | commit | 내용 | 지시서 |
|---|---|---|---|
| 1 | `767f97d28a` | `users.email` NOT NULL 해제 migration(`AllowUsersWithoutEmail1794357598911`) · manifest · expected-schema-states | T2 |
| 2 | `e9f20a9834` | 서버. 소셜 가입은 약관 동의만 받는다. 이메일 없는 계정을 안전하게 처리한다 | T3 · T4 |
| 3 | `0bf38e8d4a` | 공통 인증 화면. 카카오 · Google 가입 화면을 약관 동의만으로 바꿨다 | T5 |
| 4 | `6d746943a1` | 기준 문서 2건에 S1~S3 반영 | T1 |

### 1. migration (T2)
- `ALTER TABLE users ALTER COLUMN email DROP NOT NULL`. UNIQUE 는 유지한다. NULL 은 겹쳐도 된다.
- 기존 행은 바꾸지 않는다.
- down 은 이메일 없는 계정이 있으면 멈춘다. 값을 지어내지 않기 위해서다.

### 2. 서버 (T3 · T4)
- **카카오 가입**(`kakao-auth.service.ts`)
  - 이메일 · 이름 · 닉네임 · 휴대전화를 받지 않는다. 예전 화면이 보내도 쓰지 않는다.
  - **카카오가 확인한 이메일만** 저장하고, 없으면 `NULL` 로 둔다(Q2).
  - 확인할 이메일이 남지 않으므로 `isEmailVerified=true` 로 만들고, 확인 메일 없이 세션을 준다.
  - 같은 이메일의 기존 계정이 있으면 `EMAIL_IN_USE` 를 유지한다. 자동 병합하지 않는다.
- **예전 카카오 계정**: 가입 때 직접 입력한 미확인 이메일이 있는 계정만 기존 확인 메일 관문이 남는다(`sessionOrVerification`).
- **Google 가입**(`google-auth.service.ts`): 이름 · 닉네임 · 휴대전화를 받지 않는다.
- **이메일 없는 계정 처리**
  - `User.email` 을 nullable 로 바꿨다.
  - 확인 메일: 이메일이 없으면 메일 · 토큰을 만들지 않는다(`email-auth.service.ts`).
  - **계정 삭제**: 이메일이 없으면 `"null"` 문자열을 식별값으로 쓰지 않는다(`account-erasure.service.ts`). 고치기 전에는 `"null"` 이 든 모든 행이 사본으로 잡혔다. 테스트로 재현한 뒤 고쳤다.
  - **관리자 회원 정정**: 이메일 없는 회원도 이메일을 비워 둔 채 다른 정보를 고칠 수 있다(`member-profile-corrections.ts`). Admin 화면은 비어 있으면 보내지 않고 「미제공」으로 표시한다.
- **소비처 점검 결과**: 위 4곳 외에는 수정이 필요 없었다.
  - 서버에서 `.email` 을 쓰는 파일은 126개다. 대부분 SQL 조회 · `COALESCE` · 토큰(`payload.email || ''`)이라 빈 값을 이미 처리한다.
  - `normalizeLoginEmail` · `maskLoginEmail` 은 null 을 안전하게 받는다.
  - 프론트는 `user.email?.split` 처럼 옵셔널로 처리돼 있다.

### 3. 화면 (T5)
- `KakaoContinue` · `GoogleContinue` 에서 입력칸을 모두 없앴다. 남은 것은 약관 · 개인정보 동의(+마케팅 선택)와 「동의하고 가입하기」뿐이다.
- 가입이 성공하면 `/signup`(가입 신청 · 역할별 입력)으로 간다. 기존 `EmailAuthPages` onSuccess · `MemberRegistrationCompletion` 가 처리한다.
- `auth-client` 타입 변경: `KakaoSignupRequest.email` 을 선택으로 바꿨고, Google 가입의 `name` · `nickname` · `phone` 은 사용 중단으로 표시했다.

## PR 로 묶을 단위 · 순서 (중요)

1. **PR-A (migration lane)**: commit 1만 묶는다. 병합 후 **promote(LEVEL_3)로 운영 DB 에 적용**해야 한다. 이 단계는 **통합 담당 명시 승인이 필요**하다(AGENTS.md §5 · §4-1(f)).
2. **PR-B (서버 + 화면)**: commit 2 · 3을 묶는다. **반드시 PR-A 의 운영 적용 후에 배포한다.**
   - 서버가 먼저 나가면, 이메일을 주지 않는 카카오 가입이 NOT NULL 위반으로 실패한다.
   - 화면(web)이 서버(API)보다 먼저 나가면, 이메일을 보내지 않는 새 화면 요청을 옛 서버 DTO 가 거부한다.
   - 그래서 **API 배포 → web 배포** 순서로 한다. 두 lane(`core-hub` 성격 서버 파일 · `shared-package:auth-react`)에 걸치지만 함께 나가야 해서 한 PR 로 묶었다(R2 예외 · 영향 서비스는 `neture.co.kr/signup` 하나).
3. **PR-C (문서)**: commit 4. 문서 전용 PR 이다(R6).
- 「TODO 항목 → 완료」(지시서 갱신은 통합 세션 몫): T1 · T2 · T3 · T4 · T5 완료. T0 은 사용자 판단으로 생략했다(아래 결정 사항). T7 은 확인을 마쳤다(아래 결정 사항). T8(promote) · T9(실계정 확인)이 남았다.

## 결정 사항 (§9)

- **T0(기존 계정 영향 조회) 생략:** 사용자 판단(2026-11-11). 지시서 판정 기준상 결과와 무관하게 할 일이 같다.
- **소셜 신규 가입은 `isEmailVerified=true`:**
  - 이 값을 「계정 확인됨」으로 쓰는 곳이 서버에 약 100곳 있다(회원 상태 · 협동조합 · 운영자 지정 등). 하나씩 바꾸지 않고, 소셜 가입은 「확인이 남은 이메일 없음」으로 기록했다.
  - 저장된 이메일은 제공자가 확인한 것뿐이므로 사실과 어긋나지 않는다.
- **예전 카카오 계정(직접 입력한 미확인 이메일)은 확인 메일 관문을 유지:**
  - 관문만 풀면 `isEmailVerified=false` 때문에 회원 상태가 계속 「확인 대기」로 남는다.
  - 데이터를 바꾸지 않는다는 원칙도 있어서 그대로 두었다.
- **Google 가입도 이름 · 닉네임 · 휴대전화를 받지 않음:** S1 을 카카오와 똑같이 적용했다. 서버는 예전 화면이 보내는 값을 오류 없이 무시한다.
- **T7(다른 서비스):** 가입은 `neture.co.kr/signup` 한 곳에서만 한다. web-kpa-branch · pharmacy-business · pharmacy-coop · store 는 그곳으로 보낸다. 그래서 다른 서비스는 바꾸지 않았다.
- **이 세션의 지정 branch 하나에 4 commit 을 쌓았다.** migration · 서버 · 문서를 별도 branch 로 나누는 대신, 위 PR 묶음 단위로 cherry-pick 해 PR 을 만들도록 넘긴다. 이 세션은 지정 branch 외에 push 하지 않는다.

## 검증 결과 (격리 PostgreSQL · 일회용 클러스터, 운영 DB 아님)

- **migration**
  - 빈 DB 에서 `migrate.ts` 를 전부 실행했다. 처음 실행: `POST_MIGRATION_SCHEMA_ASSERTION = FAILED`(신규 상태 미등록 — 정상). fingerprint 를 등록하고 새 DB 에서 다시 실행: `PASS`.
  - baseline 검증도 이 DB(PG16)에서 통과했다. CI 는 PG15 다.
  - down→up 수동 확인 · `check-migration-contract.mjs` 21/21 · migration 관련 spec 109 passed(4 skip)
- **서버**
  - api-server `tsc` 통과(단 `strictNullChecks` 가 꺼져 있어 null 오용은 검색으로 점검했다)
  - 카카오 가입 41/41 · Google 43/43 · demo 16/16 · 소셜 관련 7개 파일 165 passed(57 skip — DB 필요)
  - auth · admin · route 묶음 614 passed
  - `account-erasure.integration.test.ts` 신규 「이메일 없는 계정 삭제」: 통과. 고치기 전 코드로는 실패하는 것도 확인했다.
  - `central-member-workspace.postgres.spec.ts` 17/17. 신규 「이메일 없는 회원 정정」 포함.
- **화면**
  - auth-react vitest 295/295 · web-neture `components` · `pages/auth` 485/485 · admin-dashboard `operators` 148/148 · admin tsc 통과
  - auth-react tsc 오류 8건은 이번에 손대지 않은 테스트 파일의 기존 오류다(AccountSecuritySettings · LoginMethods · ServiceSpaceSwitcher · emailAuth · useServiceAuth).
- **정적 검사**: `check-unsafe-routes` 0 · `check-forbidden-tables` 통과 · `check-doc-sensitive` 0

## 확인하지 못한 것

- **`socialAuth.integration.test.ts`(카카오 가입 실제 DB 경로)**
  - 새 동작에 맞게 고쳤지만 이 세션에서 실행하지 못했다.
  - 실행기 `scripts/testing/auth-operational-postgres.mjs` 는 PG15 `initdb` 와 고정 Node · pnpm 버전이 필요하다. CI 에서도 돌지 않는다.
  - LOCAL 에서 한 번 실행을 권한다.
- **배포 후 실계정 확인(T9)**: 사용자가 카카오 · Google 로 직접 새로 가입해 본다(Demo 는 인증 수단 변경 금지라 이 흐름을 검증할 수 없다). PC · 모바일 모두 확인한다.
  1. 가입 화면에 이메일 · 닉네임 · 이름 · 휴대전화 칸이 없고 약관 동의만 있다.
  2. 「동의하고 가입하기」 → 바로 가입 신청(유형 선택) 화면으로 간다. 확인 메일 안내가 나오지 않는다.
  3. 카카오가 이메일을 주지 않은 계정은 Admin 회원 목록 이메일 칸에 「미제공」으로 보인다. 회원 정보 수정이 된다.
  4. 생성한 테스트 계정은 확인 뒤 Admin 「계정 삭제」로 지운다(이메일 없는 계정 삭제 경로 확인을 겸함).
- 운영 DB 에 예전 카카오 가입으로 확인 메일에 막혀 있는 계정이 있는지는 조회하지 않았다(T0 생략).

## 겹칠 수 있는 열린 PR

- 조회하지 못했다. 통합 세션이 PR 을 만들 때 확인한다(`pr-overlap` Action 도 알려 준다).

## 문서 정합

문서 정합: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건. 발견 2건은 지시서 1-2 의 정본 2건이고, 통합 담당 지시로 PR-C 에서 내용을 갱신했다.
