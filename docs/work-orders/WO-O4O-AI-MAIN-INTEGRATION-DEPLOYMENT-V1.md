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
- [ ] PR CI·Codex blocker/미해결 thread·최신 main 위치 검토 후 병합.
- [ ] post-merge CI/Delivery 판정 및 운영 migration 승인 조건 확인.
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
