# 매장 상담 음성 요청 테스트 불안정 수정

> **상태**: ACTIVE
> **작성일**: 2026-11-12 · **최종 갱신**: 2026-11-12
> **실행 위치**: CLOUD
> **인계**: claude/epic-rubin-5g04vm · push 전 · 다음 실행자 CLOUD
> **근거**: 상시 통합 세션 관찰(2026-11-12) — main `3dfdb6e4`(#1044) CI 에서 이 테스트 실패로 Delivery `BLOCKED_CI`, 재실행 1회로 통과

## 1. 배경

- 테스트: `services/web-store/src/pages/pharmacy/consultation-speech.test.tsx` 59행
  `finishes a guidance voice request beside its microphone button and waits for recognition before preparing`
- 실패 기록:
  - main `3dfdb6e4` CI run 43319354870 attempt 1(`Web production build (affected)`)에서 실패
  - 같은 코드가 PR #1044 HEAD `8f1e9b97` CI 와 main 재실행(attempt 2)에서는 통과
  - 결과: 실패 1 / 988, 테스트 소요 1071ms
- 실패 지점: 63행 `await guidance().findByRole('button', { name: '요청 말하기 마치기' })` 가 기본 대기 시간(1000ms) 안에 버튼을 찾지 못했다.
  - `TestingLibraryElementError: Unable to find role="button" and name "요청 말하기 마치기"`
  - 실패 시점 DOM: 「상담 안내 준비」 region 에 빠른 안내 버튼만 있었고, 말로 안내 요청 클릭에 따른 상태 전환이 아직 반영되지 않았다.
- #1044 가 같은 화면 부품(`ConsultationGuidancePanel` · `ConsultationSupportPanel` · `ConsultationLauncher`)을 바꿨다. 재사용 세션 · 설정 조회 같은 비동기 단계가 늘어 렌더 순서가 늦어졌을 가능성이 있다. 확정하지는 않았다.
- 영향: 이 테스트가 실패하면 main CI → Delivery 가 배포를 막는다(오늘 1회). 같은 날 Windows 설치본 테스트도 같은 이유로 배포를 막았다(#1043 에서 수정).

## 2. 설계 판단

| 항목 | 결정 | 근거 |
|---|---|---|
| 수정 방향 | 클릭 뒤 화면이 실제로 준비된 신호(음성 인식 객체 생성 · 버튼 상태 전환)를 기다리도록 테스트를 고친다. 원인이 컴포넌트의 경쟁 상태이면 컴포넌트를 고친다 | 고정 timeout 연장보다 준비 신호 대기가 원인을 숨기지 않는다 |
| 금지 | skip · 비활성화 · 재시도로 가리기 | CI 정책 |
| 범위 | `services/web-store/src/pages/pharmacy/` 의 테스트 · 상담 컴포넌트 | 배포 workflow · 공통 패키지는 바꾸지 않는다 |

## 3. 범위 밖

- CI workflow 변경(재시도 설정 등)
- 다른 불안정 테스트 전수 조사(발견하면 인계 기록에 적는다)

## 4. TODO

- [ ] T1 [CLOUD] 최신 `origin/main` 에서 시작해, 실패를 로컬에서 재현하는 조건을 찾는다(`vitest run --maxWorkers=2` 반복 · CPU 부하 · `--sequence.shuffle`). 재현하지 못하면 그 사실과 시도 횟수를 기록한다
- [ ] T2 [CLOUD] 「말로 안내 요청」 클릭 → 「요청 말하기 마치기」 표시 사이의 비동기 단계를 컴포넌트에서 확인한다(설정 · 재사용 세션 조회 대기 여부)
- [ ] T3 [CLOUD] 원인에 맞게 수정한다(테스트의 준비 신호 대기 또는 컴포넌트 경쟁 상태 해소)
- [ ] T4 [CLOUD] 검증: 해당 파일 반복 실행(가능하면 50회 이상 연속 통과) · `pnpm --filter store-web test` 전체 · type-check
- [ ] T5 [CLOUD] commit · push · `HANDOFF.md` 인계(PR 생성 · 병합은 통합 세션)

## 5. 검증 계획

- 반복 실행 결과(횟수 · 통과 수 · 실행 조건)를 인계 기록에 남긴다.
- 통합 세션은 PR CI 의 `Web production build (affected)` 통과와, 병합 뒤 main CI 통과(재실행 없이)를 확인한다.

## 문서 정합

- 해당 없음
