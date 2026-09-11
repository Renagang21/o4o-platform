# O4O Local Work Agent (V0)

`WO-O4O-LOCAL-WORK-AGENT-V0` · `WO-O4O-LOCAL-WORK-AGENT-ONECLICK-PAIRING-V1`
· `WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0` · `WO-O4O-BROWSER-CONTROL-V0` · `WO-O4O-COMPUTER-USE-V0`

사용자의 Windows PC 에서 도는 **최소 실행 에이전트**입니다. O4O AI 가 허용된 로컬 작업을
요청하면, 이 프로세스가 자기 allowlist 를 확인한 뒤 실행하고 결과만 되돌려 줍니다.

## 이 프로그램이 하지 않는 것

원격 제어기가 아닙니다. 다음은 **코드에 존재하지 않습니다** — 설정으로 켤 수도 없습니다.

| 없는 것 | 확인 방법 |
|---|---|
| 임의 shell / PowerShell / cmd 실행 | 아래 "PowerShell 경계" 참조 — 실행 가능한 것은 저장소에 들어 있는 `.ps1` **5개**뿐입니다 |
| 임의 프로세스 실행 | 같음. **단 하나의 예외**가 "브라우저 경계" 에 있습니다 — 등재된 HTTPS 주소를 OS 기본 handler 에 넘기는 것뿐이며, 실행 파일을 지정할 수 없습니다 |
| 프로그램 종료 | `Stop-Process` · `taskkill` 이 코드에 없습니다 |
| 프로그램 실행 | `Start-Process` 는 `windows-browser-open.ps1` **한 곳, 한 번**, `-FilePath $url` 형태로만 존재합니다. `$url` 은 agent 등재부 상수이고 `https://` 정규식을 통과해야 합니다 |
| 파일 읽기 / 쓰기 도구 | `src/handlers.mjs` 는 `os` 만 import 합니다 — `fs` 가 없습니다 |
| 레지스트리 접근 | 해당 모듈 없음 |
| 임의 마우스 · 키보드 · 화면 제어 | 아래 "화면 조작 경계" 참조 — **등재 앱의 창 하나 안**에서 왼쪽 클릭 1회 · 텍스트 1줄 · ENTER/TAB/ESC 1회가 전부입니다. 우클릭 · 드래그 · 키 조합 · WIN/ALT · 바탕화면 · 다른 창은 코드에 없습니다 |
| 화면 녹화 · 백그라운드 캡처 · 이미지 전송 | 캡처는 요청 1건당 대상 창 client 영역 1회, 메모리에서 크기만 재고 바로 폐기합니다. 이미지가 파일 · 서버 · 로그로 가는 코드가 없습니다 |
| 클립보드 읽기 · 쓰기 | 해당 모듈 없음 |
| 브라우저 안 제어 (탭 · DOM · 클릭 · 입력) | 해당 모듈 없음. 할 수 있는 것은 "등재 사이트를 연다" 까지입니다 |
| 로그인 대행 · 비밀번호 입력 · cookie/프로필 접근 | 해당 코드 없음 — 로그인은 사용자가 사이트에서 직접 합니다 |
| 약국관리 프로그램 접근 | 해당 코드 없음 |

실행할 수 있는 것은 `src/handlers.mjs` 에 등재된 action 뿐입니다.

`fs` 는 딱 한 곳, `src/credentials.mjs` 에서만 쓰입니다 — 이 agent 자신의 자격증명
파일을 읽고 쓰기 위해서입니다. handler 쪽에는 파일 접근 수단이 전달되지 않으므로,
서버가 무엇을 요청하든 임의 경로를 읽어 보낼 방법이 없습니다.

## PowerShell 경계 (WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0)

창을 찾고 앞으로 가져오는 기능은 Win32 API 호출이 필요합니다. 네이티브 모듈을 새로
설치하지 않고 이를 하려면 PowerShell helper 외에 방법이 없어, **`src/windows-window-control.mjs`
한 파일에만** `child_process` 를 열었습니다. "어느 파일도 import 하지 않는다" 는 더 이상
사실이 아니므로, 대신 다음 5가지로 범위를 묶어 두었습니다.

1. `execFile` 만 씁니다. `exec` · `spawn` · `shell: true` 가 없으므로 **셸이 개입하지 않습니다**
   (인용 · `&` · 파이프 해석 자체가 일어나지 않습니다).
2. 실행 대상은 저장소에 체크인된 `windows-window-census.ps1` · `windows-window-activate.ps1` ·
   `windows-browser-open.ps1` · `windows-computer-inspect.ps1` · `windows-computer-input.ps1` **5개**뿐입니다. `-Command` 를 쓰지 않고 `-File` 만 쓰므로
   스크립트 문자열을 런타임에 조립하지 않습니다.
3. argv 는 상수 배열이 전부입니다. **호출자가 argv 에 값을 넣을 수 없습니다.**
4. 런타임 입력(창 핸들 · 화면 조작 인자)은 환경변수로 넘기며, 넘기기 전(JS)과 스크립트 안에서
   각각 형식을 다시 확인합니다.
5. appId · 프로그램 이름 · 창 제목은 이 경계를 넘지 않습니다. 매칭은 전부 JS 안에서 하고,
   PowerShell 은 조건 없는 창 목록만 돌려줍니다.

창 스크립트 두 개가 부르는 Win32 함수는 전부 조회 전용이며, 예외는 최소화된 창을 되살리는
`ShowWindow(SW_RESTORE)` 와 `SetForegroundWindow` 뿐입니다. 키보드 · 마우스 입력을
만들어 내지 않고, 창을 닫거나 프로세스를 끝내지 않습니다.

## 브라우저 경계 (WO-O4O-BROWSER-CONTROL-V0)

세 번째 스크립트 `windows-browser-open.ps1` 은 **등재된 사이트를 연다.** 그 이상은 없습니다.

- 서버가 보내는 것은 `siteId` 뿐입니다. URL 은 `src/browser-site-registry.mjs` 에만 있고,
  서버 · AI · 사용자가 URL 을 넘길 칸이 프로토콜에 없습니다. 등재되지 않은 siteId 는
  `BROWSER_SITE_NOT_REGISTERED` 로 끝납니다.
- 스크립트는 환경변수 `O4O_SITE_URL` 하나를 받고, `https://` 절대 URL 인지 다시 확인한 뒤
  `Start-Process -FilePath $url` 로 **Windows 기본 URL handler** 에 넘깁니다. 실행 파일 ·
  `-ArgumentList` · 브라우저 플래그(remote-debugging 등)를 지정하지 않습니다. 어떤 브라우저가
  뜨는지는 Windows 사용자 설정이 정합니다.
- 브라우저가 이미 떠 있으면 그 세션에 새 탭으로 열립니다. 새 프로필을 만들지 않고, cookie ·
  localStorage · 저장 비밀번호 · 프로필 경로를 읽지 않습니다.
- **로그인은 하지 않습니다.** 사이트가 로그인 화면을 보여주면 사용자가 직접 로그인하고,
  O4O 화면의 `[로그인 완료]` 를 눌러 다음 단계로 넘어갑니다. 이 신호는 저장되지 않습니다.
- 사이트가 열려 있는지(탭)는 판정하지 않습니다. 돌려주는 것은 "브라우저가 떠 있는가 ·
  어떤 브라우저인가(Chrome/Edge)" 뿐입니다.

## 화면 조작 경계 (WO-O4O-COMPUTER-USE-V0)

네 번째 · 다섯 번째 스크립트는 **등재 앱의 창 하나 안**만 다룹니다.

- 서버가 보내는 대상은 `appId` 뿐입니다. 창 핸들은 agent 가 자기 census 로 해석하고, 등재 앱 창이
  **정확히 1개**일 때만 진행합니다(0개 `COMPUTER_USE_TARGET_NOT_FOUND`, 2개 이상은 아무 것도 하지 않습니다).
- `windows-computer-inspect.ps1` 은 대상 창이 앞에 있을 때 client 영역을 **한 번** 캡처해 크기만 재고
  비트맵을 같은 블록 안에서 `Dispose()` 합니다. 되돌리는 값은 `foreground · clientWidth · clientHeight ·
  snapshotAvailable · snapshotWidth · snapshotHeight · capturedAt` 뿐이며 **이미지는 프로토콜에 없습니다.**
- `windows-computer-input.ps1` 은 `SendInput` 으로 **왼쪽 클릭 1회 · 유니코드 텍스트 1줄(1~500자, 제어문자 없음) ·
  ENTER/TAB/ESC 중 1키** 를 넣습니다. 우클릭 · 더블클릭 · 드래그 · 휠 · 키 조합 · WIN · ALT · CTRL ·
  임의 가상키는 C# 코드에 상수 자체가 없습니다.
- 실행 **직전**에 대상 창이 foreground 가 아니면 입력을 만들지 않고 끝냅니다(`COMPUTER_USE_TARGET_LOST`).
  같은 프로그램의 다른 창(대화상자 · 팝업)이 앞에 있거나 창 제목이 로그인 · 저장 대화상자 성격이면
  `COMPUTER_USE_USER_ACTION_REQUIRED` 로 멈추고 **OK/Yes 를 대신 누르지 않습니다.**
- 클릭 좌표는 client 영역 정규화 0..1 만 받고 밖이면 `COMPUTER_USE_OUT_OF_BOUNDS`. 텍스트는 비밀번호 ·
  인증번호 · shell 명령 성격의 문자열을 `src/computer-use-limits.mjs` 에서 **서버와 별도로 다시** 거릅니다.
- **로그인 · 비밀번호 · OTP 입력은 하지 않습니다.** 요청 1건 = 입력 1회이며, 스스로 다음 동작을 이어가지 않습니다.

## 개인정보

환자정보 · 처방전 · 조제내역 · 보험청구 · 주민등록번호 · 건강정보 · 결제정보에
접근하지 않습니다. 그 데이터는 기존 약국관리 프로그램에 그대로 남습니다.

이 agent 가 cloud 로 보내는 값의 **전부**는 다음과 같습니다.

```
osName · osVersion · architecture · agentVersion · deviceName
appId · displayName · found / not found · windowCount · state · activated · restored
targetId · foreground · clientWidth · clientHeight · snapshotAvailable · snapshotWidth · snapshotHeight
· capturedAt · clicked · typed · typedLength · keyPressed · key · verified · userActionRequired
```

두 번째 줄이 창 제어, 세 번째 · 네 번째 줄이 화면 조작에서 나가는 값의 전부입니다. **창 제목 · PID · 창 핸들 ·
실행 파일 경로 · command line · 전체 프로세스 목록 · 화면 이미지 · 입력한 텍스트 본문은 나가지 않습니다.**

username · 홈 디렉터리 경로 · IP · MAC · 설치 소프트웨어 목록 · 환경변수 ·
디스크 내용 · 프로세스 목록은 수집하지도, 전송하지도 않습니다.

## 네트워크

**바깥에서 이 PC 로 들어오는 연결이 없습니다.** 업무 통신은 agent 가 O4O API 로 나가는
HTTPS 요청뿐입니다. 포트 개방 · 포트 포워딩 · 공인 IP 가 필요 없습니다.

단 하나의 listen 소켓은 `http://127.0.0.1:47821` 이며, **같은 PC 의 브라우저 전용**입니다.
`0.0.0.0` 이 아니라 loopback 에만 묶여 있어 같은 공유기 안의 다른 PC 도 접근할 수 없습니다.

여기에 열려 있는 것은 두 개뿐입니다.

| endpoint | 하는 일 |
|---|---|
| `GET /health` | 살아 있는지 · 연결되어 있는지 + 1회용 nonce 발급 |
| `POST /pair` | 브라우저가 건네준 **1회용 승인권**을 받는다 |

명령 실행 · 파일 접근 endpoint 는 브라우저에 노출하지 않습니다. 그리고 이 창구는

- **Origin 허용목록**(wildcard 없음)에 있는 O4O 도메인만 상대하고,
- `GET /health` 로 받은 **1회용 nonce** 가 있어야 `POST /pair` 가 성립하며,
- `Access-Control-Allow-Credentials` 를 주지 않아 **브라우저 쿠키가 실릴 수 없습니다.**

## 설치와 연결

의존성이 없으므로 `npm install` 이 필요 없습니다. Node.js 18 이상이면 됩니다.

```bash
node src/index.mjs run
```

그 다음 O4O 웹(로그인 상태)에서 **[이 PC 연결]** 을 한 번 누르면 끝입니다.
**입력할 코드가 없습니다** — 브라우저가 서버에서 받은 1회용 승인권을 위 창구로 직접
전달하고, agent 가 그것을 서버에 제출해 자기 자격증명을 받아옵니다.

이때 브라우저의 **로그인 쿠키 · 비밀번호 · JWT 는 agent 쪽으로 넘어가지 않습니다.**
넘어가는 것은 `local-agent-pairing` 용도로 그 자리에서 만들어진 난수 하나뿐이며,
이 난수는 1회용이고 2분 뒤 만료됩니다.

연결이 끝나면 `%LOCALAPPDATA%\o4o-local-agent\credentials.json` 에 기기 자격증명이
저장됩니다. 이 파일에도 **사용자의 비밀번호나 로그인 토큰은 들어 있지 않습니다** — 이
PC 전용으로 발급된 기기 자격증명뿐이며, O4O 웹에서 언제든 해지할 수 있습니다.

연결을 끊으려면 이 파일을 지우면 됩니다.

## 환경변수

| 이름 | 기본값 | 설명 |
|---|---|---|
| `O4O_API_BASE` | `https://api.neture.co.kr` | API 주소 |
| `O4O_AGENT_HOME` | `%LOCALAPPDATA%\o4o-local-agent` | 자격증명 저장 위치 |
| `O4O_AGENT_DEVICE_NAME` | `내 PC` | 목록에 보일 표시 이름 (PC 이름을 읽지 않습니다) |
