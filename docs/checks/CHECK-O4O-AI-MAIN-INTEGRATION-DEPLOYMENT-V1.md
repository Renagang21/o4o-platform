# AI 누적 통합·배포 검증

> **상태**: COMPLETED
> **작성일 / 최종 갱신**: 2026-10-14 (Asia/Seoul)
> **실행 WO**: [AI 누적 정비 main 통합·배포](../work-orders/WO-O4O-AI-MAIN-INTEGRATION-DEPLOYMENT-V1.md)

> **최종 결과**: PR #557 main 반영, 승인된 quota migration·7개 서비스 verified 배포 SUCCESS, 배포 후 HTTP 16/16 PASS. 아래 승인 대기·실패 기록은 당시 이력이며 마지막 완료 절이 현재 결과다. 최신 Sonar 재분석 등급과 실계정 비용 집계는 미확인이다.

## Shared Module Change Verification

### Changed shared module

누적 Core/Extension·정산/quota·Work session·content-editor를 최신 main에 통합한다. 선행 [소비처 CHECK](CHECK-O4O-AI-COMPLEXITY-MAINTENANCE-V1.md)의 전역 소비 조사/101 후보 판정을 참조한다. main의 recovery/execution state·generation/write/panel/format/payload helper를 실제 구현이 재사용하며 private adapter 경로만 유지한다. public Core 계약/role/menu를 통합 충돌 해결로 추가 변경하지 않는다.

### Consumer impact matrix

| 소비처 | 사용 여부 | 변경 영향 | route/role/capability 영향 | 검증 방식 | 결과 |
| --- | --- | --- | --- | --- | --- |
| API Work / Assistant | 사용 | main helper + 요청별 세션 통합, Planner snapshot | 기존 Node/제안/COMMIT·Task/권한 경계 유지 | 25 suites / 313 tests | PASS |
| AI proxy / hospital / LMS 업무 Extension | 사용 | 누적 Core/provider/accounting·공통 validator/parser | 기존 서비스별 authenticate/surface/limit 유지 | foundation 177 + boundary 252 tests | PASS |
| Toolbar / shared-space-ui·직간접 서비스 editor | 사용 | main generation/write/form/format ownership 재사용 | 기존 headers/저장 API·은퇴 mount guard 유지 | main UI 48 + 기존/신규 UI 34 | PASS |
| Neture 등 공통 package 소비 app | 사용 | package 내부 구현 통합 | caller·메뉴·role 변경 없음 | package/API/Neture build/typecheck | PASS |

### Route / role / capability check

충돌 해결로 route·role·capability·sidebar/menu map을 변경하지 않았다. generic descriptor만 공유하고 hospital loginless surface와 common proxy authenticate/limit의 차이를 유지한다. 은퇴된 store 내부 AI를 다시 mount하지 않는다. 운영 DB 변경은 WO에 기재한 quota migration이며 승인 전 실행하지 않는다.

### Smoke result

- 통합 mock Modal main 48 tests + 선행 34 tests PASS. 각 저장 영역의 single-flight, 늦은 response/finally, StrictMode·context, 원래 제작 callback과 current source/channel 완료 계약을 함께 확인했다.
- 운영 browser login/업무 write smoke는 계정 파일 부재로 미실시. 운영 HTTP·verified rollout은 배포 단계에서 별도 기록한다.

## 통합·배포 실행 증거

main 통합과 CI/Delivery 판정 완료. 운영 migration 명시 승인 전이므로 rollout 미실행이며, 배포 후 serving SHA/HTTP는 아직 검증하지 않았다.

## 문서 정합

선행 COMPLETED WO/CHECK는 push-only 당시 이력으로 읽기 전용 유지한다. 통합 owner/검증·운영 migration·배포 경계는 이번 WO/CHECK로 분리해 기록한다. canonical·Freeze·index·deployment 설정은 수정하지 않는다.


## 로컬 검증 완료

Jest 고유 44 suites / 742 tests, UI 82 tests PASS. isolated PostgreSQL 15의 15 tests는 skip 대신 실제 실행했다. 운영 DB·application connection은 사용하지 않았다. 통합 browser PC/mobile 모두 정상 화면 차이 0·runtime/console error 0. API/editor/Neture build/typecheck 및 변경 lint·문서 검사 PASS. 테스트 상세·수정/재검증 경계는 WO에 기록한다.


## PR gate 보완 검증

PR #549 초기 CI에서 발견된 raw-source owner 누락·test literal lint 오류를 실제 owner 목록/불필요 escape 제거로 수정했다. root lint baseline 46/46 PASS이며 rule·baseline 조정 없음. 재현 shard의 실제 실패는 legacy App 은퇴 guard 1건으로 확인했고 해당 guard 및 selected-organization focused 40 tests PASS.

Codex P1 rollback 보완은 pending quota migration에 한정한다. transaction/exclusive lock·고유 private recovery schema에서 예약/영수증 및 비용 정밀 원본 보존·이전 canonical fingerprint 복구·재적용·두 번째 archive 보존·overflow 전체 rollback을 실제 PG에서 검증했다. quota/schema 총 18 tests PASS, API build·변경 lint PASS. 정상 up의 SQL·최종 fingerprint·manifest는 변경하지 않았다. 운영 rollback/archive repair는 배포에 포함하지 않으며 별도 승인 경계다. 상세 근거·초기 실패/재검증은 WO 참조.


## 최신 main·보조 분석 경계

보완 head `7ccce4dda7`의 [필수 CI](https://github.com/Renagang21/o4o-platform/actions/runs/38473146669)는 SUCCESS이며 required CI Gate PASS. Codex P1은 수정/PG 검증 뒤 resolve하여 미해결 thread 0. main에 새로 반영된 store quality 14파일은 AI/API/package 변경이 없는 것을 확인하고 conflict 없이 합쳤다. 관련 store async/operation/editor 25 tests PASS; 기존 서비스의 완료 기록/구현을 보존한다.

Sonar advisory는 Security B / Reliability D로 FAIL. 실제 ruleset required check는 CI Gate지만 보조 결과를 PASS로 바꾸어 보고하지 않는다. 공개 GitHub annotations 50개 중 failure 5개는 기존/분리된 함수의 cognitive complexity 지적이며 validator·저장/권한 계약을 변경하는 근거로 쓰지 않았다. 제한된 annotations에는 Security B 원인 상세가 없어 미확인이다. 상세 Sonar API와 Actions 로그 host는 현재 proxy 403이므로 network 경계 우회 없이 환경 초안에 `sonarcloud.io`·`results-receiver.actions.githubusercontent.com`만 추가 저장했다. 적용은 환경 설정 검토/저장·Publish가 필요하며 secret/운영 auth/CI 설정은 변경하지 않았다. 상세 분석이 제공되면 실제 보안 finding을 구분해 후속 조치한다.

추가 main `c6b68da4e7`은 auth WO/e2e 4파일이며 API/package/runtime·migration 변경 없음. source delta를 확인하고 합쳤다. 최신 source 기반의 PR gate를 다시 확인한다.


## main 병합·Delivery 판정 완료, 운영 실행 대기

- [PR #549](https://github.com/Renagang21/o4o-platform/pull/549) MERGED, main `de4cbf9f3989ec7c2b417adf0388e1d6e174d8c7`, source `834335d98d6329ecd62ca18dba8a4972e1f952d2`. main tree와 검증 source tree 차이 0, source/main ancestry 확인. 누적 AI Core/Extension·accounting/quota·Work/editor 정비를 모두 포함한다.
- [최신 PR CI 38476208289](https://github.com/Renagang21/o4o-platform/actions/runs/38476208289) SUCCESS, required CI Gate PASS. CodeQL·Guard PASS. Codex P1 수정/PG 검증·resolve, 미해결 review thread 0. admin bypass·force push·gate 변경 없음.
- [main CI 38477654253](https://github.com/Renagang21/o4o-platform/actions/runs/38477654253) SUCCESS; main CodeQL SUCCESS.
- [Delivery 38478659593](https://github.com/Renagang21/o4o-platform/actions/runs/38478659593) classify SUCCESS, commit `production` 상태 **pending / HELD_LEVEL_3**: API L3, frontend needs-api. API/Web/Admin deploy jobs SKIPPED. source ref·CI/freeze/serving/risk gate를 우회하지 않았다. **배포 완료가 아니며 운영 migration·traffic 전환은 실행하지 않았다.**
- 정상 다음 동작은 target `de4cbf9f3989ec7c2b417adf0388e1d6e174d8c7`의 promote 1회다. `CreateAiUsageReservations1791870434349`의 운영 테이블/index 생성과 두 비용 컬럼 `numeric(20,8)` 변경은 사용자 명시 승인 전이므로 dispatch하지 않는다. rollback/archive repair는 이번 정상 up 실행에 포함하지 않는다.
- 배포 전 HTTP: API health/ready 2 + 웹 HTML 6 + 같은 host JS 6, **14/14 PASS**. 실제 계정·업무 write/유료 AI 호출은 없음. SourceModel/실 PC 호출과 배포 후 smoke는 미실시다.
- 사용자가 승인하면 최신 main/serving delta·CI·동시 production run·migration 목록을 다시 확인해 승인 범위와 동일할 때 표준 verified rollout으로 진행한다. source target이 이동했으면 포함된 변경을 확인하고 재판정한다.
- 이 대기 기록은 운영 target을 바꾸지 않도록 source branch에 보존한다. 기준 checkout·다른 세션 branch/dirty/worktree는 수정하지 않았다. 문서 정합은 구현/검증/미실행 운영 경계를 이번 WO/CHECK에 반영하고 선행 COMPLETED 이력을 유지했다.


## 중요한 성능 결함의 후속 검증 — 2026-10-14

최종 source Sonar annotations에서 JSON/HTML backtracking 경고 2개를 확인하고 닫는 구분자 없는 10k/20k/40k 문자열로 약 4배씩 증가하는 지연을 재현했다. `extractJson`의 greedy 범위와 `stripHtml`/제목의 nonempty tag 치환 결과를 보존하여 해당 재탐색을 제거한다. 일반 cognitive/style/서비스별 문맥 중복은 후순위다.

소비처: Work Planner의 기존 Gemini/OpenAI·텍스트/vision 응답 모두 같은 `extractJson`을 사용한다. URL 콘텐츠와 자료 기반 제목 추출은 같은 private tag helper를 사용하며 LMS 수집·URL to blocks의 공개 경로/권한/저장/provider 계약은 변경하지 않는다. 새로운 전역 공통화나 신규 dependency/DB/CI 변경은 없다.

환경 allowlist에 Sonar host가 반영되었으나 실제 API는 upstream CloudFront HTTP 403이다. 제한된 GitHub annotations로 전체 Security B 원인을 확인했다고 보고하지 않는다. 운영 DB migration/production promote는 미실행이며 앞 운영 대기 기록과 현재 코드 검증을 구분한다.

검증: `work-planner-json`, `ai-url-content`, `work-agent-llm-closure`, `work-agent-recovery-runtime` 실제 **4 suites / 38 tests PASS**. 100k 미종결 입력 두 경로와 greedy/malformed/HTML 제목·본문 기존 계약 포함. API build PASS, 변경 lint 오류/경고 0, 문서 민감정보/diff PASS. 기존/신규 함수 2,000개 deterministic markup × 본문/제목 = 4,000 비교 차이 0. source 기준 40k HTML 1243.58→0.27ms, JSON 925.03→0.04ms(로컬 관찰치). 최초 실행의 잘못된 노이즈 fixture 및 존재하지 않는 suite 경로는 수정 후 실제 경로에서 재검증했다. 운영 호출/계정/유료 AI/DB/PC smoke는 하지 않았다.


[중요 수정 PR #552](https://github.com/Renagang21/o4o-platform/pull/552) main `f8d1887ef2f0cd9920667a7275749195d9e28d8a`에 MERGED. source `03d6ee37c7`와 tree 차이 0. [PR CI 38488237043](https://github.com/Renagang21/o4o-platform/actions/runs/38488237043) SUCCESS, 3 API shards·품질·admin build·CI Gate PASS, CodeQL PASS, 미해결 review thread 0. main CI `38489272848`과 main CodeQL은 기록 시점 IN_PROGRESS. 이전 Sonar Security B가 해결되었다고 판단하지 않는다. 정상 promote/운영 migration/배포 후 smoke 미실행. 운영 승인 및 최신 main/serving delta 검토·후속 증적 보존 때문에 본인 worktree KEEP, 코드 수정과 기록은 source branch에 push한다.


## 사용자 승인 후 운영 적용 — 2026-10-14

사용자가 보안 경고 상세 확인과 비용·quota 운영 DB migration/배포 실행 승인 대기 항목을 인용하고 “진행하자”라고 지시했다. 앞서 구체적으로 제시한 `CreateAiUsageReservations1791870434349` 정상 up과 표준 verified 배포에 대한 명시 승인으로 해석한다. 같은 이유로 재승인을 요청하지 않는다. 정상 up 범위는 예약 테이블/index 생성과 두 비용 컬럼 numeric(20,8) 변경이며 rollback/archive repair·seed/delete·외부 유료 계약·운영 인증 변경은 포함하지 않는다.

시작 target은 최신 main `24b96f373059b2ffe534ce4257c5d2e21bf3952d`이며 CI 실행 중이다. 앞 main `f8d1887ef2`의 main CI/CodeQL은 SUCCESS. Delivery `38490190772`의 API serving은 `5742dce8d`, quota migration이 미적용된 누적 LEVEL_3 때문에 API와 의존 frontend 모두 HOLD다. 지난 Promote `38482057513`은 dry-run이며 운영 적용 증거로 쓰지 않는다. serving→target database delta는 manifest/expected registry와 위 quota migration 1개뿐이다. 그 뒤 main의 Neture UI/문서 변경은 API/DB/migration을 바꾸지 않는다. 현재 실행 중/queued인 Promote/Delivery는 없다. dispatch 직전 최신 main·CI·동시 실행·migration delta를 다시 확인한다.

Sonar allowlist 적용은 확인했으나 실제 site root/system API/dashboard/issues API가 모두 upstream CloudFront HTTP 403이다. 새 인증 연결이나 우회는 하지 않았다. GitHub의 기존 공개 Sonar check `115570828811`에는 Security B/Reliability D 및 50개 제한 annotation이 있다. 확인 가능한 backtracking 경고 2개는 PR #552에서 재현/수정/검증했다. PATH 경고는 분석 스크립트의 hotspot이며 실제 injection으로 확정하지 않는다. 현 main에는 새 Sonar check가 없고, CodeQL 공개 CI는 성공했지만 전체 alert API는 integration 권한 403이다. Sonar 전체 상세/해결 여부는 이 자료만으로 확인하지 못했다. 이 외부 차단은 운영 migration 승인 여부와 별개다.

진행 TODO: 최신 main green 및 정상 promote → migration pre/post assertion·실행 수/이름 확인 → API/웹 serving SHA 및 건강·정적 asset·관리 quota 인증 경계 smoke → 결과 기록/push. 운영 DB 직접 접속/업무 데이터 조회·유료 AI 호출·실계정 사용은 하지 않는다.


### 운영 배포 blocker·추가 보안 finding 보완

- dispatch 직전 같은 target의 타 세션 Promote `38491748870`을 발견하여 중복 실행하지 않고 완료를 관찰했다. API가 NOT_SELECTED였고 실제 migration/API/frontend jobs는 모두 SKIPPED, `production`은 HELD_DEPENDENCY였다. 종료·동시 실행 없음·정확한 main/CI를 다시 확인한 뒤 services 제한 없는 정상 Promote `38491966980`을 본 세션에서 실행했다.
- `38491966980`의 classify는 성공했으나 API `Build API server (bundled with tsup)`가 실패했다. **Run database migrations는 SKIPPED**, API traffic 전환/후속 frontend 배포도 실행되지 않았다. 실패를 숨기거나 같은 코드를 재시도하지 않는다. public check annotations는 exit 1만 제공하고 상세 logs/artifact 접근은 외부 host 403 또는 빈 응답이었다. 동일 코드/실제 `build:api`로 로컬에서 **8 missing exports**를 재현했다.
- `ai-tool-router`의 supplier/DOM 타입 5개와 `work-agent-runtime`의 Planner 타입 3개가 bare value reexport였기 때문이다. type export/import를 명시하여 기존 TypeScript 타입명·경로·함수 수출과 runtime 계약은 보존한다. 앞 검증의 `tsc`만으로 운영 bundler 문제를 놓친 점을 기록한다. CI/build/tsup 설정·dependency/lockfile을 변경하거나 검사를 완화하지 않는다.
- Sonar 이전 3개 source check의 제한 annotations를 모두 수집했다: 150개, unique 116개. 추가로 제목 metadata의 backtracking 경고를 확인했다. 미종결 `<meta ` + 공백 10k→20k에서 **117.44→471.79ms** 지연을 재현했다. 전체 Sonar Security B 상세는 여전히 제공되지 않으며 이 표본을 전체 finding으로 주장하지 않는다.
- 제목 추출은 이 파일에서 이미 쓰던 `node-html-parser`를 재사용한다. title→og:title→twitter:title 우선순위, attribute 양방향/marker-first 선호, raw basic entity 정책·200자 한도를 유지한다. HTML 구조로 meta 값을 읽으며 잘못된 markup의 반복 suffix 탐색을 제거하고 제목 내부 태그도 기존 forward helper로 제거한다. 정상 title/metadata 2,000건 비교 차이 0. 로컬 source 비교의 공백 20k는 **455.21→0.22ms**였다(운영 SLA 측정 아님).
- 실제 회귀 **4 suites / 50 tests PASS**: 기존 Work Planner/URL/LLM closure/recovery 및 추가 제목 순서/대소문자/인코딩/100k 미종결 shape 포함. 변경 lint 오류·경고 0. 배포와 같은 **tsc→database backup→tsup(main/migrate)→database restore** PASS, main/migrate/migration-config/이번 compiled migration 모두 존재하고 두 bundle의 Node syntax 검사 PASS. 신규 운영 DB 실행은 아직 없으며 표준 gate를 충족한 새 main에서 정상 promote를 다시 실행한다.
- Shared 소비: 타입 alias의 이름/경로는 유지하고 whole API typecheck 및 실제 bundled runtime에서 소비를 확인한다. URL/LMS source/title 공개 함수 계약도 유지한다. Auth/RBAC/Node/COMMIT/비용 정책·menu·provider 선택 변경 없음. 배포 전 API health/ready + web HTML/JS 12 + quota 관리 GET 인증 guard 2 = **16/16 PASS**. 실계정 파일이 두 checkout 모두 없어 실계정/유료 AI 호출은 미실시다.


### PR #557 review 회귀 보완

Codex P2 `4265707175`/`4265707181`의 두 회귀를 재현했다. 혼합 대소문자 title closing은 `lowerCaseTagName: true`로 정규화한다. 제목이 없는 약 110KB/10,000 depth HTML에서는 parser/selector가 RangeError를 던지므로 optional title extraction 전체에서 잡고 undefined로 반환한다. usable source text는 그대로 수집되고 blocks 기반 제목 fallback도 동작한다. 사용 가능한 앞 제목은 계속 보존한다. 운영 예외를 HTTP 성공으로 위장하거나 원문 fetch 실패를 삼키는 변경은 아니다.

혼합 case 3개와 깊은 HTML 실제 `fetchUrlContent` 회귀를 추가했다. 최신 URL **1 suite / 26 tests PASS**, 앞 4 suites / 50 tests와 중복 합산하지 않는다. 최신 source의 tsc→database backup→tsup→restore 및 두 bundle Node syntax·compiled migration/config 존재·변경 lint PASS. 새로운 type/public API·권한·DB/CI 설정 변경 없음. main의 Neture 및 개발용 purge 스크립트/문서는 충돌 없이 반영했으며 운영 purge는 실행하지 않는다. 후기 target은 최신 main/serving→target migration delta·CI 및 동시 production 실행을 다시 확인한다.


### 사용자 제공 Sonar 상세·확정 판정

사용자가 PR #549의 Sonar 화면을 제공했다. 전체 new issues 212 중 현재 필터된 Reliability bug 6개, Security vulnerability 1개(Low/Minor)가 확인된다. **Security B의 원인은 `scripts/quality/audit-code-complexity.mjs:14`의 PATH 의존 실행**이다. 이 코드의 실제 명령은 `git ls-files`이며 rg가 아니다. 앞 제한 annotation만으로 hotspot으로 추정했던 분류를 이 증거로 정정한다. 새로운 Sonar 분석의 PASS를 이 과거 화면으로 주장하지 않는다.

- Git 실행은 PATH 검색을 제거하고 POSIX `/usr/bin/git`·`/bin/git`, Windows 표준 Program Files Git의 고정 절대 경로로 제한한다. 없는/custom 설치는 환경 검색 없이 fail-closed한다. 기존 tracked 파일 모집단과 읽기 전용/메타데이터 출력은 유지한다. Windows 실행은 이 Linux 회차에서 미실시다.
- 실제 fake Git을 PATH 앞에 놓은 회귀에서 CLI는 정상 census를 수행하고 fake executable은 실행되지 않는다. 분석 도구 기존 5 + 공격 회귀 1 = **Node 6 tests PASS**.
- Reliability 6개는 실제 조건을 확인했다. Operator mapper의 두 번째 인자는 의도한 index이고, path/cycle sort는 문자열의 UTF-16 순서이며, Naver reduce는 비어 있지 않은 길이 조건 아래에 있다. 현재 코드에서 오류가 발생하는 것으로 확정하지 않는다. 명시적 `(action,index)` callback, 같은 UTF-16 comparator, 초기값 `''`을 추가하여 기존 결과를 유지하고 암묵성을 없앴다. 별도 공통 기반·서비스 간 공통화·사업/API/권한 계약 변경은 없다.
- 최신 URL/업무 Extension 회귀 **3 suites / 82 tests PASS**(URL 26 포함), 변경 lint 오류/경고 0. tsc→database backup→tsup(main/migrate)→restore 및 Node syntax/compiled migration/config 검사 PASS. Node/기존 Work tests와 중복 합산하지 않는다. 일반 212개 스타일·cognitive complexity 전체 정비는 이번 범위에 추가하지 않는다.

외부 Sonar API 403은 계속되지만 확인 가능한 Security B의 실제 원인을 이제 확보·수정했다. 최종 원격 등급/issue 상태는 최신 source 재분석이 필요하며 과거 B/D 분석을 PASS로 바꾸지 않는다. 사용자 지시의 운영 quota migration 승인과 재배포는 유지한다.


## 승인된 운영 적용 최종 증거 — 2026-10-14

| 확인 항목 | 관찰 결과 |
| --- | --- |
| Source/main | [PR #557](https://github.com/Renagang21/o4o-platform/pull/557) MERGED; source `70582ba251d936627bc13323cd4ea581149be28b`, target `ce876b0ab03aeb8c61e15a2a378f89d55af3580b`; tree 차이 0/ancestry 확인 |
| 원격 gate | [PR CI 38495834324](https://github.com/Renagang21/o4o-platform/actions/runs/38495834324)·[main CI 38496785481](https://github.com/Renagang21/o4o-platform/actions/runs/38496785481)·[main CodeQL 38496785535](https://github.com/Renagang21/o4o-platform/actions/runs/38496785535) SUCCESS, required CI Gate PASS, 미해결 review thread 0 |
| 실행 직전 | 자동 Delivery `38497609048` HELD_LEVEL_3 / mutation SKIPPED, 다른 production mutation 없음, serving→target DB delta는 승인된 quota migration·등록 manifest/fingerprint뿐 |
| 표준 Promote | [38497933074](https://github.com/Renagang21/o4o-platform/actions/runs/38497933074) SUCCESS; `ref=main`, 위 target, `dry_run=false`, 서비스 제한 없음 |
| 실제 운영 migration | API job의 **Run database migrations SUCCESS**. 정상 up이며 rollback/archive repair·purge·seed/delete 없음 |
| API traffic | 실제 bundled build/image push·Cloud Run deploy·새 revision readiness·traffic 전환 모두 SUCCESS |
| 의존 frontend | API 성공 후 admin·neture·kpa-society·lecture·store·kpa-branch 각각 verified rollout SUCCESS |
| 최종 serving 확인 | Report SUCCESS, target의 `production` = **success / DEPLOYED · deploy: api,admin,neture,kpa-society,lecture,store,kpa-branch** |
| 배포 후 API HTTP | `/health`·`/health/ready` 200, 관리 quota/status GET 미인증 401 = 4/4 PASS |
| 배포 후 웹 HTTP | admin/neture/kpa/study/store/community 공개 HTML 6 + 각 동일 host JS 6 = 12/12 PASS |

배포 전후 동일한 읽기 전용 HTTP 점검은 각각 **16/16 PASS**. 이전 실패 `38491966980`의 migration SKIPPED와 이번 실제 migration SUCCESS를 구분한다. 정상 migration CLI는 pre-state 및 post-migration 등록 fingerprint 검증 실패 시 exit 1이며 workflow가 성공 후에만 API 배포한다. 이 환경에서는 Cloud Run stdout/상세 artifact를 직접 확보하지 못했으므로 실행 수·이름 목록·실측 fingerprint hash를 확인한 것으로 기록하지 않는다. source delta 1개와 실제 로그의 실행 건수는 다른 증거다.

보안 원인 수정 및 운영 quota 기반 적용은 완료다. 최신 Sonar 원격 등급/issue 상태는 API 403 때문에 미확인, 테스트 계정 SSOT 누락으로 실계정 사용량·비용/한도·유료 AI 호출은 미실시, Windows Git 경로 실행도 미실시다. 익명 HTTP 검사·isolated PostgreSQL 검증을 실계정 검증으로 보고하지 않는다. 외부 서비스 계약/운영 인증·CI 설정·사업/메뉴/권한 계약 변경 없음.

문서 정합: 현재 WO/CHECK를 COMPLETED로 정렬하고 최종 운영 증거를 추가했다. 이전 승인 대기/실패와 선행 완료 이력·canonical/index는 보존한다. 최종 증거 기록 변경은 문서-only로 **DEPLOYMENT=NOT_APPLICABLE**이며 위 runtime target을 다시 배포할 이유가 없다.
