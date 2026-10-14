# 신규 개발자 AI 개발 안내·현재 적용 상태 정합

> **상태**: COMPLETED
> **작성일 / 최종 갱신**: 2026-10-14 (Asia/Seoul)
> **요청**: 신규 개발자 시작 안내·SETUP·AI Core/Extension 구조 문서에 지금까지 진행한 작업 반영
> **기준**: main `fb0012a09c57c6a1012f2dd37d6d4e9c37d314ae`

## 범위

`docs/development/COLLABORATOR-START-HERE.md`, `SETUP.md`, `docs/architecture/O4O-AI-CORE-EXTENSION-FOUNDATION-V1.md`를 현재 코드와 완료 증거에 맞춘다. ACTIVE architecture 수정의 실행 WO이며 Core 계약·사업/권한 정책을 변경하지 않는다. 기준 checkout은 다른 세션의 `work` branch이므로 전용 `wo/ai-developer-handoff-update` worktree에서 수행한다.

AI 공통 기반·quota·Runtime/editor 정비의 [최종 통합/배포 CHECK](../checks/CHECK-O4O-AI-MAIN-INTEGRATION-DEPLOYMENT-V1.md), 현재 package scripts·CI·AGENTS를 기준으로 한다. 초기 조사/검증 수치는 당시 이력으로 구분하며 선행 COMPLETED 문서는 수정하지 않는다. 신규 Core/원장·dependency/CI·메뉴·운영 credential/DB 변경 없음. canonical index 행 변경 없음.

## TODO·검증

- [x] 현재 main 코드·scripts·세 문서와 완료 기록 대조.
- [x] 완료 구현·migration/배포·검증 한계와 후속 작업 반영.
- [x] 설치/API 의존성 빌드·PR/배포 경계 안내 및 상대 링크 정합.
- [x] 문서 민감정보·diff·실제 docs consumer 로컬 검증.

검증: 변경 4파일 민감정보 0건, 상대 링크 대상 86개 존재, `git diff --check` PASS. 실제 CI docs consumer selector가 고른 `store-role-registry-alignment.spec.ts` 1 suite / 11 tests PASS. 이는 문서를 읽는 기존 소비처 검증이며 신규 PC 실행·유료 AI 호출을 수행한 결과가 아니다.

Git 통합은 이 4파일만 path-specific commit/push하고 실제 required CI·review blocker·최신 main을 확인한 뒤 정상 PR merge한다. 원격 CI/병합 결과는 해당 PR과 최종 완료 보고에서 확인한다. 문서 작성/로컬 검증 완료와 원격 gate를 혼동하지 않는다.

문서-only이므로 **DEPLOYMENT=NOT_APPLICABLE**. 실제 AI 호출·로그인·DB migration·운영 배포를 새로 실행하지 않는다. 완료된 운영 적용을 fresh PC 설치 성공이나 실계정 비용 검증으로 보고하지 않는다.

문서 정합: 현재 적용 상태와 초기 조사/검증을 구분하고 quota를 미구현·배포를 미실행으로 읽게 하던 현행 안내를 정정했다. `build:packages`의 API 의존성 포함·tsc/tsup 명령 구분, 기본 human approval과 새 위험 변경 승인 구분, 깨진 목록 줄바꿈을 정리했다. 범위 밖 README의 secret 이행 서술은 선행 완료 CHECK와 차이가 있어 새 안내에서는 날짜를 붙인 완료 증거로 연결한다. live secret 등록 상태는 이번 작업에서 확인하지 않았으며 기존 이력을 현재 조회 결과로 주장하지 않는다.
