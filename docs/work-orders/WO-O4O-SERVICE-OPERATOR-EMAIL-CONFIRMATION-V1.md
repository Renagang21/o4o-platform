# 서비스 운영자 이메일 초대와 기존 지정 확인

> **상태**: ACTIVE
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거**: 사용자 승인 — 미가입자 초대, 기존 지정자 이메일 확인, 개발용 운영자 테스트 계정. 종료 범위는 push와 PR이며 병합·배포·운영 DB 변경·실제 메일 발송은 제외.

## TODO

- [x] 코드·정본 조사: role_assignments가 권한 정본이며 service_memberships의 기존 상태를 승격하면 안 된다.
- [x] 기존 Google 전용 직접 지정과 폐기된 초대 runtime/잔존 migration 조사.
- [x] 메일 소유 확인과 로그인 계정의 명시적 수락 후 서비스 역할 부여.
- [x] 기존 지정 계정의 확인 메일, 대기/완료 표시, 재발송·취소.
- [x] 미가입자 가입 후 수락, 잘못된 계정·만료·재사용·동시 수락 방어.
- [x] 관리자와 수락 화면, focused 검증, 문서 정리.
- [ ] commit · push · PR (병합/배포 제외).

## 확정한 구현 경계

- 전체관리자만 서버 역할 카탈로그의 서비스 admin/operator를 초대한다. platform 역할, 개별 분회/커뮤니티 역할은 제외한다.
- 미가입자의 users/credential/role/membership를 미리 만들지 않는다. 가입은 기존 가입 절차를 사용한다.
- 기존 사용자는 관리자가 선택한 users.id에 초대를 고정한다. 이메일 일치에 의한 계정 병합/Google 연결 변경은 없다.
- 메일의 일회용 비밀 링크가 초대 이메일 소유를 증명하고 인증된 세션과 명시적 수락이 사용자 ID를 확정한다. Google 이메일이 다르더라도 자동 연결하지 않는다.
- 새 지정은 수락 전 권한이 없다. 기존 운영자는 이메일 확인 전 권한을 유지한다. 확인 기한에 따른 자동 중지는 이번 정책에 없으며 도입하지 않는다.
- 기존 운영자 확인은 기존 역할이 아직 유효할 때만 완료한다. 회수된 역할을 수락으로 복구하지 않는다.
- 링크는 7일 유효, SHA-256 해시만 저장, POST 수락, 재발송 시 이전 링크 폐기. GET/메일 스캐너는 수락하지 않는다.
- SMTP 실패는 성공으로 응답하지 않는다. 실제 일괄 메일은 자동 실행하지 않고 관리자가 각 지정의 확인 메일을 요청한다.
- Neture의 공개 수락 화면이 로그인/가입과 확인을 담당한다. 특정 서비스 운영자 권한만 부여하고 기존 서비스 가입 상태는 그대로 보존한다.

## 개발자 테스트 계정

실제 운영자의 Google 비밀번호·쿠키·refresh token은 공유하지 않는다. 별도 개인별 테스트 계정을 로컬/테스트 DB에서 기존 이메일 가입·확인으로 만들고, 동일한 초대 수락 절차로 서비스 역할을 부여한다. 로컬 메일 수신함에서 링크를 확인한다. `platform:*`와 Admin은 계속 Google 전용이다(`password-session.policy.ts`). 서비스 운영자 역할은 이 경계에 포함되지 않으므로 이메일·비밀번호 로그인으로 테스트할 수 있다. Google-only 실제 사용자에게 비밀번호를 임의 추가하거나 인증 우회/debug login을 만들지 않는다.

공용 Google 계정 대신 개인별 최소 역할·서비스의 테스트 계정을 쓰고 credential은 로컬 비공개 설정에 보관한다. 운영 테스트 계정 생성·초대 발송·데이터 write는 별도 실행 범위다.

## 조사 근거

`services/admin/operator-assignment.service.ts`, `controllers/admin/OperatorAssignmentController.ts`, `config/operator-role-catalog.ts`, `services/admin/service-membership-ensure.ts`, `common/auth/password-session.policy.ts`, `services/auth/email-auth.service.ts`, `pages/operators/OperatorsPage.tsx`.

과거 Google-only 초대 폐기 가드는 이번 사용자 결정에 맞춰 새 확인 도메인만 명시적으로 허용하며 과거 bootstrap/account-linking 경로를 복구하지 않는다. 정본 색인과 역사 WO는 변경하지 않는다.

## 검증 결과 (현재 클라우드 인스턴스)

- pnpm 10.25.0 frozen lockfile 설치. dependency/lockfile 변경 없음. Node 24.19.0 사용(저장소 engines >=22.18.0).
- API focused Jest **13 suites / 198 tests PASS**. 실제 격리 PostgreSQL 17.5 트랜잭션 **22 tests 포함**.
- 관리자 Vitest **3 files / 13 tests PASS**, Neture 수락 화면 **1 file / 5 tests PASS**.
- API build, 관리자 type-check + Vite build, Neture TypeScript + Vite build PASS.
- Chromium 1440×1000 / 390×844: 관리자 미가입 초대와 메일 링크의 명시적 수락 PASS, page error 0. 인증/응답은 synthetic fixture이며 실제 OAuth·메일 발송 검증이 아니다.
- 신규 migration은 격리 DB에서 up/down/up 및 기존 prefix fingerprint 재현 확인. 이전 상태 6652 lines, 신규 상태 6680 lines. 전체 bootstrap·incremental prefix fingerprint 대조 PASS.
- migration contract **21 PASS**, 문서 민감정보 패턴 **0건**, diff whitespace PASS.
- 메일 실패 롤백, 재발송 실패 후 이전 링크 보존, 권한 회수/계정 정지, 권한 편집·레거시 KPA 경로의 우회 차단, 초대 대상 개인정보 제거 및 다른 사용자의 초대 보존을 확인했다.

## 로컬 통합 테스트 재현

먼저 SETUP.md의 도구 버전과 frozen 설치/의존 패키지 빌드를 따른다. **운영 DB와 연결되지 않은 일회용 로컬 PostgreSQL**, `127.0.0.1:55432`, 로컬 역할 `agent`가 필요하다. 다음 준비 도구는 `.env`/DB credential을 읽지 않으며 고정된 fixture DB가 이미 있으면 덮어쓰지 않는다.

```bash
OPERATOR_INVITE_TEST_PORT=55432 pnpm exec tsx scripts/dev/prepare-service-operator-invitation-fixture.ts
OPERATOR_INVITE_TEST_PORT=55432 pnpm --filter @o4o/api-server exec jest --runInBand --no-coverage --runTestsByPath src/services/admin/__tests__/service-operator-invitation.integration.test.ts
```

준비 도구는 canonical bootstrap과 incremental manifest를 실행하고 매 prefix의 schema fingerprint를 검사한다. 통합 테스트는 해당 fixture DB의 synthetic 사용자·권한 자료를 초기화한다. 기존 배포 자격정보나 `.env`를 연결하지 않는다. 테스트의 erasure fixture는 기존 writer-fence 정책을 새 테이블까지 준비한다(운영 schema 변경이 아니다).

로컬 이메일 로그인/초대의 메일은 개발용 수신함을 사용한다. 현행 메일 origin은 canonical Neture이므로 로컬에서 받은 링크는 path·fragment를 유지해 로컬 frontend에서 확인한다. 로컬 토큰을 운영 API에 보내거나 실제 운영자의 Google 세션을 복사하지 않는다.

## 반영·후속 경계

- 신규 migration `CreateServiceOperatorConfirmations1792029600000` 추가 및 등록. **운영 적용하지 않음**. 확인 자료가 있으면 down은 거절하며 잠금·트랜잭션이 필요하다.
- 이번 사용자 승인 범위는 코드·문서·로컬 검증·push·PR이다. main 병합, 배포, 운영 DB write, 실제 초대/확인 메일 일괄 발송은 실행하지 않는다.
- 후속 승인된 배포에서 migration → API·Admin·Neture 반영 후 실제 메일/Google·이메일 가입·수락을 확인한다. 기존 운영자 확인 메일은 Admin 운영자 행 메뉴에서 명시적으로 요청한다. 확인 대기 중 권한은 유지된다.
- 기존 권한 부여자 삭제가 `role_assignments` 이력 검토를 요구하는 기존 정책은 변경하지 않았다. 새 초대의 대상/발송자 처리만 분리 검증했다.
- 문서 정합: User Domain 정본에 사용자 확정 정책을 추가했다. 기존 역사 WO·정본 색인·무관한 App.tsx 주석은 변경하지 않았다.
- 클라우드의 격리된 기존 checkout에서 전용 branch를 사용했으며 별도 worktree는 생성하지 않았다.
