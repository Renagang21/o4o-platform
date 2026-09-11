# O4O Work Agent Bridge — Chrome Extension (V0)

> WO: `WO-O4O-CHROME-EXTENSION-NATIVE-BRIDGE-V0`
> 목적: 실제 사용자의 Google Chrome 과 O4O Local Work Agent 를 연결하는 **공식 브리지**를
> 만들고, 웹 자동화 시작 전 **필수 환경검사**와 **작업 화면 모드 선택**을 제공한다.
>
> ⚠️ 이 V0 은 **공급자 사이트 DOM 자동화를 하지 않는다.** 검색·클릭·입력·form submit 은
> 다음 WO(`WO-O4O-BROWSER-DOM-CONTROL-V0`)의 몫이다(§46·§47).

---

## 무엇을 하고, 무엇을 하지 않는가

| 한다 | 하지 않는다 |
|---|---|
| Side Panel 에 3개 필수 조건 표시(§31) | 저장된 비밀번호·쿠키·세션 토큰 수집(§18·§45) |
| 작업 화면 모드(함께 보기 / 크게 보기) 선택(§12) | DOM 검색·클릭·입력·form submit(§46·§47) |
| Native Messaging 으로 agent 상태 확인(§30) | `<all_urls>` 접근(§21) — neture.co.kr 만 |
| 등재 site 여부 식별(siteId, §37) | 확장 자동설치·sideload·정책 강제(§4) |

AI 는 이 확장과 **직접 말하지 않는다**(§9). 흐름은 항상
`O4O AI → Tool Router → Local Agent → Native Host → 확장 → Chrome` 이다.

---

## 구성

```
manifest.json                 MV3. deterministic key 로 확장 ID 고정. 최소 권한.
src/message-contract.js       브리지 계약(확장 사본). 순수 상수+함수 — node:test 가 import.
src/site-registry.js          등재 site(o4o.neture) 사본. host_permissions 파생.
src/workspace-mode.js         split/focus 전이. work state 보존(§14).
src/native-bridge-client.js   chrome.runtime.connectNative — host 와의 유일한 통로.
src/service-worker.js         조정자. 준비 상태·컨텍스트·화면 모드.
src/side-panel.html/.js       최소 UI(§44).
src/content-script.js         등록 전용(§10). DOM executor 아님.
```

계약(`message-contract.js`)은 agent(`native-bridge-protocol.mjs`)·서버
(`browser-bridge-protocol.ts`) 사본과 **삼중 복제**되며, 테스트가 세 사본의 일치를 강제한다.

---

## 확장 ID 고정 (§26 — Web Store 게시 불요)

`manifest.json` 의 `key` 는 개발 키의 공개키(DER SPKI, base64)다. Chrome 은 이 key 로부터
확장 ID 를 **결정적으로** 계산한다(SHA256 앞 16바이트 → a–p 매핑). 따라서 Web Store 게시나
외부 계정 없이도 ID 가 고정된다:

```
lpjfjaabelhajonbiankhmfkbmonhcgc
```

이 ID 는 native host 매니페스트의 `allowed_origins` 에 **유일하게** 등재된다(§25). 개인키는
저장소에 커밋하지 않는다(개발용 키는 세션 scratchpad 에만 보관).

> Web Store 정식 게시는 별도 외부 계정·심사 단계이며 V0 자체 배포에는 필요치 않다.
> 게시가 실제로 필요해지는 시점이 이 WO 의 STOP 지점이다(§66).

---

## 설치 (§51 — 개발자 모드 로드)

1. **Local Work Agent 설치·페어링** 이 먼저다(별도 트랙). agent 가 이 PC 에 있어야 한다.
2. **Native host 등록** (관리자 권한 불요, HKCU):
   ```
   node tools/o4o-local-agent/src/install-native-host.mjs
   ```
   `--dry-run` 으로 먼저 계획만 확인할 수 있다. `--uninstall` 로 레지스트리 키를 제거한다.
3. **확장 로드**: Chrome → `chrome://extensions` → 개발자 모드 ON → "압축해제된 확장 프로그램을
   로드" → 이 `tools/o4o-chrome-extension/` 폴더 선택. 로드된 ID 가 위 고정 ID 와 같아야 한다.
4. 툴바의 O4O 아이콘을 눌러 Side Panel 을 열고 3개 조건이 모두 초록인지 확인한다.

자동 업데이트는 자체 구축하지 않는다(§52) — 정식 배포 시 Web Store 메커니즘을 따른다.

---

## 개인정보·보안 경계

- 저장된 비밀번호·쿠키·세션 토큰·localStorage/sessionStorage 토큰을 수집하지 않는다(§18·§45).
- 외부 사이트 로그인은 **사용자가 사이트 안에서 직접** 한다(§19). 확장은 로그인을 대행하지 않는다.
- 로그에는 안전 필드(status·errorCode·workspaceMode·siteId?)만 남긴다. URL query·페이지
  내용·DOM·쿠키·토큰·form 값은 로그·응답·핸드셰이크에 남기지 않는다(§55).
- Native host 는 stdin 입력을 shell/exec/spawn/파일쓰기/레지스트리쓰기/임의 URL 로 넘기지
  않는다 — 계약된 4 message type 만 처리한다(§29).
