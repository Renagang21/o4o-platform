# CHECK-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0

> WO: `WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0`
> 목적: 실제 사용자의 Google Chrome 과 O4O Local Work Agent 를 잇는 공식 Chrome Extension /
> Native Messaging 기반을 구축하고, 웹 자동화 시작 전 필수 환경검사와 작업 화면 모드 선택을
> 제공한다. **이 V0 은 공급자 사이트 DOM 자동화를 하지 않는다(§46·§47).**
> 상태: **PASS (자동 게이트·로컬 stdio smoke 완료) / 실 Chrome 설치·neture.co.kr smoke = 보류(§59·§61·§62)**
> 코드:
> - 확장 `tools/o4o-chrome-extension/`(manifest + src 7파일 + README)
> - agent `tools/o4o-local-agent/src/native-bridge-protocol.mjs`·`native-host.mjs`·`install-native-host.mjs`·`windows-chrome-detect.mjs`
> - 서버 `apps/api-server/src/services/local-agent/browser-bridge-protocol.ts`
> - 테스트 `tools/o4o-local-agent/test/native-bridge.test.mjs`(node:test 24)·`apps/api-server/src/__tests__/browser-bridge.spec.ts`(jest 12)

---

## 1. 착수 전 §66 STOP 조사 (favorable — 진행)

| 조사 | 결과 | 근거 |
|---|---|---|
| 확장 ID 고정: Web Store 게시 vs deterministic key | **deterministic key 로 고정** — Web Store·외부 계정 불요 | manifest `key`(DER SPKI base64) → Chrome 이 SHA256 앞16B→a–p 매핑으로 ID 계산. 재현 테스트로 `lpjfjaabelhajonbiankhmfkbmonhcgc` 일치 확인(test §26) |
| Native host 등록: HKCU 로 관리자 권한 없이 가능한가 | **가능** — HKCU 만 사용 | `install-native-host.mjs` 가 `HKCU\...\NativeMessagingHosts\<name>` 에만 `reg add`. HKLM 미사용. dry-run 확인 |

두 조사 모두 STOP 조건에 걸리지 않아 구현을 진행했다. Web Store 정식 게시는 V0 자체 배포에
불필요하며, 게시가 실제로 필요해지는 시점이 남은 STOP 지점이다(§66).

## 2. 항목별 검증 (18 items, §64)

| # | 검증 항목 | 근거 | 결과 |
|---|---|---|---|
| 1 | Chrome 전용 · Edge/Firefox/Safari 비대상(§2) | `windows-chrome-detect`(App Paths\chrome.exe + 알려진 경로만), manifest chrome-extension | **PASS** |
| 2 | 3개 필수 조건 게이트 — 하나라도 빠지면 자동화 차단(§3·§35·§36) | `computeReadiness` 넷 모두 true 만 ready / bridge spec readiness · agent test | **PASS** |
| 3 | 사용자가 직접 설치 · 자동설치/sideload/정책강제 없음(§4·§51) | README 개발자모드 로드 절차, 코드에 정책·강제설치 경로 없음 | **PASS** |
| 4 | AI 는 확장과 직접 대화하지 않음 — agent 경유(§9) | 확장은 native host 에만 연결(`native-bridge-client`), 서버에 browser route/tool 없음 | **PASS** |
| 5 | MV3 최소 구성(§10) | manifest_version 3 · service worker(module) · side panel · content script(등록전용) | **PASS** |
| 6 | 최소 권한 · `<all_urls>` 금지(§20·§21·§22) | permissions=[sidePanel,tabs,nativeMessaging] · host_permissions=[neture/*] · cookies/webRequest 없음 / manifest test | **PASS** |
| 7 | 화면 모드 split/focus 2종(§12·§15) · dual 미강제(§16) | `WORKSPACE_MODES=['split','focus']` 삼중 일치 / test | **PASS** |
| 8 | 모드 변경 시 work state 보존 — workspaceMode≠workState(§13·§14·§43) | `transitionWorkspaceMode` 가 workState 그대로 실어 반환 / test split↔focus 왕복 | **PASS** |
| 9 | 저장 비밀번호·쿠키·세션토큰·스토리지 미수집(§18·§45) | manifest 권한 부재 + content-script 소스 스캔(document.cookie/localStorage/… 부재) | **PASS** |
| 10 | 외부 로그인은 사용자가 직접(§19) | 확장에 로그인 대행 경로 없음, README 명시 | **PASS** |
| 11 | 4개 message type 만 허용(§27) · DOM type 부재(§46·§47) | `NATIVE_BRIDGE_MESSAGE_TYPES` 4개 · 소스 스캔(executeScript/debugger/click/eval 부재) | **PASS** |
| 12 | 봉투 계약 + 양측 검증(§28) | `validateBridgeMessage`(확장·agent·서버 3사본) / envelope test | **PASS** |
| 13 | 금지 message type 부재(§29) | shell/exec/spawn/file.read/file.write/registry.write/임의URL type 없음 · native-host child_process 미import / source scan | **PASS** |
| 14 | Native host = stdio · handshake 에 민감정보 없음(§23·§30) | `native-host` framing + handshake payload(agentVersion/bridgeProtocolVersion/agentConnected만) / host smoke LEAK=false | **PASS** |
| 15 | Native host 별도 상주 프로세스 신설 안 함(§24) | Chrome 이 연결마다 띄우는 단명 프로세스, creds 파일 존재만 확인(값 미열람) | **PASS** |
| 16 | allowed_origins = 확장 ID 하나 · 와일드카드 없음(§25) | `buildHostManifest` → `["chrome-extension://<id>/"]` / test · dry-run | **PASS** |
| 17 | bridgeProtocolVersion=1 · 불일치 시 VERSION_MISMATCH(§53) · error code 계약(§54) | 3사본 version=1 · host smoke version-mismatch → NATIVE_BRIDGE_VERSION_MISMATCH · 9개 error code 일치 | **PASS** |
| 18 | 이번 WO 는 browser DOM 실행을 켜지 않음(§46·§47·§48) | EXECUTABLE_MODES=['server','local'] 유지 · browser executionMode tool 미등록 / bridge spec | **PASS** |

## 3. 로컬 stdio smoke (§59 대체 — 실 Chrome 없이 가능한 범위)

Chrome 없이 native host 를 직접 구동해 확장↔host 프레임 왕복을 검증했다:

```text
hello:            {"type":"extension.hello","payload":{"agentVersion":"0.0.1","bridgeProtocolVersion":1,"agentConnected":false}}
status:           {"payload":{"agentConnected":false,"bridgeProtocolVersion":1}}
version-mismatch: {"payload":{"ok":false,"errorCode":"NATIVE_BRIDGE_VERSION_MISMATCH"}}
forbidden-type:   {"payload":{"ok":false,"errorCode":"NATIVE_BRIDGE_BAD_MESSAGE"}}   (shell.exec 거부)
browser-local:    {"payload":{"serviced":false,"reason":"BROWSER_LOCAL"}}
LEAK(credential/token/password/cookie)? false
frames received: 5
```

- stdio 4바이트 length-prefix framing 정상(5/5 프레임).
- handshake·status 정상, 민감정보 누출 없음.
- 버전 불일치·금지 type 모두 정규화 코드로 거부.
- install-native-host `--dry-run`: HKCU 키 + 단일 allowed_origins 계획 확인(관리자 불요).

## 4. 자동 게이트 결과

| 게이트 | 명령 | 결과 |
|---|---|---|
| tsc | `tsc --noEmit -p apps/api-server/tsconfig.json` | **PASS (exit 0)** |
| jest | `jest browser-bridge --maxWorkers=1` | **PASS (12/12)** |
| agent node:test | `node --test tools/o4o-local-agent/test/native-bridge.test.mjs` | **PASS (24/24)** |
| agent node:test (회귀) | `node --test tools/o4o-local-agent/test/local-db.test.mjs` | **PASS (18/18)** |
| eslint | 변경 TS 2 + 확장/agent JS·mjs | **PASS (exit 0)** |
| host stdio smoke | native-host 프레임 왕복 | **PASS (exit 0)** |

자동 테스트 합계 = 24(agent) + 12(server) = **36** (§58 목표 25 초과 충족).

## 5. 보류 항목 (정직 보고 — 실 환경 인간 단계)

| # | 항목 | 사유 |
|---|---|---|
| §59 | 실 Windows + 실 Chrome 에 확장 로드 후 local smoke | 실제 Chrome 설치·개발자모드 확장 로드·native messaging 연결은 사람이 실 PC 에서 수행 |
| §60 | 확장 미설치 상태 smoke(설치 안내 노출) | 위와 동일(실 Chrome 필요) |
| §61 | 프로덕션 neture.co.kr 왕복 smoke | 실 매장 PC + 실 브라우저 필요 |
| §62 | UX smoke(3조건 표시·모드 전환 관측) | 실 Side Panel 렌더 필요 |
| §63 | 보안 negative smoke(비허용 origin·금지 type) | 코드·host smoke·자동 테스트로 로직은 검증됨 — 실 Chrome 확인은 사람 단계 |

위는 [[CHECK-O4O-LOCAL-DATA-TOOL-BRIDGE-CLOSURE-V1]] 의 §25·§26 과 같은 성격의 실 PC 인간
단계다. 거부·정규화·framing·계약 일치 로직은 자동 테스트(agent 24 / server 12)와 host stdio
smoke 에서 이미 검증되었으므로, 실 Chrome smoke 는 최종 확인이지 미검증 위험이 아니다.

## 6. 계약 대비 편차 (deviation, 정직 보고)

| 항목 | WO 표기 | 구현 | 판단 |
|---|---|---|---|
| browser.get_context / workspace.set_mode 방향 | §27 message type 목록 | V0 은 브라우저-로컬(service worker + chrome.windows)로 처리, host 는 serviced:false 로 응답 | AI→agent→확장 push 는 후속 WO. type 은 계약에 등재·검증되며 V0 UX(사용자 클릭)로 동작 |
| 서버 측 구현 범위 | §31·§35 준비 계약 | 계약 모듈만(라우트·tool 미추가) | §46·§47·§48 이 DOM 실행·fallback 라우팅을 금지 → 서버는 계약·게이트만, 실행 배선은 후속 WO |

## 7. 결론

- §66 STOP 두 조사 모두 favorable → 구현 진행.
- §64 18개 검증 항목 전부 **PASS**, 자동 게이트 전부 green, host stdio smoke green.
- §59~§63 실 Chrome/실 PC smoke 만 보류(인간 단계).
- 완료 기준(§65) 자동 항목 충족 → `WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0` = **PASS**.
- 후속(§67): `WO-O4O-BROWSER-DOM-CONTROL-V0` → `WO-O4O-ORDER-WORKFLOW-V0`. 이 계약 위에
  DOM executor 와 실행 라우팅을 올린다.
