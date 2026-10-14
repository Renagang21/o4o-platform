# AI 누적 정비 main 통합·배포 실행

> **상태**: ACTIVE
> **작성일 / 최종 갱신**: 2026-10-14 (Asia/Seoul)
> **요청**: 앞 push-only 완료 후 사용자 추가 지시: main 병합·배포
> **선행 이력**: [코드 정비 완료 WO](WO-O4O-AI-COMPLEXITY-COMPLETION-V1.md) · [기존 소비처 CHECK](../checks/CHECK-O4O-AI-COMPLEXITY-MAINTENANCE-V1.md)

## 범위·실행 기준

앞 push `49aed0ce00`의 동일 branch/worktree에서 통합을 이어간다. 누적 Core/Extension·accounting/quota·Work Agent·editor 정비가 모두 대상이다. 별도 사용자 지시로 시작한 통합/배포이며 이전 COMPLETED WO/CHECK의 push-only 검증 이력은 변경하지 않는다. 시작 main은 `38d0eb81df`다. 기준 checkout/다른 세션 dirty와 branch는 수정하지 않는다.

AGENTS §4-1(e/f/g), README Delivery, 실제 main ruleset, [운영 migration 기준](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md)을 확인했다. PR 필수·CI Gate required·human approval 0이며 우회 없이 정상 PR merge한다. 일반 배포는 재확인하지 않는다. 신규 migration의 운영 실행은 AGENTS §5가 별도 명시 승인을 요구하므로 통합·CI·배포 판정 뒤 구체적 변경을 제시한다. production freeze·ref·WIF·동시 배포 경계를 유지한다. 운영 DB 직접 연결/DDL·운영 인증/CI 인프라·유료 AI 계약 변경은 하지 않는다.

## 충돌·통합 구조

충돌은 runtime/Modal 2파일이다. main의 phase2 pure helper 및 비동기 tests를 보존하고 누적 AI session 구현에 연결한다.

- Work execution state는 run에서 한 번 생성하여 observation/planning/action에 전달한다. main의 recovery budget helper와 execution evidence/progress helper를 기존 세션이 재사용한다. 생성자 단위 검증은 독립 state에만 fallback owner를 만든다.
- main의 `structuredClone` Planner 입력 격리를 planning session에도 적용한다. retained input이 goal/action history를 변조하지 못하고 각 호출의 history는 당시 snapshot이다.
- main generation hook이 view lifetime도 소유하고 기존 private session 경로는 adapter로 유지한다. save requests, 3개 panel state, format/payload 모듈은 main의 기존 구현을 실제 controller에서 사용한다. 별도의 동일-body foundation을 남기지 않는다.
- forced tone/length·source metadata·initial source tab/headers 문맥 변경과 현재 tab 재선택, category 재진입·늦은 finally, channel 완료 후 중복 제출 금지를 보존한다. 이미 보낸 POST를 취소/자동 재전송하지 않으며 제작 성공 callback은 원래 caller에 한 번 전달한다.
- panel hide/reopen은 main의 현재 view invalidation을 따른다. 선행 Neture test의 늦은 store 성공 표시 기대를 새 main 계약에 맞추고, 진행 중 write 1회·오래된 receipt 억제·settlement 후 수동 재시도/정상 receipt를 모두 검증한다. 기존 main assertions는 완화하지 않는다. raw-source 소비 목록에 main helper 파일도 포함한다.

## 운영 DB 변경·배포 판정

누적 quota 구현의 [CreateAiUsageReservations1791870434349](../../apps/api-server/src/database/migrations/1791870434349-CreateAiUsageReservations.ts)는 다음을 수행한다.

1. `ai_usage_reservations` 예약·정산 영수증 테이블/진행 중 예약 index 생성.
2. `ai_usage_aggregate.current_value`와 `ai_usage_logs.costEstimated`를 `numeric(20,8)`로 변경해 소액 호출 비용을 누적.
3. rollback은 transaction 안에서 예약·영수증을 고유 private recovery schema로 옮기고 두 비용 테이블의 정밀 원본을 보관한 뒤 이전 등록 정밀도로 복귀한다. 일반 runtime은 archive를 읽지 않으며 복구 자료의 재적용은 별도 승인된 repair다.

기존 incremental manifest/fingerprint에 포함되어 있다. 자동 배포는 migration 때문에 LEVEL_3이며 main CI/Delivery 판정 뒤 정상 promote만 사용한다. 해당 migration 운영 실행은 명시 승인 전 dispatch하지 않는다. 승인 대상은 위 생성/정밀도 변경과 표준 migration job이며 임의 DDL/seed/delete가 아니다. serving→target 누적 delta에 다른 migration이 있으면 별도로 검토한다.

## TODO·검증

- [x] 최신 main·ruleset·Delivery·migration·현재 API 접근 조사.
- [x] 두 충돌 정리, 기존 main helper와 신규 세션/비동기 계약 연결.
- [x] main 편집기 4 files / 48 tests, 선행 편집기 3 files / 34 tests PASS.
- [x] 통합 runtime·accounting/provider/Extension·boundary·isolated quota DB·build/lint 검증.
- [x] PR CI·Codex blocker/미해결 thread·최신 main 위치 검토 후 병합.
- [x] post-merge CI/Delivery 판정 및 운영 migration 승인 조건 확인.
- [ ] 정상 verified 배포·serving SHA/revision·HTTP smoke·문서 정합 확인.

테스트 DB는 cached official PostgreSQL 15의 이번 세션 전용 container로 localhost fixture 포트만 노출한다. 운영 connection 설정을 읽거나 사용하지 않는다. 운영 계정 파일은 누락되어 사용자별 업무 write smoke는 별도로 구분한다. GitHub variable 조회는 integration 권한 403이므로 freeze 값을 추정/변경하지 않고 실제 Delivery gate 결과로 확인한다.

실행 증거는 [통합·배포 CHECK](../checks/CHECK-O4O-AI-MAIN-INTEGRATION-DEPLOYMENT-V1.md)에 기록한다.


## 통합 로컬 검증 결과

- Runtime 25 suites / 313 tests PASS. main의 입력 snapshot·request 간 state/evidence 분리 및 기존 계획/읽기/재생/단위 실행·안전/계측 모두 포함.
- Boundary/schema/parser/hospital/editor guard 11 suites / 252 tests PASS. lifecycle runner의 초기 entry context 누락 2건은 forced options와 초기 source tab 반영을 수정하고 기존 48개 assertions 그대로 재검증했다.
- Core/provider/업무 Extension/accounting/DB 소유권 6 suites / 162 tests PASS. 기본 runner에서 skip된 quota DB 15개는 명시적 loopback fixture로 별도 실행하여 2 suites / 15 tests PASS. 실제 PostgreSQL 15 canonical bootstrap→전체 incremental manifest 적용→재실행 0→BOOTSTRAPPED/fingerprint·정밀도/동시 admission/정산·해제 검증.
- Jest 고유 합계 44 suites / 742 tests PASS. main UI 48 + 선행 UI 34 = 82 tests PASS; nested runner 재실행은 중복 합산하지 않음.
- API build, content-editor build/typecheck, Neture app build PASS. 변경 TS/TSX lint 오류·경고 0, 문서 민감정보·링크·diff PASS. 신규 dependency/lockfile/CI 변경 없음.
- 실제 통합 Modal 격리 browser: desktop 1280×900 / mobile 390×844 정상 생성/삽입/URL·desktop 저장·늦은 응답 격리 PASS, runtime/console error 0. 앞 완료 화면 대비 pixel 차이 0. 운영 메뉴/계정/유료 호출 없음.
- 통합 AI 후보 census 342 files / 96 동일-body 그룹 / 상대 cycle 0. 형식 변환은 main format으로 통합하고 private conversion import는 reexport로 유지한다. 이전 335/98 모집단과 신규 main helper 포함 차이를 분리한다.


## PR gate·review finding 보완

[PR #549](https://github.com/Renagang21/o4o-platform/pull/549), 초기 source head `2423b4ede9`를 검증했다. [초기 CI](https://github.com/Renagang21/o4o-platform/actions/runs/38469476507)의 API shard 1/2·웹/관리자 build·CodeQL·Guard는 PASS. 품질/shard 3의 실제 실패를 수정하며 CI 기준·assertion을 완화하지 않는다.

- Whole lint 47 > baseline 46: 누적 selected-organization test 제목의 불필요한 apostrophe escape 1개를 제거했다. root `lint-ratchet.mjs` 재실행 결과 **46 errors / baseline 46 PASS**. 기존 baseline/rule/검사 범위는 수정하지 않았다.
- Shard 3: 동일 명령을 로컬 실행해 **165 suites PASS, 1 fail, 8 skip**으로 재현했다. 실패는 legacy App 은퇴 guard가 logging owner를 outer executor 한 파일에서만 찾은 것이며 기능/로그 삭제가 아니다. 실제 `AiAccountedExecution` owner를 목록에 포함하고 outer 위임 및 `getRepository(AIUsageLog)` 보존을 함께 확인한다. 기존 entity 보존·은퇴 재도입 금지 assertions는 유지한다. 해당 guard + selected-organization 2 suites / 40 tests PASS.
- Codex P1 `4264162314`: pending quota migration의 비기능 down을 보완했다. TypeORM transaction 없이 변경을 거절하고, exclusive lock 뒤 고유 `ai_usage_rollback_<opaque-id>` schema에 예약/영수증을 이동 및 aggregate/log 정밀 원본을 보관한다. public/cosmetics/neture의 기존 fingerprint 범위·registry를 변경하지 않고 실제 이전 상태로 되돌린다. overflow 시 archive 생성·테이블 이동·history 변경까지 transaction 전체가 취소된다. 재적용/두 번째 rollback도 이전 archive를 덮어쓰지 않는다.
- 실제 PostgreSQL quota/schema **2 suites / 18 tests PASS**: 이전/최종 등록 fingerprint, 상세 receipt·8자리 비용 원본 보존, 재적용/다중 cycle, 무transaction 거절, numeric overflow의 원자적 실패를 확인했다. 운영 DB 실행/DDL 없음. API build·변경 lint PASS. 초기 통합 44 suites / 742 tests에 rollback 3개가 추가되며 focused consumer 40개는 별도 결과다.
- Actions 상세 로그는 허용되지 않은 results-receiver host로 redirect되어 다운로드 불가였다. network/TLS 경계 우회나 설정 변경 없이 동일 shard 명령으로 재현·진단했다.

이 보완은 신규 migration의 정상 up(테이블/index 생성·비용 정밀도 변경)을 변경하지 않는다. 운영 migration의 명시 승인 경계도 그대로다. 후속 source head의 CI Gate·review thread·main 위치를 다시 확인한 뒤 병합한다.


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


## 중요 잔여 정비 — 2026-10-14

사용자 추가 지시: 정비는 추후 계속하므로 지금은 중요한 부분만 수행한다. 동일 통합 트랙의 review finding 후속으로 기존 전용 worktree를 사용하고, 최신 main `9b38fe5054`를 conflict 없이 합쳤다. 새 main의 privacy 변경은 이번 AI 수정 대상이 아니다.

### 조사·TODO·개발 순서

- [x] Sonar 최종 source check `115570828811`의 공개 annotations 재확인. JSON 추출과 일반 HTML 태그 제거에 backtracking 경고가 있다.
- [x] 닫는 구분자 없는 입력으로 지연 재현. 10k→20k→40k에서 JSON 73→290→1203ms, HTML 57→235→991ms. 같은 환경의 관찰치이며 SLA/운영 측정이 아니다.
- [x] JSON은 첫 `{` / 마지막 `}`의 기존 greedy 범위를 유지하면서 `indexOf` / `lastIndexOf`로 추출. malformed/multiple object의 JSON.parse 실패도 유지.
- [x] 일반 HTML 태그 제거는 단일 전진 scan으로 대체. 빈 `<>`, 중첩 `<`, 닫히지 않은 suffix와 태그별 공백 정책을 유지하고 동일 파일의 제목 추출도 같은 private helper를 사용한다. script/style/noise 처리·본문/제목 길이·권한·provider·외부 fetch 계약은 유지한다. HTML 처리 전체가 선형이라고 주장하지 않는다.
- [x] 실제 malformed/정상/100k 입력 회귀, Planner/URL 소비처 테스트·API build·변경 lint 검증.
- [x] 후속 수정 push·PR gate 확인·main 통합.

보류: 일반 함수 길이/cognitive complexity, 서비스 문맥이 다른 중복, 이름/스타일 및 추가 abstraction. 실제 권한 우회·저장 누락·비용 이중 정산 같은 결함이 확정되면 다시 최우선으로 처리한다. retained 중복의 이전 KEEP 판정은 미해결 TODO로 바꾸지 않는다.

Sonar 도메인 추가는 이번 runtime에서 확인했다. 재시도는 proxy CONNECT 거절 대신 upstream CloudFront HTTP 403으로 실패했으며 Security B의 전체 issue 상세는 여전히 미확인이다. 공개 annotations의 재현된 성능 문제만 수정하며 B 원인의 전부를 해결했다고 판단하지 않는다. CodeQL/CI의 앞 PASS도 새 수정의 검증으로 대신하지 않는다.

운영 migration 승인·배포 후 smoke는 코드 복잡성 정비와 분리하여 계속 대기한다. 이전 main `de4cbf9f39`의 HELD_LEVEL_3 이력은 그대로 보존하며, 향후 promote는 이동한 최신 main/serving delta·CI·migration·동시 실행을 다시 확인해야 한다. 이번 조사는 운영 DB 승인으로 해석하지 않는다. 상태 헤더는 문서 lifecycle의 ACTIVE로 정렬하고 운영 실행 대기는 본문에 기록했다.

검증 결과: 실제 4 suites / 38 tests PASS, API build PASS, 변경 lint 오류/경고 0. 기존 함수와 수정 함수의 2,000개 deterministic HTML 샘플에서 본문/제목 4,000건 결과 차이 0. 같은 source 함수 비교의 40k 입력은 HTML 1243.58→0.27ms, JSON 925.03→0.04ms였으며 운영 latency 측정이 아니다. 첫 focused 실행의 부적절한 `br` prefix fixture와 존재하지 않는 planning suite 경로는 진단 후 수정해 위 4개 실제 suite를 완주했다. 기존 assertions나 동작은 완화하지 않았다. 문서 민감정보 0/diff 검사 PASS.


### 중요 수정 main 반영·남은 경계

[PR #552](https://github.com/Renagang21/o4o-platform/pull/552) MERGED, source `03d6ee37c79cfabc2feb44c9a99e09641e1203f6`, main `f8d1887ef2f0cd9920667a7275749195d9e28d8a`. 두 tree의 차이 0, 최신 main 위치와 clean worktree/필수 gate·review thread 0을 확인하고 정상 merge했다. [PR CI 38488237043](https://github.com/Renagang21/o4o-platform/actions/runs/38488237043) SUCCESS: API 3 shards·품질·admin build·CI Gate PASS. CodeQL PASS. admin bypass/force push 없음.

기록 시점의 [main CI 38489272848](https://github.com/Renagang21/o4o-platform/actions/runs/38489272848) 및 main CodeQL은 IN_PROGRESS이며 완료/PASS로 보고하지 않는다. 배포는 하지 않았다. 앞 quota migration의 승인 대기와 serving→현재 main의 누적 변경 재검토 조건은 계속 유효하다. confirmed parser 성능 결함의 구현·검증·push·병합은 완료했고, 추가 중요 코드 결함은 이번 조사에서 확정되지 않았다. Sonar 전체 보안 finding 상세는 외부 403으로 미확인, 실제 계정/배포 후 smoke도 미실시다. 일반 복잡성·문맥별 중복·스타일 정비는 후순위다.

이 결과 기록은 운영 target을 바꾸지 않고 source branch에 보존한다. WORKTREE_DISPOSITION: 본인 worktree/branch clean·검증 코드 main 반영, 운영 migration·배포 후 검증/증적 대기이므로 KEEP. 다른 세션의 checkout/branch/공유 운영 runtime은 수정하지 않았다. 문서 정합: 본 WO/CHECK의 중요 항목 TODO·검증·main 반영·미실행 경계를 정렬했고 canonical·index·선행 COMPLETED 기록은 그대로 유지했다.


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
