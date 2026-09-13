# CHECK-O4O-WORK-TARGET-DISCOVERY-AND-ACTIVATION-V0

> **WO**: `WO-O4O-WORK-TARGET-DISCOVERY-AND-ACTIVATION-V0`
> **상태**: **CLOSED** — 공통 Target 계층 ESTABLISHED · 실 Chrome(기존 탭 재사용 / 새로 열기) · 실 Windows(Notepad 실행/재사용/복원 · 계산기 launch 금지 · synthetic 사용자 요청) · production 브라우저 왕복 전부 PASS. 실 약국 프로그램 = PENDING(프로그램 미준비)
> **작성일**: 2026-09-13
> **선행**: Goal-Driven Work Agent(LLM closure) · Browser DOM Control · Chrome Native Bridge · Windows App Window Control · Browser Control · Computer Use · Local Data Runtime V1
> **commit**: `fc3648e1f` (확장 · agent · 서버 · 테스트) · 본 문서

---

## 0. 한 줄 요약

사용자 Goal 이 들어오면 O4O 가 **먼저 "어디서 일을 시작하는가" 를 스스로 조사·준비**한다: 이미 열려 있는 탭/창은 재사용·활성화 → 없으면 등재된
안전한 방법(등재 canonical URL · 등재 실행 파일)으로 연다 → 그래도 안 되면 사용자에게 열어 달라고 한다. 브라우저와 PC 프로그램을 같은
계약(`TargetDiscoveryResult`)으로 다루되 실행은 분리했다. Work Agent 는 대상이 `ready` 일 때만 관찰·Planner loop 에 들어간다. 사용자에게
"열려 있나요?" 를 먼저 묻는 경로는 없다(§55). 임의 URL · 임의 exe · 셸 · 로그인 · 전체 탭/프로그램 census 업로드 = 0.

## 1. 기존 target 구조 census (§1)

| 축 | 착수 전 | 이번 WO |
|---|---|---|
| browser site 등재부 | 서버/agent/확장 3사본(`o4o.neture` · `healthkr`, url · allowedOrigins) · 별칭은 site 축 + pharmacy web 등재부 | 그대로 재사용(§7) |
| 브라우저 탭 발견 | 확장 `resolveSiteTab`(DOM 명령 시점: active 탭 또는 그 site 탭 정확히 1개) — **활성화·열기 없음**, `open_site` 는 OS handler(탭 열거 불가 → 중복 탭 가능) | bridge type 3(`browser.target.discover/activate/open`) — 확장이 등재 site 탭을 세고 · 앞으로 보내고 · 등재 URL 로 하나 연다 |
| windows app 등재부 | `windows.notepad` · `windows.calculator`(processNames) · `find_application` · `activate_window`(창 census + foreground) | + `aliases` + agent 전용 `launch{kind,path}` · `launchAllowed` |
| 실행 | 없음(`Start-Process` 는 browser-open 1파일 URL 전용, 의도적 잠금) | `windows-app-launch.ps1`(두 번째·마지막 예외, 등재 경로만) |
| Work Agent 시작 | `resolveWorkSite` → 곧바로 `get_context/inspect`(탭 없으면 `site_not_ready`) | `resolveWorkTarget` → **`local.target.prepare#targetId`** → ready 일 때만 loop |

## 2. Common target contract (§4·§5·§32·§33)

`targetType: browser_site | windows_app` · `targetId`(등재 siteId ∪ appId — id 공간 불겹침) · `state: not_found|found|active|opening|waiting_for_user|ready|failed` ·
`reusedExisting` · `openedByO4O` · `userActionRequired` · `reason`(enum 14) · `errorCode`(`WORK_TARGET_*` 10종, §51) · `tabCount|windowCount` · `path`(browser, pathname 만).
서버 `pickSafeTargetInfo` 가 이 집합만 통과시킨다 — 탭 제목 · 전체 URL · 실행 경로 · 탭/창 핸들 · 창 제목은 탈락(spec).

## 3. Target resolution (§6·§7)

`resolveWorkTarget(request, hint)` — 사이트(`detectRegisteredSite` + `resolvePharmacyWebSite`) 와 앱(`detectRegisteredApp` + 등재 aliases) 을 각각 대조. 정확히 한 종류·한 대상일 때만 확정; 사이트+앱 동시("약학정보원 결과를 메모장에") · 없음 · URL 문장 · 미등재 hint 는 null → Work Agent 가 되묻는다(`WORK_AGENT_SITE_UNRESOLVED`, 문장 "어느 사이트나 프로그램에서…").

## 4. Browser discovery (§8~§11·§48)

확장 `browser.target.discover{siteId}`: `chrome.tabs.query({})` 에서 **등재 site 탭만** 골라 `{tabCount, tabs[≤10]: {tabId, windowId, active, path, lastAccessed}}` — 제목 · 전체 URL 은 요약에 없다. agent `chooseSiteTab`: active > 최근 사용(lastAccessed 가 유일 최대) > 정확히 하나 > 못 고르면 `MULTIPLE_MATCHES → waiting_for_user`(§10). entryPoint 근접 규칙은 V0 미사용(등재 entry 가 "/" 하나).

## 5. Browser activation / open (§9·§12~§14·§56)

`activate{siteId, tabId}`: 확장이 tabId 를 다시 등재 site 인지 확인 → 창 최소화면 normal → `windows.update(focused)` + `tabs.update(active)`. `open{siteId}`: **확장 등재부 상수 `site.url`** 로 `tabs.create` 1개 → `status=complete` 대기. payload 어디에도 URL 칸이 없다. 다른 탭 닫기/이동 API 미사용(spec 잠금). 확장 미연결이면 OS handler 로 열지 않고 사용자에게 넘긴다(중복 탭 방지 우선).

## 6. Windows discovery (§16~§20)

`censusWindows`(기존 ps1) → `matchWindows`(등재 process 이름) → `chooseAppWindow`: 하나 > 최소화 아닌 창 하나 > `MULTIPLE_MATCHES`. 작업표시줄/Computer Vision 은 쓰지 않는다(§18). tray-only 앱은 census(top-level visible 창)에 안 잡혀 `not running` 으로 판정 → limitation.

## 7. Windows activation / launch (§19~§28·§50·§58)

실행 중이면 `activateWindowHandle`(IsIconic → SW_RESTORE → SetForegroundWindow) — **새 프로세스 0**(실측 pid 동일). 없으면 `launchRegisteredApp(app)`: `launchAllowed===true` 이고 `launch.path` 가 **agent 등재부 상수**(절대 경로 · `.exe|.lnk` · 공백/따옴표/제어문자 없음)일 때만 `windows-app-launch.ps1` → `Start-Process -FilePath $raw -PassThru`(-ArgumentList/-Verb/-WorkingDirectory 없음 · 존재 확인). 시작 ≠ 준비: 최대 8 s 동안 창을 다시 찾아 활성화해야 `ready`(§28). 계산기는 `launchAllowed:false`(Store 앱 · §50 예시).

## 8. User action fallback (§30·§31·§65)

launch 금지/메타 없음/경로 없음/실패/창 미출현/여러 탭·창/확장 미연결/권한 없음 → `waiting_for_user` + 사유. Work Agent 문장: "○○이(가) 실행되어 있지 않고 O4O 가 열 수 없습니다. 프로그램을 실행해 주세요. 로그인이 필요하면 로그인까지 완료해 주세요." / "탭이 여러 개라 하나를 정하지 못했습니다…" / "Chrome 확장이 연결되어 있어야…". 사용자 완료 신호 뒤 재요청이 곧 재탐색(§31 — 자동 감지 없음).

## 9. Login boundary (§15·§29·§66)

Target 계층은 로그인을 모른다 — credential · cookie · token 접근 코드 0(spec). 열린 뒤 로그인 화면이면 기존 DOM 축이 비밀번호 필드를 `DOM_USER_ACTION_REQUIRED` 로 막고 Work Agent 가 `credential_required` 로 인계한다(DOM V0 · LLM closure 에서 실측 · 본 WO spec 회귀). 별도 로그인 fixture smoke 는 만들지 않았다(기존 경계 재사용).

## 10. Work Agent integration (§34~§37)

`runWorkAgent`: Goal → `resolveWorkTarget` → device → **`issueTargetPrepare`(행동 예산 밖, 1 명령)** → `ready` 아니면 `site_not_ready` 인계(DOM 0 · Planner 0, 실측 spec) → browser 면 기존 관찰·Planner loop → windows_app 이면 찾기·활성화·실행까지 하고 `unsupported_control` handoff("프로그램 안의 작업은 아직 O4O 가 대신하지 않습니다"). 응답 `data.target` 에 요약. Windows UIA 는 후속.

## 11. Privacy / security (§46~§49·§61)

- 확장: 등재 site 탭만 요약(≤10) · 제목 없음 · URL 은 판정/path 추출에만. 전체 탭 census 가 host/cloud 로 가는 경로 0.
- agent `work-target.mjs`: fs · child_process · fetch · credential · Get-Process/tasklist/Win32_Product(설치 프로그램 census) 0(spec). 창 제목/URL 로 명령을 만들지 않는다(§49).
- launch 경로는 agent 등재부에만(§45) — 서버 등재부에 `launch`/`.exe` 부재 단언. 서버 명령 인자 0(`args: undefined`).
- 로그 `local-agent target prepare` 13키(id · 종류 · 상태 · 사유 · 개수 · 시간 · deviceId) — production 실측 2건 경로/제목/URL 누출 0.

## 12. Chrome smoke (§63) — 실 Chromium + unpacked 확장 + native host + relay + 실 agent handler + `runWorkAgent`(scripted planner)

| 시나리오 | 실측 |
|---|---|
| A. health.kr 이 **배경 탭**으로 열려 있음(active 는 neture) | `local.target.prepare#healthkr → ready · reused · tabCount 1` → 그 탭 활성화 → `get_context/inspect` 성공 → takeover. **탭 수 3 → 3, health.kr 탭 1(중복 0)** |
| B. health.kr 탭 없음 | `ready · openedByO4O · tabCount 1` → 등재 URL 로 탭 1개 → `get_context/inspect` 성공. health.kr 탭 0 → 1 |

## 13. Windows smoke (§64·§65) — 실 Windows 10 · 실 census/activate/launch 스크립트

| 시나리오 | 실측 |
|---|---|
| B. Notepad 미실행 → 등재 launch | `ready · openedByO4O · windowCount 1` · pid 17744 생성 |
| A. Notepad 실행 중(최소화) → handler `local.target.prepare#windows.notepad` | `success · ready · reused · restored:true` · **pid 동일(새 프로세스 0)** · foreground = notepad 확인 |
| C. 계산기 미실행(`launchAllowed:false`) | `waiting_for_user · launch_not_allowed · WORK_TARGET_USER_ACTION_REQUIRED` · 프로세스 0 → 0 |
| D. synthetic(launch 메타 없음) | `waiting_for_user · launch_not_allowed · WORK_TARGET_LAUNCH_NOT_ALLOWED` |
| 정리 | smoke 가 만든 pid 만 종료 |

## 14. Production smoke (§67·§68)

이 PC paired agent + neture 세션 → `POST /api/ai/work-agent/run`(`fc3648e1f` 배포) → target prepare → Gemini(3.8) loop:

| 시나리오 | 결과 |
|---|---|
| health.kr 배경 탭 존재 | `target: ready · reusedExisting` → 3 plans · 8 steps · 45.7 s · `goal_sufficiently_advanced` · 탭 1 → 1 · 결과 화면 `/searchDrug/search_total_result.asp` |
| health.kr 탭 없음 | `target: ready · openedByO4O` → 3 plans · 6 steps · 36.7 s · 탭 0 → 1 · 같은 결과 화면 |

Cloud Run 로그 `local-agent target prepare` 2건, 누출 0. 실 약국 프로그램 production smoke = **PENDING**(프로그램 미준비 — Notepad 로컬 smoke 로 대체).

## 15. Tests · CI (§59~§62)

| 게이트 | 결과 |
|---|---|
| agent `work-target.test.mjs`(신규 13): alias→id(서버) · 기존 탭 재사용/활성화/중복 0 · 없음→등재 open · 등재 밖/URL/경로 거절 · 여러 탭 규칙 · 미연결/권한/열기 실패 · 실행 중 앱 재사용/복원/중복 launch 0 · 여러 창 · launch→창→활성화 · 금지 앱 · 실패/timeout → 사용자 · 임의 경로/인자/셸 거절 · 개인정보 경계 | 13 PASS |
| 서버 `work-target-discovery.spec.ts`(신규 11): resolution · allowlist(등재 id 당 1) · 인자 0 · safe whitelist · Work Agent 통합(ready 재사용/열림 · waiting_for_user 4종 → DOM 0 · windows handoff 3종 · 미해석) · 로그 키 · 경계 · tool 등재부 불변 | 11 PASS |
| 잠금 갱신: bridge type 12→15(3사본 · host/client 방향) · ps1 5→6 · `Start-Process` 예외 2파일 · allowlist + target · handlers import 목록 · site 당 action 11 | PASS |
| 회귀(§62): agent node:test 5파일 90 · 서버 work-agent 24 · bridge/DOM/Windows/Computer/Local Agent runtime/browser-control/local-data-bridge/pairing/routing/execution-layer/pharmacy-web/supplier | **≈330 PASS** |
| eslint(18 파일) · tsc | 0 |
| CI | `fc3648e1f` Deploy API success; CI/CodeQL 은 타 세션 push(`9511e0a8e`) 로 cancelled → **`9511e0a8e`(본 commit 포함) CI Pipeline success** |

## 16. DB migration / write (§69·§70)

cloud migration **0** · local migration **0** · `automation_jobs` 무접촉 · DB write 는 기존 `local_agent_commands` envelope 뿐. Target Registry 는 코드 상수(§43).

## 17. Limitations

1. 브라우저 대상은 **확장 연결 필수** — 미연결이면 OS handler 로 열지 않고 사용자에게 넘긴다(중복 탭 방지 우선). `tabs.lastAccessed` 는 Chrome 121+ 에서만 있어 그 이전은 "최근" 규칙을 건너뛴다.
2. Windows: tray-only 앱은 census 에 안 잡혀 `not running` 으로 본다 · 같은 앱 창이 여럿이고 둘 다 보이면 사용자 선택 · `.lnk` launch 는 형식만 검증(실측은 exe).
3. 실 약국 프로그램 등재/launch 는 프로그램 준비 후(등재부 항목 추가 = 코드 변경, 자동 학습 없음 §39·§40). per-PC 설치 경로 차이는 §44 후속(로컬 메타 저장 필요 시 별도 설계).
4. Work Agent 는 windows_app 에서 handoff 로 끝난다(§37) — 프로그램 내부 자동화는 Windows UIA 트랙.
5. Target UI 는 결과 문장 한 줄(§54)뿐 — 진행 중 표시 없음.

## 18. Follow-up (§75)

Windows UI Automation V0 · Target Registration/Learning V1(사용자 확인 기반 후보 등록) · 실 약국 프로그램 Adapter · 두 번째 실사이트 · 주문 Workflow — 순서 미고정.

```text
WORK TARGET LAYER              = ESTABLISHED
TARGET RESOLUTION              = PASS
BROWSER EXISTING TAB DISCOVERY = PASS
BROWSER EXISTING TAB REUSE     = PASS
BROWSER SAFE OPEN              = PASS
DUPLICATE TAB OPEN             = 0
WINDOWS RUNNING APP DISCOVERY  = PASS
WINDOWS WINDOW ACTIVATION      = PASS
DUPLICATE PROCESS LAUNCH       = 0
REGISTERED SAFE LAUNCH         = PASS
USER ACTION FALLBACK           = PASS
LOGIN AUTO                     = 0
CREDENTIAL ACCESS              = 0
ARBITRARY URL                  = 0
ARBITRARY EXECUTABLE           = 0
ARBITRARY SHELL                = 0
FULL INSTALLED APP CENSUS      = 0
FULL TAB CENSUS CLOUD UPLOAD   = 0
PRODUCTION BROWSER ROUNDTRIP   = PASS
REAL PHARMACY APP SMOKE        = PENDING (프로그램 미준비)

WO-O4O-WORK-TARGET-DISCOVERY-AND-ACTIVATION-V0 = CLOSED
```

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
