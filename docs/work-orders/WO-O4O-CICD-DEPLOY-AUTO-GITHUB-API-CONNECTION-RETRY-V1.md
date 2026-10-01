# WO-O4O-CICD-DEPLOY-AUTO-GITHUB-API-CONNECTION-RETRY-V1

> 상태: 코드 완료 · 실 runner 검증 PENDING (다음 `AUTO_DEPLOY` 판정 run) · 작성 2026-10-01

## 1. 문제

Deploy Auto(risk-gated)가 `AUTO_DEPLOY` 를 결정한 run 은 전부 `ensureTag` 의 첫 GitHub API 호출에서 실패했다
(`scripts/ci/deploy-orchestrate.mjs` `githubClient` → `fetch failed` · `UND_ERR_SOCKET other side closed`).
태그 생성 전에 멈추므로 `deploy/auto-*` 태그 0 · deploy workflow dispatch 0 — 배포는 일어나지 않았다.

| run | 결정 | 결과 |
|---|---|---|
| 36821204059 (486fec89c) | api `AUTO_DEPLOY` LEVEL_2 | ensureTag 소켓 오류 |
| 36811339114 · 36809929512 · 36808775130 | `AUTO_DEPLOY` | 같은 오류 |
| 36820993082 · 36809749152 | SUPERSEDED / NO_DEPLOY | success (ensureTag 미도달) |

## 2. 원인

실패 소켓의 `bytesWritten 2205 · bytesRead 5341` — 새 연결이 아니라 앞선 요청(CI gate 조회 · `headSha`)이 쓴
keep-alive 소켓을 재사용했다. 그 뒤 serving SHA 판정(gcloud · git diff, ~1분) 동안 놀던 소켓을 GitHub 쪽이 닫았고,
undici 가 그 소켓으로 보낸 요청이 응답 전에 끊겼다. 코드에는 연결 오류 재시도가 없었다.

재현 조건: `AUTO_DEPLOY` 결정(= ensureTag 호출) + 직전 GitHub 호출과 ~1분 간격. 로컬 PC(70초 idle)에서는 재현되지 않았다 —
runner 네트워크 경로 의존.

## 3. 수정 (수정안 A — 연결 오류 시 재시도)

`scripts/ci/deploy-orchestrate.mjs` `githubClient` 만:

- 연결 계층 오류(`TypeError` + undici/소켓 code)만 재시도 대상. HTTP 오류 status · 일반 예외는 기존 그대로.
- **GET 만 재시도** (최대 3회 · 1s/2s backoff). 멱등이므로 안전.
- POST 는 재시도하지 않는다 — 요청 도달 여부를 모른 채 재전송하면 deploy dispatch 가 중복될 수 있다.
- 예외: 태그 생성 POST 가 연결 오류면 GET 으로 실제 생성 여부를 확인(같은 SHA 면 `created`, 아니면 원래 오류).

변경 없음: 판정 로직 · 결정표 · workflow yml · freeze · dispatch 순서 · 권한.

## 4. 검증

- `scripts/ci/__tests__/deploy-orchestrate.test.mjs` §R 6건 추가(실측 재현 · 3회 상한 · HTTP 오류 비재시도 · dispatch 비재시도 · 태그 POST 확인).
- CI 의 node:test 목록 8 파일 226/226 PASS (로컬).
- 실 runner 검증: 다음 `AUTO_DEPLOY` 판정 run 에서 `target tag ... created|exists` 와 dispatch 확인 — PENDING.
  (#257 이 포함된 현재 diff 는 migration · auth 로 LEVEL_3 → 자동 배포 차단 · ensureTag 미호출. 통제 배포는 deploy-api 직접 dispatch 경로.)
