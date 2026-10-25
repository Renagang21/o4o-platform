# 내 매장 만료 상담 정리 배포 연결 검증

> **상태**: ACTIVE
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25
> **기준 main**: `4ee5a8ecda200a1bddf08d8f00b869e5f4c76806`
> **branch**: `wo/store-consultation-cleanup-deployment`
> **작업**: [TODO](../work-orders/TODO-O4O-STORE-CONSULTATION-CLEANUP-DEPLOYMENT-V1.md) · [데이터 범위](../design/DESIGN-O4O-STORE-CONSULTATION-DATA-SCOPE-V1.md)
> **사용자 정정**: 실기기·현장 음성·약사 검수는 차후로 미루고 개발에 집중. 이번 결과는 개발/push이며 실제 운영 활성화 완료가 아니다.

## 1. 코드·문서 대조와 수정

선행 상담·상품 자료·채널 연결 개발 `00f098883f`는 착수 시 main에 없었다. 최신 main에서 새 전용 branch/worktree를 만들고 의존 작업을 결합했다. 기존 작업공간은 수정하지 않았다. `startup.service.ts`의 두 충돌은 최근 추가된 운영자 초대 정리와 상담 정리의 start/stop을 모두 유지해 해결했다(`afd235e251`). 관련 생명주기 회귀를 추가했다.

`deploy-api.yml`은 여러 `--set-env-vars`로 운영 환경 전체를 교체한다. 상담 mode만 추가하면 기존 `CONSULTATION_STATE_CLEANUP_ENABLED=false`가 다음 배포에서 사라질 수 있었다. 기존 `cloud-run-env.mjs optional`을 재사용해 production에 mode=`apply`를 명시하고 현재 enabled 값은 그대로 보존한다. 현재 값이 없으면 enabled를 새로 만들지 않는다. 현재 Cloud Run 조회가 실패하면 `--require-current true`로 flag 생성/배포 전에 실패한다.

같은 파일의 실제 deploy 명령에 생성된 NUL flag 배열을 연결했다. migration-only에서는 이 처리를 실행하지 않는다. 기존 CI·freeze·production ref/WIF·verified rollout·rollback 경계는 유지한다. 신규 DB schema/migration·의존성·공통 Core runtime·IAM·credential·배포 경로를 추가하지 않았다. 코드의 로컬 기본 dry-run과 정확한 apply/false 판정도 유지했다.

## 2. 이번 실행 결과

| 검사 | 결과 |
|---|---|
| 설치 | Node 22.18.0 / pnpm 10.25.0, frozen lockfile·무결성 검증 유지 PASS. lockfile 변경 없음 |
| 패키지 | `pnpm run build:packages` PASS |
| API | 약국 모듈 전체 + operator invitation retention + migration ownership/startup health: **29 suites / 217 tests PASS**, 기존 조건부 **14 suites / 187 tests SKIP** |
| Store | `pnpm --filter store-web test`: **77 files / 845 tests PASS** |
| 타입/build | API tsc와 Store tsc/Vite 모두 PASS. Store 기존 큰 chunk 안내는 유지 |
| 배포/환경 회귀 | `node --test scripts/ci/__tests__/cloud-run-env.test.mjs scripts/ci/__tests__/deploy-workflow-gates.test.mjs`: **16 suites / 96 tests PASS** |
| 실제 resolver CLI | workflow의 수정된 run 명령을 추출해 로컬 합성 gcloud로 실행: enabled 없음/false/true 유지, 현재 조회 실패 시 출력 파일 없이 실패 **4/4 PASS**. 임시 fixture 디렉터리 삭제 확인 |
| 문법/lint | 실제 workflow YAML parse·수정 shell 2곳 `bash -n` PASS. startup·API 회귀 TS ESLint 오류 0·경고 0 |
| 배포 위험 | 기존 workflow 의미 판정에서 `api.config` 변경 확인. 정책상 **LEVEL 3 / MANUAL/GATED**이며 일반 자동 배포 완료로 간주하지 않음 |

선행 [통합 CHECK](CHECK-O4O-STORE-CONSULTATION-CONTENT-CHANNEL-COMPLETION-V1.md)의 브라우저 45·실제 격리 PostgreSQL 5건은 이전 실행의 증거다. 이번에는 UI/정리 SQL을 수정하지 않았고 해당 검사를 재실행하거나 수치에 합산하지 않았다. 최신 main과 결합한 테스트·build는 위에 별도로 기록했다. 새 하드웨어 검수나 유료 AI 호출을 실행하지 않았다.

## 3. 개발과 운영 상태의 구분

- 이번 사용자 정정에 따라 현장 검수는 보류한다. 실제 계정/역할·현장 기기 연결·마이크·약사 언어/전문 품질은 확인하지 않았다.
- production 설정은 main 병합과 현재 Delivery의 LEVEL 3 통제 배포 후에 적용된다. push만으로 mode가 바뀌거나 기존 원문이 정리되지 않는다. 이번 작업은 PR·main·배포·운영 DB write를 수행하지 않았다.
- 실제 운영에서 기존 enabled가 false면 그대로 중지된 상태다. 명시 apply는 중지 해제를 뜻하지 않는다. 운영자는 현재 설정과 aggregate 로그의 mode/count 또는 unavailable을 확인해 활성/정리 성공을 구분한다. 원문·계정값을 로그에 넣지 않는다.
- 정리는 시작 시와 프로세스 실행 중 60초 timer로 확인하며 90초 연결 만료와 회당 200행 상한을 사용한다. Cloud Run scale-to-zero/CPU 중지·적체가 있어 90초 내 물리 파기 SLA나 독립 상시 스케줄러를 제공한다는 뜻은 아니다. 현재 상담의 명시 종료/다음 고객 초기화는 유지한다.
- 실제 운영 count/본문 파기·기기 결과는 미관측이다. 작업 당시 다른 Promote가 진행 중이었으며 공유 runtime을 변경하지 않았다. GCP 직접 identity는 제공되지 않았고 저장소 변수 API는 403이어서 값을 추정하거나 재설정하지 않았다. 기존 production/WIF 경로에서 통합 담당이 적용/관측한다.

## 4. push·인계

새 branch는 선행 상담 branch의 의존 commit과 최신 main을 함께 포함한다. 통합 시 **이 branch 하나**를 검토해 중복 PR을 만들지 않는다. 원격 SHA·작업 트리·PR CI 상태는 push 후 같은 branch에 기록한다. 기준 checkout과 기존 worktree는 유지한다.

문서 정합: 발견 2건(환경 전체 교체의 중지 값 소실 가능성, timer와 물리 파기 시간의 구분) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건. 데이터 범위에 개발 배포 연결과 실행 한계를 반영했다.
