# 인증 후속 — API ESM 타입 재수출 오류 검증

> **작성일**: 2026-10-14 (KST)
> **상태**: ACTIVE
> **최종 갱신**: 2026-10-14 (KST)
> **근거**: [세션·비동기 정비 TODO](../work-orders/TODO-O4O-AUTH-SESSION-AND-ASYNC-MAINTENANCE-V2.md)의 API 배포용 ESM 실패 후 사용자의 “해결해 줘” 지시

upstream source의 실제 ESM 빌드 검증은 완료했다. main/운영 반영 및 인증 트랙 종료는 별도이며 ACTIVE로 유지한다.

## TODO → 코드·문서 조사로 보완

- [x] 앞선 인증 branch의 `9e7a39a896`에서 실제 `build:api`를 실행해 오류 8개 재현.
- [x] 최신 main `7d04973470`과 운영자 후속 기록에서 동일 오류의 [PR #557](https://github.com/Renagang21/o4o-platform/pull/557)이 진행 중임을 확인.
- [x] 기존 PR의 수정 책임을 유지. 같은 파일을 중복 수정하거나 다른 세션의 branch·리뷰 스레드·운영 runtime을 변경하지 않음.
- [x] 타입 선언/값 재수출을 대조하고 기존 타입 이름·경로·런타임 함수 수출의 보존 확인.
- [x] PR #557의 정확한 HEAD를 read-only archive로 검증: tsc → database 산출물 보존 → tsup → database 산출물 복원.
- [x] main/migrate bundle syntax와 관련 기존 회귀 확인.
- [x] 결과·upstream CI/review 상태를 조회하고 이번 인증 WO의 후속 기록 준비.
  기록의 commit/push 및 최신 CI/review 증적은 [인증 PR #554](https://github.com/Renagang21/o4o-platform/pull/554)에서 확인한다.

## 원인과 수정안

`ai-tool-router.ts`의 `SupplierLookupIntent`, `SupplierRequestGap`, `AiToolInvocation`, `DomIntent`, `DomRequestGap`과
`work-agent-runtime.ts`의 `PlannerInput`, `WorkPlanner`, `PlannerTargetResolver`는 interface/type 선언이다.
기존 bare export는 ESM bundler에 런타임 값 수출을 요구했고 `No matching export` 8건을 만들었다.
PR #557은 `type` export/import를 명시한다. 타입 이름/경로는 보존하며 값으로 수출되는 함수들은 유지한다.
`tsc` 통과만으로 실제 배포용 bundler 통과를 대신하지 않는다.

## 검증 경계

초기 조사 SHA는 `ccf9c1df2d2588dd83996e930e199125f05c4758`이며, 리뷰 보완이 올라온 뒤 실제 검증 대상을
`113ceee9495a3502dffd3d239c81d88784e94aef`로 갱신했다. 주요 수정 source를 Git blob과 직접 대조했다.
`git archive`로 전체 tracked source를 checkout 밖에 복사하고 의존성 파일은 hardlink, 변경 없는 workspace
package의 generated dist만 링크한 **Git checkout이 아닌 검증 사본**이다.
이 ESM 검증은 원래 checkout의 AI source·다른 branch를 변경하지 않으며 운영 env/DB·실계정·유료 AI를 사용하지 않는다.
산출물 보존/복원도 이 사본 안의 컴파일 결과만 대상으로 하며 운영 DB backup/restore나 migration 실행이 아니다.

초기 API-only 사본의 테스트는 raw-source 소비처 `tools/**`가 없어 8건 실패했고, 외부 node_modules symlink는
선언 emit에 TS2742 경로 오류를 만들었다. runner/fixture 문제로 분리했다. 전체 source와 사본 안의 의존성
경로를 준비한 뒤 기존 runner를 그대로 재실행한다. 애플리케이션 assertion·compiler 옵션을 완화하지 않는다.

PR #557에는 별도 제목 metadata 처리 수정도 포함돼 있다. 해당 수정의 CI·리뷰를 타입 오류 해소와 구분한다.
본 인증 세션은 upstream PR의 merge/배포 담당 작업을 인계받거나 중복 실행하지 않는다.
본 기록은 같은 미완료 인증 WO의 후속 확인이며 준비된 cloud checkout/`wo/auth-kakao-explicit-link`를 유지한다.
완료된 과거 실패 기록은 당시 관측으로 보존하고 이 후속 기록으로 최신 상태를 설명한다.

## Shared Module Change Verification

### Changed shared module

상위 PR #557의 API 내부 router/runtime 재수출 두 곳이다. 공통 workspace package와 provider/Frozen 인터페이스는
변경하지 않는다. 본 인증 세션의 AI source 변경은 없으며 원본 AI 함수/타입의 소비 이름·import 경로를 유지한다.
심볼 및 파일 import 경로 전수 검색과 테스트의 raw-source 경로를 함께 확인했다.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | 검증 방식 | 결과 |
|---|---|---|---|---|
| API AI routes/unified router 및 Work session 모듈 | 직접 소비 | 타입을 JS 값으로 취급하지 않음, 함수 계약 유지 | 전체 API tsc·실제 main bundle | PASS |
| Work·supplier·DOM 회귀 테스트 | 직접 소비 + raw-source 계약 | 수출 이름/경로 유지 | 기존 Jest runner | PASS |
| URL 콘텐츠 수집 | 상위 PR의 별도 수정 | 제목 처리 리뷰 보완, 타입 오류와 구분 | 기존 URL 회귀 포함 | PASS |
| migration CLI | 같은 tsup의 별도 entry | router 기능 변경 없음 | 실제 migrate bundle + Node syntax | PASS |
| 기존 웹 서비스 | API 간접 소비 | HTTP route/role/capability/응답 변경 없음 | 상위 type/value diff·API 전체 build | UI source 변경 없음 |

### Route / role / capability check

route 존재·role guard·capability map·visibility·empty group/block 변경 없음.
이번 수정의 타입 수출은 컴파일 시 제거되며 런타임 함수 수출은 유지한다. UI layout 변경이 없어 PC/모바일 화면
smoke를 이 ESM 검증의 근거로 대체하지 않는다. 실서비스 계정·OAuth·DB 연결이나 배포 smoke는 실행하지 않았다.

## 검증 결과

Node 22.18.0에서 원래 tsconfig/tsup 설정·기존 의존성으로 실행했다. 선언 emit이나 검증을 끄는 옵션은 사용하지 않았다.
`113ceee949`의 tsc/tsup 모두 exit0. main/migrate 생성 및 `node --check` 각각 exit0.
컴파일된 database 산출물 2,348파일을 사본 내에서 보존·복원하고 전부 content checksum이 동일함을 확인했다.
기존 Work runtime·DOM·supplier adapter·LLM closure·URL 회귀 **5 suites / 111 tests PASS**.
초기 사본의 missing raw-source/선언 emit 실패와 위 최종 통과를 구분한다.
이는 애플리케이션 ESM 빌드 해소 증거이며 Docker image·운영 migration 실행·serving SHA 전환의 증거가 아니다.
로그와 사본은 checkout 밖 `/workspace/.o4o-tools/ai-export-*`에 유지한다.

### 인증 수정안과의 조합 검증

위 upstream 사본에 인증 PR #554의 server source(`8c36ce7695`, 기록 HEAD `498e84aae9`)와 오류 우선순위
회귀를 추가한 조합도 tsc → 산출물 보존 → tsup → 복원 및 두 bundle syntax 모두 PASS다.
조합한 오류 우선순위 회귀는 11/11 PASS. 이는 Git main 병합/배포가 아니라 checkout 밖 검증이며,
`COMBINED_AUTH_HEAD`와 `ai-export-combined-*` 로그로 upstream-only 결과와 구분한다.

## upstream 상태와 이번 세션의 종료 범위

조사 시 PR #557에 제목 parser의 대소문자·deep nesting 리뷰 2건이 있었다. `113ceee949`는 해당 보완과 회귀를
포함한다. 본 세션의 검사 시점에 upstream의 최신 CI/review는 진행 중이며, 기존 스레드가 남아 있었다.
이 관측을 완료/PASS 또는 merge/운영 적용으로 바꾸어 주장하지 않는다. 이후 정확한 최신 상태는 PR #557을 따른다.
본 세션은 독립 확인 기록만 인증 PR #554에 push한다. 타입 오류의 source 수정은 PR #557의 책임으로 유지하며
배포 동시 실행이나 소유권 혼선을 만들지 않는다. 인증 PR은 기존 push-only 범위를 유지한다.

독립 검증 후 인증 PR 재리뷰에서 foreground 권한 확인의 취소와 문서 상태 표기 지적이 나왔다.
해당 인증 hook 보완·추가 회귀는 앞선 TODO의 후속 리뷰 항목에 기록한다. AI 재수출 source 작업과 구분하며
본 CHECK의 상태는 lifecycle 정본에 따라 ACTIVE로 정정했다.

## main 반영 후 현재 checkout의 실제 빌드

upstream PR #557은 main `ce876b0ab0`에 통합됐다. 타입 재수출 두 파일은 독립 검증한 `113ceee949`와
같음을 확인했다. 기록 준비 이후 실제 CI/리뷰와 원격 상태를 재조회해 판정을 갱신한 것이며, 앞의 진행 중
관측은 그 당시 상태로 보존한다. 운영 배포 실행/완료를 이 main 반영만으로 주장하지 않는다.

원래 작업 branch가 이전 main에 있어 오류를 계속 갖고 있었으므로, clean·진행 operation0·본 작업 6경로의
main 추가 변경0을 확인한 뒤 **자기 branch에만** 최신 main을 정상 merge했다(`e7b183e2b7`, 충돌0).
upstream repair를 소비해 이 클라우드의 실제 빌드 오류를 해소하기 위한 sync이며 자동 ahead sync나
공유 main 수정이 아니다. main 대비 본 PR 변경은 같은 인증/검증 6경로만 유지한다.

이제 격리 사본뿐 아니라 `/workspace/o4o-platform/apps/api-server`의 기존 `pnpm run build` → 산출물 보존 →
`pnpm run build:api` → 복원도 모두 exit0다. 실제 main/migrate의 Node syntax 각각 PASS, 컴파일 database
2,348파일의 복원 checksum 동일. runtime·운영 DB에 접속하거나 migration을 실행하지 않았다.
`ai-export-root-*` 로그에 원래 checkout 검증을 독립 사본의 결과와 구분했다. 오류 우선순위도 11/11 PASS다.

sync 후 공통 hook 229/229, 변경된 Neture 소비처 전체 95 suites / 848 tests 및 Neture 타입/production build
PASS다. 다른 4웹은 이 main 이동에서 runtime 변경이 없어 앞선 검증을 유지한다. 최종 branch push와 최신
HEAD CI/review 결과는 인증 PR #554에 기록한다.

문서 정합: 인증 정비의 기존 실패 기록을 소급 수정하지 않고 upstream 수정안과 실제 ESM 검증을 분리 기록한다.
WORKTREE_DISPOSITION: KEEP — 인증 PR의 push-only 후속 기록, main 통합·배포 미실행.
