# AI 누적 통합·배포 검증

> **상태**: ACTIVE
> **작성일 / 최종 갱신**: 2026-10-13 (Asia/Seoul)
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

진행 중. PR/CI/main target/Delivery/migration 조건/rollout/serving SHA·HTTP 결과를 실제 완료 후 기록한다. 운영 migration은 코드 병합 승인과 분리하며 필요한 명시 승인은 구체적인 target/변경을 제시한다.

## 문서 정합

선행 COMPLETED WO/CHECK는 push-only 당시 이력으로 읽기 전용 유지한다. 통합 owner/검증·운영 migration·배포 경계는 이번 WO/CHECK로 분리해 기록한다. canonical·Freeze·index·deployment 설정은 수정하지 않는다.


## 로컬 검증 완료

Jest 고유 44 suites / 742 tests, UI 82 tests PASS. isolated PostgreSQL 15의 15 tests는 skip 대신 실제 실행했다. 운영 DB·application connection은 사용하지 않았다. 통합 browser PC/mobile 모두 정상 화면 차이 0·runtime/console error 0. API/editor/Neture build/typecheck 및 변경 lint·문서 검사 PASS. 테스트 상세·수정/재검증 경계는 WO에 기록한다.
