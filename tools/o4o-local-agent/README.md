# O4O Local Work Agent (V0)

`WO-O4O-LOCAL-WORK-AGENT-V0`

사용자의 Windows PC 에서 도는 **최소 실행 에이전트**입니다. O4O AI 가 허용된 로컬 작업을
요청하면, 이 프로세스가 자기 allowlist 를 확인한 뒤 실행하고 결과만 되돌려 줍니다.

## 이 프로그램이 하지 않는 것

원격 제어기가 아닙니다. 다음은 **코드에 존재하지 않습니다** — 설정으로 켤 수도 없습니다.

| 없는 것 | 확인 방법 |
|---|---|
| shell / PowerShell / cmd 실행 | 저장소 어느 파일도 `child_process` 를 import 하지 않습니다 |
| 임의 프로세스 실행 | 같음 |
| 파일 읽기 / 쓰기 도구 | `src/handlers.mjs` 는 `os` 만 import 합니다 — `fs` 가 없습니다 |
| 레지스트리 접근 | 해당 모듈 없음 |
| 마우스 · 키보드 · 화면 캡처 | 해당 모듈 없음 |
| 브라우저 제어 · DOM 자동화 | 해당 모듈 없음 |
| 약국관리 프로그램 접근 | 해당 코드 없음 |

실행할 수 있는 것은 `src/handlers.mjs` 의 **2개**뿐입니다.

`fs` 는 딱 한 곳, `src/credentials.mjs` 에서만 쓰입니다 — 이 agent 자신의 자격증명
파일을 읽고 쓰기 위해서입니다. handler 쪽에는 파일 접근 수단이 전달되지 않으므로,
서버가 무엇을 요청하든 임의 경로를 읽어 보낼 방법이 없습니다.

## 개인정보

환자정보 · 처방전 · 조제내역 · 보험청구 · 주민등록번호 · 건강정보 · 결제정보에
접근하지 않습니다. 그 데이터는 기존 약국관리 프로그램에 그대로 남습니다.

이 agent 가 cloud 로 보내는 값의 **전부**는 다음과 같습니다.

```
osName · osVersion · architecture · agentVersion · deviceName
```

username · 홈 디렉터리 경로 · IP · MAC · 설치 소프트웨어 목록 · 환경변수 ·
디스크 내용 · 프로세스 목록은 수집하지도, 전송하지도 않습니다.

## 네트워크

**바깥에서 이 PC 로 들어오는 연결이 없습니다.** agent 가 O4O API 로 나가는 HTTPS 요청만
사용합니다. 포트 개방 · 포트 포워딩 · 공인 IP 가 필요 없습니다.

## 설치와 연결

의존성이 없으므로 `npm install` 이 필요 없습니다. Node.js 18 이상이면 됩니다.

```bash
# 1. O4O 웹에서 "이 PC 연결" 을 눌러 1회용 코드를 받는다 (5분 유효)
# 2. 그 코드로 한 번만 등록한다
node src/index.mjs pair --code ABCDE-FGHIJ

# 3. 이후에는 이것만 실행한다
node src/index.mjs run
```

`pair` 가 성공하면 `%LOCALAPPDATA%\o4o-local-agent\credentials.json` 에 기기 자격증명이
저장됩니다. 이 파일에는 **사용자의 비밀번호도, 로그인 토큰도 들어 있지 않습니다** — 이
PC 전용으로 발급된 기기 자격증명뿐이며, O4O 웹에서 언제든 해지할 수 있습니다.

연결을 끊으려면 이 파일을 지우면 됩니다.

## 환경변수

| 이름 | 기본값 | 설명 |
|---|---|---|
| `O4O_API_BASE` | `https://api.neture.co.kr` | API 주소 |
| `O4O_AGENT_HOME` | `%LOCALAPPDATA%\o4o-local-agent` | 자격증명 저장 위치 |
