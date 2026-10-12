# O4O 두 단계 계정 제거 공통 영향 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-12 · **최종 갱신**: 2026-10-12
> **근거 WO/IR**: [Core WO](../work-orders/WO-O4O-TWO-STAGE-ACCOUNT-ERASURE-CORE-V1.md) §10
> **범위**: 코드/격리 합성 검증·PR/main 추적. 운영 DB/GCS 집행·일반 실계정 OAuth 완료 기록이 아니다.

## Shared Module Change Verification

### Changed shared module

- Module: AccountErasureService, MembershipApprovalService의 scoped stop, auth-context의 active CAS.
- Package: apps/api-server와 Admin 공통 계정 관리.
- Direct consumers: 두 DELETE route, platform Admin, Neture 서비스 중지.
- Indirect consumers: 공통 인증을 사용하는 Neture/KPA/K-Cosmetics/GlycoPharm/GlucoseView 및 분회 참조, service membership/개인 파일/공통 DB writers.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | 검증 방식 | 결과 |
|---|---:|---|---|---|
| Admin 두 DELETE/client/공통 계정 UI | 예 | 동일 완료/미완료 결과·status/retry·기본 숨김 | 실제 router+JWT+DB·UI6 tests·Chromium 합성 API | PASS; 실제 OAuth 미실행 |
| Neture scoped stop | 예 | 원장 없는 verified-email 접근도 서비스만 중지 | 격리 DB, 타서비스/전체계정 보존·승인157 tests | PASS |
| 모든 서비스 공통 인증 | 간접 | pending은 접근/발급/refresh/handoff 거절 | 실제 token/session/helper·인증182 tests | PASS; 실제 브라우저/OAuth 미실행 |
| KPA/K-Cosmetics 공통 소비처 | 간접 | 공통 계정·writer fence 영향 | source/schema census·API build·공통 인증 검증 | 전용 UI smoke 미실행; runtime 기본 비활성 |
| GlycoPharm/GlucoseView/My Home | 간접 | 공통 session/user 참조 | 공통 인증·타 origin session 검증 | 사용자 본인 데이터 최종 검증 대기 |
| 분회 참조 | 간접 | 공통 인증/writer, 전용 원장은 미분류 검토 | schema references·기존 API build | 기간 확정/전용 구현/배포 없음 |
| business/forum/shared 파일 | 예 | 무검토 CASCADE/삭제 성공 금지 | synthetic residual/타인 보존·ownership/generation | PASS; domain/파일 전수 handler 미완료 |
| 기존 retention job6 targets | 아니오 | community live 자동파기 추가 없음 | import/registration 확인 | 변경 없음; 새 maintenance 기본 dry-run |

### Route / role / capability check

- Route existence: 기존 두 DELETE 유지, Admin erasure-capabilities/status/retry 추가. 신규 프론트 route/menu 없음.
- Role guard: authenticate+현재 DB platform:super_admin 및 기존 Google 경계 유지. Operator에게 전체 삭제 권한 부여 없음.
- Capability map: 공통 메뉴 map 변경 없음. 현재 Admin role+서버 enabled=true일 때만 control 표시.
- Visibility/filter: feature 기본 off; Demo/super admin 서버 보호. role revoke는 기존 독립 flow 유지.
- Empty group/block removal: 해당 없음.

### Smoke result

- Admin: Chromium1440/375/320, 합성 API에서 incomplete→상태 확인→confirmed, 가로 넘침 없음; 실계정 사용 없음.
- KPA: 공통 source/schema/token 검증; 서비스 UI 사용자 smoke 대기.
- K-Cosmetics: 공통 source/token 검증; 서비스 UI 사용자 smoke 대기.
- Neture: scoped stop 실제 격리 DB PASS; 실제 Google/Kakao·공급자/내 매장 사용자 smoke 대기.

## 검증 증거와 한계

격리 PostgreSQL22, 승인157, 인증182, Admin UI6, 설계11 tests PASS. API build·Admin typecheck/build·migration contract21 checks PASS. 새 DB의 정식 baseline→23 migration runner 최종 schema assertion PASS (`c45f9b5235a55aa0c5e008b159c7bc2bf0ddab97f9cc743d88322e916d12a45f`,6617 lines). 상세 검증 대상/운영 미확인 항목은 WO §10.2~§10.3을 따른다. storage SDK mock4 tests도 PASS. 실제 GCS가 아닌 mock 검증이다. PR CI는 아래 통합 기록에 추가한다.

실계정/운영 DB/실제 GCS 데이터 테스트0. 새 기능은 기본 비활성이고 운영 migration·전수 개인 파일 inventory·법정1/2년 근거·writer 규모·외부 upload/orphan/버전/백업 검증 없이는 활성화하지 않는다. 기존 문서 제안의 전수 handler/자동 backoff/producer 계약이 모두 완료됐다고 판정하지 않는다.

## 통합·Delivery 추적

- Base: 시작 시 최신 origin/main `63653694b3bc35b4d127541fafb76f021df1bf68`.
- Branch: `wo/integrated-account-erasure-contract` (기존 통합 WO의 후속 phase).
- Ruleset 조회: main은 PR·CI Gate 필수, human approval0. bypass를 사용하지 않는다.
- [PR #505](https://github.com/Renagang21/o4o-platform/pull/505): 최종7562f9f의 CI Gate·전체 API3 shards·CodeQL·Admin build PASS, 동일 SHA Codex 완료/추가 지적0·스레드2개 해결. 정상 merge main `c9b630feb8727aacf0d05a30b5f2ca6e922fc629`; post-merge CI `38214223715` PASS. 병합 직전 base 조회 후 동시에 반영된 #506은 #503 배포 기록만 바꾼 문서-only이며 code/schema 차이0 확인.
- Deployment: MANUAL/GATED 예상. migration 포함 promote는 AGENTS §4-1(f)/§5의 별도 운영 DDL 실행 승인 전 dispatch하지 않는다.
- Worktree: KEEP — 운영 검증·법률 시행·마지막 사용자 테스트 잔여.

문서 정합: 승인 전 조사 기록을 삭제하지 않고 WO §10에 실제 구현/제한을 추가했다. #501/#498/#500의 기존 완료를 되돌리지 않으며 분회 보존기간과 새 법률 본문 시행을 추정하지 않는다.

## 격리 검증 재현 계약

integration suite는 명시적 `O4O_ERASURE_TEST_PORT=55469`에서만 실행한다. loopback의 전용 disposable PostgreSQL cluster와 `o4o_erasure_fixture` DB를 준비하고 정식 baseline/migrate runner로 schema를 적용한 뒤 실행한다. suite의 TRUNCATE는 해당 fixture 전용이며 운영/staging DB에 연결하지 않는다. 일반 CI에서는 DB fixture 없이 skip되므로 위 실제 로컬22개 실행 증거와 구분한다. storage/unit 검증은 DB 없이 실행된다.

```bash
pnpm --filter @o4o/api-server exec jest --runInBand --runTestsByPath src/services/privacy/__tests__/account-erasure.storage.test.ts
O4O_ERASURE_TEST_PORT=55469 pnpm --filter @o4o/api-server exec jest --runInBand --runTestsByPath src/services/privacy/__tests__/account-erasure.integration.test.ts
pnpm --filter @o4o/admin-dashboard exec vitest run src/pages/platform/account-governance/AccountErasureControls.test.tsx
node scripts/db/check-migration-contract.mjs
```

재시도 권한 회수 회귀 PASS: 준비·파일 단계·최종 DB commit에서 현재 platform super admin을 재확인한다. 회수된 권한의 retry는403이며 operation을 재분류/수정하지 않는다. 최종 격리 DB22개+storage mock4개=26 tests PASS.

UUID 없는 고유 이메일/출처 식별자의 문자열·JSON 재복사도7일 writer fence로 차단하는 합성 회귀 PASS. restore key에는 원문 대신 해시·문자 길이만 저장하며 완료 시 transient UUID를 제거한다. 이 추가 fence의 운영 성능/충돌 영향도 활성화 전 평가 대상이다.

## 운영 DDL 포함 배포 승인안 — 실행 전

승인 대상 후보는 **코드의 기본 비활성 상태로 API/Admin만 verified 배포**다. main 병합·post-merge CI·최신 main SHA 고정 후 `promote.yml`의 `services=api,admin`을 사용하며 분회/다른 web 전용 배포는 포함하지 않는다. 먼저 `dry_run=true`로 실제 serving gap·freeze·계정 권한·pending migration 전부를 확인한다. repository variable 조회는 현재 주입 GitHub integration 권한의403으로 직접 확인되지 않았으며 workflow 판정을 대신 승인했다고 표시하지 않는다.

실제 promote는 migration Job의 production DDL을 수반하므로 AGENTS §4-1(f)/§5에 따라 **별도 사용자 실행 승인 전에는 dispatch하지 않는다**. 대상은23단계 신규5개 테이블·writer function·현재 canonical 테이블 INSERT/UPDATE triggers와24단계 legacy identity-kind hash 파기·UUID-only writer function 교체다. 일반 계정/파일 제거는 포함하지 않으며 기존 writer에 shared transaction barrier와 UUID 복원 검사를 도입한다. 대량/장기 transaction·role/membership lock·원문 길이에 따른 비용/false-positive를 운영 규모에서 검토해야 한다. 이미 다른 migration이 쌓였으면 그 전체 pending diff를 새 범위로 보고하고 SHA를 다시 고정한다.

승인 후 검증 순서는 migration pre/post fingerprint → API0% revision Ready/전환/health → Admin0% tag smoke/전환 → serving SHA·capability disabled 확인이다. migration 이후 API rollout 실패 시 기존 revision traffic rollback은 schema를 되돌리지 않는다. 23단계는 신규 원장에 데이터가 있으면 down을 거절하며24단계는 파기한 개인정보 hash 복원 없이 forward repair를 요구한다. 계정/GCS 제거·환경 apply flag·inventory confirmed·job activation·법률 게시/재동의는 이 배포 승인안에도 포함하지 않는다.

삭제 기능 **활성화 승인안은 아직 준비 완료가 아니다**: 전수 domain/file inventory·producer/orphan·GCS soft-delete/복제/backup·법정1/2년 해당성·lock 성능·미분류 담당/24h 처리 절차를 먼저 마쳐야 한다. 기본1년 정책을 재질문하지 않고 아직 미확정인 근거와 실제 집행만 따로 다룬다.

Codex `f8fc042`의 P1/P2 처리: 공통 이름·닉네임·IP·전화·avatar/business 값은 타인의 정당한 데이터와 구분되지 않으므로 단독 자동 차단/해시 fence에서 제외했다. 고유 UUID/이메일/provider·소유 row 출처 식별자로 연관 복제를 검출하고 source UUID가 있는 이름 복제는 계속 미완료다. 분류 근거 없는 타인 이름을 지우지 않는다. 실제 완료 Admin이 audit actor를 기록하고 최초 요청 event는 원래 요청자를 유지한다. 동명이인/공통 접속·연락처 보존과 두 Admin의 요청/완료 구분을 포함한22+4 tests PASS.

PR CI shard2 실패를 로컬 전체 shard로 재현했다(155 suites2635 tests PASS, 실패1개). 원인은 email verification token consumer를 인증 발급 경로 하나로 고정한 기존 source guard였다. 계정 제거의 소유 토큰 파기 경로를 명시적으로 추가하고 토큰 INSERT/UPDATE 부재를 검증한다. 수정된 정적 인증/Demo guard26 tests PASS; 전체 PR CI 재실행 결과를 통합 gate로 사용한다.

로컬 synthetic rollback 측정: 1000 users insert는 operation0/1/10개에서28/137/753ms였다. 각 operation의 identity key는1개인 작은 fixture이며, 운영 데이터/전체 profile key 수/장기 transaction·경합 성능을 검증한 수치가 아니다. 운영 활성화 전 성능 평가를 대체하지 않는다.

main #503(`64b8df16f1`)의 직원 접근/My Home 정본을 확인하고 정상 merge로 통합했다. 해당 소유 트랙 기능을 이 작업에서 재구현하지 않았다. 역할 is_active뿐 아니라 valid_from/valid_until을 각 제거 단계의 현재 시점으로 재확인한다. 만료/미시작 역할은 요청·retry403이며 기존 operation을 변경하지 않는다. 최신 main 통합 후 격리 DB22+storage4+정적 인증17=43 tests, API build·lint PASS.

같은 WO의 검증 후속 phase를 위해 기존 branch/worktree를 유지했다(새 독립 WO 재사용 아님). 대상 super admin 보호도 현재 유효기간을 확인하도록 후속 보완한다. 만료/미시작 grant 이력만 있는 계정은 그 이유로 삭제를 막지 않으며, 현재 유효 super admin/Demo 보호는 유지한다. 같은 실제 DB fixture에서 두 만료 경계와 원래 보호를 검증했으며43 tests·API build·lint PASS. 이 보완은 추가 DDL/API/UI/운영 실행을 포함하지 않는다.

## 검증 후속 — PR #507

Codex P1 보완: 모든 활성 플래그 super admin grant를 읽을 때 잠그고, 현재 유효 보호를 요청·파일 단계·최종 DB 제거 직전에 재확인한다. future grant가 metadata 조회 중 자연스럽게 유효해지는 실제 시간 경계에서 GCS delete0·DB 계정/역할 보존·미완료를 확인했다. 명시적 grant writer는 기존 global barrier/fence를 거친다.

복원 marker는 **원래 subject/개인 소유 record UUID만**7일 보호한다. 이전 임시 구현의 이메일/연락처 hash fence는 채택하지 않는다. 이메일 재사용 금지 기간을 새 정책으로 만들지 않으며 같은 연락처의 새 UUID 가입을 허용한다. 기존 identity-kind hash는 준비/완료 때 제거하고 신규 contact hash를 저장하지 않는다. 동일 연락처로 새 가입/커뮤니티 연결 후에도 이전 최소 증빙의 subject/created/expiry는 그대로다. old UUID restore는 계속 거절한다.

자동 잔여 검사는 대상 primary email·subject/개인 record UUID의 출처만 사용한다. arbitrary owned metadata의 다른 actor/alias/provider 값은 대상 identity로 추정하지 않는다. 관련 copy는 typed domain/namespace handler의 전수 분류 범위이며 그 미완료를 숨기지 않는다. 더 긴 타인의 이메일을 부분 문자열로 오판하지 않는 경계 검사와 실제 내장 이메일 copy 검출을 분리했다. 완료 시점 snapshot 및 authenticated/UUID writer fence가 향후 새 동의로 제출되는 같은 연락처까지 금지한다는 뜻은 아니다. producer/orphan·full candidate/domain/file inventory 잔여는 계속 활성화 전 필수다.

격리 DB25+storage4+정적 인증17+Demo9=55 tests, API build·focused lint PASS. schema/manifest 변화0; #505의23단계 지문은 그대로다. 초기행위/완료권한·새가입/다른사용자 이메일/metadata actor·calendar anchor와 보호 시간 경계의 합성 검증이며 실제 OAuth/운영 삭제는 아니다.

#505 main의 `production=HELD_LEVEL_3 · api(L3),admin(needs-api)` 확인. [선택적 Promote dry-run](https://github.com/Renagang21/o4o-platform/actions/runs/38215548971) SUCCESS: services=api,admin, dry_run=true; classify만 성공, API/Admin/Web/Report 모두 skipped. 배포·migration·운영 데이터 변경0. #507 이후 최종 main SHA로 CI/serving gap을 다시 확인한다.

후속 재검토 P1의 최종 처리: role lock으로 시간 진행을 막을 수 없으므로 대상의 활성 플래그가 있고 아직 만료되지 않은 **예정 super admin grant도 보호**한다. 만료된 과거 grant는 막지 않는다. Caller 권한은 여전히 valid_from/valid_until 현재 유효기간 둘 다 필요하며 확대하지 않았다. 보호 대상은 metadata lookup/삭제 시작 전403·generation/delete0·계정 활성/operation0이다. 이미 시작한 grant writer는 global barrier/UUID fence로 직렬화/거절한다. 각 파일/최종 단계의 잠금·재확인도 유지한다. 임시 미래 grant 허용/metadata 대기 테스트는 이 최종 보호 계약으로 대체했다. 집중55 tests·API build·lint PASS; 새 DDL0.

추가 P1 처리: primary email/UUID만으로 typed identity의 잔여를 놓치지 않도록 대상 소유 `LinkedAccount.providerId`·nullable `email`을 whitelist로 수집한다. arbitrary metadata의 타인 actor 값은 계속 제외한다. UUID가 아닌 provider 문자열은 식별자 경계를 검사하며 다른 긴 값의 부분문자열로 취급하지 않는다. non-owned JSON의 provider ID와 별도 연결 이메일 copy를 각각 검사하고 미완료·typed source 보존을 확인했다. 최종 집중 DB26+storage4+정적 인증17+Demo9=56 tests·API build·lint PASS. 전체 alias/provider/domain 전수 handler가 모두 완료된 것은 아니며 활성화 전 inventory/classification 경계는 그대로다.

재검토 P2 보완: opaque provider ID의 `-`·`.`는 연속 문자로 취급한다. `-extra`·`.extra`로 이어지는 타인의 값은 변경하지 않고 대상 제거가 완료되는 실제 DB 회귀를 추가했다. 정확한 provider ID·별도 email copy는 기존 미완료 검증을 유지한다. 최종 집중 DB27+storage4+정적 인증17+Demo9=57 tests·API build·lint PASS. schema/manifest 변화0.

업그레이드 재검토 P2 처리: 신규24단계 `RetireLegacyErasureIdentityHashes1791795139475`는 completed를 포함한 **모든 legacy identity-kind hash만** 파기하고 writer 함수를 UUID/uuid-kind references만 검사하도록 바꾼다. 이전23단계 소스/지문은 수정하지 않았다. UUID marker·operation/audit·community evidence·원래 기산점은 변경하지 않는다. 이미 완료된 이전 operation의 재가입 차단을 실제23단계 함수/legacy hash로 재현한 뒤24단계에서 해소·원래 UUID/증빙 보존을 검증했다.

집중 DB28+storage4+정적 인증17+Demo9=58 tests·API build·lint·migration contract21 checks PASS. 정식 runner로 fresh baseline→24, 기존23→24,24단계 재실행 no-op 모두 PASS. 최종 지문 `41e3be0aed15b49266cca75c543d8e6d008c6b0fcf4d3b85f28b2f6a56f7c75f`,6617 lines. 파기한 연락처 hash를 backup/복원하지 않으며 down은 forward repair를 요구한다.

운영 승인안은23단계5개 테이블/trigger/function과24단계legacy 연락처 hash retirement/function 교체를 함께 검토한다. 후속이 새 migration0이던 이전 검증 기록은 이24단계 추가 전 기록이다. 운영의 일반 user/account·GCS 삭제나 feature apply flag/job/legal 게시 승인은 여전히 포함하지 않는다. 현재 운영에서23/24 실행0; 추가 변경은 격리 합성 DB에서만 적용했다.

제공자 namespace 재검토 P2 처리: LinkedAccount 식별자는 `(provider, providerId)`로 snapshot을 유지한다. 별도 연결 email은 일반 고유 email 검사에 남긴다. provider ID 후보의 구조화 JSON은 제공자 context를 함께 검사하여 Google/Kakao의 동일 ID를 다른 사람으로 구분한다. 같은 제공자의 copy 또는 제공자가 불명확한 copy는 여전히 domain review로 미완료 처리한다. 다른 제공자의 실제 linked row·중첩 copy 보존과 같은 제공자의 중첩 copy 검출을 합성 DB에서 검증했다. 집중 DB30+storage4+정적 인증17+Demo9=60 tests PASS. 새 DDL/API/UI/운영 실행은 없다.

추가 재검토 P1/P2: namespace는 알려진 Google/Kakao 구조의 `providerId` 값에만 적용한다. storage provider 및 memo/형제/중첩 값 전체로 context를 확장하지 않는다. SQL 경계 필터 뒤 transaction cursor를64행씩 읽고 발견 즉시 닫으며, 전체 후보 payload를 Node에 한꺼번에 전송하지 않는다. storage provider/다른 인증 provider의 memo copy와 짧은 ID의64행 초과 후속 copy 검출·제거 후 재시도 완료를 합성 회귀로 확인한다.
최종 집중 DB32+storage4+정적 인증17+Demo9=62 tests·API build·focused lint PASS. 새 DDL은24단계 이후 추가하지 않았으며 운영 실행0이다.

legacy 인증의 `users.provider/provider_id`도 동일 typed namespace 계약에 포함한다. 대상의 legacy source를 snapshot하고 다른 제공자의 snake_case ID는 보존하며, 같은 제공자 legacy copy는 미완료다. provider 없는 legacy source는 임의 namespace를 만들지 않고 review 후보로 유지한다. 집중 DB33+storage4+정적 인증17+Demo9=63 tests·API build·focused lint PASS. 새 DDL/API/운영 실행0.

배포 구버전 재삽입 P1 보완:24단계는 reference-key table의 ACCESS EXCLUSIVE lock 안에서 기존 identity-kind hash를 파기하고 `key_kind='uuid'` CHECK를 추가한다. migration 뒤 구버전의 연락처 hash 재삽입은23514로 실패·rollback되며 새 revision 이전에 retired 개인정보를 재생성하지 않는다. UUID marker/audit/evidence와 원래 기산점은 그대로다. 운영 제안에는 이 짧은 table lock/제약 추가도 포함하며 실제 실행은 하지 않았다.

집중63 tests·API build·focused lint·migration contract21 checks PASS. 최종24단계 지문은 `0d25da3dee92c48e7457571661be41c369fe27066009798e038309f5d20c4b50`,6618 lines로 갱신했다. 정식 runner fresh baseline→24, 기존23(지문 c45f9b5)→24,24 재실행 no-op 모두 PASS. 이전41e3be0/6617 기록은 CHECK 추가 전 검증 이력이며 현재 승인안은 이 최종 제약을 포함한다.23단계 소스/지문은 바꾸지 않았다.

준비 상태 재검토 P2: capability/실행 ready는24단계 UUID-only CHECK의 존재·validated 상태를 필수로 확인한다.23단계 상태/NOT VALID 제약에서는 disabled·요청503이며 계정 활성/operation0을 유지한다. 제약 검증 후에만 준비 조건을 충족한다. 집중 DB34+storage4+정적 인증17+Demo9=64 tests·API build·focused lint PASS.24단계 지문0d25da3d/6618 및 운영 실행0은 그대로다.
