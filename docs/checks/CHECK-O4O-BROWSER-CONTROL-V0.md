# CHECK-O4O-BROWSER-CONTROL-V0

> **WO**: `WO-O4O-BROWSER-CONTROL-V0`
> **상태**: 검증 완료 — §52 완료 기준 전 항목 PASS (WO 종료 판단은 사용자 몫)
> **작성일**: 2026-09-10
> **선행**: `WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0` 및 그 이전 Local Work Agent 계열 = 전부 CLOSED
> **commit**: `3eb8d7f3a` (코드·테스트·README · CI/배포 success) · 본 문서

---

## 0. 한 줄 요약

O4O 가 하는 일은 **등재된 사이트를 사용자의 브라우저로 여는 것** 하나다. 로그인은 사용자가
사이트에서 직접 하고, `[로그인 완료]` 버튼이 유일한 완료 신호다. 그 경계를 코드에서 지키는
방식은 창 제어 V0 와 같다 — "할 수 있는 일을 늘린 것" 이 아니라 **URL 이 프로토콜에 실릴
자리를 만들지 않은 것**이다. 서버 · AI · 사용자 어느 쪽도 URL 을 보낼 수 없고, agent 는
자기 등재부의 상수 URL 을 Windows 기본 https handler 에 넘길 뿐이다.

---

## 1. 기존 구현 census (§6·§7)

`origin/main` 기준으로 저장소 전체를 조사했다.

| 조사 대상 | 결과 |
|---|---|
| URL 열기 · 브라우저 실행 · `Start-Process` · `ShellExecute` · `open`/`xdg-open` | **0건** (창 제어 V0 스펙이 `Start-Process` 부재를 잠그고 있었다) |
| 브라우저 제어 · CDP · puppeteer · playwright (런타임 코드) | **0건** — playwright 는 e2e 테스트 devDependency 로만 존재 |
| 탭 열거 · 브라우저 프로필 · cookie · localStorage 접근 | **0건** |
| Local Work Agent 의 `child_process` 사용처 | `windows-window-control.mjs` **1곳** (`execFile` · `-File` 만) |
| 재사용 가능한 구현 | 창 census / 창 활성화 (`windows-window-census.ps1` · `windows-window-activate.ps1`) — 이번에 그대로 재사용 |

## 2. 기술 선택 (§14·§15·§16·§35)

| 선택지 | 판단 |
|---|---|
| **OS 기본 URL handler** (`Start-Process -FilePath $url`) | **채택.** 사용자가 정한 기본 브라우저가 열고, 그 브라우저의 **기존 프로필 · 세션**이 그대로 쓰인다(§16). 실행 파일 · 인자 · 플래그를 지정하지 않으므로 "임의 프로세스 실행" 이 되지 않는다 |
| 브라우저 실행 파일 직접 실행 (`chrome.exe --new-tab url`) | 기각 — 실행 파일 경로 · 인자 조립이 생기고, 등재 밖 브라우저 · 다른 프로필로 새는 길이 된다 |
| remote debugging / CDP / 자동화 드라이버 | 기각 (§35) — 세션 · cookie 접근 수단이 되므로 V0 금지선 |
| 탭 열거 | **미구현** (§13) — `siteKnownOpen` 은 항상 `null`. 추측으로 `true` 를 만들지 않는다 |

## 3. Site Registry (§8·§9·§10·§11)

| 항목 | 값 |
|---|---|
| 서버 등재부 | `apps/api-server/src/services/local-agent/browser-site-registry.ts` — `siteId` · `displayName` · `url` · `allowedOrigins` |
| agent 등재부 | `tools/o4o-local-agent/src/browser-site-registry.mjs` — 같은 항목 |
| 등재 사이트 | `o4o.neture` = `O4O 홈` = `https://neture.co.kr/` **1건** |
| 형식 검사 | 서버 등재부는 로드 시 `https://` 가 아니면 throw (`assertHttps`) |
| 정합 | 두 등재부는 **의도적 중복**이며, 테스트 6 이 siteId · displayName · url 을 텍스트로 대조한다 |
| DB 화 | 하지 않았다 (코드 상수) |

프로토콜이 나르는 것은 `siteId` 뿐이다. `action` 문자열이 `local.browser.open_site#o4o.neture`
형태로 대상을 품고(`composeSiteAction`), allowlist 는 `2 × 등재 사이트 수` 로 **미리 전개된
유한 집합**이다. URL · origin · 경로 · query 는 어느 필드에도 실리지 않는다.

## 4. `local.browser.get_site_status` (§13)

| 항목 | 값 |
|---|---|
| 하는 일 | 창 census → 등재 브라우저(Chrome/Edge) process 가 창을 갖고 있는가 |
| 되돌리는 것 | `siteId` · `displayName` · `browserRunning` · `browserType` · `siteKnownOpen: null` |
| 되돌리지 않는 것 | 창 제목 · URL · 탭 목록 · 프로필 경로 (`pickSafeBrowserInfo` 화이트리스트 밖) |
| `siteKnownOpen` | **항상 `null`** — 서버 화이트리스트는 이 필드를 `null` 로만 통과시키고 `true`/`false` 는 버린다 |

## 5. `local.browser.open_site` (§14·§21·§23·§25·§27)

```text
siteId → agent 등재부(상수 URL) → https 정규식 재검사(JS · PS 이중)
  → windows-browser-open.ps1 : $env:O4O_SITE_URL 하나만 입력
  → Start-Process -FilePath $url  (실행 파일 · -ArgumentList · -Verb 없음)
  → Windows https UrlAssociation ProgId 를 읽어 실제 handler 브라우저 판정
  → census → handler 브라우저 창이 정확히 1개면 foreground
```

반환: `opened` · `browserRunning` · `browserType` · `browserWasRunning` · `activated` (전부 boolean/enum).

`browserType` 은 **URL 을 실제로 받은 브라우저** 기준이다. Chrome 과 Edge 가 함께 떠 있고
handler 가 Edge 면 `edge` 를 답한다 (로컬 smoke 에서 이 불일치를 발견해 바로잡았다 — §11).

## 6. 기존 세션 재사용 · 창 활성화 (§16·§21·§22·§23)

| 상황 | 동작 |
|---|---|
| handler 브라우저 미실행 | 새로 실행되어 사이트가 열린다. 1.5 s 대기 후 census |
| handler 브라우저 실행 중 | **그 세션에 새 탭**으로 열린다(§23 허용). 새 프로필 · 새 세션을 만들지 않는다 |
| handler 브라우저 창 1개 | 창 제어 V0 의 `activateWindowHandle` 재사용 → foreground |
| handler 브라우저 창 2개 이상 | 고르지 않는다(`activated:false`). OS handler 가 이미 새 탭 쪽을 앞으로 보낸다 |
| 이미 로그인된 세션 | 그대로 쓰인다 — O4O 는 세션 · cookie 를 읽지도 만들지도 않는다 |

## 7. 로그인 사용자 직접 흐름 · 완료 신호 (§5·§6·§17·§18·§19·§41·§42)

| 항목 | 값 |
|---|---|
| "로그인해 줘" 요청 | `asksForLogin` → **열기까지만** (`browser.open_site`). 로그인 tool 은 존재하지 않는다 |
| 프롬프트 | `browserAction` fact 가 있으면 "로그인은 절대 대신하지 않습니다 … 아이디·비밀번호를 말하더라도 사용하지 마세요" 를 세운다 |
| 응답 | `data.browserSiteOpened = { siteId, displayName }` — 실제로 `opened:true` 일 때만 |
| 화면 | `O4OHomePage` 가 그때만 "`{displayName}` 사이트를 열었습니다 … `[로그인 완료]`" 를 띄운다 |
| `[로그인 완료]` | **React state 뿐.** localStorage · sessionStorage · 서버 어디에도 쓰지 않는다. 새 요청이 시작되면 사라진다 |
| 로그인 여부 판정 | 하지 않는다 — 버튼은 사용자의 명시적 신호이지 O4O 의 판정이 아니다 |

## 8. 보안 경계 (§26·§27·§33·§34·§35·§44·§45·§46)

| 금지 항목 | 코드 상태 | 잠근 테스트 |
|---|---|---|
| 임의 URL | 프로토콜 · tool 인자(`{ siteId }` 만) · agent 어디에도 URL 칸 없음 | browser-control 1·4·5 / runtime allowlist "no `http`" |
| `javascript:` · `file:` · `data:` · custom scheme | siteId 로 표현 불가 + https 정규식 이중 검사 | browser-control 5 · 13 |
| password 저장 · 자동 입력 | 그런 tool · 필드 · 코드 없음 | browser-control 11 |
| cookie · localStorage · 저장 비밀번호 · 프로필 경로 · DPAPI | agent 4개 파일에 관련 문자열 0 (`-NoProfile` 은 보안 플래그로 허용) | browser-control 12 |
| session token 수집 · cloud 복사 | `pickSafeBrowserInfo` 가 `cookies` · `sessionToken` · `url` · `tabs` · `username` 을 버린다 | browser-control 12 |
| 임의 프로세스 실행 · shell | `Start-Process` 는 `windows-browser-open.ps1` **1회, `-FilePath $raw`** 만. `.exe` · `-ArgumentList` · `-Verb` · `chrome` · `msedge` 문자열 없음 | browser-control 13·14 / window-control 11·14 |
| remote debugging · DevTools · CDP | 문자열 0 | browser-control 12 |
| registry 쓰기 | handler 판정은 `UrlAssociations\https\UserChoice` **읽기 1회**. `Set-ItemProperty` · `New-Item` · `HKLM` 없음 | browser-control 13 |
| 실패 원문 노출 | agent 는 `BROWSER_OPEN_FAILED` 등 코드만 보내고, 서버는 `stack` · `profile` 등을 버린다 | browser-control 8 |
| WorkScope 위조 | 클라이언트 scope 로는 브라우저 capability 가 열리지 않는다 | browser-control 18 |

`AiCapability` 는 여전히 서버 파생 사실(세션 · membership · device 연결)의 투영이고, 브라우저
capability 는 `localAgentStatus === 'connected' && localDeviceId` 일 때만 붙는다(§30).

## 9. Tool · capability · 라우팅 (§28·§29·§30·§31·§32)

| 항목 | 값 |
|---|---|
| capability | `READ_ONLY_LOCAL_BROWSER_INSPECT` · `LOCAL_BROWSER_OPEN` |
| tool | `browser.get_site_status` (readOnly) · `browser.open_site` (`effect: 'BROWSER_SITE_OPEN'`) — 둘 다 `executionMode: 'local'` |
| 인자 | `argumentSchema: 'siteId'` — `{ siteId }` 정확히 하나, 등재된 값만 |
| 의도 인식 | `SITE_INTENT_KEYWORDS` (`네뚜레` · `O4O홈` · `neture` · `o4o home`) — 한글은 `\uXXXX` 이스케이프 문자열(§13-7 esbuild 교훈) |
| 열기 의도 | `열어` · `접속` · `이동` · `띄워` · `켜` · `로그인` / `open` · `go to` … → `open_site`, 그 외 → `get_site_status` |
| 축 충돌 | 사이트 축 + 앱 축이 한 요청에 같이 오면 tool 을 고르지 않는다(null) |
| 'browser' executionMode | **여전히 0** — 이번 tool 은 Local Agent 경유이므로 `'local'` 이다. in-browser executor 는 예약 상태 그대로 |
| 요청당 tool | 최대 1 (agent loop 없음) |

## 10. 자동 테스트 (§48·§49·§50)

| 스위트 | 건수 | 결과 |
|---|---|---|
| `browser-control.spec.ts` (신설, §49 1~18 + 2건) | 19 | PASS |
| `windows-app-window-control.spec.ts` (Start-Process 예외 · ps1 3개 반영) | 회귀 갱신 | PASS |
| `local-agent-runtime.spec.ts` (allowlist 에 site action · URL 부재) | 회귀 갱신 | PASS |
| `ai-capability-tool-routing.spec.ts` (non-readOnly = activate_window · open_site) | 회귀 갱신 | PASS |
| `local-agent-oneclick-pairing.spec.ts` · `ai-multi-provider-runtime.spec.ts` · `home-chat-ai-input.spec.ts` | 회귀 | PASS |
| **api-server jest 합계 (위 7 스위트)** | **195** | **PASS** |
| web-neture vitest (`--config services/web-neture/vitest.config.mjs`) | 12 | PASS |
| `tsc --noEmit` (api-server) | WO 파일 오류 0 · 저장소 baseline 61 (무관, 변동 없음) | PASS |
| `tsc --noEmit` (web-neture) | 0 | PASS |
| eslint (변경 파일 11) | 0 | PASS |
| CI (`3eb8d7f3a`) | CI Pipeline · CodeQL · Deploy API · Deploy Web 전부 success | PASS |

## 11. Windows local smoke (§38)

이 PC(Windows 10 Pro · Node 22 · Chrome + Edge 설치 · https 기본 handler = Edge)에서
agent handler(`runAction`)를 서버 없이 직접 호출했다 — 폴러가 부르는 것과 같은 코드 경로다.

| 단계 | 내용 | 결과 |
|---|---|---|
| E | 미등재 siteId (`evil.example`) | `denied` · `BROWSER_SITE_NOT_REGISTERED` · 0 ms (PowerShell 미기동) — **PASS** |
| E' | siteId 자리에 URL (`https://example.com`) | `denied` · `BROWSER_SITE_NOT_REGISTERED` — **PASS** (URL 은 siteId 가 되지 못한다) |
| — | `get_site_status#o4o.neture` | `success` · `browserRunning:true` · `browserType:'chrome'` · `siteKnownOpen:null` — **PASS** |
| B | Edge 창이 있는 상태에서 `open_site#o4o.neture` | `opened:true` · `browserWasRunning:true` · `browserType:'edge'` — Edge 기존 세션에 새 탭으로 열림 (Chrome 프로세스 수 불변) — **PASS** |
| A | Edge 창을 닫고(startup-boost 백그라운드만 남김) `open_site` | `opened:true` · `browserWasRunning:false` · `browserRunning:true` · `browserType:'edge'` — Edge 새 창에 `O4O` 탭 — **PASS** |
| C / D | 이미 로그인 / 로그아웃 상태 | agent 쪽 동작은 A·B 와 동일(세션을 읽지 않으므로 구분하지 않는다). 사용자 흐름은 §12 production UX smoke 에서 확인 |

### 11-1. 이 smoke 에서 잡아 고친 것

첫 실측에서 `browserType:'chrome'` 이 돌아왔는데 실제로 사이트를 연 것은 Edge 였다
(`detectRunningBrowser` 가 등재 순서대로 "떠 있는 첫 브라우저" 를 답했다). 창 활성화도
같은 이유로 **URL 을 받지 않은** 브라우저 창을 대상으로 삼을 수 있었다.

수정: opener 스크립트가 Windows https UrlAssociation 의 ProgId(읽기 전용)를 함께 돌려주고,
`browserTypeFromProgId` 로 `ChromeHTML`→`chrome` · `MSEdgeHTM`→`edge` 를 옮긴다. 이후
"떠 있었는가 · 어떤 브라우저인가 · 어느 창을 앞으로" 는 전부 이 handler 브라우저 기준이다.
회귀 잠금: browser-control 13 (`Get-ItemProperty` 1회 · `UserChoice` 경로 · 쓰기 cmdlet 0).

`activated` 는 로컬 smoke 에서 `false` 였다 — 호출 프로세스(터미널)가 foreground 가 아닐 때
Windows 가 `SetForegroundWindow` 를 거부하는 기존 제약(창 제어 V0 §14-3)이며, OS handler 자체가
새 탭/새 창을 앞으로 보내므로 사용자 체감에는 영향이 없었다.

## 12. Production smoke (§39) · 사용자 UX smoke (§40)

mock/local API 로 닫지 않았다. 실제 브라우저(Playwright Chromium, headed)에서 `neture.co.kr` 에
로그인하고, 프로덕션 API 를 거쳐 이 PC 의 Local Work Agent 까지 왕복시켜 **Edge 에 실제로
사이트가 열리는 것**을 창 census 로 확인했다.

### 12-0. 배포

| 항목 | 값 |
|---|---|
| commit | `3eb8d7f3a` (origin/main) |
| CI Pipeline · CodeQL | success |
| Deploy API Server | success → `o4o-core-api-03599-g5r` (traffic 100 %) |
| Deploy Web Services | success (web-neture) |

### 12-1. 왕복 경로 (§39)

```text
neture.co.kr (실브라우저 · 로그인 · /mypage/settings [이 PC 연결] → 이 PC 연결됨)
  → https://api.neture.co.kr/api/ai/home-chat
  → Tool Router (WorkScope 재검증 · LOCAL_BROWSER_* capability · device 확정)
  → local_agent_commands (`local.browser.open_site#o4o.neture` — siteId 뿐)
  → Local Work Agent (outbound polling · 이 PC)
  → windows-browser-open.ps1 → Windows https handler (Edge)
  → Edge 기존 세션에 O4O 홈 탭
```

이 PC 는 이번이 첫 연결이라 One-click Pairing 부터 실측했다(`이 PC 연결됨` · agent 로그
`이 PC 가 연결되었습니다`). 로그인은 Neture 웹 폼이 L2 자격을 요구해(테스트 계정 L2 unknown)
`TEST-ACCOUNTS.local.md` §4-2 의 L1 채널로 세션을 만들었다 — Home 화면과 설정 화면은
role gate 가 없어 이 채널이 유효하다.

### 12-2. 사용자 UX smoke (§40) — 실측 답변

| 단계 | 질문 | tool / outcome | 서버 안전 로그 | 화면 |
|---|---|---|---|---|
| 1 | 네뚜레 열어줘 | `local.browser.open_site` / `allowed` | `siteId=o4o.neture` · `status=success` · `browserType=edge` | "새 창으로 네뚜레 사이트를 열었습니다. 로그인이 필요하면 사이트에서 직접 로그인해 주세요. … '[로그인 완료]' 버튼을 눌러주세요." + **`O4O 홈 사이트를 열었습니다` 블록 + `[로그인 완료]` 버튼** |
| 1' | `[로그인 완료]` 클릭 | — | — | "로그인 완료를 확인했습니다." · localStorage/sessionStorage 에 새 키 **0** (기존 auth 토큰 키 2개뿐) |
| 2 | 네뚜레 열려 있어? | `local.browser.get_site_status` / `allowed` | `status=success` · `browserType=chrome` | "크롬 브라우저는 실행 중입니다. 하지만 … 현재 열려 있는지는 제가 확인할 수 없습니다." (§13 추측 금지 그대로) |
| 3 | 네뚜레 로그인해줘 | `local.browser.open_site` / `allowed` | `status=success` · `browserType=edge` | "O4O 홈이 Edge 브라우저에 열려 있습니다. 저는 네뚜레에 직접 로그인할 수 없습니다. … 직접 로그인해 주세요." + `[로그인 완료]` 버튼 → 클릭 → 확인 문구 |
| 4 | 구글 열어줘 (미등재) | `tool: null` | 명령 발행 **0** | "저는 브라우저를 열거나 조작할 수 없습니다." |

- 응답 `data.browserSiteOpened` 는 1·3 에서만 `{ siteId:'o4o.neture', displayName:'O4O 홈' }`, 2·4 는 `null`.
- 창 census: 1·3 뒤 Edge 창 제목 `O4O — …` 확인(Edge 기존 세션 재사용, Chrome 프로세스 수 불변).
- 콘솔 에러 0 (4회 모두). API `severity>=ERROR` 로그 0.

### 12-3. 비용 · 로그 sanity (§40)

| 항목 | 값 |
|---|---|
| home-chat 요청 4회 → agent 명령 | **3건** (open · status · open). 미등재 사이트는 0. 재시도 폭주 없음 |
| 서버 로그 필드 | `tool` · `siteId` · `status` · `errorCode` · `browserType` · `deviceId` **뿐** — URL · 창 제목 · 탭 · 프로필 · 자격은 없다 |
| 요청당 tool | 1 (agent loop 없음) |

### 12-4. 이 smoke 에서 잡은 결함

프로덕션 왕복에서 새로 드러난 결함은 **없다.** 로컬 smoke 에서 잡은 handler 불일치(§11-1)가
배포본에 반영되어 있음을 1·3 의 `browserType=edge` 로 확인했다.

## 13. DB (§43)

| 항목 | 값 |
|---|---|
| DB migration | **0** |
| 신규 테이블 · 컬럼 | **0** |
| DB write | 기존 `local_agent_commands` envelope 범위 그대로. 새 write 경로 없음 |
| 저장하지 않는 것 | 사이트 계정 · 비밀번호 · cookie · session token · `[로그인 완료]` 신호 |

## 14. Known limitations

1. **탭을 열거하지 않는다.** "이미 열려 있는 탭으로 이동" 은 하지 않고, 브라우저가 떠 있으면
   같은 세션에 새 탭을 연다(§23 허용 범위). `siteKnownOpen` 은 항상 `null`.
2. **`get_site_status` 의 `browserType` 은 "떠 있는 등재 브라우저" 기준**이고, `open_site` 의
   `browserType` 은 "URL 을 실제로 받은 브라우저" 기준이다. 상태 조회는 handler 를 읽지 않으므로
   Chrome·Edge 가 함께 떠 있으면 상태는 `chrome`, 열기는 `edge` 로 답할 수 있다. 둘 다 사실이며,
   상태 문구는 "실행 중" 만 말하고 "이 브라우저로 열린다" 고 단정하지 않는다.
3. **등재 밖 브라우저(Firefox 등)가 기본 handler 면** 사이트는 열리지만 `browserType:null` ·
   `browserWasRunning:false` · `activated:false` 로 돌아온다. 창을 고르지 않는다.
4. **`activated`** 는 창 제어 V0 와 같은 foreground-lock 제약을 받는다. handler 브라우저 창이
   2개 이상이면 설계상 활성화하지 않는다.
5. **등재 사이트 1건.** 사이트를 늘리는 절차는 서버·agent 등재부 두 곳에 같은 항목을 넣고
   테스트 6 (정합) 을 통과시키는 것이다.
6. **PowerShell 기동 비용**(census 2회 + opener 1회 ≈ 2~6 s)이 응답 지연이 된다. 캐시 없음.

## 15. 후속 작업 (§53·§54)

1. 등재 사이트 확장 (실제 약국 업무 사이트) — 등재부 2곳 + local smoke 재실행.
2. `[로그인 완료]` 이후 업무 계속 흐름 (Computer Use V0 / Application Adapter V0).
3. 탭 인식이 필요해지면 별도 WO — 브라우저 확장 등 **cookie 에 손대지 않는** 경로로만.
