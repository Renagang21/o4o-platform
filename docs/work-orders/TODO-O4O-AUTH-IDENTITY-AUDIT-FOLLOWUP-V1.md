# TODO-O4O-AUTH-IDENTITY-AUDIT-FOLLOWUP-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-15 · **최종 갱신**: 2026-10-16
> **근거 WO/IR**: [서비스 운영자 지정 조사 TODO](TODO-O4O-SERVICE-OPERATOR-ASSIGNMENT-AUDIT-V1.md), Google 선택 계정·O4O 표시 계정 비교 후속 요청

## 기준과 경계

[계정·서비스 가입 정본](../baseline/O4O-NETURE-AUTH-AND-SERVICE-MEMBERSHIP-V1.md)과
[기존 조사 TODO](TODO-O4O-SERVICE-OPERATOR-ASSIGNMENT-AUDIT-V1.md)를 따른다.
기존 TODO의 main 본문만으로 판정하지 않고 미통합 [PR #603](https://github.com/Renagang21/o4o-platform/pull/603)의
HEAD `b3b71b46021858c841ae203ea93509e3ef1f29d8` 변경도 확인했다. 이 문서는 그 PR의 대체나 통합 기록이 아니다.

전체 관리자와 서비스 운영자를 구분한다. 대상 운영자 원장은 기존 읽기 전용 집계 기준으로
6서비스의 현재 관리 역할·active 가입, 분회의 역할 없음·active 가입이다.
공급자·펀딩의 admin에 operator를 중복 추가하지 않는다.
분회는 새로 구축한 뒤 지정 흐름·역할 계약·원장을 재조사한다. 지금 분회 권한이나 가입 상태를
변경하지 않으며 이 작업에서 분회 재구축도 시작하지 않는다.
계정 병합·기본 이메일 수정·Google 연결 변경·운영 권한 부여/회수는 별도 범위다.
실제 Google·카카오 로그인은 사용자가 확인한다. 공개 문서에 실제 계정 식별자나 인증값을 남기지 않는다.

## 실행 TODO

- [x] 기존 checkout을 보존하고 최신 origin/main에서 새 전용 worktree·branch 생성.
- [x] AGENTS.md·SETUP.md·정본 색인·인증 정본·기존 TODO 및 PR #603 diff 확인.
- [x] PR #603의 AUTOMATIC 표기 보완 확인 후 해당 리뷰 스레드 해결 처리.
- [x] 현재 코드에서 Google identity 조회·O4O 계정 해석 경로 확인.
- [x] 화면 표시 계정의 기존 job 로그 다운로드 재시도 및 접근 차단 확인.
- [x] 기존 네트워크 목록을 보존하며 필요한 두 도메인을 환경 초안에 저장.
- [x] 환경 설정 저장·게시 후 현재 runtime 허용 목록을 재확인하고 기존 job 결과 읽기.
- [x] 확보된 집계를 대상 운영자 집계와 비교하고 결과의 확인 가능 범위를 기록.
- [ ] 사용자가 실제 로그인 결과를 확인한 뒤 원장·세션 계정의 일치 여부를 최종 판정.
- [ ] 실제 결함이 확인되면 별도 수정 범위·회귀 검증을 구체화하고 구현.

## 이번 작업에서 확인한 근거

기준 main은 `c7f2c29eb4`이며 새 branch는 `wo/auth-identity-audit-followup`이다.
기존 checkout의 branch·파일은 변경하지 않았다. 인계된 이전 작업공간은 현재 `git worktree list`에
없어 직접 clean 여부를 재검증하지 못했으며 삭제나 복구를 시도하지 않았다.

`apps/api-server/src/services/auth/google-identity.service.ts`의 `findGoogleIdentityBySub`는
`provider=google`과 검증된 `sub`에 해당하는 `providerId`로만 연결을 조회한다.
`google-auth.service.ts`의 `login`은 `linked.userId`로 O4O 사용자를 읽어 세션을 만든다.
이메일 fallback·자동 병합은 이 경로에 없다. Google 선택 계정 이메일과 O4O 기본 이메일이
다르다는 사실만으로 연결 오류를 확정하거나 데이터를 변경할 수 없다.

기존 화면 표시 계정 조회 run `38665862802`의 job `116197563425`와
`Read-only service operator assignment census` step은 SUCCESS다.
공식 개별 job logs API로 다운로드를 재시도했으나 `Forbidden`으로 실패했고 로그 본문은 0바이트였다.
따라서 집계 내용과 계정 일치는 여전히 미확인이다. 새 census dispatch는 하지 않았다.
기존 collector는 이메일 fingerprint별 집계이며 Google sub 자체나 실제 로그인 세션을 출력하지 않는다.
결과를 확보하더라도 집계만으로 실제 OAuth 소유·세션 일치를 증명했다고 보고하지 않는다.

현재 환경은 runtime revision `2`, running 및 네트워크 enforced로 관찰됐다.
인계의 revision `93`을 이 환경의 현재 상태로 사용하지 않았다.
`productionresultssa6.blob.core.windows.net`과 `results-receiver.actions.githubusercontent.com`을
기존 custom 도메인 목록에 추가한 초안 저장은 확인됐고 `requires_publish=true`다.
저장은 현재 runtime 반영이나 게시 완료가 아니다. 환경 설정에서 검토·저장 후 게시하고
실제 접근을 다시 검증해야 한다. 프록시·TLS 검증을 유지하고 제한을 우회하지 않는다.

PR #603의 유일한 리뷰 지적은 원 소스 배포를 AUTOMATIC으로 표기하라는 내용이다.
최신 diff에 해당 표기와 기존 Delivery 성공 기록이 있어 기존 스레드를 해결 처리했다.
공개 리뷰 본문은 이전 commit을 대상으로 하므로 최신 HEAD의 새 리뷰 완료로 바꾸어 보고하지 않는다.
본 공간은 개발 담당이며 PR 병합·배포 dispatch는 실행하지 않는다.

## 검증과 재개

- `node --test scripts/deployment/service-operator-census.test.mjs`: 7 PASS, 0 FAIL, 0 SKIP.
  합성 client를 통한 read-only transaction·ROLLBACK·개인정보 출력 제한·잘못된 입력 거절 회귀다.
  실제 PostgreSQL·운영 조회 결과·OAuth 검증을 대신하지 않는다.
- 문서만 추가하며 애플리케이션 코드·의존성·lockfile·CI·운영 원장은 변경하지 않는다.
- 전체 앱 type-check·lint·build와 실제 OAuth는 이번 문서 변경 검증으로 실행하지 않는다.
  초기 도구 확인은 Node 24.19.0·pnpm 11.25.0으로 저장소 pin과 달랐다.
  향후 앱 검증 전 SETUP.md의 Node 22.18.0·pnpm 10.25.0을 활성화하고 frozen install을 수행한다.

DEPLOYMENT: NOT_APPLICABLE — 이번 후속 문서 변경. 기존 소스의 자동 배포 기록과 구분한다.

문서 정합: main의 기존 TODO에는 분회 추가 제안이 남아 있으므로 PR #603의 보류 결정을 함께 참조한다.
기존 기록이나 canonical index는 이 후속 문서에서 다시 쓰지 않는다.

WORKTREE_DISPOSITION: KEEP — 후속 로그 확인과 사용자 실제 로그인 검증이 남았으며 PR 통합 전이다.

## 기존 결과 확보 — 2026-10-16

현재 환경의 네트워크 enforced와 기존 GitHub 결과 저장소 도메인 허용을 확인했다.
기존 run `38665862802`의 job `116197563425` 로그를 공식 개별 job logs API로 읽었다.
새 workflow dispatch·운영 조회·DB/권한/Google 연결 수정은 없었다.
기존 collector 출력은 `readOnly=true`, `result=TARGET_NOT_FOUND`이며 matched_accounts·
active_accounts·google_links·platform_admin_assignments가 모두 0이다.
이는 당시 입력한 화면 표시 이메일 fingerprint에 일치하는 계정이 없었다는 결과다.
기존 운영자 census의 유일한 활성 계정/연결 집계와는 다른 결과이며, 실제 Google sub나
브라우저 세션 계정을 비교한 조회가 아니므로 OAuth 연결 오류·다른 계정 연결·동일 계정임을
판정하지 않는다. 표시 이메일 차이만으로 병합·기본 이메일/연결 변경을 수행하지 않는다.
집계 결과 확보 항목은 종료하고 실제 로그인 계정 확인은 사용자 담당으로 남긴다.
후속 표준 운영 완료는 [통합 TODO](TODO-O4O-PHARMACY-OPERATIONS-COMPLETION-V1.md)에서 관리한다.
