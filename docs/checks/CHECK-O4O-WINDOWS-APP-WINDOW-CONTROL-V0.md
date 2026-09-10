# CHECK-O4O-WINDOWS-APP-WINDOW-CONTROL-V0

> **WO**: `WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0`
> **상태**: 검증 완료 — §41 완료 기준 전 항목 PASS (WO 종료 판단은 사용자 몫)
> **작성일**: 2026-09-10
> **선행**: `WO-O4O-LOCAL-WORK-AGENT-V0` · `WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1` · `WO-O4O-LOCAL-AGENT-LNA-UX-CLOSURE-V1` = 전부 CLOSED
> **commit**: `d55c8fca7` (코드·테스트·CI) · `ed5f51ac0` · `7dc483874` (프로덕션 smoke 결함 2건) · 본 문서

---

## 0. 한 줄 요약

O4O 가 하는 일은 **찾고 앞으로 가져오는 것 두 가지**다. 프로그램 설치·실행·로그인은
사용자가 한다. 그 경계를 코드에서 지키기 위해 이번 V0 가 실제로 한 일은
"할 수 있는 일을 늘린 것" 이 아니라 **할 수 있는 일의 목록을 유한하게 고정한 것**이다 —
전송 가능한 action 은 `2 + 2 x 등재 앱 수` 개의 문자열이 전부이고, 등재되지 않은
프로그램은 프로토콜 레벨에서 **표현할 수 없다**.

---

## 1. 기존 구현 census (§6)

`origin/main` 기준으로 아래 키워드를 저장소 전체에서 조사했다.

| 조사 대상 | 결과 |
|---|---|
| Windows API · process/window enumeration · `SetForegroundWindow` · `ShowWindow` · `GetWindowText` · `GetWindowThreadProcessId` | **0건** |
| Electron / native helper / node-ffi / native addon / windows automation 라이브러리 | **0건** (Local Agent 는 plain ESM · 런타임 의존성 0) |
| PowerShell helper | 저장소에 `.ps1` **0건** (`scripts/**` 는 전부 `.mjs` · `.ts`) |
| 재사용 가능한 창 관련 구현 | 없음 — 이번이 최초다 |
| 재사용한 기존 구조 | Local Agent 명령 배관(`commandId/action/args/issuedAt/expiresAt`) · 이중 allowlist · 출력 화이트리스트 · device auth · replay 보호 — **전부 그대로 사용**했고 새 protocol 을 만들지 않았다(§32·§33) |

## 2. 기술 선택 (§7)

| 후보 | 판단 |
|---|---|
| native Windows API binding (node-ffi / koffi) | **탈락** — `package.json`·lockfile 변경 = CLAUDE.md 중지 조건. 배포도 native 빌드에 묶인다 |
| 기존 npm/native 라이브러리 (node-window-manager 등) | **탈락** — 같은 이유 + 임의 창 조작 API 를 통째로 들여온다(경계가 라이브러리 쪽에 생긴다) |
| small native helper executable | **탈락** — 서명·배포·업데이트 경로가 새로 생긴다. V0 범위를 넘는다 |
| **PowerShell helper (§7 명시 후보)** | **채택** — Windows 기본 탑재, 추가 설치 0, Node 22 호환, 일반 사용자 권한으로 동작(admin 불필요) |

**채택의 대가와 그 상쇄.** 직전 WO 들의 방어는 "`child_process` 가 저장소에 아예 없다"
는 **부재에 의한 방어**였다. 이번에 그것을 한 칸 열었다. 대신 다음 5가지를 걸었고,
`windows-window-control.mjs` **한 파일만** 이 경계를 갖는다(테스트 13번이 고정한다).

1. `execFile` 만 사용 — `exec` · `spawn` · `shell: true` 없음 → **셸이 개입하지 않는다**
2. 실행 대상은 저장소에 체크인된 `.ps1` **2개**뿐 — `-Command` · `-EncodedCommand` 없이 `-File` 만
3. argv 는 상수 배열이 전부 — 호출자가 argv 에 값을 넣을 수 없다
4. 유일한 입력인 창 핸들은 환경변수로 넘기고, 넘기기 전에 **10진 정수인지 확인**한다
5. appId · 프로그램 이름 · 창 제목은 **프로세스 경계를 넘지 않는다** — 매칭은 전부 JS 안에서 하고, PowerShell 은 조건 없는 창 목록만 돌려준다

`.ps1` 두 개가 호출하는 non-read-only Win32 API 는 `ShowWindow(SW_RESTORE)` 와
`SetForegroundWindow` **둘뿐**이다. 자식 프로세스는 부모 환경을 상속하지 않는다
(`SystemRoot` · `windir` 만 전달).

## 3. App Identity Contract · Registry (§8·§9·§10·§11·§30·§31)

```ts
export interface WindowsAppDefinition {
  appId: string;              // canonical — AI·서버·agent 가 주고받는 유일한 식별자
  displayName: string;        // 사용자에게 읽어줘도 안전한 이름
  processNames: string[];     // agent 밖으로 나가지 않는다
  windowTitlePatterns?: string[];
}
```

- 등재부는 **코드 상수** 2벌(서버 `windows-app-registry.ts` · agent `windows-app-registry.mjs`).
  DB 테이블·migration·관리 화면을 만들지 않았다(§31·§38).
- V0 등재는 **테스트 앱 2개**: `windows.notepad`(메모장) · `windows.calculator`(계산기) (§11).
  실제 약국 프로그램은 넣지 않았다. 다음 단계 등재는 **이 배열에 항목 추가**로 끝난다(§30).
- 등재되지 않은 appId → `WINDOWS_APP_NOT_REGISTERED` (서버·agent 양쪽에서).
- AI 가 processName / exe path / window handle 을 지정하는 경로는 **없다**(§9).
  `windowsAppDisplayName()` 은 미등재 값이 들어와도 원문을 되돌리지 않는다 — 모델이
  만들어낸 문자열이 그대로 화면에 찍히는 경로를 만들지 않기 위해서다.

## 4. `local.find_application` (§12)

입력은 `appId` 하나. 출력은 아래가 전부다.

```json
{ "found": true, "appId": "windows.notepad", "displayName": "메모장", "windowCount": 1, "state": "running" }
```

PID · HWND · 창 제목 · 실행 파일 경로는 응답에 없다. 미실행이면
`WINDOWS_APP_NOT_RUNNING` + `found:false, windowCount:0` 으로 끝난다(§14).

## 5. `local.activate_window` (§13·§18·§19)

`등재 앱 탐색 → visible top-level 창 선택 → minimized 면 restore → foreground`.
출력은 `{ activated, restored, state:'foreground' }`.
Windows 가 전환을 거부하면 예외 메시지를 밖으로 내보내지 않고
`WINDOW_ACTIVATION_FAILED` 로 정규화한다. hidden 창을 임의로 `show` 하지 않는다.
foreground 전환은 **한 요청당 최대 1회**다 — 호출부가 tool 을 1개만 고르고,
agent 는 창이 정확히 1개일 때만 전환하기 때문이다(§19).

## 6. 여러 창 정책 (§16·§17)

| 대상 창 수 | 처리 |
|---|---|
| 0 | `WINDOWS_APP_NOT_RUNNING` → "프로그램을 먼저 실행해 주세요" |
| 1 | 자동 선택 |
| 2 이상 | `WINDOWS_APP_WINDOW_AMBIGUOUS` — **임의로 고르지 않는다** |

창 선택 기준(§17): visible · top-level · 제목 있음 · 등재 process 이름 일치.
background helper / service process 는 census 단계에서 제외된다.

## 7. 보안 경계 (§20·§21·§25·§26·§27·§28·§39)

| 금지 항목 | 상태 | 근거 |
|---|---|---|
| 전체 process 목록 서버 전송 | **0** | 서버로 가는 것은 found / windowCount / state 뿐. 화이트리스트가 저장 시·프롬프트 직전 두 번 적용된다 |
| executable 경로 · 사용자 경로 · command line | **0** | agent 가 수집하지 않고, 수집해도 화이트리스트를 넘지 못한다 |
| 창 제목 · PID · HWND | **0** | 매칭에만 쓰이고 프로세스 경계를 넘지 않는다. production log 에도 없다(§39) |
| 임의 process 실행 (`start_process` / `launch_exe` / `exec` / `spawn` / shell / cmd) | **0** | 구현 자체가 없다. 테스트 11·13 이 소스에서 부재를 고정한다 |
| 프로그램 종료 (`Stop-Process` / `taskkill` / kill) | **0** | 코드에 없다 (테스트 12) |
| 키보드 · 마우스 제어 | **0** | 코드에 없다 (테스트) |
| 화면 캡처 · OCR · vision | **0** | 코드에 없다 (테스트) |
| 파일 접근 | **0** | agent 에서 `fs` 를 쓰는 파일은 여전히 `credentials.mjs` 하나(자기 자신의 credentials.json) |
| 브라우저 · URL · 탭 | **0** | 이번 범위 밖 → Browser Control V0 (§29) |

허용 부작용은 **이름으로 한정**했다: `ToolEffect = 'FOREGROUND_ACTIVATION'` 하나뿐이고,
read-only 가 아닌 tool 은 이 집합에 있는 effect 를 선언해야 실행 게이트를 통과한다.
이름이 없는 부작용은 등록할 수도 없다.

안전 로그(§39)에 남기는 것: `tool · appId · status · errorCode · windowCount · deviceId`.

## 8. Tool · capability · 라우팅 (§22·§23·§24)

- capability 2개 추가: `READ_ONLY_LOCAL_APP_INSPECT` · `LOCAL_WINDOW_ACTIVATE`
  (기존 naming convention 을 따랐다 — §22 의 `local.app.inspect` / `local.window.activate` 대응).
- 서버 경로는 그대로다: `AI → Tool Router → WorkScope 재검증 → capability 검증 → device 검증 → local action`.
- **appId 는 action 문자열 안에 실려 간다** — `local.find_application#windows.notepad`.
  `local_agent_commands` 에 args 컬럼이 없고 이번 WO 는 migration 0 이므로(§38),
  자유 인자 칸을 새로 만드는 대신 **appId 까지 포함한 완성 action 을 allowlist 로 열거**했다.
  전송 가능한 문자열은 `2 + 2 x 등재 앱 수` 의 유한 집합이고, 미등재 앱은 표현 불가능하다.
- agent 쪽 allowlist(`HANDLERS` / `APP_HANDLERS`)에도 동일하게 등재했다. unknown action 은
  계속 `DENIED_UNKNOWN_ACTION`, 미등재 appId 는 `WINDOWS_APP_NOT_REGISTERED`.

## 9. web-neture vitest CI 배선 (§5 선행 작업)

`.github/workflows/ci-pipeline.yml` 의 test job 에 step 1개를 추가했다.

```yaml
- name: Run tests (web-neture Vitest)
  run: npx vitest run --config services/web-neture/vitest.config.mjs
```

기존 `web-kpa-society` step 바로 다음이며 같은 방식·같은 러너다. DB·secret 불필요.
대규모 CI 리팩토링은 하지 않았다. 로컬 실행 결과 **12/12 PASS**.

## 10. 자동 테스트 (§34)

신규 `apps/api-server/src/__tests__/windows-app-window-control.spec.ts` — **24건 PASS**.
§34 가 요구한 20건을 모두 덮는다.

| # | 항목 | 결과 |
|---|---|---|
| 1 | registered app found | PASS |
| 2 | registered app not running | PASS |
| 3 | unknown app rejected | PASS |
| 4 | one visible window selected (실제 `matchWindows` 를 소스에서 로드해 검사) | PASS |
| 5 | multiple windows ambiguous | PASS |
| 6 | minimized window restore | PASS |
| 7 | foreground success | PASS |
| 8 | activation failure normalize | PASS |
| 9 | full process list leakage 0 | PASS |
| 10 | executable path leakage 0 | PASS |
| 11 | arbitrary process launch impossible | PASS |
| 12 | kill process impossible | PASS |
| 13 | shell impossible (`child_process` importer = 1 파일 · `.ps1` 2개 고정) | PASS |
| 14 | file access impossible | PASS |
| 15 | capability missing denied | PASS |
| 16 | unknown local action denied | PASS |
| 17 | command replay regression 0 | PASS |
| 18 | Local Agent auth regression 0 | PASS |
| 19 | pairing regression 0 | PASS |
| 20 | LNA UX regression 0 (CI step + spec 파일 존재) | PASS |

전체 검증:

- `jest local-agent ai-tool ai-capability windows-app home-chat --maxWorkers=1`
  → **247 suites / 4087 tests 전부 PASS** (프로덕션 결함 2건의 회귀 테스트 3건 포함)
  - 단, `local-agent-oneclick-pairing.spec.ts` 는 **loopback 포트 47821 을 고정으로 쓴다.**
    smoke 용 agent 가 떠 있는 채로 돌리면 이 suite 8건이 "local server 기동 실패" 로
    떨어진다. 포트를 비우고 단독 실행하면 25/25 PASS — 회귀가 아니라 환경 충돌이다.
- `tsc --noEmit` (api-server) → PASS
- `eslint` (변경 파일) → PASS
- `vitest` (web-neture) → 12/12 PASS

기존 테스트 2건을 이번 계약에 맞게 갱신했다.

- `local-agent-runtime.spec.ts` — 실패 결과의 `result_data` 를 남기지 않는다는 계약은
  유지하되 **창 대상 action 만 예외**로 두었다. "창이 3개라 확정할 수 없다"(§16) 는 개수
  자체가 사용자에게 전해야 할 답이고, 그 화이트리스트에는 개수·상태 말고 실릴 것이 없다.
- `ai-capability-tool-routing.spec.ts` — 고정 대상을 "registry 는 전부 read-only" 에서
  **"read-only 가 아니면 허용된 effect 를 선언해야 하고, 그런 tool 은 `local.activate_window`
  하나뿐"** 으로 옮겼다. 쓰기 tool 이 하나라도 늘면 이 테스트가 먼저 깨진다.

## 11. Windows local smoke (§35)

이 PC(Windows 11 · Node 22)에서 agent 를 직접 띄우고 실제 메모장으로 A~E 를 실행했다.

| 단계 | 내용 | 결과 |
|---|---|---|
| A | 테스트 앱 미실행 상태에서 find / activate | 둘 다 `WINDOWS_APP_NOT_RUNNING` · `found:false, windowCount:0` — **PASS** |
| A' | 미등재 앱(`windows.cmd`) 요청 | `denied` · `WINDOWS_APP_NOT_REGISTERED` — **PASS** |
| B | 사용자가 직접 메모장 실행 (agent 밖에서) | — |
| C | find | `success` · `found:true, windowCount:1, state:'running'` — **PASS** |
| D | 다른 창이 포커스인 상태에서 activate | `success` · `activated:true, restored:false, state:'foreground'` — **PASS** |
| E | 최소화 후 activate | `success` · `activated:true, restored:true, state:'foreground'` — **PASS** |

admin 권한은 필요하지 않았다(§42 중단 조건 해당 없음).

## 12. Production smoke (§36) · 사용자 UX smoke (§37)

mock/local API 로 닫지 않았다. 실제 브라우저에서 `neture.co.kr` 에 로그인하고,
프로덕션 API(`api.neture.co.kr`)를 거쳐 이 PC 의 Local Work Agent 까지 왕복시켰다.

### 12-1. 왕복 경로 (§36)

```text
neture.co.kr (실브라우저 · 로그인 · [이 PC 연결됨])
  → https://api.neture.co.kr/api/ai/home-chat
  → Tool Router (WorkScope 재검증 · capability · device 확정)
  → local_agent_commands (envelope)
  → Local Work Agent (outbound polling · 127.0.0.1 loopback)
  → Windows 메모장 창
```

### 12-2. 사용자 UX smoke (§37) — 실측 답변

| 단계 | 질문 | tool / outcome | 서버 안전 로그 | 화면 답변 |
|---|---|---|---|---|
| A | 메모장이 실행되고 있는지 확인해 줘 (미실행) | `local.find_application` / `allowed` | `failed` · `WINDOWS_APP_NOT_RUNNING` · `windowCount=0` | "메모장이 실행되고 있지 않습니다. 프로그램을 먼저 실행해 주세요. O4O는 프로그램을 대신 실행하지 않습니다." |
| B | (사용자가 직접 메모장 실행) | — | — | — |
| C | 메모장이 실행되고 있는지 확인해 줘 (§15 재확인) | `local.find_application` / `allowed` | `success` · `windowCount=1` | "네, 메모장이 실행 중입니다. (창 1개)" |
| D | 메모장 창을 앞으로 가져와 줘 | `local.activate_window` / `allowed` | `success` · `windowCount=1` | "메모장 창을 앞으로 가져왔습니다." |

§14 의 미실행 안내 문구, §15 의 재확인 흐름, §13 의 foreground 가 **프로덕션에서 그대로**
성립했다. 로그에 실린 필드는 §39 허용 범위(`appId` / `tool` / `status` / `errorCode` /
`windowCount` / `deviceId`)뿐이고, 창 제목 · 실행 경로 · process 목록은 어디에도 없다.

### 12-3. 이 smoke 에서 실제로 잡은 결함 2건

프로덕션에서만 드러난 결함이다. 둘 다 **로컬 테스트로는 잡히지 않는 자리**에 있었다.

| # | 증상 | 원인 | 수정 |
|---|---|---|---|
| 1 | 응답이 `tool: null` — 도구가 아예 고려되지 않음 | 라우트가 device 조회 여부를 `looksLikeLocalScopedRequest` 로 **따로** 판단했다. "메모장 열려 있어?" 에는 로컬 지시어("내 PC")가 없어 device 를 조회하지 않았고, 창 축 capability 가 빈 채로 라우터가 돌았다 | 판정을 라우터의 `needsLocalDeviceResolution` 하나로 모았다 (`ed5f51ac0`). 라우트가 다시 자기 손으로 판단하지 못하도록 raw-source spec 으로 고정 |
| 2 | 창을 **실제로 앞으로 가져왔는데** 답변은 "저는 어떤 작업도 실행할 수 없습니다" | home-chat 기본 프롬프트가 "어떤 작업도 실행하지 않습니다" 를 무조건 단언해, tool 결과가 붙어도 모델이 수행된 동작을 부인했다 | 수행한 동작을 프롬프트에 사실로 반영한다 — `windowsAppAction` 이 있으면 이번 요청에서 허용된 범위(확인 / 창 앞으로)만 명시하고 실행·종료·키보드·마우스·파일 접근 금지선은 그대로 세운다 (`7dc483874`) |

두 결함 모두 회귀 테스트를 함께 넣었다. 특히 1번은 "**라우트와 라우터가 같은 판정을
두 곳에서 따로 하면 조용히 어긋난다**" 는 형태라, 코드가 아니라 그 구조를 고정했다.

## 13. DB (§38)

| 항목 | 값 |
|---|---|
| DB migration | **0** |
| 신규 테이블 | **0** |
| 신규 컬럼 | **0** |
| DB write | 기존 `local_agent_commands` / device audit 범위 그대로. 새 write 경로 없음 |
| app registry 의 DB 화 | **하지 않았다** (코드 상수) |

## 14. Known limitations

1. **UWP 앱(계산기)은 등재만 되어 있고 실측되지 않았다.** Windows 11 의 계산기는 창 소유가
   `ApplicationFrameHost` 로 잡혀 `processNames: ['CalculatorApp', ...]` 매칭에 걸리지 않을 수
   있다. V0 의 실측 대상은 메모장이며, 계산기는 **등재 구조의 두 번째 항목**으로서만 의미가
   있다. UWP 대응이 필요해지면 `ApplicationFrameHost` 창의 실제 소유 프로세스를 되짚는
   별도 처리가 필요하다.
2. **같은 프로그램의 창이 2개 이상이면 아무 일도 하지 않는다**(설계대로). 사용자가 창을
   고르는 UX 는 이번 범위 밖이다.
3. **PowerShell 기동 비용**(회당 수백 ms)이 그대로 응답 지연이 된다. 캐시는 두지 않았다 —
   창 상태는 언제든 변하고, 틀린 캐시로 엉뚱한 창을 앞으로 보내는 편이 더 나쁘다.
4. **PowerShell 이 정책으로 차단된 환경은 미검증**이다. 그 경우 `POWERSHELL_FAILED` →
   `WINDOW_ACTIVATION_FAILED` 로 정규화되어 "실패했다" 로만 보인다.
5. **여러 대의 PC 가 연결된 경우**는 기존 device 해석 규칙(`AMBIGUOUS`)을 그대로 따른다.
   이번 WO 가 새로 정한 것은 없다.
6. **한글 프로그램 이름 인식은 등재 앱 2개에 대한 키워드 표**로만 동작한다. 표에 없는
   프로그램은 이름을 말해도 tool 이 선택되지 않는다(의도된 동작 — 모델이 만든 이름이
   appId 가 되는 경로를 만들지 않기 위해서다). 이 키워드는 2026-09-09 프로덕션 실측
   (한글 정규식이 번들 후 매칭 실패)에 따라 **정규식이 아니라 `\uXXXX` 이스케이프 문자열**로 둔다.

## 15. 후속 작업 (§43)

1. **Browser Control V0** — 사이트가 안 열려 있으면 O4O 가 열고, 로그인은 사용자가 직접 하고,
   이후 작업을 계속하는 흐름 (§29 가 이번 범위에서 뺀 축).
2. Computer Use V0 → Application Adapter V0 → 실제 업무 자동화.
3. 실제 약국 프로그램 등재 — `WINDOWS_APP_REGISTRY` 에 항목 추가 + Windows local smoke 재실행.
4. 창이 2개 이상일 때의 선택 UX (필요해질 때).
5. 연결 해제 / 기기 정리 UX — 직전 LNA WO 에서 device management 작업으로 미룬 항목.
