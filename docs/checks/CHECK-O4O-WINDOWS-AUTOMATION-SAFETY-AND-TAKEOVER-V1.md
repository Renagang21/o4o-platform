# CHECK-O4O-WINDOWS-AUTOMATION-SAFETY-AND-TAKEOVER-V1

> **WO**: `WO-O4O-WINDOWS-AUTOMATION-SAFETY-AND-TAKEOVER-V1`
> **상태**: **ESTABLISHED · PASS** — Windows 자동화 공통 안전층(사용자 입력 감지 · 대상 창 재검증 · 제출 직전 재확인 · 숨은 목록 좌표 클릭 차단 · 앱 키 의미 등재 · 일시정지/인계 계약)을 UIA 실행층 앞에 세우고, 메모장 · 카카오톡(나와의 채팅) · production 에서 긍정/부정 실측. 부정 케이스 전송 0.
> **작성일**: 2026-09-13
> **선행**: Windows UI Automation V0(`3d6e738a6`) · Work Target Discovery V0 · Goal-Driven Work Agent(LLM closure) · Computer Use V0
> **commit**: `f3403e60e` (agent 안전층 · verify 조사 · 서버 코드/인계 매핑 · 등재부 profile · 테스트) · 본 문서

---

## 0. 한 줄 요약

V0 CHECK §11 이 올린 세 가지("사용자 타이핑 간섭" · "화면 이해 없는 좌표 클릭 사고" · "앱별 키 의미")를 **새 자동화가 아니라 공통 안전층**으로
답했다. 모든 Windows 조작(set_value · invoke · key · click) 앞에 입력을 만들지 않는 `verify` 조사(사용자 idle · foreground 창/프로세스 · 대상 창
존재/제목 · 요소 재해석 · top-level 창 수)를 넣고, 판정 규칙(`judge`)이 `WINDOWS_AUTOMATION_*` 9종으로 거절한다. 사용자 활동이면 **멈추고
재검사(2회) 뒤 인계**, 대상이 바뀌면 인계, 제출(ENTER 류)은 **직전에 다시 확인**, 항목이 노출되지 않는 목록(list/listitem)의 좌표 클릭은
**차단**, 앱 등재부에 키 의미(`interactionProfile`)와 UIA 노출 범위(`uiaVisibilityHints`)를 둬 profile 없는 앱의 제출/취소 키는 제안 단계에서
거절한다. 서버는 코드를 인계 사유 9종으로 옮기고 같은 안전 거절 2회면 인계한다. 키 내용 · 창 텍스트 · 스크린샷 수집 0 · 전역 hook/입력 차단 0.

## 1. 자동화 활성 상태 (WO §5·§6)

- agent `windows-automation-safety.mjs` 상태: `active · status(idle|running|paused|waiting_for_user) · targetId · paused · pauseReason · since`. 관찰(inspect) 뒤 `running`, 60 s 무활동이면 `idle` 로 보고, 거절/멈춤은 `waiting_for_user + pauseReason(enum)`.
- `/health.automation` 에 노출(`local-server.mjs`) — 창 제목 · 핸들 · 좌표 없음(테스트 §60 "상태" 가 키 목록을 잠근다).
- Work Agent 결과 `message` 가 인계 사유별 문장을 낸다(§7).

## 2. 사용자 입력 감지 (WO §7~§10)

| 항목 | 구현 · 실측 |
|---|---|
| 신호 | `GetLastInputInfo` idle ms **뿐**(키 내용 · 키 코드 · 마우스 좌표 이력 없음). 자기 주입 시각(`O4O_UIA_SINCE_INJECT_MS`)을 빼 자기 입력을 사용자 활동으로 오판하지 않는다 |
| 기준 | `userIdleMinMs 1200` · 멈춤 재검사 `pauseRetries 2 × pauseWaitMs 1500` |
| 동작 | 활동 감지 → **멈춤**(입력 0) → 재검사 → 잠잠하면 재개(`retries:1` 실측 unit) / 계속이면 `WINDOWS_AUTOMATION_USER_ACTIVE {paused:true, retries:2}` |
| 실측 | 메모장 · 카카오톡 모두 다른 프로세스의 마우스 이동(300 ms 간격) 중 ENTER 요청 → 5.6~5.7 s 뒤 USER_ACTIVE, 전송 0(§8·§9) |
| 금지 확인 | `GetAsyncKeyState · SetWindowsHookEx · RegisterRawInputDevices · BlockInput · GetKeyboardState` 소스 0(테스트 §60-4 가 ps1 · mjs 모두 잠금) |

## 3. 대상 창 재검증 (WO §11~§14)

`verify` 가 매 조작 직전 반환하는 것: `foregroundIsTarget · foregroundSameProcess · targetVisible · targetTitle(60자) · elementOk · windowCount`. 판정 순서(`judge`):

1. probe 실패 → `TARGET_UNCERTAIN probe_failed`
2. 대상 창 사라짐 → `TARGET_CHANGED target_window_gone` · top-level 창 수 증가(새 modal/dialog) → `TARGET_CHANGED unexpected_window`
3. 제목이 관찰 때와 다름 → `TARGET_UNCERTAIN title_changed`
4. 요소 재해석 실패 → `UIA_AMBIGUOUS element_stale`
5. foreground ≠ 대상(activate 제외) → `TARGET_CHANGED other_window_same_process | other_app_foreground`

실측: 카카오톡 본인 창을 최소화(사용자가 다른 창으로 감) → ENTER 요청 → `TARGET_CHANGED other_app_foreground`, 전송 0. 메모장 최소화 → 같은 코드 → 재관찰 → `activate`(창을 앞으로, foreground 조건 면제) → 재개 성공.

**결정(실측에서)**: 메모장은 첫 입력 뒤 제목에 `*`(수정 표식)가 붙어 `title_changed` 가 난다. 앱 자신의 표시(수정 표식 · 미읽음 수)일 수 있으므로 서버는 `TARGET_UNCERTAIN` 을 **즉시 인계가 아니라 재관찰 1회**(실행 0 · 새 관찰이 기준이 됨) → 같은 거절 2회면 `target_identity_uncertain` 인계로 다룬다. 카카오톡 대화창 제목이 바뀌는 경우(사용자가 같은 창에서 방을 바꿈)는 재관찰 뒤 제출 규칙("창 제목 ∈ 요청 문장", V0 §5)이 다시 막는다.

## 4. 제출 직전 재검증 (WO §15~§17)

- 제출 성격 키(`ENTER · CTRL+ENTER`, 앱 profile 의 submitKeys)는 `verify` 통과 + **요소 rid 재해석 OK + 관찰/현재 제목 모두 존재**일 때만 실행. 하나라도 없으면 `SUBMIT_UNVERIFIED submit_element_unverified | submit_title_unverified`.
- 줄바꿈 키(메모장 ENTER)는 제출이 아니므로 요소 재검증 없이 허용(§60-13).
- risk 재분류 없음 — 검증된 제출은 V0 정책 그대로 통과(§60-10).

## 5. 앱 키 의미 · UIA 노출 범위 등재 (WO §18~§24)

| 앱 | interactionProfile | uiaVisibilityHints |
|---|---|---|
| `windows.kakaotalk` | submit `ENTER` · newline `CTRL+ENTER` · cancel `ESC` · risky `ESC`(대화창 닫힘 실측) | exposed window · search · input / hidden list_rows · message_list · send_button |
| `windows.notepad` | submit 없음 · newline `ENTER` · cancel `ESC` · risky 없음 | exposed window · input · menu / hidden 없음 |
| `windows.calculator` | 없음 → 제출/취소 키 자동 실행 금지 | 없음 |

- agent · 서버 사본 동일값(테스트 양쪽이 서로의 파일을 읽어 잠금). 서버 등재부에 실행 경로 · 창 핸들은 여전히 없다.
- 서버 제안 검증: profile 없는 앱의 `ENTER/CTRL+ENTER/ESC` → `KEY_INVALID`, `riskyKeys` → `KEY_INVALID`(카카오톡 ESC 는 이제 제안 단계에서 거절). agent 도 `KEY_UNKNOWN key_semantics_unknown | risky_key` 로 이중 차단.
- Planner 프롬프트: "## 이 프로그램의 키 의미(등재부)" · "## UIA 노출 범위(등재부)" 절 — 미노출 영역은 좌표로 고르지 말고 takeover.
- 매크로/업무 정의가 아니다 — 네 묶음(제출 · 줄바꿈 · 취소 · 위험)뿐(AI-AUTOMATION-EVOLUTION-PRINCIPLES "사이트별 업무 사전 정의 금지").

## 6. 숨은 목록 좌표 클릭 차단 (WO §22~§26)

`click{x,y}` 대상 요소 role 이 `list | listitem` 이면 `HIDDEN_CONTROL blind_list_click` — V0 실측 사고(친구/채팅 탭 상태에 따라 다른 방이 열림)의 직접 차단. pane 좌표 클릭(친구 탭 아이콘 등) · 노출된 listitem 의 `invoke` 는 통과. 서버는 `uia_hidden_control` 로 **즉시 인계**("항목 선택은 직접 해 주세요 … 선택한 뒤 다시 요청하면 이어서").

## 7. 일시정지 · 재개 · 인계 계약 (WO §27~§35)

| 코드(agent) | 서버 인계 사유 | 처리 |
|---|---|---|
| `USER_ACTIVE` · `PAUSED` | `user_active` | 즉시 인계 |
| `HIDDEN_CONTROL` | `uia_hidden_control` | 즉시 인계 |
| `KEY_UNKNOWN` | `key_semantics_unknown` | 즉시 인계 |
| `VISION_UNCERTAIN` | `vision_uncertain` | 즉시 인계(코드 예약 — V1 에 vision 경로 없음) |
| `TARGET_CHANGED` | `target_changed` / 새 창이면 `unexpected_window` 사유 | 재관찰 1회(Planner 에 `SAFETY_REJECT (사유)`) → 2회면 인계 |
| `TARGET_UNCERTAIN` | `target_identity_uncertain` | 재관찰 1회 → 2회면 인계(§3 결정) |
| `UIA_AMBIGUOUS` | `uia_target_ambiguous` | 재관찰 1회 → 2회면 인계 |
| `SUBMIT_UNVERIFIED` | `submit_not_verified` | 재관찰 1회 → 2회면 인계 |

- 인계 문장은 사유별(한국어) + "프로그램 화면은 그대로 두었습니다." — 초기화 · 삭제 · 되돌리기 제안 0. 재개는 사용자의 새 요청 = 새 관찰 = 새 probe(이전 판정 불신, §60-24).
- `safety{reason(enum 15종 whitelist) · paused · retries}` 만 서버로 간다(`pickSafeUiaInfo`). UIA 실패 결과도 이 whitelist 통과분만 보존(`local-agent-service` keepFailureData + UIA).

## 8. 실측 — 메모장 (WO §67)

| 단계 | 결과 |
|---|---|
| prepare → inspect → `activate` | PASS(`running`, targetId windows.notepad) |
| `set_value` | **V0 미지원 확인** — 이 PC 메모장 편집 영역은 `document`(TextPattern 만, ValuePattern 없음) → `UIA_ACTION_NOT_SUPPORTED`(안전층 이전 단계). 텍스트 입력 검증은 카카오톡에서 |
| `key ENTER`(줄바꿈, 제출 아님) · `TAB` | PASS(`via message`) |
| 사용자 활동(다른 프로세스 마우스 이동) 중 `key` | `USER_ACTIVE {paused:true, retries:2}` · 5.7 s · 상태 `waiting_for_user/user_active` |
| 창 최소화(사용자가 떠남) 뒤 `key` | `TARGET_CHANGED other_app_foreground` |
| 재관찰(minimized) → `activate` → `key` | PASS · 상태 `running` 복귀 |
| 제목 `*` 표식 | 첫 실행에서 `TARGET_UNCERTAIN title_changed` 실측 → §3 결정 |

남은 것: 메모장 "제목 없음" 창 1개(빈 줄 · 탭만, 텍스트 0) — 닫으면 저장 대화상자가 뜨므로 자동으로 닫지 않았다. 사용자가 "저장 안 함" 으로 닫으면 된다.

## 9. 실측 — 카카오톡 나와의 채팅 (WO §68~§70, `runWorkAgent` + 실 agent handler)

| 케이스 | 결과 |
|---|---|
| 긍정(§68): 다른 방 창이 foreground → `click(window)` 본인 창 앞으로 → `set_input`(verified) → `key ENTER`(안전 게이트 통과 · `valueCleared:true`) → 재관찰 → done | **PASS** `completed` · 6 steps · 14.5 s — 본인 채팅 전송 1건 |
| 부정 A(§69): ENTER 직전 사용자 활동 | `key` → `WINDOWS_AUTOMATION_USER_ACTIVE` → **즉시 인계 `user_active`** · 전송 0 · 문장 "키보드·마우스 입력이 감지되어 멈췄습니다 … 프로그램 화면은 그대로 두었습니다." |
| 부정 B(§70): ENTER 직전 본인 창 최소화 | `key` → `TARGET_CHANGED` → 재관찰(`SAFETY_REJECT`) → Planner 가 `click(window)` 로 창을 앞으로 → (smoke 는 여기서 review_required 로 멈춤) · 전송 0 |
| agent 단독 부정(이전 회차) | 최소화 → `other_app_foreground` / 마우스 이동 → `user_active retries 2` · 전송 0 |

- 열려 있던 **다른 방 창은 한 번도 대상이 되지 않았다**(창 제목 ∈ 요청 문장 규칙 + foreground 검증). 방 이름은 기록하지 않는다.
- 부정 케이스가 남긴 본인 채팅 입력창 초안("O4O 자동화 테스트입니다.")은 smoke 뒤 본인 창 RichEdit 만 비웠다(agent 관찰 `text` 길이 0 확인). 다른 방 초안은 건드리지 않았다.

## 10. Production 왕복 (WO §71·§72)

paired agent(`f3403e60e` 코드로 재기동) + neture 세션 → `POST /api/ai/work-agent/run`(`f3403e60e` 배포) → Gemini → agent UIA → 카카오톡 본인 창.

| 케이스 | 결과 |
|---|---|
| 긍정(§71) | `completed` · 4 steps · 3 plans · **35.6 s** · history `set_input → key` · 문장 "… 프로그램 화면에서 결과를 확인하세요."(새 배포 문구) — 본인 채팅 전송 1건 |
| 부정(§72): 실행 내내 다른 프로세스의 마우스 이동 | `needs_user` · takeover **`user_active`** step 2 · history `set_input=failed` · 0단계 수행 · 전송 0 · 28.6 s · agent `/health.automation` = `{active:true, status:'waiting_for_user', targetId:'windows.kakaotalk', pauseReason:'user_active'}` |

agent 로그에 본인 이름 · 메시지 내용 · 방 이름 0(grep 확인). smoke 뒤 agent 프로세스는 종료(기동 전 상태로).

## 11. Computer Use fallback (WO §64 17~19)

Work Agent 에 vision/좌표 fallback 경로는 배선돼 있지 않다(spec 이 `work-agent-runtime.ts` 에 `local.computer.` 0 을 잠근다). `VISION_UNCERTAIN` 코드 · `vision_uncertain` 사유는 예약만. 좌표 클릭은 UIA `click{x,y}` 뿐이고 §6 이 목록에서 막는다. `windows-computer-input.ps1` 은 손대지 않았다(범위 밖 — 후속 §14).

## 12. Tests · CI

| 게이트 | 결과 |
|---|---|
| agent `windows-automation-safety.test.mjs`(신규 11: 활동 1~4 · 대상 5~9 · 제출 10~13 · hidden 14~16 · 인계 20~24 · 상태 · 등재부) · `windows-uia.test.mjs`(verify 잠금) | 16 PASS · 그 밖 5파일 90 PASS |
| 서버 `windows-automation-safety.spec.ts`(신규 6: 코드/사유/whitelist/등재부 · 키 의미 검증+프롬프트 · 즉시 인계 4종 · 재관찰→대안→진행/2회 인계(target_changed · title_changed) · submit_not_verified · 로그 키/vision 미배선) · `windows-ui-automation.spec.ts`(ESC → KEY_INVALID 갱신) | 16 PASS |
| 회귀: work-target-discovery · work-agent-llm-closure · computer-use · window-control · browser-control · bridge · DOM · local-data · pairing · routing · execution-layer · pharmacy-web-core · local-agent-runtime | 292 PASS |
| eslint(8 파일) | 0 |
| tsc(api-server) | 이번 변경 파일 0 · 저장소 baseline 56(entities · lms · cosmetics 등 무관 — 사전 빌드 필요 항목) |
| CI · Deploy API(`f3403e60e`) | §13 |

## 13. CI · 배포 결과

`f3403e60e`: CI Pipeline success · Deploy API Server(Cloud Run) success · CodeQL success. `/health/ready` ready. (직전 커밋 `3ae501167` 의 CI Pipeline 은 이 push 의 concurrency 로 cancelled — 그 변경은 `f3403e60e` 의 green CI 에 포함된다.)

## 14. DB · 경계 · 미변경

- cloud/local migration 0 · `automation_jobs` 불변 · 새 의존성 0 · execFile 지점 1(`windows-window-control.mjs`) · ps1 7개 그대로(`windows-uia.ps1` 에 `verify` 추가만).
- 전역 키보드/마우스 hook · 입력 차단 · 드라이버 0. 키 내용 · 타이핑 텍스트 · 채팅방 원문 이름 · 메시지 내용 · 창 텍스트 · 스크린샷 로그 0. 로그 키(`local-agent uia command`) 불변.
- `windows-computer-input.ps1`(Computer Use 입력)에는 사용자 idle 가드가 없다 — Work Agent 가 그 경로를 쓰지 않으므로 이번 범위에서 제외(후속 §15-2).
- 카카오톡 smoke 는 나와의 채팅만. 은행 · 거래처 · 다른 사용자 방 0.

## 15. Limitations · 후속

1. 사용자 활동 신호는 idle 시간뿐 — "누가" 입력했는지는 모른다(자기 주입 시각으로만 구분). 원격 데스크톱 · 가상 입력기는 사용자 활동으로 잡힌다.
2. Computer Use 입력 스크립트(`windows-computer-input.ps1`)에 같은 idle 가드를 넣는 것은 별도 WO.
3. 제목 변경 판정은 문자열 전체 비교 — 앱의 표식(`*` · 미읽음 수)은 재관찰 1회로 흡수하지만, 표식이 매 조작마다 바뀌는 앱은 2회에서 인계된다.
4. 등재된 앱 2개(카카오톡 · 메모장)만 profile 이 있다. 실 약국 프로그램은 등재 시 profile · 노출 지도 조사가 선행 단계다.
5. 메모장은 이 PC 에서 `set_value` 미지원(`document` 만 노출) — 안전 시험 대상으로는 키 게이트만 검증 가능.

## 16. 팀장 보고 사항

- **O4O 안의 시험용 안전 표면 제안**(사용자 지적 2026-09-13: "메모장 이용은 왜 하니? 문제가 많던데.. 메모가 필요하면 o4o 에서 만들어서 이용하는 게 좋지 않겠니"): 외부 앱(메모장)은 UIA 노출이 PC/버전마다 달라(이번 PC 는 편집 영역이 `document` 만) 안전층 시험이 흔들린다. O4O 가 소유한 로컬 시험 창(UIA 노출을 우리가 정의)을 두면 사용자 활동 · 창 전환 · 제출 게이트를 재현 가능하게 검증할 수 있다. 이번 WO 는 새 자동화 금지라 만들지 않았다 — 별도 WO 제안.
- **V0 §11 세 항목의 처리 상태**: 사용자 타이핑 간섭 → §2(멈춤/재검사/인계) · 좌표 클릭 사고 → §6(목록 좌표 클릭 차단 + 노출 지도 등재) · 앱별 키 의미 → §5(profile). "자동화 실행 중" 을 사용자에게 보여 주는 UX 는 `/health.automation` 까지만(화면 표시는 후속).
- **문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건.
