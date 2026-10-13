# AI 누적 통합·배포 검증

> **상태**: WAITING_OPERATION_APPROVAL (main 통합 완료, 운영 migration 미실행)
> **작성일 / 최종 갱신**: 2026-10-14 (Asia/Seoul)
> **실행 WO**: [AI 누적 정비 main 통합·배포](../work-orders/WO-O4O-AI-MAIN-INTEGRATION-DEPLOYMENT-V1.md)

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
