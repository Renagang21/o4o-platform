# CHECK — WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1

> **상태**: 구현·검증 완료 / **Windows local smoke A~E · production smoke PASS** (2026-09-10)
> **작성일**: 2026-09-10
> **선행 WO**: `WO-O4O-LOCAL-WORK-AGENT-V0` (Local Execution Runtime V0)

사용자가 숫자 코드를 옮겨 적던 자리를 버튼 하나로 바꿨다. 바뀐 것은 **연결하는 방법**
하나이고, V0 의 실행 런타임(device identity / agent auth / heartbeat / command envelope /
tool routing / allowlist)은 한 줄도 건드리지 않았다 (§20).

---

## 1. 기존 pairing 구조 조사 결과 (§25-1)

V0 의 연결 방식은 이랬다.

```text
사용자 → 웹에서 pairing code 발급 (5분 · 1회용 · 10자)
      → 사용자가 그 코드를 눈으로 읽어 Local Agent CLI 에 옮겨 적음 (`--code`)
      → agent 가 POST /api/local-agent/register 로 코드 제출 → device 등록
```

조사에서 확인한 사실 두 가지가 이번 작업의 범위를 결정했다.

| 항목 | 조사 결과 |
|---|---|
| **frontend 소비처** | `grep -rn "local-agent" services packages` → **0건**. 코드를 입력받는 화면이 애초에 없었다 |
| **DB 구조** | `local_agent_pairings` = `(id, user_id, code_hash, expires_at, consumed_at, created_at)` |

즉 **사용자-facing pairing code UI 는 구현된 적이 없다.** 코드 발급/소비 경로는 CLI 와
테스트만 쓰던 상태였고, 그래서 이번 전환에서 제거해도 깨질 소비처가 없다 (아래 §5).

---

## 2. one-click pairing 설계 (§25-2)

```text
브라우저(이미 O4O 로그인)
  │  [ 이 PC 연결 ]
  ├─(1) GET http://127.0.0.1:47821/health          → agent 생존 확인 + nonce 수령
  ├─(2) POST /api/local-agent/pairing-grants       → 단명 승인권 발급 (세션 인증)
  ├─(3) POST http://127.0.0.1:47821/pair           → { grant, nonce } 전달
  │                                     agent ─(4) POST /api/local-agent/pair
  │                                                 { grant, platform, agentVersion, ... }
  └─(5) "이 PC 연결됨"                              ← (4) 의 성공 응답
```

**설계의 핵심은 "같은 PC 라는 사실을 무엇으로 증명하는가" 다.** V0 은 사람이 코드를
옮겨 적는 행위로 증명했다. 이제는 **브라우저가 loopback 에 도달할 수 있다는 사실
자체**가 증명이다 — 127.0.0.1 은 그 기계 밖에서 닿지 않으므로, 도달했다는 것이
곧 같은 기계라는 뜻이다. 사용자가 대신 증명해 줄 일이 없어진다.

승인권은 (2)→(3) 구간에서 브라우저를 **그냥 통과**한다. 브라우저는 그 값을 저장하지도,
화면에 보여주지도 않는다.

### 사용자 화면 (§5·§14)

`services/web-neture/src/pages/mypage/MySettingsPage.tsx` 에 카드 하나를 얹었다.
별도 설정 화면을 만들지 않았다.

| 상태 | 표시 |
|---|---|
| agent 미실행 | "Local Work Agent 가 실행되고 있지 않습니다. 먼저 Local Work Agent 를 실행해 주세요." |
| 연결 가능 | `[ 이 PC 연결 ]` 버튼 |
| 연결 진행 중 | "Local Agent 연결 중..." |
| 연결됨 | "이 PC 연결됨" |
| 오프라인 | "Local Agent 오프라인 — 연결된 PC 가 있지만 지금은 응답하지 않습니다." |

"미실행" 과 "오프라인" 을 나눈 이유는 사용자가 할 일이 다르기 때문이다. 전자는 agent 를
실행해야 하고, 후자는 **이미 연결된 PC 가 있는데 지금 꺼져 있다**는 뜻이다. 이 구분은
서버에 등록된 device 목록(`GET /api/local-agent/devices`)으로 판정한다.

자동 설치는 하지 않는다 (§14).

---

## 3. localhost / origin 보안 (§25-3 · §12·§13)

`tools/o4o-local-agent/src/local-server.mjs` — **소켓 하나, endpoint 둘.**

| endpoint | 용도 |
|---|---|
| `GET /health` | 생존 확인 + 1회용 nonce 발급 |
| `POST /pair` | 승인권 수령 |

그 외 경로는 전부 404 다. **명령 실행 · 파일 접근 · 상태 변경 endpoint 를 브라우저에
노출하지 않는다 (§11).** 테스트가 `/run` `/command` `/exec` `/devices` 를 실제로 두드려
404 를 확인한다.

### 방어 5겹

| # | 방어 | 구현 |
|---|---|---|
| 1 | **loopback bind** | `server.listen(47821, '127.0.0.1')`. `0.0.0.0` 아님 → LAN·공인 IP·포트포워딩 불가. 커널이 외부 패킷을 이 소켓에 전달하지 않는다 |
| 2 | **Origin 허용목록** | wildcard 없음. 목록 밖 출처는 **preflight(403)에서 끝난다** → 브라우저가 본 요청을 보내지 않는다 |
| 3 | **1회용 nonce** | `/health` 로 받은 값이 있어야 `/pair` 성립. TTL 60초, 소비 즉시 소멸, 메모리 전용 |
| 4 | **JSON 강제** | `Content-Type: application/json` 아니면 415 → 단순요청(form post)으로 도달 불가 → CSRF-like 남용 차단 |
| 5 | **쿠키 수령 불가** | `Access-Control-Allow-Credentials` 를 **일부러 주지 않는다** → 브라우저가 이 요청에 O4O 쿠키를 실을 방법 자체가 없다 |

허용 Origin (§13) — canonical O4O 도메인만, 전부 `https://`:

```text
neture.co.kr · pharmacyhub.co.kr · kpa-society.co.kr · k-cosmetics.site  (+ www)
```

Chrome 의 Private Network Access 를 위해, **허용된 origin 의 preflight 에 한해**
`Access-Control-Allow-Private-Network: true` 를 준다. 허용되지 않은 origin 은 이 헤더에
도달하기 전에 403 으로 끝난다.

---

## 4. grant / auth 방식 (§25-4·§25-6 · §7·§8·§17)

| 항목 | 값 | 근거 |
|---|---|---|
| 형태 | `crypto.randomBytes(32)` hex (64자) | §7 cryptographically random |
| 유효시간 | **2분** | §7 "1~5분". 사람이 개입하지 않아 왕복이 1초 안에 끝난다 — V0 의 5분은 사람이 코드를 옮겨 적는 시간이었다 |
| 1회용 | `consumed_at IS NULL` 조건부 UPDATE ... RETURNING | §7 single-use |
| user-scoped | 소유자는 **grant row 의 user_id 에서 파생**. agent 가 본문으로 사용자를 지목할 입력 자체가 없다 | §7 · V0 §14 |
| 저장 | **SHA-256 해시만.** raw token 저장 0 | §23 |
| 중복 발급 | 같은 사용자의 기존 미사용 grant 는 발급 시점에 무효화 → 살아 있는 grant 최대 1개 | — |

**grant 에 실리지 않는 것 (§8)**: password / refresh token / session cookie / 외부 사이트
자격증명 / 민감 데이터. 실리는 것은 난수 문자열 하나뿐이다.

**agent credential 은 V0 구조 그대로다 (§17·§20).** 연결 성공 시 발급되는 것은 기기 전용
credential 이고, 서버에는 해시만 남는다. browser session cookie · user JWT · service
credential 재사용 경로는 없다.

### purpose 필드를 두지 않은 이유 (§7)

`local_agent_pairings` 는 이제 **pairing grant 만** 담는다. 수동 코드가 사라져
한 테이블에 두 종류의 토큰이 섞일 일이 없어졌으므로, `purpose` 컬럼은 항상 같은 값을
갖는 컬럼이 된다. 구분할 것이 하나뿐일 때 구분자를 두면 검증되지 않는 필드가 하나
늘어날 뿐이다. **테이블 자체가 purpose 다.**

---

## 5. 기존 pairing code 처리 (§25-7 · §19)

**전량 제거했다. fallback 으로 보존하지 않았다.**

| 제거 대상 | 위치 |
|---|---|
| `PAIRING_ALPHABET` · `newPairingCode()` | `local-agent-service.ts` |
| `createPairingCode()` · `consumePairingAndRegisterDevice()` | `local-agent-service.ts` |
| `POST /api/local-agent/register` | `local-agent.routes.ts` |
| `--code` CLI 인자 · `commandPair()` · `parseArgs()` | `tools/o4o-local-agent/src/index.mjs` |

보존하지 않은 근거는 §1 의 조사 결과다 — **소비처가 0 이었다.** 테스트는 이미
one-click 경로를 실제로 통과시키므로, 수동 코드를 "test/debug fallback" 으로 남길
이유가 없다. 남겨두면 사용자-facing 이 아닌 두 번째 연결 경로가 계속 존재하게 되고,
그것이 §26 의 `MANUAL CODE ENTRY = 0` 과 충돌한다.

CLI 는 이제 `run` 하나만 받는다.

---

## 6. DB migration / write (§25-11 · §23)

**migration 0건. schema 변경 0건.**

`local_agent_pairings` 의 기존 컬럼이 §23 이 요구하는 형태와 이미 일치한다.

| §23 요구 | 기존 컬럼 |
|---|---|
| token hash | `code_hash varchar(64) UNIQUE` |
| userId | `user_id uuid` |
| expiresAt | `expires_at timestamptz` |
| usedAt | `consumed_at timestamptz` |

컬럼 이름이 `code_hash` 로 남아 있는 것은 의도적이다. rename migration 은 프로덕션
테이블에 잠금을 걸면서 저장하는 값의 성격은 전혀 바꾸지 않는다 — 담기는 값은 전과
같이 "단명 1회용 토큰의 SHA-256" 이다. 이름이 낡은 것과 구조가 틀린 것은 다르다.

**저장하지 않는 것**: raw grant / raw credential / cookie / 사용자 식별 hardware 정보.

---

## 7. 보안 경계 검증 (§25-12 · §26)

| §26 완료 기준 | 결과 | 확인 방법 |
|---|:---:|---|
| ONE-CLICK PAIRING | PASS | 실제 loopback 서버 기동 → health → pair 왕복 테스트 |
| MANUAL CODE ENTRY = 0 | PASS | 코드 발급/소비 함수·route·CLI 인자 전량 제거 + UI 입력 필드 부재 단언 |
| LOCALHOST LOOPBACK ONLY | PASS | `listen(...)` 호출 1개 · bind `127.0.0.1` · `0.0.0.0` 부재 |
| ORIGIN VALIDATION | PASS | 허용 밖 origin → preflight 403 / 본 요청 403 / Origin 없음 403 (실 HTTP) |
| ONE-TIME GRANT | PASS | 재사용 → `INVALID_PAIRING_GRANT`, 동시 2건 중 1건만 성공 |
| REPLAY PROTECTION | PASS | grant replay + nonce replay 양쪽 |
| DEVICE BINDING | PASS | device 소유자 = grant 발급자. agent 주장 무시 |
| AGENT AUTH | PASS | 발급 credential 로 세션 개시 성공 · 서버에는 해시만 |
| LOCAL TOOL ROUNDTRIP | PASS | V0 runtime spec (`local.get_agent_status` / `local.get_system_info`) |
| PASSWORD STORAGE = 0 | PASS | grant 는 난수 1개. 저장은 해시만 |
| BROWSER COOKIE TRANSFER = 0 | PASS | 클라이언트 `credentials: 'omit'` ×2 + 서버 `Allow-Credentials` 부재(실 응답 헤더 확인) |
| WINDOWS SMOKE A~E | **PASS** | 아래 §9 — 2026-09-10 프로덕션 실측 |

### V0 §47 보안 항목 재확인

| 항목 | 상태 |
|---|---|
| no inbound PC port | **유지** — loopback 소켓은 외부에서 도달 불가. 포트포워딩·공인 IP·방화벽 인바운드 규칙 어느 것도 필요 없다 |
| no arbitrary shell | 유지 — `local-server.mjs` 에 `child_process` · `spawn` · `exec` · `eval` 없음 |
| no arbitrary file access | 유지 — `node:fs` import 없음 |
| no browser control | 유지 |
| no patient data | 유지 — `/health` 응답 필드는 `ok · agentVersion · connected · nonce` 4개뿐 |
| no credential reuse | 유지 |
| no client capability trust | 유지 — `claimedDeviceId` 는 **주장이 아니라 credential 증명**이고, 증명 실패 시 주장을 버리고 새 device 로 취급 |
| no AI direct agent access | 유지 |

### §27 중단 조건 판정 — **해당 없음**

가장 판단이 필요했던 항목은 **"localhost 통신이 현재 보안 정책과 충돌하는가"** 였다.

V0 §16 이 금지한 것은 `cloud → 사용자의 PC 에 inbound port 직접 접근` 과 포트포워딩 ·
공인 IP 다. **이번 loopback 소켓은 그 어느 것도 아니다.** cloud 는 이 포트에 도달할 수
없고(커널이 외부 패킷을 loopback 소켓에 전달하지 않는다), 도달하게 만들 설정도 하지
않는다. 접근 주체는 **같은 기계 안의 브라우저**뿐이다. 그리고 이 구조는 본 WO 의
§4·§11 이 명시적으로 지시한 것이다.

나머지 중단 조건도 전부 미해당: browser cookie 전달 불필요 / public inbound port 불필요 /
별도 login·identity system 불필요 / 기존 agent auth 구조 전면 재설계 불필요 (V0 구조 유지).

---

## 8. 테스트 (§25-8 · §21)

`node ../../node_modules/jest/bin/jest.js src/__tests__/local-agent`
→ **2 suites / 74 tests PASS**

| §21 항목 | 위치 |
|---|---|
| 1. authenticated browser grant 발급 | `local-agent-oneclick-pairing.spec.ts` — 형식·TTL·해시 저장 |
| 2. unauthenticated grant 발급 차단 | 동 spec — `/pairing-grants` 의 `authenticate` 미들웨어 단언 |
| 3. localhost pair success | 동 spec — **실제 서버 기동 후 실 HTTP** |
| 4. expired grant reject | 동 spec |
| 5. replay grant reject | 동 spec — 순차 replay + 동시 2건 |
| 6. wrong origin reject | 동 spec — preflight / 본 요청 / Origin 부재 (실 HTTP) |
| 7. already connected idempotent | 동 spec — duplicate device 0 · 기존 credential 유효 유지 |
| 8. different-user device conflict | 동 spec — `DEVICE_ALREADY_PAIRED` · grant 미소모 |
| 9. cookie/token leakage 0 | 동 spec — 클라이언트 `credentials: 'omit'` · 서버 응답 헤더 |
| 10. agent credential 정상 발급 | 동 spec — 세션 개시 성공 + 평문 저장 0 |
| 11. `local.get_agent_status` | `local-agent-runtime.spec.ts` (V0) |
| 12. `local.get_system_info` | `local-agent-runtime.spec.ts` (V0) |
| 13. unknown action denied | `local-agent-runtime.spec.ts` (V0) |
| 14. agent offline detection | `local-agent-runtime.spec.ts` (V0) |

11~14 는 **연결 방식과 무관한 V0 계약**이라 V0 spec 이 그대로 담당한다. 같은 것을 두 번
검사해도 강도는 올라가지 않는다.

`3` 과 `6` 은 소스 문자열 단언으로 대신하지 않았다. origin 검사는 코드로는 한 줄이지만
그 한 줄이 "아무 웹사이트나 이 PC 를 자기 사용자에게 묶을 수 있는가" 를 가른다. 그래서
`node --input-type=module` 자식 프로세스로 실제 `local-server.mjs` 를 띄우고 HTTP 로
두드린다.

### 검증 결과

| 검증 | 결과 |
|---|---|
| jest (local-agent 2 suites) | **74 passed** |
| `tsc --noEmit` (api-server) | **PASS (0 errors)** |
| eslint (변경 TS 파일 전체) | **PASS (0 errors / 0 warnings)** |
| `node --check` (agent .mjs 2개) | **PASS** |
| `tsc --noEmit` (web-neture) | 기존 오류 38건 — **전부 미빌드 workspace 패키지(`@o4o/account-ui`·`@o4o/auth-utils`) dist 부재로 인한 신규 worktree 한정 현상.** 신규 파일 2개 관련 오류 **0건** |
| CI Pipeline | **PASS** — run `34432607227` (`893707e11`) success. 본 WO 의 3개 커밋(`fc68e567e`·`2b7590ca7`·`149234416`)이 모두 이 SHA 의 조상임을 `git merge-base --is-ancestor` 로 확인했다. 각 커밋의 개별 run(`34431141760`·`34431155710`)은 다른 세션의 연속 push 로 concurrency cancel 되어 자체 결과를 남기지 못했다. |

---

## 9. Windows local smoke A~E · production smoke — **PASS** (§25-9·§25-10 · §18·§22)

2026-09-10, 이 Windows 11 PC 에서 **배포된 프로덕션**(`neture.co.kr` · `api.neture.co.kr`)
을 상대로 실제 수행했다. 로컬 서버·mock 을 쓰지 않았다.

| 항목 | 결과 | 근거 |
|---|:---:|---|
| A. `[이 PC 연결]` 로 연결 (수동 code 입력 0) | **PASS** | 브라우저가 `POST /api/local-agent/pairing-grants` 200 → `POST http://127.0.0.1:47821/pair` 200. 카드가 "이 PC 연결됨" 으로 바뀌고 **pairing code 입력란 개수 = 0**. agent 로그 "이 PC 가 연결되었습니다" · `credentials.json`(124 B) 생성 |
| B. `local.get_agent_status` → success | **PASS** | `tool = local.get_agent_status` · `toolOutcome = allowed` · 답변 "스모크 테스트 PC (windows, agent 0.1.0)가 연결되어 있습니다" |
| C. `local.get_system_info` → safe fields only | **PASS** | `tool = local.get_system_info` · `allowed` · 답변은 OS 종류와 버전(`Windows 11 (10.0.26200)`)뿐. username · home path · IP · MAC · 설치 목록 · 환경변수 없음 (§21 금지 필드) |
| D. shell / file 요청 → 실행되지 않음 | **PASS** | "powershell 로 dir 실행" · "`C:\Users` 파일 목록" 두 요청 모두 `tool = local.get_agent_status` 로 떨어지고 AI 가 실행 불가를 답했다. **애초에 shell·file action 이 tool 목록에 없어 선택될 수 없다.** agent 로그에 실행 흔적 0 |
| E. Local Agent 종료 → server offline 감지 | **PASS** | agent 종료 04:30:19Z → 90초(`ONLINE_WINDOW_MS`) 경과 후 04:32:10Z 질의에 "Local Work Agent가 연결되어 있지 않습니다" |
| production smoke (neture.co.kr 로그인 → 연결) | **PASS** | 위 A~E 전부가 프로덕션 대상이다 |

### 9-1. 이 smoke 가 찾아낸 프로덕션 결함 (수정 완료)

A 를 통과한 직후 agent 로그에 `통신 실패(500)` 가 반복됐고, Cloud Run 로그에
`{"error": "Invalid time value", "message": "local-agent heartbeat failed"}` 가 남았다.

원인은 **TypeORM `query()` 가 `UPDATE … RETURNING` 에 대해 row 배열이 아니라
`[rows, affectedCount]` 를 돌려준다**는 점을 오독한 것이다. 영향 범위는 세 곳이었다.

| 위치 | 증상 |
|---|---|
| `claimPendingCommands` | 배열 원소가 row 가 아니어서 `new Date(undefined)` → heartbeat 500 |
| `claimGrant` | 0건도 `length === 2` 라 **동시 요청 단일 사용 가드가 풀린다** (§26 ONE-TIME GRANT) |
| `submitCommandResult` | 같은 이유로 `REPLAY_REJECTED` 가 동작하지 않는다 (§26 REPLAY PROTECTION) |

`returnedRows()` 헬퍼로 세 곳을 정정했다 (`307b09329`). 테스트 stub 이 평범한 배열을
돌려주고 있어 이 결함이 그대로 통과했으므로 stub 도 프로덕션과 같은 `[rows, count]` 로
맞추고 회귀 검사를 추가했다. **정정 전 서비스로 되돌리면 이 stub 에서 6건이 실패**하는
것을 확인했다. 수정 배포 후 재실행한 위 표의 B~E 에서 heartbeat 500 은 재현되지 않는다.

### 9-2. 별도로 기록해 둘 브라우저 제약 — Chrome Local Network Access

HTTPS 페이지에서 `fetch('http://127.0.0.1:47821/health')` 는 Chrome 의 **Local Network
Access 권한**에 걸린다. 권한이 없으면 응답도 CORS 오류도 없이 **조용히 멈춘다**
(`Access-Control-Allow-Private-Network: true` 만으로는 부족하다). 다음을 실측했다.

| 조건 | 결과 |
|---|---|
| 기본 Chrome | 요청이 응답 없이 멈춤 |
| `--disable-features=LocalNetworkAccessChecks,BlockInsecurePrivateNetworkRequests` | 200 |
| `grantPermissions(['local-network-access'])` (= 사용자가 팝업에서 [허용]) | 200 |
| `fetch(..., { targetAddressSpace: 'local' })` | `Failed to fetch` — 대안이 되지 못한다 |

**이때 화면은 §14 의 "Local Work Agent가 실행되고 있지 않습니다" 를 띄운다.** agent 는
실행 중인데 브라우저 권한이 막고 있는 상황이므로 **원인을 잘못 지목하는 안내**다.
사용자가 팝업에서 [허용] 을 누르면 정상 동작하므로 A~E 판정에는 영향이 없으나,
문구 개선은 **이번 WO 범위 밖**이라 별도 WO 로 분리해 보고한다.

---

## 10. 변경 파일 (§25-13)

**commit**: `fc68e567e` (구현·테스트·CHECK) / `2b7590ca7` (SHA 기록) / `e90314e5f` (CI 결과) / `307b09329` (smoke 가 찾은 RETURNING 결함 수정)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/services/local-agent/local-agent-service.ts` | 수정 — pairing code → grant. `createPairingGrant` / `redeemPairingGrant` 신설, 코드 생성기 제거 |
| `apps/api-server/src/routes/local-agent.routes.ts` | 수정 — `POST /pairing-grants` 신설(인증), `POST /register` → `POST /pair` |
| `apps/api-server/src/__tests__/local-agent-oneclick-pairing.spec.ts` | 신규 — §21-1~10 (24 tests) |
| `apps/api-server/src/__tests__/helpers/local-agent-db-stub.ts` | 신규 — 두 spec 이 공유하는 in-memory stub |
| `apps/api-server/src/__tests__/local-agent-runtime.spec.ts` | 수정 — stub 추출 + pairing describe 를 grant 기준으로 재작성 |
| `services/web-neture/src/api/localAgent.ts` | 신규 — probe / grant 발급 / localhost 전달 |
| `services/web-neture/src/components/mypage/LocalAgentCard.tsx` | 신규 — `[ 이 PC 연결 ]` 카드 |
| `services/web-neture/src/pages/mypage/MySettingsPage.tsx` | 수정 — 카드 배치 (3줄) |
| `tools/o4o-local-agent/src/local-server.mjs` | 신규 — loopback 승인 창구 |
| `tools/o4o-local-agent/src/index.mjs` | 수정 — `--code` 제거, loopback 서버 기동, 연결 대기 루프 |
| `tools/o4o-local-agent/README.md` | 수정 — 네트워크·연결 절차 갱신 |
| `apps/api-server/src/services/local-agent/local-agent-service.ts` | 수정(`307b09329`) — `returnedRows()` 로 `UPDATE … RETURNING` 결과를 3곳에서 바르게 읽는다 (§9-1) |
| `apps/api-server/src/__tests__/helpers/local-agent-db-stub.ts` | 수정(`307b09329`) — stub 이 프로덕션과 같은 `[rows, count]` 를 돌려준다 |
| `apps/api-server/src/__tests__/local-agent-oneclick-pairing.spec.ts` | 수정(`307b09329`) — 그 반환 형태에 대한 회귀 검사 추가 |

**§24 미수행 확인**: PC 프로그램 탐색 / 창 활성화 / browser site open / browser login
detection / Computer Use / mouse·keyboard 제어 / file access / shell 실행 / 약국 프로그램
연동 / 외부 ID·PW 저장 — **전부 손대지 않았다.**

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건
