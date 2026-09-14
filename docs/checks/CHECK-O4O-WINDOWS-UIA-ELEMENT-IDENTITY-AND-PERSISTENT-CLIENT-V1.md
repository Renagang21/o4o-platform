# CHECK-O4O-WINDOWS-UIA-ELEMENT-IDENTITY-AND-PERSISTENT-CLIENT-V1

> **WO**: `WO-O4O-WINDOWS-UIA-ELEMENT-IDENTITY-AND-PERSISTENT-CLIENT-V1`
> **상태**: **CLOSED** — WinForms 요소가 관찰/동작 단계마다 별도 UIA 클라이언트로 와서 안정적으로 재사용되지 않던 한계(계측 창 WO §5-A 발견)를 **요소 동일성 계약 + 지속 UIA 클라이언트**로 해소. 필수 CLOSED 조건 5개(WinForms TextBox set_value · WinForms Button invoke · stale 감지/복구 · client 재기동 후 옛 ref 거부 · Safety V1 회귀)를 **실제 Windows 전체 스택 smoke 로 확인**(재현 3회). 특정 앱 어댑터가 아니라 WinForms/WPF/Win32 공통 실행 기반이다.
> **작성일**: 2026-09-14
> **선행**: Windows UI Automation V0(`3d6e738a6`) · Windows Automation Safety & Takeover V1(`f3403e60e`) · **UIA 계측 테스트 표면 V0**(`e87c7781b` · §5-A 에서 이 WO 를 후속으로 지목) · Automation Execution Layer Realignment V1(`e5d86d23a`)
> **commit**: `a181a3973`(코드/테스트) · 본 문서(별도 docs 커밋)

---

## 1. 목적 (WO §1)

Windows UIA 요소는 프로세스/호출마다 UIA 실행이 새로 일어나 **관찰(observe) 단계에서 잡은 요소를 동작(action) 단계에서 안정적으로 재식별·재사용할 수 없다.** 계측 창 WO(§5-A)가 실측으로 드러낸 벽이다: WinForms(.NET) 컨트롤은 UIA-MSAA 브리지가 패턴(Value·Invoke)을 **첫 UIA 클라이언트에만** 광고하고, action 마다 새로 뜨는 PowerShell 프로세스에는 패턴 없는 프록시로 온다 → `set_value`=NOT_EDITABLE, `invoke`=NOT_INVOKABLE.

이 WO 는 **요소 동일성 계약(element identity contract)** + **지속 UIA 클라이언트(persistent client)** 를 도입해 WinForms/WPF/Win32 공통 실행 기반을 세운다. 특정 약국/회계 프로그램 어댑터가 아니다.

## 2. 근본 원인과 처방 (실측 확정)

| 축 | 실측 |
|---|---|
| **원인** | WinForms 는 네이티브 UIA 공급자가 있지만(ControlType=Edit/Button, 패턴 보유), 요소 획득 경로에 따라 MSAA→UIA 브리지 **프록시**(패턴 없음)로 온다. |
| **네이티브 공급자가 붙는 유일한 recipe** | `RootElement.FindAll(TreeScope.Children, ProcessIdProperty=pid)` 로 top-level 창을 잡고 **`ControlViewWalker` DFS** 로 하강. |
| **프록시를 부르는 경로(금지)** | `AutomationElement.FromHandle(hwnd)` · `FindFirst(RuntimeIdProperty)` — 둘 다 MSAA 프록시를 돌려줘 GetCurrentPattern 실패. |
| **처방** | 한 번 recipe 로 걸어 **살아 있는 AutomationElement 핸들을 rid 로 캐시**하는 장수(long-lived) 호스트 프로세스. 재식별은 트리 재-walk + identity 앵커(automationId·name·className·role), **절대 FindFirst(RuntimeId) 아님**. |

## 3. 구현 형태

- `tools/o4o-local-agent/src/windows-uia-host.ps1` (신규, **UTF-8 BOM** 필수 — PS 5.1 이 한글 주석을 ANSI 로 오독하지 않도록 · 292줄): 장수 PowerShell 호스트. `$ErrorActionPreference='Stop'` · Set-StrictMode · UTF-8 콘솔 · `Add-Type` UIAutomationClient + 내장 C# `O4OUiaHost`(GetForegroundWindow/IsWindowVisible/IsIconic/GetWindowThreadProcessId). 프로세스 시작 시 `$GENERATION=[Guid]::NewGuid().ToString('N')`. Windows 기본 .NET 만 사용 — **새 외부 .NET 패키지 0**.
- `tools/o4o-local-agent/src/windows-uia-client.mjs` (신규, 147줄): 싱글턴 지속 클라이언트. `startUiaHost` 를 windows-window-control 에서 **단일 import**(실행 지점 1). `REQUEST_TIMEOUT_MS=20_000` · `IDLE_SHUTDOWN_MS=120_000`. stdin/stdout **JSON 한 줄** IPC(브로커/큐 없음). exports: `currentGeneration()` · `hostInspect()` · `hostAct()` · `shutdownUiaHost()`.
- `tools/o4o-local-agent/src/windows-uia.mjs` (수정, +50/−15): `uiaInspect`/`uiaSetValue`/`uiaInvoke` 가 generation + identity 앵커를 실어 host 로. Safety V1 게이트(idle≥1200ms + foreground=대상)는 host **앞에** 그대로. `mapHostFailure(raw)` 로 §51 매핑, `identityOf(entry)` = `{automationId, name, className, role}`.
- `tools/o4o-local-agent/src/windows-window-control.mjs` (수정, +24): `startUiaHost()` 실행 지점을 `matchWindows` **앞으로** 이동(그 뒤 구간은 순수 함수 선언만 — 계측 창 spec 의 eval-from-matchWindows 테스트 계약 유지).

**새 npm 의존성 0 · 새 외부 .NET 패키지 0 · execFile 지점 변화 없음(단일).**

## 4. 요소 동일성 계약 (WO 핵심)

- **관찰(inspect)**: 호스트가 recipe 로 창 트리를 걸어 각 요소에 `rid`(RuntimeId 문자열) + identity 앵커(automationId·name·className·role)를 부여하고, 살아 있는 핸들을 rid→handle 캐시에 저장. snapshot 에 `generation` 스탬프.
- **동작(act)**: 클라이언트가 `{generation, kind, rid, hwnd, text?, identity}` 를 보낸다. 호스트는 ① generation 대조 ② rid 캐시 조회 ③ 캐시된 핸들이 stale 인지 property try/catch 로 확인 ④ stale/미스면 `ReidentifyInWindow(hwnd, identity)` 로 **앵커 재식별** ⑤ GetCurrentPattern 으로 동작.
- **재식별 앵커**: strong = automationId + role, weak = className + name + role. RuntimeId 로 다시 찾지 않는다.
- **generation**: 호스트 프로세스 수명 = 한 generation. 재기동 → 새 GUID → 옛 snapshot 의 ref 는 전부 `UIA_GENERATION_MISMATCH`.

## 5. 오류 계약 (WO §51)

`UIA_CLIENT_UNAVAILABLE` · `UIA_CLIENT_TIMEOUT` · `UIA_ELEMENT_NOT_FOUND` · `UIA_ELEMENT_STALE` · `UIA_ELEMENT_AMBIGUOUS` · `UIA_ROOT_CHANGED` · `UIA_GENERATION_MISMATCH` · `UIA_ACTION_NOT_SUPPORTED`. 호스트 reason(PROCESS_NOT_FOUND · PROCESS_NOT_REGISTERED · WINDOW_NOT_TARGET · WINDOW_NOT_VISIBLE · ELEMENT_STALE · ELEMENT_DISABLED · NOT_EDITABLE · READ_ONLY · NOT_INVOKABLE · BAD_KIND · BAD_TEXT · GENERATION_MISMATCH · BAD_OP · HOST_ERROR)을 `mapHostFailure` 가 §51 코드로 매핑. 클라이언트 오류(UIA_CLIENT_x·GENERATION_MISMATCH)는 그대로 통과.

## 6. 필수 CLOSED 조건 — 실제 Windows 전체 스택 smoke (재현 3회)

전체 스택(`windows-uia.mjs → windows-uia-client.mjs → windows-uia-host.ps1 → 실 UIA`)을 계측 창(`O4O UIA Test Surface`, WinForms)에 대고 idle 상태에서 실측. 드라이버는 foreground + idle(≥1500ms) 확보 후 transient(USER_ACTIVE/TARGET_CHANGED) 재시도. **2026-09-14 재현: PASS×5(직전 세션 2회 + 본 세션 fast-forward 후 1회 = 총 3회 일관).**

| # | 필수 조건 | 결과 | 증거 |
|---|---|---|---|
| C1 | **WinForms TextBox set_value** | **PASS** | `status=success verified=true` — 호스트가 ValuePattern.SetValue 후 값 재확인(verify) 통과 |
| C2 | **WinForms Button invoke** | **PASS** | `status=success executed=true` — InvokePattern.Invoke 실행 |
| C3 | **stale 감지/복구** | **PASS** | 죽은 rid(`99999.88888`) + 실 identity 앵커 → 호스트가 캐시 미스 감지 후 트리 재-walk 로 재식별 → `ok=true reident=true verified=true` |
| C4 | **client 재기동 후 옛 ref 거부** | **PASS** | 호스트 종료 직후 옛 ref = `failed/UIA_GENERATION_MISMATCH`, 새 호스트(새 generation) 기동 후 옛 snapshot ref = `failed/UIA_GENERATION_MISMATCH` |
| C5 | **Safety V1 회귀** | **PASS** | 대상 창을 최소화(비-foreground)한 뒤 set_value → `failed / WINDOWS_AUTOMATION_TARGET_CHANGED (other_app_foreground)` — verify 게이트가 host **앞에서** 차단 |

**C1·C2 가 성공했다는 사실이 곧 windows-uia.mjs 가 identity 앵커를 host 로 그대로 실어 보내고, 지속 클라이언트가 요소를 재사용해 동작시킨다는 증명이다.**

### 6-A. stale 복구 검증 경계 (왜 client+host 경계에서 확인했나)

계측 창은 **고정 hwnd 에서 컨트롤을 외부에서 파괴·재생성할 방법이 없다**(실측: 최소화/복원은 RuntimeId 를 바꾸지 않고 캐시 핸들을 stale 시키지도 않는다; 모달 재-열기는 새 hwnd 를 만들어 hwnd 로 키잉하는 재식별과 어긋난다 — `probe-stale.mjs` 로 확인). 따라서 stale 복구는 **메커니즘이 실제로 사는 자리인 client+host 경계**에서, 죽은 rid + 실 identity 로 캐시 미스를 강제해 재식별을 실측했다(C3). identity 스레딩 자체는 C1/C2 성공이 별도로 증명한다.

## 7. 경계 준수 (WO 범위·금지)

- **AI 는 raw UIA 쿼리 / 임의 property 이름 / raw PowerShell 을 넘기지 못한다** — 허용된 action 계약(kind=`set_value`|`invoke`)만. 호스트가 kind 를 이 둘로 강제.
- **단순 IPC** — stdin/stdout JSON 한 줄, 브로커/큐 없음.
- **지속 클라이언트는 등록 대상 프로세스/창 밖을 탐색하지 않는다** — pid 프로세스 이름 대조(PROCESS_NOT_REGISTERED) + hwnd 소유(GetWindowThreadProcessId==CachePid, WINDOW_NOT_TARGET) 이중 방어. **전역 데스크톱 UI 트리 census 없음**.
- **Safety V1 우회 불가** — 호스트에 SendInput/mouse_event/keybd_event/PostMessage/SendMessage/Start-Process/Invoke-Expression/클립보드 API 0(단위 테스트가 잠금). 동작은 UIA 패턴으로만.
- **요소 동일성은 DB 에 안 들어간다** — 런타임/세션 한정(호스트 메모리 캐시). cloud/local migration 0, `automation_jobs` 무변경.
- **로깅 경계**: 허용(targetId·action·controlType·identityStrategy·generation·status·errorCode·duration) / 금지(text 값·창 전체 텍스트·채팅 내용·파일 경로·raw RuntimeId dump·전체 UI 트리) — 로그 추가 0.

## 8. Tests / CI

| 게이트 | 결과 |
|---|---|
| agent `windows-uia-persistent-client.test.mjs`(신규 6: 호스트 BOM · 금지 토큰 · 네이티브 recipe · op/kind/text-500/이중방어/generation · 클라이언트 실행 은닉·§51 · 호스트 없을 때 act 단락) | PASS |
| agent 전체 회귀(windows-uia 스크립트 잠금 9개로 갱신 외) | PASS(115) |
| 서버 `windows-app-window-control.spec.ts`(스크립트 목록 8→9: `windows-uia-host.ps1` 추가) | PASS |
| 서버 회귀(windows-ui-automation · computer-use · local-agent-runtime) | PASS(총 114) |
| tsc(api-server, `--noEmit`) | 0 errors |
| 실 Windows 전체 스택 smoke `drive-fullstack.mjs`(C1~C5) | PASS×5(재현 3회) |
| frozen `windows-automation-safety.mjs`(Safety V1) · `windows-uia.ps1`(verify probe) | **불변**(origin/main 대비 byte-for-byte) |

## 9. DB / dependency

cloud migration 0 · local migration 0 · npm 의존성 0 · 외부 .NET 패키지 0(Windows 기본 UIAutomationClient) · execFile 지점 1(변함없음) · 로그 추가 0 · 요소 동일성 영속 저장 0(런타임/세션 한정) · `automation_jobs` 무변경.

## 10. Limitations / Follow-up

1. **WPF/Win32 실측은 미완료** — recipe(FindAll(pid)+ControlViewWalker)와 identity 앵커는 프레임워크 중립이라 설계상 적용되나, 이 WO 의 실 smoke 는 WinForms 계측 창으로만 확인했다. WPF/Win32 실앱 확인은 필요 시 후속.
2. **stale 복구의 "외부 파괴·재생성" 시나리오는 계측 창에 존재하지 않아** client+host 경계에서 캐시 미스 강제로 확인(§6-A). 실앱에서 컨트롤이 실제로 파괴·재생성되는 경우의 복구는 같은 코드 경로를 타지만 실앱 실측은 별도.
3. smoke 는 실제 사용자 활동에 민감 — idle 에서 돌려야 한다(활동 시 안전층이 정상 거절).
4. 계측 창의 native helper WO 는 **불필요** — 필수 조건 5개가 순수 UIA(패턴) 경로로 모두 PASS 하므로 SendInput/native 주입 후속 WO 는 필요 없다.

## 11. 문서 정합

문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
(계측 창 CHECK §5-A·§19 가 이 WO 를 후속으로 지목했고, 본 WO 가 그 후속을 완료했다 — 별도 WO 제안 없음.)
