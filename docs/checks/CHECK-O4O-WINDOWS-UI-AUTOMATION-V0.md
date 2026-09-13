# CHECK-O4O-WINDOWS-UI-AUTOMATION-V0

> **WO**: `WO-O4O-WINDOWS-UI-AUTOMATION-V0`
> **상태**: **ESTABLISHED · 핵심 흐름 PASS** — Goal → 카카오톡 target → 기존 창 활성화 → UIA 관찰 → 입력창 → 메시지 입력 → 전송 → 재관찰 → 전송 확인, 실 Gemini planner · production 왕복 PASS. **채팅방 찾기(목록)는 UIA 로 불가**(§2 fallback 판정) → V0 는 열린 창 재사용 + 요청에 방 이름 필수
> **작성일**: 2026-09-13
> **선행**: Work Target Discovery V0 · Goal-Driven Work Agent(LLM closure) · Computer Use V0 · Windows App Window Control V0
> **commit**: `3d6e738a6` (UIA 실행층 · 서버 계약 · Work Agent uia 표면 · 테스트) · 본 문서

---

## 0. 한 줄 요약

브라우저 DOM 축과 같은 계약(elementRef+snapshotId · role · name · riskLevel · UNTRUSTED)으로 **Windows 앱 창을 UIA 로 읽고 조작하는 공통
실행층**을 세우고, 카카오톡으로 검증했다. 카카오톡(EVA 프레임워크)은 UIA 에 **창 · 검색창(Edit) · 메시지 입력창(RichEdit) 만** 노출하고
채팅방 목록 · 메시지 목록 · 전송 버튼은 노출하지 않는다 — 그래서 "방 찾기" 는 좌표 클릭(Computer Use) 밖에 없는데, 목록 상태(탭 · 스크롤)를
검증할 수 없어 **다른 방이 열리는 사고가 실측**됐다(전송 0). V0 는 이미 열린 대화창을 재사용하고, 제출(전송)은 **foreground 창 제목이
사용자 요청에 이름으로 들어 있을 때만** 허용한다. 텍스트는 편집 메시지(EM_REPLACESEL), 전송은 컨트롤 창 메시지(WM_KEYDOWN ENTER)로 —
foreground · 포커스 · IME · 사용자 타이핑과 무관하게 동작한다.

## 1. 조사 — 카카오톡 PC 의 UIA 노출 (WO 확인사항 1)

| 화면 요소 | UIA | 비고 |
|---|---|---|
| 창(메인 · 대화창 · 로그인창) | ✅ Window(제목) | 대화창 제목 = 상대/방 이름. 트레이 상주 시 보이는 창 0 → 등재 exe 재실행(단일 인스턴스)으로 창 복귀 |
| 로그인 창 | ✅ Edit ×2(이메일 · 비밀번호) | 제목 표식으로 USER_ACTION — 입력 금지(실측: 로그아웃 상태에서 시작, 사용자가 직접 로그인) |
| 친구 검색창 | ✅ Edit(aid 100) — **Ctrl+F 뒤에만 생성** | 단축키는 허용 밖 → V0 미사용 |
| 친구 목록 / 채팅 목록 | ❌ `EVA_VH_ListControl_Dblclk`(항목 미노출), 이름 `ContactListCtrl` / `ChatRoomListCtrl` 로 **탭 구분만 가능** | 좌표 클릭 fallback — 위험(§8) |
| 메시지 입력창 | ✅ `RICHEDIT50W`(Value/Text 패턴) | 값 입력 · 키 가능 |
| 메시지 목록 | ❌ 커스텀 | 전송 확인은 입력창 비움(placeholder 전환)으로 |
| 전송 버튼 | ❌ 커스텀 | Enter 로 대체(이 PC 설정: Enter 전송) |
| 임베디드 광고(Chromium) | ✅ 노출되지만 앱 UI 아님 | 트리에서 제외 |

## 2. Computer Use fallback 이 필요한 지점 (WO 확인사항 2)

- **채팅방 열기**: UIA 항목 없음 → 좌표 더블클릭뿐. 실측: 메인 창이 채팅 탭(`ChatRoomListCtrl`)일 때 "첫 행 = 내 프로필" 가정이 깨져 **최근 대화방 2곳이 열렸다**(전송 0 · 창 닫음). 목록 내용을 구조적으로 확인할 수 없는 좌표 클릭은 **V0 에서 방 열기에 쓰지 않는다** — 열린 창 재사용 또는 사용자에게 요청. 후속: 목록 OCR/스크린샷 판독 또는 검색창(Ctrl+F → Edit) 경로.
- **친구/채팅 탭 전환**: 좌측 아이콘 좌표 클릭(창 기준 0.09,0.085) — 실측 동작, V0 smoke 하네스에서만 사용.
- **전송 결과 확인**: 메시지 목록 미노출 → 입력창 값이 보낸 텍스트를 더 이상 담지 않으면(placeholder "메시지 입력") 전송으로 판정. 스크린샷 판독은 후속.

## 3. 공통 실행층 (WO 확인사항 3·4)

- agent `windows-uia.ps1`(execFile 단일 지점의 일곱 번째 스크립트) — `inspect`(창+요소 ≤150, 임베디드 웹 제외) · `set_value` · `invoke`(Invoke/Select/DoDefaultAction · 창 요소는 "앞으로") · `key`(ENTER/TAB/ESC/CTRL+ENTER) · `click`(창 안 0..1 · 1|2회) · `activate`. 입력은 환경변수만, pid 는 census 값이며 **등재 process 이름과 대조**.
- agent `windows-uia.mjs` — 프로세스 메모리 snapshot(`e_n` ↔ RuntimeId/hwnd/rect, 5개 보존) → 서버·AI 는 `e_n`+`snapshotId` 만 본다. DOM 과 같은 요소 형상 + `editable · size · focused · windowRef · userAction`. COMMIT 이름(결제·삭제·송금…) invoke 금지 · 로그인/인증 창 입력 금지 · computer-use 텍스트/키 규칙 재사용.
- 서버 `windows-uia-contract.ts` — 인자 검증 · `pickSafeUiaInfo`(role enum · 짧은 name/text · 플래그 · 크기 · 창 제목 60자 · windowRef; pid/hwnd/rid/rect/경로 탈락) · `UIA_*` 코드 9종 · allowlist `local.uia.*#appId` 5×등재 앱.
- **Work Agent 연결**: `windows_app` 은 이제 handoff 가 아니라 **uia 표면** loop — 같은 Planner 어휘(inspect · find · read_text · set_input · click · takeover · done) + uia 전용 `key` · `click{x,y,clicks}` · `click(window)`. `select_option/read_table` 은 uia 에서 거절, `find/read_text` 는 관찰 안에서(명령 0). Target Discovery · Local Agent 구조 그대로(§34 그림의 마지막 4단계만 UIA 로 바뀜).

## 4. 실측에서 잡은 결함 · 결정 (commit 에 반영)

| # | 현상 | 결정 |
|---|---|---|
| ① | 트레이 복귀 창은 `SetForegroundWindow`/AttachThreadInput 을 거절 · 콘솔 없는 agent 자식은 최소화/복원도 거절 | 활성화 3단계: SetForeground → 최소화/복원 → **ALT 잠금 해제**(문자 없음). census 에 `foreground` 플래그, 같은 process 의 여러 창은 foreground 우선 |
| ② | `ValuePattern.SetValue`(WM_SETTEXT) · 유니코드 타이핑 뒤에도 카카오톡 **전송 버튼 비활성**(앱이 "입력됨" 을 모름) | Edit/RichEdit 는 **EM_SETSEL+EM_REPLACESEL**(EN_CHANGE 발생) — 전송 버튼 활성 실측 |
| ③ | SendInput ENTER 가 줄바꿈으로 처리됨 — 원인은 **사용자 타이핑이 자동화 창에 섞여 IME 조합 상태**(junk `wkf` `dl` `ㅗ`, 2:18 메시지에 `djrgkrh` 접두) | (a) **사용자 활동 가드**(`GetLastInputInfo` — 우리 주입 시각과 구분) (b) 키는 **컨트롤 HWND 창 메시지**(WM_KEYDOWN/UP) — foreground · IME 무관, 실측 안정 |
| ④ | ESC = 카카오톡 대화창 닫힘 | 허용 키에 두되 CHECK 에 기록(앱마다 의미가 다르다) |
| ⑤ | 전송 뒤 입력창 값 = placeholder("메시지 입력") → `hasValue` 오판 | `valueCleared` = 보낸 텍스트가 더 이상 값에 없음 |
| ⑥ | 좌표 더블클릭이 다른 방을 열음(채팅 탭) | V0 방 열기 미사용 · Planner 규칙 "목록 내용을 확인할 수 없으면 takeover" |

## 5. 제출(전송) 경계 (안전)

- Planner 규칙 + runtime 검증: `key ENTER/CTRL+ENTER` 는 **foreground 창 제목이 사용자 요청 문장에 들어 있을 때만** 실행(`WINDOW_NOT_NAMED_IN_GOAL` 거절 → 반복 시 `user_judgment_required`). 실측: "카카오톡에 … 보내줘"(방 이름 없음) → Gemini 가 스스로 takeover(전송 0).
- COMMIT 이름 요소 invoke 금지 · 로그인/인증 창 입력 금지 · 텍스트 credential 성격 거절(spec).
- 이번 smoke 의 모든 전송은 **나와의 채팅(본인 창)** 뿐: 5건(13:56 · 14:17 · 14:18(사용자 타이핑 접두 포함) · 14:22 · 14:5x 이후 scripted 3 + Gemini 1 + production 1). 다른 방 전송 0.

## 6. 실측 — 로컬(agent 직접 · `runWorkAgent` + 실 agent handler)

| 단계 | 결과 |
|---|---|
| Target resolve `"카카오톡 …"` → `windows.kakaotalk` | PASS(별칭 카카오톡·카톡·kakaotalk) |
| 실행 중 확인 → 기존 창 활성화 | PASS(`local.target.prepare` ready · reused) · 로그아웃 상태 → 로그인 창 USER_ACTION → 사용자 로그인 |
| UIA 관찰 | 창 3(본인 대화창 · 메인 · 그룹방) · 요소 21 · 입력창 `textbox editable size=365x61` |
| 작업 창 앞으로(`click(window)`) | PASS |
| 입력창 입력(`set_input`) | PASS `verified · via edit_message` |
| 전송(`key ENTER`, 메시지 경로) | PASS `valueCleared:true` — scripted ×3 재현 |
| 재관찰 → 전송 확인 → done | PASS(`completed`) |
| **Gemini planner(gemini-3.8-flash)** | 3 plans · 13.3 s: set_input → key ENTER → done("입력창이 비어 있어 전송 완료") |
| Gemini 부정 케이스(방 이름 없는 요청) | 1 plan: `takeover user_judgment_required` — 전송 0 |

## 7. Production 왕복

paired agent + neture 세션 → `POST /api/ai/work-agent/run`(`3d6e738a6` 배포) → Gemini → agent UIA → 카카오톡 본인 창: `completed` · 4 steps · 3 plans · **37.6 s** · history `set_input → key`.

## 8. Tests · CI

| 게이트 | 결과 |
|---|---|
| agent `windows-uia.test.mjs`(신규 5) · `work-target.test.mjs`(창 선택 규칙 갱신) · 그 밖 4파일 | 95 PASS |
| 서버 `windows-ui-automation.spec.ts`(신규 10: 계약 · 안전 whitelist · uia 표면 검증 · loop 형상 · 제출 창 규칙 · 로그/경계) · `work-target-discovery.spec`(uia loop 진입) | PASS |
| 잠금 갱신: ps1 7 · allowlist +uia · handlers import 목록 | PASS |
| 회귀: work-agent 24 · computer-use · window-control · browser-control · bridge · DOM · local-data · pairing · routing · execution-layer | 218 PASS |
| eslint(17 파일) · tsc | 0 |
| CI · Deploy API(`3d6e738a6`) | Deploy · CodeQL success · CI Pipeline(문서 커밋 시점 확인) |

## 9. DB · 경계

cloud/local migration 0 · 새 의존성 0 · execFile 지점 1 · 셸 0 · Start-Process 는 기존 2파일 그대로(UIA 스크립트 0) · 로그 키 고정(`local-agent uia command`: tool · appId · action · role · riskLevel · elementCount · status · code · 시간) · 창 제목/값은 로그 0(Planner 에는 UNTRUSTED 로 간다).

## 10. Limitations

1. **채팅방 찾기 미자동화** — UIA 항목 미노출 + 좌표 클릭 위험. V0 = 열린 창 재사용 · 요청에 방 이름 필수. 후속: 검색창(Ctrl+F) 경로 또는 스크린샷 판독.
2. 제출 경계는 "창 제목 ∈ 요청 문장" 규칙 하나 — 동명 창 · 제목이 상대 이름이 아닌 앱에는 약하다. 후속: 앱별 제출 정책(등재부).
3. 사용자 활동 가드는 1.2 s idle 기준 — 자동화 중 사용자가 타이핑하면 그 순간의 입력 주입만 거부한다(자동화 전체 일시정지는 후속).
4. `CTRL+ENTER` 는 SendInput 경로(foreground 필요) — 메시지 경로는 수식키 조합을 표현할 수 없다.
5. ESC 등 키의 앱별 의미(카카오톡: 창 닫힘)를 runtime 이 모른다.
6. 카카오톡 전용 어댑터는 없다(등재부 항목 + 스크립트/Planner 규칙만). 실 약국 프로그램은 미준비 — 같은 층 위에 등재만 하면 된다.

## 11. 팀장 보고 사항 (사용자 지시: "이런 부분을 만나면 대응하는 것도 개발과정에 넣어야 한다")

- **화면 이해 없는 자동화의 한계**: 카카오톡처럼 목록을 UIA 로 노출하지 않는 앱에서는 "어느 행이 누구인가" 를 구조적으로 알 수 없다. 좌표 클릭은 목록 상태(탭 · 스크롤)에 따라 **다른 대상을 여는 사고**로 이어진다(실측). 대응은 개발 과정에 편입해야 한다: (a) 앱 등재 시 "노출 지도"(UIA 로 보이는 것/안 보이는 것) 조사 단계 (b) 노출되지 않는 목록은 **사람이 방을 연 뒤** 자동화가 이어받는 절차 (c) 스크린샷 판독(OCR/Vision) 을 fallback 으로 넣되 제출 전 반드시 창 제목 검증.
- **사용자 타이핑 간섭**: 자동화가 창을 앞으로 가져온 순간 사용자의 키 입력이 그 창에 들어간다(이번엔 본인 채팅에 junk 접두 메시지 1건). 가드를 넣었지만, "자동화 실행 중" 을 사용자에게 명확히 보여 주고 키보드/마우스 사용을 잠시 멈추게 하는 UX 가 필요하다.
- **앱별 입력 의미**: Enter=전송 · ESC=창 닫기 · Ctrl+Enter=줄바꿈 등은 앱마다 다르다. 등재부에 앱별 키 의미(제출 키 · 위험 키)를 두는 설계가 필요하다.

```text
WINDOWS UIA LAYER            = ESTABLISHED
TARGET → ACTIVATE → OBSERVE  = PASS
INPUT (edit message)         = PASS
SEND (key message)           = PASS  (본인 대화창)
RE-OBSERVE → VERIFY          = PASS  (입력창 비움)
REAL GEMINI PLANNER          = PASS
PRODUCTION ROUNDTRIP         = PASS  (37.6 s)
ROOM DISCOVERY (목록)        = NOT AUTOMATED  (UIA 미노출 · 좌표 클릭 위험 실측)
CREDENTIAL AUTO              = 0
UNINTENDED SEND              = 0
ARBITRARY KEY/SHELL/EXE      = 0
```

---

*문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건*
