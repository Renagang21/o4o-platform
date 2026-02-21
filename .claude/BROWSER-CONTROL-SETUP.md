# MCP 브라우저 제어 설정 가이드

> Claude가 직접 브라우저를 열어 테스트할 수 있도록 MCP 서버를 설정하는 방법

## 환경 확인

현재 환경: **VSCode Extension (Antigravity 포함 가능)**

## 옵션 1: Browser-use MCP (Python 기반)

### 1.1 설치

```bash
# Python 및 uvx 필요
pip install browser-use
```

### 1.2 VSCode 설정

**VSCode Settings** (`Ctrl+,` 또는 `Cmd+,`)에서:

```jsonc
{
  "claude.mcpServers": {
    "browser-use": {
      "command": "uvx",
      "args": ["--from", "browser-use[cli]", "browser-use", "--mcp"]
    }
  }
}
```

또는 **HTTP 서버 방식**:

```jsonc
{
  "claude.mcpServers": {
    "browser-use": {
      "transport": {
        "type": "http",
        "url": "https://api.browser-use.com/mcp"
      }
    }
  }
}
```

### 1.3 확인

VSCode를 재시작한 후, Claude에게 다음을 요청:

```
브라우저 도구가 있니?
```

응답에 `browser_*` 관련 도구가 보이면 성공.

---

## 옵션 2: Playwright MCP (TypeScript 기반)

### 2.1 설치

```bash
npm install -g @anthropic/mcp-server-playwright
```

### 2.2 VSCode 설정

```jsonc
{
  "claude.mcpServers": {
    "playwright": {
      "command": "mcp-server-playwright",
      "args": []
    }
  }
}
```

---

## 옵션 3: Antigravity 내장 브라우저 에이전트

Antigravity IDE를 사용 중이라면:

1. **Antigravity 브라우저 확장 프로그램** 설치 (Chrome Web Store)
2. Antigravity IDE에서 **[Setup]** 버튼 클릭
3. 브라우저 주변에 **glow** 표시 확인

> 이 경우 Claude Code(나)가 아닌 Antigravity의 Gemini 에이전트가 브라우저를 제어합니다.

---

## 테스트 시나리오

MCP 설정 후, 다음 명령으로 테스트:

```
https://kpa-society.co.kr 에 접속해서 로그인 버튼을 찾아줘
```

성공하면:
- 브라우저가 자동으로 열림
- 페이지 로드
- "로그인" 버튼 위치 보고

---

## 현재 상태

- ❌ MCP 브라우저 도구 없음 (내 toolset에 browser 관련 도구 없음)
- ✅ WebFetch 도구 있음 (HTML만 가져오기, JavaScript 실행 불가)
- ✅ Bash 도구 있음 (Playwright 스크립트 실행 가능)

---

## 추천 방법 (현재 환경 기준)

**현재 Antigravity 환경이라면:**

→ **옵션 3 (Antigravity 내장 에이전트)** 사용

**VSCode + Claude Code라면:**

→ **옵션 1 (browser-use MCP)** 설치 후 사용

---

## 다음 단계

1. 위 옵션 중 하나 선택
2. 설치 및 설정
3. VSCode 재시작
4. 나(Claude)에게 "브라우저 도구 확인" 요청

설정이 완료되면, 나는 다음과 같은 작업을 직접 수행할 수 있습니다:

- ✅ 브라우저 열기
- ✅ URL 접속
- ✅ 버튼 클릭
- ✅ 폼 작성
- ✅ 스크린샷 캡처
- ✅ 콘솔 에러 확인
- ✅ 네트워크 요청 모니터링

---

**Updated**: 2026-02-04
**Status**: 설정 대기 중
