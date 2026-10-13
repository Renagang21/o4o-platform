# AI 누적 정비 main 통합·배포 실행

> **상태**: ACTIVE
> **작성일 / 최종 갱신**: 2026-10-13 (Asia/Seoul)
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
3. 데이터/영수증 보존을 위해 destructive down 대신 승인된 forward repair를 요구.

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
