# 서비스 운영자 이메일 초대와 기존 지정 확인

> **상태**: COMPLETED (사용자 승인한 구현·검증·push·PR 범위)
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-15
> **근거**: 사용자 승인 — 미가입자 초대, 기존 지정자 이메일 확인, 개발용 운영자 테스트 계정. 종료 범위는 push와 PR이며 병합·배포·운영 DB 변경·실제 메일 발송은 제외.

## TODO

- [x] 코드·정본 조사: role_assignments가 권한 정본이며 service_memberships의 기존 상태를 승격하면 안 된다.
- [x] 기존 Google 전용 직접 지정과 폐기된 초대 runtime/잔존 migration 조사.
- [x] 메일 소유 확인과 로그인 계정의 명시적 수락 후 서비스 역할 부여.
- [x] 기존 지정 계정의 확인 메일, 대기/완료 표시, 재발송·취소.
- [x] 미가입자 가입 후 수락, 잘못된 계정·만료·재사용·동시 수락 방어.
- [x] 관리자와 수락 화면, focused 검증, 문서 정리.
- [x] commit · push · PR (병합/배포 제외).

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

## 전달 결과

- PR: https://github.com/Renagang21/o4o-platform/pull/617
- branch: `wo/service-operator-invitations`, 구현 commit: `e92c564712`.
- 최신 main `c9b72ee2ae` 반영 후 Neture build와 수락 화면 5 tests를 다시 통과했다.
- CI 진행 상태는 PR Checks가 기준이다. main 병합·배포·운영 메일 발송은 미실행이다.
- WORKTREE_DISPOSITION: 기존 cloud checkout / 전용 branch / main integration 없음 / 보존 판정 KEEP (미병합 PR 검토용).


## 통합 후속 검증 (2026-10-16 KST)

통합 담당 공간에서 최신 main df5f28a 기반 별도 worktree에 #617 전체 이력을 merge했다. 이전 CI의 Jest 실패를 재현해, 은퇴한 직접 지정 API의 400/무쓰기 계약으로 기존 상태 보존 테스트를 정렬했다. 실제 쓰기 경로인 초대 생성·수락의 Demo 보호를 검증하고, 관리자 router 이름을 guard inventory가 읽을 수 있게 정리했다. 인증·role middleware와 공개 수락 API는 그대로다.

- 수정 focused 5 suite 39 PASS. 영향 API 13 suite 151 PASS(별도 opt-in DB suite 제외).
- 격리 PostgreSQL15에 canonical bootstrap과 전체 incremental manifest를 적용해 prefix schema fingerprint 일치를 확인했다. 실제 DB 통합 23 PASS: 이미 active인 membership 포함 상태 보존, 비활성 사용자 수락 거절/무쓰기. 컨테이너·fixture DB 제거 완료. 운영 DB 접속·DDL·메일 발송 없음.
- API 타입 검사·production build PASS. 관리자 초대/role UI 12 PASS, Neture 수락 UI 5 PASS.
- 전체 CI·Sonar·Codex는 새 통합 PR head로 판정한다. 신규 migration의 운영 적용 및 실제 계정 초대 발송은 미실행이다.


### 통합 리뷰 후속 — 가입 복귀·메일 커밋 순서·만료 초대

#641 P2 세 건을 보완했다. 초대 토큰은 tab-local sessionStorage에만 두고, 이메일 가입·확인 화면의 로그인 링크와 가입 완료 복귀는 저장된 유효 초대가 있을 때 고정 `/operator-invite`로 연결한다. 토큰은 signup/login URL에 싣지 않고 수락은 여전히 사용자의 명시적 클릭·서버 본인 확인 뒤에만 실행한다. 일반 가입, 잘못된 token, 브라우저 storage 차단 시 기본 홈 복귀를 유지한다.

메일은 token hash·만료의 transaction commit이 끝난 뒤 발송한다. commit 실패 시 메일이 전혀 발송되지 않는 회귀를 추가했다. SMTP 실패 시 이미 커밋한 pending 상태는 유지되며 이전 token은 교체된 상태다. 권한 부여는 없고, 관리자에게 목록 새로고침 후 1분 뒤 재발송·취소하도록 명시한다. 실패한 메일을 성공으로 응답하거나 DB commit을 되돌렸다고 주장하지 않는다. 이 실패 상태·기존 링크 무효·후속 재발송 복구를 실제 DB에서 검증했다.

동일 email/service/role의 새 초대를 만들 때 기존 advisory lock 안에서 만료 pending을 cancelled로 전이해 pending-only unique key를 해제한다. 관리 목록 200건 밖에 있어도 새 초대를 만들 수 있고 옛 token은 거절한다. 새 status나 schema 변경은 없다.

검증: 영향 API13 suite152 PASS(별도 DB24는 opt-in skip), 격리 PG15 실제24 PASS 및 모든 메일 callback에서 별도 DB 연결로 hash 커밋 가시성 확인. commit 실패 무발송 unit8 PASS. Neture 전체1025 PASS, 이후 추가한 복귀 helper4개와 verification9개13 PASS. API tsc/build·최종 Neture build·변경 lint PASS. fixture 컨테이너 제거 완료. 실제 사용자·운영 DB·SMTP·메일 수신·배포는 미실행이다. 최종 CI·리뷰는 새 head 기준으로 확인한다.


### 같은 통합 PR의 추가 리뷰 — 이메일 확인 새 탭과 종료 token

앞 절의 tab-local 복귀만으로는 이메일 확인 링크를 새 탭에서 열 때 원래 초대를 찾지 못했다. 정상 UI의 이메일 확인 API가 성공한 뒤, 동일 origin BroadcastChannel의 임의 nonce 요청/응답으로 원래 열린 탭의 초대를 단기 복구한다. token은 계속 sessionStorage/메모리에만 있고 localStorage·cookie·signup/login URL·로그에 쓰지 않는다. 여러 서로 다른 초대가 응답하면 추측하지 않는다. 원래 탭이 닫혔거나 channel을 사용할 수 없으면 확인 성공을 실패로 바꾸지 않으며 원래 초대 메일로 돌아갈 수 있다. 실제 로그인·inspect·명시 수락은 서버의 계정 ID·메일·만료·권한 검사를 그대로 거친다. 이메일 확인 자체가 운영자 권한을 부여하지 않는다.

inspect의 INVALID_OR_EXPIRED_INVITATION과 수락 완료 시 해당 token만 정리하며, 동일 token을 가진 원래 탭에도 종료를 알린다. 계정 불일치·일시 오류는 보존한다. 늦은 종료 응답이 다른 새 token을 지우지 않는다.

검증: 신규 terminal3개 포함 focused21 PASS, Neture 전체1032 PASS, production build·변경 lint PASS. 실제 Chromium의 독립 sessionStorage를 가진 새 탭에서8개 시나리오 PASS: 확인 뒤 복귀, 양쪽 종료 정리, 늦은 응답/새 token 보존, 복수 초대 거절, 잘못된 nonce 무시, 이메일 확인 실패 시 미복구, channel 차단/미지원에도 확인 성공 유지. 실제 인증·메일 서버는 합성 구현이며 pageerror0·network write0, fixture 서버/symlink 정리 완료. API152·격리 PG24는 앞 절 결과이며 이 frontend 후속에서 API/schema 변경은 없다. 새 head의 CI·Codex는 다시 판정한다.


### 추가 리뷰 — 수락 시 만료와 storage 차단

inspect 이후 실제 수락에서 INVALID_OR_EXPIRED_INVITATION이 반환되는 경우에도 해당 token을 종료 처리한다. 다른 계정·일시 오류는 보존한다. incoming fragment는 storage 접근 전에 즉시 제거하며, sessionStorage가 SecurityError를 내는 환경에서는 tab의 메모리로만 명시 수락과 SPA 가입 복귀를 이어간다. StrictMode 재초기화도 원래 token을 유지한다. reload나 탭 종료 후 복구를 약속하지 않으며 token을 URL·localStorage·cookie에 쓰지 않는다.

수락 만료/다른 계정/일시 오류와 storage get/set/remove 차단 StrictMode를 포함한 focused25 PASS, Neture 전체1036 PASS, production build PASS, 변경 lint 오류0/기존 경고1. API·schema 변경 없고 운영 DB·SMTP·메일 발송·DDL은 미실행이다. 최종 CI·Codex는 새 head로 다시 확인한다.

후속 경계 확인: storage 읽기는 가능하지만 쓰기만 quota 오류가 나는 경우 기존 다른 token으로 되돌아가지 않도록 메모리 상태를 우선하고, remove만 실패해도 종료 token이 부활하지 않게 했다. 이 두 회귀를 포함한 focused27 PASS, 최종 Neture build·변경 lint PASS. 전체1036은 앞 단계 결과다.

## 2026-10-25 연속 Phase — 본인 수락 통일과 보존·파기

이 절이 앞 단계의 기존 운영자 재확인·전체 관리자 전용 지정·재발송 기한 연장·옛 migration 계획을 대체한다. 사용자 확정 정본은 [운영자 초대·본인 수락 및 보존 정책](../baseline/O4O-OPERATOR-INVITATION-CONSENT-AND-RETENTION-V1.md)이다. 같은 #641 branch를 전용 worktree에서 계속 사용하며 공개 이력을 재작성하지 않는다.

- 전체 관리자·서비스/사업 Admin·분회·조합의 신규 역할은 초대 → 본인 수락 → 활성화. 기존 활성 역할은 유지하고 재확인을 요구하지 않는다. 회수는 기존 보호를 유지해 즉시 실행한다.
- 최초 7일, 재발송 secret 교체만 허용. 수락·취소·만료 후 초대용 email/hash 제거. 최소 이력은 생성 후 서울 달력 1년(2월29일→다음 해3월1일), 계정 제거 시 식별 연결 제거.
- 기존 미배포 migration을 최신 main manifest 끝의 `CreateServiceOperatorInvitations1792886400000`로 교체했다. 기존 fingerprint prefix는 그대로이며 새 prefix 6901줄/hash `b893538bce103e0d46f90610f739cb62a39dc8a5d3afeef40babe796e5fd7aea`를 추가했다. 운영 migration 미실행.
- 실제 actor/대상/소속/권한을 수락 transaction 안에서 재검사한다. canonical target lock·scope lock을 보존하고 cache는 commit 후 무효화한다. 분회 개설 승인도 같은 transaction에서 초대를 준비하고 commit 후에만 메일을 보낸다.
- dedicated retention job(1분 주기·replica advisory lock·bounded batch)과 POST 경로에서 만료 자료를 정리한다. GET 목록은 상태를 쓰지 않고 만료 연락처를 가린다. job 주기는 절대 파기 지연 상한이 아니며 배포 전 실행·backlog 모니터링 점검이 필요하다.
- ephemeral 초대 메일은 EmailLog·recipient/본문/preview/transport error 복제를 금지하고 일반 업무 메일 audit은 유지한다.
- 최신 main이 삭제한 KPA member controller와 테스트는 되살리지 않는다. 기존 서비스 가입 상태와 퇴역 서비스 정책을 보존한다.

검증·소비처 영향·운영 경계는 [이번 CHECK](../investigations/CHECK-O4O-OPERATOR-INVITATION-CONSENT-AND-RETENTION-V1.md)에 기록한다. 이 Phase의 운영 DB write·실제 사용자 권한 변경·메일 발송은 미실행이다.


## 2026-10-25 운영 반영 완료

사용자가 신규 초대 테이블 migration과 자동 파기의 운영 적용을 승인했다. #641을 main `4ee5a8ecda200a1bddf08d8f00b869e5f4c76806`으로 병합했고, main CI·Promote 배포·최종 serving SHA 검증이 성공했다. API·관리자·Neture·KPA·강의·매장·분회 및 협동조합 프런트엔드에 반영했다. 실제 초대·메일 발송·계정 권한 변경·조합 fixture 생성은 검증에 사용하지 않았다. 앞 절의 미실행 표기는 각 사전 검증 단계의 이력이며, 실제 운영 반영 결과와 리뷰 근거는 [CHECK의 운영 반영 결과](../investigations/CHECK-O4O-OPERATOR-INVITATION-CONSENT-AND-RETENTION-V1.md)에 추가했다. 정책·실행 코드·배포 설정 변경 없이 문서 정합만 완료한다.
