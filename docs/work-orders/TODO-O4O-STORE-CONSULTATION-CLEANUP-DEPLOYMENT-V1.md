# 내 매장 만료 상담 정리 배포 연결 TODO

> **상태**: ACTIVE
> **작성일**: 2026-10-25 · **최종 갱신**: 2026-10-25
> **사용자 지시**: 만료 상담 정리의 운영 활성화 후속. 현장 준비는 있으나 실기기·음성·약사 검수는 차후로 미루고 개발에 집중한다는 최신 응답 반영.
> **기준 main**: `4ee5a8ecda200a1bddf08d8f00b869e5f4c76806`
> **branch**: `wo/store-consultation-cleanup-deployment`
> **의존 작업**: [상담·상품 근거·채널 통합 CHECK](../checks/CHECK-O4O-STORE-CONSULTATION-CONTENT-CHANNEL-COMPLETION-V1.md)의 push `00f098883f`를 포함. 기존 worktree는 수정하지 않는다.
> **종료점**: 조사 보완·개발·검증·commit/push. 이번 개발 완료와 실제 main/운영 활성화를 구분한다. 현장 검수·운영 계정 write/유료 AI·기기 조작은 후속.

## TODO

- [x] 최신 main·AGENTS·정본 색인·배포/보존 기준·선행 코드와 운영 접근 경로를 조사. 기존 branch 미통합과 다른 Promote 진행을 확인. 새 전용 worktree에서 개발한다.
- [x] 선행 상담 개발을 최신 main과 결합. startup의 운영자 초대 정리와 상담 정리 충돌을 해결하되 두 job의 시작/종료를 모두 유지한다.
- [x] 기존 API 배포 경로에 상담 정리 apply를 연결. 기존 중지 flag를 보존하고 현재 설정 조회 실패 시 배포를 중단한다. Core·schema·의존성·신규 IAM/credential 경로를 추가하지 않는다.
- [x] 로컬 기본 dry-run/명시 apply/중지·중복 실행, workflow 배선·현재 환경 보존과 시작/종료 회귀를 검증한다. 최신 main 결합 범위 API/Store 타입·테스트를 확인한다.
- [ ] source·운영·현장 검수 상태를 문서에 구분. 정확한 경로 stage/commit/push·원격 SHA·CI 상태를 확인하고 인계한다.

## 코드/문서 대조 후 보완

- `deploy-api.yml`의 반복 `--set-env-vars`는 전체 환경 교체다. mode만 추가하면 운영자가 설정한 `CONSULTATION_STATE_CLEANUP_ENABLED=false`를 다음 배포가 지울 수 있으므로 기존 optional-env resolver로 함께 보존한다.
- resolver는 현재 Cloud Run 설정 조회 성공을 요구한다. GCP 직접 credential이나 장기 키를 만들지 않고 기존 production/WIF·CI·verified rollout 경로를 유지한다. 이 환경의 저장소 변수 조회는 403이며 별도 값을 추정/재설정하지 않는다.
- job은 현재 연결 만료 상태의 본문/코드를 비우는 업무다. 시작 시와 프로세스 실행 중 60초 timer로 확인하지만 Cloud Run scale-to-zero/CPU 중지·batch 적체가 있어 90초 내 물리 파기 SLA로 설명하지 않는다.
- 이번 요청에서는 현장 검수를 연기했다. 이전 합성 브라우저/격리 PostgreSQL 결과는 선행 증거이며 재실행하지 않은 검사를 이번 결과에 합산하지 않는다. 새 스키마·운영 DB 테스트 행·실계정/역할을 만들지 않는다.
- 이번 실행: API 217 PASS/기존 skip 187·Store 845 PASS·배포/환경 96 PASS·실제 resolver CLI 합성 4 PASS·API/Store/선행 패키지 build 및 변경 TS lint PASS. 상세와 미실행 운영 범위는 [CHECK](../checks/CHECK-O4O-STORE-CONSULTATION-CLEANUP-DEPLOYMENT-V1.md)를 따른다.

문서 정합: 발견 2건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
