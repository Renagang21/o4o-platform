# AI 운영 가격 관측·전달 main 통합과 배포 검증

> **상태**: COMPLETED · **작성일**: 2026-10-26
> **사용자 지시**: 배포 시 검토할 항목을 확인하면서 main 통합 → 배포 진행
> **범위**: 기존 가격·quota·권한 기반의 코드 통합과 배포. 실제 요율·한도·credential 신규 설정/변경 및 실계정·유료 호출은 별도
> **개발 기록**: [개발 CHECK](CHECK-O4O-AI-RUNTIME-OPERATIONS-READINESS-V1.md) · [운영 검증 guide](../guides/O4O-AI-RUNTIME-OPERATIONS-VERIFICATION-V1.md)

## 1. 통합 대상과 검토

원본 개발 commit `29cf814051`의 23개 경로를 통합했다. 기존 가격 parser·optional env·관리자 GET·오프라인 CLI를 연결하며 새 Core/원장·route/role·schema/migration·dependency는 추가하지 않는다. 확정 비용과 token 미계측을 구분하는 관리 집계 보완도 포함한다.

선행 상품 worker 이미지 빌드 실패는 다른 담당의 [PR #823](https://github.com/Renagang21/o4o-platform/pull/823)/main `146668cd86`에서 Docker context 허용 2줄로 수정됐다. 이를 자기 branch에 정상 merge했다. 기준 checkout과 다른 작업 branch는 변경하지 않았다.

배포 workflow 변경은 `LEVEL_3`, 영향 서비스는 API·관리자다. 제공된 catalog → 현재 plain 값 보존 → 둘 다 없음 생략을 검토했다. 현재 조회 불가·secret reference·잘못된 catalog는 image push/migration 전에 중단한다. 새 요율/무료값을 만들지 않으며 freeze·CI·WIF·migrate-only·verified rollout/rollback을 유지한다. 현재 운영값을 별도 CLI로 조회·변경하거나 gate를 우회하지 않는다.

## 2. PR 검증과 품질 지적 처리

- [PR #824](https://github.com/Renagang21/o4o-platform/pull/824): 최종 source `05dc746b6b0e74d814486d787278623a81f9a0e1`, main `38bb2d8e287f17970085774dfa409a2849999f11`에 MERGED.
- 최종 PR CI [40250054033](https://github.com/Renagang21/o4o-platform/actions/runs/40250054033)와 필수 `CI Gate` PASS. CodeQL [40250054047](https://github.com/Renagang21/o4o-platform/actions/runs/40250054047) PASS.
- 같은 HEAD의 Codex 검토 완료·지적 없음·미해결 thread 0. main ruleset을 실제 조회했고 `--admin` 없이 정상 PR merge했다.
- Sonar 초기 Reliability D를 검토했다. 상세 API는 403이지만 GitHub `check-runs/121338472915/annotations`에서 6개 주석을 확보했다. 문자열 정렬 비교 함수 1건·중첩 삼항식 2건·문자열 치환 3건을 정리했다.
- 최종 HEAD의 Sonar check `121341269391`: **Quality Gate PASS · 신규 이슈 0 · 주석 0 · 신규 중복 0%**. 전체 저장소의 모든 과거 이슈가 없다는 뜻은 아니다.
- 선행 main 반영 전 commit의 CI는 새 revision으로 취소돼 완료 증거로 쓰지 않았다. `58880041a8`의 CI는 성공했지만 Sonar 지적이 있어 수정 후 최종 HEAD에서 모두 재확인했다.

| 통합 로컬 검사 | 결과 |
|---|---|
| API 관련 회귀 | 수정 후 **5 suites / 96 tests PASS**. 개발 단계 373건과 중복 합산하지 않음 |
| 관리자 회귀 | **3 files / 24 tests PASS**. API adapter 변경 검증, 실제 browser/login 검증은 아님 |
| 배포 도구 | 수정 후 **194 tests PASS**. optional env·workflow gate·risk/orchestrator |
| 타입·lint | API type-check와 수정 TypeScript lint PASS |
| 실제 API 배포 빌드 | 최종 코드 tsc → database backup → tsup → restore PASS. database **2,408개 파일 hash 일치**, main/migrate/product worker 3개 entry 문법 검사 PASS |

개발 단계의 격리 PostgreSQL 37건과 업무 권한 callback/회계 검증은 [개발 CHECK](CHECK-O4O-AI-RUNTIME-OPERATIONS-READINESS-V1.md)의 당시 증거다. 이번 통합에서 실제 운영 계정·유료 provider로 재현한 결과로 바꾸지 않는다.

## 3. main 검증과 배포

main CI [40250995086](https://github.com/Renagang21/o4o-platform/actions/runs/40250995086)·CodeQL [40250995069](https://github.com/Renagang21/o4o-platform/actions/runs/40250995069) SUCCESS. Delivery [40251869864](https://github.com/Renagang21/o4o-platform/actions/runs/40251869864)는 SUCCESS이며 실제 production 상태는 `HELD_LEVEL_3 · api(L3), admin(needs-api)`였다. 자동 배포가 실행된 것으로 해석하지 않는다.

DEPLOYMENT = MANUAL/GATED. 진행 중인 다른 운영 배포 0과 최신 main SHA를 확인하고 해당 SHA의 API·관리자만 Promote [40251971561](https://github.com/Renagang21/o4o-platform/actions/runs/40251971561)로 1회 승격했다. **Promote SUCCESS · production 상태 `DEPLOYED · deploy: api,admin`**을 확인했다. 웹 배포는 선택하지 않았다.

| 실제 Actions 배포 검증 | 결과 |
|---|---|
| API 가격 catalog 검증·보존 | SUCCESS. image push/migration 전 실행 |
| API 빌드·이미지 push·기존 migration job | SUCCESS. 이번 diff에 신규 migration 없음 |
| API 새 revision readiness·트래픽 전환 | SUCCESS |
| API 전환 후 검증/실패 시 rollback gate | SUCCESS |
| 관리자 새 revision smoke·트래픽 전환·배포 확인 | SUCCESS |
| 최종 serving SHA Report | SUCCESS. 기존 reader/Report가 API·관리자의 target SHA/단일 revision 100% 조건을 확인하고 DEPLOYED 판정 |

배포 직전과 이후 공개 점검은 각각 **16/16 PASS**다. health/readiness 2개·관리 AI API 무인증 401 2개·웹 6곳 HTML/JS 12개를 확인했다. 원문/업무 데이터·실계정·유료 AI를 요청하지 않았다.

이 환경의 raw job log 조회는 본문 0바이트였다. 특정 set/carry/omit 분기·원문 migration 실행 수·revision 이름을 별도 관측했다고 주장하지 않는다. 최종 증거는 실제 Actions step·strict serving Report·정확한 commit의 production 상태와 공개 점검이며, 별도 GCP CLI로 운영 트래픽을 독립 조회한 결과와 구분한다.

## 4. 실제 사용과 운영 설정의 남은 범위

main 통합·코드 배포는 실제 선택 모델·공식 요율/native profile·예산·현재 quota·provider 연결·실시간 사용자 한도·업무 결과 저장의 완료를 뜻하지 않는다. 허용 계정/호출 예산·자료 공개/권한·업무 fixture 정리 계획을 확정한 뒤 [운영 검증 guide](../guides/O4O-AI-RUNTIME-OPERATIONS-VERIFICATION-V1.md)를 따른다.

기존 관리자 GET의 가격 관측은 해당 process의 파싱 상태/version/fingerprint/count다. 공개 무인증 거부와 배포 성공으로 실제 관리자 응답의 catalog 일치까지 검증했다고 주장하지 않는다. 실제 관측 snapshot 비교·모델/한도 입력·역할별 업무·유료 provider/사용량·보류/증거 정산 검증은 후속이다. 요율·한도값을 새로 정하거나 GitHub repository/environment variable·secret·IAM·결제 계약을 별도로 변경하지 않았다. 배포 시 기존 설정의 전달은 위 workflow 검증 범위다.

## 5. 문서 정합과 종료 정리

문서 정합: ACTIVE guide 2개·AI 구조·전체 TODO에 현재 기록을 연결했다. 개발 시점 COMPLETED CHECK/TODO와 canonical index는 보존했다. 문서 5개 민감정보·상대 링크/절·스코프를 확인하며 기존 전체 TODO의 S2-2/S4-4를 실사용 완료로 표시하지 않는다.

WORKTREE_DISPOSITION: source `wo/ai-runtime-operations-readiness`는 main CI·배포·공개 smoke PASS, 기록 `wo/ai-runtime-operations-integration-record`는 문서 통합 검증 전 KEEP. 기록 PR 통합·CI 이후 main 포함·clean·후속 작업/다른 세션 사용 여부를 확인하고 자기 작업공간만 정리한다. 최종 정리는 종료 보고에 남기며 기준 checkout `work`/`1b158cf4c1`과 이전 worktree는 보존한다.
