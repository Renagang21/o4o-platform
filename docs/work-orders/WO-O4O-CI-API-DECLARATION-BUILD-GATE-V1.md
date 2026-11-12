# PR CI 에 API 배포 빌드(선언 파일 생성) 검사 추가

> **상태**: DRAFT
> **작성일**: 2026-11-12 · **최종 갱신**: 2026-11-12
> **실행 위치**: CLOUD
> **인계**: claude/epic-rubin-5g04vm · push 전 · 다음 실행자 CLOUD(작성) → 통합 담당(병합 판단)
> **근거**: 상시 통합 세션 관찰(2026-11-12) — #1044 가 PR CI 를 통과했으나 main 배포 빌드에서 `TS4053` 으로 api 배포 실패, hotfix #1046

## 1. 배경

- #1044 병합 뒤 Delivery run 43321869177 의 `API / build-and-deploy` 가 빌드 단계에서 실패했다. api 에 의존하는 웹 7개 배포도 함께 보류됐다.
  - 오류: `consultation-guidance.ts(153,9): error TS4053` — export 되지 않은 타입(`Control`)이 public 메서드 반환 타입으로 추론됐다.
- api 배포 빌드는 `pnpm --filter @o4o/api-server build` = `tsc -p tsconfig.build.json` 이다. `tsconfig.json` 이 `declaration: true` 라서 선언 파일을 만든다.
- PR CI 의 API 타입 검사는 `tsc --noEmit` 이다. 선언 파일을 만들지 않으므로 TS4053 · TS2742 같은 선언 생성 오류를 잡지 못한다.
- 결과: PR CI 는 통과하고 main 배포에서 처음 실패했다. 운영은 이전 버전으로 유지됐지만, hotfix 전까지 모든 api 배포가 막혔다.

## 2. 사용자 확정

- 미정. CI 변경이라 `AGENTS.md` §5 대상이며, 병합은 통합 담당이 직접 판단한다. 이 WO 는 변경안을 준비하는 데까지다.

## 3. 설계 판단

| 항목 | 제안 | 근거 |
|---|---|---|
| 검사 방법 | api 영향 PR 에서 `tsc -p tsconfig.build.json` 을 실행한다. 출력은 임시 디렉터리로 보내거나 `--emitDeclarationOnly` 를 쓴다 | 배포 빌드와 같은 설정으로 선언 생성 오류를 잡는다 |
| 위치 | 기존 API 타입 검사 job 의 step 추가(새 job 을 만들지 않는다) | 1분 청구 · job 수 증가를 피한다(#1027 기조) |
| 비용 | 실행 시간을 측정해 인계 기록에 적는다 | 타입 검사 시간과 비교해 판단한다 |
| gate | `CI Gate` upstream 에 포함 | 배포 전 차단이 목적이다 |

## 4. 범위 밖

- 배포 workflow(`deploy-api.yml`) 변경
- 다른 앱(웹)의 빌드 검사 변경

## 5. TODO

- [ ] T1 [CLOUD] 현재 CI 의 API 타입 검사 step 위치와 api 영향 판정(`detect-affected`) 조건을 확인한다
- [ ] T2 [CLOUD] step 을 추가하고, main 에서 통과 · #1046 이전 코드(`3dfdb6e4`)에서 실패하는 것을 재현해 기록한다
- [ ] T3 [CLOUD] `scripts/ci/__tests__` 에 workflow 구조 테스트가 있으면 갱신한다
- [ ] T4 [CLOUD] commit · push · 인계(별도 branch · 별도 PR — CI 변경은 다른 변경과 묶지 않는다)
- [ ] T5 [통합 담당] PR 검토 · 병합 판단(상시 통합 세션은 CI 결과만 보고한다)

## 6. 검증 계획

- PR CI 에서 새 step 소요 시간과 통과를 확인한다.
- 실패 재현 근거(커밋 · 오류 메시지)를 PR 설명에 적는다.

## 문서 정합

- 해당 없음
