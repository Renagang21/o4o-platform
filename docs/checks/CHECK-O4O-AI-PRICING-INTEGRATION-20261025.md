# AI 가격·quota 정비 main 통합과 배포 검증

> **상태**: COMPLETED · **작성일**: 2026-10-25 (Asia/Seoul)
> **사용자 지시**: 이 공간에서 작업하고 push한 파일을 모두 main으로 병합하고 배포
> **관련 문서**: [개발 CHECK](CHECK-O4O-AI-PRICING-READINESS-V1.md) · [운영 준비 guide](../guides/O4O-AI-PRICING-READINESS-RUNBOOK-V1.md)

## 1. 작업 모집단과 통합

로컬 AI 작업 브랜치 11개를 최신 main `d083f2f716`과 대조했다. 이전 10개는 main의 조상이며 `wo/ai-pricing-readiness`의 가격·quota 정비만 미병합이었다. 기존 해당 PR은 없어 [PR #815](https://github.com/Renagang21/o4o-platform/pull/815)를 만들었다. 다른 담당자의 열린 PR은 이번 모집단에 포함하지 않았다.

원 개발 커밋은 `28e836a7de`다. 같은 WO의 통합 단계로 기존 branch에 최신 main을 merge해 상담 기능·운영 중지 설정 보존 변경을 유지했다. 예제 JSON은 현행 문서 위치 규칙에 따라 `apps/api-server/src/scripts/data/check-data/ai-pricing-cases.example.json`으로 이동하고 guide의 명령·링크를 고쳤다. 최종 PR HEAD는 `3f0704f9e5`이며 main `fcae70f14220d15a3b9b64a0275f59d4a2d52cf1`에 merge했다. 개발·통합 커밋의 main 포함과 이전 AI 브랜치 11개 전부의 main 포함을 확인했다.

새 migration·dependency·workflow·가격/한도 설정·자격정보·외부 계약 변경은 없다. 비용 비교는 기존 원장 정밀도로 보완하며 권한·예약/보류·정산·scope/service/user·API 계약은 유지한다. 직접/간접 소비처 매트릭스는 [개발 CHECK](CHECK-O4O-AI-PRICING-READINESS-V1.md#shared-module-change-verification)를 따른다. 최신 main의 상담 Extension 소비처도 추가 회귀로 확인했다.

## 2. 병합 전 검증과 gate

| 검사 | 관찰 결과 |
|---|---|
| 통합 HEAD의 AI·상담 회귀 | 23 suites / 342 tests PASS |
| 실제 격리 PostgreSQL | quota schema/예약·모델 제어·관리 집계 4 suites / 30 tests PASS |
| fixture 정리 | 전용 DB 전/후 0, 자신이 생성한 tmpfs 컨테이너 제거. 운영 DB 사용 없음 |
| 타입/도구/문서 | 통합 HEAD API type-check PASS. 이동한 null 예제의 실제 Node 명령은 exit 2, 비밀 없는 오류 코드만 출력. 변경 문서 7개 민감정보 패턴 0 |
| PR CI | [40185919989](https://github.com/Renagang21/o4o-platform/actions/runs/40185919989) SUCCESS. API Jest 3개 분할·코드 품질·관리자 빌드·CI Gate 통과 |
| PR CodeQL | [40185920016](https://github.com/Renagang21/o4o-platform/actions/runs/40185920016) SUCCESS |
| Codex / 리뷰 | 정확한 HEAD `3f0704f9e5`의 자동 리뷰 completed, finding 없음, 미해결 스레드 0 |
| main 규칙 | 실제 활성 ruleset의 PR 필수·CI Gate·human approval 0 확인. admin bypass·force push 없이 PR merge |
| 배포 전 공개 점검 | health/readiness 2개·관리 AI API 무인증 401 2개·6개 웹 HTML/JS 12개, 합계 16/16 PASS |

처음 실행한 임시 fixture driver는 이미지가 기본 생성한 DB까지 잔존으로 세어 정리 assertion이 실패했다(테스트 자체는 30개 PASS). 컨테이너는 finally에서 제거했다. 기본 DB를 `postgres`로 명시하고 새 전용 컨테이너에서 다시 검증해 전/후 추가 DB 0과 최종 30개 PASS·컨테이너 제거를 확인했다. 반복 실행 결과를 합산하지 않는다.

## 3. main 검증·배포

- main CI: [40186714792](https://github.com/Renagang21/o4o-platform/actions/runs/40186714792) — SUCCESS.
- main CodeQL: [40186714794](https://github.com/Renagang21/o4o-platform/actions/runs/40186714794) — SUCCESS.
- Delivery: [40187464249](https://github.com/Renagang21/o4o-platform/actions/runs/40187464249) SUCCESS. 실제 Classify가 API만 자동 배포 대상으로 선택했다. DEPLOYMENT = AUTOMATIC.
- API의 기존 migration job·Cloud Run 배포·새 revision readiness·traffic 전환·전환 후 readiness/rollback gate가 모두 SUCCESS다. 이번 diff에 신규 migration은 없다.
- Report SUCCESS. 정확한 main 커밋 `fcae70f14220d15a3b9b64a0275f59d4a2d52cf1`의 production status는 `success` / `DEPLOYED · deploy: api`다. Report 로그에서 `revision-label`과 새 revision `o4o-core-api-04207-zof`가 목표 커밋을 가리키는 것을 확인했다.
- 단일 revision의 traffic 100%를 읽어 검증하는 `Switch traffic to verified revision` step과 전환 후 readiness step이 통과했다. 집계 run 로그의 API build job 본문과 별도 job 로그는 제공되지 않아, raw API job 로그에서 traffic 값을 독립 재출력한 결과로 보고하지 않는다. 검증 step의 성공과 최종 serving label·revision을 함께 근거로 삼는다.
- 배포 후 공개 점검: health/readiness·관리 AI API 무인증 거부·6개 웹 HTML/JS **16/16 PASS**. 배포 전 16/16과 별도 회차다. 원문/업무 데이터·실계정·유료 AI를 요청하지 않았다.

기존 Unified Delivery의 실제 gate·서비스별 누적 diff 판정·verified rollout을 사용한다. 저장소 변수 read API는 이 환경에서 403이므로 값을 추측하거나 변경하지 않고 Actions가 현재 freeze와 CI 조건을 판정한다. 운영 DB 직접 write·운영 설정 변경·별도 배포 경로 우회는 하지 않는다.

병합 전후 main diff의 기존 `deploy-risk.mjs` 정적 판정은 `LEVEL_2`·배포 대상 API 하나·LEVEL_3 hit 0이었다. 실제 서빙 revision과 누적 diff·현재 gate의 최종 판정은 Delivery가 수행하며 정적 판정만으로 운영 배포 완료를 주장하지 않는다.

Delivery artifact의 메타데이터는 조회됐지만 파일 다운로드는 외부 저장소 403으로 차단됐다. 정책을 우회하지 않으며 최종 증거는 GitHub Actions의 검증 step·Report·정확한 커밋의 production status와 공개 점검으로 확인한다. signed URL·운영 응답 원문은 기록하지 않는다.

## 4. 운영 사용 준비와 한계

CLI의 PASS는 제공 표본·catalog·snapshot의 계산 결과이며 현재 모델 선택·credential·provider·live 보류/사용량·user quota를 검증하지 않는다. 실제 모델/요율·native 예산·설정 전달·실계정 비용/한도·유료 호출/외부 계정 연결은 [운영 준비 guide](../guides/O4O-AI-PRICING-READINESS-RUNBOOK-V1.md)의 별도 작업이다. 임시 synthetic 가격을 운영에 복사하지 않았다. Windows·로그인/browser·현장 업무/AI 품질 검증은 이번에 수행하지 않았다.

소스 CLI/예제는 개발 checkout에서 실행한다. 운영 API 이미지가 CLI source/예제를 제공하거나 요율을 자동 적용한다고 보지 않는다. 기존 COMPLETED 개발 CHECK/TODO와 과거 배포 기록은 당시 증거로 보존하며, 현행 개발자 안내·설치·구조·guide·전체 TODO에 이번 결과를 연결한다. canonical index는 수정하지 않는다.

## 5. 종료 정리

WORKTREE_DISPOSITION: `wo/ai-pricing-readiness` · source `/workspace/o4o-wt/ai-pricing-readiness` · main 포함 확인 · source clean · main CI/배포·공개 smoke PASS. 이 기록의 PR 통합·CI까지 확인한 뒤 source와 기록용 worktree/branch를 재점검해 자기 작업공간만 정리한다. 기록 통합 전에는 KEEP이다. 기준 checkout `work`/`1b158cf4c1`과 이전 worktree는 변경하지 않는다. 최종 정리 결과는 종료 보고에 남긴다.
