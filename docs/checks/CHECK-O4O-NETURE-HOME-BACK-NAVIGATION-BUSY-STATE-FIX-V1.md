# CHECK-O4O-NETURE-HOME-BACK-NAVIGATION-BUSY-STATE-FIX-V1

> **WO**: WO-O4O-NETURE-HOME-BACK-NAVIGATION-BUSY-STATE-FIX-V1
> **일자**: 2026-09-15
> **범위**: Neture 대표 홈(로그인 후) 서비스 진입 버튼 — 서비스 이동 후 브라우저 뒤로가기(bfcache 복원)로 돌아왔을 때 「이동 중」 상태가 남는 결함 수정
> **변경 파일**: `services/web-neture/src/components/home/HomeEntryPanel.tsx` · `services/web-neture/src/lib/home-entry.ts` · `services/web-neture/src/components/home/__tests__/HomeEntryPanel.back-navigation.test.tsx`(신규)

## 1. 원인

| 항목 | 내용 |
|---|---|
| 증상 | 홈 → 서비스 버튼 → 서비스 화면 → 뒤로가기 → 홈에 모래시계가 남고 서비스 버튼 전부 disabled. 새로고침 전에는 재이동 불가 |
| 원인 | `HomeEntryPanel.handleHandoff` 가 이동 성공 시 `busyId` 를 유지한 채 `window.location.assign` 으로 떠남(정상). 브라우저가 홈 페이지를 **bfcache 에서 복원**하면 JS 힙 · React 상태가 이동 직전 그대로 돌아오므로 `busyId` 가 살아 있고, 복원 시 재마운트 · 초기화가 일어나지 않아 풀리지 않음 |
| 재현(수정 전, 운영) | 아래 §4 「수정 전 재현」 — `pageshow.persisted = true` 복원에서 15/15 버튼 disabled · 스피너 1 · 두 번째 이동 클릭 불가(TimeoutError) |

## 2. 수정 내용

| 파일 | 변경 |
|---|---|
| `lib/home-entry.ts` | `openServiceEntry` 를 `resolveServiceEntryUrl`(발급만, `string` 반환) + `openServiceEntry`(발급 + 즉시 이동, 기존 계약 유지) 로 분리. `/auth/handoff` 요청 · 응답 검사 · 오류 문구는 그대로 |
| `components/home/HomeEntryPanel.tsx` | ① `pageshow` 리스너를 `useEffect` 로 컴포넌트 수명에 맞춰 등록 · 해제. `event.persisted === true`(bfcache 복원) 일 때만 `busyId` 를 해제 — 최초 로드 · 새로고침은 건드리지 않음 ② `handoffGeneration` ref — 이동 시작마다 +1, 복원 시에도 +1. 복원 이전에 시작된 발급 응답이 늦게 도착하면 세대가 달라 `assign` 하지 않고, 늦은 실패도 오류 안내를 띄우지 않음 ③ `busyId !== null` 이면 핸들러가 즉시 반환(중복 클릭 이중 방어) ④ 실패 시 오류 안내 + 재활성 기존 동작 유지 |
| 건드리지 않은 것 | AI 입력 · 소식 목록 · 스크롤 · 인증 · handoff 서버 계약 · 다른 화면 상태. 강제 새로고침 · bfcache 비활성화(`Cache-Control: no-store` · `unload` 리스너) · 새 탭 전환 회피 없음 |

## 3. 자동 테스트

`npx vitest run --config services/web-neture/vitest.config.mjs` (저장소 루트) — **2 files · 20 tests PASS** (기존 `LocalAgentCard.lna.test.tsx` 12 + 신규 8).

신규 `HomeEntryPanel.back-navigation.test.tsx` 8건:

| # | 검증 |
|---|---|
| 1 | 이동 성공 후 busy 유지 → `pageshow(persisted)` 에서 전 버튼 재활성 → 같은 서비스 재이동(handoff 재발급) |
| 2 | 복원 후 다른 서비스로 이동 · 반복 왕복 3회 |
| 3 | 복원 이전 요청의 늦은 성공 응답 → `assign` 호출 없음 · 오류 없음 · 이후 새 클릭은 정상 이동 |
| 4 | 복원 이전 요청의 늦은 실패 → 오류 안내 없음 |
| 5 | `pageshow(persisted=false)` 는 이동 중 상태를 바꾸지 않음 |
| 6 | 이동 실패 → 오류 안내 + 재활성 + 재시도 성공 시 안내 소거 |
| 7 | 이동 중 중복 클릭 → 발급 1회 · `assign` 1회 |
| 8 | 언마운트 시 `pageshow` 리스너 해제(등록한 동일 함수) |

`services/web-neture` `tsc --noEmit` exit 0 (worktree 에 미빌드였던 `@o4o/auth-utils` · `@o4o/account-ui` 를 빌드한 뒤 — 소스 변경 없음).

## 4. 실 브라우저 검증

- 도구: Playwright Chromium(headed). **Playwright 는 기본 스위치 `--disable-back-forward-cache` 로 Chromium 을 띄우므로**(`playwright-core/lib/server/chromium/chromiumSwitches.js`) MCP 브라우저의 뒤로가기는 항상 fresh load 였다(`window` 리스너 소실 · `pageshow` 미관측). 본 검증은 `ignoreDefaultArgs: ['--disable-back-forward-cache']` 로 별도 기동해 **실제 bfcache 복원**을 재현했다. 스크립트는 세션 scratchpad(`bfcache-check.mjs`) — 저장소에 추가하지 않음.
- bfcache 복원 판정: 이동 전 `window.addEventListener('pageshow')` 로 심은 리스너가 뒤로가기 후에도 살아 있고 `persisted: true` 를 기록하면 복원, 리스너가 사라졌으면 단순 재로드.
- 계정: `docs/local/TEST-ACCOUNTS.local.md` 의 Neture 운영자 계정(kpa-society · pharmacy-hub · cosmetics · kpa-branch 회원 보유). 운영 회원 상태 변경 없음.

### 수정 전 재현 (운영, 2026-09-15 01:2x UTC, 배포 전 번들)

| 라운드 | 이동 | 뒤로가기 후 |
|---|---|---|
| 1 | KPA Society 커뮤니티 → `kpa-society.co.kr/handoff?token=***` | `pageshow persisted=true` · disabled 15/15 · 스피너 1 · textarea/스크롤 보존(scrollY 240) |
| 2 | 파머시 허브 커뮤니티 | **클릭 불가** — `element is not enabled` 로 TimeoutError (결함 재현) |

### 수정 후 (배포 후 갱신)

| 라운드 | 이동 | 뒤로가기 후 |
|---|---|---|
| | | 배포 후 기록 |

## 5. 미검증 항목

배포 후 갱신.

## 6. Git · 배포

| 항목 | 값 |
|---|---|
| 구현 커밋 | 배포 후 갱신 |
| Deploy Web Services run | 배포 후 갱신 |
| 최종 상태 | 배포 후 갱신 |

## 7. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
