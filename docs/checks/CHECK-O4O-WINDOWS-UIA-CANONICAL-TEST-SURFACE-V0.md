# CHECK-O4O-WINDOWS-UIA-CANONICAL-TEST-SURFACE-V0

> **WO**: `WO-O4O-WINDOWS-UIA-CANONICAL-TEST-SURFACE-V0`
> **상태**: **ESTABLISHED (PARTIAL) · 계측기 사용 개시** — 계측 창 + production 격리 + 노출 지도(inspect) + 숨은 목록 좌표 클릭 차단 + 사용자 활동/대상 전환/재개 안전 동작을 O4O 통제 창에서 반복 검증. **WinForms 요소 값/기본동작(set_value·invoke)은 이 창에서 구동 불가** — 실측 발견(§18): WinForms UIA 브리지가 패턴을 첫 UIA 클라이언트에만 노출, 별도 action 프로세스에는 패턴 없는 프록시. 지속 UIA 클라이언트가 필요한 별도 WO(§19). 네이티브/HWND 기반 앱(카카오톡·메모장)은 영향 없음.
> **작성일**: 2026-09-13
> **선행**: Windows UI Automation V0(`3d6e738a6`) · Windows Automation Safety & Takeover V1(`f3403e60e`) · Work Target Discovery V0
> **commit**: `e87c7781b` · 본 문서

---

## 1. 목적

O4O 가 UIA 노출 상태와 UI 변화를 **스스로 통제하는** 최소 Windows 시험 표면("계측기")을 만들어, Windows UI Automation / Safety /
Takeover 공통 계층의 회귀를 외부 앱 특성과 분리해 같은 조건에서 반복 검증한다. 제품 기능이 아니다.

## 2. 외부 앱 테스트 한계(왜 필요한가)

| 앱 | 실측 한계 |
|---|---|
| 메모장 | 이 PC 에서 편집 영역이 `document`(ValuePattern 없음)로만 노출 → `set_value` 미지원. 첫 입력 뒤 제목에 `*` 표식 → target 판정 흔들림 |
| 카카오톡 | 입력창만 UIA 노출, 채팅방·메시지 목록·전송 버튼은 custom-drawn. 앱 UI 변경에 테스트가 흔들림 · 실 사용자 계정이라 부정 케이스 실험이 조심스러움 |

→ 공통 엔진 문제와 앱 특수 문제를 구분할 수 없었다. 이제 공통 회귀 = 계측 창, 앱 호환성 = 실제 앱으로 나눈다(§14).

## 3. 구현 형태

- `tools/o4o-local-agent/src/windows-test-surface.ps1` — PowerShell + Windows 기본 .NET **WinForms** 창 하나. 새 프레임워크 0 · 새 npm/.NET 의존성 0.
- `tools/o4o-local-agent/src/windows-test-surface.mjs` — 개발 대상 정의(`windows.o4o-test-surface`) + `O4O_DEV_TARGETS=1` 게이트.
- `windows-window-control.mjs launchTestSurface()` — 저장소 상수 스크립트 하나(여덟 번째 `.ps1`), argv 상수, 입력 없음. 창 수명 = 호출 프로세스 수명(`exited` · `stop()`).
- CLI: `node src/index.mjs test-surface` — 창을 띄우고 창이 닫히거나 Ctrl+C 할 때까지 붙어 있는다(§28·§29 최소 start). 이미 떠 있으면 재사용.
- `windows-uia.ps1` — 최소 generic 확장 1건(§34): 체크박스 기본 동작 `TogglePattern` fallback + patterns 조사에 `toggle`.

**실측 결정(launch)**: `CREATE_NO_WINDOW`(execFile `windowsHide`)로 띄우면 PowerShell 이 WinForms 창을 만들지 못했다. 콘솔을 만들지 않고(`detached`) `-WindowStyle Hidden` 을 주면 뜬다 — 사용자의 터미널 콘솔을 상속하지 않으므로 터미널이 숨겨지는 부작용도 없다. Volta shim 아래에서는 detach 된 자식이 node 종료와 함께 죽으므로(job object) "CLI 가 붙어 있는 동안 = 창 수명" 으로 정했다.

## 4. Test Target

`windows.o4o-test-surface` — processNames `powershell` + `windowTitlePatterns` `o4o uia test surface`(다른 PowerShell 창은 대상이 아니다) · `launchAllowed: false`(등재 실행 경로 `.exe/.lnk` 로는 시작 불가) · `devOnly: true`.

## 5. UI controls

TextBox(`TextInput`) · Button(`Action`) · Button(`전송`, `AcceptButton` = ENTER) · ListBox(`ExposedList`: Alpha/Bravo/Charlie) · CheckBox(`Option`) · CheckBox(`Title marker` → 제목 ` *`) · ComboBox(`ChoiceCombo`: One/Two/Three, DropDownList) · TabControl(Tab A/Tab B) · Button(`Open Modal` → 모달 Form + `Close`) · **CustomRows**(Panel `OnPaint` 로 Row 1~3 직접 그림, `AccessibleRole=List`) · 상태 Label 8개(`Current text:` · `Selected item:` · `Checkbox:` · `Combo:` · `Active tab:` · `Last action:` · `Last submitted:` · `Custom row:`).

## 5-A. 실측 발견 — WinForms 요소는 구동 불가(핵심)

계측 창을 세워 곧바로 드러난 것(이것이 계측기의 첫 성과다): **이 PC 에서 WinForms(.NET) 컨트롤은 UIA-MSAA 브리지로만 노출되며,
패턴(Value·Invoke·Toggle)이 첫 UIA 클라이언트(우리 `inspect` 프로세스)에는 안정적으로 보이지만, 이후 각 action(별도 PowerShell
프로세스)에는 패턴 없는 프록시로 온다.** 결과:

- `inspect` 는 TextInput=`value,text`, Action=`invoke`, Option=`toggle`, listitem=`select` 를 매번 일관되게 보고(반복 3회 동일).
- 그러나 `set_value`(TextInput) → `UIA_ACTION_NOT_SUPPORTED`(NOT_EDITABLE), `invoke`(Action/Option) → NOT_INVOKABLE. RuntimeId 로 재해석은 되지만 `GetCurrentPattern` 이 실패.
- listitem·tabitem(rid `42.x.4.N`)은 별도 프로세스에서 RuntimeId 재해석 자체가 안 됨(virtualized 프록시) → verify `elementOk:false`.
- 창 요소를 `FromHandle` 대신 `inspect` 와 같은 `RootElement.FindAll(pid)` 경로로 잡아도 결과 동일 — 프로세스 경계가 원인이지 창 획득 경로가 아님.

**원인**: WinForms UIA 브리지는 패턴을 지속 연결된 클라이언트에만 재광고한다. 우리 실행 모델은 action 마다 새 PowerShell 프로세스라 매번 새 클라이언트다. **해결에는 지속 UIA 클라이언트(장수 헬퍼 프로세스)나 요소 정체성 모델 변경(RuntimeId→AutomationId/Name)이 필요** — 둘 다 frozen UIA V0 실행층의 구조 변경이라 이 WO 범위 밖(§63·§66). 별도 WO 로 분리(§19).

**영향 범위**: 지금까지 구동한 실제 앱(카카오톡 RichEdit · 메모장 Edit)은 HWND 기반 패턴이라 무관. 다만 실 약국·회계 프로그램이 WinForms/.NET 이면 같은 벽에 부딪힌다 — 계측기가 이를 실 앱 투입 전에 드러낸 것이 이 WO 의 성과다(§14 "common runtime issue 후보").

이 발견을 확인한 뒤 frozen UIA 실행층(`windows-uia.ps1`)에 넣었던 탐색적 수정(FindByRid 트리 걷기 · 창 획득 경로 변경 · Toggle 추가)은 **문제를 풀지 못했고 실 앱 동작을 바꿀 위험이 있어 전부 되돌렸다** — 이 WO 는 frozen 층을 건드리지 않는다.

## 6. UIA 노출 결과(실측 inspect)

| 컨트롤 | UIA role(agent) | patterns |
|---|---|---|
| TextBox | `textbox` (Edit, class `WindowsForms10.EDIT…`) | value · text — `set_value` 는 EM_REPLACESEL 경로(`via edit_message`) |
| Button | `button` | invoke |
| ListBox / 항목 | `list` / `listitem` ×3 (Alpha·Bravo·Charlie) | select |
| CheckBox | `checkbox` | toggle(이번 확장) — invoke 는 없다 |
| ComboBox | `combobox` + 내부 `list`/`listitem` ×3 + 드롭다운 단추 `button` | select(항목) · 값 편집 불가(DropDownList) |
| TabControl / 탭 | `custom`(SysTabControl32) / `tab` ×2 | select |
| 모달 Form | 두 번째 top-level `window`(제목 `… - Modal`) | — |
| 상태 Label | `text`(이름 = 상태 문자열) | — |

## 7. Custom hidden controls

`CustomRows` = UIA `list` 컨테이너(이름 CustomRows)로 보이고 **행 자식 0**(Row 1~3 이름을 가진 요소 없음). 카카오톡 목록과 같은 "보이지만 구조적으로 고를 수 없는 영역" 재현. 좌표 클릭은 안전층이 `WINDOWS_AUTOMATION_HIDDEN_CONTROL blind_list_click` 으로 차단(§11).

## 8. Interaction profile

`submitKeys ['ENTER']` · `newlineKeys []` · `cancelKeys ['ESC']` · `riskyKeys []` / hints exposed `window · text_input · button · list_items · checkbox · combo · tabs · modal`, hidden `custom_rows`. "전송" 이름은 COMMIT 목록(결제·송금·삭제…)에 없으므로 invoke 가능 — 외부 부작용이 없는 창이라 맞다.

## 9. Target discovery

- 창 없음 + `launchAllowed:false` → `local.target.prepare` = `waiting_for_user / launch_not_allowed`(실행 시도 0).
- 게이트 꺼짐(`O4O_DEV_TARGETS` 없음) → `WORK_TARGET_NOT_REGISTERED`.
- 창 있음 → `ready · reusedExisting · windowCount 1`(활성화 포함).

## 10. UIA action smoke (고정 순서, `test/smoke/test-surface-smoke.mjs`)

고정 순서로 실측(2026-09-13 22:00, idle, `smoke exit=0` — PASS 12 · BLOCKED_AS_EXPECTED 2 · TAKEOVER_AS_EXPECTED 1 · FINDING 1):

| 단계 | 결과 |
|---|---|
| discover(미실행) → `launch_not_allowed` | PASS(등재 실행 경로 없음 → 사용자에게, 실행 시도 0) |
| launch(`test-surface` CLI 경로) → discover → activate | PASS(`ready · reused · windows 1`) |
| inspect | PASS — textbox · button · list(+items 3) · checkbox · combobox · tab · submit 모두 노출, elements 41 |
| inspect: CustomRows | PASS — `list` 컨테이너 노출 · 행 자식 0 |
| inspect: 첫 클라이언트 패턴 | PASS — TextInput `editable=true`(value) |
| **WinForms 요소 set_value** | **FINDING** — `UIA_ACTION_NOT_SUPPORTED`(§5-A). set_value·invoke 는 이 창에서 구동 불가 → 지속 UIA 클라이언트 후속 WO |

## 11. Safety smoke

패턴 재해석이 필요 없는 안전 동작은 창/좌표 수준에서 실측:

| 안전 동작 | 결과 |
|---|---|
| 숨은 CustomRows 좌표 클릭 | **BLOCKED_AS_EXPECTED** `WINDOWS_AUTOMATION_HIDDEN_CONTROL / blind_list_click` · re-observe 결과 `Custom row: (none)`(실행 0) |
| 사용자 마우스 활동 중 창 key(TAB) | **TAKEOVER_AS_EXPECTED** `WINDOWS_AUTOMATION_USER_ACTIVE {paused:true, retries:2}` · 5.4 s · 상태 `waiting_for_user/user_active` |
| 창 최소화(foreground 실제 이탈 확인) 뒤 창 key(TAB) | **BLOCKED_AS_EXPECTED** `WINDOWS_AUTOMATION_TARGET_CHANGED / other_app_foreground` |

## 12. Modal / title state

- 모달 · 제목 표식(`*`) · 탭 전환은 컨트롤(버튼·체크박스·탭)의 **요소 동작(invoke)** 을 거쳐야 하는데, §5-A 의 WinForms 패턴 한계로 이 창에서는 구동되지 않아 이번 smoke 에서 자동 실측하지 못했다. 컨트롤은 창에 존재하며(inspect 로 확인) 지속 UIA 클라이언트 후속 WO 에서 재사용한다.
- 제목 변경 시 재관찰(즉시 오판 금지) 정책은 Safety V1 의 agent 단위 테스트 · 서버 spec 이 이미 잠그고 있고(카카오톡·메모장 실측), 이 창의 `Title marker` 컨트롤은 그 회귀를 요소 구동이 가능해지면 대체 검증할 자리다.

## 13. Takeover / resume

- 최소화(사용자 이탈) → `TARGET_CHANGED` 로 멈춘 뒤 **resume**: `local.target.prepare` re-discover → activate(`restored:true`) → 옛 snapshot 폐기 후 새 관찰 성공 → 상태 `running` 복귀. 모두 PASS.
- submit positive/negative(요소 값+ENTER)는 §5-A 로 이 창에서 구동 불가 — 카카오톡 나와의 채팅에서 이미 실측(Safety V1 CHECK §9·§10: 긍정 전송 1건, 부정 전송 0).

## 14. Regression 역할

이후 Windows 공통 자동화 변경(UIA 확장 · Safety · Takeover/Resume · Computer Use vision fallback · 앱 adapter)의 기본 회귀 대상은 이 계측 창이다. 외부 앱에서만 재현되는 문제 = app-specific compatibility issue, 계측 창에서도 재현되면 common runtime issue 후보(§47).

## 15. Production isolation

- 서버 등재부 · allowlist · 도구 정의 · Work Target 해석 어디에도 `windows.o4o-test-surface` 없음 → `isAllowedLocalAction('local.uia.*#windows.o4o-test-surface')` = false, 서버 `services/` 소스에 식별자 0(spec 이 걷는다).
- agent: production 등재부 파일(`windows-app-registry.mjs`)에 식별자 없음(서버 등재부와 목록 동일성 테스트 유지). 정의는 별도 파일, `O4O_DEV_TARGETS=1` 인 프로세스에서만 `findWindowsApp` 이 돌려준다. 일반 `run` 은 켜지 않는다(`test-surface` 명령 분기만).
- Admin/사용자 메뉴 · 서비스 기능 노출 0.

## 16. Tests / CI

| 게이트 | 결과 |
|---|---|
| agent `windows-test-surface.test.mjs`(신규 3: 스크립트/WinForms 기본만 · dev 게이트 격리 · 등재 실행 경로 차단) | PASS |
| agent 회귀(windows-uia · windows-automation-safety · work-target · local-db · local-data-runtime · browser-dom · native-bridge) | PASS(스크립트 8개 잠금 갱신) |
| 서버 `windows-uia-test-surface.spec.ts`(신규 2: production 격리 · agent dev 게이트/스크립트 잠금) | PASS |
| 서버 회귀(windows-ui-automation · windows-automation-safety · windows-app-window-control · work-target-discovery · computer-use · local-agent-runtime) | PASS |
| 실 Windows smoke `test/smoke/test-surface-smoke.mjs` | PASS(exit 0, idle) |
| eslint(touched) · tsc(touched) | 0 |
| frozen `windows-uia.ps1` | 불변(탐색 수정 전부 revert) |

## 17. DB / dependency

cloud migration 0 · local migration 0 · npm 의존성 0 · .NET 외부 의존성 0(Windows 기본 WinForms) · execFile 지점 1(변함없음) · Start-Process 파일 2(변함없음 — 계측 창 스크립트는 Start-Process 없음) · 로그 추가 0 · 실제 사용자 데이터 0.

## 18. Limitations

1. 계측 창은 `powershell.exe` 프로세스라 process 이름만으로는 다른 PowerShell 창과 구분되지 않는다 — 제목 패턴(`windowTitlePatterns`)이 구분한다.
2. ComboBox 항목 선택 · 값 설정은 이번 범위 밖(census 만). 콤보 항목은 `listitem`(select)로 노출되므로 필요 시 `invoke` 로 고를 수 있으나 검증하지 않았다.
3. Computer Use vision fallback 경로는 Work Agent 에 없다 — 좌표 클릭 차단까지만 검증(§19).
4. 창 수명이 CLI/harness 프로세스에 묶인다(Volta shim job object) — 백그라운드 상주 fixture 가 아니다.
5. smoke 는 실제 사용자 활동에 민감하다: 실행 중 키보드·마우스를 쓰면 안전층이 정상적으로 거절해 smoke 가 FAIL 로 끝난다(설계상 맞는 동작). idle 상태에서 돌려야 한다.

## 19. Follow-up

- Computer Use vision fallback WO 에서 같은 계측 창의 CustomRows 를 판독 대상으로 재사용.
- 카카오톡 · 약국 프로그램 등 실제 앱은 호환성 검증 축으로만.
- 콤보/토글 이상의 generic action(expand · select value) 은 필요가 생길 때 UIA 확장 WO 로.
- 문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
